import { api } from './client'
export const getCategories = () => api.get('/categories').then((r) => r.data.data)
export const getProducts = (params = {}) => api.get('/products', { params }).then((r) => r.data)
export const getProduct = (slug) => api.get(`/products/${slug}`).then((r) => r.data.data)
export const getSuggestions = (q) => api.get('/products/suggestions', { params: { q } }).then((r) => r.data.data)
export const getBanners = () => api.get('/banners').then((r) => r.data.data)
export const getPaymentMethods = () => api.get('/payment-methods').then((r) => r.data.data)
