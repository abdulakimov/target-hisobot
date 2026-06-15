import { describe, expect, it } from 'vitest';
import { buildFailureDmMessage } from '../src/modules/report-runs/failure-dm';

describe('buildFailureDmMessage', () => {
  it('includes the report label, group, and reason', () => {
    const msg = buildFailureDmMessage('Mijoz A', 'Guruh X', 'Bot chiqarilgan');
    expect(msg).toContain('Hisobot yuborilmadi');
    expect(msg).toContain('Hisobot: Mijoz A');
    expect(msg).toContain('Guruh: Guruh X');
    expect(msg).toContain('Sabab: Bot chiqarilgan');
  });
  it('escapes HTML in inputs', () => {
    expect(buildFailureDmMessage('A & <b>', 'G', 'R')).toContain('A &amp; &lt;b&gt;');
  });
});
