import SiteSettings from '../models/SiteSettings.js';
import serverCache from '../utils/cache.js';

const SETTINGS_CACHE_KEY = 'site_settings:global';
const SETTINGS_TTL_SECONDS = 300; // 5 minutes

export const getSettings = async () => {
  const cached = serverCache.get(SETTINGS_CACHE_KEY);
  if (cached) return cached;

  let doc = await SiteSettings.findOne({ key: 'global' }).lean();

  if (!doc) {
    doc = await SiteSettings.findOneAndUpdate(
      { key: 'global' },
      {
        $setOnInsert: {
          currencies: [
            { code: 'BDT', symbol: '৳', rateFromBDT: 1, active: true },
            { code: 'USD', symbol: '$', rateFromBDT: 0.0082, active: true },
          ],
          faq: [
            { question: 'How do I receive my digital product?', answer: 'After payment verification, delivery details appear securely inside the relevant order in your HEXA account.' },
            { question: 'Can I request a refund?', answer: 'Eligible orders can submit a refund request from the account panel for administrator review.' },
          ],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (doc?.toObject) doc = doc.toObject();
  }

  serverCache.set(SETTINGS_CACHE_KEY, doc, SETTINGS_TTL_SECONDS, ['settings', 'home']);
  return doc;
};

export const invalidateSettingsCache = () => {
  serverCache.invalidateTags(['settings', 'home']);
};
