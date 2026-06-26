use ed25519_dalek::{VerifyingKey, Signature, Verifier};
use std::error::Error;
use std::fmt;

// Hardcoded Ed25519 Public Key for Hexis License Validation
// This is the public key that corresponds to the private key used for signing licenses
// Format: Base64-encoded 32-byte Ed25519 public key
const HEXIS_PUBLIC_KEY_BASE64: &str = "Vj2KLagImsAlUsbmriUOQQuJHLjyiBL+cj6rTkWUKnk=";

/// Custom error type for license validation failures
#[derive(Debug)]
pub enum LicenseError {
    MissingKey,
    InvalidFormat,
    InvalidSignature,
    Expired,
    InvalidToken,
}

impl fmt::Display for LicenseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LicenseError::MissingKey => write!(f, "License key is required"),
            LicenseError::InvalidFormat => write!(f, "Invalid license key format"),
            LicenseError::InvalidSignature => write!(f, "Invalid license signature"),
            LicenseError::Expired => write!(f, "License has expired"),
            LicenseError::InvalidToken => write!(f, "Invalid license token"),
        }
    }
}

impl Error for LicenseError {}

/// License token structure matching the TypeScript payload
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LicenseToken {
    pub license_id: String,
    pub customer_id: String,
    pub expires_at: Option<u64>,
    pub features: Vec<String>,
    pub issued_at: u64,
    pub version: String,
}

/// Validates a Hexis license key
///
/// The license key can be either:
/// 1. A simple API key format: `hxs_live_...` (for backward compatibility)
/// 2. A signed license token format: `hxs_lic_<base64_payload>.<base64_signature>`
///
/// For the cryptographic paywall, we require format #2 with valid Ed25519 signature.
pub fn validate_license_key(license_key: &str) -> Result<LicenseToken, LicenseError> {
    if license_key.is_empty() {
        return Err(LicenseError::MissingKey);
    }

    // Check if it's a legacy API key (hxs_live_...) - these bypass local validation
    // but will be validated by the cloud worker
    if license_key.starts_with("hxs_live_") {
        // For now, allow legacy keys to pass through for backward compatibility
        // The cloud worker will handle the actual validation
        return Err(LicenseError::InvalidFormat);
    }

    // Check if it's a signed license token (hxs_lic_...)
    if !license_key.starts_with("hxs_lic_") {
        return Err(LicenseError::InvalidFormat);
    }

    // Parse the license token: hxs_lic_<base64_payload>.<base64_signature>
    // Strip the "hxs_lic_" prefix FIRST, then split the remainder on '.'.
    // The token only ever contains a single '.' (between payload and signature),
    // so splitting the full string (prefix included) produces 2 parts, not 3.
    let core_token = match license_key.strip_prefix("hxs_lic_") {
        Some(rest) => rest,
        None => return Err(LicenseError::InvalidFormat),
    };

    let token_parts: Vec<&str> = core_token.split('.').collect();
    if token_parts.len() != 2 {
        return Err(LicenseError::InvalidFormat);
    }

    let payload_b64 = token_parts[0];
    let signature_b64 = token_parts[1];

    // Decode the payload
    let payload_bytes = match base64_decode(payload_b64) {
        Some(bytes) => bytes,
        None => return Err(LicenseError::InvalidFormat),
    };

    // Decode the signature
    let signature_bytes = match base64_decode(signature_b64) {
        Some(bytes) => bytes,
        None => return Err(LicenseError::InvalidFormat),
    };

    // Parse the payload as JSON
    let token: LicenseToken = match serde_json::from_slice(&payload_bytes) {
        Ok(t) => t,
        Err(_) => return Err(LicenseError::InvalidFormat),
    };

    // Get the public key
    let public_key = match decode_public_key() {
        Some(key) => key,
        None => return Err(LicenseError::InvalidToken),
    };

    // Decode the signature
    let signature = match Signature::from_slice(&signature_bytes) {
        Ok(sig) => sig,
        Err(_) => return Err(LicenseError::InvalidSignature),
    };

    // Verify the signature
    // We need to sign the payload bytes with the public key
    // But actually, we need to verify that the signature was created with the private key
    if public_key.verify(&payload_bytes, &signature).is_err() {
        return Err(LicenseError::InvalidSignature);
    }

    // Check expiration
    if let Some(expires_at) = token.expires_at {
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        if current_time > expires_at {
            return Err(LicenseError::Expired);
        }
    }

    Ok(token)
}

/// Validates license key for WASM context (simpler check)
/// Returns true if the key is valid or if it's a legacy key that should be allowed
pub fn validate_license_key_wasm(license_key: &str) -> bool {
    // For WASM, we do a simpler check to avoid complex error handling
    // The full validation happens in the cloud worker

    if license_key.is_empty() {
        return false;
    }

    // Allow legacy API keys (they'll be validated by cloud)
    if license_key.starts_with("hxs_live_") {
        return true;
    }

    // Check for signed license token format
    if !license_key.starts_with("hxs_lic_") {
        return false;
    }

    // Parse and validate the token (Optimized via Clippy suggestion)
    validate_license_key(license_key).is_ok()
}

/// Decodes the hardcoded public key from base64
/// Decodes the hardcoded public key from base64
fn decode_public_key() -> Option<VerifyingKey> { // <-- Changed PublicKey to VerifyingKey
    use base64::Engine as _;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(HEXIS_PUBLIC_KEY_BASE64)
        .ok()?;

    // Convert the dynamic Vec<u8> to a fixed [u8; 32] array
    let bytes_array: [u8; 32] = bytes.try_into().ok()?;

    // Pass the fixed array reference
    VerifyingKey::from_bytes(&bytes_array).ok()
}

/// Simple base64 decoder optimized for JWT-style base64url tokens
fn base64_decode(input: &str) -> Option<Vec<u8>> {
    use base64::Engine as _;
    // Use URL_SAFE_NO_PAD to match Node.js 'base64url' output
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(input)
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_empty_key() {
        // Standard Rust uses ! for asserting false statements
        assert!(!validate_license_key_wasm(""));
    }

    #[test]
    fn test_validate_legacy_key() {
        assert!(validate_license_key_wasm("hxs_live_abc123"));
    }

    #[test]
    fn test_validate_invalid_format() {
        assert!(!validate_license_key_wasm("invalid_key"));
    }
}
