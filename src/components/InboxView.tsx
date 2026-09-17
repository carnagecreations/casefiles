import React, { useEffect, useRef, useState } from 'react';
import { Inbox as InboxIcon, RefreshCw, Mail, X, Send, Loader2, AlertTriangle } from 'lucide-react';
import { PricingSettings } from '../types';
import {
  InboxMessage,
  isZohoEmailConfigured,
  fetchInbox,
  fetchMessageContent,
  sendEmail,
} from '../utils/zohoEmailApi';

interface InboxViewProps {
  settings: PricingSettings;
  onUnreadCountChange?: (count: number) => void;
}

const POLL_MS = 30_000;

function timeAgo(unixMs: string | number): string {
  const ts = typeof unixMs === 'string' ? parseInt(unixMs, 10) : unixMs;
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const InboxView: React.FC<InboxViewProps> = ({ settings, onUnreadCountChange }) => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [selectedContent, setSelectedContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'ok' | 'error' | ''>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const configured = isZohoEmailConfigured(settings);

  const loadInbox = async () => {
    if (!configured) return;
    setError('');
    setLoading(true);
    try {
      const msgs = await fetchInbox(settings, 25);
      setMessages(msgs);
      onUnreadCountChange?.(msgs.filter((m) => m.isUnread).length);
    } catch (e: any) {
      setError(e?.message || 'Could not load inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    if (configured) {
      pollRef.current = setInterval(loadInbox, POLL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const openMessage = async (m: InboxMessage) => {
    setSelected(m);
    setSelectedContent('');
    setReplyOpen(false);
    setSendResult('');
    setLoadingContent(true);
    try {
      const content = await fetchMessageContent(settings, m.id);
      setSelectedContent(content);
    } catch (e: any) {
      setSelectedContent(`<p class="text-rose-600">Could not load this message: ${e?.message || 'unknown error'}</p>`);
    } finally {
      setLoadingContent(false);
    }
  };

  const startReply = () => {
    if (!selected) return;
    setReplySubject(selected.subject?.startsWith('Re:') ? selected.subject : `Re: ${selected.subject || ''}`);
    setReplyBody('');
    setReplyOpen(true);
    setSendResult('');
  };

  const handleSendReply = async () => {
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    setSendResult('');
    try {
      await sendEmail(settings, selected.from, replySubject, replyBody.replace(/\n/g, '<br/>'));
      setSendResult('ok');
      setReplyOpen(false);
      setReplyBody('');
    } catch {
      setSendResult('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-slate-400" />
            Inbox
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {settings.businessEmail || 'Your Zoho address'} — refreshes automatically every 30 seconds.
          </p>
        </div>
        <button
          onClick={loadInbox}
          disabled={!configured || loading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!configured && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Live email isn't wired up yet.</p>
            <p className="mt-1">
              This needs the same Cloudflare Worker as Marketing AI, plus a one-time Zoho Mail authorization.
              Ask Claude to walk you through generating the Zoho self-client code — it only takes a couple of minutes.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {configured && !loading && messages.length === 0 && !error && (
          <p className="p-6 text-center text-xs text-slate-400">No messages yet.</p>
        )}
        {messages.map((m) => (
          <button
            key={m.id}
            onClick={() => openMessage(m)}
            className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer ${
              m.isUnread ? 'bg-emerald-50/40' : ''
            }`}
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${m.isUnread ? 'bg-emerald-500' : 'bg-transparent'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm truncate ${m.isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {m.sender || m.from}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(m.receivedTime)}</span>
              </div>
              <p className={`text-xs truncate ${m.isUnread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                {m.subject || '(no subject)'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{m.snippet}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Message detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-12 sm:pt-20">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{selected.subject || '(no subject)'}</p>
                <p className="text-xs text-slate-500 truncate">
                  {selected.sender || selected.from} &lt;{selected.from}&gt;
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto text-sm text-slate-700">
              {loadingContent ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading message…
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: selectedContent }} />
              )}
            </div>

            <div className="p-4 border-t border-slate-100">
              {!replyOpen ? (
                <button
                  onClick={startReply}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Reply
                </button>
              ) : (
                <div>
                  <input
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full mb-2 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={5}
                    placeholder="Type your reply…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleSendReply}
                      disabled={!replyBody.trim() || sending}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white cursor-pointer"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {sending ? 'Sending…' : 'Send Now'}
                    </button>
                    <button
                      onClick={() => setReplyOpen(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    This sends immediately from {settings.businessEmail} — there's no draft step for replies here.
                  </p>
                </div>
              )}
              {sendResult === 'ok' && <p className="text-xs text-emerald-600 mt-2 font-semibold">Sent.</p>}
              {sendResult === 'error' && <p className="text-xs text-rose-600 mt-2 font-semibold">Send failed — try again.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
