#!/usr/bin/env node
// Generate VAPID key pair for Web Push notifications
// Run once: node scripts/generate-vapid-keys.mjs
// Save the output as environment variables

import { webcrypto } from 'crypto';
const { subtle } = webcrypto;

const keyPair = await subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const publicKeyJwk = await subtle.exportKey('jwk', keyPair.publicKey);
const privateKeyJwk = await subtle.exportKey('jwk', keyPair.privateKey);

// Raw public key (65 bytes uncompressed) as URL-safe base64
const publicKeyRaw = await subtle.exportKey('raw', keyPair.publicKey);
const publicKeyBase64 = Buffer.from(publicKeyRaw)
  .toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

// Private key 'd' parameter as URL-safe base64
const privateKeyBase64 = privateKeyJwk.d;

console.log('=== VAPID Keys Generated ===\n');
console.log('Add these to your environment:\n');
console.log('# Frontend (.env or Vercel):');
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKeyBase64}\n`);
console.log('# Supabase Edge Functions (supabase secrets set):');
console.log(`VAPID_PUBLIC_KEY=${publicKeyBase64}`);
console.log(`VAPID_PRIVATE_KEY=${privateKeyBase64}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com\n`);
console.log('# JWK format (for reference):');
console.log('Public:', JSON.stringify(publicKeyJwk));
console.log('Private:', JSON.stringify(privateKeyJwk));
