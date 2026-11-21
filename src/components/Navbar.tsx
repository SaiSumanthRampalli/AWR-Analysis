import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Database, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Cpu, 
  Activity, 
  Download, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Upload,
  CheckSquare,
  Trash2,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  Printer,
  Layers,
  Sparkles,
  Terminal
} from 'lucide-react';
import { AwrBenchmarkScenario, VerificationItem } from '../types/awr';
import { sampleScenarios } from '../data/sampleScenarios';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectScenario: (scenario: AwrBenchmarkScenario) => void;
  onOpenReportModal: () => void;
  onOpenExportHub?: () => void;
  onDirectExport?: (format: 'markdown' | 'pdf' | 'excel' | 'word' | 'csv' | 'json') => void;
  onResetChecklist: () => void;
  checklistItems: VerificationItem[];
  selectedScenario: AwrBenchmarkScenario | null;
  unreadHotspotCount?: number;
  onOpenPerformedChecklistsModal?: () => void;
  hasLoadedReport?: boolean;
  onPurgeFileData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectScenario,
  onOpenReportModal,
  onOpenExportHub,
  onDirectExport,
  onResetChecklist,
  checklistItems,
  selectedScenario,
  unreadHotspotCount = 0,
  onOpenPerformedChecklistsModal,
  hasLoadedReport = false,
  onPurgeFileData
}) => {
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const passCount = checklistItems.filter(i => i.status === 'pass').length;
  const warnCount = checklistItems.filter(i => i.status === 'warning').length;
  const critCount = checklistItems.filter(i => i.status === 'critical').length;
  const performedCount = checklistItems.filter(i => i.status !== 'unverified' || (i.currentValue && i.currentValue.trim() !== '')).length;
  const totalCount = checklistItems.length;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 w-full">
      {/* Tier 1: Branding & Action Controls */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 h-12 flex items-center justify-between gap-3 min-w-0">
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm shadow-amber-500/20">
            AWR
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-100 whitespace-nowrap">
            Oracle AWR Workbench
          </span>
        </div>

        {/* Right: Primary Command Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Scenario Loader */}
          <div className="relative hidden md:block">
            <select
              aria-label="Load Benchmark Scenario"
              onChange={(e) => {
                const s = sampleScenarios.find(item => item.id === e.target.value);
                if (s) onSelectScenario(s);
              }}
              value={selectedScenario?.id || ''}
              className="bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="" disabled>Load Incident Demo...</option>
              {sampleScenarios.map(scen => (
                <option key={scen.id} value={scen.id}>
                  {scen.name}
                </option>
              ))}
            </select>
          </div>

          {/* Purge In-Memory File Data Button */}
          {hasLoadedReport && onPurgeFileData && (
            <button
              onClick={onPurgeFileData}
              className="flex items-center gap-1 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 text-[11px] px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer"
              title="Purge uploaded AWR files and in-memory data"
            >
              <Trash2 className="w-3 h-3" />
              <span>Purge</span>
            </button>
          )}

          {/* Export Command Hub Launcher with Quick Dropdown */}
          {onOpenExportHub && (
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-sm shadow-amber-950/40 p-0.5">
                <button
                  type="button"
                  onClick={onOpenExportHub}
                  className="flex items-center gap-1 text-slate-950 font-bold text-[11px] px-2 py-0.5 transition-all whitespace-nowrap cursor-pointer"
                  title="Open Export Hub (Excel, Word, PDF, Markdown, CSV, JSON)"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExportDropdownOpen(prev => !prev);
                  }}
                  aria-label="Toggle export options"
                  className="p-1 text-slate-950 hover:bg-slate-950/20 rounded transition-colors cursor-pointer"
                  title="Export formats"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown Menu */}
              {isExportDropdownOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl p-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-150 space-y-1 ring-1 ring-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold flex items-center justify-between">
                    <span>Diagnostic Dossier Exports</span>
                    <Layers className="w-3 h-3 text-slate-400" />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportDropdownOpen(false);
                      onDirectExport ? onDirectExport('excel') : onOpenExportHub?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-emerald-950/40 text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div className="text-left">
                      <span className="font-semibold text-xs block leading-tight">Full Excel Workbook</span>
                      <span className="text-[10px] text-slate-400 font-mono">8 Multi-Tab Worksheets (.xls)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportDropdownOpen(false);
                      onDirectExport ? onDirectExport('word') : onOpenExportHub?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-blue-950/40 text-slate-200 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <div className="text-left">
                      <span className="font-semibold text-xs block leading-tight">Full Word Audit Report</span>
                      <span className="text-[10px] text-slate-400 font-mono">Incident Dossier (.doc)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportDropdownOpen(false);
                      onDirectExport ? onDirectExport('pdf') : onOpenExportHub?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-rose-950/40 text-slate-200 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <div className="text-left">
                      <span className="font-semibold text-xs block leading-tight">Full Diagnostic PDF</span>
                      <span className="text-[10px] text-slate-400 font-mono">Complete Audit Dossier (.pdf)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportDropdownOpen(false);
                      onDirectExport ? onDirectExport('markdown') : onOpenExportHub?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-amber-950/40 text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="text-left">
                      <span className="font-semibold text-xs block leading-tight">Engineering Markdown</span>
                      <span className="text-[10px] text-slate-400 font-mono">Developer Spec (.md)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportDropdownOpen(false);
                      onDirectExport ? onDirectExport('csv') : onOpenExportHub?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-cyan-950/40 text-slate-200 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div className="text-left">
                      <span className="font-semibold text-xs block leading-tight">Structured CSV Data</span>
                      <span className="text-[10px] text-slate-400 font-mono">Data Pipeline Table (.csv)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExportDropdownOpen(false);
                      onDirectExport ? onDirectExport('json') : onOpenExportHub?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-purple-950/40 text-slate-200 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <div className="text-left">
                      <span className="font-semibold text-xs block leading-tight">Machine-Readable JSON</span>
                      <span className="text-[10px] text-slate-400 font-mono">Full Telemetry Schema (.json)</span>
                    </div>
                  </button>

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExportDropdownOpen(false);
                        onOpenExportHub?.();
                      }}
                      className="w-full text-center py-1.5 text-[11px] font-mono text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                    >
                      Open Export Command Hub...
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] px-2.5 py-1 rounded transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <FileText className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Audit Report</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Sleek Navigation Tabs Strip & Compact Verification Status */}
      <div className="bg-slate-900/70 border-t border-slate-800/60 px-3 sm:px-5 lg:px-6 h-9 flex items-center justify-between gap-3 text-xs text-slate-400 max-w-7xl w-full mx-auto min-w-0">
        {/* Navigation Tabs (scrollable inside ribbon without body horizontal scroll) */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          <button
            onClick={() => setActiveTab('files')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs flex items-center gap-1 shrink-0 ${
              activeTab === 'files' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>AWR Files</span>
          </button>
          <button
            onClick={() => setActiveTab('hotspots')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs flex items-center gap-1 shrink-0 ${
              activeTab === 'hotspots' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Top 20 Hotspots</span>
            {unreadHotspotCount > 0 && (
              <span className="px-1 py-0.1 rounded-full text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {unreadHotspotCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs flex items-center gap-1.5 shrink-0 ${
              activeTab === 'commands' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Top 20 Hotspots with Oracle Diagnostic Commands"
          >
            <Terminal className="w-3 h-3 text-amber-400" />
            <span>Oracle Diagnostic Commands</span>
          </button>
          <button
            onClick={() => setActiveTab('runbook')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs shrink-0 ${
              activeTab === 'runbook' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Runbook Checklist
          </button>
          <button
            onClick={() => setActiveTab('sop')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs shrink-0 ${
              activeTab === 'sop' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            12-Step SOP
          </button>
          <button
            onClick={() => setActiveTab('triage')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs shrink-0 ${
              activeTab === 'triage' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wait Triage
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs shrink-0 ${
              activeTab === 'memory' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Memory Sizing
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs shrink-0 ${
              activeTab === 'calculator' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Calculator
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`transition-colors whitespace-nowrap px-2 py-1 rounded text-xs shrink-0 ${
              activeTab === 'scripts' ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scripts
          </button>
        </nav>

        {/* Verification Status & Reset Button (Right side) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-[11px] font-mono">
          <div className="hidden sm:flex items-center gap-2">
            <button 
              onClick={onOpenPerformedChecklistsModal}
              className="text-slate-300 hover:text-amber-300 transition-colors"
              title="Click to view performed checks"
            >
              {performedCount}/{totalCount} Evaluated
            </button>
            <span className="text-emerald-400 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> {passCount}
            </span>
            <span className="text-amber-400 flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> {warnCount}
            </span>
            <span className="text-rose-400 flex items-center gap-0.5">
              <XCircle className="w-2.5 h-2.5" /> {critCount}
            </span>
          </div>

          <button
            onClick={onResetChecklist}
            className="text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
            title="Reset checklist to unverified"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
