import SiteSettings from '../models/SiteSettings.js';
export const getSettings = async () => SiteSettings.findOneAndUpdate({ key: 'global' }, {
  $setOnInsert: {
    currencies: [{ code: 'BDT', symbol: '৳', rateFromBDT: 1, active: true }, { code: 'USD', symbol: '$', rateFromBDT: 0.0082, active: true }],
    faq: [
      { question: 'How do I receive my digital product?', answer: 'After payment verification, delivery details appear securely inside the relevant order in your HEXA account.' },
      { question: 'Can I request a refund?', answer: 'Eligible orders can submit a refund request from the account panel for administrator review.' },
    ],
  },
}, { upsert: true, new: true, setDefaultsOnInsert: true });
