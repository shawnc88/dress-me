import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ChevronLeft, DollarSign, Clock, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { getStoredUser } from '@/utils/authUser';

interface PayoutRow {
  id: string;
  amountCents: number;
  threads: number;
  method: string;
  handle: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  reference: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
  creator: { username: string; displayName: string; email: string } | null;
}

export default function AdminPayouts() {
  const router = useRouter();
  const [currentUser] = useState(() => getStoredUser());
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refInputs, setRefInputs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ requests: PayoutRow[]; pendingTotalCents: number }>('/api/admin/payouts');
      setRows(data.requests);
      setPendingTotal(data.pendingTotalCents);
    } catch {
      router.replace('/');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') { router.replace('/'); return; }
    load();
  }, [currentUser, load, router]);

  async function markPaid(id: string) {
    setActionId(id);
    try {
      await apiFetch(`/api/admin/payouts/${id}/paid`, {
        method: 'POST',
        body: JSON.stringify({ reference: refInputs[id] || undefined }),
      });
      await load();
    } catch {}
    setActionId(null);
  }

  async function reject(id: string) {
    if (!confirm('Reject this payout and return the threads to the creator?')) return;
    setActionId(id);
    try {
      await apiFetch(`/api/admin/payouts/${id}/reject`, { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch {}
    setActionId(null);
  }

  const pending = rows.filter(r => r.status === 'PENDING');
  const settled = rows.filter(r => r.status !== 'PENDING');

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <Head><title>Payouts - Admin</title></Head>
      <div className="max-w-[720px] mx-auto px-4 py-6 pb-24 safe-area-pb space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-green/80">Money out the door</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Payouts</h1>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white/[0.03] rounded-3xl border border-accent-green/25 p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent-green/10 border border-accent-green/25 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-[0.16em]">Pending — pay this batch</p>
              <p className="text-accent-green font-extrabold tracking-tight text-2xl">${(pendingTotal / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {loading && <p className="text-white/40 text-sm text-center py-10">Loading…</p>}

        {!loading && pending.length === 0 && (
          <div className="bg-white/[0.03] rounded-3xl border border-white/[0.08] py-10 text-center">
            <p className="text-white/45 text-sm">No pending payouts. All caught up. 🎉</p>
          </div>
        )}

        {pending.map(r => (
          <div key={r.id} className="bg-white/[0.04] rounded-3xl border border-accent-amber/25 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-white font-bold text-base">
                  ${(r.amountCents / 100).toFixed(2)} → {r.creator?.displayName || 'Unknown'}{' '}
                  <span className="text-white/40 font-medium text-sm">@{r.creator?.username}</span>
                </p>
                <p className="text-white/50 text-[13px] mt-0.5">
                  {r.method} · <span className="text-white/80 select-all">{r.handle}</span>
                </p>
                <p className="text-white/35 text-[11px] mt-0.5">
                  {r.threads.toLocaleString()} threads · requested {new Date(r.createdAt).toLocaleDateString()} · {r.creator?.email}
                </p>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(r.handle).catch(() => {})}
                aria-label="Copy handle"
                className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/50 hover:text-white flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <input
              value={refInputs[r.id] || ''}
              onChange={e => setRefInputs(p => ({ ...p, [r.id]: e.target.value }))}
              placeholder="Transfer reference (e.g. Wise #12345)"
              className="w-full min-h-[44px] rounded-2xl bg-white/[0.05] border border-white/10 px-4 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-accent-green/40"
            />
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => markPaid(r.id)}
                disabled={actionId === r.id}
                className="flex-1 min-h-[44px] rounded-full bg-accent-green text-ink-950 text-sm font-bold flex items-center justify-center gap-2 no-select disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> {actionId === r.id ? 'Saving…' : 'Mark paid'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => reject(r.id)}
                disabled={actionId === r.id}
                className="min-h-[44px] px-5 rounded-full bg-white/[0.05] border border-red-400/30 text-red-400 text-sm font-bold no-select disabled:opacity-50"
              >
                Reject
              </motion.button>
            </div>
          </div>
        ))}

        {settled.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40 mb-2">History</p>
            <div className="space-y-1.5">
              {settled.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.status === 'PAID'
                      ? <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-white text-[13px] font-semibold truncate">
                        ${(r.amountCents / 100).toFixed(2)} · @{r.creator?.username} · {r.method}
                      </p>
                      <p className="text-white/40 text-[11px] truncate">
                        {r.status === 'PAID'
                          ? `Paid ${r.paidAt ? new Date(r.paidAt).toLocaleDateString() : ''}${r.reference ? ` · ref ${r.reference}` : ''}`
                          : r.note || 'Rejected — threads returned'}
                      </p>
                    </div>
                  </div>
                  <Clock className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
