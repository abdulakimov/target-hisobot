import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_METRICS,
  LEAD_ACTION_OPTIONS,
  LEAD_DEPENDENT_METRICS,
  METRIC_KEYS,
  METRIC_LABELS,
  WEEKDAY_LABELS,
  WINDOW_LABELS,
  WINDOW_PRESETS,
  type CreateReportInput,
  type MetricKey,
  type ReportResponse,
  type WindowPreset,
} from '@hisobotchi/shared';
import { reportsApi } from '@/lib/reports';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const TIMEZONES = [
  'Asia/Tashkent',
  'Asia/Samarkand',
  'Asia/Almaty',
  'Asia/Dubai',
  'Europe/Moscow',
  'Europe/Istanbul',
  'UTC',
];

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ReportEditor({
  report,
  onClose,
}: {
  report: ReportResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const optionsQuery = useQuery({ queryKey: ['report-options'], queryFn: reportsApi.options });
  const options = optionsQuery.data;

  const [name, setName] = useState(report?.name ?? '');
  const [adAccountId, setAdAccountId] = useState(report?.adAccountId ?? '');
  const [telegramGroupId, setTelegramGroupId] = useState(report?.telegramGroupId ?? '');
  const [metrics, setMetrics] = useState<MetricKey[]>(report?.metrics ?? [...DEFAULT_METRICS]);
  const [leadActionType, setLeadActionType] = useState(report?.leadActionType ?? '');
  const [windowPreset, setWindowPreset] = useState<WindowPreset>(report?.windowPreset ?? 'yesterday');
  const [timezone, setTimezone] = useState(report?.timezone ?? user?.timezone ?? 'Asia/Tashkent');
  const [sendTimes, setSendTimes] = useState<string[]>(report?.sendTimes ?? ['09:00']);
  const [weekdays, setWeekdays] = useState<number[]>(report?.weekdays ?? [...WEEKDAYS]);
  const [enabled, setEnabled] = useState(report?.enabled ?? true);
  const [timeInput, setTimeInput] = useState('09:00');

  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  const toggleMetric = (m: MetricKey) =>
    setMetrics((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  const toggleWeekday = (d: number) =>
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const onLeadChange = (value: string) => {
    setLeadActionType(value);
    if (!value) setMetrics((cur) => cur.filter((m) => !LEAD_DEPENDENT_METRICS.includes(m)));
  };
  const addTime = () => {
    if (!HHMM.test(timeInput)) return;
    setSendTimes((cur) => (cur.includes(timeInput) ? cur : [...cur, timeInput].sort()));
  };
  const removeTime = (t: string) => setSendTimes((cur) => cur.filter((x) => x !== t));

  const save = useMutation({
    mutationFn: (body: CreateReportInput) =>
      report ? reportsApi.update(report.id, body) : reportsApi.create(body),
    onSuccess: () => {
      toast.success(report ? 'Hisobot yangilandi.' : 'Hisobot yaratildi.');
      void qc.invalidateQueries({ queryKey: ['reports'] });
      onClose();
    },
    onError: (e) => toast.error(humanError(e)),
  });

  const test = useMutation({
    mutationFn: () => reportsApi.testSend(report!.id),
    onSuccess: (res) => (res.ok ? toast.success('Sinov xabari yuborildi ✅') : toast.error(res.error)),
    onError: () => toast.error('Sinov xabarini yuborib bo‘lmadi.'),
  });

  const onSave = () => {
    if (!adAccountId) return toast.error('Reklama akkauntini tanlang.');
    if (!telegramGroupId) return toast.error('Guruhni tanlang.');
    if (metrics.length === 0) return toast.error('Kamida 1 metrika tanlang.');
    if (sendTimes.length === 0) return toast.error('Kamida 1 yuborish vaqtini qo‘shing.');
    if (weekdays.length === 0) return toast.error('Kamida 1 kun tanlang.');
    if (metrics.some((m) => LEAD_DEPENDENT_METRICS.includes(m)) && !leadActionType) {
      return toast.error('Lidlar / CPL uchun lead turini tanlang.');
    }
    save.mutate({
      name: name.trim() || null,
      adAccountId,
      telegramGroupId,
      metrics,
      leadActionType: leadActionType || null,
      windowPreset,
      timezone,
      sendTimes,
      weekdays,
      enabled,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden />
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <h2 className="font-semibold">{report ? 'Hisobotni tahrirlash' : 'Yangi hisobot'}</h2>
          <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <Section title="Manba">
            <Field label="Reklama akkaunti">
              {options && options.adAccounts.length === 0 ? (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Yoqilgan reklama akkaunti yo‘q. Avval “Ulanishlar”da Facebook akkauntini ulang.
                </p>
              ) : (
                <select
                  className={selectClass}
                  value={adAccountId}
                  onChange={(e) => setAdAccountId(e.target.value)}
                >
                  <option value="">Tanlang…</option>
                  {options?.adAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Guruh">
              {options && options.groups.length === 0 ? (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Aktiv guruh yo‘q. Avval “Guruhlar”da botni guruhga ulang.
                </p>
              ) : (
                <select
                  className={selectClass}
                  value={telegramGroupId}
                  onChange={(e) => setTelegramGroupId(e.target.value)}
                >
                  <option value="">Tanlang…</option>
                  {options?.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Nom (ixtiyoriy)">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Mijoz — Ortiqov" />
            </Field>
          </Section>

          <Section title="Metrikalar">
            <Field label="Lead turi">
              <select className={selectClass} value={leadActionType} onChange={(e) => onLeadChange(e.target.value)}>
                <option value="">Tanlanmagan</option>
                {LEAD_ACTION_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Lidlar va CPL metrikalari uchun kerak.</p>
            </Field>
            <div className="flex flex-wrap gap-2">
              {METRIC_KEYS.map((m) => {
                const active = metrics.includes(m);
                const locked = LEAD_DEPENDENT_METRICS.includes(m) && !leadActionType;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={locked}
                    onClick={() => toggleMetric(m)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                      locked && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {METRIC_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Jadval">
            <Field label="Davr">
              <div className="flex flex-wrap gap-1.5">
                {WINDOW_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWindowPreset(w)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm transition-colors',
                      windowPreset === w
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {WINDOW_LABELS[w]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Yuborish vaqtlari">
              <div className="flex flex-wrap gap-1.5">
                {sendTimes.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm">
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTime(t)}
                      aria-label="O‘chirish"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {sendTimes.length === 0 && <span className="text-xs text-muted-foreground">Vaqt qo‘shilmagan</span>}
              </div>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className={cn(selectClass, 'w-32')}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTime}>
                  Qo‘shish
                </Button>
              </div>
            </Field>
            <Field label="Kunlar">
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleWeekday(d)}
                    className={cn(
                      'h-9 w-11 rounded-md border text-sm transition-colors',
                      weekdays.includes(d)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {WEEKDAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Vaqt mintaqasi">
              <select className={selectClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Yoqilgan</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                enabled ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </button>
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border p-4">
          {report ? (
            <Button variant="outline" size="sm" onClick={() => test.mutate()} disabled={test.isPending}>
              {test.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              Sinov yuborish
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Bekor
            </Button>
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}
              Saqlash
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

/** Pull the backend's validation message out of the api() error text. */
function humanError(e: unknown): string {
  if (e instanceof Error) {
    const match = e.message.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as { message?: string | string[] };
        if (Array.isArray(parsed.message)) return parsed.message.join(', ');
        if (typeof parsed.message === 'string') return parsed.message;
      } catch {
        /* fall through */
      }
    }
  }
  return 'Saqlashda xatolik yuz berdi.';
}
