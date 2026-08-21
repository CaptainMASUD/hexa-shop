import { api } from './client'
export const createOrder = (payload) => api.post('/orders', payload).then((r) => r.data.data)
export const getMyOrders = (params = {}) => api.get('/orders', { params }).then((r) => r.data)
export const getMyOrder = (id) => api.get(`/orders/${id}`).then((r) => r.data.data)
