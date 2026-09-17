import React, { useState } from 'react';
import { Lightbulb, X, Plus, Check, Trash2 } from 'lucide-react';
import { QuickNote } from '../types';

interface QuickCaptureButtonProps {
  notes: QuickNote[];
  onAdd: (text: string) => void;
  onToggleDone: (id: string, isDone: boolean) => void;
  onDelete: (id: string) => void;
}

// A single always-available "capture this thought" button, floating in the
// corner on every screen. The point is zero friction: see something you
// need to remember, tap once, type it, done — without losing your place in
// whatever you were actually doing. Open items badge the button so nothing
// quietly gets forgotten in the drawer.
export const QuickCaptureButton: React.FC<QuickCaptureButtonProps> = ({
  notes,
  onAdd,
  onToggleDone,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const openCount = notes.filter((n) => !n.isDone).length;
  const sorted = [...notes].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const handleAdd = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Quick capture a thought"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
      >
        <Lightbulb className="w-6 h-6" />
        {openCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {openCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-slate-900">Quick Capture</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                  }}
                  placeholder="Jot it down before you lose it…"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleAdd}
                  disabled={!draft.trim()}
                  className="w-9 h-9 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Not a to-do list with due dates — just a fast place to park a thought so you can get back to what you were doing.
              </p>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100">
              {sorted.length === 0 && (
                <p className="p-6 text-center text-xs text-slate-400">Nothing captured yet.</p>
              )}
              {sorted.map((n) => (
                <div key={n.id} className="flex items-start gap-2 px-4 py-3">
                  <button
                    onClick={() => onToggleDone(n.id, !n.isDone)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer ${
                      n.isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {n.isDone && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <p className={`flex-1 text-sm ${n.isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {n.text}
                  </p>
                  <button
                    onClick={() => onDelete(n.id)}
                    className="text-slate-300 hover:text-rose-600 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
