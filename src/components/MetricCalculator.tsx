import React, { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { VerificationStatus } from '../types/awr';

interface MetricCalculatorProps {
  onSyncFindingsToRunbook: (findings: {
    aas: number;
    coreLoadRatio: number;
    hostWio: number;
    hardParsePct: number;
    bufferHit: number;
    pgaHit: number;
  }) => void;
}

export const MetricCalculator: React.FC<MetricCalculatorProps> = ({ onSyncFindingsToRunbook }) => {
  // Snapshot Inputs
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(60);
  const [dbTimeMinutes, setDbTimeMinutes] = useState<number>(120);
  const [cpuCores, setCpuCores] = useState<number>(16);

  // Host OS CPU
  const [userCpuPct, setUserCpuPct] = useState<number>(45);
  const [sysCpuPct, setSysCpuPct] = useState<number>(8);
  const [wioPct, setWioPct] = useState<number>(5);

  // Load Profile Metrics
  const [logicalReads, setLogicalReads] = useState<number>(15000000);
  const [physicalReads, setPhysicalReads] = useState<number>(120000);
  const [executions, setExecutions] = useState<number>(180000);
  const [parseCalls, setParseCalls] = useState<number>(12000);
  const [hardParses, setHardParses] = useState<number>(150);
  const [redoMbTotal, setRedoMbTotal] = useState<number>(4500);

  // Memory Ratios
  const [bufferHitPct, setBufferHitPct] = useState<number>(98.2);
  const [pgaHitPct, setPgaHitPct] = useState<number>(96.5);

  // Calculated Outputs
  const elapsedSeconds = Math.max(1, elapsedMinutes * 60);
  const aas = Math.round((dbTimeMinutes / Math.max(0.1, elapsedMinutes)) * 10) / 10;
  const coreLoadRatio = Math.round((aas / Math.max(1, cpuCores)) * 100);
  const logicalReadsPerSec = Math.round(logicalReads / elapsedSeconds);
  const physicalReadsPerSec = Math.round(physicalReads / elapsedSeconds);
  const executionsPerSec = Math.round(executions / elapsedSeconds);
  const getsPerExec = Math.round(logicalReads / Math.max(1, executions));
  const hardParsePct = Math.round((hardParses / Math.max(1, parseCalls)) * 1000) / 10;
  const softParsePct = Math.round((100 - hardParsePct) * 10) / 10;
  const redoMbPerSec = Math.round((redoMbTotal / elapsedSeconds) * 10) / 10;

  // Automated Diagnostic Flags
  const flags: { level: 'pass' | 'warning' | 'critical'; title: string; desc: string }[] = [];

  if (aas > cpuCores) {
    flags.push({
      level: 'critical',
      title: 'Active Session CPU Starvation',
      desc: `AAS (${aas}) exceeds total physical CPU cores (${cpuCores}). Sessions are waiting in the OS run queue.`
    });
  } else if (coreLoadRatio > 75) {
    flags.push({
      level: 'warning',
      title: 'Elevated CPU Load Factor',
      desc: `AAS represents ${coreLoadRatio}% of physical core capacity. Monitor for concurrency spikes.`
    });
  } else {
    flags.push({
      level: 'pass',
      title: 'Healthy CPU Load Headroom',
      desc: `AAS (${aas}) is safely under physical core capacity (${cpuCores} cores).`
    });
  }

  if (wioPct > 15) {
    flags.push({
      level: 'critical',
      title: 'Storage I/O Bottleneck (%WIO High)',
      desc: `OS I/O wait is ${wioPct}%, indicating storage subsystem latency stalls.`
    });
  } else if (wioPct > 8) {
    flags.push({
      level: 'warning',
      title: 'Moderate Storage I/O Latency',
      desc: `OS I/O wait is ${wioPct}%. Verify single-block and multi-block read latencies.`
    });
  }

  if (hardParsePct > 15) {
    flags.push({
      level: 'critical',
      title: 'Severe Hard Parse Storm',
      desc: `Hard Parse rate is ${hardParsePct}%. Shared pool mutex thrashing and cursor pins imminent.`
    });
  } else if (hardParsePct > 5) {
    flags.push({
      level: 'warning',
      title: 'Elevated Hard Parsing',
      desc: `Hard Parse rate is ${hardParsePct}%. Check for dynamic SQL without bind variables.`
    });
  }

  if (pgaHitPct < 80) {
    flags.push({
      level: 'critical',
      title: 'PGA Workarea TEMP Spill Thrashing',
      desc: `PGA Cache Hit is ${pgaHitPct}%. High likelihood of multi-pass hash joins spilling to TEMP disk.`
    });
  }

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5 max-w-full min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-slate-100">
          AAS & Metric Calculator
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Compute Average Active Sessions, core saturation, parse efficiency, and automated threshold alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-full min-w-0">
        {/* Left 2 Cols: Form Inputs */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">
            1. Snapshot Timing & CPU Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Elapsed Time (Minutes):</label>
              <input
                type="number"
                min="1"
                value={elapsedMinutes}
                onChange={(e) => setElapsedMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">DB Time (Minutes):</label>
              <input
                type="number"
                min="0"
                value={dbTimeMinutes}
                onChange={(e) => setDbTimeMinutes(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Host CPU Cores:</label>
              <input
                type="number"
                min="1"
                value={cpuCores}
                onChange={(e) => setCpuCores(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 pt-2">
            2. Host OS CPU Statistics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Host %User CPU:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={userCpuPct}
                onChange={(e) => setUserCpuPct(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Host %System CPU:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={sysCpuPct}
                onChange={(e) => setSysCpuPct(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Host %WIO (Wait on I/O):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={wioPct}
                onChange={(e) => setWioPct(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 pt-2">
            3. Load Profile & Parsing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Logical Reads (Total):</label>
              <input
                type="number"
                min="0"
                value={logicalReads}
                onChange={(e) => setLogicalReads(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Physical Reads (Total):</label>
              <input
                type="number"
                min="0"
                value={physicalReads}
                onChange={(e) => setPhysicalReads(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Executions (Total):</label>
              <input
                type="number"
                min="0"
                value={executions}
                onChange={(e) => setExecutions(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Parse Calls (Total):</label>
              <input
                type="number"
                min="0"
                value={parseCalls}
                onChange={(e) => setParseCalls(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Hard Parses (Total):</label>
              <input
                type="number"
                min="0"
                value={hardParses}
                onChange={(e) => setHardParses(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Total Redo Generated (MB):</label>
              <input
                type="number"
                min="0"
                value={redoMbTotal}
                onChange={(e) => setRedoMbTotal(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 pt-2">
            4. Memory Hit Ratios
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Buffer Cache Hit %:</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={bufferHitPct}
                onChange={(e) => setBufferHitPct(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">PGA Cache Hit %:</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={pgaHitPct}
                onChange={(e) => setPgaHitPct(Number(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Col: Instant Diagnosis & Computed Metrics */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-100 flex items-center justify-between">
              <span>Computed Key Indicators</span>
              <span className="font-mono text-xs text-amber-400">Live Evaluation</span>
            </h2>

            {/* AAS Hero Card */}
            <div className={`p-4 rounded-lg border ${
              aas > cpuCores 
                ? 'bg-rose-950/30 border-rose-800 text-rose-200' 
                : coreLoadRatio > 75 
                ? 'bg-amber-950/30 border-amber-800 text-amber-200' 
                : 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
            }`}>
              <div className="text-xs uppercase tracking-wide opacity-80 font-medium">Average Active Sessions (AAS)</div>
              <div className="text-3xl font-bold font-mono mt-1">{aas}</div>
              <div className="text-xs mt-1 font-mono">
                {coreLoadRatio}% of {cpuCores} CPU Cores ({aas > cpuCores ? 'Bottlenecked' : 'Normal Capacity'})
              </div>
            </div>

            {/* Stat Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Logical Reads/sec</span>
                <span className="font-mono text-slate-200 font-semibold">{logicalReadsPerSec.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Physical Reads/sec</span>
                <span className="font-mono text-slate-200 font-semibold">{physicalReadsPerSec.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Gets per Exec</span>
                <span className="font-mono text-slate-200 font-semibold">{getsPerExec.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Hard Parse %</span>
                <span className={`font-mono font-semibold ${hardParsePct > 15 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {hardParsePct}%
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Soft Parse %</span>
                <span className="font-mono text-slate-200 font-semibold">{softParsePct}%</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Redo MB/sec</span>
                <span className="font-mono text-slate-200 font-semibold">{redoMbPerSec} MB/s</span>
              </div>
            </div>

            {/* Diagnostic Flags */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Rule-Based Triage Triggers
              </span>
              {flags.map((flag, i) => (
                <div key={i} className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
                  flag.level === 'critical'
                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    : flag.level === 'warning'
                    ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                    : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                }`}>
                  {flag.level === 'critical' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  ) : flag.level === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-semibold">{flag.title}</strong>
                    <span className="text-slate-400">{flag.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sync to Checklist Action */}
            <button
              onClick={() => onSyncFindingsToRunbook({
                aas,
                coreLoadRatio,
                hostWio: wioPct,
                hardParsePct,
                bufferHit: bufferHitPct,
                pgaHit: pgaHitPct
              })}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 p-2.5 rounded text-xs font-semibold transition-colors mt-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Apply to Runbook Checklist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
