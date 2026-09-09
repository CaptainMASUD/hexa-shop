import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';
import { env, isProduction } from '../config/env.js';
import { hashToken } from '../utils/security.js';
import ApiError from '../utils/ApiError.js';

const refreshCookieName = 'hexa_refresh';
const REUSE_GRACE_PERIOD_MS = 25 * 1000; // 25s grace window for concurrent requests on reload

const refreshCookieOptions = (expiresAt) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  expires: expiresAt,
});

export const signAccessToken = (user) => jwt.sign(
  { sub: user._id.toString(), role: user.role, type: 'access' },
  env.JWT_SECRET,
  { expiresIn: env.ACCESS_TOKEN_EXPIRY },
);

const createRefreshToken = (user, sessionId) => jwt.sign(
  { sub: user._id.toString(), sid: sessionId.toString(), type: 'refresh' },
  env.REFRESH_TOKEN_SECRET,
  { expiresIn: env.REFRESH_TOKEN_EXPIRY },
);

const decodeExpiry = (token) => {
  const decoded = jwt.decode(token);
  return new Date(decoded.exp * 1000);
};

export const createSessionTokens = async (user, requestMeta = {}) => {
  const session = new Session({
    user: user._id,
    tokenHash: 'pending',
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    ipAddress: requestMeta.ipAddress || '',
    userAgent: requestMeta.userAgent || '',
  });
  const refreshToken = createRefreshToken(user, session._id);
  session.tokenHash = hashToken(refreshToken);
  session.expiresAt = decodeExpiry(refreshToken);
  await session.save();
  return { accessToken: signAccessToken(user), refreshToken, expiresAt: session.expiresAt, session };
};

export const rotateRefreshToken = async (rawToken, requestMeta = {}) => {
  let payload;
  try {
    payload = jwt.verify(rawToken, env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }
  if (payload.type !== 'refresh' || !payload.sid) throw new ApiError(401, 'Invalid refresh token');

  const current = await Session.findById(payload.sid);
  if (!current || current.expiresAt <= new Date() || current.tokenHash !== hashToken(rawToken)) {
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  const User = (await import('../models/User.js')).default;
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account is unavailable');

  // If already revoked, check if it was recently rotated within the grace window (concurrency/page reload race)
  if (current.revokedAt) {
    const elapsed = Date.now() - new Date(current.revokedAt).getTime();
    if (elapsed < REUSE_GRACE_PERIOD_MS && current.rotatedTo) {
      const activeSession = await Session.findById(current.rotatedTo);
      if (activeSession && !activeSession.revokedAt && activeSession.expiresAt > new Date()) {
        return {
          accessToken: signAccessToken(user),
          refreshToken: rawToken,
          expiresAt: activeSession.expiresAt,
          session: activeSession,
          user,
        };
      }
    }

    if (current?.user) {
      await Session.updateMany({ user: current.user, revokedAt: null }, { revokedAt: new Date() });
    }
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  const next = await createSessionTokens(user, requestMeta);
  current.revokedAt = new Date();
  current.rotatedTo = next.session._id;
  await current.save();
  return { ...next, user };
};

export const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  try {
    const payload = jwt.verify(rawToken, env.REFRESH_TOKEN_SECRET);
    if (payload.sid) await Session.findByIdAndUpdate(payload.sid, { revokedAt: new Date() });
  } catch {
    // Logout remains idempotent for invalid/expired cookies.
  }
};

export const setRefreshCookie = (res, refreshToken, expiresAt) => {
  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions(expiresAt));
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
};

export const getRefreshCookie = (req) => req.cookies?.[refreshCookieName];
