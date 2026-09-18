import React, { useState } from 'react';
import { SupplyItem, SupplyUnit } from '../types';
import {
  Plus,
  Trash2,
  X,
  Package,
  AlertTriangle,
  RotateCcw,
  Pencil,
} from 'lucide-react';

interface SupplyInventoryViewProps {
  supplies: SupplyItem[];
  onAddSupply: (data: Omit<SupplyItem, 'id' | 'createdAt'>) => void;
  onUpdateSupply: (item: SupplyItem) => void;
  onDeleteSupply: (id: string) => void;
}

const CATEGORY_LABELS: Record<SupplyItem['category'], string> = {
  cleaning_solution: 'Cleaning Solutions',
  paper_products: 'Paper Products',
  equipment: 'Equipment',
  safety: 'Safety',
  other: 'Other',
};

const UNIT_OPTIONS: SupplyUnit[] = ['unit', 'bottle', 'roll', 'box', 'gallon', 'pack', 'case'];

const emptyForm = {
  name: '',
  category: 'cleaning_solution' as SupplyItem['category'],
  quantityOnHand: 0,
  unit: 'unit' as SupplyUnit,
  reorderThreshold: 2,
  preferredVendor: '',
  costPerUnit: 0,
  notes: '',
};

export const SupplyInventoryView: React.FC<SupplyInventoryViewProps> = ({
  supplies,
  onAddSupply,
  onUpdateSupply,
  onDeleteSupply,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<SupplyItem['category'] | 'all'>('all');
  const [form, setForm] = useState(emptyForm);

  const lowStockItems = supplies.filter((s) => s.quantityOnHand <= s.reorderThreshold);

  const filtered = supplies
    .filter((s) => filterCategory === 'all' || s.category === filterCategory)
    .sort((a, b) => {
      const aLow = a.quantityOnHand <= a.reorderThreshold;
      const bLow = b.quantityOnHand <= b.reorderThreshold;
      if (aLow !== bLow) return aLow ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: SupplyItem) => {
    setForm({
      name: item.name,
      category: item.category,
      quantityOnHand: item.quantityOnHand,
      unit: item.unit,
      reorderThreshold: item.reorderThreshold,
      preferredVendor: item.preferredVendor || '',
      costPerUnit: item.costPerUnit || 0,
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      category: form.category,
      quantityOnHand: form.quantityOnHand,
      unit: form.unit,
      reorderThreshold: form.reorderThreshold,
      preferredVendor: form.preferredVendor.trim() || undefined,
      costPerUnit: form.costPerUnit || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      const existing = supplies.find((s) => s.id === editingId);
      if (existing) {
        onUpdateSupply({ ...existing, ...payload });
      }
    } else {
      onAddSupply(payload);
    }
    resetForm();
    setIsModalOpen(false);
  };

  const handleRestockSubmit = (item: SupplyItem) => {
    if (restockAmount <= 0) {
      setRestockId(null);
      return;
    }
    onUpdateSupply({
      ...item,
      quantityOnHand: item.quantityOnHand + restockAmount,
      lastRestockedDate: new Date().toISOString().split('T')[0],
    });
    setRestockAmount(0);
    setRestockId(null);
  };

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Supply Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">What's on hand right now — restock before you run out, not after.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Supply
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Items Tracked</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{supplies.length}</div>
        </div>
        <div className={`rounded-xl p-5 border shadow-xs ${lowStockItems.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            Low Stock
          </span>
          <div className={`mt-2 text-2xl sm:text-3xl font-black ${lowStockItems.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {lowStockItems.length}
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs mb-2">
            <AlertTriangle className="w-4 h-4" />
            Needs reordering soon
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <span key={item.id} className="text-[11px] font-semibold bg-white border border-rose-200 text-rose-700 px-2.5 py-1 rounded-full">
                {item.name} ({item.quantityOnHand} {item.unit}{item.quantityOnHand === 1 ? '' : 's'} left)
              </span>
            ))}
          </div>
        </div>
      )}

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
        {(Object.keys(CATEGORY_LABELS) as SupplyItem['category'][]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${
              filterCategory === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {filtered.length === 0 && (
          <p className="p-6 text-xs text-slate-400 text-center">No supplies tracked yet. Add your first item.</p>
        )}
        {filtered.map((item) => {
          const isLow = item.quantityOnHand <= item.reorderThreshold;
          return (
            <div key={item.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                    isLow ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                    {item.name}
                    {isLow && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5" /> Low stock
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {CATEGORY_LABELS[item.category]} • {item.quantityOnHand} {item.unit}{item.quantityOnHand === 1 ? '' : 's'} on hand
                    {item.preferredVendor && <> • {item.preferredVendor}</>}
                    {item.lastRestockedDate && <> • Last restocked {item.lastRestockedDate}</>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {restockId === item.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      autoFocus
                      min={1}
                      value={restockAmount || ''}
                      onChange={(e) => setRestockAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                      placeholder="Qty"
                    />
                    <button
                      onClick={() => handleRestockSubmit(item)}
                      className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setRestockId(null);
                        setRestockAmount(0);
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setRestockId(item.id);
                      setRestockAmount(0);
                    }}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restock
                  </button>
                )}
                <button
                  onClick={() => openEditModal(item)}
                  className="text-slate-300 hover:text-slate-600 cursor-pointer"
                  aria-label="Edit supply"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteSupply(item.id)}
                  className="text-slate-300 hover:text-rose-600 cursor-pointer"
                  aria-label="Delete supply"
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
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Edit Supply' : 'Add Supply'}</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. All-Purpose Cleaner"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as SupplyItem['category'] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.keys(CATEGORY_LABELS) as SupplyItem['category'][]).map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value as SupplyUnit })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity On Hand</label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantityOnHand}
                    onChange={(e) => setForm({ ...form, quantityOnHand: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Low-Stock Alert At</label>
                  <input
                    type="number"
                    min={0}
                    value={form.reorderThreshold}
                    onChange={(e) => setForm({ ...form, reorderThreshold: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preferred Vendor</label>
                  <input
                    type="text"
                    value={form.preferredVendor}
                    onChange={(e) => setForm({ ...form, preferredVendor: e.target.value })}
                    placeholder="e.g. Costco"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost / Unit ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.costPerUnit || ''}
                    onChange={(e) => setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 mr-1.5" />
                {editingId ? 'Save Changes' : 'Add Supply'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
