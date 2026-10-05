import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MinusCircle, 
  HelpCircle, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Code2, 
  Trash2, 
  Plus, 
  Share2, 
  Download, 
  BookOpen, 
  Sparkles,
  ShieldCheck,
  Layers,
  Settings,
  FileSpreadsheet,
  FileText,
  Printer,
  FileCode
} from 'lucide-react';
import { RunbookPhase, VerificationItem, VerificationStatus, AwrBenchmarkScenario, HotspotItem } from '../types/awr';
import { ParsedAwrReport } from '../utils/awrParser';
import { 
  exportToMarkdown, 
  exportToPdf, 
  exportToCsv, 
  exportToExcel, 
  exportToWord,
  ExportReportData
} from '../utils/exportUtils';

interface PerformedChecklistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  phases: RunbookPhase[];
  onUpdateItemStatus: (itemId: string, status: VerificationStatus) => void;
  onRemoveCheck: (itemId: string) => void;
  onOpenAddCustomModal: () => void;
  onOpenManagePredefinedModal: () => void;
  activeReportName?: string;
  activeReport?: ParsedAwrReport | null;
  selectedScenario?: AwrBenchmarkScenario | null;
  hotspots?: HotspotItem[];
  completeSqlTexts?: Record<string, string>;
}

export const PerformedChecklistsModal: React.FC<PerformedChecklistsModalProps> = ({
  isOpen,
  onClose,
  phases,
  onUpdateItemStatus,
  onRemoveCheck,
  onOpenAddCustomModal,
  onOpenManagePredefinedModal,
  activeReportName,
  activeReport,
  selectedScenario,
  hotspots,
  completeSqlTexts
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [customOnly, setCustomOnly] = useState<boolean>(false);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  if (!isOpen) return null;

  // Flatten all items across phases
  const allItems: (VerificationItem & { phaseTitle: string; phaseNumber: string })[] = [];
  phases.forEach(phase => {
    phase.items.forEach(item => {
      allItems.push({
        ...item,
        phaseTitle: phase.title,
        phaseNumber: phase.number
      });
    });
  });

  // Filter to checks that have been performed (status is not 'unverified' or has an observed value)
  const performedItems = allItems.filter(item => item.status !== 'unverified' || (item.currentValue && item.currentValue.trim() !== ''));

  // Metrics
  const totalPerformed = performedItems.length;
  const criticalCount = performedItems.filter(i => i.status === 'critical').length;
  const warningCount = performedItems.filter(i => i.status === 'warning').length;
  const passCount = performedItems.filter(i => i.status === 'pass').length;
  const naCount = performedItems.filter(i => i.status === 'na').length;
  const customCount = performedItems.filter(i => i.isCustom).length;

  // Filtered list
  const filteredList = performedItems.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (phaseFilter !== 'all' && item.phaseId !== phaseFilter) return false;
    if (customOnly && !item.isCustom) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        item.title.toLowerCase().includes(q) ||
        item.metricName.toLowerCase().includes(q) ||
        item.awrSection.toLowerCase().includes(q) ||
        (item.currentValue && item.currentValue.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleCopySql = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  const handleCopySummary = () => {
    let summary = `# Oracle AWR Performed Checklists Audit Summary\n`;
    summary += `Report: ${activeReportName || 'Custom Evaluation'}\n`;
    summary += `Generated: ${new Date().toUTCString()}\n`;
    summary += `Storage Policy: 100% In-Memory (Zero File Data Persisted)\n\n`;
    summary += `## Overview Metrics\n`;
    summary += `- Total Checks Performed: ${totalPerformed}\n`;
    summary += `- Critical Issues: ${criticalCount}\n`;
    summary += `- Warnings: ${warningCount}\n`;
    summary += `- Nominal / Passed: ${passCount}\n`;
    summary += `- Not Applicable (N/A): ${naCount}\n`;
    summary += `- Custom Checks Evaluated: ${customCount}\n\n`;
    summary += `## Performed Check Details\n\n`;

    performedItems.forEach((item, index) => {
      summary += `### ${index + 1}. [${item.status.toUpperCase()}] ${item.title} (Phase ${item.phaseNumber})\n`;
      summary += `- **AWR Section:** ${item.awrSection}\n`;
      summary += `- **Metric:** ${item.metricName}\n`;
      if (item.currentValue) summary += `- **Observed Value in AWR:** ${item.currentValue}\n`;
      summary += `- **Threshold Criteria:** Normal: ${item.normalThreshold} | Warn: ${item.warningThreshold} | Crit: ${item.criticalThreshold}\n`;
      if (item.notes) summary += `- **Findings / Notes:** ${item.notes}\n`;
      summary += `- **Verification Action:** ${item.verificationAction}\n`;
      if (item.diagnosticQuery) summary += `- **Verification SQL:** \`${item.diagnosticQuery.replace(/\n/g, ' ')}\`\n`;
      summary += `\n`;
    });

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const getExportData = (): ExportReportData => ({
    reportDate: new Date().toISOString().split('T')[0],
    activeReport,
    selectedScenario,
    phases,
    checklistItems: performedItems,
    hotspots: hotspots || [],
    completeSqlTexts
  });

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Critical
          </span>
        );
      case 'na':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <MinusCircle className="w-3.5 h-3.5" /> N/A
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400">
            <HelpCircle className="w-3.5 h-3.5" /> Unverified
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden min-w-0 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Performed Verification Checklists</span>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {totalPerformed} Evaluated
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspection results and cross-checks performed against {activeReportName ? <strong className="text-amber-300">{activeReportName}</strong> : 'the active verification session'}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              onClick={() => exportToExcel(getExportData(), 'AWR_Performed_Checklists')}
              className="px-2.5 py-1.5 text-xs bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 rounded transition-colors flex items-center gap-1 font-medium"
              title="Export Performed Checks to Microsoft Excel (.xls)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => exportToWord(getExportData(), 'AWR_Performed_Checklists')}
              className="px-2.5 py-1.5 text-xs bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800 rounded transition-colors flex items-center gap-1 font-medium"
              title="Export Performed Checks to Word (.doc)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
            <button
              onClick={() => exportToPdf(getExportData(), 'AWR_Performed_Checklists')}
              className="px-2.5 py-1.5 text-xs bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 rounded transition-colors flex items-center gap-1 font-medium"
              title="Download Performed Checks as PDF (.pdf)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => exportToMarkdown(getExportData(), 'AWR_Performed_Checklists')}
              className="px-2.5 py-1.5 text-xs bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800 rounded transition-colors flex items-center gap-1 font-medium"
              title="Export to Markdown (.md)"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => exportToCsv(getExportData(), 'AWR_Performed_Checklists')}
              className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors flex items-center gap-1"
              title="Export to CSV (.csv)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors flex items-center gap-1.5"
              title="Copy markdown summary of performed checks"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedSummary ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button
            onClick={() => { setStatusFilter('all'); setCustomOnly(false); }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              statusFilter === 'all' && !customOnly
                ? 'bg-slate-800 border-amber-500/50 text-slate-100'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400">Total Performed</div>
            <div className="text-base font-bold font-mono text-slate-100 mt-0.5">{totalPerformed}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('critical'); setCustomOnly(false); }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              statusFilter === 'critical'
                ? 'bg-rose-950/60 border-rose-600 text-rose-100'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Critical
            </div>
            <div className="text-base font-bold font-mono text-rose-400 mt-0.5">{criticalCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('warning'); setCustomOnly(false); }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              statusFilter === 'warning'
                ? 'bg-amber-950/60 border-amber-600 text-amber-100'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Warnings
            </div>
            <div className="text-base font-bold font-mono text-amber-400 mt-0.5">{warningCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('pass'); setCustomOnly(false); }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              statusFilter === 'pass'
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-100'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Passed
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{passCount}</div>
          </button>

          <button
            onClick={() => setCustomOnly(!customOnly)}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              customOnly
                ? 'bg-indigo-950/60 border-indigo-600 text-indigo-100'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Custom Checks
            </div>
            <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">{customCount}</div>
          </button>
        </div>

        {/* Toolbar: Search, Filters, Add Custom, Manage Predefined */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search performed check title, metric, or observed value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              aria-label="Filter by Phase"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Diagnostic Phases</option>
              {phases.map(p => (
                <option key={p.id} value={p.id}>
                  Phase {p.number}: {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onClose();
                onOpenAddCustomModal();
              }}
              className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Check</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenManagePredefinedModal();
              }}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Manage Predefined</span>
            </button>
          </div>
        </div>

        {/* Performed Checks List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredList.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-12 text-center text-slate-400 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No performed verification checks found</p>
              <p className="text-xs max-w-md mx-auto text-slate-500">
                {totalPerformed === 0 
                  ? "Upload an AWR report in the 'Upload AWR Files' tab or run manual checklist evaluations to perform checks."
                  : "No checks match your current filter settings. Try adjusting your search query or status filter."}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenAddCustomModal();
                  }}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-semibold text-xs rounded hover:bg-amber-400 transition-colors"
                >
                  + Add Custom Check
                </button>
              </div>
            </div>
          ) : (
            filteredList.map((item, idx) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 hover:border-slate-700 transition-colors"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Phase {item.phaseNumber}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {item.awrSection}
                    </span>
                    {item.isCustom && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                        CUSTOM CHECK
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-slate-100">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(item.status)}

                    {/* Status updater */}
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-xs">
                      <button
                        onClick={() => onUpdateItemStatus(item.id, 'pass')}
                        className={`px-1.5 py-0.5 rounded text-[11px] ${
                          item.status === 'pass' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Mark Pass"
                      >
                        Pass
                      </button>
                      <button
                        onClick={() => onUpdateItemStatus(item.id, 'warning')}
                        className={`px-1.5 py-0.5 rounded text-[11px] ${
                          item.status === 'warning' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Mark Warning"
                      >
                        Warn
                      </button>
                      <button
                        onClick={() => onUpdateItemStatus(item.id, 'critical')}
                        className={`px-1.5 py-0.5 rounded text-[11px] ${
                          item.status === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Mark Critical"
                      >
                        Crit
                      </button>
                    </div>

                    {/* Remove check button */}
                    <button
                      onClick={() => onRemoveCheck(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title={item.isCustom ? "Delete custom check" : "Remove predefined check from active runbook"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Observed Value & Findings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Observed Value in AWR:
                    </span>
                    <span className="font-mono text-amber-300 font-medium">
                      {item.currentValue || 'Evaluated / Verified by DBA'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Diagnostic Evaluation Notes:
                    </span>
                    <span className="text-slate-300">
                      {item.notes || 'No custom findings recorded.'}
                    </span>
                  </div>
                </div>

                {/* Threshold criteria & Action */}
                <div className="text-xs space-y-1.5 pt-1 border-t border-slate-900">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span>Metric: <strong className="text-slate-300 font-mono">{item.metricName}</strong></span>
                    <span>Normal: <span className="text-emerald-400">{item.normalThreshold}</span></span>
                    <span>Warning: <span className="text-amber-400">{item.warningThreshold}</span></span>
                    <span>Critical: <span className="text-rose-400">{item.criticalThreshold}</span></span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    <strong className="text-slate-400">Action:</strong> {item.verificationAction}
                  </p>
                </div>

                {/* Live SQL if present */}
                {item.diagnosticQuery && (
                  <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
                    <div className="bg-slate-850 px-3 py-1 border-b border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400 flex items-center gap-1">
                        <Code2 className="w-3 h-3 text-amber-400" /> Live Verification SQL
                      </span>
                      <button
                        onClick={() => handleCopySql(item.id, item.diagnosticQuery!)}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {copiedQueryId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedQueryId === item.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 text-[11px] font-mono text-amber-200/90 overflow-x-auto whitespace-pre">
                      {item.diagnosticQuery}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero file storage: Evaluation strictly in volatile RAM.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded transition-colors"
          >
            Close View
          </button>
        </div>

      </div>
    </div>
  );
};
