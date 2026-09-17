import React, { useState } from 'react';
import { Partner, PartnerType, PartnerStatus } from '../types';
import {
  Handshake,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Send,
  Pencil,
  CheckCircle2,
} from 'lucide-react';
import { buildSmsLink, buildZohoComposeLink } from '../utils/contactLinks';

interface PartnersViewProps {
  partners: Partner[];
  onAddPartner: (data: Omit<Partner, 'id' | 'createdAt'>) => void;
  onUpdatePartner: (id: string, data: Partial<Partner>) => void;
  onDeletePartner: (id: string) => void;
  onDraftOutreach: (partner: Partner) => void;
}

const TYPE_META: Record<PartnerType, { label: string }> = {
  property_manager: { label: 'Property Manager' },
  rv_park: { label: 'RV / Mobile Home Park' },
  realtor: { label: 'Realtor' },
  hoa: { label: 'HOA' },
  other: { label: 'Other' },
};

const STATUS_META: Record<PartnerStatus, { label: string; color: string; dot: string }> = {
  not_contacted: { label: 'Not Contacted', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  contacted: { label: 'Contacted', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  interested: { label: 'Interested', color: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500' },
  partnered: { label: 'Partnered', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  declined: { label: 'Declined', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
};

const STATUS_ORDER: PartnerStatus[] = ['not_contacted', 'contacted', 'interested', 'partnered', 'declined'];

const EMPTY_FORM = {
  businessName: '',
  contactName: '',
  type: 'property_manager' as PartnerType,
  phone: '',
  email: '',
  address: '',
  status: 'not_contacted' as PartnerStatus,
  notes: '',
};

export const PartnersView: React.FC<PartnersViewProps> = ({
  partners,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  onDraftOutreach,
}) => {
  const [filter, setFilter] = useState<PartnerStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = filter === 'all' ? partners : partners.filter((p) => p.status === filter);
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (p: Partner) => {
    setForm({
      businessName: p.businessName,
      contactName: p.contactName || '',
      type: p.type,
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      status: p.status,
      notes: p.notes || '',
    });
    setEditingId(p.id);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!form.businessName.trim()) return;
    const data = {
      businessName: form.businessName.trim(),
      contactName: form.contactName.trim() || undefined,
      type: form.type,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      onUpdatePartner(editingId, data);
    } else {
      onAddPartner(data);
    }
    setFormOpen(false);
  };

  const advanceStatus = (p: Partner, status: PartnerStatus) => {
    onUpdatePartner(p.id, { status, lastContactDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Handshake className="w-5 h-5 text-lime-500" />
            Partners
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Property managers, RV parks, realtors — the B2B relationships that send you clients, not clients themselves.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-950 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Partner
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer ${
            filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
          }`}
        >
          All ({partners.length})
        </button>
        {STATUS_ORDER.map((s) => {
          const count = partners.filter((p) => p.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 ${
                filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            No partners yet. Add the property managers and RV parks you want to reach out to.
          </div>
        )}
        {sorted.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 text-sm">{p.businessName}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {TYPE_META[p.type].label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_META[p.status].color}`}>
                    {STATUS_META[p.status].label}
                  </span>
                </div>
                {p.contactName && <p className="text-xs text-slate-500 mt-0.5">Contact: {p.contactName}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
                  {p.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {p.phone}
                    </span>
                  )}
                  {p.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {p.email}
                    </span>
                  )}
                  {p.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {p.address}
                    </span>
                  )}
                </div>
                {p.notes && <p className="text-xs text-slate-500 mt-1.5 whitespace-pre-wrap">{p.notes}</p>}
                {p.lastContactDate && (
                  <p className="text-[10px] text-slate-400 mt-1">Last contact: {p.lastContactDate}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(p)} className="text-slate-300 hover:text-slate-700 cursor-pointer" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDeletePartner(p.id)} className="text-slate-300 hover:text-rose-600 cursor-pointer" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => onDraftOutreach(p)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Draft Outreach
              </button>
              {p.phone && (
                <a
                  href={buildSmsLink(p.phone, '')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5"
                >
                  Text
                </a>
              )}
              {p.email && (
                <a
                  href={buildZohoComposeLink(p.email, '', '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5"
                >
                  Email
                </a>
              )}
              {p.status !== 'partnered' && (
                <button
                  onClick={() => advanceStatus(p, p.status === 'not_contacted' ? 'contacted' : p.status === 'contacted' ? 'interested' : 'partnered')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark as {p.status === 'not_contacted' ? 'Contacted' : p.status === 'contacted' ? 'Interested' : 'Partnered'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-12 sm:pt-20">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">{editingId ? 'Edit Partner' : 'Add Partner'}</p>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
                <input
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  placeholder="e.g. Desert Skies RV Resort"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PartnerType }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {(Object.keys(TYPE_META) as PartnerType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_META[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Name (optional)</label>
                <input
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PartnerStatus }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={handleSubmit}
                disabled={!form.businessName.trim()}
                className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                {editingId ? 'Save Changes' : 'Add Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
