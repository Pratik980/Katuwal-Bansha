// tests/helpers/testApp.js
// Boots the real Express app against a throwaway in-memory MongoDB.
// Nothing here ever touches the database configured in .env, and no file is
// ever sent to the real Cloudinary account.
import { PassThrough } from 'node:stream';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import cloudinaryModule from 'cloudinary';

let mongod;
let io;
let baseUrl;

// What the app asked Cloudinary to do, for tests to look at
export const cloudinaryCalls = { uploads: [], destroyed: [] };

const fakeCloudinary = () => {
  const { uploader } = cloudinaryModule.v2;
  let counter = 0;

  uploader.upload_stream = (options, callback) => {
    const sink = new PassThrough();
    sink.resume();
    sink.on('finish', () => {
      counter += 1;
      const publicId = `${options.folder}/test-${counter}`;
      cloudinaryCalls.uploads.push({ publicId, folder: options.folder, transformation: options.transformation });
      callback(null, {
        public_id: publicId,
        secure_url: `https://res.cloudinary.com/test/image/upload/v1/${publicId}.png`,
        bytes: 1,
      });
    });
    return sink;
  };

  uploader.destroy = async (publicId) => {
    cloudinaryCalls.destroyed.push(publicId);
    return { result: 'ok' };
  };
};

export const startTestApp = async ({ port = 0, realCloudinary = false } = {}) => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('katuwal_test');

  if (!/^mongodb:\/\/127\.0\.0\.1[:/]/.test(uri)) {
    throw new Error(`Refusing to run tests against a non-local database: ${uri}`);
  }

  // Set before server.js loads: dotenv does not override variables that already exist.
  process.env.MONGODB_URI = uri;
  process.env.PORT = String(port);
  process.env.NODE_ENV = 'development';

  if (!realCloudinary) fakeCloudinary();

  ({ io } = await import('../../server.js'));

  const httpServer = io.httpServer;
  if (!httpServer.listening) {
    await new Promise((resolve) => httpServer.once('listening', resolve));
  }

  if (mongoose.connection.host !== '127.0.0.1') {
    throw new Error(`Refusing to run tests: connected to ${mongoose.connection.host}`);
  }

  baseUrl = `http://127.0.0.1:${httpServer.address().port}/api`;
  return { baseUrl };
};

export const stopTestApp = async () => {
  await new Promise((resolve) => io.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();
};

export const resetDatabase = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  cloudinaryCalls.uploads.length = 0;
  cloudinaryCalls.destroyed.length = 0;
};

const request = async (method, path, body) => {
  const options = { method };
  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
};

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  // For downloads: the untouched response
  raw: (path) => fetch(`${baseUrl}${path}`),
};

// A 1x1 PNG, enough to stand in for a photo or a scanned document
export const tinyImage = () =>
  new Blob(
    [Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')],
    { type: 'image/png' }
  );

// Data Entry submits multipart form data, with arrays as key[0], key[1], ...
// `keepEmpty` lists fields sent as '' on purpose (the edit form does this for a field it cleared).
export const toFormData = (fields, keepEmpty = []) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value instanceof Blob) {
      form.append(key, value, `${key}.png`);
      return;
    }
    if (value === '' && keepEmpty.includes(key)) {
      form.append(key, '');
      return;
    }
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => form.append(`${key}[${index}]`, String(item)));
    } else {
      form.append(key, String(value));
    }
  });
  return form;
};
