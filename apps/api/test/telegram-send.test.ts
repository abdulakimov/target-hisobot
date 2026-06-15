import { describe, expect, it, vi } from 'vitest';
import { sendHtmlVia, type MessageSender } from '../src/modules/telegram/telegram-send';

describe('sendHtmlVia', () => {
  it('returns ok + messageId and forwards HTML options', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 555 });
    const api: MessageSender = { sendMessage };
    const result = await sendHtmlVia(api, -1001234567890n, '<b>hi</b>');
    expect(result).toEqual({ ok: true, messageId: 555 });
    expect(sendMessage).toHaveBeenCalledWith(-1001234567890, '<b>hi</b>', {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  });

  it('classifies a thrown error into a failure', async () => {
    const api: MessageSender = { sendMessage: vi.fn().mockRejectedValue(new Error('nope')) };
    const result = await sendHtmlVia(api, 123, 'x');
    expect(result).toMatchObject({ ok: false, kind: 'unknown', description: 'nope' });
  });
});
