import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export const verifyBotProtection = async (req, _res, next) => {
  try {
    const turnstileToken = req.headers['cf-turnstile-response'] || req.body?.botShieldToken || req.body?.turnstileToken;
    const turnstileSecret = env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;

    // If Cloudflare Turnstile secret key is configured in environment, verify with Cloudflare API
    if (turnstileSecret && turnstileToken) {
      const clientIp = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
      const formData = new URLSearchParams();
      formData.append('secret', turnstileSecret);
      formData.append('response', turnstileToken);
      if (clientIp) formData.append('remoteip', clientIp);

      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });

      const outcome = await response.json();
      if (!outcome.success) {
        throw new ApiError(403, 'Bot security challenge failed. Please refresh and try again.');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
