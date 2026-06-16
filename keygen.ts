// @ts-nocheck
import * as crypto from 'crypto';

const rawKey = 'hxs_' + crypto.randomBytes(32).toString('hex');
const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

console.log('--- ADD THIS TO YOUR DATABASE ---');
console.log('Raw Key (Keep this secret!):', rawKey);
console.log('Key Hash (Store this in DB):', keyHash);
