
import axios from './axios';

export const getNotifications = async (params = {}) => {
  const { data } = await axios.get('/notifications', { params });
  return data;
};

export const getNotificationById = async (id) => {
  const { data } = await axios.get(`/notifications/${id}`);
  return data;
};

export const markAsRead = async (id) => {
  const { data } = await axios.put(`/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async () => {
  const { data } = await axios.put('/notifications/read-all');
  return data;
};

export const deleteNotification = async (id) => {
  const { data } = await axios.delete(`/notifications/${id}`);
  return data;
};

// Everything, or with { isRead: true } only what has been read
export const deleteAllNotifications = async (params = {}) => {
  const { data } = await axios.delete('/notifications', { params });
  return data;
};

export const getUnreadCount = async () => {
  const { data } = await axios.get('/notifications/unread');
  return data;
};

export const createNotification = async (notificationData) => {
  const { data } = await axios.post('/notifications', notificationData);
  return data;
};