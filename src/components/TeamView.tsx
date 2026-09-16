import React, { useState } from 'react';
import { HelperShift, JobAppointment, PricingSettings } from '../types';
import { Plus, Clock, DollarSign, Check, Trash2, X } from 'lucide-react';

interface TeamViewProps {
  helperShifts: HelperShift[];
  jobs: JobAppointment[];
  settings: PricingSettings;
  onAddShift: (data: Omit<HelperShift, 'id' | 'payAmount'>) => void;
  onMarkShiftPaid: (id: string) => void;
  onDeleteShift: (id: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  helperShifts,
  jobs,
  settings,
  onAddShift,
  onMarkShiftPaid,
  onDeleteShift,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formHelperName, setFormHelperName] = useState(settings.helperName || '');
  const [formHours, setFormHours] = useState<number>(0);
  const [formRate, setFormRate] = useState<number>(settings.helperHourlyRate || 15);
  const [formJobId, setFormJobId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const hoursThisMonth = helperShifts
    .filter((h) => h.date.startsWith(monthPrefix))
    .reduce((s, h) => s + h.hours, 0);
  const payThisMonth = helperShifts
    .filter((h) => h.date.startsWith(monthPrefix))
    .reduce((s, h) => s + h.payAmount, 0);
  const payOwed = helperShifts.filter((h) => !h.paid).reduce((s, h) => s + h.payAmount, 0);

  const sorted = [...helperShifts].sort((a, b) => b.date.localeCompare(a.date));

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormHelperName(settings.helperName || '');
    setFormHours(0);
    setFormRate(settings.helperHourlyRate || 15);
    setFormJobId('');
    setFormNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHelperName.trim() || formHours <= 0) return;
    onAddShift({
      date: formDate,
      helperName: formHelperName.trim(),
      hours: formHours,
      hourlyRate: formRate,
      jobId: formJobId || undefined,
      notes: formNotes.trim() || undefined,
      paid: false,
    });
    resetForm();
    setIsModalOpen(false);
  };

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Team Hours & Pay</h2>
          <p className="text-xs text-slate-500 mt-0.5">Log your helper's hours per job and keep track of what's owed.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Log Hours
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours This Month</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{hoursThisMonth.toFixed(1)}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pay This Month</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">${payThisMonth.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Owed (Unpaid)</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">${payOwed.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {sorted.length === 0 && (
          <p className="p-6 text-xs text-slate-400 text-center">No hours logged yet.</p>
        )}
        {sorted.map((shift) => {
          const job = shift.jobId ? jobs.find((j) => j.id === shift.jobId) : undefined;
          return (
            <div key={shift.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  {shift.helperName}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      shift.paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {shift.paid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {shift.date} • {shift.hours} hrs @ ${shift.hourlyRate}/hr
                  {job && <> • {job.clientName}</>}
                  {shift.notes && <> • {shift.notes}</>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold text-slate-900">${shift.payAmount.toLocaleString()}</span>
                {!shift.paid && (
                  <button
                    onClick={() => onMarkShiftPaid(shift.id)}
                    className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    aria-label="Mark paid"
                    title="Mark paid"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onDeleteShift(shift.id)}
                  className="text-slate-300 hover:text-rose-600 cursor-pointer"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Log Helper Hours</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Helper Name</label>
                <input
                  type="text"
                  value={formHelperName}
                  onChange={(e) => setFormHelperName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hours</label>
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={formHours || ''}
                    onChange={(e) => setFormHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate ($/hr)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={formRate || ''}
                    onChange={(e) => setFormRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job (optional)</label>
                  <select
                    value={formJobId}
                    onChange={(e) => setFormJobId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">—</option>
                    {jobs.slice(0, 50).map((j) => (
                      <option key={j.id} value={j.id}>{j.date} — {j.clientName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="text-[11px] text-slate-400">
                Pay: <span className="font-bold text-slate-700">${(formHours * formRate).toFixed(2)}</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Save Hours
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
