import React from 'react';
import {
  Client,
  JobAppointment,
  Invoice,
  Expense,
  HelperShift,
} from '../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Receipt,
  CalendarDays,
  Gift,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface DashboardViewProps {
  clients: Client[];
  jobs: JobAppointment[];
  invoices: Invoice[];
  expenses: Expense[];
  helperShifts: HelperShift[];
  onNavigate: (tab: 'schedule' | 'invoices' | 'expenses' | 'clients') => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const thisMonthPrefix = () => new Date().toISOString().slice(0, 7); // YYYY-MM

export const DashboardView: React.FC<DashboardViewProps> = ({
  clients,
  jobs,
  invoices,
  expenses,
  helperShifts,
  onNavigate,
}) => {
  const monthPrefix = thisMonthPrefix();
  const today = todayStr();

  const monthRevenue = invoices
    .filter((i) => i.status === 'paid' && (i.paidDate || i.issueDate || '').startsWith(monthPrefix))
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const monthExpenses = expenses
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + e.amount, 0);

  const monthHelperPay = helperShifts
    .filter((h) => h.date.startsWith(monthPrefix))
    .reduce((sum, h) => sum + h.payAmount, 0);

  const netProfit = monthRevenue - monthExpenses - monthHelperPay;

  const unpaidTotal = invoices
    .filter((i) => i.status === 'unpaid')
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const unpaidCount = invoices.filter((i) => i.status === 'unpaid').length;

  const todayJobs = jobs.filter((j) => j.date === today && j.status !== 'cancelled');
  const weekAheadStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const upcomingJobs = jobs
    .filter((j) => j.date >= today && j.date <= weekAheadStr && j.status !== 'cancelled' && j.status !== 'completed')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const activeClients = clients.filter((c) => c.status === 'active').length;

  const referralCreditsOwed = clients.reduce((sum, c) => sum + (c.referralCreditBalance || 0), 0);

  const unpaidInvoices = invoices
    .filter((i) => i.status === 'unpaid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const lowStockItems = expenses.filter((e) => e.isLowStock);

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Business Overview</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Where Clean Convictions stands right now, at a glance.
        </p>
      </div>

      {lowStockItems.length > 0 && (
        <button
          onClick={() => onNavigate('expenses')}
          className="w-full mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-center gap-2 text-left hover:bg-amber-100 transition-colors cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <span className="font-semibold">Running low on supplies: </span>
            {lowStockItems.map((e) => e.description).join(', ')}
          </span>
        </button>
      )}

      {/* Financial stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Revenue This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            ${monthRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">Paid invoices, this calendar month</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Costs This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            ${(monthExpenses + monthHelperPay).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            ${monthExpenses.toLocaleString()} expenses + ${monthHelperPay.toLocaleString()} helper pay
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Profit This Month
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-black ${
              netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            ${netProfit.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">Revenue minus costs, this month</span>
        </div>

        <button
          onClick={() => onNavigate('invoices')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs text-left hover:border-amber-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            ${unpaidTotal.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold flex items-center">
            {unpaidCount} unpaid <ArrowRight className="w-3 h-3 ml-1" />
          </span>
        </button>
      </div>

      {/* Ops stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => onNavigate('schedule')}
          className="bg-slate-900 text-white rounded-xl p-4 text-left hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center text-xs text-slate-400 mb-1">
            <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
            Today
          </div>
          <div className="text-xl font-bold">{todayJobs.length} {todayJobs.length === 1 ? 'Job' : 'Jobs'}</div>
        </button>

        <div className="bg-slate-900 text-white rounded-xl p-4">
          <div className="flex items-center text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
            Next 7 Days
          </div>
          <div className="text-xl font-bold">{upcomingJobs.length} Scheduled</div>
        </div>

        <button
          onClick={() => onNavigate('clients')}
          className="bg-slate-900 text-white rounded-xl p-4 text-left hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center text-xs text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
            Active Clients
          </div>
          <div className="text-xl font-bold">{activeClients}</div>
        </button>

        <div className="bg-slate-900 text-white rounded-xl p-4">
          <div className="flex items-center text-xs text-slate-400 mb-1">
            <Gift className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
            Referral Credits Owed
          </div>
          <div className="text-xl font-bold">${referralCreditsOwed.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming jobs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming (Next 7 Days)
            </h3>
            <button
              onClick={() => onNavigate('schedule')}
              className="text-xs text-emerald-700 font-semibold hover:underline"
            >
              View schedule
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingJobs.length === 0 && (
              <p className="p-4 text-xs text-slate-400">Nothing scheduled in the next week.</p>
            )}
            {upcomingJobs.map((j) => (
              <div key={j.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{j.clientName}</span>
                  <span className="text-slate-400 ml-2">
                    {new Date(j.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {j.timeSlot}
                  </span>
                </div>
                <span className="font-bold text-slate-900">${j.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid invoices */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Oldest Unpaid Invoices
            </h3>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-emerald-700 font-semibold hover:underline"
            >
              View invoices
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {unpaidInvoices.length === 0 && (
              <p className="p-4 text-xs text-slate-400">Nothing outstanding — nice.</p>
            )}
            {unpaidInvoices.map((inv) => (
              <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{inv.clientName}</span>
                  <span className="text-slate-400 ml-2">Due {inv.dueDate}</span>
                </div>
                <span className="font-bold text-amber-600">${inv.totalAmount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
