
import axios from './axios';

export const generateFamilyReport = async (params) => {
  const response = await axios.get('/reports/family', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const generateAllFamiliesReport = async (params) => {
  const response = await axios.get('/reports/all-families', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const generateMemberReport = async (params) => {
  const response = await axios.get('/reports/members', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const generateGenerationReport = async (params) => {
  const response = await axios.get('/reports/generation', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const generateDonationReport = async (params) => {
  const response = await axios.get('/reports/donation', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const generateDemographicReport = async (params) => {
  const response = await axios.get('/reports/demographic', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const generateGenealogyReport = async (params) => {
  const response = await axios.get('/reports/genealogy', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const exportAllMembers = async (params) => {
  const response = await axios.get('/reports/export/members', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

export const exportFamilyTree = async (params) => {
  const response = await axios.get('/reports/export/family-tree', { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};