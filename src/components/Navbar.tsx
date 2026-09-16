import React from 'react';
import {
  Calculator,
  CalendarDays,
  CheckSquare,
  Users,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Gift,
  LayoutDashboard,
  Wallet,
  UserCog,
} from 'lucide-react';
import { JobAppointment, Invoice } from '../types';

export type AppTab =
  | 'dashboard'
  | 'estimator'
  | 'schedule'
  | 'checklist'
  | 'clients'
  | 'invoices'
  | 'expenses'
  | 'team'
  | 'settings'
  | 'referrals';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  jobs: JobAppointment[];
  invoices: Invoice[];
  activeJobId?: string;
  pendingReferralsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  jobs,
  invoices,
  activeJobId,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayJobs = jobs.filter((j) => j.date === todayStr);
  const pendingJobsCount = todayJobs.filter((j) => j.status !== 'completed').length;
  
  // Calculate this month's revenue
  const totalPaidRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20">
                <Sparkles className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-white">Clean Convictions</h1>
                  <span className="text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Solo Cleaner Hub
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Flat-rate estimator & solo operations • cleanconvictions.com
                </p>
              </div>
            </div>

            {/* Mobile quick guarantee badge */}
            <div className="md:hidden flex items-center text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              <span>24h Guarantee</span>
            </div>
          </div>

          {/* Live Business Pulse Stats */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 md:pb-0">
            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Today:</span>
              <span className="font-semibold text-white">
                {todayJobs.length} {todayJobs.length === 1 ? 'Job' : 'Jobs'}
              </span>
              {pendingJobsCount > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                  {pendingJobsCount} left
                </span>
              )}
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Paid Ledger:</span>
              <span className="font-semibold text-emerald-400">${totalPaidRevenue.toLocaleString()}</span>
            </div>

            <div className="hidden lg:flex items-center text-xs text-teal-300 bg-teal-950/40 border border-teal-800/40 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-teal-400" />
              <span>24-Hour Free Re-Clean Standard</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-800/80 text-sm font-medium">
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </button>

          <button
            id="nav-tab-estimator"
            onClick={() => setActiveTab('estimator')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'estimator'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Pricing Estimator
          </button>

          <button
            id="nav-tab-schedule"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer relative ${
              activeTab === 'schedule'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Route & Schedule
            {todayJobs.length > 0 && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'schedule' ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {todayJobs.length}
              </span>
            )}
          </button>

          <button
            id="nav-tab-checklist"
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'checklist'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Job Checklist
            {activeJobId && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
            )}
          </button>

          <button
            id="nav-tab-clients"
            onClick={() => setActiveTab('clients')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Clients & Leads
          </button>

          <button
            id="nav-tab-invoices"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Invoices & Revenue
          </button>

          <button
            id="nav-tab-expenses"
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4 mr-2" />
            Expenses
          </button>

          <button
            id="nav-tab-team"
            onClick={() => setActiveTab('team')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'team'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCog className="w-4 h-4 mr-2" />
            Team
          </button>

          <button
            id="nav-tab-referrals"
            onClick={() => setActiveTab('referrals')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer relative ${
              activeTab === 'referrals'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gift className="w-4 h-4 mr-2" />
            Referral System
            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              $25
            </span>
          </button>

          <button
            id="nav-tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Rates Config
          </button>
        </nav>
      </div>
    </header>
  );
};
