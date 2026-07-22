const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32ToBytes = (base32) => {
  const clean = String(base32).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return new Uint8Array(bytes);
};

export const generateTotpSecret = (length = 16) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
};

export const getOtpAuthUrl = (secret, accountName = 'admin', issuer = 'Telefoncum') => {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
};

export const generateTotpToken = async (secret, counter = Math.floor(Date.now() / 1000 / 30)) => {
  const keyBytes = base32ToBytes(secret);
  if (keyBytes.length === 0) return '';

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const counterBytes = new Uint8Array(8);
  let tempCounter = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
  const sigBytes = new Uint8Array(signature);
  
  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
};

export const verifyTotpCode = async (secret, code, window = 1) => {
  if (!secret || !code) return false;
  const cleanCode = String(code).trim();
  if (cleanCode.length !== 6) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const expected = await generateTotpToken(secret, currentCounter + errorWindow);
    if (expected === cleanCode) {
      return true;
    }
  }
  return false;
};
