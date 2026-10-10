// utils/cloudinaryAssets.js
// Removing an uploaded photo or document from Cloudinary when it is replaced or
// its member / family is deleted.
import cloudinary from '../config/cloudinary.js';

// https://res.cloudinary.com/<cloud>/image/upload/v1791630891/family-members/abc123.jpg
//   -> family-members/abc123
export const publicIdFromUrl = (url) => {
  if (typeof url !== 'string' || !url.includes('/upload/')) return null;

  const segments = url.split('/upload/')[1].split('?')[0].split('/');
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  // Before the version come transformations (w_500,c_limit); after it, the folder and file
  const pathSegments = versionIndex >= 0
    ? segments.slice(versionIndex + 1)
    : segments.filter((segment) => !segment.includes(',') && !/^[a-z]{1,3}_[^/]+$/.test(segment));

  const publicId = pathSegments.join('/').replace(/\.[a-z0-9]+$/i, '');
  return publicId || null;
};

// Never throws: a file that cannot be removed must not stop the save or delete it belongs to.
export const deleteAsset = async (url) => {
  const publicId = publicIdFromUrl(url);
  if (!publicId) return false;
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error(`Could not remove ${publicId} from Cloudinary:`, error.message);
    return false;
  }
};
