import React, { useState } from 'react';
import { PricingSettings, CleaningProgram, HomeCondition, CleaningFrequency } from '../types';
import { DEFAULT_PRICING_SETTINGS } from '../utils/pricingEngine';
import {
  Settings,
  Save,
  RotateCcw,
  Sliders,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface SettingsViewProps {
  settings: PricingSettings;
  onSaveSettings: (newSettings: PricingSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formSettings, setFormSettings] = useState<PricingSettings>(settings);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleBasePriceChange = (prog: CleaningProgram, val: number) => {
    setFormSettings((prev) => ({
      ...prev,
      basePrices: {
        ...prev.basePrices,
        [prog]: val,
      },
    }));
  };

  const handleAddOnPriceChange = (id: string, newPrice: number) => {
    setFormSettings((prev) => ({
      ...prev,
      addOns: prev.addOns.map((a) => (a.id === id ? { ...a, price: newPrice } : a)),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formSettings);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleResetDefaults = () => {
    setFormSettings(DEFAULT_PRICING_SETTINGS);
    onSaveSettings(DEFAULT_PRICING_SETTINGS);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Pricing Engine Configuration
            </span>
            <span className="text-xs text-slate-400">cleanconvictions.com Formula</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Custom Pricing & Add-On Rates
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tune your baseline figures, room surcharges, condition wear tiers, and add-on services.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Changes
          </button>
        </div>
      </div>

      {savedFeedback && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
          Pricing rules successfully updated and synchronized across all estimators and quotes!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Base Program Prices */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            1. Base Service Starting Rates (1,500 sq ft standard)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Regular Clean ($)
              </label>
              <input
                type="number"
                value={formSettings.basePrices.regular}
                onChange={(e) =>
                  handleBasePriceChange('regular', parseFloat(e.target.value) || 0)
                }
                className="w-full text-xs font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">cleanconvictions: $129</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deep Clean ($)
              </label>
              <input
                type="number"
                value={formSettings.basePrices.deep}
                onChange={(e) =>
                  handleBasePriceChange('deep', parseFloat(e.target.value) || 0)
                }
                className="w-full text-xs font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">cleanconvictions: $179</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Move In / Out ($)
              </label>
              <input
                type="number"
                value={formSettings.basePrices.move}
                onChange={(e) =>
                  handleBasePriceChange('move', parseFloat(e.target.value) || 0)
                }
                className="w-full text-xs font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">cleanconvictions: $199</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Office / Commercial ($)
              </label>
              <input
                type="number"
                value={formSettings.basePrices.office}
                onChange={(e) =>
                  handleBasePriceChange('office', parseFloat(e.target.value) || 0)
                }
                className="w-full text-xs font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">cleanconvictions: $110</span>
            </div>
          </div>
        </div>

        {/* Room & Square Footage Multipliers */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            2. Room & Square Footage Surcharges
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Additional Bathroom Surcharge ($ beyond 1st):
              </label>
              <input
                type="number"
                value={formSettings.bathroomIncrement}
                onChange={(e) =>
                  setFormSettings((prev) => ({
                    ...prev,
                    bathroomIncrement: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">Default: +$15/bath</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Additional Bedroom Surcharge ($ beyond 1st):
              </label>
              <input
                type="number"
                value={formSettings.bedroomIncrement}
                onChange={(e) =>
                  setFormSettings((prev) => ({
                    ...prev,
                    bedroomIncrement: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">Default: +$10/bed</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Military / Veteran Discount Rate (%):
              </label>
              <input
                type="number"
                step="0.01"
                value={formSettings.militaryDiscountRate}
                onChange={(e) =>
                  setFormSettings((prev) => ({
                    ...prev,
                    militaryDiscountRate: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">Default: 0.10 (10%)</span>
            </div>
          </div>
        </div>

        {/* Condition Tiers & Frequency Discounts */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            3. Home Wear Tiers & Recurring Loyalty Discounts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Condition wear tiers */}
            <div className="space-y-3">
              <span className="font-bold text-slate-800 block">Condition Multipliers:</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Clean Standard:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">0%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Normal Wear:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">+15%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Needs Heavy Work:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">+30%</span>
              </div>
            </div>

            {/* Frequency discounts */}
            <div className="space-y-3">
              <span className="font-bold text-slate-800 block">Frequency Discounts:</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Weekly:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">-20%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Every Other Week (Bi-weekly):</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">-15%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Monthly:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">-10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Helper / Team defaults */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Helper Defaults (Team Hours)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Helper Name</label>
              <input
                type="text"
                value={formSettings.helperName || ''}
                onChange={(e) => setFormSettings((prev) => ({ ...prev, helperName: e.target.value }))}
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="e.g. Jordan"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Hourly Rate ($)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={formSettings.helperHourlyRate ?? ''}
                onChange={(e) =>
                  setFormSettings((prev) => ({ ...prev, helperHourlyRate: parseFloat(e.target.value) || 0 }))
                }
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="15"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Pre-fills the Team Hours form — you can override per entry.</p>

          <div className="mt-4">
            <label className="block font-semibold text-slate-700 mb-1 text-xs">
              Team Members (for assigning jobs)
            </label>
            <input
              type="text"
              value={(formSettings.teamMembers || []).join(', ')}
              onChange={(e) =>
                setFormSettings((prev) => ({
                  ...prev,
                  teamMembers: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="w-full text-xs font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="e.g. Riot, Jordan"
            />
            <p className="text-[10px] text-slate-400 mt-1">Comma-separated names. These show up as assignable options on Schedule.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mileage Rate ($/mile)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={formSettings.mileageRate ?? ''}
                onChange={(e) => setFormSettings((prev) => ({ ...prev, mileageRate: parseFloat(e.target.value) || 0 }))}
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="0.67"
              />
              <p className="text-[10px] text-slate-400 mt-1">Used by "Log Mileage" on the Expenses tab (2026 IRS standard rate default).</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Late Fee (%)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={formSettings.lateFeePercent ?? ''}
                onChange={(e) => setFormSettings((prev) => ({ ...prev, lateFeePercent: parseFloat(e.target.value) || 0 }))}
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="5"
              />
              <p className="text-[10px] text-slate-400 mt-1">Applied via the "+ Late Fee" button on overdue invoices.</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block font-semibold text-slate-700 mb-1 text-xs">
              Always-Include Checklist Items
            </label>
            <textarea
              rows={3}
              value={(formSettings.extraChecklistItems || []).join('\n')}
              onChange={(e) =>
                setFormSettings((prev) => ({
                  ...prev,
                  extraChecklistItems: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                }))
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              placeholder={'One item per line, e.g.\nTake before & after photos\nRestock guest bathroom soap'}
            />
            <p className="text-[10px] text-slate-400 mt-1">Added to every job's checklist automatically, one per line.</p>
          </div>
        </div>

        {/* Business Contact */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Business Contact (Google Voice & Zoho Mail)
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">
            Used to power one-click "Text via Google Voice" and "Email via Zoho" buttons in the Marketing Hub and elsewhere in the app.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Google Voice Number</label>
              <input
                type="text"
                value={formSettings.businessPhone || ''}
                onChange={(e) => setFormSettings((prev) => ({ ...prev, businessPhone: e.target.value }))}
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="(928) 555-0100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Zoho Business Email</label>
              <input
                type="email"
                value={formSettings.businessEmail || ''}
                onChange={(e) => setFormSettings((prev) => ({ ...prev, businessEmail: e.target.value }))}
                className="w-full font-bold text-slate-900 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="you@cleanconvictions.com"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Neither Google Voice nor Zoho Mail offers a way for an app to send on your behalf automatically — these links open your Google Voice texting app or Zoho Mail's compose window pre-filled, so sending is still one tap by you.
          </p>
        </div>

        {/* Marketing AI */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Marketing AI
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">
            Powers the Marketing tab's AI drafting. Deploy the Cloudflare Worker from the{' '}
            <code className="bg-slate-100 px-1 rounded">cloudflare-ai-worker</code> folder you were sent, then paste
            its details here.
          </p>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">AI Endpoint URL</label>
              <input
                type="text"
                value={formSettings.marketingAiEndpoint || ''}
                onChange={(e) => setFormSettings((prev) => ({ ...prev, marketingAiEndpoint: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                placeholder="https://casefiles-ai.your-subdomain.workers.dev"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shared Secret</label>
              <input
                type="password"
                value={formSettings.marketingAiSecret || ''}
                onChange={(e) => setFormSettings((prev) => ({ ...prev, marketingAiSecret: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                placeholder="The APP_SECRET value you set on the Worker"
              />
            </div>
          </div>
        </div>

        {/* Add-Ons Catalog Editor */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            4. Clean Convictions Add-On Services Catalog
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {formSettings.addOns.map((addon) => (
              <div
                key={addon.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 block">{addon.name}</span>
                  <span className="text-[11px] text-slate-400">{addon.description}</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0 ml-3">
                  <span className="text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    value={addon.price}
                    onChange={(e) =>
                      handleAddOnPriceChange(addon.id, parseFloat(e.target.value) || 0)
                    }
                    className="w-16 font-bold text-slate-900 px-2 py-1 border border-slate-300 rounded bg-white text-right"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
