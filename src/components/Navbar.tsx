import React, { useState, useMemo } from 'react';
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
  Menu,
  X,
  Megaphone,
  Search,
  Inbox as InboxIcon,
  Handshake,
  Package,
} from 'lucide-react';
import { JobAppointment, Invoice, Client } from '../types';

export type AppTab =
  | 'dashboard'
  | 'estimator'
  | 'schedule'
  | 'checklist'
  | 'clients'
  | 'invoices'
  | 'expenses'
  | 'team'
  | 'supplies'
  | 'marketing'
  | 'inbox'
  | 'partners'
  | 'settings'
  | 'referrals';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  jobs: JobAppointment[];
  invoices: Invoice[];
  clients?: Client[];
  activeJobId?: string;
  pendingReferralsCount?: number;
  unreadEmailCount?: number;
  lowStockCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  jobs,
  invoices,
  clients = [],
  activeJobId,
  unreadEmailCount = 0,
  lowStockCount = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { clients: [], jobs: [], invoices: [] };
    return {
      clients: clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q)).slice(0, 5),
      jobs: jobs.filter((j) => j.clientName.toLowerCase().includes(q) || j.address.toLowerCase().includes(q) || j.date.includes(q)).slice(0, 5),
      invoices: invoices.filter((i) => i.clientName.toLowerCase().includes(q) || i.invoiceNumber.toLowerCase().includes(q)).slice(0, 5),
    };
  }, [searchQuery, clients, jobs, invoices]);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayJobs = jobs.filter((j) => j.date === todayStr);
  const pendingJobsCount = todayJobs.filter((j) => j.status !== 'completed').length;

  // Calculate this month's revenue
  const totalPaidRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  // Each section gets its own color so "where am I" is a glance, not a read —
  // handy for anyone (ADHD or not) who navigates faster by color than by text.
  const TAB_COLORS: Record<AppTab, { active: string; icon: string }> = {
    dashboard: { active: 'bg-indigo-500 text-slate-950', icon: 'text-indigo-400' },
    estimator: { active: 'bg-violet-500 text-slate-950', icon: 'text-violet-400' },
    schedule: { active: 'bg-amber-500 text-slate-950', icon: 'text-amber-400' },
    checklist: { active: 'bg-teal-500 text-slate-950', icon: 'text-teal-400' },
    clients: { active: 'bg-pink-500 text-slate-950', icon: 'text-pink-400' },
    invoices: { active: 'bg-emerald-500 text-slate-950', icon: 'text-emerald-400' },
    expenses: { active: 'bg-orange-500 text-slate-950', icon: 'text-orange-400' },
    team: { active: 'bg-sky-500 text-slate-950', icon: 'text-sky-400' },
    supplies: { active: 'bg-yellow-500 text-slate-950', icon: 'text-yellow-400' },
    marketing: { active: 'bg-fuchsia-500 text-slate-950', icon: 'text-fuchsia-400' },
    inbox: { active: 'bg-cyan-500 text-slate-950', icon: 'text-cyan-400' },
    partners: { active: 'bg-rose-500 text-slate-950', icon: 'text-rose-400' },
    referrals: { active: 'bg-lime-500 text-slate-950', icon: 'text-lime-400' },
    settings: { active: 'bg-slate-400 text-slate-950', icon: 'text-slate-400' },
  };

  const NAV_ITEMS: {
    id: AppTab;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'estimator', label: 'Pricing Estimator', icon: <Calculator className="w-4 h-4" /> },
    {
      id: 'schedule',
      label: 'Route & Schedule',
      icon: <CalendarDays className="w-4 h-4" />,
      badge:
        todayJobs.length > 0 ? (
          <span
            className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'schedule' ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {todayJobs.length}
          </span>
        ) : undefined,
    },
    {
      id: 'checklist',
      label: 'Job Checklist',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: activeJobId ? <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" /> : undefined,
    },
    { id: 'clients', label: 'Clients & Leads', icon: <Users className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices & Revenue', icon: <Receipt className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Wallet className="w-4 h-4" /> },
    { id: 'team', label: 'Team', icon: <UserCog className="w-4 h-4" /> },
    {
      id: 'supplies',
      label: 'Supplies',
      icon: <Package className="w-4 h-4" />,
      badge:
        lowStockCount > 0 ? (
          <span
            className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'supplies' ? 'bg-slate-900 text-rose-400' : 'bg-rose-500 text-slate-950'
            }`}
          >
            {lowStockCount}
          </span>
        ) : undefined,
    },
    { id: 'marketing', label: 'Marketing', icon: <Megaphone className="w-4 h-4" /> },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: <InboxIcon className="w-4 h-4" />,
      badge:
        unreadEmailCount > 0 ? (
          <span
            className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'inbox' ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {unreadEmailCount}
          </span>
        ) : undefined,
    },
    { id: 'partners', label: 'Partners', icon: <Handshake className="w-4 h-4" /> },
    {
      id: 'referrals',
      label: 'Referral System',
      icon: <Gift className="w-4 h-4" />,
      badge: (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
          $25
        </span>
      ),
    },
    { id: 'settings', label: 'Rates Config', icon: <Settings className="w-4 h-4" /> },
  ];

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);

  const handleSelect = (tab: AppTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Logo & Brand Identity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight text-white">Clean Convictions</h1>
                  <span className="hidden sm:inline text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Solo Cleaner Hub
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-slate-400">
                  Flat-rate estimator & solo operations • cleanconvictions.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {/* Global search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
                className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer"
              >
                <Search className="w-4.5 h-4.5" />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                className="md:hidden w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Live Business Pulse Stats — compact 2-up grid on mobile, single row from sm up */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-slate-400 shrink-0">Today:</span>
              <span className="font-semibold text-white truncate">
                {todayJobs.length} {todayJobs.length === 1 ? 'Job' : 'Jobs'}
              </span>
              {pendingJobsCount > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded shrink-0">
                  {pendingJobsCount} left
                </span>
              )}
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
              <span className="text-slate-400 shrink-0">Paid Ledger:</span>
              <span className="font-semibold text-emerald-400 truncate">${totalPaidRevenue.toLocaleString()}</span>
            </div>

            <div className="hidden lg:flex items-center text-xs text-teal-300 bg-teal-950/40 border border-teal-800/40 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-teal-400" />
              <span>24-Hour Free Re-Clean Standard</span>
            </div>
          </div>
        </div>

        {/* Desktop / tablet navigation — horizontal, wraps instead of scrolling sideways */}
        <nav className="hidden md:flex flex-wrap gap-1.5 py-2 border-t border-slate-800/80 text-sm font-medium">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => handleSelect(item.id)}
              className={`flex items-center px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === item.id
                  ? `${TAB_COLORS[item.id].active} font-semibold shadow`
                  : `text-slate-300 hover:text-white hover:bg-slate-800`
              }`}
            >
              <span className={`mr-2 flex items-center ${activeTab === item.id ? '' : TAB_COLORS[item.id].icon}`}>{item.icon}</span>
              {item.label}
              {item.badge && <span className="ml-1.5 flex items-center">{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Mobile current-tab bar — tap to open the full menu below */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="md:hidden w-full flex items-center justify-between py-2.5 border-t border-slate-800/80 text-sm font-semibold cursor-pointer"
        >
          <span className="flex items-center gap-2 text-white">
            <span className={activeItem ? TAB_COLORS[activeItem.id].icon : ''}>{activeItem?.icon}</span>
            {activeItem?.label}
          </span>
          <span className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            {activeItem?.badge}
            <Menu className="w-4 h-4" />
          </span>
        </button>
      </div>

      {/* Mobile menu — full vertical list, no horizontal scrolling */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900">
          <nav className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                id={`nav-tab-mobile-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium cursor-pointer ${
                  activeTab === item.id
                    ? `${TAB_COLORS[item.id].active} font-semibold`
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center">
                  <span className={`mr-3 flex items-center ${activeTab === item.id ? '' : TAB_COLORS[item.id].icon}`}>{item.icon}</span>
                  {item.label}
                </span>
                {item.badge}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-20">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients, appointments, invoices..."
                className="flex-1 text-sm text-slate-900 focus:outline-none"
              />
              <button onClick={closeSearch} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {searchQuery.trim() && (
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {searchResults.clients.length === 0 && searchResults.jobs.length === 0 && searchResults.invoices.length === 0 && (
                  <p className="p-4 text-xs text-slate-400 text-center">No matches found.</p>
                )}

                {searchResults.clients.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Clients</p>
                    {searchResults.clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveTab('clients');
                          closeSearch();
                        }}
                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 text-xs cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="text-slate-400">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.jobs.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Appointments</p>
                    {searchResults.jobs.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => {
                          setActiveTab('schedule');
                          closeSearch();
                        }}
                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 text-xs cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">{j.clientName}</span>
                        <span className="text-slate-400">{j.date}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.invoices.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoices</p>
                    {searchResults.invoices.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => {
                          setActiveTab('invoices');
                          closeSearch();
                        }}
                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 text-xs cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">{i.invoiceNumber} • {i.clientName}</span>
                        <span className="text-slate-400">${i.totalAmount}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
