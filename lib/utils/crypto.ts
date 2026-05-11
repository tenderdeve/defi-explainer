import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  const key = Buffer.from(secret, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_SECRET must be a 32-byte hex string (64 hex characters)");
  }
  return key;
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns base64-encoded string in format: iv:ciphertext:authTag
 */
export function encryptKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${encrypted.toString("base64")}:${authTag.toString("base64")}`;
}

/**
 * Decrypts a string encrypted with encryptKey().
 * Expects base64-encoded string in format: iv:ciphertext:authTag
 */
export function decryptKey(encryptedString: string): string {
  const key = getEncryptionKey();
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format");
  }

  const iv = Buffer.from(parts[0], "base64");
  const encrypted = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/** Returns last 4 characters of a key for display (e.g., "...a1b2") */
export function getKeyHint(apiKey: string): string {
  if (apiKey.length < 8) return "...";
  return `...${apiKey.slice(-4)}`;
}
