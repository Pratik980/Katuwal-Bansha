
import api from './axios';

export const getFamilies = async (params = {}) => {
  const response = await api.get('/families', { params });
  return response.data;
};

export const getFamilyById = async (id) => {
  const response = await api.get(`/families/${id}`);
  return response.data;
};

export const getFamilyTreeByFamily = async (familyId) => {
  const response = await api.get(`/families/${familyId}/tree`);
  return response.data;
};

export const createFamily = async (data) => {
  const response = await api.post('/families', data);
  return response.data;
};

export const updateFamily = async (id, data) => {
  const response = await api.put(`/families/${id}`, data);
  return response.data;
};

export const deleteFamily = async (id) => {
  const response = await api.delete(`/families/${id}`);
  return response.data;
};


export const closeFamily = async (id, reason) => {
  const response = await api.post(`/families/${id}/close`, { reason });
  return response.data;
};


export const reopenFamily = async (id) => {
  const response = await api.post(`/families/${id}/reopen`);
  return response.data;
};


export const getNextFamilyNumber = async (houseId) => {
  const response = await api.get(`/families/next-number/${houseId}`);
  return response.data;
};


export const getNextVanshaNumber = async (familyId) => {
  const response = await api.get(`/families/next-vansha/${familyId}`);
  return response.data;
};


export const getFamilyBanshaNumbers = async (familyId) => {
  const response = await api.get(`/families/${familyId}/bansha-numbers`);
  return response.data;
};