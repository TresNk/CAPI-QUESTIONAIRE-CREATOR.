/**
 * Lightweight encryption utilities for localStorage
 * Uses AES-like XOR cipher with base64 encoding for obfuscation
 * Note: This is NOT cryptographically secure but prevents casual inspection
 * For production, consider using Web Crypto API with proper key management
 */

/**
 * Simple XOR cipher implementation
 * Uses a repeating key for encryption/decryption
 */
function xorCipher(text: string, key: string): string {
  let result = '';
  const keyLength = key.length;
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % keyLength);
    result += String.fromCharCode(charCode);
  }
  
  return result;
}

/**
 * Generate a deterministic key from a salt
 * Creates a 16-character key for consistent encryption
 */
function generateKey(salt: string): string {
  let hash = 0;
  const keyLength = 16;
  
  for (let i = 0; i < salt.length; i++) {
    hash = ((hash << 5) - hash) + salt.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate key from hash
  let key = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < keyLength; i++) {
    key += chars[Math.abs(hash + i) % chars.length];
  }
  
  return key;
}

/**
 * Encode string to base64 safely handling Unicode characters
 */
function safeBase64Encode(str: string): string {
  try {
    // Handle Unicode characters properly
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    ));
  } catch (e) {
    console.error('Base64 encode failed:', e);
    return btoa(str);
  }
}

/**
 * Decode base64 string safely handling Unicode characters
 */
function safeBase64Decode(str: string): string {
  try {
    return decodeURIComponent(atob(str).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
  } catch (e) {
    console.error('Base64 decode failed:', e);
    return atob(str);
  }
}

/**
 * Encrypt data for storage in localStorage
 * @param data - The data object to encrypt
 * @param password - Optional password for encryption (uses default if not provided)
 * @returns Encrypted string ready for storage
 */
export function encryptData<T>(data: T, password?: string): string {
  const jsonString = JSON.stringify(data);
  const key = generateKey(password || 'capi-builder-default-key-v1');
  
  // Double encryption for better obfuscation
  const step1 = xorCipher(jsonString, key);
  const step2 = xorCipher(step1, key.split('').reverse().join(''));
  
  return safeBase64Encode(step2);
}

/**
 * Decrypt data from localStorage
 * @param encrypted - The encrypted string from storage
 * @param password - Optional password for decryption (must match encryption password)
 * @returns Decrypted data object or null if decryption fails
 */
export function decryptData<T>(encrypted: string, password?: string): T | null {
  try {
    const key = generateKey(password || 'capi-builder-default-key-v1');
    
    // Reverse the encryption steps
    const step1 = safeBase64Decode(encrypted);
    const step2 = xorCipher(step1, key.split('').reverse().join(''));
    const decrypted = xorCipher(step2, key);
    
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Check if data appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
  // Encrypted data is typically base64 and has certain characteristics
  if (!data || data.length < 10) return false;
  
  // Base64 pattern check
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  if (!base64Pattern.test(data)) return false;
  
  // Encrypted data usually has high entropy (mixed characters)
  const hasUpperCase = /[A-Z]/.test(data);
  const hasLowerCase = /[a-z]/.test(data);
  const hasNumbers = /[0-9]/.test(data);
  
  return hasUpperCase && hasLowerCase && hasNumbers;
}

/**
 * Secure localStorage wrapper with automatic encryption
 */
export class SecureStorage {
  private keySalt: string;
  
  constructor(keySalt: string = 'capi-builder-storage') {
    this.keySalt = keySalt;
  }
  
  /**
   * Set item with encryption
   */
  setItem<T>(key: string, value: T): void {
    const encrypted = encryptData(value, this.keySalt);
    localStorage.setItem(key, encrypted);
  }
  
  /**
   * Get item with decryption
   */
  getItem<T>(key: string): T | null {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    return decryptData<T>(encrypted, this.keySalt);
  }
  
  /**
   * Remove item
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
  
  /**
   * Clear all items created by this storage instance
   */
  clear(): void {
    // Note: This clears all localStorage, use carefully
    localStorage.clear();
  }
}

// Default secure storage instance
export const secureStorage = new SecureStorage();
