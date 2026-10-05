import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Layers, 
  Workflow, 
  Server, 
  FileCheck2, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle,
  Code2
} from 'lucide-react';
import { investigationSequence, glossaryItems, soaCorrelationRules } from '../data/methodologyData';

export const MethodologyAndGlossary: React.FC = () => {
  const [subTab, setSubTab] = useState<'investigation-order' | 'soa-correlation' | 'glossary'>('investigation-order');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [selectedGlossaryCategory, setSelectedGlossaryCategory] = useState('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const glossaryCategories = ['all', 'Core Concepts', 'Time Model', 'Memory & Storage', 'Execution & SQL', 'Locking & Concurrency', 'Architecture'];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filteredGlossary = glossaryItems.filter(item => {
    const matchesSearch = 
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.meaning.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.dbaTip.toLowerCase().includes(glossarySearch.toLowerCase());

    const matchesCat = selectedGlossaryCategory === 'all' || item.category === selectedGlossaryCategory;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5 max-w-full min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-slate-100">
          Investigation Methodology & Reference
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          12-step systematic triage procedure, SOA/middleware correlation, and Oracle DBA terminology.
        </p>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 flex-wrap">
          <button
            onClick={() => setSubTab('investigation-order')}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              subTab === 'investigation-order'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>12-Step SOP</span>
          </button>

          <button
            onClick={() => setSubTab('soa-correlation')}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              subTab === 'soa-correlation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>SOA Correlation</span>
          </button>

          <button
            onClick={() => setSubTab('glossary')}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              subTab === 'glossary'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Glossary</span>
          </button>
        </div>
      </div>

      {/* 12-Step Investigation Order View */}
      {subTab === 'investigation-order' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">
              Why Sequence Matters in AWR Triage
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Jumping straight to a SQL statement without validating host CPU, storage latency, and lock contention leads to wasted tuning effort. Always follow this exact 12-step hierarchy to trace the symptom to its root cause.
            </p>
          </div>

          <div className="space-y-3">
            {investigationSequence.map(step => (
              <div key={step.stepNumber} className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {step.stepNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-200">{step.title}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    AWR Target: {step.targetSection}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{step.objective}</p>

                {/* Key Questions */}
                <div className="bg-slate-950/60 border border-slate-800 rounded p-2.5 text-xs">
                  <span className="text-slate-400 font-semibold block mb-1">Key Diagnostic Questions to Answer:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {step.keyQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>

                {/* Diagnostic Command */}
                <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                  <div className="px-3 py-1 bg-slate-900 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800">
                    <span className="font-mono text-slate-300 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-amber-500" /> Verification Command
                    </span>
                    <button
                      onClick={() => handleCopy(`cmd-${step.stepNumber}`, step.diagnosticCommand)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedCmd === `cmd-${step.stepNumber}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed">
                    {step.diagnosticCommand}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOA & Middleware Correlation View */}
      {subTab === 'soa-correlation' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-1">
              Middleware (WebLogic / Spring / SOA) & Database Correlation
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              When applications report slow APIs or connection pool timeouts, correlate WebLogic execute thread dumps and JDBC pool wait times with database session state and wait events.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {soaCorrelationRules.map(rule => (
              <div key={rule.id} className="bg-slate-900/70 border border-slate-800 rounded-lg p-5 space-y-3">
                <h3 className="text-sm font-bold text-amber-400 font-mono flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-500" /> {rule.symptom}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/80 border border-slate-800 rounded p-3">
                    <span className="text-rose-300 font-semibold block mb-1">Application / Middleware Evidence:</span>
                    <p className="text-slate-300 leading-relaxed">{rule.middlewareEvidence}</p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded p-3">
                    <span className="text-amber-300 font-semibold block mb-1">Database AWR / ASH Evidence:</span>
                    <p className="text-slate-300 leading-relaxed">{rule.databaseEvidence}</p>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded p-3 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold block">Investigation Protocol:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {rule.investigationSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded p-2.5 text-xs text-emerald-300">
                  <strong>Tuning Tactic: </strong>{rule.tuningTactic}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Glossary View */}
      {subTab === 'glossary' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search glossary terms or concepts..."
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {glossaryCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedGlossaryCategory(cat)}
                  className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                    selectedGlossaryCategory === cat
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Terms' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((item, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-100 font-mono text-sm">{item.term}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {item.category}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{item.meaning}</p>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded p-2 text-amber-300/90 text-[11px] leading-relaxed">
                  <strong className="text-amber-400">DBA Field Rule: </strong>
                  {item.dbaTip}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
