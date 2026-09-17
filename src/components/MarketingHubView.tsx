import React, { useState, useEffect } from 'react';
import { MarketingDraft, MarketingDraftMode, PricingSettings } from '../types';
import { Mail, Copy, Check, Trash2, Loader2, Send } from 'lucide-react';
import { buildSmsLink, buildZohoComposeLink } from '../utils/contactLinks';
import { isZohoEmailConfigured, sendEmail } from '../utils/zohoEmailApi';

interface MarketingHubViewProps {
  drafts: MarketingDraft[];
  settings: PricingSettings;
  onSaveDraft: (data: Omit<MarketingDraft, 'id' | 'createdAt'>) => void;
  onDeleteDraft: (id: string) => void;
  prefill?: {
    mode: MarketingDraftMode;
    context: string;
    recipientEmail?: string;
    recipientPhone?: string;
    subject?: string;
  };
  onPrefillConsumed?: () => void;
}

export const MarketingHubView: React.FC<MarketingHubViewProps> = ({
  drafts,
  settings,
  onSaveDraft,
  onDeleteDraft,
  prefill,
  onPrefillConsumed,
}) => {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<'ok' | 'error' | ''>('');

  useEffect(() => {
    if (prefill) {
      setMessage(prefill.context);
      setRecipientEmail(prefill.recipientEmail || '');
      setRecipientPhone(prefill.recipientPhone || '');
      setSubject(prefill.subject || '');
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const canAutoSendEmail = isZohoEmailConfigured(settings);

  const handleSendNow = async () => {
    if (!recipientEmail || !message.trim()) return;
    setIsSending(true);
    setSendResult('');
    try {
      await sendEmail(settings, recipientEmail, subject || 'Clean Convictions', message.replace(/\n/g, '<br/>'));
      setSendResult('ok');
    } catch {
      setSendResult('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard?.writeText(message).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!message.trim()) return;
    onSaveDraft({
      mode: 'reply_email',
      inputContext: message.trim(),
      draftText: message.trim(),
    });
  };

  const sortedDrafts = [...drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Messages</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Write a message once, then send it.
          {canAutoSendEmail ? ' Emails go out immediately via "Send Now."' : ' Emails open a Zoho compose window for you to send.'}
        </p>
      </div>

      {/* Compose */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Type your message…"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Phone (optional)</label>
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="e.g. (928) 555-0100"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Email (optional)</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. client@email.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Subject (for email)</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Clean Convictions"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleCopy}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleSave}
            disabled={!message.trim()}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 cursor-pointer"
          >
            Save to History
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {recipientPhone && message.trim() && (
            <a
              href={buildSmsLink(recipientPhone, message)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-teal-300 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Text via Google Voice
            </a>
          )}
          {recipientEmail && message.trim() && canAutoSendEmail && (
            <button
              onClick={handleSendNow}
              disabled={isSending}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isSending ? 'Sending…' : 'Send Now (Zoho)'}
            </button>
          )}
          {recipientEmail && message.trim() && (
            <a
              href={buildZohoComposeLink(recipientEmail, subject || 'Clean Convictions', message)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              {canAutoSendEmail ? 'Open in Zoho Mail Instead' : 'Email via Zoho'}
            </a>
          )}
        </div>
        {sendResult === 'ok' && <p className="text-xs text-emerald-600 mt-2 font-semibold">Sent.</p>}
        {sendResult === 'error' && <p className="text-xs text-rose-600 mt-2 font-semibold">Send failed — try again, or use "Open in Zoho Mail Instead".</p>}
        {!recipientPhone && !recipientEmail && message.trim() && (
          <p className="text-[10px] text-slate-400 mt-2">Add a recipient phone or email above to send this directly.</p>
        )}
      </div>

      {/* History */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Saved Messages</h3>
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
          {sortedDrafts.length === 0 && (
            <p className="p-6 text-xs text-slate-400 text-center">Nothing saved yet.</p>
          )}
          {sortedDrafts.map((d) => (
            <div key={d.id} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">{d.createdAt}</span>
                <button
                  onClick={() => onDeleteDraft(d.id)}
                  className="text-slate-300 hover:text-rose-600 cursor-pointer"
                  aria-label="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-800 whitespace-pre-wrap">{d.draftText}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
