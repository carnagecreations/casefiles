import React, { useState, useEffect } from 'react';
import { MarketingDraft, MarketingDraftMode, PricingSettings } from '../types';
import {
  Mail,
  MessageSquare,
  Megaphone,
  Copy,
  Check,
  Trash2,
  Loader2,
  Send,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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

// AI drafting is only offered for social posts/replies — real email now goes
// through the Inbox and the manual composer below, so there's no need for an
// AI-drafted email reply mode anymore.
type AiMode = 'reply_post' | 'create_post';

const AI_MODE_META: Record<AiMode, { label: string; icon: React.ReactNode; placeholder: string; contextLabel: string }> = {
  reply_post: {
    label: 'Reply to a Post / Comment / Review',
    icon: <MessageSquare className="w-4 h-4" />,
    contextLabel: 'Paste the comment or review you’re replying to',
    placeholder: 'e.g. "Used them for a move-out clean, did a great job but showed up 20 min late."',
  },
  create_post: {
    label: 'Create a New Post',
    icon: <Megaphone className="w-4 h-4" />,
    contextLabel: 'What’s the post about?',
    placeholder: 'e.g. "Promote our fall deep-clean special, $20 off this month"',
  },
};

const TONES = ['Friendly', 'Professional', 'Apologetic / Fix-it', 'Enthusiastic', 'Brief & to the point'];
const PLATFORMS = ['Facebook', 'Instagram', 'Google Reviews', 'Nextdoor', 'Other'];

const POST_IDEAS: string[] = [
  'Promote our seasonal deep-clean special — mention a limited-time discount',
  'Introduce the business: who we are, what areas of Yuma we serve, and what makes us different',
  'Before & after post — describe a recent job that had a big transformation',
  'Remind past clients to book before the holidays fill up the schedule',
  'Share a 5-star review from a happy client and thank them for it',
  'Announce we are currently accepting new clients / have open slots this month',
  'Quick tip post: how to keep a home cleaner between our visits',
  'Promote the $25 referral program — refer a friend, both get credit',
  'Behind-the-scenes post introducing the team / a day in the life of a cleaner',
  'Ask happy clients to leave us a Google review, and explain why it helps a small business',
];

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

  // AI Draft panel (collapsed by default — an optional helper, not the main flow)
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>('reply_post');
  const [aiContext, setAiContext] = useState('');
  const [aiTone, setAiTone] = useState('Friendly');
  const [aiPlatform, setAiPlatform] = useState('Facebook');
  const [aiGenerated, setAiGenerated] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

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
  const isAiConfigured = !!(settings.marketingAiEndpoint && settings.marketingAiSecret);

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

  const handleGenerate = async () => {
    if (!aiContext.trim()) return;
    setAiError('');
    setAiGenerated('');
    setIsGenerating(true);
    try {
      const res = await fetch(settings.marketingAiEndpoint as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': settings.marketingAiSecret as string,
        },
        body: JSON.stringify({
          mode: aiMode,
          context: aiContext.trim(),
          tone: aiTone,
          platform: aiPlatform,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setAiGenerated(data.draft || '');
    } catch (e: any) {
      setAiError(e?.message || 'Something went wrong generating the draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  const useAiDraft = () => {
    if (!aiGenerated.trim()) return;
    setMessage(aiGenerated.trim());
    setAiGenerated('');
    setAiContext('');
    setAiPanelOpen(false);
  };

  const sortedDrafts = [...drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Messages</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Write a message (or draft one with AI below), then send it.
          {canAutoSendEmail ? ' Emails go out immediately via "Send Now."' : ' Emails open a Zoho compose window for you to send.'}
        </p>
      </div>

      {/* AI Draft helper — collapsed by default */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          onClick={() => setAiPanelOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-fuchsia-500" />
            Draft with AI (posts &amp; reviews)
          </span>
          {aiPanelOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {aiPanelOpen && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4">
            {!isAiConfigured && (
              <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">AI isn't set up yet.</p>
                  <p className="mt-1">Add the Worker URL and secret in Settings → Email Connection.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {(Object.keys(AI_MODE_META) as AiMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setAiMode(m);
                    setAiGenerated('');
                    setAiError('');
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-colors flex items-center gap-2 ${
                    aiMode === m
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${aiMode === m ? 'bg-fuchsia-500 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                    {AI_MODE_META[m].icon}
                  </div>
                  <span className="text-xs font-bold">{AI_MODE_META[m].label}</span>
                </button>
              ))}
            </div>

            {aiMode === 'create_post' && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">Need an idea? Tap one to use it:</p>
                <div className="flex flex-wrap gap-2">
                  {POST_IDEAS.map((idea) => (
                    <button
                      key={idea}
                      onClick={() => setAiContext(idea)}
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                        aiContext === idea
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {idea.length > 48 ? `${idea.slice(0, 48)}…` : idea}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="block text-xs font-semibold text-slate-700 mb-1">{AI_MODE_META[aiMode].contextLabel}</label>
            <textarea
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              rows={4}
              placeholder={AI_MODE_META[aiMode].placeholder}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tone</label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Platform</label>
                <select
                  value={aiPlatform}
                  onChange={(e) => setAiPlatform(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!aiContext.trim() || isGenerating || !isAiConfigured}
              className="mt-3 w-full py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate Draft
                </>
              )}
            </button>
            {aiError && <p className="mt-2 text-xs text-rose-600">{aiError}</p>}

            {aiGenerated && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <textarea
                  value={aiGenerated}
                  onChange={(e) => setAiGenerated(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
                <button
                  onClick={useAiDraft}
                  className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  Use This Draft ↓
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compose */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Type your message, or use Draft with AI above…"
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
