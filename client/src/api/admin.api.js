import { api } from './client'
export const adminGet = (path, params = {}) => api.get(`/admin${path}`, { params }).then((r) => r.data)
export const adminPost = (path, payload) => api.post(`/admin${path}`, payload).then((r) => r.data)
export const adminPut = (path, payload) => api.put(`/admin${path}`, payload).then((r) => r.data)
export const adminPatch = (path, payload) => api.patch(`/admin${path}`, payload).then((r) => r.data)
export const adminDelete = (path) => api.delete(`/admin${path}`).then((r) => r.data)
export const uploadAdminImage = (file, folder = 'uploads') => {
  const data = new FormData()
  data.append('image', file)
  data.append('folder', folder)
  return api.post('/admin/uploads/image', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data)
}
