import React, { useMemo, useState } from 'react';
import { X, RotateCcw, CornerUpLeft, Copy, Check, Phone } from 'lucide-react';

/**
 * Interactive cold-call runner.
 *
 * The old version was a wall of text: an opener, a body, an ask, and a list of
 * objections you had to find while someone was talking in your ear. This walks
 * the call instead — big type is what you SAY, the buttons under it are what
 * THEY said, and the chips at the bottom catch the things people say out of
 * order (price, insurance, "who is this", "I'm busy").
 *
 * Voice: confident, warm, high-tempo. Lead with energy, never apologize for
 * calling, and always leave with a name and a date. Everything claimed here is
 * true — we are not insured yet and the script says so out loud.
 */

export type Track = 'property' | 'realtor' | 'mover' | 'vrm';

type Tone = 'next' | 'win' | 'end' | 'back';

interface Option {
  text: string;
  to: string;
  tone?: Tone;
}

interface ScriptNode {
  label: string;
  say: string[];
  coach?: string;
  options: Option[];
}

const TRACK_LABEL: Record<Track, string> = {
  property: 'RV park / property manager',
  realtor: 'Realtor',
  mover: 'Mover / senior move manager',
  vrm: 'Vacation rental manager',
};

/** Opening line per track. Everything after this converges. */
const OPENERS: Record<Track, ScriptNode> = {
  property: {
    label: 'Open — park or property office',
    say: [
      "Hey, this is Shiann over at Clean Convictions — we're the local cleaning company here in Yuma.",
      "Real quick, and I promise this is worth thirty seconds: **who handles cleaning for your residents?**",
    ],
    coach:
      'Energy up. You are not interrupting them, you are bringing them something. No "how are you today," no "is this a bad time" — that hands them the exit.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'Voicemail', to: 'voicemail' },
      { text: '"Who is this?"', to: 'whois' },
    ],
  },
  realtor: {
    label: 'Open — realtor',
    say: [
      "Hey, this is Shiann with Clean Convictions here in Yuma.",
      "Quick question for you — **when you take a listing that shows rough, who do you call to get it photo-ready?**",
    ],
    coach:
      'Agents do not buy cleaning, they buy faster closings and better photos. Lead there and you are already speaking their language.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'Voicemail', to: 'voicemail' },
      { text: '"Who is this?"', to: 'whois' },
    ],
  },
  mover: {
    label: 'Open — mover / senior move manager',
    say: [
      "Hey, this is Shiann with Clean Convictions here in Yuma.",
      "You move people out of homes all day — **who cleans the place after your truck pulls away?**",
    ],
    coach:
      'Movers hear "the house still needs cleaned" constantly and hate it. You are removing a complaint from their day.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'Voicemail', to: 'voicemail' },
      { text: '"Who is this?"', to: 'whois' },
    ],
  },
  vrm: {
    label: 'Open — vacation rental manager',
    say: [
      "Hey, this is Shiann with Clean Convictions here in Yuma.",
      "Straight to it — **when a guest checks out at eleven and the next one lands at four, who turns that unit?**",
    ],
    coach:
      'Turn time is the whole business for them. Name the pain in their words and you are instantly not a cold call.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'Voicemail', to: 'voicemail' },
      { text: '"Who is this?"', to: 'whois' },
    ],
  },
};

/** Shared tree. Every track lands here. */
const NODES: Record<string, ScriptNode> = {
  triage: {
    label: 'Who am I talking to?',
    say: ['Listen for it. Which one is this?'],
    coach: 'Do not pitch the wrong person. Thirty seconds spent finding the decision-maker beats five minutes wasted.',
    options: [
      { text: 'That is me, I handle it', to: 'pitch' },
      { text: 'Not me — the manager handles that', to: 'gatekeeper' },
      { text: 'Hold on, transferring you', to: 'transfer' },
      { text: 'Hard no right out of the gate', to: 'softno' },
    ],
  },

  gatekeeper: {
    label: 'Gatekeeper',
    say: [
      "Perfect, you're exactly who I needed then. **What's their name?**",
      "And when are they usually around — mornings? … Great, I'll call back Thursday at nine and ask for them by name. You just made my week easier.",
    ],
    coach:
      'Gatekeepers are allies, not obstacles. Treat them like the most important person in the building and they will hand you the manager. Get a NAME and a TIME, then actually call back exactly then.',
    options: [
      { text: 'Got a name and a time', to: 'wrapwin' },
      { text: 'They will not give a name', to: 'leavesomething' },
      { text: 'They offered to take a message', to: 'message' },
    ],
  },

  transfer: {
    label: 'Being transferred',
    say: ['Appreciate you — thank you.'],
    coach: 'Stay quiet and get ready. When the new person picks up, start the opener over from the top. They heard none of it.',
    options: [
      { text: 'Decision-maker picked up', to: 'pitch' },
      { text: 'Went to their voicemail', to: 'voicemail' },
      { text: 'Call dropped', to: 'callback' },
    ],
  },

  pitch: {
    label: 'The pitch',
    say: [
      "Awesome — then you're the right person. Here's why I called, and I'll be quick.",
      "**I'm not selling you anything.** Season's about to hit, and your people are walking into places that have been shut up since April. Dust on everything, bugs in the light fixtures, a fridge nobody's opened in six months. Their first day here gets spent cleaning instead of enjoying the place.",
      "We do arrival cleans. Flat rate, one visit, **we bring every single supply** — no closet, no key, nothing stored on your property.",
      "Here's what I'd love to do: **let us be the name you point people to.** Costs you nothing. Anyone who mentions you saves twenty-five bucks, and once three of them book, **we clean your office or clubhouse free.**",
    ],
    coach:
      'Now STOP. Do not fill the silence. You just made an offer that costs them nothing — let them sit with it. Whoever talks first loses.',
    options: [
      { text: 'They are in — "how do we do this?"', to: 'close', tone: 'win' },
      { text: '"We already have a cleaner"', to: 'havecleaner' },
      { text: '"We do it in-house"', to: 'inhouse' },
      { text: '"We do not allow solicitation"', to: 'solicit' },
      { text: '"What is in it for us?"', to: 'whatsinit' },
      { text: '"Just send me something"', to: 'sendme' },
    ],
  },

  close: {
    label: 'Close it',
    say: [
      "Love it. Here's the easiest version: **I drop off flyers this week and you tuck them in the welcome packets.** Takes you zero minutes.",
      "**What day works — Tuesday or Thursday?**",
    ],
    coach:
      'Never ask "would you like flyers?" Ask which day. Two choices, both of them yes. And do not hang up without a day and a name written down.',
    options: [
      { text: 'Got a day — flyers or packet', to: 'wrapwin', tone: 'win' },
      { text: 'Email it instead', to: 'sendme' },
      { text: 'Bulletin board or front desk only', to: 'wrapwin', tone: 'win' },
    ],
  },

  havecleaner: {
    label: '"We already have a cleaner"',
    say: [
      "Good — I'd rather you had somebody than nobody. **Who are you using?**",
      "I'm not asking you to drop them, seriously. But you know how it goes — one week four units come open at once and your person can't cover it. **That's the week I want to be your phone call.** Can I leave you my number for exactly that?",
    ],
    coach:
      'Never bad-mouth the incumbent. Asking who it is teaches you the market for free. Backup is a tiny ask and almost nobody says no to it — and backups become primaries.',
    options: [
      { text: 'They will take the number', to: 'wrapwin', tone: 'win' },
      { text: 'Actually — tell me more', to: 'pitch' },
      { text: 'Still no', to: 'softno' },
    ],
  },

  inhouse: {
    label: '"We do it in-house"',
    say: [
      "Smart — most parks do, and honestly if it's working, keep it.",
      "**But what happens the week four units turn at once and your person calls out?** That's the week I'm worth having in your phone. No contract, no retainer — just a name for the bad week.",
    ],
    coach: 'Overflow is a much smaller ask than replacement. Get in the phone, prove it once, and the rest takes care of itself.',
    options: [
      { text: 'They will keep the number', to: 'wrapwin', tone: 'win' },
      { text: 'Tell me more', to: 'pitch' },
      { text: 'Still no', to: 'softno' },
    ],
  },

  solicit: {
    label: '"No solicitation"',
    say: [
      "Completely understood, and I'm not going to argue policy with you.",
      "**Would a flyer on the resident bulletin board be alright instead?** Or I can just leave a few cards at the desk for anyone who asks. Your call, no pressure either way.",
    ],
    coach: 'Take the smaller yes instantly. A stack of cards on a desk still works, and it keeps the door open for spring.',
    options: [
      { text: 'Bulletin board or cards is fine', to: 'wrapwin', tone: 'win' },
      { text: 'Nothing at all', to: 'softno' },
    ],
  },

  whatsinit: {
    label: '"What is in it for us?"',
    say: [
      "Fair question, and I like that you asked. Two things.",
      "**One:** three residents book and we clean your office or clubhouse free. Real money off your budget.",
      "**Two, and this is the one that actually matters:** your new arrivals walk into a clean place instead of calling your office to complain about dust. **You look good and your phone stays quiet.**",
    ],
    coach: 'The second reason is the real one. Managers do not care about your discount, they care about complaints.',
    options: [
      { text: 'That works', to: 'close', tone: 'win' },
      { text: 'What do you charge residents?', to: 'price' },
      { text: 'Not enough', to: 'softno' },
    ],
  },

  sendme: {
    label: '"Send me something"',
    say: [
      "Absolutely — **what's the best email?**",
      "Sending it today with the flyer attached. And I'll check back with you **Thursday** just to make sure it didn't get buried. Sound good?",
    ],
    coach:
      '"Send me an email" with no follow-up date is a polite no. Get the address AND a day, out loud, before you hang up.',
    options: [
      { text: 'Got the email and a day', to: 'wrapwin', tone: 'win' },
      { text: 'Got the email, no day', to: 'wrapwin', tone: 'win' },
      { text: 'No email, just no', to: 'softno' },
    ],
  },

  price: {
    label: 'Price',
    say: [
      "Depends on the unit, and it's flat — no hourly surprises.",
      "**RV, trailer or park model: one twenty-nine.** Casita or manufactured home, four hundred to a thousand square feet: **one sixty-nine.** Arrival plus the spring close-up booked together: **two thirty-nine.**",
    ],
    coach:
      'Say the number, then shut up. Do not soften it, do not explain it, do not discount on the phone. Confidence in the number IS the number.',
    options: [
      { text: 'They are fine with it', to: 'close', tone: 'win' },
      { text: '"That is expensive"', to: 'expensive' },
      { text: 'Back to where we were', to: 'RESUME', tone: 'back' },
    ],
  },

  expensive: {
    label: '"That is too expensive"',
    say: [
      "I hear you. And I'll be straight — **I'm not the cheapest in Yuma and I'm not trying to be.**",
      "That's two of us for a couple hours, every supply we bring ourselves, and if it's not right we come back and redo it free. **I'd rather be the one you call than the one you replace in January.**",
    ],
    coach:
      'Do not drop the price to rescue a call. Someone buying on price alone leaves the second a cheaper person shows up, and you will have trained them to haggle.',
    options: [
      { text: 'Fair enough', to: 'close', tone: 'win' },
      { text: 'Still no', to: 'softno' },
      { text: 'Back to where we were', to: 'RESUME', tone: 'back' },
    ],
  },

  insured: {
    label: '"Are you licensed and insured?"',
    say: [
      "Straight answer: **I'm not carrying liability yet — I'm working on it.** I'm not going to tell you otherwise.",
      "What I can put behind the work today is a **100% re-clean guarantee.** If anything isn't right, I'm back out there and it costs you nothing.",
    ],
    coach:
      'NEVER lie about this. Yuma is small, parks talk, and getting caught ends you. If it is a hard requirement, say "let me get that squared away and I\'ll call you back" — then go get it.',
    options: [
      { text: 'They are okay with that', to: 'RESUME', tone: 'back' },
      { text: 'It is a dealbreaker', to: 'softno' },
    ],
  },

  whois: {
    label: '"Who is this?"',
    say: [
      "Shiann — **Clean Convictions**, we're a local cleaning company right here in Yuma. There's two of us.",
      "I'm calling about a free perk for your residents. **Not selling you anything.**",
    ],
    coach: 'Slow down. Company name and the word "local" early — that is what they are actually asking.',
    options: [
      { text: 'Okay, go ahead', to: 'RESUME', tone: 'back' },
      { text: 'Not interested', to: 'softno' },
    ],
  },

  busy: {
    label: '"I am busy right now"',
    say: [
      "Totally get it. **Give me thirty seconds or give me a better time — your pick.**",
    ],
    coach: 'Offering the choice usually buys the thirty seconds. If they take the callback, pin an actual day before you hang up.',
    options: [
      { text: 'Go ahead now', to: 'pitch' },
      { text: 'Call me back', to: 'callback' },
      { text: 'Neither', to: 'softno' },
    ],
  },

  callback: {
    label: 'Set the callback',
    say: [
      "No problem at all. **Is Thursday morning better, or Friday afternoon?**",
      "Thursday it is. I'll call you then — thanks for being straight with me.",
    ],
    coach:
      'Two options, not an open question. Write it down NOW. Calling back exactly when you said you would is most of the credibility you will ever have with these people.',
    options: [
      { text: 'Got a day and time', to: 'wrapwin', tone: 'win' },
      { text: 'They stayed vague', to: 'leavesomething' },
    ],
  },

  message: {
    label: 'They will take a message',
    say: [
      "That'd be great, thank you. **Shiann, Clean Convictions — nine two eight, two nine eight, five five oh nine.**",
      "It's about a free cleaning perk for residents. Costs the park nothing.",
    ],
    coach: 'Say the number slowly, twice if they are writing. Then call back yourself in four days — messages almost never get returned.',
    options: [{ text: 'Done', to: 'wrapwin', tone: 'win' }],
  },

  leavesomething: {
    label: 'Leave something behind',
    say: [
      "All good. **Mind if I just leave a few cards** in case it comes up later? No pressure either way.",
    ],
    coach: 'Never leave empty-handed, even on a no. A stack of scratch-off cards on a desk outlives the conversation by months.',
    options: [
      { text: 'They took cards', to: 'wrapwin', tone: 'win' },
      { text: 'Nothing doing', to: 'softno' },
    ],
  },

  voicemail: {
    label: 'Voicemail',
    say: [
      "Hey, this is Shiann with Clean Convictions here in Yuma — **nine two eight, two nine eight, five five oh nine.**",
      "We do arrival cleaning for park models and casitas, and with season starting I wanted to see if you need a backup. Again, **nine two eight, two nine eight, five five oh nine.** Thanks!",
    ],
    coach:
      'Under twenty seconds. Number twice, slowly, smiling — they can hear it. Do NOT leave a second voicemail; call again in four days instead.',
    options: [{ text: 'Left it', to: 'wrapwin', tone: 'win' }],
  },

  softno: {
    label: 'Not interested',
    say: [
      "Totally fair, I appreciate you being direct with me.",
      "**Can I check back in the spring** when everybody's closing up and heading north? … Either way, thanks for your time.",
    ],
    coach:
      'Hang up warm. Yuma is small and these offices talk to each other. Mark them declined, set a spring reminder, and go dial the next one.',
    options: [{ text: 'Done — log it', to: 'wrapwin', tone: 'end' }],
  },

  wrapwin: {
    label: 'Wrap it up',
    say: ['Write it down before you dial the next one.'],
    coach:
      'A prospect with no next date is a dead prospect. Put the outcome and the callback day in the notes below, copy it, and paste it into this partner record.',
    options: [{ text: 'Start the next call', to: 'RESTART', tone: 'back' }],
  },
};

/** Things people say out of order. Available from every node. */
const INTERRUPTS: { text: string; to: string }[] = [
  { text: 'How much?', to: 'price' },
  { text: 'Are you insured?', to: 'insured' },
  { text: 'Who is this?', to: 'whois' },
  { text: "I'm busy", to: 'busy' },
  { text: 'Send me an email', to: 'sendme' },
  { text: 'Not interested', to: 'softno' },
  { text: 'Voicemail picked up', to: 'voicemail' },
];

const INTERRUPT_IDS = INTERRUPTS.map((i) => i.to);

/** **bold** -> <strong>. The script uses it to mark what to hit hard. */
const emphasize = (line: string) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={i} className="font-bold text-rose-700">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{chunk}</React.Fragment>
    )
  );

interface CallRunnerProps {
  /** Pre-fill the business name, e.g. when opened from a partner row. */
  initialBusiness?: string;
  /** Pre-select the track from the partner's type. */
  initialTrack?: Track;
  onClose: () => void;
}

export default function CallRunner({ initialBusiness = '', initialTrack, onClose }: CallRunnerProps) {
  const [track, setTrack] = useState<Track | null>(initialTrack ?? null);
  const [nodeId, setNodeId] = useState<string>('OPENER');
  const [stack, setStack] = useState<string[]>([]);
  const [resume, setResume] = useState<string | null>(null);
  const [business, setBusiness] = useState(initialBusiness);
  const [person, setPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const node: ScriptNode | null = useMemo(() => {
    if (!track) return null;
    return nodeId === 'OPENER' ? OPENERS[track] : NODES[nodeId];
  }, [track, nodeId]);

  const go = (to: string) => {
    if (to === 'RESTART') {
      setNodeId('OPENER');
      setStack([]);
      setResume(null);
      setBusiness('');
      setPerson('');
      setNotes('');
      setCopied(false);
      return;
    }
    if (to === 'RESUME') {
      const back = resume ?? stack[stack.length - 1] ?? 'OPENER';
      setNodeId(back);
      setStack((s) => (resume ? s : s.slice(0, -1)));
      setResume(null);
      return;
    }
    setStack((s) => [...s, nodeId]);
    setNodeId(to);
  };

  const interrupt = (to: string) => {
    if (!INTERRUPT_IDS.includes(nodeId)) setResume(nodeId);
    setStack((s) => [...s, nodeId]);
    setNodeId(to);
  };

  const back = () => {
    setStack((s) => {
      if (!s.length) return s;
      setNodeId(s[s.length - 1]);
      return s.slice(0, -1);
    });
  };

  const summary = () =>
    [
      `${new Date().toISOString().slice(0, 10)} — call`,
      `Business: ${business.trim() || '(not entered)'}`,
      `Spoke with: ${person.trim() || '(not entered)'}`,
      `Track: ${track ? TRACK_LABEL[track] : '—'}`,
      `Ended at: ${node?.label ?? '—'}`,
      `Notes: ${notes.trim() || '(none)'}`,
    ].join('\n');

  const copySummary = async () => {
    const text = summary();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setNotes(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 sm:p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* header */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-t-2xl border-b border-slate-200 bg-white px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rose-700">
            <Phone size={14} /> Call Runner
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={back}
              disabled={!stack.length}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              <CornerUpLeft size={13} /> Back
            </button>
            <button
              type="button"
              onClick={() => go('RESTART')}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
            >
              <RotateCcw size={13} /> Restart
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
          <div className="flex w-full gap-2">
            <input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder="Who are you calling?"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
            />
            <input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Their name"
              className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6">
          {/* track picker */}
          {!track && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Start</p>
              <h3 className="mb-4 text-2xl font-bold text-slate-900">Who are you calling?</h3>
              <div className="grid gap-2">
                {(Object.keys(TRACK_LABEL) as Track[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTrack(t);
                      setNodeId('OPENER');
                      setStack([]);
                    }}
                    className="rounded-xl border-2 border-slate-200 px-4 py-3.5 text-left text-base font-semibold text-slate-800 hover:border-rose-500"
                  >
                    {TRACK_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {track && node && (
            <>
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {node.label}
              </p>

              {/* what you say */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                {node.say.map((line, i) => (
                  <p key={i} className={`text-lg leading-relaxed text-slate-900 sm:text-xl ${i ? 'mt-3' : ''}`}>
                    {emphasize(line)}
                  </p>
                ))}
                {node.coach && (
                  <p className="mt-4 border-t border-dashed border-slate-300 pt-3 text-sm leading-relaxed text-slate-500">
                    {node.coach}
                  </p>
                )}
              </div>

              {/* what they said */}
              <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-slate-400">They said…</p>
              <div className="grid gap-2">
                {node.options.map((o) => (
                  <button
                    key={o.text + o.to}
                    type="button"
                    onClick={() => go(o.to)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-semibold text-slate-800 hover:border-rose-500 ${
                      o.tone === 'win' ? 'border-emerald-300' : o.tone === 'end' ? 'border-amber-300' : 'border-slate-200'
                    }`}
                  >
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        o.tone === 'win'
                          ? 'bg-emerald-50 text-emerald-700'
                          : o.tone === 'end'
                          ? 'bg-amber-50 text-amber-700'
                          : o.tone === 'back'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {o.tone === 'win' ? 'log' : o.tone === 'end' ? 'end' : o.tone === 'back' ? 'back' : 'next'}
                    </span>
                    {o.text}
                  </button>
                ))}
              </div>

              {/* interrupts */}
              <p className="mb-2 mt-6 border-t border-slate-200 pt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                They said something else
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INTERRUPTS.map((i) => (
                  <button
                    key={i.to}
                    type="button"
                    onClick={() => interrupt(i.to)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 hover:border-rose-400 hover:text-slate-800"
                  >
                    {i.text}
                  </button>
                ))}
              </div>

              {/* notes */}
              <div className="mt-6">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Call notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What they said, who to ask for, when to call back…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                />
                <button
                  type="button"
                  onClick={copySummary}
                  className="mt-2 flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied — paste into the partner' : 'Copy for partner notes'}
                </button>
              </div>

              {/* guardrails */}
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Never promise</p>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-900">
                  We are <strong>not insured yet</strong> — say so plainly. No roofs, awnings or exteriors. No holding
                  tanks or sewer hoses. No price under $129 without checking first.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
