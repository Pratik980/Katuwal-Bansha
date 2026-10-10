
import axios from './axios';

export const getMembers = async (params = {}) => {
  const { data } = await axios.get('/members', { params });
  return data;
};

// Name, number and gender of every member: enough for the form's pick lists
export const getMemberOptions = async () => {
  const { data } = await axios.get('/members/options');
  return data;
};

export const updateVerification = async (id, status) => {
  const { data } = await axios.put(`/members/${id}/verification`, { status });
  return data;
};

export const getMemberById = async (id) => {
  const { data } = await axios.get(`/members/${id}`);
  return data;
};

export const createMember = async (formData) => {
  const { data } = await axios.post('/members', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const updateMember = async (id, formData) => {
  const { data } = await axios.put(`/members/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteMember = async (id) => {
  const { data } = await axios.delete(`/members/${id}`);
  return data;
};

export const searchMembers = async (query) => {
  const { data } = await axios.get('/members/search', { params: { query } });
  return data;
};

export const getMemberStats = async () => {
  const { data } = await axios.get('/members/stats');
  return data;
};

export const getMembersByFamily = async (familyId) => {
  const { data } = await axios.get(`/members/family/${familyId}`);
  return data;
};

export const exportMembers = async (params) => {
  const { data } = await axios.get('/members/export', {
    params,
    responseType: 'blob',
  });
  return data;
};


export const exportAllMembers = async (params = {}) => {
  const response = await axios.get('/reports/export/members', {
    params,
    responseType: 'blob',
  });
  return response.data;
};


export const exportFamilyTree = async (params = {}) => {
  const response = await axios.get('/reports/export/family-tree', {
    params,
  });
  return response.data;
};


export const getNextRollNumber = async () => {
  const { data } = await axios.get('/members/next-roll-number');
  return data;
};