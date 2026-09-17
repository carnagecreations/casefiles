import React, { useEffect, useRef, useState } from 'react';
import { Inbox as InboxIcon, RefreshCw, Mail, X, Send, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { PricingSettings } from '../types';
import {
  InboxMessage,
  MailFolder,
  isZohoEmailConfigured,
  fetchFolders,
  fetchMessages,
  fetchMessageContent,
  sendEmail,
  deleteMessage,
} from '../utils/zohoEmailApi';

interface InboxViewProps {
  settings: PricingSettings;
  onUnreadCountChange?: (count: number) => void;
}

const POLL_MS = 30_000;

// Preferred display order; any other folders Zoho returns (Spam, custom
// folders, etc.) are appended after these.
const FOLDER_ORDER = ['Inbox', 'Sent', 'Drafts', 'Trash'];

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
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>('');
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const configured = isZohoEmailConfigured(settings);
  const activeFolder = folders.find((f) => f.folderId === activeFolderId);
  const isTrash = activeFolder?.folderType === 'Trash';
  const isSentOrDrafts = activeFolder?.folderType === 'Sent' || activeFolder?.folderType === 'Drafts';

  const sortedFolders = [...folders].sort((a, b) => {
    const ia = FOLDER_ORDER.indexOf(a.folderType);
    const ib = FOLDER_ORDER.indexOf(b.folderType);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // Load the folder list once, then default to Inbox.
  useEffect(() => {
    if (!configured) return;
    (async () => {
      try {
        const f = await fetchFolders(settings);
        setFolders(f);
        const inbox = f.find((x) => x.folderType === 'Inbox') || f[0];
        if (inbox) setActiveFolderId(inbox.folderId);
      } catch (e: any) {
        setError(e?.message || 'Could not load your mail folders.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const loadMessages = async (folderId: string, silent = false) => {
    if (!configured || !folderId) return;
    if (!silent) setError('');
    setLoading(true);
    try {
      const msgs = await fetchMessages(settings, folderId, 25);
      setMessages(msgs);
      const folder = folders.find((f) => f.folderId === folderId);
      if (folder?.folderType === 'Inbox') {
        onUnreadCountChange?.(msgs.filter((m) => m.isUnread).length);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load this folder.');
    } finally {
      setLoading(false);
    }
  };

  // Reload messages whenever the active folder changes, and poll only the Inbox.
  useEffect(() => {
    if (!activeFolderId) return;
    loadMessages(activeFolderId);
    if (pollRef.current) clearInterval(pollRef.current);
    const folder = folders.find((f) => f.folderId === activeFolderId);
    if (folder?.folderType === 'Inbox') {
      pollRef.current = setInterval(() => loadMessages(activeFolderId, true), POLL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolderId]);

  const openMessage = async (m: InboxMessage) => {
    setSelected(m);
    setSelectedContent('');
    setReplyOpen(false);
    setSendResult('');
    setLoadingContent(true);
    try {
      const content = await fetchMessageContent(settings, m.id, activeFolderId);
      setSelectedContent(content);
    } catch (e: any) {
      setSelectedContent(`<p class="text-rose-600">Could not load this message: ${e?.message || 'unknown error'}</p>`);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDelete = async (m: InboxMessage) => {
    const label = isTrash
      ? 'Permanently delete this email? This cannot be undone.'
      : `Delete this email from ${m.sender || m.from}? It'll move to Trash in Zoho Mail.`;
    if (!window.confirm(label)) return;
    setDeletingId(m.id);
    try {
      await deleteMessage(settings, m.id, activeFolderId, isTrash);
      setMessages((prev) => prev.filter((msg) => msg.id !== m.id));
      if (selected?.id === m.id) setSelected(null);
    } catch (e: any) {
      setError(e?.message || 'Could not delete this message.');
    } finally {
      setDeletingId(null);
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
    const replyTo = selected.from || selected.to || '';
    if (!replyTo) return;
    setSending(true);
    setSendResult('');
    try {
      await sendEmail(settings, replyTo, replySubject, replyBody.replace(/\n/g, '<br/>'));
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-slate-400" />
            Mailbox
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {settings.businessEmail || 'Your Zoho address'}
            {activeFolder?.folderType === 'Inbox' ? ' — Inbox refreshes automatically every 30 seconds.' : ''}
          </p>
        </div>
        <button
          onClick={() => loadMessages(activeFolderId)}
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

      {configured && sortedFolders.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {sortedFolders.map((f) => (
            <button
              key={f.folderId}
              onClick={() => setActiveFolderId(f.folderId)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                activeFolderId === f.folderId
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {f.folderName}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {configured && !loading && messages.length === 0 && !error && (
          <p className="p-6 text-center text-xs text-slate-400">Nothing in this folder.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`w-full flex items-start gap-2 hover:bg-slate-50 ${m.isUnread ? 'bg-emerald-50/40' : ''}`}
          >
            <button onClick={() => openMessage(m)} className="flex-1 min-w-0 text-left px-4 py-3 flex items-start gap-3 cursor-pointer">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${m.isUnread ? 'bg-emerald-500' : 'bg-transparent'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${m.isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {isSentOrDrafts ? `To: ${m.to || 'unknown'}` : m.sender || m.from}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(m.receivedTime)}</span>
                </div>
                <p className={`text-xs truncate ${m.isUnread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                  {m.subject || '(no subject)'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{m.snippet}</p>
              </div>
            </button>
            <button
              onClick={() => handleDelete(m)}
              disabled={deletingId === m.id}
              title={isTrash ? 'Delete permanently' : 'Delete'}
              className="shrink-0 mt-3 mr-3 text-slate-300 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
            >
              {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
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
                  {isSentOrDrafts
                    ? `To: ${selected.to || 'unknown'}`
                    : `${selected.sender || selected.from} <${selected.from}>`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={deletingId === selected.id}
                  title={isTrash ? 'Delete permanently' : 'Delete'}
                  className="text-slate-400 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                >
                  {deletingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
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

            {!isSentOrDrafts && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
