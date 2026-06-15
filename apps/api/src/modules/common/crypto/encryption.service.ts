import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { AppConfig } from '../config/env.validation';

const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption for Meta tokens at rest.
 * Stored layout (single Buffer / Postgres bytea): iv(12) || authTag(16) || ciphertext.
 * The key is derived from META_TOKEN_ENCRYPTION_KEY via SHA-256 → always 32 bytes.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService<AppConfig, true>) {
    const secret = config.get('META_TOKEN_ENCRYPTION_KEY', { infer: true });
    this.key = createHash('sha256').update(secret, 'utf8').digest();
  }

  // Returns Uint8Array<ArrayBuffer> to match Prisma 7's `Bytes` column type.
  encrypt(plaintext: string): Uint8Array<ArrayBuffer> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Allocate over a fresh ArrayBuffer → Uint8Array<ArrayBuffer> (matches Prisma 7 Bytes).
    const combined = Buffer.concat([iv, authTag, ciphertext]);
    const out = new Uint8Array(combined.length);
    out.set(combined);
    return out;
  }

  decrypt(payload: Uint8Array): string {
    const buf = Buffer.from(payload);
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
