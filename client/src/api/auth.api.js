import { api } from './client'
export const registerUser = (payload) => api.post('/auth/register', payload).then((r) => r.data)
export const loginUser = (payload) => api.post('/auth/login', payload).then((r) => r.data.data)
export const verifyEmailApi = (payload) => api.post('/auth/verify-email', payload).then((r) => r.data)
export const resendVerificationApi = (payload) => api.post('/auth/resend-verification', payload).then((r) => r.data)
export const registerAdmin = (payload) => api.post('/auth/admin/register', payload).then((r) => r.data.data)
export const loginAdmin = (payload) => api.post('/auth/admin/login', payload).then((r) => r.data.data)
export const logoutUser = () => api.post('/auth/logout').then((r) => r.data)
export const updateProfile = (payload) => api.patch('/auth/profile', payload).then((r) => r.data.data)
export const uploadAvatarApi = (file) => {
  const formData = new FormData()
  formData.append('avatar', file)
  return api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data)
}
export const removeAvatarApi = () => api.delete('/auth/avatar').then((r) => r.data.data)
export const changePassword = (payload) => api.patch('/auth/password', payload).then((r) => r.data)
export const forgotPasswordApi = (payload) => api.post('/auth/forgot-password', payload).then((r) => r.data)
export const resetPasswordApi = (payload) => api.post('/auth/reset-password', payload).then((r) => r.data)


