import { http } from '../http';

export const login = async ({ email, username, phone, password }) => {
  const payload = { password };
  if (username) payload.username = username;
  else if (phone) payload.phone = phone;
  else payload.email = email;
  return http.post('/auth/login', payload);
};

export const register = async ({ email, username, phone, password, name, role, campusId, jobTitle, department, active }) => {
  return http.post('/auth/register', { email, username, phone, password, name, role, campusId, jobTitle, department, active });
};

export const getVisibilitySettings = async () => {
  return http.get('/auth/visibility-settings');
};

export const updateVisibilitySetting = async (data) => {
  return http.put('/auth/visibility-settings', data);
};

export const status = async () => {
  return http.get('/auth/status');
};

export const logout = async () => {
  return http.post('/auth/logout');
};

export const refresh = async () => {
  return http.post('/auth/refresh');
};

// Admin only: list all users with roles
export const getUsers = async (params) => {
  return http.get('/auth/users', { params });
};

export const updateUser = (id, data) => http.put(`/auth/users/${id}`, data);
export const deleteUser = (id) => http.delete(`/auth/users/${id}`);

export const profile = async () => {
  return http.get('/auth/profile');
};

export const updateMyProfile = (data) => http.put('/auth/profile', data);

export const profileSafe = async (options = {}) => {
  return http.get('/auth/profile', { ...options, skipUnauthorizedHandler: true });
};

// Admin only: backfill user accounts from domain tables by role
export const backfillUsers = async ({ role }) => {
  return http.post('/auth/backfill-users', { role });
};
