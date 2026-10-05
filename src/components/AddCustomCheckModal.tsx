import React, { useState } from 'react';
import { X, Plus, AlertCircle, Code2, Sparkles, Check } from 'lucide-react';
import { RunbookPhase, VerificationItem, VerificationStatus } from '../types/awr';

interface AddCustomCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  phases: RunbookPhase[];
  onAddCustomCheck: (check: Omit<VerificationItem, 'id'> & { id?: string }) => void;
}

export const AddCustomCheckModal: React.FC<AddCustomCheckModalProps> = ({
  isOpen,
  onClose,
  phases,
  onAddCustomCheck
}) => {
  const [targetPhaseId, setTargetPhaseId] = useState<string>(phases[0]?.id || 'phase-0');
  const [title, setTitle] = useState('');
  const [awrSection, setAwrSection] = useState('Load Profile');
  const [metricName, setMetricName] = useState('');
  const [formula, setFormula] = useState('');
  const [normalThreshold, setNormalThreshold] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [criticalThreshold, setCriticalThreshold] = useState('');
  const [verificationAction, setVerificationAction] = useState('');
  const [diagnosticQuery, setDiagnosticQuery] = useState('');
  const [pointsToNoteText, setPointsToNoteText] = useState('');
  const [initialStatus, setInitialStatus] = useState<VerificationStatus>('unverified');
  const [currentValue, setCurrentValue] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Please specify a check title / name.');
      return;
    }
    if (!metricName.trim()) {
      setValidationError('Please specify a metric name or target telemetry.');
      return;
    }

    const pointsToNote = pointsToNoteText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const customId = `custom-chk-${Date.now()}`;

    onAddCustomCheck({
      id: customId,
      phaseId: targetPhaseId,
      title: title.trim(),
      awrSection: awrSection.trim() || 'Custom Inspection',
      metricName: metricName.trim(),
      formula: formula.trim() || undefined,
      normalThreshold: normalThreshold.trim() || 'Nominal behavior',
      warningThreshold: warningThreshold.trim() || 'Sub-optimal latency or throughput',
      criticalThreshold: criticalThreshold.trim() || 'System bottleneck threshold breached',
      pointsToNote: pointsToNote.length > 0 ? pointsToNote : ['Custom DBA verification rule configured for site-specific SLA.'],
      diagnosticQuery: diagnosticQuery.trim() || undefined,
      verificationAction: verificationAction.trim() || 'Inspect Oracle V$ views or ASH metrics.',
      status: initialStatus,
      currentValue: currentValue.trim() || undefined,
      notes: notes.trim() || undefined,
      isCustom: true,
      isPredefined: false,
      createdAt: Date.now()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Add Custom Verification Check</span>
              </h2>
              <p className="text-xs text-slate-400">
                Create a customized DBA check rule with specific SLA thresholds and verification SQL.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {validationError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Target Phase & AWR Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Target Diagnostic Phase *
              </label>
              <select
                value={targetPhaseId}
                onChange={(e) => setTargetPhaseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {phases.map(p => (
                  <option key={p.id} value={p.id}>
                    Phase {p.number}: {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                AWR Section / Origin *
              </label>
              <input
                type="text"
                placeholder="e.g. Load Profile, Wait Events, Storage I/O, Exadata"
                value={awrSection}
                onChange={(e) => setAwrSection(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Check Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Check Title / Rule Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Exadata Smart Scan Offload Efficiency or Tablespace Temp Space Spill"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setValidationError(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Metric Name & Rule Formula */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Target Metric Name *
              </label>
              <input
                type="text"
                placeholder="e.g. cell physical IO bytes eligible for predicate offload"
                value={metricName}
                onChange={(e) => {
                  setMetricName(e.target.value);
                  setValidationError(null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Calculation Rule / Formula (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. (offload_bytes / total_bytes) * 100"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Thresholds: Normal, Warning, Critical */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-emerald-400 font-semibold mb-1">
                Normal Threshold
              </label>
              <input
                type="text"
                placeholder="e.g. Offload > 70%"
                value={normalThreshold}
                onChange={(e) => setNormalThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-900/50 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-amber-400 font-semibold mb-1">
                Warning Threshold
              </label>
              <input
                type="text"
                placeholder="e.g. Offload between 40% - 70%"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-amber-900/50 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-rose-400 font-semibold mb-1">
                Critical Threshold
              </label>
              <input
                type="text"
                placeholder="e.g. Offload < 40%"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-rose-900/50 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Verification Action */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Diagnostic Verification Action & Recommended Next Steps
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Inspect cellcli alert log and check SQL execution plan for storage predicate hints..."
              value={verificationAction}
              onChange={(e) => setVerificationAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Live Diagnostic Query */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                Live Oracle Diagnostic SQL Query (Optional)
              </span>
            </label>
            <textarea
              rows={3}
              placeholder={`SELECT name, value FROM v$sysstat WHERE name LIKE '%cell%'\nORDER BY value DESC;`}
              value={diagnosticQuery}
              onChange={(e) => setDiagnosticQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-amber-200/90 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Points to Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Points to Note & DBA Sanity Checks (One per line)
            </label>
            <textarea
              rows={2}
              placeholder={`Predicate offload requires direct path read (kcbldq)\nEnsure cell_offload_processing parameter is TRUE`}
              value={pointsToNoteText}
              onChange={(e) => setPointsToNoteText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Initial Status & Observed Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-800">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Initial Evaluation Status
              </label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as VerificationStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="unverified">Unverified (Pending)</option>
                <option value="pass">Pass (Nominal)</option>
                <option value="warning">Warning Threshold</option>
                <option value="critical">Critical Threshold</option>
                <option value="na">Not Applicable</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Observed Value (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 52% offload"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                DBA Findings / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Observed during peak batch"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Form Submit Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition-colors flex items-center gap-1.5 shadow-md shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Check</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
