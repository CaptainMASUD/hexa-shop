import crypto from 'crypto';
import SiteSettings from '../models/SiteSettings.js';

export const emitWebhook = async (event, payload) => {
  const settings = await SiteSettings.findOne({ key: 'global' }).select('+webhooks.secret').lean().catch(() => null);
  const hooks = (settings?.webhooks || []).filter((hook) => hook.active && hook.url && (hook.events || []).includes(event));
  if (!hooks.length) return;
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data: payload });
  await Promise.allSettled(hooks.map(async (hook) => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const signature = hook.secret ? crypto.createHmac('sha256', hook.secret).update(body).digest('hex') : '';
      await fetch(hook.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hexa-event': event, 'x-hexa-signature': signature }, body, signal: controller.signal });
    } finally { clearTimeout(timeout); }
  }));
};
