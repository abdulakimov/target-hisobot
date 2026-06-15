import { describe, expect, it } from 'vitest';
import { mapBotStatus } from '../src/modules/groups/bot-status';

describe('mapBotStatus', () => {
  it('maps admin roles', () => {
    expect(mapBotStatus('administrator')).toBe('admin');
    expect(mapBotStatus('creator')).toBe('admin');
  });
  it('maps removal states', () => {
    expect(mapBotStatus('left')).toBe('removed');
    expect(mapBotStatus('kicked')).toBe('removed');
  });
  it('defaults to member for present states', () => {
    expect(mapBotStatus('member')).toBe('member');
    expect(mapBotStatus('restricted')).toBe('member');
  });
});
