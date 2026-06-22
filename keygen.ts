// @ts-nocheck
import { randomBytes, createHash } from 'node:crypto';
// import * as crypto from 'node:crypto';

const rawKey = 'hxs_' + randomBytes(32).toString('hex');
const keyHash = createHash('sha256').update(rawKey).digest('hex');

console.log('--- ADD THIS TO YOUR DATABASE ---');
console.log('Raw Key (Keep this secret!):', rawKey);
console.log('Key Hash (Store this in DB):', keyHash);
