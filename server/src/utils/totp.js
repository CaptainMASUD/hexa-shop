import crypto from 'crypto';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const generateTotpSecret = (bytes = 20) => {
  const buffer = crypto.randomBytes(bytes); let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let out = ''; for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
};
const decodeBase32 = (value) => {
  let bits = ''; for (const char of value.replace(/=+$/,'').toUpperCase()) { const idx = ALPHABET.indexOf(char); if (idx >= 0) bits += idx.toString(2).padStart(5,'0'); }
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i,i+8),2));
  return Buffer.from(bytes);
};
export const totp = (secret, timestamp = Date.now(), step = 30) => {
  const counter = Math.floor(timestamp / 1000 / step); const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', decodeBase32(secret)).update(msg).digest(); const offset = hmac[hmac.length-1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000; return String(code).padStart(6,'0');
};
export const verifyTotp = (secret, token, window = 1) => {
  const normalized = String(token || '').replace(/\s/g,''); if (!/^\d{6}$/.test(normalized)) return false;
  for (let i = -window; i <= window; i += 1) if (totp(secret, Date.now() + i * 30000) === normalized) return true;
  return false;
};
