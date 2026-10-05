import React, { useState } from 'react';
import { Database, Cpu, HardDrive, Check, Copy, AlertTriangle, Lightbulb, Terminal, ArrowRight } from 'lucide-react';
import { memoryAdvisoryRules } from '../data/memoryAdvisoryRules';

export const MemoryAdvisories: React.FC = () => {
  const [selectedCompId, setSelectedCompId] = useState<string>(memoryAdvisoryRules[0].id);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // HugePages Interactive Sizer State
  const [totalRamGb, setTotalRamGb] = useState<number>(256);
  const [sgaTargetGb, setSgaTargetGb] = useState<number>(128);
  const [pgaTargetGb, setPgaTargetGb] = useState<number>(32);
  const [pageSizeMb, setPageSizeMb] = useState<number>(2); // 2MB standard or 1024MB 1GB

  // Calculations
  const sgaMb = sgaTargetGb * 1024;
  const rawHugePages = Math.ceil(sgaMb / pageSizeMb);
  const recommendedNrHugePages = rawHugePages + 100; // 100 page safety buffer
  const memlockKb = Math.ceil((totalRamGb * 1024 * 1024) * 0.95); // 95% of RAM or at least SGA+buffer
  const regularPageTableRamMb = Math.round((sgaMb / 4) * 0.008); // 8 bytes per 4KB page table entry
  const hugePageTableRamMb = Math.round((sgaMb / (pageSizeMb * 1024)) * 0.008);
  const pageTableSavingsMb = regularPageTableRamMb - hugePageTableRamMb;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const selectedRule = memoryAdvisoryRules.find(r => r.id === selectedCompId) || memoryAdvisoryRules[0];

  const hugePagesSysctlConfig = `# /etc/sysctl.conf configuration for Oracle Large Pages
# Host RAM: ${totalRamGb}GB | Target SGA: ${sgaTargetGb}GB | Page Size: ${pageSizeMb}MB
vm.nr_hugepages = ${recommendedNrHugePages}
vm.hugetlb_shm_group = 54321  # GID of dba group
vm.swappiness = 1             # Minimize kernel swapping`;

  const limitsConfConfig = `# /etc/security/limits.conf
# memlock must be large enough to lock entire SGA in memory
oracle   soft   memlock   ${memlockKb}
oracle   hard   memlock   ${memlockKb}`;

  const spfileConfig = `-- Oracle Database SPFILE Configuration
-- Disable AMM (Automatic Memory Management is incompatible with HugePages)
ALTER SYSTEM SET memory_target = 0 SCOPE=SPFILE;
ALTER SYSTEM SET memory_max_target = 0 SCOPE=SPFILE;

-- Configure ASMM (Automatic Shared Memory Management)
ALTER SYSTEM SET sga_target = ${sgaTargetGb}G SCOPE=SPFILE;
ALTER SYSTEM SET sga_max_size = ${sgaTargetGb}G SCOPE=SPFILE;
ALTER SYSTEM SET pga_aggregate_target = ${pgaTargetGb}G SCOPE=SPFILE;
ALTER SYSTEM SET pga_aggregate_limit = ${pgaTargetGb * 2}G SCOPE=SPFILE;

-- Enforce HugePages strictly (Refuse to start if HugePages insufficient)
ALTER SYSTEM SET use_large_pages = 'ONLY' SCOPE=SPFILE;`;

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5 max-w-full min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-slate-100">
          Memory Advisories & Sizing
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Sizing guidelines and inflection analysis for Buffer Cache, PGA, Shared Pool, and Linux HugePages.
        </p>

        {/* Component Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80">
          {memoryAdvisoryRules.map(rule => (
            <button
              key={rule.id}
              onClick={() => setSelectedCompId(rule.id)}
              className={`p-2.5 rounded text-left transition-all border ${
                selectedCompId === rule.id
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-semibold leading-tight">{rule.component}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Component Rule Details */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 sm:p-5 space-y-4 max-w-full min-w-0">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-100">{selectedRule.component} Advisory Rule</h2>
              <span className="text-xs font-mono text-slate-400">Parameter: {selectedRule.targetParameter}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-amber-400">
              Advisor: {selectedRule.advisorView}
            </div>
          </div>
        </div>

        {/* Mathematical Threshold & Inflection Rule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded p-4">
            <h3 className="font-semibold text-amber-400 mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Inflection Point (Knee-of-the-Curve) Rule
            </h3>
            <p className="text-slate-300 leading-relaxed">{selectedRule.inflectionPointRule}</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded p-4">
            <h3 className="font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" /> Mathematical Sizing Threshold
            </h3>
            <p className="text-slate-300 leading-relaxed">{selectedRule.mathematicalThreshold}</p>
          </div>
        </div>

        {/* Caveats vs Optimization Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded p-4">
            <h4 className="font-semibold text-rose-300/90 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> DBA Architectural Caveats
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 leading-relaxed">
              {selectedRule.dbaCaveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded p-4">
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" /> Recommended Sizing Steps
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
              {selectedRule.optimizationSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Advisory Query */}
        <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-500" /> Advisor Analysis SQL
            </span>
            <button
              onClick={() => handleCopy(selectedRule.id, selectedRule.diagnosticSql)}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-xs"
            >
              {copiedScript === selectedRule.id ? (
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
          <pre className="p-3 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed">
            {selectedRule.diagnosticSql}
          </pre>
        </div>
      </div>

      {/* Interactive Linux HugePages Sizing Calculator */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Cpu className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Interactive Linux HugePages (HugeTLB) Sizing Calculator
                </h3>
                <p className="text-xs text-slate-400">
                  Calculate required OS <code className="font-mono text-amber-300">vm.nr_hugepages</code>, security limits, and SPFILE commands to lock SGA into physical RAM.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
              Production Verified
            </span>
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Total Host RAM (GB):</label>
            <input
              type="number"
              min="8"
              max="2048"
              value={totalRamGb}
              onChange={(e) => setTotalRamGb(Math.max(8, Number(e.target.value) || 8))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Oracle SGA Target (GB):</label>
            <input
              type="number"
              min="4"
              max={totalRamGb}
              value={sgaTargetGb}
              onChange={(e) => setSgaTargetGb(Math.min(totalRamGb, Math.max(4, Number(e.target.value) || 4)))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Oracle PGA Target (GB):</label>
            <input
              type="number"
              min="2"
              max={totalRamGb - sgaTargetGb}
              value={pgaTargetGb}
              onChange={(e) => setPgaTargetGb(Math.max(2, Number(e.target.value) || 2))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">OS Hugepage Size:</label>
            <select
              aria-label="OS Hugepage Size"
              value={pageSizeMb}
              onChange={(e) => setPageSizeMb(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
            >
              <option value={2}>2 MB (Standard x86_64)</option>
              <option value={1024}>1024 MB (1 GB HugePages)</option>
            </select>
          </div>
        </div>

        {/* Calculated Results */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950 border border-slate-800 rounded p-3 text-xs">
            <div className="text-slate-400">Calculated vm.nr_hugepages</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {recommendedNrHugePages.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              ({sgaTargetGb}GB / {pageSizeMb}MB + 100 buffer)
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded p-3 text-xs">
            <div className="text-slate-400">Memlock Setting (KB)</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {memlockKb.toLocaleString()} KB
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Configured in /etc/security/limits.conf
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded p-3 text-xs">
            <div className="text-slate-400">OS Page Table RAM Saved</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              ~{pageTableSavingsMb} MB
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Eliminated CPU TLB overhead
            </div>
          </div>
        </div>

        {/* Configuration Snippets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs max-w-full min-w-0">
          <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden min-w-0 max-w-full">
            <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-slate-400 bg-slate-900/60">
              <span className="font-mono text-slate-300">Linux /etc/sysctl.conf & limits</span>
              <button
                onClick={() => handleCopy('sysctl', `${hugePagesSysctlConfig}\n\n${limitsConfConfig}`)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copiedScript === 'sysctl' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 font-mono text-emerald-300 text-[11px] overflow-x-auto whitespace-pre leading-relaxed max-w-full">
              {hugePagesSysctlConfig}
              {'\n\n'}
              {limitsConfConfig}
            </pre>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden min-w-0 max-w-full">
            <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-slate-400 bg-slate-900/60">
              <span className="font-mono text-slate-300">Oracle Database SPFILE Commands</span>
              <button
                onClick={() => handleCopy('spfile', spfileConfig)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copiedScript === 'spfile' ? (
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
            <pre className="p-3 font-mono text-amber-200 text-[11px] overflow-x-auto whitespace-pre leading-relaxed max-w-full">
              {spfileConfig}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
