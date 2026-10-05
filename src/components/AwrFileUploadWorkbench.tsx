import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Files, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Sparkles, 
  Database, 
  Cpu, 
  Clock, 
  Layers, 
  X, 
  Play, 
  BarChart3,
  HardDrive,
  Eye,
  FileCheck2,
  TrendingUp,
  Activity,
  ShieldCheck,
  Lock,
  Code2,
  Copy,
  Check,
  Search,
  Download,
  FileSpreadsheet,
  FileCode,
  Printer
} from 'lucide-react';
import { ParsedAwrReport, AwrAnalysisResult, parseAwrContent, evaluateAwrAgainstRunbook, detectSqlStatementType } from '../utils/awrParser';

interface AwrFileUploadWorkbenchProps {
  onAwrAnalysisComplete: (result: AwrAnalysisResult, allReports: ParsedAwrReport[]) => void;
  activeReport: ParsedAwrReport | null;
  allLoadedReports: ParsedAwrReport[];
  onSelectActiveReport: (report: ParsedAwrReport) => void;
  onClearReports: () => void;
  onNavigateToHotspots?: () => void;
  onNavigateToRunbook?: () => void;
  onOpenPerformedChecklistsModal?: () => void;
  onLoadSampleAwr?: () => void;
  onOpenExportHub?: () => void;
}

export const AwrFileUploadWorkbench: React.FC<AwrFileUploadWorkbenchProps> = ({
  onAwrAnalysisComplete,
  activeReport,
  allLoadedReports,
  onSelectActiveReport,
  onClearReports,
  onNavigateToHotspots,
  onNavigateToRunbook,
  onOpenPerformedChecklistsModal,
  onLoadSampleAwr,
  onOpenExportHub
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparisonMatrix, setShowComparisonMatrix] = useState(true);
  const [sqlSearchQuery, setSqlSearchQuery] = useState('');
  const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);
  const [expandedSqlMap, setExpandedSqlMap] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopySql = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSqlId(id);
    setTimeout(() => setCopiedSqlId(null), 2000);
  };

  const handleDownloadSql = (id: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statement_${id}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pre-calculate complete SQL entries from activeReport
  const activeReportCompleteSqlList: [string, string][] = activeReport
    ? Object.entries(activeReport.completeSqlTexts || {})
    : [];

  const filteredCompleteSqlList = activeReportCompleteSqlList.filter(([id, query]) => {
    if (!sqlSearchQuery.trim()) return true;
    const q = sqlSearchQuery.toLowerCase();
    return id.toLowerCase().includes(q) || query.toLowerCase().includes(q);
  });

  // File Upload Handlers
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    const parsedList: ParsedAwrReport[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const parsed = parseAwrContent(file.name, text);
        parsedList.push(parsed);
      } catch (err) {
        console.error('Error parsing file:', file.name, err);
      }
    }

    if (parsedList.length > 0) {
      // Evaluate the highest AAS or first file
      parsedList.sort((a, b) => b.aas - a.aas);
      const active = parsedList[0];
      const result = evaluateAwrAgainstRunbook(active);
      onAwrAnalysisComplete(result, parsedList);
    }
    setIsProcessing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    setIsProcessing(true);
    const parsed = parseAwrContent('pasted_awr_report.html', pasteText);
    const result = evaluateAwrAgainstRunbook(parsed);
    onAwrAnalysisComplete(result, [parsed]);
    setIsPasteOpen(false);
    setPasteText('');
    setIsProcessing(false);
  };

  // Pre-packaged Sample Loaders for instant testing
  const loadPrepackagedSample = (sampleType: 'san-io' | 'hard-parse' | 'plan-flip' | 'multi-snap') => {
    setIsProcessing(true);

    if (sampleType === 'multi-snap') {
      const snap1 = parseAwrContent('awr_0800_baseline.html', generateMockAwrHtml('PRODDB', 16, 51019, 51020, 60, 180, 2.5, 4.2, 0.5));
      const snap2 = parseAwrContent('awr_0900_degraded.html', generateMockAwrHtml('PRODDB', 16, 51020, 51021, 60, 2520, 18.2, 58.0, 0.2));
      const snap3 = parseAwrContent('awr_1000_recovery.html', generateMockAwrHtml('PRODDB', 16, 51021, 51022, 60, 840, 6.5, 12.0, 0.8));
      
      const result = evaluateAwrAgainstRunbook(snap2);
      onAwrAnalysisComplete(result, [snap2, snap1, snap3]);
    } else if (sampleType === 'san-io') {
      const parsed = parseAwrContent('awr_san_io_outage.html', generateMockAwrHtml('PRODDB', 16, 51020, 51021, 60, 2520, 18.2, 58.0, 0.2));
      const result = evaluateAwrAgainstRunbook(parsed);
      onAwrAnalysisComplete(result, [parsed]);
    } else if (sampleType === 'hard-parse') {
      const parsed = parseAwrContent('awr_hard_parse_storm.html', generateMockAwrHtml('FINDB', 32, 62100, 62101, 30, 1980, 2.1, 2.0, 78.4));
      const result = evaluateAwrAgainstRunbook(parsed);
      onAwrAnalysisComplete(result, [parsed]);
    } else {
      const parsed = parseAwrContent('awr_plan_regression.txt', generateMockAwrHtml('ORDERDB', 24, 71400, 71401, 60, 2850, 4.2, 14.0, 0.1));
      const result = evaluateAwrAgainstRunbook(parsed);
      onAwrAnalysisComplete(result, [parsed]);
    }

    setIsProcessing(false);
  };

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Upload Dropzone */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5 space-y-4 max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100">
              AWR File Upload & Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload Oracle AWR HTML or text reports for automated cross-checking and hotspot triage.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {allLoadedReports.length > 0 && (
              <button
                onClick={onClearReports}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors cursor-pointer"
              >
                Clear Files ({allLoadedReports.length})
              </button>
            )}
            <button
              onClick={() => setIsPasteOpen(!isPasteOpen)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste AWR</span>
            </button>
          </div>
        </div>

        {/* Multi-file Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            multiple
            accept=".html,.htm,.txt,.log,.out"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {isProcessing ? 'Parsing AWR File(s)...' : 'Drag & drop AWR files here, or browse'}
            </div>
            <p className="text-xs text-slate-500">
              Supports standard awrrpt.sql HTML and plain text outputs. Select single or multiple snapshots.
            </p>
          </div>
        </div>

        {/* Inline Sample Scenarios */}
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap pt-1">
          <span className="text-[11px] font-medium text-slate-500">Or test with sample data:</span>
          <button
            onClick={() => loadPrepackagedSample('san-io')}
            className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
          >
            SAN I/O Outage
          </button>
          <span className="text-slate-600">·</span>
          <button
            onClick={() => loadPrepackagedSample('hard-parse')}
            className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
          >
            Hard Parse Storm
          </button>
          <span className="text-slate-600">·</span>
          <button
            onClick={() => loadPrepackagedSample('plan-flip')}
            className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
          >
            Plan Hash Regression
          </button>
          <span className="text-slate-600">·</span>
          <button
            onClick={() => loadPrepackagedSample('multi-snap')}
            className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
          >
            Multi-Snap Batch
          </button>
        </div>
      </div>

      {/* Multi-AWR Comparison Delta Matrix (When Multiple Files are Loaded) */}
      {allLoadedReports.length > 1 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Multi-AWR Comparison & Delta Matrix ({allLoadedReports.length} Files Loaded)
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Click any report row to set it as active and view its individual checklist cross-check.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950/60">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Database</th>
                  <th className="py-2.5 px-3">Snapshot Range</th>
                  <th className="py-2.5 px-3">AAS</th>
                  <th className="py-2.5 px-3">DB Time (min)</th>
                  <th className="py-2.5 px-3">%User / %WIO</th>
                  <th className="py-2.5 px-3">Logical Reads/s</th>
                  <th className="py-2.5 px-3">Top Bottleneck Event</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {allLoadedReports.map(rpt => {
                  const isActive = activeReport?.fileName === rpt.fileName;
                  const isAasCrit = rpt.aas > rpt.cpuCores;
                  const topWait = rpt.topWaitEvents.find(e => e.name !== 'DB CPU') || rpt.topWaitEvents[0];

                  return (
                    <tr
                      key={rpt.fileName}
                      onClick={() => onSelectActiveReport(rpt)}
                      className={`cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-200'
                          : 'hover:bg-slate-850 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isActive ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                            LOADED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        {rpt.fileName}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                        {rpt.dbName} ({rpt.cpuCores} Cores)
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {rpt.beginSnapId} → {rpt.endSnapId} ({rpt.elapsedMinutes}m)
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                        <span className={isAasCrit ? 'text-rose-400' : 'text-slate-200'}>
                          {rpt.aas}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                        {rpt.dbTimeMinutes}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-slate-300">{rpt.hostUserCpuPct}%</span> /{' '}
                        <span className={rpt.hostWioPct > 15 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {rpt.hostWioPct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                        {rpt.logicalReadsPerSec.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                        {topWait ? `${topWait.name} (${topWait.pctDbTime}%)` : 'None'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectActiveReport(rpt);
                          }}
                          className="px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State when no report is loaded */}
      {!activeReport && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400 mx-auto">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">
              No AWR Report Loaded Yet (Zero File Storage Active)
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Upload your Oracle AWR report (HTML or text) above, or paste raw content. All telemetry parsing, SQL extraction, and runbook cross-checks execute strictly in volatile memory. No file data is stored on disk or server.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            {onLoadSampleAwr && (
              <button
                onClick={onLoadSampleAwr}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample AWR Report</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Parsed Report Telemetry Summary Card */}
      {activeReport && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5 space-y-4 min-w-0 max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ACTIVE REPORT
                </span>
                <h2 className="text-base font-bold text-slate-100 font-mono">
                  {activeReport.fileName}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Database: <strong className="text-slate-200">{activeReport.dbName}</strong> (DBID: {activeReport.dbId}) on {activeReport.hostName} · {activeReport.release} · RAC: {activeReport.isRac ? 'YES' : 'NO'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onNavigateToHotspots && (
                <button
                  onClick={onNavigateToHotspots}
                  className="px-3 py-1.5 rounded text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Top Issues</span>
                </button>
              )}
              {onNavigateToRunbook && (
                <button
                  onClick={onNavigateToRunbook}
                  className="px-3 py-1.5 rounded text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Runbook</span>
                </button>
              )}
              {onOpenExportHub && (
                <button
                  onClick={onOpenExportHub}
                  className="px-3 py-1.5 rounded text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export Active AWR Diagnostics"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Average Active Sessions</span>
              <span className={`text-lg font-bold font-mono ${activeReport.aas > activeReport.cpuCores ? 'text-rose-400' : 'text-slate-100'}`}>
                {activeReport.aas}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                {activeReport.cpuCores > 0 ? Math.round((activeReport.aas / activeReport.cpuCores) * 100) : 0}% of {activeReport.cpuCores} Cores
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">DB Time (mins)</span>
              <span className="text-lg font-bold font-mono text-slate-100">{activeReport.dbTimeMinutes}</span>
              <span className="text-[10px] text-slate-500 block">Workload in {activeReport.elapsedMinutes}m</span>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Host %User / %WIO</span>
              <span className={`text-lg font-bold font-mono ${activeReport.hostWioPct > 15 ? 'text-rose-400' : 'text-slate-100'}`}>
                {activeReport.hostUserCpuPct}% / {activeReport.hostWioPct}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                {activeReport.hostWioPct > 15 ? 'Storage Lag Alert' : 'Nominal'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Logical Reads/sec</span>
              <span className="text-lg font-bold font-mono text-slate-100">{activeReport.logicalReadsPerSec.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 block">Buffer Cache Gets</span>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Hard Parse %</span>
              <span className={`text-lg font-bold font-mono ${activeReport.hardParsePct > 5 ? 'text-rose-400' : 'text-slate-100'}`}>
                {activeReport.hardParsePct}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                {activeReport.hardParsePct > 5 ? 'Parse Storm' : 'Optimal'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block text-[11px]">PGA Cache Hit %</span>
              <span className={`text-lg font-bold font-mono ${activeReport.pgaHitPct < 85 ? 'text-rose-400' : 'text-slate-100'}`}>
                {activeReport.pgaHitPct}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                {activeReport.pgaHitPct < 85 ? 'Spilling to Temp' : 'Optimal'}
              </span>
            </div>
          </div>

          {/* Complete List of SQL Text Section */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 sm:p-5 space-y-3 min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-mono">
                    Complete List of SQL Text
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                    {activeReportCompleteSqlList.length} Statements Captured
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full SQL statements extracted by SQL ID directly from the AWR report.
                </p>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sqlSearchQuery}
                  onChange={e => setSqlSearchQuery(e.target.value)}
                  placeholder="Filter by SQL ID or text..."
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* List of Statements */}
            {filteredCompleteSqlList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2 bg-slate-900/30 rounded border border-slate-800/50">
                {activeReportCompleteSqlList.length === 0 ? (
                  <p>No statements were found in the "Complete List of SQL Text" section of this report.</p>
                ) : (
                  <p>No queries match your search query "{sqlSearchQuery}".</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredCompleteSqlList.map(([sqlId, query]) => {
                  const matchingTopSql = activeReport.topSql.find(s => s.sqlId === sqlId);
                  const isExpanded = expandedSqlMap[sqlId] ?? false;
                  const statementType = detectSqlStatementType(query);
                  const lines = query.split('\n').length;

                  return (
                    <div key={sqlId} className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden min-w-0 max-w-full">
                      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-amber-300 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            SQL_ID: {sqlId}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            {statementType}
                          </span>
                          {matchingTopSql && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800">
                              Top SQL: {matchingTopSql.elapsedSeconds}s ({matchingTopSql.pctDbTime}% DB Time)
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {lines} lines · {query.length} chars
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopySql(sqlId, query)}
                            className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                          >
                            {copiedSqlId === sqlId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy SQL</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadSql(sqlId, query)}
                            className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                            title="Download SQL statement"
                          >
                            <Download className="w-3 h-3" />
                            <span>.sql</span>
                          </button>
                          <button
                            onClick={() => setExpandedSqlMap(prev => ({ ...prev, [sqlId]: !isExpanded }))}
                            className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </button>
                        </div>
                      </div>

                      <pre className={`p-3 sm:p-4 text-xs font-mono text-amber-200/90 bg-slate-950 overflow-x-auto whitespace-pre leading-relaxed select-all max-w-full ${isExpanded ? '' : 'max-h-48'}`}>
                        {query}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function generateMockAwrHtml(db: string, cores: number, bSnap: number, eSnap: number, elapsed: number, dbTime: number, seqReadMs: number, wioPct: number, hardParsePct: number): string {
  return `<html>
<head><title>AWR Report for ${db}</title></head>
<body>
<h1>WORKLOAD REPOSITORY report for ${db}</h1>
<table>
  <tr><td>DB Name</td><td>${db}</td><td>DB Id</td><td>1928471029</td><td>Instance</td><td>${db.toLowerCase()}1</td></tr>
  <tr><td>Host</td><td>db-srv-01</td><td>Release</td><td>19.18.0.0.0</td><td>Cores</td><td>${cores}</td><td>CPUs</td><td>${cores * 2}</td></tr>
</table>
<table>
  <tr><td>Begin Snap:</td><td>${bSnap}</td><td>01-Oct-26 09:00:00</td></tr>
  <tr><td>End Snap:</td><td>${eSnap}</td><td>01-Oct-26 10:00:00</td></tr>
  <tr><td>Elapsed:</td><td>${elapsed} (mins)</td><td>DB Time:</td><td>${dbTime} (mins)</td></tr>
</table>
<h3>Load Profile</h3>
<table>
  <tr><td>Logical read (blocks):</td><td>450,000.0</td></tr>
  <tr><td>Physical read (blocks):</td><td>12,400.0</td></tr>
  <tr><td>Executes (SQL):</td><td>3,200.0</td></tr>
  <tr><td>Parses:</td><td>450.0</td></tr>
  <tr><td>Hard parses:</td><td>${Math.round(450 * (hardParsePct / 100))}</td></tr>
  <tr><td>Soft Parse %:</td><td>${Math.round((100 - hardParsePct) * 10) / 10}</td></tr>
  <tr><td>Buffer Hit %:</td><td>98.4</td></tr>
  <tr><td>PGA Cache Hit %:</td><td>${hardParsePct > 50 ? 99.2 : 74.5}</td></tr>
</table>
<h3>Top 10 Foreground Events by Total Wait Time</h3>
<table>
  <tr><td>db file sequential read</td><td>78,400</td><td>1,420</td><td>${seqReadMs}</td><td>49.8</td><td>User I/O</td></tr>
  <tr><td>cursor: pin S wait on X</td><td>54,200</td><td>890</td><td>16.4</td><td>31.2</td><td>Concurrency</td></tr>
  <tr><td>log file sync</td><td>34,000</td><td>580</td><td>16.5</td><td>20.3</td><td>Commit</td></tr>
</table>
<h3>Operating System Statistics</h3>
<table>
  <tr><td>%User</td><td>${Math.round(85 - wioPct)}</td></tr>
  <tr><td>%Sys</td><td>10</td></tr>
  <tr><td>%WIO</td><td>${wioPct}</td></tr>
</table>
<h3>SQL ordered by Elapsed Time</h3>
<table>
  <tr><td>8b9f31a7x2d9</td><td>4829104812</td><td>5,400</td><td>1840.5</td><td>1680.0</td><td>1240000000</td><td>8500000</td><td>SELECT oi.order_id FROM order_items oi</td></tr>
  <tr><td>3ka901mc77d1</td><td>1948201948</td><td>48,000</td><td>620.0</td><td>580.0</td><td>42500000</td><td>240000</td><td>SELECT c.customer_name FROM customers c</td></tr>
</table>
<h3>Complete List of SQL Text</h3>
<table border="1" summary="This table displays the SQL text of SQL statements in the workload repository.">
  <tr><th>SQL Id</th><th>SQL Text</th></tr>
  <tr>
    <td>8b9f31a7x2d9</td>
    <td>SELECT oi.order_id, oi.product_id, SUM(oi.quantity * oi.unit_price) AS line_total, AVG(p.standard_cost) AS avg_cost
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_status = :b1
  AND o.order_date &gt;= TRUNC(SYSDATE - 30)
GROUP BY oi.order_id, oi.product_id
HAVING SUM(oi.quantity * oi.unit_price) &gt; 5000
ORDER BY line_total DESC;</td>
  </tr>
  <tr>
    <td>3ka901mc77d1</td>
    <td>SELECT c.customer_id, c.customer_name, a.city, a.postal_code, c.credit_limit
FROM customers c
JOIN customer_addresses a ON c.customer_id = a.customer_id
WHERE c.customer_type = :1
  AND c.account_status = 'ACTIVE'
ORDER BY c.customer_name;</td>
  </tr>
  <tr>
    <td>99ab4c102fea</td>
    <td>DECLARE
  v_batch_size NUMBER := 1000;
  v_processed  NUMBER := 0;
BEGIN
  FOR r IN (SELECT order_id FROM pending_orders WHERE status = 'RETRY') LOOP
    process_order_batch(r.order_id);
    v_processed := v_processed + 1;
    IF MOD(v_processed, v_batch_size) = 0 THEN
      COMMIT;
    END IF;
  END LOOP;
  COMMIT;
END;</td>
  </tr>
</table>
</body>
</html>`;
}
