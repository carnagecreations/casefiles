import React, { useState } from 'react';
import { JobAppointment, ChecklistItem } from '../types';
import {
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ClipboardList,
  Filter,
  Check,
  RotateCcw,
  Send,
  MessageSquare,
} from 'lucide-react';

interface ChecklistViewProps {
  jobs: JobAppointment[];
  selectedJobId?: string;
  onToggleCheckItem: (jobId: string, itemId: string) => void;
  onMarkAllCompleted: (jobId: string) => void;
  onSaveJobNotes: (jobId: string, notes: string) => void;
  onCompleteJob: (jobId: string) => void;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  jobs,
  selectedJobId,
  onToggleCheckItem,
  onMarkAllCompleted,
  onSaveJobNotes,
  onCompleteJob,
}) => {
  // Find current job or default to the first in-progress/scheduled
  const activeJob =
    jobs.find((j) => j.id === selectedJobId) ||
    jobs.find((j) => j.status === 'in-progress') ||
    jobs.find((j) => j.status === 'scheduled') ||
    jobs[0];

  const [currentJobId, setCurrentJobId] = useState<string>(activeJob?.id || '');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [onSiteNote, setOnSiteNote] = useState<string>(activeJob?.notes || '');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  const job = jobs.find((j) => j.id === currentJobId) || activeJob;

  if (!job) {
    return (
      <div className="py-12 max-w-4xl mx-auto px-4 text-center">
        <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Active Jobs for Checklist</h3>
        <p className="text-xs text-slate-500 mt-1">
          Create an appointment in the Estimator or Schedule to start your on-site cleaning checklist.
        </p>
      </div>
    );
  }

  const checklist = job.checklist || [];
  const completedCount = checklist.filter((item) => item.isCompleted).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const categories = [
    { id: 'all', label: 'All Tasks' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'bathrooms', label: 'Bathrooms' },
    { id: 'living', label: 'Living Areas' },
    { id: 'bedrooms', label: 'Bedrooms' },
    { id: 'add-ons', label: 'Special Add-Ons' },
    { id: 'wrap-up', label: 'Wrap-Up & Quality' },
  ];

  const filteredTasks = checklist.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.room === activeCategory;
  });

  const handleSaveNotes = () => {
    onSaveJobNotes(job.id, onSiteNote);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  const handleCompleteAndCertify = () => {
    onCompleteJob(job.id);
  };

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Header & Job Switcher */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                On-Site Quality Protocol
              </span>
              <span className="text-xs text-slate-400">Clean Convictions Standard</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Job Quality Checklist & Walkthrough
            </h2>
          </div>

          {/* Job Dropdown Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Select Job:</span>
            <select
              value={job.id}
              onChange={(e) => {
                setCurrentJobId(e.target.value);
                const selected = jobs.find((j) => j.id === e.target.value);
                setOnSiteNote(selected?.notes || '');
              }}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 cursor-pointer focus:outline-emerald-500"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.clientName} — {j.date} ({j.program.toUpperCase()} • ${j.price})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Job Overview Card */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Client</span>
            <span className="font-bold text-slate-900">{job.clientName}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Address</span>
            <span className="font-medium text-slate-800 truncate block">{job.address}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Service Program</span>
            <span className="font-bold text-emerald-700 capitalize">
              {job.program} Clean • ${job.price}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Status</span>
            <span className={`font-bold capitalize ${
              job.status === 'completed' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {job.status}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-bold text-slate-700 flex items-center">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Checklist Completion: {completedCount} of {totalCount} completed
            </span>
            <span className="font-mono font-bold text-emerald-700">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categories Tabs & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onMarkAllCompleted(job.id)}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Check All
          </button>
        </div>
      </div>

      {/* Checklist Tasks List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 mb-6">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No specific items for this room category.
          </div>
        ) : (
          filteredTasks.map((item) => (
            <div
              key={item.id}
              onClick={() => onToggleCheckItem(job.id, item.id)}
              className={`p-3.5 sm:p-4 flex items-start space-x-3 cursor-pointer transition select-none hover:bg-slate-50/60 ${
                item.isCompleted ? 'bg-emerald-50/20' : ''
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition shrink-0 ${
                  item.isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {item.isCompleted && <Check className="w-3.5 h-3.5" />}
              </div>

              <div className="flex-1">
                <span
                  className={`text-xs sm:text-sm font-medium transition ${
                    item.isCompleted
                      ? 'line-through text-slate-400'
                      : 'text-slate-800'
                  }`}
                >
                  {item.task}
                </span>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                  {item.room}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* On-Site Scratchpad & Re-Clean Guarantee Certification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cleaner On-Site Notes */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              On-Site Cleaner Log & Scratchpad
            </span>
            {noteSavedFeedback && (
              <span className="text-[11px] text-emerald-600 font-semibold">Saved!</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Document pre-existing blemishes, key lockbox return, or special notes for the client.
          </p>
          <textarea
            rows={3}
            value={onSiteNote}
            onChange={(e) => setOnSiteNote(e.target.value)}
            placeholder="e.g. Master shower grout had pre-existing etching. Lockbox returned to hose bib..."
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-emerald-500 mb-2"
          />
          <button
            onClick={handleSaveNotes}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Save Job Note
          </button>
        </div>

        {/* 24-Hour Guarantee & Certification */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 border border-slate-700 text-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Clean Convictions 24-Hour Quality Promise</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-2">
              Ready to Certify Clean Completion?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Upon final walkthrough and completing the checklist, mark the job complete. This locks the timestamp and prepares the invoice for delivery.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-700">
            <span className="text-xs text-slate-400 font-mono">
              Status: <strong className="text-white uppercase">{job.status}</strong>
            </span>
            {job.status !== 'completed' ? (
              <button
                onClick={handleCompleteAndCertify}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold flex items-center shadow cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Certify & Mark Completed
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" />
                Verified & Completed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
