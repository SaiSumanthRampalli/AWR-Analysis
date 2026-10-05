import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Terminal, 
  Share2, 
  Eye, 
  Clock, 
  Database, 
  Cpu, 
  Layers, 
  Send,
  Download,
  FileText,
  AlertCircle,
  Code2,
  FileCode,
  X,
  ExternalLink,
  CheckSquare,
  Sparkles,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { HotspotItem, AwrBenchmarkScenario, RunbookPhase, VerificationItem } from '../types/awr';
import { ParsedAwrReport } from '../utils/awrParser';
import { 
  exportToExcel, 
  exportToWord, 
  exportToPdf, 
  exportToCsv, 
  exportToMarkdown, 
  ExportReportData 
} from '../utils/exportUtils';

interface TopHotspotsNotificationCenterProps {
  hotspots: HotspotItem[];
  onToggleAcknowledge: (id: string, notes?: string) => void;
  completeSqlTexts?: Record<string, string>;
  onOpenPerformedChecksModal?: () => void;
  onNavigateToUpload?: () => void;
  onLoadSampleAwr?: () => void;
  activeReport?: ParsedAwrReport | null;
  selectedScenario?: AwrBenchmarkScenario | null;
  phases?: RunbookPhase[];
  checklistItems?: VerificationItem[];
  onOpenExportHub?: () => void;
}

export const TopHotspotsNotificationCenter: React.FC<TopHotspotsNotificationCenterProps> = ({
  hotspots,
  onToggleAcknowledge,
  completeSqlTexts = {},
  onOpenPerformedChecksModal,
  onNavigateToUpload,
  onLoadSampleAwr,
  activeReport,
  selectedScenario,
  phases,
  checklistItems,
  onOpenExportHub
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showAckOnly, setShowAckOnly] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedFullExport, setCopiedFullExport] = useState<boolean>(false);
  const [activeSqlTab, setActiveSqlTab] = useState<Record<string, 'complete' | 'all-list' | 'metrics'>>({});
  const [isCompleteSqlModalOpen, setIsCompleteSqlModalOpen] = useState(false);
  const [modalSqlSearch, setModalSqlSearch] = useState('');
  const [copiedModalSqlId, setCopiedModalSqlId] = useState<string | null>(null);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Record<string, boolean>>({});

  const criticalCount = hotspots.filter(h => h.severity === 'critical').length;
  const warningCount = hotspots.filter(h => h.severity === 'warning').length;
  const attentionCount = hotspots.filter(h => h.severity === 'attention').length;
  const unacknowledgedCount = hotspots.filter(h => !h.isAcknowledged).length;

  const allCompleteSqlEntries = Object.entries(completeSqlTexts);

  const categories = ['all', 'SQL', 'Wait Event', 'Segment/Object', 'Host & I/O', 'Lock & Concurrency'];

  const filteredHotspots = hotspots.filter(h => {
    const matchesSearch = 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.metricDimension.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.rootCause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.sqlText && h.sqlText.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || h.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || h.severity === selectedSeverity;
    const matchesAck = !showAckOnly || !h.isAcknowledged;

    return matchesSearch && matchesCategory && matchesSeverity && matchesAck;
  });

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSql = (sqlId: string, query: string) => {
    const blob = new Blob([query], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sqlId}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateMarkdownReport = () => {
    let md = `# Top 20 AWR Performance Issues Report\n`;
    md += `Generated: ${new Date().toISOString()}\n`;
    md += `Critical Bottlenecks: ${criticalCount} | Warnings: ${warningCount} | Attention: ${attentionCount}\n\n`;
    md += `| Rank | Severity | Category | Issue / SQL_ID | Metric Dimension | % Impact |\n`;
    md += `|---|---|---|---|---|---|\n`;
    hotspots.forEach(h => {
      md += `| #${h.rank} | ${h.severity.toUpperCase()} | ${h.category} | ${h.name} | ${h.metricDimension} | ${h.impactPct}% |\n`;
    });
    md += `\n## Detailed Issue Evidence & Diagnostics\n\n`;
    hotspots.forEach(h => {
      md += `### #${h.rank}: ${h.name}\n`;
      md += `- **Severity**: ${h.severity.toUpperCase()}\n`;
      md += `- **Category**: ${h.category}\n`;
      md += `- **Impact**: ${h.impactPct}%\n`;
      md += `- **Metric**: ${h.metricDimension}\n`;
      md += `- **Breached Threshold**: ${h.thresholdBreached}\n`;
      md += `- **Root Cause**: ${h.rootCause}\n`;
      md += `- **AWR Section Evidence**: ${h.evidenceSummary} (${h.awrSourceSection})\n`;
      if (h.perExecutionCost) {
        md += `- **Per-Execution Cost**: ${h.perExecutionCost.elapsedPerExecMs || 'N/A'} elapsed, ${h.perExecutionCost.getsPerExec || 'N/A'} buffer gets\n`;
      }
      if (h.sqlText) {
        md += `\n**Complete Statement Text (from Complete List of SQL Text):**\n\`\`\`sql\n${h.sqlText}\n\`\`\`\n`;
      }
      md += `**Live Oracle Diagnostic Command:**\n\`\`\`sql\n${h.diagnosticSql}\n\`\`\`\n\n`;
    });
    return md;
  };

  const getHotspotsExportData = (): ExportReportData => ({
    reportDate: new Date().toISOString().split('T')[0],
    activeReport,
    selectedScenario,
    phases: phases || [],
    checklistItems: checklistItems || [],
    hotspots,
    completeSqlTexts
  });

  const handleDownloadMarkdown = () => {
    exportToMarkdown(getHotspotsExportData(), 'AWR_Top20_Issues');
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownReport();
    navigator.clipboard.writeText(md);
    setCopiedFullExport(true);
    setTimeout(() => setCopiedFullExport(false), 2000);
  };

  const filteredModalSqlList = allCompleteSqlEntries.filter(([sqlId, text]) => {
    if (!modalSqlSearch) return true;
    const term = modalSqlSearch.toLowerCase();
    return sqlId.toLowerCase().includes(term) || text.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header Notification Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 sm:p-5 relative overflow-hidden max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100">
              Top 20 Issues Identified from AWR
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked workload bottlenecks and root cause analysis.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {allCompleteSqlEntries.length > 0 && (
              <button
                onClick={() => setIsCompleteSqlModalOpen(true)}
                className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors font-mono cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>SQL Texts ({allCompleteSqlEntries.length})</span>
              </button>
            )}

            <button
              onClick={handleCopyMarkdown}
              className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedFullExport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Severity Metrics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-rose-900/40 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Critical Issues</span>
              <span className="text-lg font-bold font-mono text-rose-400">{criticalCount}</span>
            </div>
            <XCircle className="w-5 h-5 text-rose-500/60" />
          </div>

          <div className="bg-slate-950/80 border border-amber-900/40 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Warnings</span>
              <span className="text-lg font-bold font-mono text-amber-400">{warningCount}</span>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500/60" />
          </div>

          <div className="bg-slate-950/80 border border-blue-900/40 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Attention Items</span>
              <span className="text-lg font-bold font-mono text-blue-400">{attentionCount}</span>
            </div>
            <Eye className="w-5 h-5 text-blue-500/60" />
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Pending Review</span>
              <span className="text-lg font-bold font-mono text-slate-200">{unacknowledgedCount}</span>
            </div>
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by SQL_ID, wait event, query keyword, or evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c} className="bg-slate-900 text-slate-200">
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-1">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Severities</option>
              <option value="critical" className="bg-slate-900 text-rose-400">Critical Only</option>
              <option value="warning" className="bg-slate-900 text-amber-400">Warnings Only</option>
              <option value="attention" className="bg-slate-900 text-blue-400">Attention Only</option>
            </select>
          </div>

          {/* Toggle Reviewed */}
          <button
            onClick={() => setShowAckOnly(!showAckOnly)}
            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
              showAckOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {showAckOnly ? 'Showing Unreviewed' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Top 20 Issues List */}
      <div className="space-y-4">
        {hotspots.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <Bell className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-200">
                No Hotspots Identified
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload an AWR report or select a scenario to review ranked workload bottlenecks.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {onNavigateToUpload && (
                <button
                  onClick={onNavigateToUpload}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
                >
                  Upload AWR Report
                </button>
              )}
              {onLoadSampleAwr && (
                <button
                  onClick={onLoadSampleAwr}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs rounded transition-colors cursor-pointer"
                >
                  Load Sample Data
                </button>
              )}
            </div>
          </div>
        ) : filteredHotspots.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-10 text-center text-slate-400 text-xs">
            No issues match your search criteria.
          </div>
        ) : (
          filteredHotspots.map(hotspot => {
            const currentTab = activeSqlTab[hotspot.id] || 'complete';
            const sqlIdFromHotspot = hotspot.id.startsWith('issue-sql-') 
              ? hotspot.id.replace('issue-sql-', '') 
              : (hotspot.id.match(/\b([0-9a-z]{13})\b/i)?.[1] || hotspot.name.match(/\b([0-9a-z]{13})\b/i)?.[1] || '');
            const isSqlCategory = hotspot.category === 'SQL' || !!sqlIdFromHotspot || !!hotspot.sqlText;

            // Check if there is complete SQL text from completeSqlTexts or hotspot
            const fullQueryText = (sqlIdFromHotspot && completeSqlTexts[sqlIdFromHotspot]) || hotspot.sqlText || '';
            const lineCount = fullQueryText ? fullQueryText.split('\n').length : 0;

            return (
              <div 
                key={hotspot.id} 
                className={`bg-slate-900/70 border rounded-lg p-4 sm:p-5 space-y-3.5 transition-all min-w-0 max-w-full overflow-hidden ${
                  hotspot.severity === 'critical'
                    ? 'border-rose-900/50 hover:border-rose-700/60'
                    : hotspot.severity === 'warning'
                    ? 'border-amber-900/50 hover:border-amber-700/60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Rank, Category, Name, Severity, Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded font-mono font-bold text-sm flex items-center justify-center shrink-0 ${
                      hotspot.severity === 'critical'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : hotspot.severity === 'warning'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      #{hotspot.rank}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          {hotspot.category}
                        </span>
                        <h2 className="text-sm font-bold text-slate-100 font-mono">
                          {hotspot.name}
                        </h2>
                        {hotspot.sqlStatementType && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/70 border border-blue-800 text-blue-300">
                            {hotspot.sqlStatementType}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-amber-400/90 mt-0.5">
                        {hotspot.metricDimension}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{hotspot.notifiedAt}</span>
                    </div>

                    {/* Acknowledge Button */}
                    <button
                      onClick={() => onToggleAcknowledge(hotspot.id)}
                      className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                        hotspot.isAcknowledged
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{hotspot.isAcknowledged ? 'Reviewed' : 'Mark Reviewed'}</span>
                    </button>
                  </div>
                </div>

                {/* Middle Row: Factual Summary & Exact AWR Evidence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3">
                    <span className="text-rose-300/90 font-semibold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Factual Issue Assessment
                    </span>
                    <p className="text-slate-300 leading-relaxed">{hotspot.rootCause}</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3">
                    <span className="text-amber-300/90 font-semibold flex items-center gap-1.5 mb-1">
                      <Eye className="w-3.5 h-3.5 text-amber-400" /> AWR Evidence & Section Source
                    </span>
                    <p className="text-slate-300 leading-relaxed">{hotspot.evidenceSummary}</p>
                    <div className="mt-2 text-[10px] text-slate-500 font-mono">
                      Source: {hotspot.awrSourceSection}
                    </div>
                  </div>
                </div>

                {/* STATEMENT TEXT TAB & CONTAINER FOR SQL */}
                {isSqlCategory && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden min-w-0 max-w-full">
                    {/* Tab Navigation inside Statement Text block */}
                    <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveSqlTab(prev => ({ ...prev, [hotspot.id]: 'complete' }))}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                            currentTab === 'complete'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <FileCode className="w-3 h-3 text-amber-400" />
                          <span>Statement Text (Complete Query)</span>
                        </button>

                        <button
                          onClick={() => setActiveSqlTab(prev => ({ ...prev, [hotspot.id]: 'all-list' }))}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                            currentTab === 'all-list'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Code2 className="w-3 h-3 text-slate-400" />
                          <span>Complete List of SQL Text Tab ({allCompleteSqlEntries.length})</span>
                        </button>

                        {hotspot.perExecutionCost && (
                          <button
                            onClick={() => setActiveSqlTab(prev => ({ ...prev, [hotspot.id]: 'metrics' }))}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                              currentTab === 'metrics'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Cpu className="w-3 h-3 text-slate-400" />
                            <span>Per-Exec Metrics</span>
                          </button>
                        )}
                      </div>

                      {/* Query Action Buttons */}
                      {fullQueryText && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(`sql-${hotspot.id}`, fullQueryText)}
                            className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700 transition-colors"
                            title="Copy Full SQL"
                          >
                            {copiedId === `sql-${hotspot.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Full SQL</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadSql(sqlIdFromHotspot || 'statement', fullQueryText)}
                            className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700 transition-colors"
                            title="Download .sql"
                          >
                            <Download className="w-3 h-3" />
                            <span>.sql</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tab 1: Complete SQL / PLSQL Query View */}
                    {currentTab === 'complete' && (
                      <div>
                        <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Fetched from: Complete List of SQL Text</span>
                            </span>
                            {sqlIdFromHotspot && <span>SQL ID: <strong className="text-amber-300">{sqlIdFromHotspot}</strong></span>}
                            <span>Lines: {lineCount}</span>
                            <span>Length: {fullQueryText.length} chars</span>
                          </div>
                          <span>Plan Hash: {hotspot.planHashValue || 'Recorded in AWR'}</span>
                        </div>

                        {fullQueryText ? (
                          <div className="p-3 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed max-h-96 bg-slate-950 select-all max-w-full">
                            {fullQueryText}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                            <p>No complete SQL text was mapped for SQL ID: <span className="font-mono text-amber-300 font-bold">{sqlIdFromHotspot}</span></p>
                            <p className="text-[11px] text-slate-500">
                              Click the <strong className="text-slate-300">Complete List of SQL Text Tab</strong> above to view all {allCompleteSqlEntries.length} queries parsed from this report.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Complete List of SQL Text Tab (AWR Archive lookup) */}
                    {currentTab === 'all-list' && (
                      <div className="p-3 space-y-3 bg-slate-950 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                          <span className="text-slate-300 font-bold font-mono">
                            All Statements Captured in "Complete List of SQL Text" ({allCompleteSqlEntries.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Consecutive complete SQL texts parsed by SQL ID
                          </span>
                        </div>

                        {allCompleteSqlEntries.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No statements found under the "Complete List of SQL Text" section for this report.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {allCompleteSqlEntries.map(([id, text]) => {
                              const isThisSql = id === sqlIdFromHotspot;
                              const isExpanded = !!expandedSqlIds[id];
                              const lines = text.split('\n').length;

                              return (
                                <div
                                  key={id}
                                  className={`p-3 rounded-lg border text-xs font-mono space-y-2 transition-all ${
                                    isThisSql
                                      ? 'bg-amber-950/25 border-amber-700/70 shadow-sm shadow-amber-950/20'
                                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-amber-300 text-xs">{id}</span>
                                      {isThisSql && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                                          TARGET HOTSPOT SQL ID
                                        </span>
                                      )}
                                      <span className="text-slate-500 text-[10px]">
                                        ({lines} lines · {text.length} chars)
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setExpandedSqlIds(prev => ({ ...prev, [id]: !prev[id] }))}
                                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 transition-colors"
                                      >
                                        {isExpanded ? 'Collapse' : 'Expand Full Text'}
                                      </button>
                                      <button
                                        onClick={() => handleCopy(`archive-${id}`, text)}
                                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700 flex items-center gap-1 transition-colors"
                                      >
                                        {copiedId === `archive-${id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedId === `archive-${id}` ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    </div>
                                  </div>

                                  <pre className={`text-[11px] font-mono text-amber-200/90 whitespace-pre overflow-x-auto leading-relaxed p-2.5 rounded bg-slate-950/90 border border-slate-850 ${
                                    isExpanded || isThisSql ? 'max-h-72' : 'max-h-24'
                                  }`}>
                                    {text}
                                  </pre>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Per-Execution Resource Metrics */}
                    {currentTab === 'metrics' && hotspot.perExecutionCost && (
                      <div className="p-3 text-xs">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                          AWR Normalized Per-Execution Resource Metrics
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                          <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                            <span className="text-slate-500 text-[10px] block">Elapsed/Exec</span>
                            <span className="text-slate-200 font-semibold">{hotspot.perExecutionCost.elapsedPerExecMs || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                            <span className="text-slate-500 text-[10px] block">CPU/Exec</span>
                            <span className="text-slate-200 font-semibold">{hotspot.perExecutionCost.cpuPerExecMs || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                            <span className="text-slate-500 text-[10px] block">Buffer Gets/Exec</span>
                            <span className="text-slate-200 font-semibold">{hotspot.perExecutionCost.getsPerExec || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                            <span className="text-slate-500 text-[10px] block">Physical Reads/Exec</span>
                            <span className="text-slate-200 font-semibold">{hotspot.perExecutionCost.readsPerExec || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Live Oracle Diagnostic Command (No Speculative Tuning) */}
                <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-slate-300 flex items-center gap-1.5 text-[11px]">
                      <Terminal className="w-3.5 h-3.5 text-amber-500" /> Live Oracle Diagnostic Command (Run in SQL*Plus / SQLcl)
                    </span>
                    <button
                      onClick={() => handleCopy(hotspot.id, hotspot.diagnosticSql)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedId === hotspot.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Diagnostic SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed">
                    {hotspot.diagnosticSql}
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: COMPLETE LIST OF SQL TEXT (ALL STATEMENTS) */}
      {isCompleteSqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-amber-500/10 text-amber-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100 font-mono">
                    Complete List of SQL Text Section
                  </h2>
                  <p className="text-xs text-slate-400">
                    All full SQL & PL/SQL queries parsed from the AWR report's "Complete List of SQL Text" table.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCompleteSqlModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/60">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by SQL_ID (e.g. 8b9f31a7x2d9) or query keyword (e.g. SELECT, ORDER_ITEMS, DECLARE)..."
                  value={modalSqlSearch}
                  onChange={(e) => setModalSqlSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Modal Statements List */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {filteredModalSqlList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No statements match your search criteria.
                </div>
              ) : (
                filteredModalSqlList.map(([sqlId, query]) => (
                  <div key={sqlId} className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">SQL_ID: {sqlId}</span>
                        <span className="text-[10px] text-slate-500">({query.length} chars)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(query);
                            setCopiedModalSqlId(sqlId);
                            setTimeout(() => setCopiedModalSqlId(null), 2000);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                        >
                          {copiedModalSqlId === sqlId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Query</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadSql(sqlId, query)}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>.sql</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed max-h-60 bg-slate-950">
                      {query}
                    </pre>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 rounded-b-xl text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Showing {filteredModalSqlList.length} of {allCompleteSqlEntries.length} queries
              </span>
              <button
                onClick={() => setIsCompleteSqlModalOpen(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
