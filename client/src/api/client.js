import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
let accessToken = ''
let refreshPromise = null

export const setAccessToken = (token = '') => {
  accessToken = token || ''
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const refreshClient = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 15000 })

export const refreshSessionApi = async () => {
  const response = await refreshClient.post('/auth/refresh')
  setAccessToken(response.data.data.accessToken)
  window.dispatchEvent(new CustomEvent('hexa:session-refreshed', { detail: response.data.data }))
  return response.data.data
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isRefresh = original?.url?.includes('/auth/refresh')
    const isLogin = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/admin/login')
    if (status === 401 && original && !original._retry && !isRefresh && !isLogin) {
      original._retry = true
      try {
        refreshPromise ||= refreshSessionApi().finally(() => { refreshPromise = null })
        const session = await refreshPromise
        original.headers.Authorization = `Bearer ${session.accessToken}`
        return api(original)
      } catch {
        setAccessToken('')
        window.dispatchEvent(new Event('hexa:session-expired'))
      }
    }
    return Promise.reject(error)
  },
)

export const apiErrorMessage = (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data
  if (data?.details && Array.isArray(data.details) && data.details.length) {
    return data.details.map((d) => d.message || d.path).join(', ')
  }
  return data?.message || error?.message || fallback
}
