import axios from 'axios'
import { getAccessToken } from './client'

const CHATBOT_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000'

const chatbotClient = axios.create({
  baseURL: CHATBOT_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Send a chat message to the HEXA AI Python FastAPI backend (Google Gemini).
 * Automatically attaches user Bearer accessToken (if authenticated) and the current route.
 */
export const sendChatMessage = async ({
  message,
  history = [],
  page = '',
  cartProductIds = [],
  guestViewProductIds = [],
}) => {
  const token = getAccessToken()
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await chatbotClient.post(
    '/api/chat',
    {
      message: String(message).trim(),
      history: Array.isArray(history) ? history : [],
      page: page || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      cartProductIds: Array.isArray(cartProductIds) ? cartProductIds : [],
      guestViewProductIds: Array.isArray(guestViewProductIds) ? guestViewProductIds : [],
    },
    { headers }
  )

  return response.data
}

/**
 * Check if the Python chatbot microservice is online and reachable.
 */
export const checkChatbotHealth = async () => {
  try {
    const response = await chatbotClient.get('/health', { timeout: 3000 })
    return response.data
  } catch (err) {
    return { ok: false, error: err?.message }
  }
}
