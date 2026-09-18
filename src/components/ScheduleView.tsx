import React, { useState, useEffect, useMemo } from 'react';
import { JobAppointment, Client, BlockedTime, CleaningProgram, PricingSettings } from '../types';
import { optimizeDailyRoute, RouteOptimizationResult } from '../utils/routeOptimizer';
import { buildSmsLink } from '../utils/contactLinks';
import { TIME_SLOT_PRESETS, CUSTOM_TIME_VALUE } from '../utils/timeSlots';
import {
  Calendar,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  Play,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Plus,
  Receipt,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Navigation,
  Ban,
  Trash2,
  List,
  Grid,
  CalendarDays,
  Wrench,
  Coffee,
  Car,
  Palmtree,
  Check,
  X,
  ArrowRight,
  Timer,
  Search,
  Filter,
  Megaphone,
} from 'lucide-react';

interface ScheduleViewProps {
  jobs: JobAppointment[];
  clients: Client[];
  blockedTimes: BlockedTime[];
  onUpdateJobStatus: (jobId: string, status: JobAppointment['status'], minutes?: number) => void;
  onOpenChecklist: (jobId: string) => void;
  onCreateInvoiceFromJob: (job: JobAppointment) => void;
  onAddJob: (job: Omit<JobAppointment, 'id' | 'checklist'>) => void;
  onDeleteJob?: (jobId: string) => void;
  onAddBlockedTime: (blocked: Omit<BlockedTime, 'id'>) => void;
  onDeleteBlockedTime: (id: string) => void;
  onUpdateJobRouteOrder?: (orderedJobs: { id: string; routeOrder: number; timeSlot?: string }[]) => void;
  settings?: PricingSettings;
  onAssignJob?: (jobId: string, assignedTo: string) => void;
  onCancelJob?: (jobId: string, reason?: string) => void;
  onRescheduleJob?: (jobId: string, date: string, timeSlot: string) => void;
  onDraftOnMyWay?: (job: JobAppointment) => void;
  onDuplicateJob?: (jobId: string, date: string, timeSlot: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  jobs,
  clients,
  blockedTimes,
  onUpdateJobStatus,
  onOpenChecklist,
  onCreateInvoiceFromJob,
  onAddJob,
  onDeleteJob,
  onAddBlockedTime,
  onDeleteBlockedTime,
  onUpdateJobRouteOrder,
  settings,
  onAssignJob,
  onCancelJob,
  onRescheduleJob,
  onDraftOnMyWay,
  onDuplicateJob,
}) => {
  const teamMembers = settings?.teamMembers || [];

  const handleCancelClick = (jobId: string) => {
    if (!onCancelJob) return;
    const reason = window.prompt('Cancellation reason (optional):') || undefined;
    onCancelJob(jobId, reason);
  };

  const handleRescheduleClick = (job: JobAppointment) => {
    if (!onRescheduleJob) return;
    const newDate = window.prompt('Reschedule to which date? (YYYY-MM-DD)', job.date);
    if (!newDate) return;
    const newTimeSlot = window.prompt('Time slot for the new date?', job.timeSlot) || job.timeSlot;
    onRescheduleJob(job.id, newDate, newTimeSlot);
  };

  const handleDuplicateClick = (job: JobAppointment) => {
    if (!onDuplicateJob) return;
    const newDate = window.prompt('Duplicate this job to which date? (YYYY-MM-DD)', job.date);
    if (!newDate) return;
    onDuplicateJob(job.id, newDate, job.timeSlot);
  };
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'all'>('daily');
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);

  // Appointment deletion modal state
  const [jobToDelete, setJobToDelete] = useState<JobAppointment | null>(null);

  // All Appointments list view filters
  const [allSearchTerm, setAllSearchTerm] = useState('');
  const [allStatusFilter, setAllStatusFilter] = useState<'all' | 'scheduled' | 'in-progress' | 'completed'>('all');
  const [allSortOrder, setAllSortOrder] = useState<'date-desc' | 'date-asc'>('date-desc');

  // Live timer state
  const [activeTimerJobId, setActiveTimerJobId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Modals
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [isBlockTimeModalOpen, setIsBlockTimeModalOpen] = useState(false);
  const [isRouteOptimizerOpen, setIsRouteOptimizerOpen] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteOptimizationResult | null>(null);

  // New Job Form State
  const [jobClientId, setJobClientId] = useState<string>(clients[0]?.id || '');
  const [jobClientName, setJobClientName] = useState<string>('');
  const [jobClientPhone, setJobClientPhone] = useState<string>('');
  const [jobClientAddress, setJobClientAddress] = useState<string>('');
  const [jobDate, setJobDate] = useState<string>(selectedDate);
  const [jobTimeSlot, setJobTimeSlot] = useState<string>(TIME_SLOT_PRESETS[1].label);
  const [jobCustomTime, setJobCustomTime] = useState<string>('');
  const [jobHelpersNeeded, setJobHelpersNeeded] = useState<number>(1);
  const [jobProgram, setJobProgram] = useState<CleaningProgram>('regular');
  const [jobPrice, setJobPrice] = useState<number>(125);
  const [jobNotes, setJobNotes] = useState<string>('');

  // Blocked Time Form State
  const [blockDate, setBlockDate] = useState<string>(selectedDate);
  const [blockTitle, setBlockTitle] = useState<string>('Equipment Maintenance');
  const [blockTimeSlot, setBlockTimeSlot] = useState<string>('1:00 PM - 3:00 PM');
  const [blockCategory, setBlockCategory] = useState<BlockedTime['category']>('maintenance');
  const [blockNotes, setBlockNotes] = useState<string>('');

  // Live on-site timer interval
  useEffect(() => {
    let interval: any = null;
    if (activeTimerJobId) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerJobId]);

  // Keep job date / block date in sync when selectedDate changes
  useEffect(() => {
    setJobDate(selectedDate);
    setBlockDate(selectedDate);
  }, [selectedDate]);

  // Jobs for the selected day, sorted by routeOrder if present, then timeSlot
  const dateJobs = useMemo(() => {
    return jobs
      .filter((j) => j.date === selectedDate)
      .sort((a, b) => {
        if (a.routeOrder !== undefined && b.routeOrder !== undefined) {
          return a.routeOrder - b.routeOrder;
        }
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [jobs, selectedDate]);

  // Blocked times for the selected day
  const dateBlockedTimes = useMemo(() => {
    return blockedTimes.filter((b) => b.date === selectedDate);
  }, [blockedTimes, selectedDate]);

  // Daily KPIs
  const totalDayRevenue = dateJobs.reduce((sum, j) => sum + j.price, 0);
  const completedJobs = dateJobs.filter((j) => j.status === 'completed').length;

  // Calculate 7 days for the current week based on selectedDate
  const currentWeekDays = useMemo(() => {
    const cur = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = cur.getDay(); // 0 is Sunday, 1 is Monday...
    // Start on Monday (adjust so Monday is index 0)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(cur);
    monday.setDate(cur.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [selectedDate]);

  const handleStartTimer = (jobId: string) => {
    setActiveTimerJobId(jobId);
    setElapsedSeconds(0);
    onUpdateJobStatus(jobId, 'in-progress');
  };

  const handleFinishTimer = (jobId: string) => {
    const minutes = Math.round(elapsedSeconds / 60) || 60;
    setActiveTimerJobId(null);
    onUpdateJobStatus(jobId, 'completed', minutes);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate + 'T00:00:00');
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const shiftWeek = (weeks: number) => {
    const cur = new Date(selectedDate + 'T00:00:00');
    cur.setDate(cur.getDate() + weeks * 7);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const handleOpenAddJobModal = (presetDate?: string) => {
    if (presetDate) setJobDate(presetDate);
    const firstClient = clients[0];
    if (firstClient) {
      setJobClientId(firstClient.id);
      setJobClientName(firstClient.name);
      setJobClientPhone(firstClient.phone);
      setJobClientAddress(firstClient.address);
      setJobProgram(firstClient.defaultProgram);
      setJobPrice(firstClient.agreedRate);
    }
    setIsAddJobModalOpen(true);
  };

  const handleSelectClientForJob = (clientId: string) => {
    setJobClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setJobClientName(client.name);
      setJobClientPhone(client.phone);
      setJobClientAddress(client.address);
      setJobProgram(client.defaultProgram);
      setJobPrice(client.agreedRate);
    }
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === jobClientId);
    const effectiveTime = jobTimeSlot === CUSTOM_TIME_VALUE
      ? (jobCustomTime.trim() || CUSTOM_TIME_VALUE)
      : jobTimeSlot;

    onAddJob({
      clientId: jobClientId || 'client-manual',
      clientName: jobClientName || (client ? client.name : 'Scheduled Client'),
      clientPhone: jobClientPhone || (client ? client.phone : ''),
      address: jobClientAddress || (client ? client.address : 'Yuma, AZ'),
      date: jobDate,
      timeSlot: effectiveTime,
      program: jobProgram,
      condition: client?.condition || 'standard',
      sqft: client?.sqft || 1800,
      bedrooms: client?.bedrooms || 3,
      bathrooms: client?.bathrooms || 2,
      selectedAddOns: client?.defaultAddOns || [],
      price: jobPrice,
      status: 'scheduled',
      notes: jobNotes || `Scheduled ${jobProgram} clean for ${jobClientName}`,
      helpersNeeded: jobHelpersNeeded,
    });

    setIsAddJobModalOpen(false);
    setSelectedDate(jobDate);
  };

  const handleSaveBlockedTime = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBlockedTime({
      date: blockDate,
      title: blockTitle,
      timeSlot: blockTimeSlot,
      category: blockCategory,
      notes: blockNotes,
    });
    setIsBlockTimeModalOpen(false);
  };

  const handleOpenRouteOptimizer = () => {
    const result = optimizeDailyRoute(dateJobs, selectedDate);
    setRouteResult(result);
    setIsRouteOptimizerOpen(true);
  };

  const handleApplyRouteSequence = () => {
    if (!routeResult || !onUpdateJobRouteOrder) return;
    const timeSlots = [
      '8:00 AM - 11:00 AM',
      '11:45 AM - 2:45 PM',
      '3:15 PM - 6:00 PM',
      '6:15 PM - 8:30 PM',
    ];

    const updates = routeResult.optimizedStops.map((stop, idx) => ({
      id: stop.job.id,
      routeOrder: stop.stopNumber,
      timeSlot: timeSlots[idx] || stop.job.timeSlot,
    }));

    onUpdateJobRouteOrder(updates);
    setIsRouteOptimizerOpen(false);
  };

  const getCategoryIcon = (category: BlockedTime['category']) => {
    switch (category) {
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-amber-600" />;
      case 'personal':
        return <Coffee className="w-3.5 h-3.5 text-blue-600" />;
      case 'travel':
        return <Car className="w-3.5 h-3.5 text-purple-600" />;
      case 'holiday':
        return <Palmtree className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Controls: Date Navigator, View Toggle, Actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Left: Date Navigation & Calendar Toggle */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => (viewMode === 'daily' ? shiftDate(-1) : shiftWeek(-1))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
                title={viewMode === 'daily' ? 'Previous Day' : 'Previous Week'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  selectedDate === todayStr ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                }`}
              >
                Today
              </button>

              <button
                onClick={() => (viewMode === 'daily' ? shiftDate(1) : shiftWeek(1))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
                title={viewMode === 'daily' ? 'Next Day' : 'Next Week'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Date Input with Calendar Icon */}
            <div className="flex items-center space-x-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-bold text-slate-900 text-xs bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            {/* Month Calendar Quick Picker Toggle */}
            <button
              onClick={() => setShowMonthCalendar(!showMonthCalendar)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center transition cursor-pointer ${
                showMonthCalendar
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Open Calendar Overview"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
              Month Calendar
            </button>
          </div>

          {/* Center: View Switcher (Daily Timeline vs Weekly Grid vs All Appointments) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start lg:self-auto flex-wrap gap-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 mr-1.5" />
              Daily Timeline
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 mr-1.5" />
              Weekly Schedule (7-Day)
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              All Appointments ({jobs.length})
            </button>
          </div>

          {/* Right: Primary Action Buttons */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Route Optimizer Button (Active if 2+ appointments on selected day) */}
            {dateJobs.length >= 2 && (
              <button
                onClick={handleOpenRouteOptimizer}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-xl font-bold text-xs flex items-center shadow-xs cursor-pointer transition border border-teal-500/30"
                title="Optimize driving route between appointments"
              >
                <Navigation className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                Optimize Route ({dateJobs.length} stops)
              </button>
            )}

            {/* Block Unavailable Time */}
            <button
              onClick={() => setIsBlockTimeModalOpen(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-semibold text-xs flex items-center transition cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
              Block Off Time
            </button>

            {/* Schedule New Job */}
            <button
              onClick={() => handleOpenAddJobModal()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center shadow cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Book Appointment
            </button>
          </div>
        </div>

        {/* Quick Month Calendar Drawer / Flyout */}
        {showMonthCalendar && (
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <CalendarDays className="w-4 h-4 mr-1.5 text-emerald-600" />
                Monthly Quick Select (Green = Cleans Scheduled • Amber = Blocked Times)
              </span>
              <button
                onClick={() => setShowMonthCalendar(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            {/* Render a 28-31 day selector strip for current month */}
            {(() => {
              const [year, month] = selectedDate.split('-').map(Number);
              const daysInMonth = new Date(year, month, 0).getDate();
              const days = [];
              for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const hasJobs = jobs.some((j) => j.date === dayStr);
                const hasBlocked = blockedTimes.some((b) => b.date === dayStr);
                const isSelected = dayStr === selectedDate;
                const isToday = dayStr === todayStr;

                days.push(
                  <button
                    key={dayStr}
                    onClick={() => {
                      setSelectedDate(dayStr);
                      setShowMonthCalendar(false);
                    }}
                    className={`p-2 rounded-xl text-center border text-xs transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                        : isToday
                        ? 'bg-white border-emerald-400 text-slate-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400 uppercase">
                      {new Date(dayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                    <span className="block text-sm font-semibold mt-0.5">{d}</span>
                    <div className="flex justify-center space-x-1 mt-1">
                      {hasJobs && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                      {hasBlocked && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-amber-200' : 'bg-amber-500'
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              }
              return (
                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-16 gap-1.5">
                  {days}
                </div>
              );
            })()}
          </div>
        )}

        {/* Day Metric Summary Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-slate-500">Scheduled on {selectedDate}: </span>
              <span className="font-bold text-slate-900">
                {dateJobs.length} {dateJobs.length === 1 ? 'Job' : 'Jobs'}
              </span>
              <span className="text-slate-400 ml-1">({completedJobs} completed)</span>
            </div>

            {dateBlockedTimes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg flex items-center">
                <Ban className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                <span className="font-bold">{dateBlockedTimes.length} Blocked Slot</span>
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <span className="text-emerald-700">Projected Revenue: </span>
              <span className="font-bold text-emerald-800 text-sm">${totalDayRevenue}</span>
            </div>
          </div>

          <div className="text-slate-500 text-[11px]">
            Clean Convictions Solo Operations • Yuma County
          </div>
        </div>
      </div>

      {/* Active On-Site Time Clock Banner */}
      {activeTimerJobId && (
        <div className="mb-6 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white p-4 rounded-2xl shadow-md border border-teal-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-3.5 h-3.5 rounded-full bg-teal-400 animate-ping" />
            <div>
              <span className="text-[11px] text-teal-400 font-bold uppercase tracking-wider block">
                Live On-Site Cleaning Clock
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-mono font-bold">{formatTimer(elapsedSeconds)}</span>
                <span className="text-xs text-slate-300 font-medium">
                  • {jobs.find((j) => j.id === activeTimerJobId)?.clientName}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenChecklist(activeTimerJobId)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold rounded-xl border border-teal-500/40 cursor-pointer flex items-center"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1" />
              Interactive Checklist
            </button>
            <button
              onClick={() => handleFinishTimer(activeTimerJobId)}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow flex items-center"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Finish Clean & Log Duration
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: DAILY TIMELINE VIEW */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Blocked Times on this Day */}
          {dateBlockedTimes.map((blocked) => (
            <div
              key={blocked.id}
              className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                  {getCategoryIcon(blocked.category)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      Blocked Time
                    </span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {blocked.timeSlot}
                    </span>
                    <span className="text-[11px] capitalize text-amber-600 bg-white border border-amber-200 px-2 py-0.5 rounded-md">
                      {blocked.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">{blocked.title}</h4>
                  {blocked.notes && (
                    <p className="text-xs text-amber-800/80 mt-0.5">{blocked.notes}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDeleteBlockedTime(blocked.id)}
                className="p-2 text-amber-600 hover:text-red-600 hover:bg-amber-100/50 rounded-lg transition cursor-pointer"
                title="Remove Blocked Time"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Empty State */}
          {dateJobs.length === 0 && dateBlockedTimes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No Appointments or Blocked Times for {selectedDate}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Your schedule is completely open for this day. You can book a cleaning appointment or block out time for maintenance and personal errands.
              </p>
              <div className="mt-5 flex items-center justify-center space-x-3">
                <button
                  onClick={() => handleOpenAddJobModal()}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Schedule Appointment
                </button>
                <button
                  onClick={() => setIsBlockTimeModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold hover:bg-amber-100 cursor-pointer"
                >
                  <Ban className="w-4 h-4 mr-1.5 text-amber-600" />
                  Block Unavailable Time
                </button>
              </div>
            </div>
          ) : (
            dateJobs.map((job, index) => {
              const isCompleted = job.status === 'completed';
              const isCancelled = job.status === 'cancelled';
              const isInProgress = job.status === 'in-progress' || activeTimerJobId === job.id;
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`;
              const stopNumber = job.routeOrder || index + 1;
              // A colored left-edge stripe so status reads at a glance without
              // parsing any text — teal=in progress, emerald=done, rose=cancelled,
              // amber=scheduled and waiting on you.
              const statusStripe = isInProgress
                ? 'border-l-teal-500'
                : isCompleted
                ? 'border-l-emerald-400'
                : isCancelled
                ? 'border-l-rose-400'
                : 'border-l-amber-400';

              return (
                <div
                  key={job.id}
                  className={`bg-white rounded-2xl border border-l-4 transition p-5 shadow-xs ${statusStripe} ${
                    isInProgress
                      ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/10'
                      : isCompleted
                      ? 'border-slate-200 bg-slate-50/40 opacity-90'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left Details */}
                    <div className="flex items-start space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 leading-none">Stop</span>
                        <span className="font-bold text-sm leading-none mt-0.5">{stopNumber}</span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-slate-500" />
                            {job.timeSlot}
                          </span>

                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              job.program === 'deep'
                                ? 'bg-purple-100 text-purple-800'
                                : job.program === 'move'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {job.program.toUpperCase()} CLEAN
                          </span>

                          {job.helpersNeeded && job.helpersNeeded > 1 && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                              {job.helpersNeeded} people needed
                            </span>
                          )}

                          {isCompleted && (
                            <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                              Completed {job.actualMinutes ? `(${job.actualMinutes}m)` : ''}
                            </span>
                          )}

                          {isInProgress && (
                            <span className="text-[11px] font-bold bg-teal-500 text-slate-950 px-2.5 py-0.5 rounded-full animate-pulse">
                              On-Site In Progress
                            </span>
                          )}

                          {job.assignedTo && (
                            <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                              👤 {job.assignedTo}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-2">
                          {job.clientName}
                        </h3>

                        {onAssignJob && teamMembers.length > 0 && (
                          <select
                            value={job.assignedTo || ''}
                            onChange={(e) => onAssignJob(job.id, e.target.value)}
                            className="mt-1.5 text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-pointer"
                          >
                            <option value="">Assign to…</option>
                            {teamMembers.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-600 mt-1">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-emerald-700 hover:underline"
                          >
                            <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            {job.address}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>

                          {job.clientPhone && (
                            <a
                              href={`tel:${job.clientPhone}`}
                              className="flex items-center text-slate-600 hover:text-slate-900"
                            >
                              <Phone className="w-3 h-3 mr-1 text-slate-400" />
                              {job.clientPhone}
                            </a>
                          )}

                          {job.clientPhone && (
                            <a
                              href={buildSmsLink(job.clientPhone, '')}
                              className="text-indigo-600 hover:text-indigo-800 underline"
                              title="Text via Google Voice"
                            >
                              Text
                            </a>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-slate-500 flex items-center space-x-2">
                          <span>
                            {job.sqft.toLocaleString()} sq ft • {job.bedrooms} bed / {job.bathrooms} bath
                          </span>
                          {job.selectedAddOns?.length > 0 && (
                            <span>• Add-ons: {job.selectedAddOns.join(', ')}</span>
                          )}
                        </div>

                        {job.notes && (
                          <div className="mt-2 text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-100 italic">
                            "{job.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Details: Price & On-Site Action Controls */}
                    <div className="flex flex-col sm:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <span className="text-xl font-bold text-slate-900">${job.price}</span>
                        <span className="text-xs text-slate-500 block">Flat Estimate</span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {/* Checklist button */}
                        <button
                          onClick={() => onOpenChecklist(job.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 mr-1 text-slate-600" />
                          Checklist
                        </button>

                        {/* Invoice button */}
                        <button
                          onClick={() => onCreateInvoiceFromJob(job)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          {job.invoiceId ? 'View Invoice' : 'Create Invoice'}
                        </button>

                        {onDraftOnMyWay && !isCompleted && job.status !== 'cancelled' && (
                          <button
                            onClick={() => onDraftOnMyWay(job)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                            title="Draft an 'on our way' heads-up message in Marketing Hub"
                          >
                            <Megaphone className="w-3.5 h-3.5 mr-1 text-teal-600" />
                            On My Way
                          </button>
                        )}

                        {/* On-Site Timer / Complete Actions */}
                        {!isCompleted && !isInProgress && (
                          <>
                            <button
                              onClick={() => handleStartTimer(job.id)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-lg text-xs font-bold flex items-center transition cursor-pointer shadow-xs"
                            >
                              <Play className="w-3 h-3 mr-1 text-teal-400" />
                              Start Clock
                            </button>

                            <button
                              onClick={() => onUpdateJobStatus(job.id, 'completed', 120)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center transition cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Mark Completed
                            </button>
                          </>
                        )}

                        {isInProgress && (
                          <button
                            onClick={() => handleFinishTimer(job.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center transition cursor-pointer shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Finish Clean
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            onClick={() => onUpdateJobStatus(job.id, 'scheduled')}
                            className="px-2.5 py-1 text-slate-400 hover:text-slate-700 text-xs rounded transition"
                          >
                            Revert to Scheduled
                          </button>
                        )}

                        {!isCompleted && job.status !== 'cancelled' && onCancelJob && (
                          <button
                            type="button"
                            onClick={() => handleCancelClick(job.id)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                            title="Cancel this appointment"
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </button>
                        )}

                        {job.status === 'cancelled' && onRescheduleJob && (
                          <button
                            type="button"
                            onClick={() => handleRescheduleClick(job)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                            title="Reschedule this appointment"
                          >
                            <ArrowRight className="w-3.5 h-3.5 mr-1" />
                            Reschedule
                          </button>
                        )}

                        {onDuplicateJob && (
                          <button
                            type="button"
                            onClick={() => handleDuplicateClick(job)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                            title="Duplicate this job to a new date"
                          >
                            Duplicate
                          </button>
                        )}

                        {onDeleteJob && (
                          <button
                            type="button"
                            onClick={() => setJobToDelete(job)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer ml-1"
                            title="Delete Scheduled Appointment"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: WEEKLY SCHEDULE VIEW (7-DAY GRID) */}
      {viewMode === 'weekly' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto">
          <div className="min-w-[980px]">
            {/* Week Header */}
            <div className="grid grid-cols-7 gap-3 mb-4 pb-3 border-b border-slate-100">
              {currentWeekDays.map((dayStr) => {
                const dayDate = new Date(dayStr + 'T00:00:00');
                const isSelected = dayStr === selectedDate;
                const isToday = dayStr === todayStr;
                const dayJobs = jobs.filter((j) => j.date === dayStr);
                const dayRevenue = dayJobs.reduce((sum, j) => sum + j.price, 0);

                return (
                  <div
                    key={dayStr}
                    onClick={() => setSelectedDate(dayStr)}
                    className={`p-2.5 rounded-xl cursor-pointer transition text-center ${
                      isSelected
                        ? 'bg-emerald-50 border border-emerald-300'
                        : isToday
                        ? 'bg-slate-50 border border-emerald-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-base font-bold text-slate-900 block">
                      {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="mt-1 text-[11px]">
                      {dayJobs.length > 0 ? (
                        <span className="font-bold text-emerald-700">
                          {dayJobs.length} {dayJobs.length === 1 ? 'clean' : 'cleans'} • ${dayRevenue}
                        </span>
                      ) : (
                        <span className="text-slate-400">Open</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 7 Columns for Jobs & Blocked Times */}
            <div className="grid grid-cols-7 gap-3">
              {currentWeekDays.map((dayStr) => {
                const dayJobs = jobs.filter((j) => j.date === dayStr);
                const dayBlocked = blockedTimes.filter((b) => b.date === dayStr);

                return (
                  <div
                    key={dayStr}
                    className="bg-slate-50/70 rounded-xl p-2 min-h-[420px] flex flex-col justify-between border border-slate-200/70"
                  >
                    <div className="space-y-2">
                      {/* Blocked Times in this day */}
                      {dayBlocked.map((b) => (
                        <div
                          key={b.id}
                          className="bg-amber-100/80 border border-amber-300 text-amber-900 rounded-lg p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] uppercase tracking-wider">
                              Blocked
                            </span>
                            <button
                              onClick={() => onDeleteBlockedTime(b.id)}
                              className="text-amber-700 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="font-bold text-xs mt-0.5 truncate">{b.title}</p>
                          <p className="text-[10px] text-amber-800">{b.timeSlot}</p>
                        </div>
                      ))}

                      {/* Jobs in this day */}
                      {dayJobs.map((j) => {
                        const isCompleted = j.status === 'completed';
                        return (
                          <div
                            key={j.id}
                            className={`bg-white rounded-xl p-2.5 border shadow-2xs transition text-xs ${
                              isCompleted
                                ? 'border-slate-200 bg-slate-100/70 opacity-85'
                                : 'border-slate-200 hover:border-emerald-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500">
                                {j.timeSlot.split('-')[0]}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  j.program === 'deep'
                                    ? 'bg-purple-100 text-purple-800'
                                    : j.program === 'move'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {j.program.toUpperCase()}
                              </span>
                            </div>

                            <h5 className="font-bold text-slate-900 mt-1 truncate">{j.clientName}</h5>
                            <p className="text-[10px] text-slate-500 truncate">{j.address}</p>

                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="font-bold text-slate-900">${j.price}</span>
                              <div className="flex items-center space-x-1.5">
                                {isCompleted ? (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                                    <Check className="w-3 h-3 mr-0.5" /> Done
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => onUpdateJobStatus(j.id, 'completed', 120)}
                                    className="text-[10px] text-emerald-700 hover:underline font-bold"
                                  >
                                    Complete
                                  </button>
                                )}
                                {onDeleteJob && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setJobToDelete(j);
                                    }}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer transition"
                                    title="Delete Scheduled Appointment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {dayJobs.length === 0 && dayBlocked.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          No jobs
                        </div>
                      )}
                    </div>

                    {/* Quick Add Button on Column Bottom */}
                    <button
                      onClick={() => handleOpenAddJobModal(dayStr)}
                      className="w-full mt-2 py-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Job
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ALL APPOINTMENTS LIST VIEW */}
      {viewMode === 'all' && (
        <div className="space-y-4">
          {/* Controls Bar for All Appointments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search appointments by client name, phone, address, or date (YYYY-MM-DD)..."
                value={allSearchTerm}
                onChange={(e) => setAllSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <select
                value={allStatusFilter}
                onChange={(e: any) => setAllStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">All Statuses ({jobs.length})</option>
                <option value="scheduled">Scheduled ({jobs.filter((j) => j.status === 'scheduled').length})</option>
                <option value="in-progress">In-Progress ({jobs.filter((j) => j.status === 'in-progress').length})</option>
                <option value="completed">Completed ({jobs.filter((j) => j.status === 'completed').length})</option>
              </select>

              <select
                value={allSortOrder}
                onChange={(e: any) => setAllSortOrder(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
              >
                <option value="date-desc">Newest / Furthest Out First</option>
                <option value="date-asc">Chronological (Oldest / Earliest)</option>
              </select>

              <button
                type="button"
                onClick={() => handleOpenAddJobModal()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center shadow-xs cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Book Appointment
              </button>
            </div>
          </div>

          {/* Appointments List */}
          {(() => {
            const filteredAllJobs = jobs
              .filter((j) => {
                const matchesStatus = allStatusFilter === 'all' || j.status === allStatusFilter;
                const term = allSearchTerm.toLowerCase();
                const matchesSearch =
                  !term ||
                  j.clientName.toLowerCase().includes(term) ||
                  j.address.toLowerCase().includes(term) ||
                  j.phone.includes(term) ||
                  j.date.includes(term) ||
                  j.timeSlot.toLowerCase().includes(term);
                return matchesStatus && matchesSearch;
              })
              .sort((a, b) => {
                if (allSortOrder === 'date-asc') {
                  return a.date.localeCompare(b.date);
                }
                return b.date.localeCompare(a.date);
              });

            if (filteredAllJobs.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-800">No Scheduled Appointments Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {allSearchTerm
                      ? `No appointments match "${allSearchTerm}". Try clearing your search.`
                      : 'There are no cleaning appointments booked in the system.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddJobModal()}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Book First Appointment
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredAllJobs.map((job) => {
                  const isToday = job.date === todayStr;
                  const isCompleted = job.status === 'completed';
                  const isInProgress = job.status === 'in-progress';
                  const formattedDate = new Date(job.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: Date, Client & Time */}
                      <div className="flex items-start space-x-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 text-center ${
                            isToday
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isCompleted
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider -mb-0.5">
                            {new Date(job.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-base font-extrabold leading-none">
                            {new Date(job.date + 'T00:00:00').getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h3 className="text-sm font-bold text-slate-900">{job.clientName}</h3>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isInProgress
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {job.status}
                            </span>
                            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold capitalize border border-emerald-100">
                              {job.program} Clean
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 flex-wrap gap-y-1">
                            <span className="font-semibold text-slate-700 flex items-center">
                              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                              {formattedDate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center text-slate-700">
                              <Clock className="w-3 h-3 mr-1 text-slate-400" />
                              {job.timeSlot}
                            </span>
                            <span>•</span>
                            <span className="flex items-center text-slate-700">
                              <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                              {job.address}
                            </span>
                            {job.phone && (
                              <>
                                <span>•</span>
                                <a
                                  href={`tel:${job.phone}`}
                                  className="text-slate-600 hover:text-emerald-600 flex items-center"
                                >
                                  <Phone className="w-3 h-3 mr-1 text-slate-400" />
                                  {job.phone}
                                </a>
                              </>
                            )}
                          </div>

                          {job.notes && (
                            <p className="text-xs text-slate-500 mt-1 italic">
                              Notes: "{job.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Flat rate & Clear Delete / Manage Actions */}
                      <div className="flex items-center space-x-2.5 self-end lg:self-auto flex-wrap gap-y-2">
                        <div className="text-right px-3 py-1 bg-slate-50 rounded-xl border border-slate-100 mr-1">
                          <span className="text-[10px] text-slate-400 block -mb-0.5">Agreed Rate</span>
                          <span className="text-base font-extrabold text-slate-900">${job.price}</span>
                        </div>

                        {/* View in Daily Timeline */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(job.date);
                            setViewMode('daily');
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                          title="Open this day in daily schedule"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          View Day
                        </button>

                        {/* Checklist */}
                        <button
                          type="button"
                          onClick={() => onOpenChecklist(job.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Checklist
                        </button>

                        {/* Status Toggle */}
                        {job.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => onUpdateJobStatus(job.id, 'in-progress')}
                            className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition cursor-pointer"
                          >
                            <Play className="w-3 h-3 mr-1 fill-current" />
                            Start Clean
                          </button>
                        )}

                        {job.status === 'in-progress' && (
                          <button
                            type="button"
                            onClick={() => onUpdateJobStatus(job.id, 'completed', 120)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition cursor-pointer"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Complete
                          </button>
                        )}

                        {/* Prominent Delete Appointment Button */}
                        {onDeleteJob && (
                          <button
                            type="button"
                            onClick={() => setJobToDelete(job)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center transition cursor-pointer shadow-2xs"
                            title="Delete this scheduled appointment"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1 text-red-600" />
                            Delete Appointment
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
      {isAddJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Book Cleaning Appointment</h3>
                <p className="text-xs text-slate-500">
                  Select an existing customer or enter job details for route scheduling.
                </p>
              </div>
              <button
                onClick={() => setIsAddJobModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-3.5">
              {/* Client Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer:
                </label>
                <select
                  value={jobClientId}
                  onChange={(e) => handleSelectClientForJob(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-emerald-500"
                >
                  <option value="">-- Custom / New Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}) • Agreed: ${c.agreedRate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name:
                </label>
                <input
                  type="text"
                  required
                  value={jobClientName}
                  onChange={(e) => setJobClientName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number:
                  </label>
                  <input
                    type="tel"
                    value={jobClientPhone}
                    onChange={(e) => setJobClientPhone(e.target.value)}
                    placeholder="(928) 555-0100"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cleaning Program:
                  </label>
                  <select
                    value={jobProgram}
                    onChange={(e) => setJobProgram(e.target.value as CleaningProgram)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="regular">Regular / Maintenance</option>
                    <option value="deep">Deep Clean</option>
                    <option value="move">Move In / Move Out</option>
                    <option value="office">Commercial / Office</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Address:
                </label>
                <input
                  type="text"
                  required
                  value={jobClientAddress}
                  onChange={(e) => setJobClientAddress(e.target.value)}
                  placeholder="e.g. 1420 E 24th St, Yuma, AZ 85365"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Date of Cleaning:
                  </label>
                  <input
                    type="date"
                    required
                    value={jobDate}
                    onChange={(e) => setJobDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                  {/* Quick Date Presets */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setJobDate(new Date().toISOString().split('T')[0])}
                      className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setJobDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setJobDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Time Slot / Arrival:
                  </label>
                  <select
                    value={jobTimeSlot}
                    onChange={(e) => setJobTimeSlot(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {TIME_SLOT_PRESETS.map((p) => (
                      <option key={p.id} value={p.label}>{p.label}</option>
                    ))}
                    <option value={CUSTOM_TIME_VALUE}>Custom Time...</option>
                  </select>
                  {jobTimeSlot === CUSTOM_TIME_VALUE && (
                    <input
                      type="text"
                      placeholder="e.g. 9:00 AM - 12:30 PM"
                      value={jobCustomTime}
                      onChange={(e) => setJobCustomTime(e.target.value)}
                      className="mt-1.5 w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Helpers Needed On-Site (including you):
                </label>
                <input
                  type="number"
                  min={1}
                  value={jobHelpersNeeded}
                  onChange={(e) => setJobHelpersNeeded(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agreed Flat Price ($):
                </label>
                <input
                  type="number"
                  min="50"
                  required
                  value={jobPrice}
                  onChange={(e) => setJobPrice(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cleaner On-Site Notes & Special Instructions:
                </label>
                <textarea
                  rows={2}
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Gate code, pet instructions, focus areas..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow cursor-pointer"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BLOCK OFF UNAVAILABLE TIME */}
      {isBlockTimeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Ban className="w-4 h-4 mr-2 text-amber-600" />
                  Block Off Unavailable Time
                </h3>
                <p className="text-xs text-slate-500">
                  Reserve time for equipment maintenance, van resupply, doctor visits, or personal time.
                </p>
              </div>
              <button
                onClick={() => setIsBlockTimeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlockedTime} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title / Reason:
                </label>
                <input
                  type="text"
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="e.g. Van Maintenance & Resupply"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category:
                  </label>
                  <select
                    value={blockCategory}
                    onChange={(e) => setBlockCategory(e.target.value as BlockedTime['category'])}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="maintenance">Equipment / Van Maintenance</option>
                    <option value="personal">Personal / Family</option>
                    <option value="travel">Drive Buffer / Supplies</option>
                    <option value="holiday">Vacation / Day Off</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Time Slot:
                </label>
                <select
                  value={blockTimeSlot}
                  onChange={(e) => setBlockTimeSlot(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="11:30 AM - 1:00 PM">11:30 AM - 1:00 PM (Lunch & Restock)</option>
                  <option value="1:00 PM - 4:00 PM">1:00 PM - 4:00 PM (Afternoon Block)</option>
                  <option value="8:00 AM - 12:00 PM">8:00 AM - 12:00 PM (Morning Block)</option>
                  <option value="All Day">All Day (Unavailable)</option>
                  <option value="Custom Slot">Custom Slot</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Notes:
                </label>
                <textarea
                  rows={2}
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  placeholder="Restocking botanical cleaners, microfiber laundry..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBlockTimeModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow cursor-pointer"
                >
                  Block This Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ROUTE OPTIMIZATION TOOL */}
      {isRouteOptimizerOpen && routeResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Navigation className="w-5 h-5 mr-2 text-teal-600" />
                  Yuma Daily Route Optimizer
                </h3>
                <p className="text-xs text-slate-500">
                  Sequences appointments to eliminate criss-crossing Yuma and Foothills.
                </p>
              </div>
              <button
                onClick={() => setIsRouteOptimizerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Savings Banner */}
            <div className="mb-4 bg-gradient-to-r from-teal-950 to-slate-900 p-4 rounded-xl text-white border border-teal-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-teal-300 font-bold uppercase tracking-wider block">
                  Route Optimization Analysis
                </span>
                <span className="text-base font-bold text-white">
                  {routeResult.optimizedStops.length} Stops Scheduled on {routeResult.date}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-300 block">Est. Drive Time Saved</span>
                <span className="text-lg font-bold text-teal-300">
                  ~{routeResult.estimatedMinutesSaved} mins
                </span>
              </div>
            </div>

            {/* Stop Progression */}
            <div className="space-y-3 mb-6">
              <div className="text-xs font-semibold text-slate-600">
                Recommended Stop Sequence:
              </div>

              {routeResult.optimizedStops.map((stop, idx) => (
                <div
                  key={stop.job.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {stop.stopNumber}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{stop.job.clientName}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          {stop.areaName}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block truncate max-w-sm">
                        {stop.job.address}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="font-bold text-emerald-700">${stop.job.price}</span>
                    <span className="text-[11px] text-slate-400 block">
                      +{stop.estimatedDriveMinutesFromPrev}m drive
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <a
                href={routeResult.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center transition"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Launch Multi-Stop Google Maps
              </a>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsRouteOptimizerOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApplyRouteSequence}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow cursor-pointer flex items-center"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Apply Sequence to Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: CONFIRM APPOINTMENT DELETION */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-red-50 p-5 border-b border-red-100 flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Scheduled Appointment?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to delete this cleaning appointment? This will permanently remove it from your schedule and route.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900">{jobToDelete.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Scheduled Date:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(jobToDelete.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    • {jobToDelete.timeSlot}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Service Program:</span>
                  <span className="font-semibold capitalize text-emerald-700">
                    {jobToDelete.program} Clean (${jobToDelete.price} flat)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Address:</span>
                  <span className="text-slate-700 text-right truncate max-w-[200px]">
                    {jobToDelete.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="capitalize font-semibold text-slate-700">
                    {jobToDelete.status}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Note: Deleting an appointment removes it from your daily route and timeline. If the client simply rescheduled, you can update the booking date instead.
              </p>
            </div>

            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setJobToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel / Keep Appointment
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteJob && jobToDelete) {
                    onDeleteJob(jobToDelete.id);
                  }
                  setJobToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition cursor-pointer flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Yes, Delete Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
