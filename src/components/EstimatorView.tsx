import React, { useState, useMemo } from 'react';
import {
  CleaningProgram,
  HomeCondition,
  CleaningFrequency,
  PricingSettings,
  EstimatorInput,
  Client,
  QuoteBreakdown,
  Partner,
} from '../types';
import { calculateEstimate, generateClientTextQuote } from '../utils/pricingEngine';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  DollarSign,
  Copy,
  Check,
  Calendar,
  CalendarPlus,
  UserPlus,
  Home,
  CheckCircle2,
  Info,
  ChevronRight,
  RotateCcw,
  Receipt,
  Gift,
  Handshake,
} from 'lucide-react';

interface EstimatorViewProps {
  settings: PricingSettings;
  clients: Client[];
  partners?: Partner[];
  onBookJob: (input: EstimatorInput, clientInfo: { name: string; phone: string; address: string; date: string; timeSlot: string }) => void;
  onSaveClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onCreateInvoiceFromQuote?: (quote: QuoteBreakdown, input: EstimatorInput, clientInfo: { name: string; phone: string; email?: string; address: string; date: string }) => void;
  initialInput?: Partial<EstimatorInput>;
}

export const EstimatorView: React.FC<EstimatorViewProps> = ({
  settings,
  clients,
  partners = [],
  onBookJob,
  onSaveClient,
  onCreateInvoiceFromQuote,
  initialInput,
}) => {
  // Estimator state
  const [program, setProgram] = useState<CleaningProgram>(initialInput?.program || 'regular');
  const [sqft, setSqft] = useState<number>(initialInput?.sqft || 1850);
  const [bedrooms, setBedrooms] = useState<number>(initialInput?.bedrooms || 3);
  const [bathrooms, setBathrooms] = useState<number>(initialInput?.bathrooms || 2);
  const [condition, setCondition] = useState<HomeCondition>(initialInput?.condition || 'standard');
  const [frequency, setFrequency] = useState<CleaningFrequency>(initialInput?.frequency || 'bi-weekly');
  const [isMilitary, setIsMilitary] = useState<boolean>(initialInput?.isMilitaryOrVeteran || false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initialInput?.selectedAddOns || ['pet_safe']);
  
  // Date and Time of Cleaning state
  const [cleaningDate, setCleaningDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [cleaningTimePreset, setCleaningTimePreset] = useState<string>('morning');
  const [cleaningCustomTime, setCleaningCustomTime] = useState<string>('');

  // Referral code state
  const [referralCodeInput, setReferralCodeInput] = useState<string>(initialInput?.referralCode || '');
  const [appliedReferralCode, setAppliedReferralCode] = useState<string>(initialInput?.referralCode || '');
  const [referralFeedback, setReferralFeedback] = useState<{ valid: boolean; message: string; referrerName?: string } | null>(null);
  const [matchedPartnerId, setMatchedPartnerId] = useState<string>('');

  const getEffectiveCleaningTime = () => {
    if (cleaningTimePreset === 'morning') return '8:00 AM - 11:30 AM (Morning)';
    if (cleaningTimePreset === 'midday') return '12:00 PM - 3:30 PM (Midday)';
    if (cleaningTimePreset === 'afternoon') return '4:00 PM - 7:00 PM (Afternoon)';
    return cleaningCustomTime.trim() || '8:00 AM - 11:30 AM (Morning)';
  };

  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('8:00 AM - 11:30 AM (Morning)');
  const [bookingCustomTime, setBookingCustomTime] = useState('');
  const [selectedExistingClient, setSelectedExistingClient] = useState<string>('');

  const estimatorInput: EstimatorInput = useMemo(() => ({
    program,
    sqft,
    bedrooms,
    bathrooms,
    condition,
    frequency,
    isMilitaryOrVeteran: isMilitary,
    selectedAddOns,
    referralCode: appliedReferralCode || undefined,
    referralDiscount: appliedReferralCode ? (settings.referralDiscountAmount || 25) : 0,
  }), [program, sqft, bedrooms, bathrooms, condition, frequency, isMilitary, selectedAddOns, appliedReferralCode, settings.referralDiscountAmount]);

  const quote = useMemo(() => {
    return calculateEstimate(estimatorInput, settings);
  }, [estimatorInput, settings]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyTextQuote = () => {
    const text = generateClientTextQuote(
      clientName,
      quote,
      estimatorInput,
      cleaningDate,
      getEffectiveCleaningTime()
    );
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSelectPresetSqft = (presetSqft: number, beds: number, baths: number) => {
    setSqft(presetSqft);
    setBedrooms(beds);
    setBathrooms(baths);
  };

  const handleReset = () => {
    setProgram('regular');
    setSqft(1850);
    setBedrooms(3);
    setBathrooms(2);
    setCondition('standard');
    setFrequency('bi-weekly');
    setIsMilitary(false);
    setSelectedAddOns([]);
    setCleaningDate(new Date().toISOString().split('T')[0]);
    setCleaningTimePreset('morning');
    setCleaningCustomTime('');
    setClientName('');
    setAppliedReferralCode('');
    setReferralCodeInput('');
    setReferralFeedback(null);
    setMatchedPartnerId('');
  };

  const handleOpenBooking = () => {
    setBookingDate(cleaningDate);
    const effTime = getEffectiveCleaningTime();
    setBookingTime(effTime);
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = () => {
    let name = clientName || 'New Client';
    let phone = clientPhone || '';
    let addr = clientAddress || 'Yuma, AZ';

    if (selectedExistingClient) {
      const found = clients.find((c) => c.id === selectedExistingClient);
      if (found) {
        name = found.name;
        phone = found.phone;
        addr = found.address;
      }
    }

    const effectiveTime = bookingTime === 'Custom Time'
      ? (bookingCustomTime.trim() || 'Custom Time')
      : bookingTime;

    onBookJob(estimatorInput, {
      name,
      phone,
      address: addr,
      date: bookingDate,
      timeSlot: effectiveTime,
    });
    setIsBookingModalOpen(false);
  };

  const handleSaveAsClientAction = () => {
    const matchedPartner = matchedPartnerId ? partners.find((p) => p.id === matchedPartnerId) : undefined;
    onSaveClient({
      name: clientName || 'New Client',
      phone: clientPhone || '(928) 555-0100',
      email: '',
      address: clientAddress || 'Yuma, AZ',
      city: 'Yuma',
      preferredFrequency: frequency,
      defaultProgram: program,
      sqft,
      bedrooms,
      bathrooms,
      condition,
      isMilitary,
      defaultAddOns: selectedAddOns,
      agreedRate: quote.finalPrice,
      status: 'active',
      specialInstructions: 'Created from Clean Convictions Estimator.',
      leadSource: matchedPartner ? matchedPartner.businessName : undefined,
      partnerId: matchedPartner ? matchedPartner.id : undefined,
    });
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Banner introducing the Clean Convictions flat-rate logic */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Official cleanconvictions.com Estimator Logic
              </span>
              <span className="text-xs text-slate-400">Yuma, AZ Flat Rates</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Instant Flat-Rate Estimator & Fast Quote Generator
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Calculate exact customer estimates, copy ready-to-send text quotes, check solo cleaner labor hours, and book directly onto your schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Estimator Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: Cleaning Program Selection */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Select Cleaning Program
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'regular', name: 'Regular Clean', desc: 'Maintenance & upkeep', base: '$89-$129' },
                { id: 'deep', name: 'Deep Clean', desc: 'Grout, baseboards, buildup', base: 'From $179' },
                { id: 'move', name: 'Move In/Out', desc: 'Empty home & inside detail', base: 'From $199' },
                { id: 'office', name: 'Office Clean', desc: 'Workspaces & commercial', base: 'From $110' },
              ].map((item) => (
                <button
                  key={item.id}
                  id={`program-${item.id}`}
                  onClick={() => setProgram(item.id as CleaningProgram)}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    program === item.id
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      {item.base}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1.5">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
                  </div>
                  {program === item.id && (
                    <div className="mt-2 flex items-center text-emerald-600 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5 mr-1" /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Home Size & Configuration */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Home Size & Rooms
              </label>
              <span className="text-xs text-slate-400">Base rate covers up to 1,500 sq ft</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[
                { label: 'Apt (900 sqft • 1b/1b)', sqft: 900, beds: 1, baths: 1 },
                { label: 'Condo (1,400 sqft • 2b/2b)', sqft: 1400, beds: 2, baths: 2 },
                { label: 'Ranch (1,850 sqft • 3b/2b)', sqft: 1850, beds: 3, baths: 2 },
                { label: 'Large (2,600 sqft • 4b/2.5b)', sqft: 2600, beds: 4, baths: 2.5 },
                { label: 'Estate (3,500 sqft • 4b/3.5b)', sqft: 3500, beds: 4, baths: 3.5 },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPresetSqft(preset.sqft, preset.beds, preset.baths)}
                  className="px-2.5 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Square footage slider + number input */}
            <div className="mb-5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700">Approximate Square Footage:</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="400"
                    max="6000"
                    step="50"
                    value={sqft}
                    onChange={(e) => setSqft(Math.max(400, parseInt(e.target.value) || 500))}
                    className="w-24 text-right font-bold text-slate-900 px-2 py-1 bg-white border border-slate-300 rounded text-sm focus:outline-emerald-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">sq ft</span>
                </div>
              </div>
              <input
                type="range"
                min="500"
                max="4500"
                step="50"
                value={sqft}
                onChange={(e) => setSqft(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>500 sq ft</span>
                <span>1,500 sq ft (Standard Base)</span>
                <span>3,000 sq ft</span>
                <span>4,500+ sq ft</span>
              </div>
            </div>

            {/* Bedrooms & Bathrooms Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-600 block mb-2">Bedrooms:</span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setBedrooms((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-slate-900">{bedrooms} {bedrooms === 1 ? 'Bed' : 'Beds'}</span>
                  <button
                    onClick={() => setBedrooms((prev) => Math.min(8, prev + 1))}
                    className="w-8 h-8 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-600 block mb-2">Bathrooms:</span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setBathrooms((prev) => Math.max(1, prev - 0.5))}
                    className="w-8 h-8 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-slate-900">{bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}</span>
                  <button
                    onClick={() => setBathrooms((prev) => Math.min(6, prev + 0.5))}
                    className="w-8 h-8 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Home Condition & Frequency */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              3. Home Condition & Cleaning Frequency
            </label>

            <div className="mb-4">
              <span className="text-xs font-semibold text-slate-600 block mb-2">
                Current Home Condition:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'standard', name: 'Clean Standard', desc: 'Regular upkeep, light dusting', tag: '+0%' },
                  { id: 'normal', name: 'Normal Wear', desc: 'Average daily living grime', tag: '+15%' },
                  { id: 'heavy', name: 'Needs Work', desc: 'Heavy soap scum, grease, pet hair', tag: '+30%' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCondition(item.id as HomeCondition)}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      condition === item.id
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-sm">{item.name}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        item.id === 'standard' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-2">
                Service Frequency & Loyalty Discount:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'weekly', name: 'Weekly', discount: 'Save 20%' },
                  { id: 'bi-weekly', name: 'Every Other Week', discount: 'Save 15%' },
                  { id: 'monthly', name: 'Monthly', discount: 'Save 10%' },
                  { id: 'one-time', name: 'One-Time', discount: 'Standard' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFrequency(item.id as CleaningFrequency)}
                    className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                      frequency === item.id
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-900">{item.name}</span>
                    <span className="text-[11px] font-medium text-emerald-700">{item.discount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Military discount checkbox */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center cursor-pointer select-none space-x-2">
                <input
                  type="checkbox"
                  checked={isMilitary}
                  onChange={(e) => setIsMilitary(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Military / Veteran Community Discount
                </span>
              </label>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                -10% Off
              </span>
            </div>
          </div>

          {/* Step 4: Add-Ons Selection (cleanconvictions.com catalog) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Clean Convictions Special Requests & Add-Ons
              </label>
              <span className="text-xs text-emerald-600 font-medium">
                {selectedAddOns.length} selected (+${quote.addOnsTotal})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {settings.addOns.map((addon) => {
                const isChecked = selectedAddOns.includes(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddOn(addon.id)}
                    className={`p-3 rounded-lg border flex items-start justify-between cursor-pointer transition ${
                      isChecked
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">{addon.name}</span>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{addon.description}</p>
                        {addon.estimatedMinutes > 0 && (
                          <span className="inline-block text-[10px] text-slate-400 mt-1">
                            +{addon.estimatedMinutes} mins
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                      +${addon.price}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 7: Date & Time of Cleaning */}
          <div id="section-cleaning-date-time" className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                7. Date & Time of Cleaning
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center">
                <Clock className="w-3 h-3 mr-1 text-emerald-600" />
                Service Schedule
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Service Date Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Cleaning Date:
                </label>
                <input
                  id="estimator-cleaning-date"
                  type="date"
                  value={cleaningDate}
                  onChange={(e) => setCleaningDate(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-500 font-semibold text-slate-900"
                />

                {/* Quick Date Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCleaningDate(new Date().toISOString().split('T')[0])}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setCleaningDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      setCleaningDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setCleaningDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    +1 Week
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 font-medium pt-1">
                  {new Date(cleaningDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Arrival Window / Time Slot */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Time / Arrival Window:
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'morning', label: '8:00 AM - 11:30 AM', sub: 'Morning Solo Slot' },
                    { id: 'midday', label: '12:00 PM - 3:30 PM', sub: 'Midday Slot' },
                    { id: 'afternoon', label: '4:00 PM - 7:00 PM', sub: 'Afternoon / Twilight' },
                    { id: 'custom', label: 'Custom Time...', sub: 'Specific window' },
                  ].map((slot) => (
                    <label
                      key={slot.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                        cleaningTimePreset === slot.id
                          ? 'border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="cleaningTimePreset"
                          value={slot.id}
                          checked={cleaningTimePreset === slot.id}
                          onChange={() => setCleaningTimePreset(slot.id)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{slot.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{slot.sub}</span>
                    </label>
                  ))}

                  {cleaningTimePreset === 'custom' && (
                    <input
                      type="text"
                      placeholder="e.g. 9:00 AM - 12:30 PM"
                      value={cleaningCustomTime}
                      onChange={(e) => setCleaningCustomTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500 mt-1"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 8: Referral Code & Friend Discount */}
          <div id="section-referral-code" className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                8. Referral Promo / Friend Discount
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center">
                <Gift className="w-3 h-3 mr-1 text-emerald-600" />
                Give $25, Get $25
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Did an existing Clean Convictions client refer this customer? Enter their personal referral code to apply a <strong>${settings.referralDiscountAmount || 25} discount</strong> to this estimate.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. CC-MARIA-0142"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-500 uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const cleanCode = referralCodeInput.trim().toUpperCase();
                    if (!cleanCode) {
                      setReferralFeedback({ valid: false, message: 'Please enter a referral code.' });
                      return;
                    }
                    const matchedPartner = partners.find(
                      (p) => p.referralCode && p.referralCode.toUpperCase() === cleanCode
                    );
                    const matchedClient = !matchedPartner
                      ? clients.find(
                          (c) =>
                            (c.referralCode && c.referralCode.toUpperCase() === cleanCode) ||
                            cleanCode.includes(c.name.split(' ')[0].toUpperCase())
                        )
                      : undefined;
                    setAppliedReferralCode(cleanCode);
                    setMatchedPartnerId(matchedPartner?.id || '');
                    setReferralFeedback({
                      valid: true,
                      message: matchedPartner
                        ? `Partner code! Referred by ${matchedPartner.businessName}. $${settings.referralDiscountAmount || 25} applied — this client will be linked to that partner.`
                        : matchedClient
                        ? `Valid code! Referred by ${matchedClient.name}. $${settings.referralDiscountAmount || 25} applied.`
                        : `Referral code "${cleanCode}" applied! $${settings.referralDiscountAmount || 25} off first clean.`,
                      referrerName: matchedPartner?.businessName || matchedClient?.name,
                    });
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Apply Code
                </button>

                {appliedReferralCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedReferralCode('');
                      setReferralCodeInput('');
                      setReferralFeedback(null);
                      setMatchedPartnerId('');
                    }}
                    className="px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Quick Referrer Pickers for convenience */}
            {clients.length > 0 && !appliedReferralCode && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 block mb-1.5">
                  Or select referring client from your directory:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {clients.slice(0, 4).map((c) => {
                    const code = c.referralCode || `CC-${c.name.split(' ')[0].toUpperCase()}`;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setReferralCodeInput(code);
                          setAppliedReferralCode(code);
                          setReferralFeedback({
                            valid: true,
                            message: `Referred by ${c.name}. $${settings.referralDiscountAmount || 25} applied.`,
                            referrerName: c.name,
                          });
                        }}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 px-2 py-1 rounded-md transition cursor-pointer flex items-center"
                      >
                        <Gift className="w-3 h-3 mr-1 text-emerald-600" />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Partner Code Pickers — property managers / RV parks with an active code */}
            {partners.filter((p) => p.referralCode).length > 0 && !appliedReferralCode && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 block mb-1.5">
                  Or select a partner (property manager / RV park) code:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {partners.filter((p) => p.referralCode).slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const code = p.referralCode!;
                        setReferralCodeInput(code);
                        setAppliedReferralCode(code);
                        setMatchedPartnerId(p.id);
                        setReferralFeedback({
                          valid: true,
                          message: `Partner code! Referred by ${p.businessName}. $${settings.referralDiscountAmount || 25} applied — this client will be linked to that partner.`,
                          referrerName: p.businessName,
                        });
                      }}
                      className="text-[11px] font-medium bg-slate-100 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200 border border-slate-200 px-2 py-1 rounded-md transition cursor-pointer flex items-center"
                    >
                      <Handshake className="w-3 h-3 mr-1 text-rose-500" />
                      {p.businessName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Message */}
            {referralFeedback && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  referralFeedback.valid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  {referralFeedback.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span>{referralFeedback.message}</span>
                </div>
                {referralFeedback.valid && (
                  <span className="text-[10px] uppercase font-bold bg-emerald-200/60 px-2 py-0.5 rounded">
                    -${settings.referralDiscountAmount || 25} Off
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Estimate & Business Calculation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 shadow-md p-6 sticky top-24">
            
            {/* Guarantee Tag */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Clean Convictions Guaranteed</span>
              </div>
              <span className="text-[11px] text-slate-500">Live Flat-Rate</span>
            </div>

            {/* Price Header */}
            <div className="py-5 text-center bg-gradient-to-b from-emerald-50/50 to-white rounded-xl my-4 border border-emerald-100">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Estimated Flat Rate
              </span>
              <div className="flex items-center justify-center mt-1">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">
                  ${quote.finalPrice}
                </span>
                <span className="text-xs text-slate-500 ml-2 self-end mb-2">
                  {frequency === 'one-time' ? '/ visit' : `/${frequency === 'weekly' ? 'wk' : frequency === 'bi-weekly' ? '2-wks' : 'mo'}`}
                </span>
              </div>

              {quote.totalDiscount > 0 && (
                <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Total Savings: ${quote.totalDiscount} off standard
                </div>
              )}
            </div>

            {/* Solo Cleaner Efficiency & Labor Metrics */}
            <div className="bg-slate-900 text-white rounded-xl p-4 mb-5 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                  Estimated Solo Time:
                </span>
                <span className="font-bold text-white">{quote.suggestedCrewHoursText}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                  With Helper (2-Person):
                </span>
                <span className="font-bold text-white">{quote.twoPersonCrewText}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center">
                  <DollarSign className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Solo Effective Yield:
                </span>
                <span className="font-bold text-emerald-400">
                  ~${quote.effectiveHourlyRate}/hour
                </span>
              </div>
            </div>

            {/* Itemized Calculation Breakdown */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-4 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Base ({quote.program.toUpperCase()} clean):</span>
                <span className="font-medium text-slate-900">${quote.basePrice}</span>
              </div>

              {quote.sqftPrice !== 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Square Footage ({sqft.toLocaleString()} sq ft):</span>
                  <span className="font-medium text-slate-900">
                    {quote.sqftPrice > 0 ? `+$${quote.sqftPrice}` : `-$${Math.abs(quote.sqftPrice)}`}
                  </span>
                </div>
              )}

              {quote.bedBathPrice > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Bedrooms & Bathrooms adjustment:</span>
                  <span className="font-medium text-slate-900">+${quote.bedBathPrice}</span>
                </div>
              )}

              {quote.conditionSurcharge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Condition ({quote.conditionLabel}):</span>
                  <span className="font-medium text-slate-900">+${quote.conditionSurcharge}</span>
                </div>
              )}

              {quote.addOnsTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Add-Ons ({quote.addOnsList.length} items):</span>
                  <span className="font-medium text-slate-900">+${quote.addOnsTotal}</span>
                </div>
              )}

              {quote.frequencyDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Frequency Discount ({frequency}):</span>
                  <span>-${quote.frequencyDiscountAmount}</span>
                </div>
              )}

              {quote.militaryDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Military/Veteran Discount (10%):</span>
                  <span>-${quote.militaryDiscountAmount}</span>
                </div>
              )}

              {quote.referralDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <span className="flex items-center">
                    <Gift className="w-3.5 h-3.5 mr-1" />
                    Friend Referral Promo ({quote.referralCode || 'Applied'}):
                  </span>
                  <span>-${quote.referralDiscountAmount}</span>
                </div>
              )}
            </div>

            {/* Cleaning Schedule & Client Details for Fast Quoting / Booking */}
            <div className="mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Cleaning Date & Time:
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Editable anytime
                </span>
              </div>

              {/* Date Input with Quick Jump */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={cleaningDate}
                    onChange={(e) => setCleaningDate(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500 font-medium text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setCleaningDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1.5 text-[11px] font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition whitespace-nowrap"
                  >
                    Tomorrow
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {new Date(cleaningDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Arrival Window Dropdown */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Time Slot / Window:
                </label>
                <select
                  value={cleaningTimePreset}
                  onChange={(e) => setCleaningTimePreset(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500 text-slate-800 font-medium"
                >
                  <option value="morning">8:00 AM - 11:30 AM (Morning)</option>
                  <option value="midday">12:00 PM - 3:30 PM (Midday)</option>
                  <option value="afternoon">4:00 PM - 7:00 PM (Afternoon)</option>
                  <option value="custom">Custom Time...</option>
                </select>
                {cleaningTimePreset === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. 9:30 AM - 1:00 PM"
                    value={cleaningCustomTime}
                    onChange={(e) => setCleaningCustomTime(e.target.value)}
                    className="mt-1.5 w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500"
                  />
                )}
              </div>

              {/* Client Details */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Recipient & Address:
                  </span>
                  {clients.length > 0 && (
                    <select
                      value={selectedExistingClient}
                      onChange={(e) => {
                        setSelectedExistingClient(e.target.value);
                        const found = clients.find((c) => c.id === e.target.value);
                        if (found) {
                          setClientName(found.name);
                          setClientPhone(found.phone);
                          setClientAddress(found.address);
                        }
                      }}
                      className="text-[10px] bg-transparent border-none text-emerald-700 font-semibold cursor-pointer focus:outline-none max-w-[130px] truncate"
                    >
                      <option value="">+ Existing Client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Client Name (e.g. Sarah Jenkins)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500"
                />
                <input
                  type="tel"
                  placeholder="Phone (e.g. 928-555-0142)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Address / Neighborhood in Yuma"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                id="btn-copy-sms"
                onClick={handleCopyTextQuote}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center transition shadow cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-emerald-400" />
                    Copied SMS Quote with Date & Time!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2 text-teal-400" />
                    Copy Formatted SMS Quote
                  </>
                )}
              </button>

              <button
                id="btn-book-schedule"
                onClick={handleOpenBooking}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center transition shadow cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Schedule on Route Calendar
              </button>

              <button
                id="btn-save-crm"
                onClick={handleSaveAsClientAction}
                className="w-full py-2 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-xs flex items-center justify-center transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4 mr-2 text-slate-500" />
                Save to Client Directory (CRM)
              </button>

              {onCreateInvoiceFromQuote && (
                <button
                  id="btn-generate-quote-invoice"
                  onClick={() => {
                    onCreateInvoiceFromQuote(quote, estimatorInput, {
                      name: clientName || 'New Client',
                      phone: clientPhone || '(928) 555-0100',
                      email: '',
                      address: clientAddress || 'Yuma, AZ',
                      date: cleaningDate || new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-semibold text-xs flex items-center justify-center transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4 mr-2 text-emerald-700" />
                  Feed into Invoicing System
                </button>
              )}
            </div>

            {/* Clean Convictions re-clean guarantee note */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-start space-x-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <strong>24-Hour Free Re-Clean:</strong> Clean Convictions honors all flat estimates. Any reported spot within 24 hours is promptly re-cleaned at no charge.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Add Clean to Schedule
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Booking {program.toUpperCase()} Clean • ${quote.finalPrice} flat-rate
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Existing Client (Optional):
                </label>
                <select
                  value={selectedExistingClient}
                  onChange={(e) => {
                    setSelectedExistingClient(e.target.value);
                    const found = clients.find((c) => c.id === e.target.value);
                    if (found) {
                      setClientName(found.name);
                      setClientPhone(found.phone);
                      setClientAddress(found.address);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="">-- Or enter new client below --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name:</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Address:</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="e.g. 1420 E 24th St, Yuma, AZ"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Cleaning Date:
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Time Slot:
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="8:00 AM - 11:30 AM (Morning)">8:00 AM - 11:30 AM (Morning)</option>
                    <option value="12:00 PM - 3:30 PM (Midday)">12:00 PM - 3:30 PM (Midday)</option>
                    <option value="4:00 PM - 7:00 PM (Afternoon)">4:00 PM - 7:00 PM (Afternoon)</option>
                    <option value="Custom Time">Custom Time</option>
                  </select>
                </div>
              </div>

              {bookingTime === 'Custom Time' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Arrival Window:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9:00 AM - 12:30 PM"
                    value={bookingCustomTime}
                    onChange={(e) => setBookingCustomTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow cursor-pointer"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
