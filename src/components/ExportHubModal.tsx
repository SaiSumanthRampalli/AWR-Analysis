import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Printer, 
  FileSpreadsheet, 
  FileCode, 
  Check, 
  Copy, 
  Download, 
  Layers, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  ExportReportData, 
  exportToMarkdown, 
  exportToCsv, 
  exportToExcel, 
  exportToWord, 
  exportToPdf,
  exportToJson,
  generateMarkdownReport,
  resolveReportMetadata
} from '../utils/exportUtils';

interface ExportHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExportReportData;
}

type ExportFormat = 'markdown' | 'pdf' | 'excel' | 'word' | 'csv' | 'json';

export const ExportHubModal: React.FC<ExportHubModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'formats' | 'preview'>('formats');

  if (!isOpen) return null;

  const meta = resolveReportMetadata(data);
  const reportDate = data.reportDate || new Date().toISOString().split('T')[0];
  const markdownText = generateMarkdownReport(data);

  const handleExecuteExport = (format: ExportFormat) => {
    switch (format) {
      case 'markdown':
        exportToMarkdown(data);
        break;
      case 'pdf':
        exportToPdf(data);
        break;
      case 'excel':
        exportToExcel(data);
        break;
      case 'word':
        exportToWord(data);
        break;
      case 'csv':
        exportToCsv(data);
        break;
      case 'json':
        exportToJson(data);
        break;
    }
    setDownloadSuccess(format);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownText);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const formats: {
    id: ExportFormat;
    name: string;
    extension: string;
    badge: string;
    description: string;
    icon: React.ReactNode;
    colorClasses: string;
    recommendedFor: string;
  }[] = [
    {
      id: 'excel',
      name: 'Microsoft Excel Multi-Tab',
      extension: '.xls',
      badge: 'ENTERPRISE WORKBOOK',
      description: 'Native 8-sheet XML spreadsheet with separate tabs for KPI, Telemetry, Wait Events, Top SQL, Hotspots, 8-Phase Checks, and SQL Archive.',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
      colorClasses: 'hover:border-emerald-500/50 bg-emerald-950/10 text-emerald-300',
      recommendedFor: 'DBA capacity planning, spreadsheets, pivot analysis'
    },
    {
      id: 'pdf',
      name: 'Full Diagnostic PDF',
      extension: '.pdf',
      badge: 'OFFICIAL DOSSIER',
      description: 'Corporate print-optimized audit dossier formatted with running headers/footers, forensic findings, tables, and complete SQL statements.',
      icon: <Printer className="w-5 h-5 text-rose-400" />,
      colorClasses: 'hover:border-rose-500/50 bg-rose-950/10 text-rose-300',
      recommendedFor: 'Comprehensive engineering debriefs, deep technical audits'
    },
    {
      id: 'word',
      name: 'Full Word Audit Report',
      extension: '.doc',
      badge: 'INCIDENT REPORT',
      description: 'Comprehensive Word document with executive summary, tables, alert callouts, remediation roadmap, and dark syntax SQL blocks.',
      icon: <FileText className="w-5 h-5 text-blue-400" />,
      colorClasses: 'hover:border-blue-500/50 bg-blue-950/10 text-blue-300',
      recommendedFor: 'Formal engineering reports, change requests, Word/Docs'
    },
    {
      id: 'markdown',
      name: 'Engineering Markdown',
      extension: '.md',
      badge: 'DEVELOPER SPEC',
      description: 'Clean GitHub-flavored markdown with structured tables, SQL syntax blocks, forensic findings, and telemetry parameters.',
      icon: <FileCode className="w-5 h-5 text-amber-400" />,
      colorClasses: 'hover:border-amber-500/50 bg-amber-950/10 text-amber-300',
      recommendedFor: 'Wiki docs, GitHub PRs, Jira tickets, Obsidian'
    },
    {
      id: 'csv',
      name: 'Structured CSV Data',
      extension: '.csv',
      badge: 'DATA PIPELINE',
      description: 'RFC 4180 comma-separated data table export for Python, R, Splunk, Tableau, PowerBI, or automated data ingestion pipelines.',
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
      colorClasses: 'hover:border-cyan-500/50 bg-cyan-950/10 text-cyan-300',
      recommendedFor: 'Scripting, ETL pipelines, custom BI dashboards'
    },
    {
      id: 'json',
      name: 'Machine-Readable JSON',
      extension: '.json',
      badge: 'API & CI/CD PAYLOAD',
      description: 'Full schema v2.0 JSON payload with all telemetry, checklist phases, hotspots, and consolidated SQL archive for programmatic ingestion.',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      colorClasses: 'hover:border-purple-500/50 bg-purple-950/10 text-purple-300',
      recommendedFor: 'Automated CI/CD pipelines, APIs, custom tooling'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden min-w-0">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                  ENTERPRISE EXPORT COMMAND HUB
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  6 Formats Available
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <strong className="text-slate-200">{meta.dbName} (DBID: {meta.dbId})</strong> on {meta.hostName} · Date: {reportDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('formats')}
                className={`px-3 py-1 rounded transition-colors font-medium ${
                  activeTab === 'formats'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Export Formats
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded transition-colors font-medium ${
                  activeTab === 'preview'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'formats' ? (
          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Quick KPI Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Top Hotspots</span>
                <span className="text-base font-bold font-mono text-slate-100">{data.hotspots.length} Issues</span>
                <span className="text-[10px] text-rose-400 block font-mono">
                  {data.hotspots.filter(h => h.severity === 'critical').length} Critical
                </span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Runbook Checks</span>
                <span className="text-base font-bold font-mono text-slate-100">{data.checklistItems.length} Rules</span>
                <span className="text-[10px] text-emerald-400 block font-mono">
                  {data.checklistItems.filter(i => i.status === 'pass').length} Passing
                </span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Captured SQLs</span>
                <span className="text-base font-bold font-mono text-amber-300">
                  {meta.completeSqlEntries.length} Statements
                </span>
                <span className="text-[10px] text-slate-500 block">Complete text</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Data Storage</span>
                <span className="text-base font-bold font-mono text-cyan-400">Zero Server Disk</span>
                <span className="text-[10px] text-slate-500 block">In-memory buffer</span>
              </div>
            </div>

            {/* Format Selection Cards Grid */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Select Diagnostic Export Format</span>
                <span className="text-[10px] text-slate-500 font-mono">Direct 1-Click Client Download</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formats.map(fmt => {
                  const isSelected = selectedFormat === fmt.id;
                  const isSuccess = downloadSuccess === fmt.id;

                  return (
                    <div
                      key={fmt.id}
                      onClick={() => setSelectedFormat(fmt.id)}
                      className={`p-4 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-slate-800/80 border-amber-500/60 shadow-lg shadow-amber-950/20' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded bg-slate-900 border border-slate-800">
                              {fmt.icon}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                                <span>{fmt.name}</span>
                                <span className="font-mono text-amber-400 text-[11px]">({fmt.extension})</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">{fmt.badge}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecuteExport(fmt.id);
                            }}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              isSuccess
                                ? 'bg-emerald-600 text-slate-950'
                                : isSelected
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            {isSuccess ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Downloaded!</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {fmt.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Best for: {fmt.recommendedFor}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  All reports are compiled directly inside your browser's volatile memory. No file data is sent to external servers.
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyMarkdown}
                  className="px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Markdown!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Markdown to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Live Markdown Preview */
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">
                Report Preview (Markdown formatting preview)
              </span>
              <button
                onClick={handleCopyMarkdown}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMarkdown ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-amber-200/90 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed max-h-[500px]">
              {markdownText}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span>Supported: .xls (Multi-Tab) · .pdf (Corporate Dossier) · .doc (Incident Word) · .md · .csv · .json</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExecuteExport(selectedFormat)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Dossier ({selectedFormat.toUpperCase()})</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
