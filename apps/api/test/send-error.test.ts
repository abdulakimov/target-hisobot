import { describe, expect, it } from 'vitest';
import { GrammyError } from 'grammy';
import { classifySendError } from '../src/modules/telegram/send-error';

/**
 * Build a GrammyError-shaped instance without invoking the (version-specific) constructor:
 * classifySendError only relies on `instanceof GrammyError` + the copied response fields.
 */
function grammyError(
  errorCode: number,
  description: string,
  parameters: Record<string, unknown> = {},
): GrammyError {
  const err = Object.create(GrammyError.prototype) as GrammyError;
  return Object.assign(err, {
    message: description,
    error_code: errorCode,
    description,
    parameters,
  });
}

describe('classifySendError', () => {
  it('classifies 403 as forbidden', () => {
    expect(classifySendError(grammyError(403, 'Forbidden: bot was blocked by the user'))).toMatchObject({
      ok: false,
      kind: 'forbidden',
    });
  });
  it('classifies 429 as rate_limited with retryAfter', () => {
    expect(classifySendError(grammyError(429, 'Too Many Requests', { retry_after: 12 }))).toMatchObject({
      ok: false,
      kind: 'rate_limited',
      retryAfter: 12,
    });
  });
  it('classifies a 400 "chat not found"', () => {
    expect(classifySendError(grammyError(400, 'Bad Request: chat not found'))).toMatchObject({
      ok: false,
      kind: 'chat_not_found',
    });
  });
  it('classifies a group→supergroup migration', () => {
    const result = classifySendError(
      grammyError(400, 'Bad Request: group chat was upgraded to a supergroup chat', {
        migrate_to_chat_id: -1001234567890,
      }),
    );
    expect(result).toMatchObject({ ok: false, kind: 'migrated', migrateToChatId: -1001234567890 });
  });
  it('falls back to unknown for plain errors', () => {
    expect(classifySendError(new Error('boom'))).toMatchObject({
      ok: false,
      kind: 'unknown',
      description: 'boom',
    });
  });
});
