import { api } from './client'
import { cachedGet } from './apiCache'

export const getCategories = () => cachedGet('/categories', {}, 120000).then((r) => r.data)
export const getProducts = (params = {}) => cachedGet('/products', { params }, 60000)
export const getProduct = (slug) => cachedGet(`/products/${slug}`, {}, 60000).then((r) => r.data)
export const getSuggestions = (q) => cachedGet('/products/suggestions', { params: { q } }, 30000).then((r) => r.data)
export const getBanners = (params = {}) => cachedGet('/banners', { params }, 120000).then((r) => r.data)
export const getPaymentMethods = () => cachedGet('/payment-methods', {}, 300000).then((r) => r.data)
export const subscribeRestockAlert = (productId, data) => api.post(`/products/${productId}/restock-alert`, data).then((r) => r.data)

