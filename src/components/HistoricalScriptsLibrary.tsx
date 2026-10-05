import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, Layers, Lightbulb, Search, Code2 } from 'lucide-react';
import { historicalScripts } from '../data/historicalScripts';
import { HistoricalScript } from '../types/awr';

export const HistoricalScriptsLibrary: React.FC = () => {
  const [selectedScriptId, setSelectedScriptId] = useState<string>(historicalScripts[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dynamic parameters state: scriptId -> { paramName: value }
  const [paramsState, setParamsState] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    historicalScripts.forEach(s => {
      initial[s.id] = {};
      s.parameters.forEach(p => {
        initial[s.id][p.name] = p.defaultValue;
      });
    });
    return initial;
  });

  const categories = ['all', 'Report Generation', 'Top SQL Trending', 'Wait Events', 'Plan Changes', 'ASH Diagnostics'];

  const selectedScript = historicalScripts.find(s => s.id === selectedScriptId) || historicalScripts[0];

  const handleParamChange = (scriptId: string, paramName: string, value: string) => {
    setParamsState(prev => ({
      ...prev,
      [scriptId]: {
        ...(prev[scriptId] || {}),
        [paramName]: value
      }
    }));
  };

  // Interpolate parameters into SQL code for display / copy / download
  const getInterpolatedSql = (script: HistoricalScript) => {
    let sql = script.sqlCode;
    const currentParams = paramsState[script.id] || {};
    script.parameters.forEach(p => {
      const val = currentParams[p.name] || p.defaultValue;
      // Replace &PARAM_NAME and :PARAM_NAME
      const regex1 = new RegExp(`&${p.name}\\b`, 'g');
      sql = sql.replace(regex1, val);
    });
    return sql;
  };

  const handleCopy = (script: HistoricalScript) => {
    const sql = getInterpolatedSql(script);
    navigator.clipboard.writeText(sql);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (script: HistoricalScript) => {
    const sql = getInterpolatedSql(script);
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.id}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredScripts = historicalScripts.filter(s => {
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.targetViews.some(v => v.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 sm:p-5 max-w-full min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-slate-100">
          Diagnostic Scripts & SQL Library
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Production SQL and PL/SQL scripts for batch generation, plan tracking, and ASH forensic analysis.
        </p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-3 border-t border-slate-800/80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search scripts by name, target view, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'All Script Types' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-Column Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Script Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          {filteredScripts.map(script => (
            <button
              key={script.id}
              onClick={() => setSelectedScriptId(script.id)}
              className={`w-full p-3 rounded-lg text-left transition-all border ${
                selectedScriptId === script.id
                  ? 'bg-amber-500/10 border-amber-500/40 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {script.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {script.description}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                  {script.category}
                </span>
                {script.targetViews.slice(0, 1).map((v, i) => (
                  <span key={i} className="text-[10px] font-mono text-slate-500">
                    {v}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Right Col: Active Script Details & Execution Sandbox (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">{selectedScript.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{selectedScript.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopy(selectedScript)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors"
              >
                {copiedId === selectedScript.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownload(selectedScript)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .sql</span>
              </button>
            </div>
          </div>

          {/* Interactive Parameters */}
          {selectedScript.parameters.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800 rounded p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-500" /> Script Substitution Variables
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                {selectedScript.parameters.map(param => (
                  <div key={param.name}>
                    <label className="block text-slate-400 text-[11px] mb-0.5 font-mono">
                      &{param.name}:
                    </label>
                    <input
                      type="text"
                      value={paramsState[selectedScript.id]?.[param.name] ?? param.defaultValue}
                      onChange={(e) => handleParamChange(selectedScript.id, param.name, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">{param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Views */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Target Dictionary Views:</span>
            <div className="flex flex-wrap gap-1">
              {selectedScript.targetViews.map((v, i) => (
                <span key={i} className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Syntax-Highlighted Code Box */}
          <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden min-w-0 max-w-full">
            <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-amber-500" /> Oracle SQL*Plus / PL/SQL Script
              </span>
              <span className="font-mono text-[10px] text-slate-500">Variables automatically interpolated</span>
            </div>
            <pre className="p-4 text-xs font-mono text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed max-h-96 max-w-full">
              {getInterpolatedSql(selectedScript)}
            </pre>
          </div>

          {/* DBA Pro-Tip */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded p-3 text-xs text-amber-200/90 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-semibold">DBA Field Tip: </strong>
              {selectedScript.dbaTip}
            </div>
          </div>

          {/* Sample Output Preview */}
          <div className="bg-slate-950/90 border border-slate-800 rounded p-3 space-y-1.5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sample Execution Output Preview
            </div>
            <pre className="p-2.5 rounded bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
              {selectedScript.sampleOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
