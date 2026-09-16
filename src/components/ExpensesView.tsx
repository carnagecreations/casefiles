import React, { useState } from 'react';
import { Expense, ExpenseCategory, Client, JobAppointment } from '../types';
import { Plus, DollarSign, Trash2, X, Fuel, Wrench, ShieldCheck, Megaphone, Package, Users, MoreHorizontal } from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  clients: Client[];
  jobs: JobAppointment[];
  onAddExpense: (data: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
  supplies: { label: 'Supplies', icon: <Package className="w-3.5 h-3.5" />, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  gas: { label: 'Gas / Mileage', icon: <Fuel className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  equipment: { label: 'Equipment', icon: <Wrench className="w-3.5 h-3.5" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  insurance: { label: 'Insurance', icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  marketing: { label: 'Marketing', icon: <Megaphone className="w-3.5 h-3.5" />, color: 'bg-pink-50 text-pink-700 border-pink-200' },
  helper_pay: { label: 'Helper Pay', icon: <Users className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  other: { label: 'Other', icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, clients, jobs, onAddExpense, onDeleteExpense }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('supplies');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formClientId, setFormClientId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const totalThisMonth = expenses.filter((e) => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);
  const totalAllTime = expenses.reduce((s, e) => s + e.amount, 0);

  const filtered = expenses
    .filter((e) => filterCategory === 'all' || e.category === filterCategory)
    .sort((a, b) => b.date.localeCompare(a.date));

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('supplies');
    setFormDescription('');
    setFormAmount(0);
    setFormClientId('');
    setFormNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim() || formAmount <= 0) return;
    const client = clients.find((c) => c.id === formClientId);
    onAddExpense({
      date: formDate,
      category: formCategory,
      description: formDescription.trim(),
      amount: formAmount,
      clientId: formClientId || undefined,
      notes: formNotes.trim() || undefined,
    });
    resetForm();
    setIsModalOpen(false);
  };

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Business Expenses</h2>
          <p className="text-xs text-slate-500 mt-0.5">Supplies, gas, equipment — everything it costs to run Clean Convictions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Log Expense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">${totalThisMonth.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Time</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">${totalAllTime.toLocaleString()}</div>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${
            filterCategory === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          All
        </button>
        {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer flex items-center gap-1 ${
              filterCategory === cat ? 'bg-slate-900 text-white border-slate-900' : `${CATEGORY_META[cat].color}`
            }`}
          >
            {CATEGORY_META[cat].icon}
            {CATEGORY_META[cat].label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {filtered.length === 0 && (
          <p className="p-6 text-xs text-slate-400 text-center">No expenses logged yet.</p>
        )}
        {filtered.map((exp) => (
          <div key={exp.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${CATEGORY_META[exp.category].color}`}>
                {CATEGORY_META[exp.category].icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{exp.description}</div>
                <div className="text-[11px] text-slate-400">
                  {exp.date} • {CATEGORY_META[exp.category].label}
                  {exp.clientId && clients.find((c) => c.id === exp.clientId) && (
                    <> • {clients.find((c) => c.id === exp.clientId)?.name}</>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-slate-900">${exp.amount.toLocaleString()}</span>
              <button
                onClick={() => onDeleteExpense(exp.id)}
                className="text-slate-300 hover:text-rose-600 cursor-pointer"
                aria-label="Delete expense"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Log an Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
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
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Costco — cleaning supplies"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client (optional)</label>
                  <select
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">—</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
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

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                Save Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
