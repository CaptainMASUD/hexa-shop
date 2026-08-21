import { api } from './client'
export const registerUser = (payload) => api.post('/auth/register', payload).then((r) => r.data.data)
export const loginUser = (payload) => api.post('/auth/login', payload).then((r) => r.data.data)
export const loginAdmin = (payload) => api.post('/auth/admin/login', payload).then((r) => r.data.data)
export const logoutUser = () => api.post('/auth/logout').then((r) => r.data)
export const updateProfile = (payload) => api.patch('/auth/profile', payload).then((r) => r.data.data)
export const changePassword = (payload) => api.patch('/auth/password', payload).then((r) => r.data)
