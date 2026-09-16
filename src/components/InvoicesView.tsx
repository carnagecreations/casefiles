import React, { useState } from 'react';
import { Invoice, Client, JobAppointment } from '../types';
import {
  Receipt,
  DollarSign,
  CheckCircle,
  Clock,
  Printer,
  Calendar,
  CreditCard,
  Plus,
  ShieldCheck,
  Sparkles,
  Search,
  Check,
  TrendingUp,
  X,
} from 'lucide-react';

interface InvoicesViewProps {
  invoices: Invoice[];
  clients: Client[];
  onMarkPaid: (invoiceId: string, method: Invoice['paymentMethod']) => void;
  onCreateInvoice: (invoice: Omit<Invoice, 'id'>) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  clients,
  onMarkPaid,
  onCreateInvoice,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Invoice Form
  const [formClientId, setFormClientId] = useState(clients[0]?.id || '');
  const [formDesc, setFormDesc] = useState('Regular Home Cleaning');
  const [formAmount, setFormAmount] = useState(125);
  const [formServiceDate, setFormServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('Payment due upon service completion.');

  // Financial calculations
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalUnpaid = invoices
    .filter((i) => i.status === 'unpaid')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  // Calculate Monthly Recurring Revenue (MRR) from active clients
  const projectedMRR = clients
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => {
      if (c.preferredFrequency === 'weekly') return sum + c.agreedRate * 4.3;
      if (c.preferredFrequency === 'bi-weekly') return sum + c.agreedRate * 2.16;
      if (c.preferredFrequency === 'monthly') return sum + c.agreedRate;
      return sum;
    }, 0);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesSearch =
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateNewInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === formClientId);
    if (!client) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newNumber = `CC-2026-${Math.floor(100 + Math.random() * 900)}`;

    onCreateInvoice({
      invoiceNumber: newNumber,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email || '',
      clientPhone: client.phone,
      clientAddress: client.address,
      issueDate: todayStr,
      dueDate: todayStr,
      serviceDate: formServiceDate || todayStr,
      program: client.defaultProgram,
      items: [{ description: formDesc, amount: Number(formAmount) }],
      subtotal: Number(formAmount),
      discountTotal: 0,
      totalAmount: Number(formAmount),
      status: 'unpaid',
      notes: formNotes,
    });

    setIsCreateModalOpen(false);
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paid Revenue Collected
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              ${totalPaid.toLocaleString()}
            </span>
            <span className="ml-2 text-xs text-emerald-600 font-semibold">
              {invoices.filter((i) => i.status === 'paid').length} invoices paid
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending / Unpaid
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              ${totalUnpaid.toLocaleString()}
            </span>
            <span className="ml-2 text-xs text-amber-600 font-semibold">
              {invoices.filter((i) => i.status === 'unpaid').length} awaiting payment
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-tr from-slate-900 to-slate-800 rounded-xl p-5 border border-slate-700 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Projected Monthly MRR
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-black text-white">
              ${Math.round(projectedMRR).toLocaleString()}
            </span>
            <span className="ml-2 text-xs text-slate-400 font-medium">
              recurring run rate
            </span>
          </div>
        </div>
      </div>

      {/* Invoice Controls & List */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Invoices & Service Receipts</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Clean Convictions transparent flat billing with print and export capabilities.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Invoice
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice number or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            {(['all', 'unpaid', 'paid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No invoices match your search or filter.
            </div>
          ) : (
            filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 transition"
              >
                {/* Left details */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm mt-1">{inv.clientName}</h4>
                    <p className="text-xs text-slate-500">
                      Service Date: {inv.serviceDate} • {inv.clientAddress}
                    </p>
                  </div>
                </div>

                {/* Right total & actions */}
                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block">Total Due</span>
                    <span className="text-xl font-black text-slate-900">
                      ${inv.totalAmount}
                    </span>
                    {inv.paymentMethod && (
                      <span className="text-[10px] text-emerald-700 font-medium block">
                        Paid via {inv.paymentMethod}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {inv.status === 'unpaid' && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onMarkPaid(inv.id, 'Zelle')}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedInvoiceForPrint(inv)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      View / Print
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            {/* Modal Controls */}
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Official Invoice Preview
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-4 bg-white">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">
                      Clean Convictions
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Flat-Rate Residential & Commercial Cleaning
                  </p>
                  <p className="text-xs text-slate-500">Yuma, Arizona • cleanconvictions.com</p>
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Invoice
                  </span>
                  <h3 className="font-mono text-lg font-bold text-slate-900">
                    {selectedInvoiceForPrint.invoiceNumber}
                  </h3>
                  <span
                    className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      selectedInvoiceForPrint.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedInvoiceForPrint.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Billed To & Dates */}
              <div className="grid grid-cols-2 gap-6 my-6 text-xs">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Billed To:
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {selectedInvoiceForPrint.clientName}
                  </h4>
                  <p className="text-slate-600">{selectedInvoiceForPrint.clientAddress}</p>
                  <p className="text-slate-600">{selectedInvoiceForPrint.clientPhone}</p>
                  {selectedInvoiceForPrint.clientEmail && (
                    <p className="text-slate-600">{selectedInvoiceForPrint.clientEmail}</p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div>
                    <span className="text-slate-400">Issue Date: </span>
                    <span className="font-semibold text-slate-800">
                      {selectedInvoiceForPrint.issueDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Service Date: </span>
                    <span className="font-semibold text-slate-800">
                      {selectedInvoiceForPrint.serviceDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Payment Due: </span>
                    <span className="font-semibold text-slate-800">Upon Service Completion</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-xs text-left mb-6">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Service Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoiceForPrint.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3 font-medium text-slate-800">{item.description}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ${item.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-end border-t border-slate-200 pt-4">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-medium text-slate-900">
                      ${selectedInvoiceForPrint.subtotal}
                    </span>
                  </div>

                  {selectedInvoiceForPrint.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Loyalty / Frequency Discount:</span>
                      <span>-${selectedInvoiceForPrint.discountTotal}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Total Flat Rate:</span>
                    <span className="text-base text-emerald-700">
                      ${selectedInvoiceForPrint.totalAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guarantee & Payment Instructions */}
              <div className="mt-8 pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Clean Convictions 24-Hour Re-Clean Guarantee</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  We guarantee satisfaction. If any spot was missed and reported within 24 hours of service, we will promptly re-clean it free of charge.
                </p>
                <p className="text-[11px] text-slate-600 pt-1 font-medium">
                  Accepted Payments: Zelle (instant confirmation), Cash, or Check payable to Clean Convictions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Custom Invoice</h3>
            <p className="text-xs text-slate-500 mb-4">
              Draft an invoice or receipt for a client.
            </p>

            <form onSubmit={handleCreateNewInvoice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Client:</label>
                <select
                  value={formClientId}
                  onChange={(e) => {
                    setFormClientId(e.target.value);
                    const c = clients.find((client) => client.id === e.target.value);
                    if (c) {
                      setFormAmount(c.agreedRate);
                      setFormDesc(`${c.defaultProgram.toUpperCase()} Home Cleaning (${c.sqft} sq ft)`);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — ${c.agreedRate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Line Description:</label>
                <input
                  type="text"
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Cleaning / Service Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={formServiceDate}
                    onChange={(e) => setFormServiceDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Flat Rate Amount ($):</label>
                  <input
                    type="number"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms / Notes:</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow cursor-pointer"
                >
                  Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
