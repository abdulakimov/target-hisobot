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

  encrypt(plaintext: string): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  decrypt(payload: Buffer): string {
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
