import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
let accessToken = ''
let refreshPromise = null

export const setAccessToken = (token = '') => {
  accessToken = token || ''
}

export const getAccessToken = () => accessToken

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const refreshClient = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 15000 })

export const refreshSessionApi = async () => {
  if (refreshPromise) return refreshPromise
  refreshPromise = refreshClient
    .post('/auth/refresh')
    .then((response) => {
      const data = response.data?.data
      if (data?.accessToken) {
        setAccessToken(data.accessToken)
        window.dispatchEvent(new CustomEvent('hexa:session-refreshed', { detail: data }))
        return data
      }
      setAccessToken('')
      return null
    })
    .catch((err) => {
      setAccessToken('')
      return null
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
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
        const session = await refreshSessionApi()
        if (session?.accessToken) {
          original.headers.Authorization = `Bearer ${session.accessToken}`
          return api(original)
        }
      } catch (refreshErr) {
        setAccessToken('')
        window.dispatchEvent(new Event('hexa:session-expired'))
        return Promise.reject(refreshErr)
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
