import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Loader2, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { groupsApi } from '@/lib/groups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { GroupResponse, PairingLinkResponse } from '@hisobotchi/shared';

const STATUS: Record<GroupResponse['botStatus'], { label: string; variant: BadgeProps['variant'] }> = {
  member: { label: "A'zo", variant: 'success' },
  admin: { label: 'Admin', variant: 'success' },
  removed: { label: 'Chiqarilgan', variant: 'danger' },
};

export function GroupsPage() {
  const qc = useQueryClient();
  const [pairing, setPairing] = useState<PairingLinkResponse | null>(null);

  // While a pairing link is active, poll so the freshly-added group appears on its own —
  // no manual "Yangilash" needed after the bot joins.
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
    refetchInterval: pairing ? 4000 : false,
  });

  const createLink = useMutation({
    mutationFn: groupsApi.createPairingLink,
    onSuccess: (data) => setPairing(data),
    onError: () => toast.error('Havola yaratib bo‘lmadi. Qayta urinib ko‘ring.'),
  });

  const remove = useMutation({
    mutationFn: groupsApi.remove,
    onSuccess: () => {
      toast.success('Guruh o‘chirildi.');
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => toast.error('O‘chirib bo‘lmadi.'),
  });

  const copyLink = async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.deepLink);
      toast.success('Havola nusxalandi.');
    } catch {
      toast.error('Nusxalab bo‘lmadi.');
    }
  };

  const refresh = () => void qc.invalidateQueries({ queryKey: ['groups'] });
  const groups = groupsQuery.data ?? [];
  // Native app deep link (tg://) — opens Telegram's "add to group" picker directly. More
  // reliable than the t.me web link on desktop, esp. macOS where t.me opens the bot chat.
  const tgLink = pairing
    ? pairing.deepLink
        .replace('https://t.me/', 'tg://resolve?domain=')
        .replace('?startgroup=', '&startgroup=')
    : '';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Botni mijoz guruhiga qo‘shing — hisobotlar o‘sha yerga yuboriladi.
        </p>
        <Button onClick={() => createLink.mutate()} disabled={createLink.isPending}>
          {createLink.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Guruhni ulash
        </Button>
      </div>

      {pairing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Guruhni ulash havolasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Havolani oching — Telegram “guruh tanlash” oynasini ko‘rsatadi.</li>
              <li>
                Bot <strong>hali a‘zo bo‘lmagan</strong> guruhni tanlang (botning shaxsiy chatida
                “Start” bosmang).
              </li>
              <li>Bot o‘zi qo‘shilib avtomatik ulanadi — ro‘yxat shu yerda o‘zi yangilanadi.</li>
            </ol>
            <div className="flex items-center rounded-md border border-border bg-background px-3 py-2">
              <span className="truncate font-mono text-xs text-muted-foreground">{pairing.deepLink}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={pairing.deepLink} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Telegramda ochish
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={tgLink}>
                  <ExternalLink />
                  Ilovada ochish (Mac/Desktop)
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy />
                Nusxalash
              </Button>
              <Button size="sm" variant="ghost" onClick={refresh}>
                <RefreshCw />
                Yangilash
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Havola ~15 daqiqa amal qiladi va bir marta ishlaydi. Agar havola botning shaxsiy
              chatini ochib qo‘ysa (ba’zan macOS’da), guruhga botni <strong>qo‘lda qo‘shing</strong>{' '}
              (guruh → A‘zo qo‘shish) — u baribir avtomatik ulanadi.
            </p>
          </CardContent>
        </Card>
      )}

      {groupsQuery.isLoading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="font-medium">Hali guruh ulanmagan</p>
            <p className="text-sm text-muted-foreground">
              “Guruhni ulash” tugmasini bosing va botni mijoz guruhiga qo‘shing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const status = STATUS[g.botStatus];
            return (
              <Card key={g.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{g.title}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {g.chatType === 'supergroup' ? 'Superguruh' : 'Guruh'}
                      {g.linkedAt ? ` · ${new Date(g.linkedAt).toLocaleDateString('uz-UZ')}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="O‘chirish"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`"${g.title}" guruhini ro‘yxatdan o‘chirasizmi?`)) {
                        remove.mutate(g.id);
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
