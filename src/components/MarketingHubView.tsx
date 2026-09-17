import React, { useState, useEffect } from 'react';
import { MarketingDraft, MarketingDraftMode, PricingSettings } from '../types';
import {
  Megaphone,
  Mail,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  Send,
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

const MODE_META: Record<MarketingDraftMode, { label: string; icon: React.ReactNode; placeholder: string; contextLabel: string }> = {
  reply_email: {
    label: 'Reply to an Email',
    icon: <Mail className="w-4 h-4" />,
    contextLabel: 'Paste the email you received',
    placeholder: 'e.g. "Hi, I was wondering if you could clean my house this Friday instead of Monday..."',
  },
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
const PLATFORMS = ['Facebook', 'Instagram', 'Google Reviews', 'Nextdoor', 'Email', 'Other'];

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
  'Post about move-in/move-out cleaning season for renters and realtors',
  'Highlight a specific add-on service (inside fridge, inside oven, window tracks, etc.)',
  'Thank the community for supporting a local, women-owned business',
  'Post about pet-friendly cleaning — reassure pet owners we are careful and experienced',
  'Share a satisfying checklist / cleaning routine we use so people see the thoroughness',
];

export const MarketingHubView: React.FC<MarketingHubViewProps> = ({
  drafts,
  settings,
  onSaveDraft,
  onDeleteDraft,
  prefill,
  onPrefillConsumed,
}) => {
  const [mode, setMode] = useState<MarketingDraftMode>('reply_post');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('Friendly');
  const [platform, setPlatform] = useState('Facebook');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<'ok' | 'error' | ''>('');

  useEffect(() => {
    if (prefill) {
      setMode(prefill.mode);
      setContext(prefill.context);
      setRecipientEmail(prefill.recipientEmail || '');
      setRecipientPhone(prefill.recipientPhone || '');
      setSubject(prefill.subject || '');
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const isConfigured = !!(settings.marketingAiEndpoint && settings.marketingAiSecret);
  const canAutoSendEmail = isZohoEmailConfigured(settings);

  const handleSendNow = async () => {
    if (!recipientEmail || !generatedText.trim()) return;
    setIsSending(true);
    setSendResult('');
    try {
      await sendEmail(settings, recipientEmail, subject || 'Clean Convictions', generatedText.replace(/\n/g, '<br/>'));
      setSendResult('ok');
    } catch {
      setSendResult('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setError('');
    setGeneratedText('');
    setIsGenerating(true);
    try {
      const res = await fetch(settings.marketingAiEndpoint as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': settings.marketingAiSecret as string,
        },
        body: JSON.stringify({
          mode,
          context: context.trim(),
          tone,
          platform: mode === 'create_post' ? platform : mode === 'reply_post' ? platform : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setGeneratedText(data.draft || '');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong generating the draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard?.writeText(generatedText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!generatedText.trim()) return;
    onSaveDraft({
      mode,
      platform: mode !== 'reply_email' ? platform : undefined,
      tone,
      inputContext: context.trim(),
      draftText: generatedText.trim(),
    });
  };

  const sortedDrafts = [...drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Marketing Hub</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          AI-drafted replies and posts — review and edit, then send. Social posts always require you to paste them in yourself;
          {canAutoSendEmail ? ' emails can go out immediately via "Send Now."' : ' emails open a Zoho compose window for you to send.'}
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AI isn't set up yet.</p>
            <p className="mt-1">
              Deploy the Marketing AI Worker (see the <code className="bg-amber-100 px-1 rounded">cloudflare-ai-worker</code> folder
              you were sent) and paste its URL + shared secret into Settings → Marketing AI.
            </p>
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {(Object.keys(MODE_META) as MarketingDraftMode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setGeneratedText('');
              setError('');
            }}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
              mode === m
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${mode === m ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
              {MODE_META[m].icon}
            </div>
            <div className="text-xs font-bold">{MODE_META[m].label}</div>
          </button>
        ))}
      </div>

      {/* Post idea suggestions */}
      {mode === 'create_post' && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 mb-2">Need an idea? Tap one to use it:</p>
          <div className="flex flex-wrap gap-2">
            {POST_IDEAS.map((idea) => (
              <button
                key={idea}
                onClick={() => setContext(idea)}
                className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                  context === idea
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

      {/* Input form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-700 mb-1">{MODE_META[mode].contextLabel}</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={5}
          placeholder={MODE_META[mode].placeholder}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {mode !== 'reply_email' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!context.trim() || isGenerating || !isConfigured}
          className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
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

        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </div>

      {/* Generated result */}
      {generatedText && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-xs p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Draft</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleSave}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Save to History
              </button>
            </div>
          </div>
          <textarea
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
          />
          <p className="text-[10px] text-slate-400 mt-2">
            Edit freely above, then send it.
            {canAutoSendEmail ? ' "Send Now" emails it immediately — no extra step.' : ' Texts still open Google Voice for you to send by hand.'}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {recipientPhone && (
              <a
                href={buildSmsLink(recipientPhone, generatedText)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-teal-300 hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Text via Google Voice
              </a>
            )}
            {recipientEmail && canAutoSendEmail && (
              <button
                onClick={handleSendNow}
                disabled={isSending}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isSending ? 'Sending…' : 'Send Now (Zoho)'}
              </button>
            )}
            {recipientEmail && (
              <a
                href={buildZohoComposeLink(recipientEmail, subject || 'Clean Convictions', generatedText)}
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
          {!recipientPhone && !recipientEmail && (
            <p className="text-[10px] text-slate-400 mt-2">
              Add a recipient phone or email above to send this directly.
            </p>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Saved Drafts</h3>
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
          {sortedDrafts.length === 0 && (
            <p className="p-6 text-xs text-slate-400 text-center">Nothing saved yet.</p>
          )}
          {sortedDrafts.map((d) => (
            <div key={d.id} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{MODE_META[d.mode].label}</span>
                  {d.platform && <span>• {d.platform}</span>}
                  <span>• {d.createdAt}</span>
                </div>
                <button
                  onClick={() => onDeleteDraft(d.id)}
                  className="text-slate-300 hover:text-rose-600 cursor-pointer"
                  aria-label="Delete draft"
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
