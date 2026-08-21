import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: Date,
  rotatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
