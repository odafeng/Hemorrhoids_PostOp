// Web Push sender for Deno (Supabase Edge Functions)
// Implements VAPID (RFC 8292) + Content Encryption (RFC 8291)
// Uses Web Crypto API — no external dependencies

// ── Base64url helpers ──

function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "==".slice(0, (4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// ── VAPID JWT ──

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64url: string,
  publicKeyBase64url: string,
): Promise<{ authorization: string; cryptoKey: string }> {
  // Import private key
  const privateKeyBytes = base64urlDecode(privateKeyBase64url);
  const publicKeyBytes = base64urlDecode(publicKeyBase64url);

  // Build JWK from raw private key 'd' and public key 'x','y'
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyBase64url,
    x: base64urlEncode(publicKeyBytes.slice(1, 33)),
    y: base64urlEncode(publicKeyBytes.slice(33, 65)),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  // JWT header + payload
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const headerB64 = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const payloadB64 = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const unsigned = `${headerB64}.${payloadB64}`;

  // Sign
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // DER format: parse r and s
    const r = parseDerInt(sigBytes, 3);
    const sOffset = 3 + 1 + sigBytes[3];
    const s = parseDerInt(sigBytes, sOffset + 1);
    rawSig = new Uint8Array(64);
    rawSig.set(padTo32(r), 0);
    rawSig.set(padTo32(s), 32);
  }

  const jwt = `${unsigned}.${base64urlEncode(rawSig)}`;
  return {
    authorization: `vapid t=${jwt}, k=${publicKeyBase64url}`,
    cryptoKey: publicKeyBase64url,
  };
}

function parseDerInt(buf: Uint8Array, offset: number): Uint8Array {
  const len = buf[offset];
  return buf.slice(offset + 1, offset + 1 + len);
}

function padTo32(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) return bytes.slice(bytes.length - 32);
  const padded = new Uint8Array(32);
  padded.set(bytes, 32 - bytes.length);
  return padded;
}

// ── HKDF ──

async function hkdfExtract(
  salt: Uint8Array,
  ikm: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    salt.length > 0 ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const prk = await crypto.subtle.sign("HMAC", key, ikm);
  return new Uint8Array(prk);
}

async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  // Single iteration (length <= 32)
  const input = new Uint8Array(info.length + 1);
  input.set(info);
  input[info.length] = 1;
  const output = await crypto.subtle.sign("HMAC", key, input);
  return new Uint8Array(output).slice(0, length);
}

// ── Content Encryption (RFC 8291) ──

async function encryptPayload(
  plaintext: Uint8Array,
  subscriberPublicKeyBase64url: string,
  authSecretBase64url: string,
): Promise<{ body: Uint8Array; ephemeralPublicKey: Uint8Array }> {
  const subscriberPublicKeyBytes = base64urlDecode(subscriberPublicKeyBase64url);
  const authSecret = base64urlDecode(authSecretBase64url);

  // Import subscriber public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // Generate ephemeral ECDH key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const ephemeralPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey),
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      ephemeralKeyPair.privateKey,
      256,
    ),
  );

  // Key derivation per RFC 8291 Section 3.4
  const prk = await hkdfExtract(authSecret, sharedSecret);

  // info = "WebPush: info\0" + subscriber_public_key + ephemeral_public_key
  const infoPrefix = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array(
    infoPrefix.length + subscriberPublicKeyBytes.length + ephemeralPublicKey.length,
  );
  keyInfo.set(infoPrefix, 0);
  keyInfo.set(subscriberPublicKeyBytes, infoPrefix.length);
  keyInfo.set(ephemeralPublicKey, infoPrefix.length + subscriberPublicKeyBytes.length);

  const ikm = await hkdfExpand(prk, keyInfo, 32);

  // Salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk2 = await hkdfExtract(salt, ikm);

  // Content Encryption Key (16 bytes)
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdfExpand(prk2, cekInfo, 16);

  // Nonce (12 bytes)
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdfExpand(prk2, nonceInfo, 12);

  // Pad plaintext + delimiter (0x02 = final record)
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 0x02;

  // Encrypt with AES-128-GCM
  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      encryptionKey,
      padded,
    ),
  );

  // Build aes128gcm body:
  // salt (16) + record_size (4, uint32 BE) + key_id_len (1) + key_id (65) + ciphertext
  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize);
  header[20] = 65; // key_id_len = uncompressed public key length
  header.set(ephemeralPublicKey, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header);
  body.set(ciphertext, header.length);

  return { body, ephemeralPublicKey };
}

// ── Public API ──

export interface PushSubscription {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

export interface PushResult {
  endpoint: string;
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * Send a Web Push notification to a single subscription.
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: object | string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<PushResult> {
  try {
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadStr);

    // Encrypt payload
    const { body } = await encryptPayload(
      payloadBytes,
      subscription.keys_p256dh,
      subscription.keys_auth,
    );

    // Create VAPID authorization
    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;
    const { authorization } = await createVapidJwt(
      audience,
      vapidSubject,
      vapidPrivateKey,
      vapidPublicKey,
    );

    // Send push
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        "Urgency": "normal",
      },
      body,
    });

    if (response.status === 201 || response.status === 202) {
      return { endpoint: subscription.endpoint, success: true, status: response.status };
    }

    // 404 or 410 = subscription expired/invalid
    const errText = await response.text();
    return {
      endpoint: subscription.endpoint,
      success: false,
      status: response.status,
      error: errText,
    };
  } catch (err) {
    return {
      endpoint: subscription.endpoint,
      success: false,
      error: err.message,
    };
  }
}

/**
 * Send push notifications to multiple subscriptions.
 * Returns results for each, with expired subscriptions flagged.
 */
export async function sendPushToMany(
  subscriptions: PushSubscription[],
  payload: object | string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<{ results: PushResult[]; expired: string[] }> {
  const results = await Promise.all(
    subscriptions.map((sub) =>
      sendPushNotification(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject)
    ),
  );

  // 404/410 means the subscription is no longer valid
  const expired = results
    .filter((r) => !r.success && (r.status === 404 || r.status === 410))
    .map((r) => r.endpoint);

  return { results, expired };
}
