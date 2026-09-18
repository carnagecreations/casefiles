import React, { useState, useMemo } from 'react';
import {
  Gift,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Copy,
  Check,
  Plus,
  Trash2,
  Search,
  Filter,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  ChevronRight,
  Calculator,
} from 'lucide-react';
import { Client, Referral, PricingSettings } from '../types';
import { generateReferralCode } from '../utils/starterData';

interface ReferralsViewProps {
  clients: Client[];
  referrals: Referral[];
  settings: PricingSettings;
  onAddReferral: (referralData: Omit<Referral, 'id'>) => void;
  onUpdateReferral: (referral: Referral) => void;
  onDeleteReferral: (id: string) => void;
  onAwardCreditToClient: (clientId: string, amount: number) => void;
  onUpdateClient: (client: Client) => void;
  onNavigateToEstimator?: (clientInfo: { name: string; phone?: string; referralCode?: string }) => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({
  clients,
  referrals,
  settings,
  onAddReferral,
  onUpdateReferral,
  onDeleteReferral,
  onAwardCreditToClient,
  onUpdateClient,
  onNavigateToEstimator,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'clients' | 'templates'>('activity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'qualified' | 'redeemed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareClient, setShareClient] = useState<Client | null>(clients[0] || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for New Referral
  const [selectedReferrerId, setSelectedReferrerId] = useState<string>(clients[0]?.id || '');
  const [refereeName, setRefereeName] = useState('');
  const [refereePhone, setRefereePhone] = useState('');
  const [refereeEmail, setRefereeEmail] = useState('');
  const [customRewardAmount, setCustomRewardAmount] = useState<number>(settings.referralRewardAmount || 25);
  const [customDiscountAmount, setCustomDiscountAmount] = useState<number>(settings.referralDiscountAmount || 25);
  const [referralNotes, setReferralNotes] = useState('');

  // Metrics
  const totalReferrals = referrals.length;
  const pendingReferrals = referrals.filter((r) => r.status === 'pending');
  const qualifiedReferrals = referrals.filter((r) => r.status === 'qualified');
  const redeemedReferrals = referrals.filter((r) => r.status === 'redeemed');

  const totalRewardsIssued = referrals
    .filter((r) => r.status === 'qualified' || r.status === 'redeemed')
    .reduce((sum, r) => sum + (r.rewardAmount || 25), 0);

  const totalClientCreditsAvailable = clients.reduce(
    (sum, c) => sum + (c.referralCreditBalance || 0),
    0
  );

  // Filtered referrals list
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        r.refereeName.toLowerCase().includes(term) ||
        r.referrerName.toLowerCase().includes(term) ||
        r.referrerCode.toLowerCase().includes(term) ||
        (r.refereePhone && r.refereePhone.includes(term)) ||
        (r.notes && r.notes.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [referrals, statusFilter, searchTerm]);

  // Clients with referral codes or needing one
  const clientsWithCodes = useMemo(() => {
    return clients.map((c) => {
      const code = c.referralCode || generateReferralCode(c.name, c.phone);
      const referralsMade = referrals.filter((r) => r.referrerClientId === c.id);
      return {
        ...c,
        referralCode: code,
        referralsCount: referralsMade.length,
        qualifiedCount: referralsMade.filter((r) => r.status === 'qualified' || r.status === 'redeemed').length,
      };
    });
  }, [clients, referrals]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refereeName.trim()) return;

    const referrer = clients.find((c) => c.id === selectedReferrerId);
    const referrerName = referrer ? referrer.name : 'Direct / Client';
    const referrerCode = referrer?.referralCode || (referrer ? generateReferralCode(referrer.name, referrer.phone) : 'CC-REF');

    // If referrer had no code saved yet, save it
    if (referrer && !referrer.referralCode) {
      onUpdateClient({
        ...referrer,
        referralCode: referrerCode,
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    onAddReferral({
      referrerClientId: selectedReferrerId,
      referrerName,
      referrerCode,
      refereeName: refereeName.trim(),
      refereePhone: refereePhone.trim() || undefined,
      refereeEmail: refereeEmail.trim() || undefined,
      rewardAmount: Number(customRewardAmount) || 25,
      refereeDiscount: Number(customDiscountAmount) || 25,
      status: 'pending',
      dateReferred: todayStr,
      notes: referralNotes.trim() || undefined,
    });

    // Reset
    setRefereeName('');
    setRefereePhone('');
    setRefereeEmail('');
    setReferralNotes('');
    setIsAddModalOpen(false);
  };

  const handleMarkQualified = (ref: Referral) => {
    const todayStr = new Date().toISOString().split('T')[0];
    onUpdateReferral({
      ...ref,
      status: 'qualified',
      dateQualified: todayStr,
    });

    // Award credit to referrer
    if (ref.referrerClientId) {
      onAwardCreditToClient(ref.referrerClientId, ref.rewardAmount || 25);
    }
  };

  const handleMarkRedeemed = (ref: Referral) => {
    const todayStr = new Date().toISOString().split('T')[0];
    onUpdateReferral({
      ...ref,
      status: 'redeemed',
      dateRedeemed: todayStr,
    });
  };

  const getSmsText = (clientName: string, code: string) => {
    return `Hey! It's ${clientName}. I use Clean Convictions for our home cleaning in Yuma and they do an exceptional job. Use my link to get $25 OFF your first clean: https://cleanconvictions.com/book?rc=${code} — or call/text (928) 555-0100.`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Program Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Client Referral System & Rewards
                </h1>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Give $25 • Get $25
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Reward existing clients with service credits when they refer friends, family, or neighbors. New clients receive <strong className="text-slate-900">${settings.referralDiscountAmount || 25} off</strong> their first cleaning, and the referring client earns a <strong className="text-slate-900">${settings.referralRewardAmount || 25} credit</strong> towards their next clean.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <button
              onClick={() => {
                if (clients.length > 0) setShareClient(clients[0]);
                setIsShareModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Generate Share Link / SMS
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Log New Referral
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block">Total Referrals Logged</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-extrabold text-slate-900">{totalReferrals}</span>
              <span className="text-[11px] text-slate-500">{pendingReferrals.length} pending clean</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block">Qualified Completed</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-extrabold text-emerald-700">{qualifiedReferrals.length}</span>
              <span className="text-[11px] text-slate-500">{redeemedReferrals.length} redeemed</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block">Total Referral Rewards</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-extrabold text-slate-900">${totalRewardsIssued}</span>
              <span className="text-[11px] text-slate-500">lifetime value</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block">Active Client Credits</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-extrabold text-teal-700">${totalClientCreditsAvailable}</span>
              <span className="text-[11px] text-slate-500">available to spend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('activity')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center ${
              activeSubTab === 'activity'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Referral Activity & Leads ({referrals.length})
          </button>

          <button
            onClick={() => setActiveSubTab('clients')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center ${
              activeSubTab === 'clients'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Client Referral Directory ({clients.length})
          </button>

          <button
            onClick={() => setActiveSubTab('templates')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center ${
              activeSubTab === 'templates'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            SMS & Invite Templates
          </button>
        </div>

        {activeSubTab === 'activity' && (
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses ({referrals.length})</option>
              <option value="pending">Pending 1st Clean ({pendingReferrals.length})</option>
              <option value="qualified">Qualified / Credit Earned ({qualifiedReferrals.length})</option>
              <option value="redeemed">Redeemed on Invoice ({redeemedReferrals.length})</option>
            </select>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: REFERRAL ACTIVITY & TRACKING */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          {filteredReferrals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Referrals Recorded Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Track friend referrals from your existing recurring clients. Log their details or share customized referral codes to start growing your client base.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Log First Referral
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredReferrals.map((ref) => {
                const isPending = ref.status === 'pending';
                const isQualified = ref.status === 'qualified';
                const isRedeemed = ref.status === 'redeemed';

                return (
                  <div
                    key={ref.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Lead & Referrer details */}
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 text-xs ${
                          isPending
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : isQualified
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isPending ? (
                          <Clock className="w-4 h-4 text-amber-700" />
                        ) : isQualified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-slate-900">{ref.refereeName}</h3>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-100 text-amber-900'
                                : isQualified
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {isPending
                              ? 'Pending 1st Clean'
                              : isQualified
                              ? 'Qualified • $25 Earned'
                              : 'Redeemed'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 flex-wrap gap-y-1">
                          <span>
                            Referred by:{' '}
                            <strong className="text-slate-800">{ref.referrerName}</strong>
                          </span>
                          <span>•</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">
                            Code: {ref.referrerCode}
                          </span>
                          {ref.refereePhone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center text-slate-700">
                                <Phone className="w-3 h-3 mr-1 text-slate-400" />
                                {ref.refereePhone}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>Logged: {ref.dateReferred}</span>
                        </div>

                        {ref.notes && (
                          <p className="text-xs text-slate-600 mt-1.5 italic bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                            "{ref.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Incentives & Action Buttons */}
                    <div className="flex items-center space-x-2 self-end md:self-auto flex-wrap gap-y-2">
                      <div className="text-right px-3 py-1 bg-slate-50 rounded-xl border border-slate-100 mr-1">
                        <span className="text-[10px] text-slate-500 block">Offer Breakdown</span>
                        <span className="text-xs font-bold text-emerald-700">
                          -${ref.refereeDiscount || 25} Off / +${ref.rewardAmount || 25} Reward
                        </span>
                      </div>

                      {/* Estimator action for pending referee */}
                      {onNavigateToEstimator && isPending && (
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateToEstimator({
                              name: ref.refereeName,
                              phone: ref.refereePhone,
                              referralCode: ref.referrerCode,
                            })
                          }
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                          title="Open in Estimator with discount"
                        >
                          <Calculator className="w-3.5 h-3.5 mr-1 text-slate-600" />
                          Quote with -$25
                        </button>
                      )}

                      {/* Status progression buttons */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleMarkQualified(ref)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition cursor-pointer"
                          title="Mark 1st clean completed and award $25 credit to referrer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Mark 1st Clean Completed
                        </button>
                      )}

                      {isQualified && (
                        <button
                          type="button"
                          onClick={() => handleMarkRedeemed(ref)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-lg text-xs font-bold flex items-center transition cursor-pointer"
                          title="Mark reward credit redeemed by referring client"
                        >
                          <DollarSign className="w-3.5 h-3.5 mr-1 text-teal-400" />
                          Mark Credit Redeemed
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteReferral(ref.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Delete Referral Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CLIENT REFERRAL CODES & BALANCES DIRECTORY */}
      {activeSubTab === 'clients' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Client Referral Directory</h2>
              <p className="text-xs text-slate-500">
                Personalized referral codes and active credit balances for all active clients.
              </p>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Total Client Credit Reserve:{' '}
              <strong className="text-emerald-700 font-bold">${totalClientCreditsAvailable}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Phone & Area</th>
                  <th className="py-2.5 px-3">Personal Referral Code</th>
                  <th className="py-2.5 px-3 text-center">Referrals Made</th>
                  <th className="py-2.5 px-3 text-right">Available Reward Credit</th>
                  <th className="py-2.5 px-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientsWithCodes.map((c) => {
                  const code = c.referralCode || generateReferralCode(c.name, c.phone);
                  const credit = c.referralCreditBalance || 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        <span className="text-[11px] text-slate-400 capitalize">{c.preferredFrequency} • ${c.agreedRate} flat</span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div>{c.phone}</div>
                        <div className="text-[11px] text-slate-400">{c.city}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="inline-flex items-center space-x-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          <span className="font-mono font-bold text-slate-800">{code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(code, c.id)}
                            className="text-slate-500 hover:text-slate-900 p-0.5 cursor-pointer"
                            title="Copy code"
                          >
                            {copiedId === c.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900">{c.referralsCount}</span>
                        {c.qualifiedCount > 0 && (
                          <span className="text-[10px] text-emerald-600 block font-medium">
                            {c.qualifiedCount} completed
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {credit > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                            ${credit} Credit
                          </span>
                        ) : (
                          <span className="text-slate-400">$0.00</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShareClient(c);
                              setIsShareModalOpen(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center transition cursor-pointer"
                            title="Generate SMS text for this client"
                          >
                            <Share2 className="w-3 h-3 mr-1" />
                            Share SMS
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const extra = window.prompt(`Adjust credit balance for ${c.name} ($):`, String(credit + 25));
                              if (extra !== null && !isNaN(Number(extra))) {
                                onUpdateClient({
                                  ...c,
                                  referralCreditBalance: Math.max(0, Number(extra)),
                                });
                              }
                            }}
                            className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-medium rounded hover:bg-slate-100 cursor-pointer"
                          >
                            Adjust Credit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SMS & INVITE TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Template 1: Client sharing with friend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Template A: Client-to-Friend Referral SMS
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Send this to a happy client so they can easily forward it to their neighbors or friends.
              </p>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 font-mono leading-relaxed select-all">
                "Hey! I've been using Clean Convictions for our home cleaning here in Yuma and they do an awesome job. Use my link for $25 OFF your first clean: cleanconvictions.com/book?rc=[CODE] — or text (928) 555-0100."
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Includes $25 discount callout</span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    "Hey! I've been using Clean Convictions for our home cleaning here in Yuma and they do an awesome job. Use my link for $25 OFF your first clean: cleanconvictions.com/book?rc=[CODE] — or text (928) 555-0100.",
                    't1'
                  )
                }
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center transition cursor-pointer"
              >
                {copiedId === 't1' ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Template
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Template 2: Solo cleaner announcing referral program to client */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1.5 text-teal-600" />
                  Template B: Cleaner Inviting Client to Program
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  Post-Clean Text
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Send after a successful recurring cleaning to invite them to earn credits for future cleans.
              </p>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 font-mono leading-relaxed select-all">
                "Hi [Client Name]! Thank you for trusting Clean Convictions with your home today. Just a quick note: we now have a Give $25, Get $25 referral program! Share your personal code [CODE] with any friend in Yuma—they get $25 off their first service, and you receive a $25 credit on your next cleaning invoice. Thank you for supporting solo local business!"
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Builds client loyalty</span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'Hi [Client Name]! Thank you for trusting Clean Convictions with your home today. Just a quick note: we now have a Give $25, Get $25 referral program! Share your personal code [CODE] with any friend in Yuma—they get $25 off their first service, and you receive a $25 credit on your next cleaning invoice. Thank you for supporting solo local business!',
                    't2'
                  )
                }
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center transition cursor-pointer"
              >
                {copiedId === 't2' ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: LOG NEW REFERRAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log New Referral Lead</h3>
                  <p className="text-[11px] text-slate-500">
                    Record a referred friend or new customer inquiry.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateReferralSubmit} className="p-5 space-y-4">
              {/* Referrer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Referring Existing Client *
                </label>
                {clients.length > 0 ? (
                  <select
                    value={selectedReferrerId}
                    onChange={(e) => setSelectedReferrerId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 font-medium"
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.referralCode || generateReferralCode(c.name, c.phone)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                    No clients created yet. Please add a client first so they can be credited as the referrer.
                  </p>
                )}
              </div>

              {/* Referee Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Referred Friend Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jessica Miller"
                    value={refereeName}
                    onChange={(e) => setRefereeName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. (928) 555-0145"
                    value={refereePhone}
                    onChange={(e) => setRefereePhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. jessica@example.com"
                  value={refereeEmail}
                  onChange={(e) => setRefereeEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                />
              </div>

              {/* Reward values */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    1st Clean Discount ($)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={customDiscountAmount}
                    onChange={(e) => setCustomDiscountAmount(Number(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Referrer Reward Credit ($)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={customRewardAmount}
                    onChange={(e) => setCustomRewardAmount(Number(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Address or Service Interests
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Neighbor in Foothills, interested in bi-weekly deep clean"
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition cursor-pointer flex items-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Save Referral Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATE SHARE LINK & SMS */}
      {isShareModalOpen && shareClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Personalized Share Message</h3>
                  <p className="text-[11px] text-slate-500">
                    Ready-to-send text for {shareClient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Client
                </label>
                <select
                  value={shareClient.id}
                  onChange={(e) => {
                    const found = clients.find((c) => c.id === e.target.value);
                    if (found) setShareClient(found);
                  }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 font-medium"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.referralCode || generateReferralCode(c.name, c.phone)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Referral code card */}
              <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 block">
                    Assigned Referral Code
                  </span>
                  <span className="text-base font-mono font-extrabold text-emerald-950">
                    {shareClient.referralCode || generateReferralCode(shareClient.name, shareClient.phone)}
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-emerald-700 font-medium block">Benefit to friend:</span>
                  <span className="font-bold text-emerald-900">-$25 First Clean</span>
                </div>
              </div>

              {/* Text Message Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Formatted SMS Text
                </label>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans">
                  {getSmsText(
                    shareClient.name,
                    shareClient.referralCode || generateReferralCode(shareClient.name, shareClient.phone)
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`sms:?&body=${encodeURIComponent(
                    getSmsText(
                      shareClient.name,
                      shareClient.referralCode || generateReferralCode(shareClient.name, shareClient.phone)
                    )
                  )}`}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Launch Messages App
                </a>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      getSmsText(
                        shareClient.name,
                        shareClient.referralCode || generateReferralCode(shareClient.name, shareClient.phone)
                      ),
                      'share-modal'
                    )
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center shadow-xs transition cursor-pointer"
                >
                  {copiedId === 'share-modal' ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Message Text
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
