import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  description: { type: String, default: '', maxlength: 300 },
  permissions: { type: [String], default: [] },
  system: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Role', schema);
