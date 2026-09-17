import React, { useState } from 'react';
import {
  Client,
  JobAppointment,
  Invoice,
  CleaningProgram,
  CleaningFrequency,
  HomeCondition,
  PricingSettings,
  EstimatorInput,
  Referral,
} from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  KeyRound,
  PawPrint,
  Calendar,
  Calculator,
  Edit2,
  Trash2,
  Tag,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  History,
  Receipt,
  FileCheck,
  X,
  ExternalLink,
  Gift,
  Share2,
  Copy,
  Check,
  Download,
  Star,
} from 'lucide-react';
import { generateReferralCode } from '../utils/starterData';
import { exportToCSV } from '../utils/csvExport';
import { buildSmsLink, buildZohoComposeLink } from '../utils/contactLinks';

interface ClientsViewProps {
  clients: Client[];
  jobs: JobAppointment[];
  invoices: Invoice[];
  settings: PricingSettings;
  referrals?: Referral[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onDeleteJob?: (jobId: string) => void;
  onLoadIntoEstimator: (input: Partial<EstimatorInput>, clientName?: string) => void;
  onScheduleForClient: (
    client: Client,
    scheduleDetails?: { date: string; timeSlot: string; notes?: string; agreedRate?: number; program?: CleaningProgram }
  ) => void;
  onUpdateClientTags?: (clientId: string, tags: string[]) => void;
  onAddClientActivity?: (clientId: string, note: string) => void;
  onRequestReview?: (client: Client) => void;
  onSetDoNotServe?: (clientId: string, doNotServe: boolean, reason?: string) => void;
  onToggleSkipNextVisit?: (clientId: string) => void;
}

const LOYALTY_MILESTONES = [5, 10, 25, 50, 100];
const REFERRAL_TIERS: { min: number; label: string }[] = [
  { min: 1, label: '🥉 Bronze Referrer' },
  { min: 3, label: '🥈 Silver Referrer' },
  { min: 6, label: '🥇 Gold Referrer' },
];

const COMMON_TAGS = ['VIP', 'At-Risk', 'One-Time', 'Referral Source', 'Price-Sensitive'];

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  jobs,
  invoices,
  settings,
  referrals = [],
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onDeleteJob,
  onLoadIntoEstimator,
  onScheduleForClient,
  onUpdateClientTags,
  onAddClientActivity,
  onRequestReview,
  onSetDoNotServe,
  onToggleSkipNextVisit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [newActivityNote, setNewActivityNote] = useState('');

  // Booking Modal State (Date & Time of cleaning)
  const [bookingModalClient, setBookingModalClient] = useState<Client | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>('8:00 AM - 11:30 AM (Morning)');
  const [bookingCustomTime, setBookingCustomTime] = useState<string>('');
  const [bookingProgram, setBookingProgram] = useState<CleaningProgram>('regular');
  const [bookingRate, setBookingRate] = useState<number>(125);
  const [bookingNotes, setBookingNotes] = useState<string>('');

  const handleOpenBookModal = (client: Client) => {
    setBookingModalClient(client);
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTimeSlot('8:00 AM - 11:30 AM (Morning)');
    setBookingCustomTime('');
    setBookingProgram(client.defaultProgram);
    setBookingRate(client.agreedRate);
    setBookingNotes(client.specialInstructions || '');
  };

  const handleConfirmSchedule = () => {
    if (!bookingModalClient) return;
    const effectiveTime = bookingTimeSlot === 'Custom Time'
      ? (bookingCustomTime.trim() || 'Custom Time')
      : bookingTimeSlot;

    onScheduleForClient(bookingModalClient, {
      date: bookingDate,
      timeSlot: effectiveTime,
      program: bookingProgram,
      agreedRate: Number(bookingRate),
      notes: bookingNotes,
    });
    setBookingModalClient(null);
  };

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('Yuma');
  const [formEntryCode, setFormEntryCode] = useState('');
  const [formPetNotes, setFormPetNotes] = useState('');
  const [formProgram, setFormProgram] = useState<CleaningProgram>('regular');
  const [formFrequency, setFormFrequency] = useState<CleaningFrequency>('bi-weekly');
  const [formSqft, setFormSqft] = useState(1800);
  const [formBeds, setFormBeds] = useState(3);
  const [formBaths, setFormBaths] = useState(2);
  const [formCondition, setFormCondition] = useState<HomeCondition>('standard');
  const [formMilitary, setFormMilitary] = useState(false);
  const [formAgreedRate, setFormAgreedRate] = useState(125);
  const [formStatus, setFormStatus] = useState<'active' | 'lead' | 'paused'>('active');
  const [formInstructions, setFormInstructions] = useState('');
  const [formReferralCode, setFormReferralCode] = useState('');
  const [formReferralCredit, setFormReferralCredit] = useState(0);
  const [formReferredBy, setFormReferredBy] = useState('');

  // Quick Share Referral Modal
  const [shareReferralClient, setShareReferralClient] = useState<Client | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFreq = filterFrequency === 'all' || c.preferredFrequency === filterFrequency;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesTag = filterTag === 'all' || (c.tags || []).includes(filterTag);

    return matchesSearch && matchesFreq && matchesStatus && matchesTag;
  });

  const handleExportClientsCSV = () => {
    exportToCSV(
      clients.map((c) => ({
        Name: c.name,
        Phone: c.phone,
        Email: c.email,
        Address: c.address,
        City: c.city,
        Frequency: c.preferredFrequency,
        AgreedRate: c.agreedRate,
        Status: c.status,
        Tags: (c.tags || []).join('; '),
      })),
      `clean-convictions-clients-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCity('Yuma');
    setFormEntryCode('');
    setFormPetNotes('');
    setFormProgram('regular');
    setFormFrequency('bi-weekly');
    setFormSqft(1800);
    setFormBeds(3);
    setFormBaths(2);
    setFormCondition('standard');
    setFormMilitary(false);
    setFormAgreedRate(125);
    setFormStatus('active');
    setFormInstructions('');
    setFormReferralCode('');
    setFormReferralCredit(0);
    setFormReferredBy('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone);
    setFormEmail(client.email);
    setFormAddress(client.address);
    setFormCity(client.city);
    setFormEntryCode(client.entryCode || '');
    setFormPetNotes(client.petNotes || '');
    setFormProgram(client.defaultProgram);
    setFormFrequency(client.preferredFrequency);
    setFormSqft(client.sqft);
    setFormBeds(client.bedrooms);
    setFormBaths(client.bathrooms);
    setFormCondition(client.condition);
    setFormMilitary(client.isMilitary);
    setFormAgreedRate(client.agreedRate);
    setFormStatus(client.status);
    setFormInstructions(client.specialInstructions || '');
    setFormReferralCode(client.referralCode || generateReferralCode(client.name, client.phone));
    setFormReferralCredit(client.referralCreditBalance || 0);
    setFormReferredBy(client.referredByClientId || '');
    setIsAddModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReferralCode = formReferralCode.trim() || generateReferralCode(formName || 'CLIENT', formPhone);

    if (editingClient) {
      onUpdateClient({
        ...editingClient,
        name: formName,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        entryCode: formEntryCode,
        petNotes: formPetNotes,
        defaultProgram: formProgram,
        preferredFrequency: formFrequency,
        sqft: formSqft,
        bedrooms: formBeds,
        bathrooms: formBaths,
        condition: formCondition,
        isMilitary: formMilitary,
        agreedRate: Number(formAgreedRate),
        status: formStatus,
        specialInstructions: formInstructions,
        referralCode: cleanReferralCode,
        referralCreditBalance: Math.max(0, Number(formReferralCredit) || 0),
        referredByClientId: formReferredBy || undefined,
      });
    } else {
      onAddClient({
        name: formName || 'New Client',
        phone: formPhone || '(928) 555-0100',
        email: formEmail,
        address: formAddress || 'Yuma, AZ',
        city: formCity,
        entryCode: formEntryCode,
        petNotes: formPetNotes,
        defaultProgram: formProgram,
        preferredFrequency: formFrequency,
        sqft: formSqft,
        bedrooms: formBeds,
        bathrooms: formBaths,
        condition: formCondition,
        isMilitary: formMilitary,
        defaultAddOns: [],
        agreedRate: Number(formAgreedRate),
        status: formStatus,
        specialInstructions: formInstructions,
        referralCode: cleanReferralCode,
        referralCreditBalance: Math.max(0, Number(formReferralCredit) || 0),
        referredByClientId: formReferredBy || undefined,
      });
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Header & Search Controls */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Client Directory & CRM</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage client home specs, lockbox codes, pet instructions, and locked-in agreed flat rates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportClientsCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center cursor-pointer"
              title="Export all clients to CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </button>
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Client
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by client name, address, city, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              <option value="all">All Frequencies</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Every Other Week</option>
              <option value="monthly">Monthly</option>
              <option value="one-time">One-Time</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Recurring</option>
              <option value="lead">New Leads</option>
              <option value="paused">Paused</option>
            </select>

            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              <option value="all">All Tags</option>
              {COMMON_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.map((client) => {
          return (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                {/* Header with status and price badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        client.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : client.status === 'lead'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {client.status}
                      </span>
                      <span className="text-xs text-slate-400 capitalize font-medium">
                        {client.preferredFrequency}
                      </span>
                      {client.doNotServe && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          Do Not Serve
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">
                      {client.name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900">
                      ${client.agreedRate}
                    </span>
                    <span className="text-[10px] text-slate-400 block -mt-1">agreed flat</span>
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center text-slate-700">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                  <div className="flex items-center text-slate-700 gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{client.phone}</span>
                    {client.phone && (
                      <a
                        href={buildSmsLink(client.phone, '')}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                        title="Text via Google Voice"
                      >
                        Text
                      </a>
                    )}
                    {client.email && (
                      <a
                        href={buildZohoComposeLink(client.email, '', '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                        title="Email via Zoho"
                      >
                        Email
                      </a>
                    )}
                  </div>
                </div>

                {/* Home Specs */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">
                      {client.sqft.toLocaleString()} sq ft • {client.bedrooms}b/{client.bathrooms}ba
                    </span>
                    <span className="text-emerald-700 font-medium capitalize">
                      {client.defaultProgram} Clean
                    </span>
                  </div>

                  {client.entryCode && (
                    <div className="mt-1.5 flex items-center text-slate-700">
                      <KeyRound className="w-3 h-3 mr-1.5 text-amber-600 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{client.entryCode}</span>
                    </div>
                  )}

                  {client.petNotes && (
                    <div className="mt-1 flex items-center text-slate-600">
                      <PawPrint className="w-3 h-3 mr-1.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] truncate">{client.petNotes}</span>
                    </div>
                  )}
                </div>

                {/* Referral Code & Balance Badge */}
                <div className="mt-2.5 flex items-center justify-between bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <Gift className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-600 text-[11px]">Referral:</span>
                    <span className="font-mono font-bold text-emerald-950 text-[11px]">
                      {client.referralCode || generateReferralCode(client.name, client.phone)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {(client.referralCreditBalance || 0) > 0 ? (
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        ${client.referralCreditBalance} Credit
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShareReferralClient(client)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center cursor-pointer"
                        title="Share referral link"
                      >
                        <Share2 className="w-3 h-3 mr-0.5" /> Share
                      </button>
                    )}
                  </div>
                </div>

                {client.specialInstructions && (
                  <p className="mt-2 text-[11px] text-slate-500 italic">
                    "{client.specialInstructions}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    onLoadIntoEstimator(
                      {
                        program: client.defaultProgram,
                        sqft: client.sqft,
                        bedrooms: client.bedrooms,
                        bathrooms: client.bathrooms,
                        condition: client.condition,
                        frequency: client.preferredFrequency,
                        isMilitaryOrVeteran: client.isMilitary,
                        selectedAddOns: client.defaultAddOns || [],
                      },
                      client.name
                    )
                  }
                  title="Load into Estimator"
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Re-Quote
                </button>

                <button
                  onClick={() => handleOpenBookModal(client)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow-xs cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Book Clean
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(client)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                    title="Edit Client"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteClient(client.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Service History Button */}
              {(() => {
                const clientJobs = jobs.filter((j) => j.clientId === client.id);
                return (
                  <button
                    onClick={() => setHistoryClient(client)}
                    className="w-full mt-2.5 py-1.5 px-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Service History ({clientJobs.length} {clientJobs.length === 1 ? 'service' : 'services'})
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {clients.length === 0 ? 'No Clients Added Yet' : 'No Clients Match Your Search'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {clients.length === 0
              ? 'Your client CRM is currently empty. Add your first customer manually or calculate a quote in the Estimator and click "Save as Client".'
              : 'Try adjusting your search query or status/frequency filters.'}
          </p>
          {clients.length === 0 && (
            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add First Client
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingClient ? 'Edit Client Details' : 'Add New Client to CRM'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter customer contact info and home specifications.
            </p>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(928) 555-0142"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Yuma">Yuma</option>
                    <option value="Foothills">Foothills</option>
                    <option value="Somerton">Somerton</option>
                    <option value="San Luis">San Luis</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Street Address *</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="1420 E 24th St, Yuma, AZ 85365"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Home specs row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Square Feet</label>
                  <input
                    type="number"
                    value={formSqft}
                    onChange={(e) => setFormSqft(parseInt(e.target.value) || 1500)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={formBeds}
                    onChange={(e) => setFormBeds(parseInt(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formBaths}
                    onChange={(e) => setFormBaths(parseFloat(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Pricing & Frequency */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Program</label>
                  <select
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value as CleaningProgram)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="regular">Regular Clean</option>
                    <option value="deep">Deep Clean</option>
                    <option value="move">Move In/Out</option>
                    <option value="office">Office</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as CleaningFrequency)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="weekly">Weekly (-20%)</option>
                    <option value="bi-weekly">Bi-Weekly (-15%)</option>
                    <option value="monthly">Monthly (-10%)</option>
                    <option value="one-time">One-Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agreed Rate ($)</label>
                  <input
                    type="number"
                    value={formAgreedRate}
                    onChange={(e) => setFormAgreedRate(parseFloat(e.target.value) || 100)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gate / Keypad Code</label>
                  <input
                    type="text"
                    value={formEntryCode}
                    onChange={(e) => setFormEntryCode(e.target.value)}
                    placeholder="Keypad #4821 or lockbox code"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pet Instructions</label>
                  <input
                    type="text"
                    value={formPetNotes}
                    onChange={(e) => setFormPetNotes(e.target.value)}
                    placeholder="Dog in backyard, keep screens shut"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="form-mil"
                  checked={formMilitary}
                  onChange={(e) => setFormMilitary(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="form-mil" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Eligible for 10% Military / Veteran Discount
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Preferences / Notes</label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Special floor solutions, delicate surfaces, key return..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Referral Settings for Client */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  <span>Referral Program & Credit Settings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Personal Referral Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormReferralCode(generateReferralCode(formName || 'CLIENT', formPhone))}
                        className="text-[10px] text-emerald-700 hover:underline font-medium"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formReferralCode}
                      onChange={(e) => setFormReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CC-SARAH-0142"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Available Referral Credit Balance ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={formReferralCredit}
                      onChange={(e) => setFormReferralCredit(Number(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Referred By (Existing Customer)
                  </label>
                  <select
                    value={formReferredBy}
                    onChange={(e) => setFormReferredBy(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- None / Organic Lead --</option>
                    {clients
                      .filter((c) => !editingClient || c.id !== editingClient.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.referralCode || 'No Code'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow cursor-pointer"
                >
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Customer Service History Modal */}
      {historyClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-slate-900">{historyClient.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      historyClient.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : historyClient.status === 'lead'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {historyClient.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Service History & Client Profile • Member since {historyClient.createdAt}
                </p>
              </div>

              <button
                onClick={() => setHistoryClient(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contact & House Notes */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="space-y-1.5">
                <div className="flex items-center text-slate-700">
                  <Phone className="w-3.5 h-3.5 mr-2 text-emerald-600 shrink-0" />
                  <a href={`tel:${historyClient.phone}`} className="hover:underline font-semibold">
                    {historyClient.phone}
                  </a>
                </div>
                {historyClient.email && (
                  <div className="flex items-center text-slate-700">
                    <Mail className="w-3.5 h-3.5 mr-2 text-emerald-600 shrink-0" />
                    <a href={`mailto:${historyClient.email}`} className="hover:underline">
                      {historyClient.email}
                    </a>
                  </div>
                )}
                <div className="flex items-center text-slate-700">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-emerald-600 shrink-0" />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      historyClient.address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center"
                  >
                    {historyClient.address}
                    <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
                  </a>
                </div>
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l sm:pl-3 border-slate-200">
                {historyClient.entryCode ? (
                  <div className="flex items-start text-slate-700">
                    <KeyRound className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-semibold">{historyClient.entryCode}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px]">No lockbox code registered</span>
                )}

                {historyClient.petNotes && (
                  <div className="flex items-start text-slate-700">
                    <PawPrint className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[11px]">{historyClient.petNotes}</span>
                  </div>
                )}

                {historyClient.specialInstructions && (
                  <div className="text-[11px] text-slate-500 italic mt-1">
                    "{historyClient.specialInstructions}"
                  </div>
                )}
              </div>
            </div>

            {/* Lifetime KPI Summary */}
            {(() => {
              const clientJobs = jobs.filter((j) => j.clientId === historyClient.id);
              const clientInvoices = invoices.filter((i) => i.clientId === historyClient.id);
              const totalPaid = clientInvoices
                .filter((i) => i.status === 'paid')
                .reduce((sum, i) => sum + i.totalAmount, 0);
              const completedCount = clientJobs.filter((j) => j.status === 'completed').length;

              return (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                      Lifetime Value
                    </span>
                    <span className="text-lg font-bold text-emerald-900">${totalPaid}</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Completed Cleans
                    </span>
                    <span className="text-lg font-bold text-slate-900">{completedCount}</span>
                    {(() => {
                      const milestone = [...LOYALTY_MILESTONES].reverse().find((m) => completedCount >= m);
                      return milestone ? (
                        <span className="block text-[10px] font-bold text-amber-600 mt-0.5">🏆 {milestone}+ club</span>
                      ) : null;
                    })()}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Agreed Rate
                    </span>
                    <span className="text-lg font-bold text-slate-900">${historyClient.agreedRate}</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Frequency
                    </span>
                    <span className="text-xs font-bold text-slate-800 capitalize mt-1 block">
                      {historyClient.preferredFrequency}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Tags & Activity Notes */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center">
                  <Tag className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TAGS.map((tag) => {
                    const active = (historyClient.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          if (!onUpdateClientTags) return;
                          const current = historyClient.tags || [];
                          const next = active ? current.filter((t) => t !== tag) : [...current, tag];
                          onUpdateClientTags(historyClient.id, next);
                          setHistoryClient({ ...historyClient, tags: next });
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                          active
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {onRequestReview && (
                  <button
                    onClick={() => onRequestReview(historyClient)}
                    className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center"
                  >
                    <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-500" />
                    Draft a review request for this client
                  </button>
                )}

                {onToggleSkipNextVisit && historyClient.preferredFrequency !== 'one-time' && (
                  <button
                    onClick={() => {
                      onToggleSkipNextVisit(historyClient.id);
                      setHistoryClient({ ...historyClient, skipNextVisit: !historyClient.skipNextVisit });
                    }}
                    className={`mt-2 text-xs font-semibold flex items-center ${
                      historyClient.skipNextVisit ? 'text-amber-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {historyClient.skipNextVisit ? '✓ Skipping next auto-scheduled visit' : 'Skip next auto-scheduled visit'}
                  </button>
                )}

                {onSetDoNotServe && (
                  <button
                    onClick={() => {
                      const next = !historyClient.doNotServe;
                      const reason = next ? window.prompt('Reason (optional):') || undefined : undefined;
                      onSetDoNotServe(historyClient.id, next, reason);
                      setHistoryClient({ ...historyClient, doNotServe: next, doNotServeReason: reason });
                    }}
                    className={`mt-2 text-xs font-semibold flex items-center ${
                      historyClient.doNotServe ? 'text-rose-700' : 'text-slate-400 hover:text-rose-600'
                    }`}
                  >
                    {historyClient.doNotServe ? `🚫 Marked Do Not Serve${historyClient.doNotServeReason ? ` — ${historyClient.doNotServeReason}` : ''}` : 'Mark as Do Not Serve'}
                  </button>
                )}

                {historyClient.status === 'lead' && (
                  <button
                    onClick={() => {
                      const date = window.prompt('Follow up on (YYYY-MM-DD)?', historyClient.followUpDate || new Date().toISOString().split('T')[0]);
                      if (date === null) return;
                      onUpdateClient({ ...historyClient, followUpDate: date || undefined });
                      setHistoryClient({ ...historyClient, followUpDate: date || undefined });
                    }}
                    className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center"
                  >
                    {historyClient.followUpDate ? `📅 Follow up ${historyClient.followUpDate}` : 'Set follow-up date'}
                  </button>
                )}

                {(() => {
                  const referralsSent = referrals.filter(
                    (r) => r.referrerClientId === historyClient.id && r.status !== 'pending'
                  ).length;
                  const tier = [...REFERRAL_TIERS].reverse().find((t) => referralsSent >= t.min);
                  return tier ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      {tier.label} ({referralsSent} referred)
                    </p>
                  ) : null;
                })()}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center">
                  <History className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Activity Notes
                </h4>
                {onAddClientActivity && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <input
                      type="text"
                      value={newActivityNote}
                      onChange={(e) => setNewActivityNote(e.target.value)}
                      placeholder="e.g. Called about rescheduling next visit"
                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                    <button
                      onClick={() => {
                        if (!newActivityNote.trim()) return;
                        onAddClientActivity(historyClient.id, newActivityNote);
                        setNewActivityNote('');
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {(historyClient.activityLog || []).length === 0 && (
                    <p className="text-[11px] text-slate-400">No notes logged yet.</p>
                  )}
                  {[...(historyClient.activityLog || [])].reverse().map((entry) => (
                    <div key={entry.id} className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5">
                      <span className="text-slate-400 mr-1.5">{entry.date}</span>
                      <span className="text-slate-700">{entry.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Service Timeline */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
                <History className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Service Timeline & Appointment History
              </h4>

              {(() => {
                const clientJobs = jobs
                  .filter((j) => j.clientId === historyClient.id)
                  .sort((a, b) => b.date.localeCompare(a.date));

                if (clientJobs.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                      No service appointments recorded yet for this client.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {clientJobs.map((job) => {
                      const relatedInvoice = invoices.find(
                        (inv) => inv.jobId === job.id || (inv.clientId === job.clientId && inv.serviceDate === job.date)
                      );

                      return (
                        <div
                          key={job.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition text-xs shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{job.date}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600 font-medium">{job.timeSlot}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  job.program === 'deep'
                                    ? 'bg-purple-100 text-purple-800'
                                    : job.program === 'move'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {job.program.toUpperCase()}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm">${job.price}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  job.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : job.status === 'in-progress'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {job.status.toUpperCase()}
                              </span>

                              {onDeleteJob && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete this scheduled appointment on ${job.date} for ${job.clientName}?`)) {
                                      onDeleteJob(job.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="Delete Appointment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            <span>
                              {job.sqft.toLocaleString()} sq ft • {job.bedrooms} bed / {job.bathrooms} bath
                            </span>
                            {job.actualMinutes && (
                              <span className="text-slate-700 font-semibold">
                                • Duration: {Math.floor(job.actualMinutes / 60)}h {job.actualMinutes % 60}m
                              </span>
                            )}
                            {job.selectedAddOns?.length > 0 && (
                              <span>• Add-ons: {job.selectedAddOns.join(', ')}</span>
                            )}
                          </div>

                          {job.notes && (
                            <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                              "{job.notes}"
                            </p>
                          )}

                          {/* Related Invoice Badge */}
                          {relatedInvoice && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <div className="flex items-center space-x-1.5 text-slate-600">
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Invoice #{relatedInvoice.invoiceNumber}</span>
                              </div>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full ${
                                  relatedInvoice.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {relatedInvoice.status === 'paid'
                                  ? `Paid (${relatedInvoice.paymentMethod || 'Settled'})`
                                  : 'Unpaid Balance'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onLoadIntoEstimator(
                    {
                      program: historyClient.defaultProgram,
                      sqft: historyClient.sqft,
                      bedrooms: historyClient.bedrooms,
                      bathrooms: historyClient.bathrooms,
                      condition: historyClient.condition,
                      frequency: historyClient.preferredFrequency,
                      isMilitaryOrVeteran: historyClient.isMilitary,
                      selectedAddOns: historyClient.defaultAddOns || [],
                    },
                    historyClient.name
                  );
                  setHistoryClient(null);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center transition cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 mr-1.5" />
                Re-Quote in Estimator
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setHistoryClient(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const client = historyClient;
                    setHistoryClient(null);
                    if (client) handleOpenBookModal(client);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow cursor-pointer flex items-center"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Book Next Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Cleaning Appointment Modal (with Date and Time) */}
      {bookingModalClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Book Cleaning Appointment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: <span className="font-semibold text-slate-800">{bookingModalClient.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalClient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 py-4">
              {/* Date of Cleaning */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Date of Cleaning:
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-emerald-500"
                />

                {/* Quick Date Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setBookingDate(new Date().toISOString().split('T')[0])}
                    className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setBookingDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      setBookingDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setBookingDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer transition"
                  >
                    +1 Week
                  </button>
                </div>
              </div>

              {/* Time of Cleaning */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Time Slot / Arrival Window:
                </label>
                <select
                  value={bookingTimeSlot}
                  onChange={(e) => setBookingTimeSlot(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500 font-medium"
                >
                  <option value="8:00 AM - 11:30 AM (Morning)">8:00 AM - 11:30 AM (Morning Solo)</option>
                  <option value="12:00 PM - 3:30 PM (Midday)">12:00 PM - 3:30 PM (Midday Slot)</option>
                  <option value="4:00 PM - 7:00 PM (Afternoon)">4:00 PM - 7:00 PM (Afternoon / Twilight)</option>
                  <option value="Custom Time">Custom Time...</option>
                </select>

                {bookingTimeSlot === 'Custom Time' && (
                  <input
                    type="text"
                    placeholder="e.g. 9:00 AM - 12:30 PM"
                    value={bookingCustomTime}
                    onChange={(e) => setBookingCustomTime(e.target.value)}
                    className="mt-1.5 w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500"
                  />
                )}
              </div>

              {/* Service Program & Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cleaning Program:
                  </label>
                  <select
                    value={bookingProgram}
                    onChange={(e) => setBookingProgram(e.target.value as CleaningProgram)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg capitalize"
                  >
                    <option value="regular">Regular Maintenance</option>
                    <option value="deep">Deep Clean</option>
                    <option value="move_in_out">Move-In / Move-Out</option>
                    <option value="post_construction">Post-Construction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Agreed Flat Rate ($):
                  </label>
                  <input
                    type="number"
                    value={bookingRate}
                    onChange={(e) => setBookingRate(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Notes & Entry Info */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Notes / Entry Code:
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Gate code, pet instructions, lockbox..."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-emerald-500"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-500">
                <span>Address: </span>
                <span className="font-semibold text-slate-700">{bookingModalClient.address}, {bookingModalClient.city}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBookingModalClient(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow cursor-pointer flex items-center"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Confirm & Add to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: SHARE REFERRAL SMS */}
      {shareReferralClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Share Referral Code</h3>
                  <p className="text-[11px] text-slate-500">{shareReferralClient.name}'s Promo Text</p>
                </div>
              </div>
              <button
                onClick={() => setShareReferralClient(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Personal Code</span>
                  <span className="font-mono text-base font-extrabold text-emerald-950">
                    {shareReferralClient.referralCode || generateReferralCode(shareReferralClient.name, shareReferralClient.phone)}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-200">
                  Give $25 / Get $25
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ready-to-Text Message</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans select-all">
                  {`Hey! It's ${shareReferralClient.name}. I use Clean Convictions for our home cleaning in Yuma and they do an exceptional job. Use my referral code ${shareReferralClient.referralCode || generateReferralCode(shareReferralClient.name, shareReferralClient.phone)} to get $25 OFF your first clean! You can book online at cleanconvictions.com or call/text (928) 555-0100.`}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`sms:?&body=${encodeURIComponent(
                  `Hey! It's ${shareReferralClient.name}. I use Clean Convictions for our home cleaning in Yuma and they do an exceptional job. Use my referral code ${shareReferralClient.referralCode || generateReferralCode(shareReferralClient.name, shareReferralClient.phone)} to get $25 OFF your first clean! You can book online at cleanconvictions.com or call/text (928) 555-0100.`
                )}`}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center transition"
              >
                Launch SMS
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Hey! It's ${shareReferralClient.name}. I use Clean Convictions for our home cleaning in Yuma and they do an exceptional job. Use my referral code ${shareReferralClient.referralCode || generateReferralCode(shareReferralClient.name, shareReferralClient.phone)} to get $25 OFF your first clean! You can book online at cleanconvictions.com or call/text (928) 555-0100.`
                  );
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2000);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center shadow-xs transition cursor-pointer"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
