import React, { useState } from 'react';
import { BookOpen, CheckCircle, Copy, Check, ArrowRight, Lightbulb, Code2, Layers, Cpu } from 'lucide-react';
import { sqlTuningPaths } from '../data/sqlTuningPaths';

export const SqlTuningStudio: React.FC = () => {
  const [selectedPathId, setSelectedPathId] = useState<string>(sqlTuningPaths[0].id);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const selectedPath = sqlTuningPaths.find(p => p.id === selectedPathId) || sqlTuningPaths[0];

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5">
        <h1 className="text-base sm:text-lg font-bold text-slate-100">
          SQL Tuning Paths
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Diagnostic workflows for SQL plan regressions, buffer exhaustion, parse storms, and execution skew.
        </p>

        {/* Path Selection Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {sqlTuningPaths.map(path => (
            <button
              key={path.id}
              onClick={() => setSelectedPathId(path.id)}
              className={`p-2.5 rounded text-left transition-all border ${
                selectedPathId === path.id
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-semibold leading-tight">{path.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Tuning Path Details */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 space-y-6">
        {/* Overview Row */}
        <div className="border-b border-slate-800 pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100">{selectedPath.title}</h2>
              <p className="text-xs text-slate-300 mt-1">{selectedPath.symptom}</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-amber-400 shrink-0">
              {selectedPath.keyMetric}
            </div>
          </div>

          <div className="mt-3 bg-amber-950/20 border border-amber-900/40 rounded p-3 text-xs text-amber-200/90 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Rule of Thumb: </strong>
              {selectedPath.ruleOfThumb}
            </div>
          </div>
        </div>

        {/* Step-by-Step Decision Steps */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Step-by-Step Diagnostic & Remediation Flow
          </h3>

          <div className="space-y-4">
            {selectedPath.decisionSteps.map((step) => {
              const stepKey = `${selectedPath.id}-step-${step.stepNumber}`;

              return (
                <div key={step.stepNumber} className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center font-mono">
                        {step.stepNumber}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-200">{step.checkTitle}</h4>
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="text-slate-400">
                      <span className="text-slate-500 font-medium">Condition to Check: </span>
                      {step.checkCondition}
                    </div>
                    <div className="text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <strong className="text-emerald-400">Action If True: </strong>
                      {step.actionIfTrue}
                    </div>
                  </div>

                  {/* SQL Block */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-slate-300 flex items-center gap-1.5 text-[11px]">
                        <Code2 className="w-3.5 h-3.5 text-amber-500" /> Diagnostic Query
                      </span>
                      <button
                        onClick={() => handleCopy(stepKey, step.diagnosticSql)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-xs"
                      >
                        {copiedStep === stepKey ? (
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
                      {step.diagnosticSql}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mitigation Strategies & Recommended Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded p-4">
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Long-Term Architectural Mitigations
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 leading-relaxed">
              {selectedPath.mitigationStrategies.map((strat, i) => (
                <li key={i}>{strat}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded p-4">
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" /> Recommended Oracle Diagnostic Packages
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedPath.recommendedPackages.map((pkg, i) => (
                <span
                  key={i}
                  className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300"
                >
                  {pkg}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Utilize Oracle built-in PL/SQL APIs to lock verified execution plans into SPM Baselines, execute SQL Tuning Advisor, or capture execution details with statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
