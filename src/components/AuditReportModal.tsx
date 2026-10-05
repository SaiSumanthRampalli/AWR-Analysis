import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Bell, 
  Terminal,
  FileSpreadsheet,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';
import { RunbookPhase, VerificationItem, AwrBenchmarkScenario, HotspotItem } from '../types/awr';
import { ParsedAwrReport } from '../utils/awrParser';
import { 
  ExportReportData,
  exportToMarkdown, 
  exportToPdf, 
  exportToCsv, 
  exportToExcel, 
  exportToWord,
  exportToPrintDossier 
} from '../utils/exportUtils';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  phases: RunbookPhase[];
  checklistItems: VerificationItem[];
  selectedScenario: AwrBenchmarkScenario | null;
  hotspots?: HotspotItem[];
  activeReport?: ParsedAwrReport | null;
  completeSqlTexts?: Record<string, string>;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  phases,
  checklistItems,
  selectedScenario,
  hotspots = [],
  activeReport,
  completeSqlTexts
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const passItems = checklistItems.filter(i => i.status === 'pass');
  const warnItems = checklistItems.filter(i => i.status === 'warning');
  const critItems = checklistItems.filter(i => i.status === 'critical');
  const naItems = checklistItems.filter(i => i.status === 'na');
  const criticalHotspots = hotspots.filter(h => h.severity === 'critical');

  const reportDate = new Date().toISOString().split('T')[0];

  const generateMarkdownReport = () => {
    let md = `# Oracle Database AWR Performance Diagnostic Audit Report\n`;
    md += `**Date:** ${reportDate} | **Target Environment:** ${selectedScenario ? selectedScenario.dbVersion : 'Production Oracle DB'}\n`;
    if (selectedScenario) {
      md += `**Active Incident Scenario:** ${selectedScenario.name}\n`;
      md += `**Hardware Profile:** ${selectedScenario.hardwareProfile}\n`;
    }
    md += `\n---\n\n`;

    md += `## 1. Executive Summary & Diagnostic Triage Score\n\n`;
    md += `- **Total Verification Rules:** ${checklistItems.length}\n`;
    md += `- **Nominal / Pass:** ${passItems.length}\n`;
    md += `- **Warning Thresholds:** ${warnItems.length}\n`;
    md += `- **Critical Thresholds:** ${critItems.length}\n`;
    md += `- **Not Reported / NA:** ${naItems.length}\n`;
    md += `- **Top Issues Extracted:** ${hotspots.length} (${criticalHotspots.length} Critical)\n\n`;

    if (critItems.length > 0 || criticalHotspots.length > 0) {
      md += `> **HIGH SEVERITY ALERT:** Critical performance bottlenecks identified from AWR data requiring immediate investigation.\n\n`;
    }

    if (selectedScenario) {
      md += `### Scenario Triage Synopsis\n${selectedScenario.description}\n\n`;
      md += `### Primary Key Findings:\n`;
      selectedScenario.keyFindings.forEach(f => {
        md += `- ${f}\n`;
      });
      md += `\n**Recommended Investigation Scope:** ${selectedScenario.suggestedAction}\n\n`;
    }

    if (hotspots.length > 0) {
      md += `## 2. Top System Performance Issues (Ranked by Impact on DB Time)\n\n`;
      hotspots.slice(0, 20).forEach(h => {
        md += `### #${h.rank} [${h.severity.toUpperCase()}] ${h.name}\n`;
        md += `- **Category:** ${h.category} | **Metric:** ${h.metricDimension} | **Impact:** ${h.impactPct}%\n`;
        md += `- **Root Cause Assessment:** ${h.rootCause}\n`;
        md += `- **AWR Section Evidence:** ${h.evidenceSummary} (${h.awrSourceSection})\n`;
        md += `- **Breached Threshold:** ${h.thresholdBreached}\n`;
        if (h.sqlText) {
          md += `\n**Complete Statement Text (from Complete List of SQL Text):**\n\`\`\`sql\n${h.sqlText}\n\`\`\`\n`;
        }
        md += `- **Live Diagnostic SQL:** \`${h.diagnosticSql}\`\n\n`;
      });
    }

    md += `## 3. Systematic Checklist Verification Breakdown\n\n`;

    if (critItems.length === 0 && warnItems.length === 0) {
      md += `*No critical or warning thresholds exceeded. Workload is operating within nominal engineering parameters.*\n\n`;
    }

    critItems.forEach(item => {
      md += `### [CRITICAL] ${item.title}\n`;
      md += `- **AWR Section:** ${item.awrSection}\n`;
      md += `- **Metric:** ${item.metricName}\n`;
      md += `- **Critical Rule Threshold:** ${item.criticalThreshold}\n`;
      if (item.currentValue) md += `- **Observed Value in Report:** ${item.currentValue}\n`;
      if (item.notes) md += `- **DBA Notes:** ${item.notes}\n`;
      md += `- **Verification Action:** ${item.verificationAction}\n\n`;
    });

    warnItems.forEach(item => {
      md += `### [WARNING] ${item.title}\n`;
      md += `- **AWR Section:** ${item.awrSection}\n`;
      md += `- **Metric:** ${item.metricName}\n`;
      md += `- **Warning Rule Threshold:** ${item.warningThreshold}\n`;
      if (item.currentValue) md += `- **Observed Value in Report:** ${item.currentValue}\n`;
      if (item.notes) md += `- **DBA Notes:** ${item.notes}\n`;
      md += `- **Verification Action:** ${item.verificationAction}\n\n`;
    });

    md += `## 4. Systematic Phase-by-Phase Verification Log\n\n`;
    phases.forEach(phase => {
      md += `### Phase ${phase.number}: ${phase.title}\n`;
      phase.items.forEach(item => {
        const statusLabel = item.status.toUpperCase();
        md += `- **[${statusLabel}] ${item.title}**: ${item.currentValue ? `Observed: ${item.currentValue} | ` : ''}Rule: ${item.normalThreshold}\n`;
      });
      md += `\n`;
    });

    md += `---\n*Generated via Oracle AWR Diagnostic Workbench Runbook Protocol.*`;
    return md;
  };

  const getExportData = (): ExportReportData => ({
    reportDate,
    selectedScenario,
    phases,
    checklistItems,
    hotspots,
    activeReport,
    completeSqlTexts: completeSqlTexts || activeReport?.completeSqlTexts
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const notifySuccess = (fmt: string) => {
    setDownloadSuccess(fmt);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleExportMarkdown = () => {
    exportToMarkdown(getExportData());
    notifySuccess('md');
  };

  const handleExportPdf = () => {
    exportToPdf(getExportData());
    notifySuccess('pdf');
  };

  const handleExportExcel = () => {
    exportToExcel(getExportData());
    notifySuccess('excel');
  };

  const handleExportWord = () => {
    exportToWord(getExportData());
    notifySuccess('word');
  };

  const handleExportCsv = () => {
    exportToCsv(getExportData());
    notifySuccess('csv');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden min-w-0">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                AWR Performance Diagnostic Audit Report
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Target: {activeReport?.dbName || selectedScenario?.name || 'Production DB'} · {activeReport?.release || 'Oracle Enterprise'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleExportExcel}
              className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
                downloadSuccess === 'excel'
                  ? 'bg-emerald-600 text-slate-950 border-emerald-500 font-bold'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800'
              }`}
              title="Download Excel Workbook (.xls)"
            >
              {downloadSuccess === 'excel' ? <Check className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              <span>{downloadSuccess === 'excel' ? 'Saved' : 'Excel'}</span>
            </button>
            <button
              onClick={handleExportWord}
              className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
                downloadSuccess === 'word'
                  ? 'bg-blue-600 text-white border-blue-500 font-bold'
                  : 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border-blue-800'
              }`}
              title="Download Microsoft Word Document (.doc)"
            >
              {downloadSuccess === 'word' ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{downloadSuccess === 'word' ? 'Saved' : 'Word'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
                downloadSuccess === 'pdf'
                  ? 'bg-rose-600 text-white border-rose-500 font-bold'
                  : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800'
              }`}
              title="Download PDF Dossier (.pdf)"
            >
              {downloadSuccess === 'pdf' ? <Check className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
              <span>{downloadSuccess === 'pdf' ? 'Saved' : 'PDF'}</span>
            </button>
            <button
              onClick={handleExportMarkdown}
              className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
                downloadSuccess === 'md'
                  ? 'bg-amber-600 text-slate-950 border-amber-500 font-bold'
                  : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-800'
              }`}
              title="Download Markdown (.md)"
            >
              {downloadSuccess === 'md' ? <Check className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
              <span>{downloadSuccess === 'md' ? 'Saved' : 'Markdown'}</span>
            </button>
            <button
              onClick={handleExportCsv}
              className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
                downloadSuccess === 'csv'
                  ? 'bg-cyan-600 text-slate-950 border-cyan-500 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Download CSV Table (.csv)"
            >
              {downloadSuccess === 'csv' ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              <span>{downloadSuccess === 'csv' ? 'Saved' : 'CSV'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy Markdown text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-slate-300">
          {/* Executive KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Total Rules Checked</span>
              <span className="text-xl font-bold font-mono text-slate-100">{checklistItems.length}</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-emerald-900/40">
              <span className="text-slate-500 block text-[11px]">Nominal / Pass</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{passItems.length}</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-amber-900/40">
              <span className="text-slate-500 block text-[11px]">Warnings</span>
              <span className="text-xl font-bold font-mono text-amber-400">{warnItems.length}</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-rose-900/40">
              <span className="text-slate-500 block text-[11px]">Critical Red Flags</span>
              <span className="text-xl font-bold font-mono text-rose-400">{critItems.length}</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Not Reported in AWR</span>
              <span className="text-xl font-bold font-mono text-slate-400">{naItems.length}</span>
            </div>
          </div>

          {/* Top Issues List */}
          {hotspots.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                <span>Top Issues Ranked by AWR Impact</span>
              </h3>

              <div className="space-y-2">
                {hotspots.slice(0, 10).map(h => (
                  <div key={h.id} className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          h.severity === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          #{h.rank} {h.severity.toUpperCase()}
                        </span>
                        <span className="text-slate-200 font-bold">{h.name}</span>
                      </div>
                      <span className="text-amber-400 font-mono text-[11px]">{h.metricDimension}</span>
                    </div>
                    <p className="text-slate-300">{h.rootCause}</p>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Evidence: {h.evidenceSummary}
                    </div>
                    {h.sqlText && (
                      <div className="bg-slate-900/80 border border-slate-800 rounded p-2 text-[10px] font-mono text-amber-200/90 whitespace-pre overflow-x-auto max-h-24">
                        {h.sqlText}
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-amber-300/80 bg-slate-900 p-1.5 rounded flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>{h.diagnosticSql}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Checklist Items Requiring Investigation
            </h3>

            {critItems.map(item => (
              <div key={item.id} className="p-3 rounded bg-rose-950/20 border border-rose-900/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" /> {item.title}
                  </span>
                  <span className="font-mono text-[10px] text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                    CRITICAL
                  </span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">Threshold: </span>{item.criticalThreshold}
                </div>
                {item.currentValue && (
                  <div className="font-mono text-slate-200">
                    <span className="text-slate-400">Observed in AWR: </span>{item.currentValue}
                  </div>
                )}
                {item.notes && (
                  <div className="text-amber-200/90">
                    <span className="text-slate-400">DBA Note: </span>{item.notes}
                  </div>
                )}
                <div className="text-emerald-300 pt-1">
                  <strong>Verification Action: </strong>{item.verificationAction}
                </div>
              </div>
            ))}

            {warnItems.map(item => (
              <div key={item.id} className="p-3 rounded bg-amber-950/20 border border-amber-900/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> {item.title}
                  </span>
                  <span className="font-mono text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    WARNING
                  </span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">Threshold: </span>{item.warningThreshold}
                </div>
                {item.currentValue && (
                  <div className="font-mono text-slate-200">
                    <span className="text-slate-400">Observed: </span>{item.currentValue}
                  </div>
                )}
                {item.notes && (
                  <div className="text-amber-200/90">
                    <span className="text-slate-400">DBA Note: </span>{item.notes}
                  </div>
                )}
                <div className="text-slate-200 pt-1">
                  <strong>Verification Action: </strong>{item.verificationAction}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 rounded-b-xl">
          <span className="text-slate-500 font-mono text-[11px]">
            Format: Markdown / JSON / Printable PDF
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
