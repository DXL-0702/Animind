import crypto from 'crypto';

const REGION = 'cn-north-1';
const SERVICE = 'cv';
const HOST = 'visual.volcengineapi.com';
const ALGORITHM = 'HMAC-SHA256';

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function hmacSha256Hex(key: Buffer | string, data: string): string {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

function getDateTimeStrings(date: Date): { dateStamp: string; dateTime: string } {
  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // iso is like "20260320T120000Z"
  return {
    dateStamp: iso.slice(0, 8),   // "20260320"
    dateTime: iso,                 // "20260320T120000Z"
  };
}

/**
 * Sign a request to the Volcengine Visual API using HMAC-SHA256.
 * Implements the Volcengine SigV4-style signing process.
 */
export function signVisualRequest(
  action: string,
  version: string,
  body: Record<string, unknown>,
): SignedRequest {
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY?.trim();
  const secretKey = process.env.VOLCENGINE_SECRET_KEY?.trim();

  if (!accessKeyId || !secretKey) {
    throw new Error('VOLCENGINE_ACCESS_KEY or VOLCENGINE_SECRET_KEY not configured');
  }

  const bodyStr = JSON.stringify(body);
  const now = new Date();
  const { dateStamp, dateTime } = getDateTimeStrings(now);

  // Canonical query string (sorted by key)
  const queryParams: Record<string, string> = { Action: action, Version: version };
  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  // Headers to sign
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'host': HOST,
    'x-date': dateTime,
    'x-content-sha256': sha256(bodyStr),
  };

  // Canonical headers (sorted by lowercase key)
  const signedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderKeys
    .map(k => `${k}:${headers[k].trim()}`)
    .join('\n') + '\n';
  const signedHeaders = signedHeaderKeys.join(';');

  // Canonical request
  const bodyHash = sha256(bodyStr);
  const canonicalRequest = [
    'POST',
    '/',
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  // Credential scope
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/request`;

  // String to sign
  const stringToSign = [
    ALGORITHM,
    dateTime,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  // Signing key
  const kDate = hmacSha256(secretKey, dateStamp);
  const kRegion = hmacSha256(kDate, REGION);
  const kService = hmacSha256(kRegion, SERVICE);
  const kSigning = hmacSha256(kService, 'request');

  // Signature
  const signature = hmacSha256Hex(kSigning, stringToSign);

  // Authorization header
  const authorization = `${ALGORITHM} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Build final headers (use proper casing for HTTP)
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': HOST,
    'X-Date': dateTime,
    'X-Content-Sha256': sha256(bodyStr),
    'Authorization': authorization,
  };

  const qs = new URLSearchParams({ Action: action, Version: version }).toString();
  const url = `https://${HOST}/?${qs}`;

  return {
    url,
    headers: finalHeaders,
    body: bodyStr,
  };
}
