import { api } from './client'

const cache = new Map()
const inflight = new Map()

/**
 * Perform a cached GET request with automatic in-flight deduplication.
 * @param {string} url - API endpoint path
 * @param {object} [config={}] - Axios request config (params, headers, etc.)
 * @param {number} [ttlMs=60000] - Cache time-to-live in milliseconds (default: 60s)
 * @returns {Promise<any>} The response body (response.data)
 */
export async function cachedGet(url, config = {}, ttlMs = 60000) {
  const serializedParams = config.params ? JSON.stringify(config.params) : ''
  const key = `${url}?${serializedParams}`
  const now = Date.now()

  // 1. Check valid memory cache
  const cached = cache.get(key)
  if (cached && now < cached.expiresAt) {
    return cached.data
  }

  // 2. In-flight request deduplication
  if (inflight.has(key)) {
    return inflight.get(key)
  }

  // 3. Initiate request
  const requestPromise = api
    .get(url, config)
    .then((response) => {
      const data = response.data
      cache.set(key, { data, expiresAt: Date.now() + ttlMs })
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, requestPromise)
  return requestPromise
}

/**
 * Invalidate client-side cache entries.
 * @param {string} [urlPattern] - If provided, only keys containing this string are purged; otherwise clears all.
 */
export function invalidateClientCache(urlPattern) {
  if (!urlPattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key)
    }
  }
}
