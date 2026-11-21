import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Search, 
  Filter, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  ArrowLeft, 
  Sparkles,
  ExternalLink,
  Code2,
  Upload
} from 'lucide-react';
import { HotspotItem } from '../types/awr';

interface TopHotspotsDiagnosticCommandsProps {
  hotspots: HotspotItem[];
  onNavigateToHotspots?: () => void;
  onNavigateToUpload?: () => void;
  onLoadSampleAwr?: () => void;
}

export const TopHotspotsDiagnosticCommands: React.FC<TopHotspotsDiagnosticCommandsProps> = ({
  hotspots,
  onNavigateToHotspots,
  onNavigateToUpload,
  onLoadSampleAwr
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const criticalCount = hotspots.filter(h => h.severity === 'critical').length;
  const warningCount = hotspots.filter(h => h.severity === 'warning').length;
  const attentionCount = hotspots.filter(h => h.severity === 'attention').length;

  const categories = ['all', 'SQL', 'Wait Event', 'Segment/Object', 'Host & I/O', 'Lock & Concurrency'];

  const filteredHotspots = hotspots.filter(h => {
    const matchesSearch = 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.metricDimension.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.rootCause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.diagnosticSql.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || h.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || h.severity === selectedSeverity;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const handleCopyCommand = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateAllCommandsScript = () => {
    let script = `-- ============================================================================\n`;
    script += `-- ORACLE DATABASE AWR: TOP 20 HOTSPOTS DIAGNOSTIC COMMANDS SCRIPT\n`;
    script += `-- Target Generation: ${new Date().toISOString()}\n`;
    script += `-- Hotspot Summary: ${criticalCount} Critical | ${warningCount} Warnings | ${attentionCount} Attention\n`;
    script += `-- Instructions: Run individually or batch in SQL*Plus or SQLcl connected as SYSDBA\n`;
    script += `-- ============================================================================\n\n`;
    script += `SET LINESIZE 250 PAGESIZE 1000 TRIMSPOOL ON ECHO ON TIMING ON\n\n`;

    hotspots.forEach(h => {
      script += `-- ----------------------------------------------------------------------------\n`;
      script += `-- #${h.rank} [${h.severity.toUpperCase()}] ${h.name}\n`;
      script += `-- Category: ${h.category} | Dimension: ${h.metricDimension} | DB Time Impact: ${h.impactPct}%\n`;
      script += `-- Root Cause: ${h.rootCause}\n`;
      script += `-- AWR Evidence: ${h.evidenceSummary}\n`;
      script += `-- ----------------------------------------------------------------------------\n`;
      script += `${h.diagnosticSql.trim()}\n\n`;
    });

    return script;
  };

  const handleCopyAll = () => {
    const script = generateAllCommandsScript();
    navigator.clipboard.writeText(script);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadAllScript = () => {
    const script = generateAllCommandsScript();
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `AWR_Top20_Diagnostic_Commands_${date}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 sm:p-5 relative overflow-hidden max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
                <Terminal className="w-5 h-5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-100">
                Top 20 Hotspots with Oracle Diagnostic Commands
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live Oracle Diagnostic Commands (Run in SQL*Plus / SQLcl) mapped to each identified workload bottleneck.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToHotspots && (
              <button
                onClick={onNavigateToHotspots}
                className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Return to Hotspots Analysis"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>View Hotspots</span>
              </button>
            )}

            <button
              onClick={handleCopyAll}
              className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy all 20 diagnostic SQL commands to clipboard"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedAll ? 'All Copied!' : 'Copy All Commands'}</span>
            </button>

            <button
              onClick={handleDownloadAllScript}
              className="px-2.5 py-1 rounded text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download runnable SQL script containing all diagnostic commands"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .sql Script</span>
            </button>
          </div>
        </div>

        {/* Severity Metrics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-rose-900/40 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Critical Commands</span>
              <span className="text-lg font-bold font-mono text-rose-400">{criticalCount}</span>
            </div>
            <XCircle className="w-5 h-5 text-rose-500/60" />
          </div>

          <div className="bg-slate-950/80 border border-amber-900/40 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Warning Commands</span>
              <span className="text-lg font-bold font-mono text-amber-400">{warningCount}</span>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500/60" />
          </div>

          <div className="bg-slate-950/80 border border-blue-900/40 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Attention Commands</span>
              <span className="text-lg font-bold font-mono text-blue-400">{attentionCount}</span>
            </div>
            <Eye className="w-5 h-5 text-blue-500/60" />
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Total Commands</span>
              <span className="text-lg font-bold font-mono text-slate-200">{hotspots.length}</span>
            </div>
            <Terminal className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search diagnostic queries, SQL IDs, wait events, objects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity Filters */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setSelectedSeverity('all')}
              className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                selectedSeverity === 'all' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Severities
            </button>
            <button
              onClick={() => setSelectedSeverity('critical')}
              className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                selectedSeverity === 'critical' ? 'bg-rose-950 text-rose-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setSelectedSeverity('warning')}
              className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                selectedSeverity === 'warning' ? 'bg-amber-950 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Warnings ({warningCount})
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter by Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hotspots Commands List */}
      <div className="space-y-4">
        {filteredHotspots.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-lg text-slate-400 space-y-3">
            <p className="text-sm font-semibold">No Oracle diagnostic commands match the active search/filters.</p>
            {hotspots.length === 0 && (
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                {onNavigateToUpload && (
                  <button
                    onClick={onNavigateToUpload}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Go to AWR Files</span>
                  </button>
                )}
                {onLoadSampleAwr && (
                  <button
                    onClick={onLoadSampleAwr}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
                  >
                    Load Realistic Sample AWR
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredHotspots.map((hotspot) => {
            const isCritical = hotspot.severity === 'critical';
            const isWarning = hotspot.severity === 'warning';

            return (
              <div 
                key={hotspot.id}
                className={`bg-slate-900/80 border rounded-lg p-4 space-y-3 transition-all ${
                  isCritical 
                    ? 'border-rose-900/50 hover:border-rose-800' 
                    : isWarning 
                    ? 'border-amber-900/50 hover:border-amber-800' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Hotspot Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      isCritical
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : isWarning
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      #{hotspot.rank} {hotspot.severity.toUpperCase()}
                    </span>
                    <span className="font-bold text-sm text-slate-100 font-mono">
                      {hotspot.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                      {hotspot.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Metric: <strong className="text-slate-200">{hotspot.metricDimension}</strong>
                    </span>
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {hotspot.impactPct}% DB Time
                    </span>
                  </div>
                </div>

                {/* Root Cause & Evidence */}
                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-400 font-semibold">Root Cause: </span>
                    <span>{hotspot.rootCause}</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Evidence: {hotspot.evidenceSummary} ({hotspot.awrSourceSection}) · Breached: {hotspot.thresholdBreached}
                  </div>
                </div>

                {/* Live Oracle Diagnostic Command Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
                  <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-400 flex items-center gap-1.5 text-[11px] font-semibold">
                        <Terminal className="w-3.5 h-3.5 text-amber-400" /> Live Oracle Diagnostic Command
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
                        Run in SQL*Plus / SQLcl
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyCommand(hotspot.id, hotspot.diagnosticSql)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 transition-colors text-[11px] cursor-pointer"
                      title="Copy SQL diagnostic command to clipboard"
                    >
                      {copiedId === hotspot.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Diagnostic SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed select-all">
                    {hotspot.diagnosticSql}
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
