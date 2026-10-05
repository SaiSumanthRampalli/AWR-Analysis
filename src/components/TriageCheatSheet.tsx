import React, { useState } from 'react';
import { Search, Filter, Copy, Check, AlertTriangle, ShieldCheck, XCircle, Code2, Database } from 'lucide-react';
import { waitEventsCheatSheet } from '../data/waitEventsCheatSheet';
import { WaitEventItem } from '../types/awr';

export const TriageCheatSheet: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const waitClasses = ['all', 'User I/O', 'Concurrency', 'Application', 'Commit', 'Cluster'];

  const filteredEvents = waitEventsCheatSheet.filter(ev => {
    const matchesSearch = 
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.commonCauses.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ev.remediation.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClass = selectedClass === 'all' || ev.waitClass === selectedClass;

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5 max-w-full min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-slate-100">
          Wait Event Triage Sheet
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Reference matrix for foreground wait events, latency thresholds, and root-cause analysis.
        </p>

        {/* Search & Wait Class Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-3 border-t border-slate-800/80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search wait events, root causes, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {waitClasses.map(wc => (
              <button
                key={wc}
                onClick={() => setSelectedClass(wc)}
                className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                  selectedClass === wc
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {wc === 'all' ? 'All Wait Classes' : wc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 gap-5">
        {filteredEvents.map(event => (
          <div key={event.id} className="bg-slate-900/70 border border-slate-800 rounded-lg p-5 space-y-4">
            {/* Event Title & Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 font-mono">{event.name}</h2>
                  <span className="text-xs font-mono text-amber-400/90 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    {event.waitClass}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{event.impact}</p>
              </div>

              {/* Threshold Badges */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 px-2.5 py-1 rounded">
                  <span className="text-slate-500 block text-[10px] uppercase">Normal</span>
                  <span>{event.normalLatency}</span>
                </div>
                <div className="bg-amber-950/40 text-amber-300 border border-amber-800/40 px-2.5 py-1 rounded">
                  <span className="text-slate-500 block text-[10px] uppercase">Warning</span>
                  <span>{event.warningThreshold}</span>
                </div>
                <div className="bg-rose-950/40 text-rose-300 border border-rose-800/40 px-2.5 py-1 rounded">
                  <span className="text-slate-500 block text-[10px] uppercase">Critical</span>
                  <span>{event.criticalThreshold}</span>
                </div>
              </div>
            </div>

            {/* Causes vs Remediation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3">
                <h3 className="font-semibold text-rose-300/90 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Common Root Causes
                </h3>
                <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
                  {event.commonCauses.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded p-3">
                <h3 className="font-semibold text-emerald-300/90 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> DBA Remediation Actions
                </h3>
                <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
                  {event.remediation.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Diagnostic SQL */}
            <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden min-w-0 max-w-full">
              <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" /> Triage SQL for {event.name}
                </span>
                <button
                  onClick={() => handleCopy(event.id, event.diagnosticSql)}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copiedId === event.id ? (
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
                {event.diagnosticSql}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
