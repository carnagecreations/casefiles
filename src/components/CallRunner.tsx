import React, { useMemo, useState } from 'react';
import { X, RotateCcw, CornerUpLeft, Copy, Check, Phone, ChevronDown, Type } from 'lucide-react';

/**
 * Interactive cold-call runner.
 *
 * Built for low cognitive load while a real person is talking in your ear.
 * The rules it follows:
 *   - One decision on screen at a time. Everything secondary starts collapsed.
 *   - The same three zones in the same order, every single screen:
 *     SAY THIS -> THEY SAID -> everything else.
 *   - Calm, low-saturation colour. No red alarm tones, no motion, no hover
 *     transforms. Colour never carries meaning on its own.
 *   - Nothing to hold in your head: the step counter, the business name and
 *     the way back are always in the same spot.
 *   - Literal labels. "Say this out loud" means say it out loud.
 *
 * Voice of the script: confident, warm, quick. Everything it claims is true —
 * we are not insured yet and the script says so plainly.
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
  property: 'RV park or property manager',
  realtor: 'Realtor',
  mover: 'Mover or senior move manager',
  vrm: 'Vacation rental manager',
};

const OPENERS: Record<Track, ScriptNode> = {
  property: {
    label: 'Opening',
    say: [
      "Hey, this is Shiann over at Clean Convictions — we're the local cleaning company here in Yuma.",
      "Real quick, and I promise this is worth thirty seconds: **who handles cleaning for your residents?**",
    ],
    coach:
      'Energy up. You are not interrupting them, you are bringing them something. Skip "how are you today" and "is this a bad time" — both hand them an easy exit.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'It went to voicemail', to: 'voicemail' },
      { text: 'They asked who I am', to: 'whois' },
    ],
  },
  realtor: {
    label: 'Opening',
    say: [
      'Hey, this is Shiann with Clean Convictions here in Yuma.',
      'Quick question — **when you take a listing that shows rough, who do you call to get it photo-ready?**',
    ],
    coach:
      'Agents do not buy cleaning. They buy faster closings and better photos. Start there and you are already speaking their language.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'It went to voicemail', to: 'voicemail' },
      { text: 'They asked who I am', to: 'whois' },
    ],
  },
  mover: {
    label: 'Opening',
    say: [
      'Hey, this is Shiann with Clean Convictions here in Yuma.',
      'You move people out of homes all day — **who cleans the place after your truck pulls away?**',
    ],
    coach:
      'Movers hear "the house still needs cleaning" constantly and they hate it. You are taking a complaint off their plate.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'It went to voicemail', to: 'voicemail' },
      { text: 'They asked who I am', to: 'whois' },
    ],
  },
  vrm: {
    label: 'Opening',
    say: [
      'Hey, this is Shiann with Clean Convictions here in Yuma.',
      'Straight to it — **when a guest checks out at eleven and the next one lands at four, who turns that unit?**',
    ],
    coach: 'Turn time is their whole business. Name the pain in their own words and you stop being a cold call.',
    options: [
      { text: 'They are listening', to: 'triage' },
      { text: 'It went to voicemail', to: 'voicemail' },
      { text: 'They asked who I am', to: 'whois' },
    ],
  },
};

const NODES: Record<string, ScriptNode> = {
  triage: {
    label: 'Who is this?',
    say: ['Listen for which one this is. Nothing to say yet.'],
    coach: 'Do not pitch the wrong person. Thirty seconds finding the decision-maker beats five minutes wasted.',
    options: [
      { text: 'They handle it themselves', to: 'pitch' },
      { text: 'The manager handles it, not them', to: 'gatekeeper' },
      { text: 'They are transferring me', to: 'transfer' },
      { text: 'Hard no right away', to: 'softno' },
    ],
  },

  gatekeeper: {
    label: 'Front desk',
    say: [
      "Perfect, you're exactly who I needed then. **What's their name?**",
      "And when are they usually around? … Great — I'll call back Thursday at nine and ask for them. You just made my week easier.",
    ],
    coach:
      'Front desk people are allies, not obstacles. Treat them like the most important person in the building and they hand you the manager. Get a name and a time, then call back exactly when you said.',
    options: [
      { text: 'Got a name and a time', to: 'wrapwin', tone: 'win' },
      { text: 'They would not give a name', to: 'leavesomething' },
      { text: 'They offered to take a message', to: 'message' },
    ],
  },

  transfer: {
    label: 'On hold',
    say: ['Appreciate you — thank you.'],
    coach: 'Stay quiet and get ready. When the next person picks up, start the opening over from the top. They heard none of it.',
    options: [
      { text: 'The manager picked up', to: 'pitch' },
      { text: 'It went to their voicemail', to: 'voicemail' },
      { text: 'The call dropped', to: 'callback' },
    ],
  },

  pitch: {
    label: 'The pitch',
    say: [
      "Awesome — then you're the right person. Here's why I called, and I'll be quick.",
      "**I'm not selling you anything.** Season's about to hit, and your people are walking into places that have been shut up since April. Dust on everything, bugs in the light fixtures, a fridge nobody's opened in six months.",
      'We do arrival cleans. Flat rate, one visit, **we bring every single supply** — no closet, no key, nothing stored on your property.',
      "Here's what I'd love to do: **let us be the name you point people to.** Costs you nothing. Anyone who mentions you saves twenty-five dollars, and once three of them book, **we clean your office or clubhouse free.**",
    ],
    coach:
      'Now stop talking. Do not fill the silence. You made an offer that costs them nothing — let them sit with it. Whoever talks first loses.',
    options: [
      { text: 'They are in', to: 'close', tone: 'win' },
      { text: 'They already have a cleaner', to: 'havecleaner' },
      { text: 'They clean in-house', to: 'inhouse' },
      { text: 'No solicitation allowed', to: 'solicit' },
      { text: 'They asked what they get out of it', to: 'whatsinit' },
      { text: 'They want something sent over', to: 'sendme' },
    ],
  },

  close: {
    label: 'Closing',
    say: [
      "Love it. Easiest version: **I drop off flyers this week and you tuck them in the welcome packets.** Takes you zero minutes.",
      '**What day works — Tuesday or Thursday?**',
    ],
    coach:
      'Never ask "would you like flyers." Ask which day. Two choices, both of them yes. Do not hang up without a day and a name.',
    options: [
      { text: 'Got a day for flyers', to: 'wrapwin', tone: 'win' },
      { text: 'They want it emailed instead', to: 'sendme' },
      { text: 'Bulletin board or front desk only', to: 'wrapwin', tone: 'win' },
    ],
  },

  havecleaner: {
    label: 'They have a cleaner',
    say: [
      "Good — I'd rather you had somebody than nobody. **Who are you using?**",
      "I'm not asking you to drop them. But one week four units come open at once and your person can't cover it. **That's the week I want to be your phone call.** Can I leave you my number for that?",
    ],
    coach:
      'Never bad-mouth whoever they use. Asking who it is teaches you the market for free. Backup is a tiny ask, and backups become primaries.',
    options: [
      { text: 'They will take the number', to: 'wrapwin', tone: 'win' },
      { text: 'They want to hear more', to: 'pitch' },
      { text: 'Still no', to: 'softno' },
    ],
  },

  inhouse: {
    label: 'They clean in-house',
    say: [
      'Smart — most parks do, and if it works, keep it.',
      "**But what happens the week four units turn at once and your person calls out?** That's the week I'm worth having in your phone. No contract, no retainer, just a name for the bad week.",
    ],
    coach: 'Overflow is a far smaller ask than replacement. Get into the phone, prove it once, and the rest follows.',
    options: [
      { text: 'They will keep the number', to: 'wrapwin', tone: 'win' },
      { text: 'They want to hear more', to: 'pitch' },
      { text: 'Still no', to: 'softno' },
    ],
  },

  solicit: {
    label: 'No solicitation',
    say: [
      "Completely understood, and I'm not going to argue policy with you.",
      '**Would a flyer on the resident bulletin board be alright instead?** Or I can leave a few cards at the desk for anyone who asks. Your call.',
    ],
    coach: 'Take the smaller yes immediately. Cards on a desk still work, and it keeps the door open for spring.',
    options: [
      { text: 'Bulletin board or cards is fine', to: 'wrapwin', tone: 'win' },
      { text: 'Nothing at all', to: 'softno' },
    ],
  },

  whatsinit: {
    label: 'What do they get',
    say: [
      'Fair question, and I like that you asked. Two things.',
      '**One:** three residents book and we clean your office or clubhouse free.',
      '**Two, and this is the one that matters:** your new arrivals walk into a clean place instead of calling your office to complain about dust. **You look good and your phone stays quiet.**',
    ],
    coach: 'The second reason is the real one. Managers do not care about your discount. They care about complaints.',
    options: [
      { text: 'That works for them', to: 'close', tone: 'win' },
      { text: 'They asked the price', to: 'price' },
      { text: 'Not enough', to: 'softno' },
    ],
  },

  sendme: {
    label: 'Send it over',
    say: [
      "Absolutely — **what's the best email?**",
      "Sending it today with the flyer attached. And I'll check back **Thursday** so it doesn't get buried. Sound good?",
    ],
    coach: '"Send me an email" with no follow-up date is a polite no. Get the address and a day, out loud, before you hang up.',
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
      '**RV, trailer or park model: one twenty-nine.** Casita or manufactured home: **one sixty-nine.** Arrival plus the spring close-up booked together: **two thirty-nine.**',
    ],
    coach:
      'Say the number, then stop. Do not soften it, do not explain it, do not discount on the phone. Confidence in the number is the number.',
    options: [
      { text: 'They are fine with it', to: 'close', tone: 'win' },
      { text: 'They said it is expensive', to: 'expensive' },
      { text: 'Go back to where we were', to: 'RESUME', tone: 'back' },
    ],
  },

  expensive: {
    label: 'Too expensive',
    say: [
      "I hear you. And I'll be straight — **I'm not the cheapest in Yuma and I'm not trying to be.**",
      "That's two of us for a couple hours, every supply we bring ourselves, and if it's not right we come back free. **I'd rather be the one you call than the one you replace in January.**",
    ],
    coach:
      'Do not drop the price to rescue a call. Someone buying on price alone leaves the moment a cheaper person shows up, and you will have taught them to haggle.',
    options: [
      { text: 'Fair enough', to: 'close', tone: 'win' },
      { text: 'Still no', to: 'softno' },
      { text: 'Go back to where we were', to: 'RESUME', tone: 'back' },
    ],
  },

  insured: {
    label: 'Licensed and insured',
    say: [
      "Straight answer: **I'm not carrying liability yet — I'm working on it.** I'm not going to tell you otherwise.",
      "What I can put behind the work today is a **100% re-clean guarantee.** If anything isn't right, I'm back out there and it costs you nothing.",
    ],
    coach:
      'Never lie about this. Yuma is small, parks talk, and getting caught ends you. If it is a hard requirement, say "let me get that squared away and I\'ll call you back" — then go get it.',
    options: [
      { text: 'They are okay with that', to: 'RESUME', tone: 'back' },
      { text: 'It is a dealbreaker', to: 'softno' },
    ],
  },

  whois: {
    label: 'Who is calling',
    say: [
      "Shiann — **Clean Convictions**, a local cleaning company right here in Yuma. There's two of us.",
      "I'm calling about a free perk for your residents. **Not selling you anything.**",
    ],
    coach: 'Slow down. Company name and the word "local" early — that is what they are actually asking.',
    options: [
      { text: 'They said go ahead', to: 'RESUME', tone: 'back' },
      { text: 'Not interested', to: 'softno' },
    ],
  },

  busy: {
    label: 'They are busy',
    say: ['Totally get it. **Give me thirty seconds, or give me a better time — your pick.**'],
    coach: 'Offering the choice usually buys the thirty seconds. If they take the callback, pin an actual day before hanging up.',
    options: [
      { text: 'They said go ahead now', to: 'pitch' },
      { text: 'They want a callback', to: 'callback' },
      { text: 'Neither', to: 'softno' },
    ],
  },

  callback: {
    label: 'Set the callback',
    say: [
      'No problem at all. **Is Thursday morning better, or Friday afternoon?**',
      "Thursday it is. I'll call you then — thanks for being straight with me.",
    ],
    coach:
      'Two options, not an open question. Write it down now. Calling back exactly when you said is most of the credibility you will ever have with these people.',
    options: [
      { text: 'Got a day and time', to: 'wrapwin', tone: 'win' },
      { text: 'They stayed vague', to: 'leavesomething' },
    ],
  },

  message: {
    label: 'Leaving a message',
    say: [
      "That'd be great, thank you. **Shiann, Clean Convictions — nine two eight, two nine eight, five five oh nine.**",
      "It's about a free cleaning perk for residents. Costs the park nothing.",
    ],
    coach: 'Say the number slowly, twice if they are writing. Call back yourself in four days — messages rarely get returned.',
    options: [{ text: 'Done', to: 'wrapwin', tone: 'win' }],
  },

  leavesomething: {
    label: 'Leave something behind',
    say: ['All good. **Mind if I just leave a few cards** in case it comes up later? No pressure either way.'],
    coach: 'Never leave empty-handed, even on a no. Cards on a desk outlive the conversation by months.',
    options: [
      { text: 'They took cards', to: 'wrapwin', tone: 'win' },
      { text: 'Nothing doing', to: 'softno' },
    ],
  },

  voicemail: {
    label: 'Voicemail',
    say: [
      'Hey, this is Shiann with Clean Convictions here in Yuma — **nine two eight, two nine eight, five five oh nine.**',
      'We do arrival cleaning for park models and casitas, and with season starting I wanted to see if you need a backup. Again, **nine two eight, two nine eight, five five oh nine.** Thanks!',
    ],
    coach: 'Under twenty seconds. Number twice, slowly. Do not leave a second voicemail — call again in four days instead.',
    options: [{ text: 'Left it', to: 'wrapwin', tone: 'win' }],
  },

  softno: {
    label: 'Not interested',
    say: [
      'Totally fair, I appreciate you being direct with me.',
      "**Can I check back in the spring** when everybody's closing up and heading north? … Either way, thanks for your time.",
    ],
    coach:
      'Hang up warm. Yuma is small and these offices talk. Mark them declined, set a spring reminder, and dial the next one.',
    options: [{ text: 'Done', to: 'wrapwin', tone: 'end' }],
  },

  wrapwin: {
    label: 'Finish up',
    say: ['Call is over. Write down what happens next, before you dial anyone else.'],
    coach: 'A prospect with no next date is a dead prospect.',
    options: [{ text: 'Start a new call', to: 'RESTART', tone: 'back' }],
  },
};

const INTERRUPTS: { text: string; to: string }[] = [
  { text: 'They asked the price', to: 'price' },
  { text: 'They asked if we are insured', to: 'insured' },
  { text: 'They asked who is calling', to: 'whois' },
  { text: 'They said they are busy', to: 'busy' },
  { text: 'They want it emailed', to: 'sendme' },
  { text: 'They said not interested', to: 'softno' },
  { text: 'It went to voicemail', to: 'voicemail' },
];

const INTERRUPT_IDS = INTERRUPTS.map((i) => i.to);

/**
 * Selling tips, in the spirit of how Ryan Serhant coaches it. These are
 * principles written in our own words, not quotations. One per screen, tucked
 * inside the same drawer as the delivery note so the screen count never grows.
 */
const TIPS: Record<string, string> = {
  OPENER:
    'Energy is a decision you make before you dial, not a mood you wait for. They can hear a smile through the phone, and the first four seconds decide whether you are a person or a telemarketer. Stand up. Dial the next one within ten seconds of hanging up the last one — momentum is the whole game.',
  triage:
    'The best closers are the best listeners. You already know your lines, so spend this moment listening to theirs: who they are, how busy they sound, whether they like their current setup. What they say here is what you sell with thirty seconds from now.',
  gatekeeper:
    'The person answering the phone is not in your way, they are the shortest path in. Get their name and use it. Treat them like the most important person in the building and they will walk your name to the manager personally. Most people burn this relationship in ten seconds by sounding annoyed.',
  transfer:
    'Do not coast while you wait. Take a breath, say the business name in your head, and start fresh. The next person heard none of it and they are judging the first sentence, not the fifth.',
  pitch:
    'Do not sell, serve. You are not asking them for money, you are handing them something that makes their residents happier and their phone quieter — for free. Say it like the favour it is. Then the hardest and most valuable thing in sales: shut up. Silence is not awkward, it is the close doing its work.',
  close:
    'Most deals die because nobody ever actually asked. You can run a perfect call and lose it by fading out on "well, let me know." Ask, specifically, for the thing you want, and give two options instead of a yes-or-no. Then go quiet and let them pick one.',
  havecleaner:
    'Never trash the competition — it makes you small and it makes them defensive. Compliment the fact that they are covered, then take the door that is actually open: be the backup. Backups become primaries the first week the other person does not show.',
  inhouse:
    'Shrink the ask until it is impossible to refuse. You are not asking to replace their system, you are asking for one phone number in one contact list for one bad week. Tiny yeses are how big accounts start.',
  solicit:
    'When the front door closes, do not push on it. Ask for the window. A stack of cards on a desk is a worse outcome than the welcome packet and a far better outcome than nothing, and it keeps you welcome back in the spring.',
  whatsinit:
    'Never answer this with your discount. Answer it with their problem. Every manager is buying the same thing: fewer complaints, fewer fires, a quieter phone. Lead with what makes them look good to their boss and their residents.',
  sendme:
    'Follow up, follow through, follow back. "Send me something" is where most deals quietly die, because the email goes out and nobody ever circles back. Get the address and a specific day out loud, then actually call on that day. The follow-up is the job.',
  price:
    'Say your number the way you would say your own name. No hedging, no nervous laugh, no "it depends" spiral. The confidence you deliver the number with is most of whether they accept it. Then stop talking — the first person to speak after a price negotiates against themselves.',
  expensive:
    'Never discount on the phone to save a call. The moment you drop your price you have taught them that your first number was fake, and you will negotiate every job from now on. Defend the value instead: who shows up, what you bring, what happens if it is wrong.',
  insured:
    'Honesty is a sales asset, not a weakness. Saying the uncomfortable true thing out loud makes every other claim you make more believable — and in a town this size, getting caught in one exaggeration ends the whole business. Answer it straight and move to what you can guarantee today.',
  whois:
    'Being forgettable is worse than being rejected. Say the company name clearly, say "local," say there are two of you. People buy from people, especially in a small town, so give them a person to remember instead of a pitch.',
  busy:
    'Respect their time out loud and they will usually give you some. Offering a real choice — thirty seconds now or a better time later — turns a brush-off into an appointment. Never keep talking over someone who just told you they are busy.',
  callback:
    'The calendar is where deals live. Vague follow-ups never happen, so pin a day and time and write it down while they are still on the line. Then call exactly when you said you would — doing that one thing puts you ahead of almost everyone who calls them.',
  message:
    'Assume the message will never reach them, and be gracious anyway. Leave your name and number slowly, thank the person taking it, and put your own reminder in for four days out. Your follow-up is the one that works, not their note.',
  leavesomething:
    'Never leave empty-handed. A card outlives the conversation by months, and the person who says no in September is often the person who calls in January when their cleaner quits. Leaving something is how a no stays a maybe.',
  voicemail:
    'Short, warm, and the number twice. Nobody has ever called back a rambling voicemail. And do not leave a second one — it reads as desperate. Call again in four days instead, because most answers come after several attempts, not the first.',
  softno:
    'No is not forever, it is not right now. How you handle the rejection is what they will remember when their situation changes, so hang up warmer than you were when they said it. Yuma is small and these offices talk to each other.',
  wrapwin:
    'The fortune is in the follow-up. Log it before you dial the next one, because the version you remember in three days will be wrong. A prospect with no next date is not a prospect, it is a story you tell yourself about being busy.',
};

const emphasize = (line: string) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={i} className="font-bold text-slate-900 underline decoration-teal-500/60 decoration-2 underline-offset-4">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{chunk}</React.Fragment>
    )
  );

/** Collapsed-by-default drawer. Nothing secondary competes with the script. */
const Drawer: React.FC<{ title: string; children: React.ReactNode; tone?: 'plain' | 'warn' }> = ({
  title,
  children,
  tone = 'plain',
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border ${tone === 'warn' ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[15px] font-semibold text-slate-700"
      >
        {title}
        <ChevronDown size={17} className={`shrink-0 text-slate-400 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

interface CallRunnerProps {
  initialBusiness?: string;
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
  const [big, setBig] = useState(false);

  const node: ScriptNode | null = useMemo(() => {
    if (!track) return null;
    return nodeId === 'OPENER' ? OPENERS[track] : NODES[nodeId];
  }, [track, nodeId]);

  const reset = () => {
    setNodeId('OPENER');
    setStack([]);
    setResume(null);
    setBusiness('');
    setPerson('');
    setNotes('');
    setCopied(false);
  };

  const go = (to: string) => {
    if (to === 'RESTART') return reset();
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

  const back = () =>
    setStack((s) => {
      if (!s.length) return s;
      setNodeId(s[s.length - 1]);
      return s.slice(0, -1);
    });

  const summary = () =>
    [
      `${new Date().toISOString().slice(0, 10)} — call`,
      `Business: ${business.trim() || '(not entered)'}`,
      `Spoke with: ${person.trim() || '(not entered)'}`,
      `Type: ${track ? TRACK_LABEL[track] : '—'}`,
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

  const sayText = big ? 'text-[26px] leading-[1.55]' : 'text-[20px] leading-[1.55]';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-800/40 p-0 sm:p-6">
      <div className="w-full max-w-xl bg-[#FAFAF8] shadow-xl sm:rounded-2xl">
        {/* ---------- header: always identical, always here ---------- */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-[#FAFAF8] px-4 py-3 sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-teal-800">
              <Phone size={15} /> Call runner
            </span>
            <span className="text-[13px] font-semibold text-slate-400">
              {track ? `Step ${stack.length + 1}` : 'Start'}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBig((v) => !v)}
                aria-label={big ? 'Smaller text' : 'Bigger text'}
                title={big ? 'Smaller text' : 'Bigger text'}
                className={`rounded-lg border p-2 ${
                  big ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-500'
                }`}
              >
                <Type size={15} />
              </button>
              <button
                type="button"
                onClick={back}
                disabled={!stack.length}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[13px] font-semibold text-slate-600 disabled:opacity-40"
              >
                <CornerUpLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={reset}
                aria-label="Start over"
                title="Start over"
                className="rounded-lg border border-slate-200 p-2 text-slate-500"
              >
                <RotateCcw size={14} />
              </button>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          {/* ---------- who ---------- */}
          {track && (
            <Drawer title={business.trim() ? `Calling: ${business.trim()}` : 'Who are you calling? (optional)'}>
              <div className="grid gap-2">
                <input
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="Business name"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] text-slate-800"
                />
                <input
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  placeholder="Their name"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] text-slate-800"
                />
              </div>
            </Drawer>
          )}

          {/* ---------- track picker ---------- */}
          {!track && (
            <div>
              <h3 className="mb-4 text-[22px] font-bold text-slate-900">Who are you calling?</h3>
              <div className="grid gap-2.5">
                {(Object.keys(TRACK_LABEL) as Track[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTrack(t);
                      setNodeId('OPENER');
                      setStack([]);
                    }}
                    className="rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-left text-[17px] font-semibold text-slate-800"
                  >
                    {TRACK_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {track && node && (
            <>
              {/* ---------- 1. SAY THIS ---------- */}
              <section>
                <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-teal-800">Say this out loud</h2>
                <div className="rounded-xl border-l-4 border-teal-700 bg-white px-5 py-5 shadow-sm">
                  {node.say.map((line, i) => (
                    <p key={i} className={`max-w-[46ch] text-slate-800 ${sayText} ${i ? 'mt-4' : ''}`}>
                      {emphasize(line)}
                    </p>
                  ))}
                </div>
                {(node.coach || TIPS[nodeId]) && (
                  <div className="mt-2">
                    <Drawer title="How to say it, and why">
                      {node.coach && (
                        <p className="max-w-[52ch] text-[15px] leading-relaxed text-slate-600">{node.coach}</p>
                      )}
                      {TIPS[nodeId] && (
                        <div className={`rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-3 ${node.coach ? 'mt-3' : ''}`}>
                          <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-teal-800">Selling tip</p>
                          <p className="max-w-[52ch] text-[15px] leading-relaxed text-teal-900">{TIPS[nodeId]}</p>
                        </div>
                      )}
                    </Drawer>
                  </div>
                )}
              </section>

              {/* ---------- 2. THEY SAID ---------- */}
              <section>
                <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-slate-500">
                  Then tap what they said
                </h2>
                <div className="grid gap-2.5">
                  {node.options.map((o) => (
                    <button
                      key={o.text + o.to}
                      type="button"
                      onClick={() => go(o.to)}
                      className={`rounded-xl border-2 bg-white px-4 py-4 text-left text-[17px] font-semibold text-slate-800 ${
                        o.tone === 'win'
                          ? 'border-teal-600'
                          : o.tone === 'end'
                          ? 'border-slate-300'
                          : o.tone === 'back'
                          ? 'border-slate-200'
                          : 'border-slate-200'
                      }`}
                    >
                      {o.text}
                      {o.tone === 'win' && (
                        <span className="ml-2 text-[13px] font-bold uppercase tracking-wide text-teal-700">· log it</span>
                      )}
                      {o.tone === 'back' && (
                        <span className="ml-2 text-[13px] font-bold uppercase tracking-wide text-slate-400">· back</span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* ---------- 3. everything else, collapsed ---------- */}
              <div className="grid gap-2.5">
                <Drawer title="They said something else">
                  <div className="grid gap-2 pt-1">
                    {INTERRUPTS.map((i) => (
                      <button
                        key={i.to}
                        type="button"
                        onClick={() => interrupt(i.to)}
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-left text-[15px] font-semibold text-slate-700"
                      >
                        {i.text}
                      </button>
                    ))}
                  </div>
                </Drawer>

                <Drawer title="Write a note">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Who to ask for, when to call back…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={copySummary}
                    className="mt-2 flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-[15px] font-bold text-white"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy for partner notes'}
                  </button>
                </Drawer>

                <Drawer title="Never promise" tone="warn">
                  <ul className="grid max-w-[52ch] gap-1.5 text-[15px] leading-relaxed text-amber-900">
                    <li>We are not insured yet. Say so plainly.</li>
                    <li>No roofs, awnings or exteriors.</li>
                    <li>No holding tanks or sewer hoses.</li>
                    <li>No price under $129 without checking first.</li>
                  </ul>
                </Drawer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
