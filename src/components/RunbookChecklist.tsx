import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  MinusCircle, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  BookOpen, 
  Code2, 
  AlertCircle,
  Lightbulb,
  Trash2,
  Plus,
  Settings,
  RotateCcw,
  Sparkles,
  CheckSquare,
  Download
} from 'lucide-react';
import { RunbookPhase, VerificationItem, VerificationStatus } from '../types/awr';

interface RunbookChecklistProps {
  phases: RunbookPhase[];
  onUpdateItemStatus: (itemId: string, status: VerificationStatus) => void;
  onUpdateItemValue: (itemId: string, value: string) => void;
  onUpdateItemNotes: (itemId: string, notes: string) => void;
  onBulkUpdateStatus: (status: VerificationStatus) => void;
  onRemoveCheck: (itemId: string) => void;
  onOpenPerformedChecksModal: () => void;
  onOpenAddCustomModal: () => void;
  onOpenManagePredefinedModal: () => void;
  onOpenExportHub?: () => void;
  removedPredefinedCount?: number;
  onRestoreAllPredefined?: () => void;
}

export const RunbookChecklist: React.FC<RunbookChecklistProps> = ({
  phases,
  onUpdateItemStatus,
  onUpdateItemValue,
  onUpdateItemNotes,
  onBulkUpdateStatus,
  onRemoveCheck,
  onOpenPerformedChecksModal,
  onOpenAddCustomModal,
  onOpenManagePredefinedModal,
  onOpenExportHub,
  removedPredefinedCount = 0,
  onRestoreAllPredefined
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopySql = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-xs">
            <XCircle className="w-3.5 h-3.5" /> Critical
          </span>
        );
      case 'na':
        return (
          <span className="inline-flex items-center gap-1 text-slate-500 font-mono text-xs">
            <MinusCircle className="w-3.5 h-3.5" /> N/A
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-xs">
            <HelpCircle className="w-3.5 h-3.5" /> Unverified
          </span>
        );
    }
  };

  // Metrics
  const allItems = phases.flatMap(p => p.items);
  const totalChecks = allItems.length;
  const performedChecks = allItems.filter(i => i.status !== 'unverified' || (i.currentValue && i.currentValue.trim() !== '')).length;
  const customChecksCount = allItems.filter(i => i.isCustom).length;

  // Filter items
  const filteredPhases = phases.map(phase => {
    const items = phase.items.filter(item => {
      const matchesSearch = 
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.metricName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.awrSection.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.verificationAction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.currentValue && item.currentValue.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPhase = selectedPhaseFilter === 'all' || phase.id === selectedPhaseFilter;
      const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;

      return matchesSearch && matchesPhase && matchesStatus;
    });

    return {
      ...phase,
      items
    };
  }).filter(phase => phase.items.length > 0);

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Runbook Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5 max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100">
              Oracle AWR Verification Runbook
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              8-phase diagnostic verification protocol and threshold validation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={onOpenAddCustomModal}
              className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Check</span>
            </button>

            <button
              onClick={onOpenManagePredefinedModal}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Manage Rules</span>
            </button>

            <button
              onClick={() => onBulkUpdateStatus('pass')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors cursor-pointer"
            >
              Mark All Nominal
            </button>

            <button
              onClick={() => {
                const allExpanded = Object.keys(expandedItems).length > 5;
                if (allExpanded) {
                  setExpandedItems({});
                } else {
                  const map: Record<string, boolean> = {};
                  phases.forEach(p => p.items.forEach(i => { map[i.id] = true; }));
                  setExpandedItems(map);
                }
              }}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors cursor-pointer"
            >
              {Object.keys(expandedItems).length > 5 ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Notice if predefined checks are removed */}
        {removedPredefinedCount > 0 && (
          <div className="mt-4 p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>{removedPredefinedCount} predefined checks</strong> have been removed from the active verification runbook.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onRestoreAllPredefined && (
                <button
                  onClick={onRestoreAllPredefined}
                  className="px-2.5 py-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore All Predefined</span>
                </button>
              )}
              <button
                onClick={onOpenManagePredefinedModal}
                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                Manage
              </button>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search metrics, AWR section, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              aria-label="Filter by Phase"
              value={selectedPhaseFilter}
              onChange={(e) => setSelectedPhaseFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Diagnostic Phases</option>
              {phases.map(p => (
                <option key={p.id} value={p.id}>
                  Phase {p.number}: {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter by Status"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Verification Statuses</option>
              <option value="unverified">Unverified Only</option>
              <option value="pass">Pass (Nominal)</option>
              <option value="warning">Warning Threshold</option>
              <option value="critical">Critical Threshold</option>
              <option value="na">Not Applicable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Phases and Checklist Items */}
      {filteredPhases.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400 space-y-3">
          <p className="text-sm">No verification rules match your filter criteria.</p>
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={() => { setSearchQuery(''); setSelectedPhaseFilter('all'); setSelectedStatusFilter('all'); }}
              className="text-xs text-amber-400 hover:underline"
            >
              Clear Filters
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={onOpenAddCustomModal}
              className="text-xs text-indigo-400 hover:underline"
            >
              + Add Custom Check
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPhases.map(phase => (
            <div key={phase.id} className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              {/* Phase Header */}
              <div className="bg-slate-800/60 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    PHASE {phase.number}
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">{phase.title}</h2>
                    <p className="text-xs text-slate-400">{phase.shortDesc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-slate-400">
                    {phase.items.filter(i => i.status !== 'unverified' || (i.currentValue && i.currentValue.trim() !== '')).length}/{phase.items.length} Performed
                  </div>
                  <button
                    onClick={onOpenAddCustomModal}
                    className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-700/50 transition-colors"
                    title="Add custom check to this phase"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-800/80">
                {phase.items.map(item => {
                  const isExpanded = !!expandedItems[item.id];

                  return (
                    <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-850/40 transition-colors">
                      {/* Main Item Header Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-400">{item.awrSection}</span>
                            <span className="text-slate-600">·</span>
                            {item.isCustom && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                                CUSTOM
                              </span>
                            )}
                            <h3 className="text-sm font-semibold text-slate-200 hover:text-amber-300 transition-colors">
                              {item.title}
                            </h3>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Metric: <strong className="text-slate-300 font-mono">{item.metricName}</strong></span>
                            {item.formula && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="font-mono text-slate-400">Rule: {item.formula}</span>
                              </>
                            )}
                            {item.currentValue && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="font-mono text-amber-300 font-medium">Observed: {item.currentValue}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Controls & Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Current Status Indicator */}
                          <div className="mr-1">
                            {getStatusBadge(item.status)}
                          </div>

                          {/* Quick Status Buttons */}
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
                            <button
                              onClick={() => onUpdateItemStatus(item.id, 'pass')}
                              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                item.status === 'pass' 
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Mark as Normal/Pass"
                            >
                              Pass
                            </button>
                            <button
                              onClick={() => onUpdateItemStatus(item.id, 'warning')}
                              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                item.status === 'warning' 
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Mark as Warning"
                            >
                              Warn
                            </button>
                            <button
                              onClick={() => onUpdateItemStatus(item.id, 'critical')}
                              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                item.status === 'critical' 
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Mark as Critical"
                            >
                              Crit
                            </button>
                            <button
                              onClick={() => onUpdateItemStatus(item.id, 'na')}
                              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                item.status === 'na' 
                                  ? 'bg-slate-800 text-slate-300' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                              title="Mark as Not Applicable"
                            >
                              N/A
                            </button>
                          </div>

                          {/* Remove Check Button */}
                          <button
                            onClick={() => onRemoveCheck(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            title={item.isCustom ? "Delete custom check" : "Remove predefined check from active runbook"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Diagnostic Deep-Dive */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 text-xs">
                          {/* Thresholds Matrix */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded p-2.5">
                              <div className="text-emerald-400 font-semibold mb-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Normal Threshold
                              </div>
                              <p className="text-slate-300">{item.normalThreshold}</p>
                            </div>

                            <div className="bg-amber-950/20 border border-amber-900/40 rounded p-2.5">
                              <div className="text-amber-400 font-semibold mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Warning Threshold
                              </div>
                              <p className="text-slate-300">{item.warningThreshold}</p>
                            </div>

                            <div className="bg-rose-950/20 border border-rose-900/40 rounded p-2.5">
                              <div className="text-rose-400 font-semibold mb-1 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Critical Threshold
                              </div>
                              <p className="text-slate-300">{item.criticalThreshold}</p>
                            </div>
                          </div>

                          {/* Points to be Noted & DBA Pitfalls */}
                          <div className="bg-slate-950/80 border border-slate-800 rounded p-3">
                            <div className="text-amber-400 font-semibold mb-1.5 flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5" /> Points to be Noted & DBA Sanity Checks
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-slate-300">
                              {item.pointsToNote.map((pt, idx) => (
                                <li key={idx} className="leading-relaxed">{pt}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Diagnostic Verification Action */}
                          <div className="bg-indigo-950/20 border border-indigo-900/40 rounded p-3">
                            <div className="text-indigo-300 font-semibold mb-1 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" /> Diagnostic Verification Action
                            </div>
                            <p className="text-slate-200 leading-relaxed">{item.verificationAction}</p>
                          </div>

                          {/* Diagnostic Query with Copy Button */}
                          {item.diagnosticQuery && (
                            <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden min-w-0 max-w-full">
                              <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-slate-400">
                                <span className="font-mono text-xs flex items-center gap-1.5 text-slate-300">
                                  <Code2 className="w-3.5 h-3.5 text-amber-500" /> Live Verification SQL
                                </span>
                                <button
                                  onClick={() => handleCopySql(item.id, item.diagnosticQuery!)}
                                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                  {copiedQueryId === item.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy SQL</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-3 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed max-w-full">
                                {item.diagnosticQuery}
                              </pre>
                            </div>
                          )}

                          {/* Observed Value & Findings Notes */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                            <div>
                              <label className="block text-slate-400 text-xs mb-1 font-medium">
                                Observed Value in AWR:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 18.2ms or AAS = 42"
                                value={item.currentValue || ''}
                                onChange={(e) => onUpdateItemValue(item.id, e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-slate-400 text-xs mb-1 font-medium">
                                DBA Findings / Incident Notes:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Storage switch port flapping observed during 09:00 snap"
                                value={item.notes || ''}
                                onChange={(e) => onUpdateItemNotes(item.id, e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
