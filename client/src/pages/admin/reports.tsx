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

const statusStyles: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  reviewed: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  resolved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  dismissed: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-500/10' },
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
      <Head><title>Reports - Admin - Dress Me</title></Head>
      <div className="min-h-screen bg-surface-dark">
        {/* Header */}
        <div className="sticky top-0 z-50 glass-nav">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/admin" className="p-1.5 rounded-xl hover:bg-glass transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <Shield className="w-5 h-5 text-brand-500" />
            <h1 className="font-bold text-white">Report Queue</h1>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Status Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {STATUS_TABS.map((tab) => {
              const style = statusStyles[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? `${style.bg} ${style.color} ring-1 ring-current/20`
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <style.icon className="w-4 h-4" />
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
              <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
              <p className="text-gray-500">No {activeTab} reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-surface-card rounded-2xl border border-white/5 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Reason badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold">
                          {reasonLabels[report.reason] || report.reason}
                        </span>
                        <span className="text-[10px] text-gray-600">{timeAgo(report.createdAt)}</span>
                      </div>

                      {/* Target */}
                      <p className="text-sm text-white mb-1">
                        <span className="text-gray-500">Target: </span>
                        {report.targetUser ? (
                          <span className="font-semibold">@{report.targetUser.username} <span className="text-gray-600 text-xs">({report.targetUser.role})</span></span>
                        ) : report.targetStreamId ? (
                          <span className="font-semibold text-violet-400">Stream {report.targetStreamId.slice(0, 8)}...</span>
                        ) : (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </p>

                      {/* Reporter */}
                      <p className="text-xs text-gray-500">
                        Reported by: @{report.reporter?.username || 'deleted'}
                      </p>

                      {/* Details */}
                      {report.details && (
                        <p className="mt-2 text-sm text-gray-400 bg-white/[0.02] rounded-xl px-3 py-2">
                          {report.details}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {activeTab === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => updateStatus(report.id, 'reviewed')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Review
                        </button>
                        <button
                          onClick={() => updateStatus(report.id, 'resolved')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Resolve
                        </button>
                        <button
                          onClick={() => updateStatus(report.id, 'dismissed')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 text-xs font-semibold hover:bg-gray-500/20 transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    )}

                    {activeTab === 'reviewed' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => updateStatus(report.id, 'resolved')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Resolve
                        </button>
                        <button
                          onClick={() => updateStatus(report.id, 'dismissed')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 text-xs font-semibold hover:bg-gray-500/20 transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
