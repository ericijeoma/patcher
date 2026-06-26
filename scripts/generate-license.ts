#!/usr/bin/env tsx
/**
 * Hexis License Token Generator
 *
 * Generates Ed25519-signed offline license tokens for the Hexis cryptographic paywall.
 *
 * Usage:
 *   # Generate a new Ed25519 keypair and save to files
 *   npx tsx scripts/generate-license.ts --generate-keys
 *
 *   # Generate a license token for a customer
 *   npx tsx scripts/generate-license.ts --customer-id "cust_123" --expires "2025-12-31" --output token.txt
 *
 *   # Generate a license token with specific features
 *   npx tsx scripts/generate-license.ts --customer-id "cust_123" --features "static_analysis,ai_triage,ci_cd" --output token.txt
 *
 * Token Format: hxs_lic_<base64url_payload>.<base64url_signature>
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Configuration
const KEYS_DIR = path.join(process.cwd(), 'keys');
const PRIVATE_KEY_FILE = path.join(KEYS_DIR, 'hexis-private-key.pem');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'hexis-public-key.pem');
const PUBLIC_KEY_CONSTANT_FILE = path.join(process.cwd(), 'src', 'license.rs');

// Ed25519 key pair for signing licenses
interface KeyPair {
    privateKey: crypto.KeyObject;
    publicKey: crypto.KeyObject;
    privateKeyPem: string;
    publicKeyPem: string;
    publicKeyBase64: string;
    publicKeyHex: string;
}

interface LicensePayload {
    license_id: string;
    customer_id: string;
    expires_at: number | null;
    features: string[];
    issued_at: number;
    version: string;
}

interface LicenseToken {
    payload: LicensePayload;
    signature: string;
    rawToken: string;
}

/**
 * Generate a new Ed25519 key pair
 */
function generateKeyPair(): KeyPair {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519') as {
        privateKey: crypto.KeyObject;
        publicKey: crypto.KeyObject;
    };

    const privateKeyPem = privateKey.export({
        type: 'pkcs8',
        format: 'pem',
    });

    const publicKeyPem = publicKey.export({
        type: 'spki',
        format: 'pem',
    });

    // Get raw bytes for base64 encoding
    const spkiBytes = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    
    // Ed25519 SPKI format is exactly 44 bytes: a static 12-byte ASN.1 header + the 32-byte raw key.
    // ed25519-dalek in Rust strictly requires the raw 32 bytes.
    const rawPublicKeyBytes = spkiBytes.subarray(spkiBytes.length - 32);
    
    const publicKeyBase64 = rawPublicKeyBytes.toString('base64');
    const publicKeyHex = rawPublicKeyBytes.toString('hex');

    return {
        privateKey,
        publicKey,
        privateKeyPem,
        publicKeyPem,
        publicKeyBase64,
        publicKeyHex,
    };
}

/**
 * Save key pair to files
 */
function saveKeyPair(keyPair: KeyPair): void {
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }

    fs.writeFileSync(PRIVATE_KEY_FILE, keyPair.privateKeyPem, 'utf-8');
    fs.writeFileSync(PUBLIC_KEY_FILE, keyPair.publicKeyPem, 'utf-8');

    console.log(`✅ Key pair generated and saved to ${KEYS_DIR}/`);
    console.log(`   Private key: ${PRIVATE_KEY_FILE}`);
    console.log(`   Public key:  ${PUBLIC_KEY_FILE}`);
    console.log(`\n⚠️  WARNING: Keep the private key SECURE! Anyone with access can generate valid licenses.`);
}

/**
 * Load existing key pair from files
 */
function loadKeyPair(): KeyPair | null {
    if (!fs.existsSync(PRIVATE_KEY_FILE) || !fs.existsSync(PUBLIC_KEY_FILE)) {
        return null;
    }

    const privateKeyPem = fs.readFileSync(PRIVATE_KEY_FILE, 'utf-8');
    const publicKeyPem = fs.readFileSync(PUBLIC_KEY_FILE, 'utf-8');

    const privateKey = crypto.createPrivateKey({
        key: privateKeyPem,
        format: 'pem',
        type: 'pkcs8',
    }) as crypto.KeyObject;

    const publicKey = crypto.createPublicKey({
        key: publicKeyPem,
        format: 'pem',
        type: 'spki',
    }) as crypto.KeyObject;

    const spkiBytes = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
    const rawPublicKeyBytes = spkiBytes.subarray(spkiBytes.length - 32);
    const publicKeyBase64 = rawPublicKeyBytes.toString('base64');
    const publicKeyHex = rawPublicKeyBytes.toString('hex');
    
    return {
        privateKey,
        publicKey,
        privateKeyPem,
        publicKeyPem,
        publicKeyBase64,
        publicKeyHex,
    };
}

/**
 * Update the Rust source code with the new public key constant
 */
function updateRustPublicKey(publicKeyBase64: string): void {
    const licenseRsPath = PUBLIC_KEY_CONSTANT_FILE;

    if (!fs.existsSync(licenseRsPath)) {
        console.warn(`⚠️  Rust license module not found at ${licenseRsPath}`);
        return;
    }

    const content = fs.readFileSync(licenseRsPath, 'utf-8');

    // Replace the public key constant
    const updatedContent = content.replace(
        /const HEXIS_PUBLIC_KEY_BASE64: &str = ".*?";/,
        `const HEXIS_PUBLIC_KEY_BASE64: &str = "${publicKeyBase64}";`
    );

    fs.writeFileSync(licenseRsPath, updatedContent, 'utf-8');
    console.log(`✅ Updated Rust public key constant in ${licenseRsPath}`);
}

/**
 * Generate a license token
 */
function generateLicenseToken(
    keyPair: KeyPair,
    customerId: string,
    expiresAt: Date | null,
    features: string[]
): LicenseToken {
    const licenseId = `lic_${crypto.randomBytes(16).toString('hex')}`;
    const issuedAt = Math.floor(Date.now() / 1000);

    const payload: LicensePayload = {
        license_id: licenseId,
        customer_id: customerId,
        expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
        features: features.length > 0 ? features : ['static_analysis', 'ai_triage'],
        issued_at: issuedAt,
        version: '1.0.0',
    };

    // Serialize payload to JSON and encode as base64url
    const payloadJson = JSON.stringify(payload);
    const payloadBuffer = Buffer.from(payloadJson, 'utf-8');
    const payloadBase64Url = payloadBuffer.toString('base64url');

    // Sign the payload with the private key
    const signature = crypto.sign(null, payloadBuffer, keyPair.privateKey);
    const signatureBase64Url = signature.toString('base64url');

    // Create the token: hxs_lic_<payload>.<signature>
    const rawToken = `hxs_lic_${payloadBase64Url}.${signatureBase64Url}`;

    return {
        payload,
        signature: signatureBase64Url,
        rawToken,
    };
}

/**
 * Parse and validate a license token (for testing)
 */
function validateLicenseToken(token: string, publicKey: crypto.KeyObject): boolean {
    if (!token.startsWith('hxs_lic_')) {
        return false;
    }

    // 1. Remove the 'hxs_lic_' prefix to get to the core payload
    const coreToken = token.replace('hxs_lic_', '');
    
    // 2. Split based on the single dot
    const parts = coreToken.split('.');
    
    // Check if we have exactly 2 parts (payload and signature)
    if (parts.length !== 2) {
        return false;
    }

    const payloadBase64Url = parts[0];
    const signatureBase64Url = parts[1];

    try {
        const payloadBuffer = Buffer.from(payloadBase64Url, 'base64url');
        const signature = Buffer.from(signatureBase64Url, 'base64url');

        // Use null for Ed25519
        return crypto.verify(
            null,
            payloadBuffer,
            publicKey,
            signature
        );
    } catch {
        return false;
    }
}
/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);

    // Parse command line arguments
    const options: Record<string, string> = {};
    let generateKeys = false;
    let customerId = '';
    let expires: Date | null = null;
    let outputFile: string | null = null;
    const features: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--generate-keys') {
            generateKeys = true;
        } else if (arg === '--customer-id') {
            customerId = args[++i];
        } else if (arg === '--expires') {
            expires = new Date(args[++i]);
        } else if (arg === '--output') {
            outputFile = args[++i];
        } else if (arg === '--features') {
            features.push(...args[++i].split(','));
        } else if (arg.startsWith('--')) {
            const key = arg.slice(2);
            options[key] = args[++i];
        }
    }

    // Generate new keys if requested
    if (generateKeys) {
        console.log('🔑 Generating new Ed25519 key pair for Hexis...');
        const keyPair = generateKeyPair();
        saveKeyPair(keyPair);
        updateRustPublicKey(keyPair.publicKeyBase64);
        console.log(`\n📋 Public Key (for Rust constant): ${keyPair.publicKeyBase64}`);
        return;
    }

    // Load existing key pair
    let keyPair = loadKeyPair();
    if (!keyPair) {
        console.error('❌ No existing key pair found.');
        console.error('   Run with --generate-keys first, or provide existing keys.');
        process.exit(1);
    }

    // Validate required arguments for token generation
    if (!customerId) {
        console.error('❌ Customer ID is required.');
        console.error('   Usage: tsx scripts/generate-license.ts --customer-id "cust_123" [--expires "2025-12-31"] [--output token.txt]');
        process.exit(1);
    }

    // Generate license token
    console.log(`🎫 Generating license token for customer: ${customerId}`);
    const token = generateLicenseToken(keyPair, customerId, expires, features);

    console.log(`\n📄 License Token:`);
    console.log(`   ${token.rawToken}`);

    console.log(`\n📋 Token Details:`);
    console.log(`   License ID: ${token.payload.license_id}`);
    console.log(`   Customer ID: ${token.payload.customer_id}`);
    console.log(`   Expires: ${token.payload.expires_at ? new Date(token.payload.expires_at * 1000).toISOString() : 'Never'}`);
    console.log(`   Features: ${token.payload.features.join(', ')}`);
    console.log(`   Issued: ${new Date(token.payload.issued_at * 1000).toISOString()}`);

    // Validate the token
    const isValid = validateLicenseToken(token.rawToken, keyPair.publicKey);
    console.log(`\n✅ Token validation: ${isValid ? 'PASSED' : 'FAILED'}`);

    // Save to file if output specified
    if (outputFile) {
        fs.writeFileSync(outputFile, token.rawToken, 'utf-8');
        console.log(`\n💾 Token saved to: ${outputFile}`);
    }

    // Show usage instructions
    console.log(`\n💡 Usage:`);
    console.log(`   Set as environment variable:`);
    console.log(`   export HEXIS_LICENSE_KEY="${token.rawToken}"`);
    console.log(`\n   Or pass directly to scan:`);
    console.log(`   HEXIS_LICENSE_KEY="${token.rawToken}" pnpm dlx tsx scan.ts your-file.exe`);
}

/**
 * Generate a sample token for testing (self-contained)
 */
function generateSampleToken(): void {
    console.log('🎫 Generating sample license token for testing...');
    const keyPair = generateKeyPair();
    const token = generateLicenseToken(keyPair, 'test_customer', null, ['static_analysis', 'ai_triage']);

    console.log(`\n📄 Sample License Token:`);
    console.log(`   ${token.rawToken}`);

    console.log(`\n📋 Public Key (add to src/license.rs):`);
    console.log(`   const HEXIS_PUBLIC_KEY_BASE64: &str = "${keyPair.publicKeyBase64}";`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}

// Export for programmatic use
export {
    generateKeyPair,
    generateLicenseToken,
    validateLicenseToken,
    loadKeyPair,
    generateSampleToken,
};
