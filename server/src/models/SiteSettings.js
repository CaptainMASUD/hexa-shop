import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  storeName: { type: String, default: 'HEXA' },
  tagline: { type: String, default: 'Digital products, subscriptions, games & tools.' },
  seo: {
    title: { type: String, default: 'HEXA — Digital Products Marketplace' },
    description: { type: String, default: 'Shop subscriptions, games, tools and software securely.' },
    keywords: { type: [String], default: [] },
    ogImage: { type: String, default: '' },
  },
  homepage: {
    announcement: { type: String, default: 'Secure digital delivery • Verified orders • Fast support' },
    showCategories: { type: Boolean, default: true },
    showFeatured: { type: Boolean, default: true },
    showBundles: { type: Boolean, default: true },
    showPromotions: { type: Boolean, default: true },
    showPopular: { type: Boolean, default: true },
    showWhyHexa: { type: Boolean, default: true },
  },
  currencies: [{
    code: { type: String, required: true, uppercase: true },
    symbol: { type: String, required: true },
    rateFromBDT: { type: Number, min: 0.000001, default: 1 },
    active: { type: Boolean, default: true },
  }],
  loyalty: {
    enabled: { type: Boolean, default: true },
    pointsPer100BDT: { type: Number, default: 1, min: 0 },
    pointValueBDT: { type: Number, default: 1, min: 0 },
    referralRewardBDT: { type: Number, default: 50, min: 0 },
  },
  faq: [{ question: { type: String, required: true }, answer: { type: String, required: true } }],
  webhooks: [{ name: String, url: String, events: [String], active: { type: Boolean, default: false }, secret: { type: String, select: false } }],
}, { timestamps: true });
export default mongoose.model('SiteSettings', schema);
