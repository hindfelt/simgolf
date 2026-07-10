const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface OAuthTransaction {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  expiresAt: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomToken(byteLength = 32): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256(value: string): Promise<string> {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signTransaction(transaction: OAuthTransaction, secret: string): Promise<string> {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify(transaction)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyTransaction(value: string | undefined, secret: string, now = Date.now()): Promise<OAuthTransaction | null> {
  if (!value) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), base64UrlToBytes(signature), encoder.encode(payload));
    if (!valid) return null;
    const parsed = JSON.parse(decoder.decode(base64UrlToBytes(payload))) as Partial<OAuthTransaction>;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.verifier !== 'string' ||
      typeof parsed.returnTo !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt < now
    ) return null;
    return parsed as OAuthTransaction;
  } catch {
    return null;
  }
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return sha256(verifier);
}

export function cookieNames(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === 'https:';
  return {
    secure,
    oauth: secure ? '__Host-fm_oauth' : 'fm_oauth',
    session: secure ? '__Host-fm_session' : 'fm_session',
    csrf: secure ? '__Host-fm_csrf' : 'fm_csrf',
  };
}

export function safeReturnTo(candidate: string | undefined, configuredUrl: string): string {
  const fallback = new URL(configuredUrl);
  if (!candidate || candidate.length > 1000) return fallback.toString();
  try {
    const parsed = new URL(candidate, fallback);
    return parsed.origin === fallback.origin ? parsed.toString() : fallback.toString();
  } catch {
    return fallback.toString();
  }
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigin: string): boolean {
  return !origin || origin === allowedOrigin;
}
