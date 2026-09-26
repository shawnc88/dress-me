import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { DollarSign, TrendingUp, Gift, ArrowRight, ChevronDown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { EarningsBreakdown } from '@/components/creator/EarningsBreakdown';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface EarningsSummary {
  totalEarningsUsd: number;
  totalGifts: number;
  totalStreams: number;
  streams: Array<{
    streamId: string;
    title: string;
    giftsCount: number;
    netCents: number;
    date: string;
  }>;
}

interface PayoutInfo {
  requests: Array<{
    id: string;
    amountCents: number;
    method: string;
    handle: string;
    status: 'PENDING' | 'PAID' | 'REJECTED';
    reference: string | null;
    note: string | null;
    createdAt: string;
    paidAt: string | null;
  }>;
  savedMethod: string | null;
  savedHandle: string | null;
  balance: number;
  payoutRate: number;
}

const METHODS = [
  { id: 'wise', label: 'Wise', hint: 'Wise account email' },
  { id: 'payoneer', label: 'Payoneer', hint: 'Payoneer account email' },
  { id: 'bank', label: 'Bank', hint: 'IBAN / account + bank name' },
] as const;

export default function EarningsPage() {
  const router = useRouter();
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [method, setMethod] = useState<string>('wise');
  const [handle, setHandle] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutOk, setPayoutOk] = useState(false);

  const loadPayouts = useCallback((headers: Record<string, string>) => {
    fetch(`${API_URL}/api/threads/payouts`, { headers })
      .then(r => (r.ok ? r.json() : null))
      .then((d: PayoutInfo | null) => {
        if (!d) return;
        setPayouts(d);
        if (d.savedMethod) setMethod(d.savedMethod);
        if (d.savedHandle) setHandle(d.savedHandle);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_URL}/api/engagement/earnings-summary`, { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.summary) return;
        // Server nests under `summary` — map to the page's flat shape.
        setData({
          totalEarningsUsd: Number(d.summary.totalNetUsd) || 0,
          totalGifts: d.summary.totalGiftCount || 0,
          totalStreams: d.summary.totalStreams || 0,
          streams: (d.streams || []).map((s: any) => ({
            streamId: s.streamId,
            title: s.title,
            giftsCount: s.giftCount || 0,
            netCents: s.netCents || 0,
            date: s.startedAt ? new Date(s.startedAt).toLocaleDateString() : '',
          })),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`${API_URL}/api/creators/me`, { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.creator?.id) setCreatorId(d.creator.id); })
      .catch(() => {});

    loadPayouts(headers);
  }, [router, loadPayouts]);

  const balanceUsd = payouts ? payouts.balance / (payouts.payoutRate || 210) : 0;
  const hasPending = !!payouts?.requests.some(r => r.status === 'PENDING');
  const canRequest = balanceUsd >= 10 && !hasPending && handle.trim().length >= 3;
  const methodHint = METHODS.find(m => m.id === method)?.hint || '';

  function requestPayout() {
    // JS-side validation only — never `required` attrs (WKWebView bubble rule).
    setPayoutError(null);
    if (handle.trim().length < 3) { setPayoutError(`Enter your ${methodHint.toLowerCase()} first.`); return; }
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    setRequesting(true);
    fetch(`${API_URL}/api/threads/request-payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ method, handle: handle.trim() }),
    })
      .then(async r => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error || body?.message || 'Could not request payout');
        setPayoutOk(true);
        loadPayouts({ Authorization: `Bearer ${token}` });
      })
      .catch(e => setPayoutError(e.message))
      .finally(() => setRequesting(false));
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          {/* Breathing multicolor orb — no bare spinner */}
          <div className="relative w-16 h-16 pointer-events-none" aria-hidden>
            <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
            <div className="absolute inset-3 rounded-full neon-hairline animate-float" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Earnings - Be With Me</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-6 pb-24 safe-area-pb space-y-6">
        {/* ─── Celebration header — slim, CSS color only ─── */}
        <div className="glisten relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-5 pt-6 pb-5" style={{ animationDelay: '2.5s' }}>
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-green/50 via-accent-cyan/50 to-accent-amber/50"
            aria-hidden
          />
          <div className="relative z-[2] flex items-center gap-3.5 animate-rise">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 border border-accent-green/25 shadow-glow-green flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-accent-green" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-green/80 mb-1">
                Money moves
              </p>
              <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                Your <span className="text-celebration">earnings</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={DollarSign} label="Paid Out" value={`$${(data?.totalEarningsUsd || 0).toFixed(2)}`} color="text-accent-green" chip="bg-accent-green/10" border="border-accent-green/25 hover:border-accent-green/45 hover:shadow-glow-green" hairline="via-accent-green/50" delay={0} />
          <StatCard icon={Gift} label="Total Gifts" value={String(data?.totalGifts || 0)} color="text-accent-amber" chip="bg-accent-amber/10" border="border-white/[0.08] hover:border-accent-amber/40" hairline="via-accent-amber/40" delay={70} />
          <StatCard icon={TrendingUp} label="Streams" value={String(data?.totalStreams || 0)} color="text-accent-cyan" chip="bg-accent-cyan/10" border="border-white/[0.08] hover:border-accent-cyan/40" hairline="via-accent-cyan/40" delay={140} />
          <StatCard icon={DollarSign} label="Available" value={`$${balanceUsd.toFixed(2)}`} color="text-accent-green" chip="bg-accent-green/10" border="border-accent-green/25 hover:border-accent-green/45 hover:shadow-glow-green" hairline="via-accent-green/50" delay={210} />
        </div>

        {/* ─── Payout request ─── */}
        <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] p-4 animate-rise space-y-3">
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-green/40 to-transparent"
            aria-hidden
          />
          <div>
            <p className="text-accent-green/80 text-[11px] font-semibold uppercase tracking-[0.28em] mb-1">Get paid</p>
            <p className="text-secondary text-xs leading-relaxed">
              First payouts go out <span className="text-white font-semibold">October 31, 2026</span> — sent personally via Wise or Payoneer, then monthly. Every dollar is tracked.
            </p>
          </div>

          {hasPending ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-accent-green/[0.07] border border-accent-green/25 px-3.5 py-3">
              <Clock className="w-4 h-4 text-accent-green flex-shrink-0" />
              <p className="text-accent-green text-[13px] font-semibold">Your payout is on the way — it goes out in the next batch.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setPayoutError(null); }}
                    className={`flex-1 min-h-[44px] rounded-full text-[13px] font-bold border transition-all no-select ${
                      method === m.id
                        ? 'bg-accent-green/15 border-accent-green/40 text-accent-green'
                        : 'bg-white/[0.05] border-white/10 text-secondary'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                value={handle}
                onChange={e => { setHandle(e.target.value); setPayoutError(null); }}
                placeholder={methodHint}
                inputMode="email"
                autoCapitalize="none"
                className="w-full min-h-[48px] rounded-2xl bg-white/[0.05] border border-white/10 px-4 text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-accent-green/40"
              />
              {payoutError && <p className="text-red-400 text-xs font-medium">{payoutError}</p>}
              {payoutOk && !payoutError && (
                <p className="text-accent-green text-xs font-medium">Request in — you&apos;ll see it below the moment it&apos;s paid.</p>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={requestPayout}
                disabled={!canRequest || requesting}
                className={`w-full min-h-[48px] py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 no-select transition-all ${
                  canRequest
                    ? 'bg-accent-green text-ink-950 shadow-glow-green hover:brightness-110'
                    : 'bg-accent-green/10 border border-accent-green/20 text-accent-green/40 cursor-not-allowed'
                }`}
              >
                {requesting ? 'Requesting…' : `Request payout · $${balanceUsd.toFixed(2)}`} <ArrowRight className="w-4 h-4" />
              </motion.button>
              {balanceUsd < 10 && (
                <p className="text-tertiary text-[11px] text-center">Minimum payout is $10.00 — you&apos;re at ${balanceUsd.toFixed(2)}. Keep the room loud.</p>
              )}
            </>
          )}

          {/* Payout history */}
          {(payouts?.requests.length || 0) > 0 && (
            <div className="space-y-1.5 pt-1">
              {payouts!.requests.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.status === 'PAID' && <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />}
                    {r.status === 'PENDING' && <Clock className="w-4 h-4 text-accent-amber flex-shrink-0" />}
                    {r.status === 'REJECTED' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-white text-[13px] font-semibold">${(r.amountCents / 100).toFixed(2)} · {r.method}</p>
                      <p className="text-tertiary text-[11px] truncate">
                        {r.status === 'PAID' && `Paid ${r.paidAt ? new Date(r.paidAt).toLocaleDateString() : ''}${r.reference ? ` · ref ${r.reference}` : ''}`}
                        {r.status === 'PENDING' && `Requested ${new Date(r.createdAt).toLocaleDateString()} · next batch`}
                        {r.status === 'REJECTED' && (r.note || 'Returned to your balance')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-stream breakdown */}
        <div className="animate-rise">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-green/80 mb-1">
            Every stream, counted
          </p>
          <h3 className="text-lg font-extrabold tracking-tight text-white mb-3">Stream revenue</h3>
          <div className="space-y-2">
            {(data?.streams || []).length === 0 && (
              <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] py-8 px-4 text-center">
                <div
                  className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-green/40 to-transparent"
                  aria-hidden
                />
                <p className="text-tertiary text-sm">No streams with revenue yet — go live and let the gifts roll in</p>
              </div>
            )}
            {(data?.streams || []).map(s => (
              <div key={s.streamId}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedStream(selectedStream === s.streamId ? null : s.streamId)}
                  className="w-full min-h-[56px] bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4 flex items-center justify-between hover:border-accent-green/30 transition-colors no-select"
                >
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                    <p className="text-tertiary text-[11px] flex items-center gap-1 mt-0.5">
                      {s.date} &middot; <Gift className="w-3 h-3 text-accent-amber/70 inline" /> {s.giftsCount} gifts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-accent-green font-extrabold tracking-tight text-base">${(s.netCents / 100).toFixed(2)}</p>
                      <p className="text-tertiary text-[11px] uppercase tracking-[0.14em]">earned</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-tertiary transition-transform ${selectedStream === s.streamId ? 'rotate-180' : ''}`} />
                  </div>
                </motion.button>
                {selectedStream === s.streamId && creatorId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 mb-2"
                  >
                    <EarningsBreakdown streamId={s.streamId} creatorId={creatorId} />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payout info */}
        <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] p-4 animate-rise">
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-green/40 to-transparent"
            aria-hidden
          />
          <p className="text-accent-green/80 text-[11px] font-semibold uppercase tracking-[0.28em] mb-1">How payouts work</p>
          <p className="text-tertiary text-xs">210 threads = $1.00 USD — the full rate, no fee on gifts &middot; Minimum payout: $10 &middot; Paid monthly via Wise or Payoneer</p>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color, chip, border, hairline, delay = 0 }: { icon: any; label: string; value: string; color: string; chip?: string; border?: string; hairline?: string; delay?: number }) {
  return (
    <div
      className={`glimmer relative overflow-hidden bg-white/[0.04] backdrop-blur-xl rounded-2xl border ${border || 'border-white/[0.08]'} p-4 transition-all duration-300 animate-rise`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`pointer-events-none absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent ${hairline || 'via-white/20'} to-transparent`}
        aria-hidden
      />
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-6 h-6 rounded-lg ${chip || 'bg-white/[0.06]'} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <span className="text-[11px] text-tertiary uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className={`font-extrabold tracking-tight text-xl ${color}`}>{value}</p>
    </div>
  );
}
