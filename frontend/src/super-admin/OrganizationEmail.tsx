import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Building2, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../config';

const fetchJson = async (path: string) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

export default function OrganizationEmail() {
  const { orgs }: any = useOutletContext();

  const [adminEmail, setAdminEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);

  const historyQuery = useQuery<any>({
    queryKey: ['super-admin', 'email-history'],
    queryFn: () => fetchJson('/api/super-admin/email-history'),
  });
  const history = historyQuery.data?.history ?? [];

  // Admin emails from existing orgs — lets the Super Admin pick instead of type.
  const adminOptions = useMemo(
    () =>
      (orgs ?? [])
        .filter((o: any) => o.admin)
        .map((o: any) => ({ email: o.admin as string, org: o.name as string })),
    [orgs]
  );

  const matchedOrg = useMemo(() => {
    const e = adminEmail.trim().toLowerCase();
    return (orgs ?? []).find((o: any) => (o.admin || '').toLowerCase() === e) || null;
  }, [adminEmail, orgs]);

  const handleSend = async () => {
    if (!adminEmail.trim() || !subject.trim() || !message.trim()) {
      toast.error('Admin email, subject and message are all required');
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/send-organization-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: adminEmail.trim(), subject: subject.trim(), message: message.trim() }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send email');
        return;
      }
      setLastResult(data);
      if (data.failedCount > 0) {
        toast.warning(`Sent to ${data.sentCount}/${data.totalRecipients} — ${data.failedCount} failed`);
      } else {
        toast.success(`Email sent to all ${data.totalRecipients} recipients`);
      }
      setSubject('');
      setMessage('');
      historyQuery.refetch();
    } catch {
      toast.error('Network error while sending');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-400">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Mail size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Organization Broadcast</h2>
              <p className="text-[12px] text-slate-400 font-medium">
                Enter an admin email — the message reaches the admin and every employee in their organization.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500">Admin Email</label>
            <input
              list="admin-email-options"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              placeholder="admin@company.com"
            />
            <datalist id="admin-email-options">
              {adminOptions.map((a: any) => (
                <option key={a.email} value={a.email}>{a.org}</option>
              ))}
            </datalist>
            {matchedOrg && (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 pt-1">
                <Building2 size={12} /> {matchedOrg.name}
                <span className="text-slate-400 font-medium">· {matchedOrg.used || 0} employee(s) on record</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              placeholder="Announcement"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none h-40"
              placeholder="Your message here..."
            />
          </div>

          {lastResult && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600"><Users size={14} /> {lastResult.totalRecipients} recipients</span>
              <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={14} /> {lastResult.sentCount} sent</span>
              {lastResult.failedCount > 0 && (
                <span className="flex items-center gap-1.5 text-rose-500"><XCircle size={14} /> {lastResult.failedCount} failed</span>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13px] font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
            >
              <Send size={15} /> {sending ? 'Sending…' : 'Send to Organization'}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock size={13} /> Recent Broadcasts
          </h3>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-[12px] text-slate-400 font-medium">No broadcasts sent yet.</p>
            ) : (
              history.map((h: any) => (
                <div key={h.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{h.subject}</p>
                    {h.failedCount > 0 ? (
                      <span className="text-[10px] font-bold text-rose-500 shrink-0">{h.sentCount}/{h.totalRecipients}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 shrink-0">{h.sentCount} sent</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{h.organization?.name || h.adminEmail}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {new Date(h.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
