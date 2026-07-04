import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, AlertTriangle, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { username: string; displayName: string } | null;
  targetUser: { username: string; displayName: string; role: string } | null;
  targetStreamId: string | null;
}

const STATUS_TABS = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;

const statusStyles: Record<string, { icon: any; color: string; bg: string; border: string; hairline: string }> = {
  pending: { icon: Clock,        color: 'text-accent-amber',  bg: 'bg-accent-amber/10',  border: 'border-accent-amber/30',  hairline: 'via-accent-amber/40' },
  reviewed: { icon: Eye,         color: 'text-accent-blue',   bg: 'bg-accent-blue/10',   border: 'border-accent-blue/30',   hairline: 'via-accent-blue/40' },
  resolved: { icon: CheckCircle, color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/30',  hairline: 'via-accent-green/40' },
  dismissed: { icon: XCircle,    color: 'text-white/40',      bg: 'bg-white/[0.05]',     border: 'border-white/10',         hairline: 'via-white/20' },
};

const reasonLabels: Record<string, string> = {
  harassment: 'Harassment',
  explicit: 'Explicit Content',
  illegal: 'Illegal Activity',
  spam: 'Spam / Scam',
  other: 'Other',
};

export default function AdminReports() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<{ reports: Report[] }>(`/api/admin/reports?status=${status}`);
      setReports(data.reports);
    } catch {
      router.replace('/');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      router.replace('/');
      return;
    }
    fetchReports(activeTab);
  }, [user, activeTab, fetchReports, router]);

  async function updateStatus(reportId: string, newStatus: string) {
    try {
      await apiFetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch {}
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <>
      <Head><title>Reports - Admin - Be With Me</title></Head>
      <div className="min-h-screen bg-surface-dark nightfall-canvas">
        {/* Slim admin header */}
        <div className="sticky top-0 z-50 glass-nav">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link
              href="/admin"
              className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors min-h-[44px] flex items-center"
            >
              <ChevronLeft className="w-5 h-5 text-white/50" />
            </Link>
            <Shield className="w-4 h-4 text-accent-violet" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Admin</p>
            <span className="text-white/15">/</span>
            <h1 className="font-bold text-sm text-white">Report Queue</h1>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Status Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {STATUS_TABS.map((tab) => {
              const style = statusStyles[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold capitalize transition-all whitespace-nowrap border ${
                    isActive
                      ? `${style.bg} ${style.color} ${style.border}`
                      : 'text-white/35 hover:text-white/70 bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  <style.icon className="w-3.5 h-3.5" />
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="w-10 h-10 text-accent-green/30 mx-auto mb-3" />
              <p className="text-white/35 text-sm">No {activeTab} reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report, i) => {
                const tabStyle = statusStyles[activeTab] || statusStyles.pending;
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`relative glass-card border border-white/[0.07] hover:border-white/[0.12] p-5 transition-all duration-300 overflow-hidden`}
                  >
                    <div
                      className={`pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent ${tabStyle.hairline} to-transparent`}
                      aria-hidden
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Reason badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-live/10 text-live text-[10px] font-bold border border-live/20">
                            {reasonLabels[report.reason] || report.reason}
                          </span>
                          <span className="text-[10px] text-white/30">{timeAgo(report.createdAt)}</span>
                        </div>

                        {/* Target */}
                        <p className="text-sm text-white mb-1">
                          <span className="text-white/35">Target: </span>
                          {report.targetUser ? (
                            <span className="font-semibold">
                              @{report.targetUser.username}{' '}
                              <span className="text-white/30 text-xs">({report.targetUser.role})</span>
                            </span>
                          ) : report.targetStreamId ? (
                            <span className="font-semibold text-accent-violet">
                              Stream {report.targetStreamId.slice(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-white/30">Unknown</span>
                          )}
                        </p>

                        {/* Reporter */}
                        <p className="text-xs text-white/35">
                          Reported by: @{report.reporter?.username || 'deleted'}
                        </p>

                        {/* Details */}
                        {report.details && (
                          <p className="mt-2 text-sm text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 py-2">
                            {report.details}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {activeTab === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => updateStatus(report.id, 'reviewed')}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-accent-blue/10 text-accent-blue text-xs font-semibold hover:bg-accent-blue/20 border border-accent-blue/20 hover:border-accent-blue/35 transition-all"
                          >
                            <Eye className="w-3 h-3" /> Review
                          </button>
                          <button
                            onClick={() => updateStatus(report.id, 'resolved')}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-accent-green/10 text-accent-green text-xs font-semibold hover:bg-accent-green/20 border border-accent-green/20 hover:border-accent-green/35 transition-all"
                          >
                            <CheckCircle className="w-3 h-3" /> Resolve
                          </button>
                          <button
                            onClick={() => updateStatus(report.id, 'dismissed')}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/[0.04] text-white/40 text-xs font-semibold hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all"
                          >
                            <XCircle className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      )}

                      {activeTab === 'reviewed' && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => updateStatus(report.id, 'resolved')}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-accent-green/10 text-accent-green text-xs font-semibold hover:bg-accent-green/20 border border-accent-green/20 hover:border-accent-green/35 transition-all"
                          >
                            <CheckCircle className="w-3 h-3" /> Resolve
                          </button>
                          <button
                            onClick={() => updateStatus(report.id, 'dismissed')}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/[0.04] text-white/40 text-xs font-semibold hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all"
                          >
                            <XCircle className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
