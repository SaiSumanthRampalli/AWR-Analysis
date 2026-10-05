import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Search, 
  Check, 
  Trash2, 
  Plus, 
  Settings, 
  ShieldCheck, 
  Layers, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { RunbookPhase, VerificationItem } from '../types/awr';
import { initialRunbookPhases } from '../data/runbookPhases';

interface ManagePredefinedChecksModalProps {
  isOpen: boolean;
  onClose: () => void;
  phases: RunbookPhase[];
  removedPredefinedItems: VerificationItem[];
  onRemovePredefinedCheck: (itemId: string) => void;
  onRestorePredefinedCheck: (item: VerificationItem) => void;
  onRestoreAllPredefined: () => void;
}

export const ManagePredefinedChecksModal: React.FC<ManagePredefinedChecksModalProps> = ({
  isOpen,
  onClose,
  phases,
  removedPredefinedItems,
  onRemovePredefinedCheck,
  onRestorePredefinedCheck,
  onRestoreAllPredefined
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'active' | 'removed'>('all');

  if (!isOpen) return null;

  // Flatten all predefined factory items from initialRunbookPhases
  const allFactoryItems: (VerificationItem & { phaseTitle: string; phaseNumber: string })[] = [];
  initialRunbookPhases.forEach(p => {
    p.items.forEach(i => {
      allFactoryItems.push({
        ...i,
        phaseTitle: p.title,
        phaseNumber: p.number
      });
    });
  });

  // Map of active item IDs
  const activeIdsSet = new Set<string>();
  phases.forEach(p => p.items.forEach(i => activeIdsSet.add(i.id)));

  // Removed item IDs set
  const removedIdsSet = new Set<string>(removedPredefinedItems.map(i => i.id));

  // Count active vs removed
  const totalPredefined = allFactoryItems.length;
  const activePredefinedCount = allFactoryItems.filter(i => activeIdsSet.has(i.id)).length;
  const removedPredefinedCount = totalPredefined - activePredefinedCount;

  // Filtered items
  const filteredItems = allFactoryItems.filter(item => {
    const isActive = activeIdsSet.has(item.id);
    if (viewFilter === 'active' && !isActive) return false;
    if (viewFilter === 'removed' && isActive) return false;
    if (selectedPhase !== 'all' && item.phaseId !== selectedPhase) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        item.title.toLowerCase().includes(q) ||
        item.metricName.toLowerCase().includes(q) ||
        item.awrSection.toLowerCase().includes(q) ||
        item.verificationAction.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-850 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Manage Predefined Runbook Checklists</span>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {activePredefinedCount} / {totalPredefined} Active
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add or remove any of the factory 8-phase Oracle verification checks to customize your active DBA audit checklist.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {removedPredefinedCount > 0 && (
              <button
                onClick={onRestoreAllPredefined}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded transition-colors flex items-center gap-1.5"
                title="Restore all removed factory checks"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restore All ({removedPredefinedCount})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search predefined checks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              aria-label="Filter by Phase"
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Phases</option>
              {initialRunbookPhases.map(p => (
                <option key={p.id} value={p.id}>
                  Phase {p.number}: {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewFilter === 'all' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({totalPredefined})
            </button>
            <button
              onClick={() => setViewFilter('active')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewFilter === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({activePredefinedCount})
            </button>
            <button
              onClick={() => setViewFilter('removed')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewFilter === 'removed' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Removed ({removedPredefinedCount})
            </button>
          </div>
        </div>

        {/* Predefined Checks List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-10 text-center text-slate-400 text-xs">
              No predefined checks match your filter criteria.
            </div>
          ) : (
            filteredItems.map(item => {
              const isActive = activeIdsSet.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        Phase {item.phaseNumber}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {item.awrSection}
                      </span>
                      <span className="text-slate-600">·</span>
                      <h4 className={`text-xs font-semibold ${isActive ? 'text-slate-200' : 'text-slate-400 line-through'}`}>
                        {item.title}
                      </h4>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Metric: <strong className="text-slate-300 font-mono">{item.metricName}</strong></span>
                      <span className="text-slate-600">·</span>
                      <span>Normal: <span className="text-emerald-400">{item.normalThreshold}</span></span>
                      <span className="text-slate-600">·</span>
                      <span>Warn: <span className="text-amber-400">{item.warningThreshold}</span></span>
                      <span className="text-slate-600">·</span>
                      <span>Crit: <span className="text-rose-400">{item.criticalThreshold}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isActive ? (
                      <button
                        onClick={() => onRemovePredefinedCheck(item.id)}
                        className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 rounded transition-colors flex items-center gap-1.5"
                        title="Remove this predefined check from active runbook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Check</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onRestorePredefinedCheck(item)}
                        className="px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded transition-colors flex items-center gap-1.5"
                        title="Add this check back into active runbook"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add Back to Runbook</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{activePredefinedCount} of {totalPredefined} predefined checks active in runbook</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
