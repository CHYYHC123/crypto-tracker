const PUBLIC_KEY_HEX = '302a300506032b657003210067f28f6a5ed8ca3c0b42deb1c47457e9afdc745748eb2fb29abf089843792ec5';
const FIXED_PAYLOAD = 'CHY_Crypto_Tracker';

/**
 * 将 Hex 字符串还原为 Web Crypto 识别的 Uint8Array 并导入
 */
async function importPublicKeyFromHex(hex: string) {
  if (!hex) return null;
  const bytes = Uint8Array.from((hex.match(/.{1,2}/g) ?? []).map(b => parseInt(b, 16)));

  return await crypto.subtle.importKey('spki', bytes, { name: 'Ed25519' }, true, ['verify']);
}

/**
 * 校验函数
 */
export async function verifyToken(token: string) {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const signatureBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const publicKey = await importPublicKeyFromHex(PUBLIC_KEY_HEX);
    if (!publicKey) return false;

    const dataBuffer = new TextEncoder().encode(FIXED_PAYLOAD);

    return await crypto.subtle.verify('Ed25519', publicKey, signatureBuffer, dataBuffer);
  } catch (e) {
    return false;
  }
}
