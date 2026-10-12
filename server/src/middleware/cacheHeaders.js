/**
 * Cache-Control middleware for public read-only API routes.
 * Enables browser and edge CDN caching with background stale-while-revalidate.
 * Only applies to unauthenticated GET requests.
 */
export const publicCacheControl = (maxAgeSeconds = 60, staleSeconds = 300) => (req, res, next) => {
  if (req.method === 'GET' && !req.headers.authorization) {
    res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`);
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
};

export default publicCacheControl;
