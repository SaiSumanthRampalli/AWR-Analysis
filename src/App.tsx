import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AwrFileUploadWorkbench } from './components/AwrFileUploadWorkbench';
import { TopHotspotsNotificationCenter } from './components/TopHotspotsNotificationCenter';
import { RunbookChecklist } from './components/RunbookChecklist';
import { MethodologyAndGlossary } from './components/MethodologyAndGlossary';
import { TriageCheatSheet } from './components/TriageCheatSheet';
import { MemoryAdvisories } from './components/MemoryAdvisories';
import { MetricCalculator } from './components/MetricCalculator';
import { HistoricalScriptsLibrary } from './components/HistoricalScriptsLibrary';
import { AuditReportModal } from './components/AuditReportModal';
import { ExportHubModal } from './components/ExportHubModal';
import { PerformedChecklistsModal } from './components/PerformedChecklistsModal';
import { AddCustomCheckModal } from './components/AddCustomCheckModal';
import { ManagePredefinedChecksModal } from './components/ManagePredefinedChecksModal';
import { initialRunbookPhases } from './data/runbookPhases';
import { initialTopHotspots } from './data/topHotspots';
import { RunbookPhase, VerificationItem, VerificationStatus, AwrBenchmarkScenario, HotspotItem } from './types/awr';
import { sampleScenarios } from './data/sampleScenarios';
import { ParsedAwrReport, AwrAnalysisResult, evaluateAwrAgainstRunbook } from './utils/awrParser';
import { 
  ExportReportData, 
  exportToExcel, 
  exportToWord, 
  exportToPdf, 
  exportToMarkdown, 
  exportToCsv,
  exportToJson 
} from './utils/exportUtils';
import { Upload, CheckCircle2 } from 'lucide-react';

// Sample AWR Report for realistic demonstration on demand (SAN I/O Outage)
const sampleAwrReport: ParsedAwrReport = {
  fileName: 'awr_san_io_outage.html',
  fileSize: 482104,
  fileType: 'html',
  dbName: 'PRODDB',
  dbId: '1928471029',
  instanceName: 'proddb1',
  instanceNumber: 1,
  release: 'Oracle 19c Enterprise Edition (19.18 RU)',
  hostName: 'db-host-01',
  cpuCount: 32,
  cpuCores: 16,
  memoryGb: 256,
  isRac: false,
  beginSnapId: 51020,
  beginSnapTime: '01-Oct-26 09:00:00',
  endSnapId: 51021,
  endSnapTime: '01-Oct-26 10:00:00',
  elapsedMinutes: 60.0,
  dbTimeMinutes: 2520.0,
  aas: 42.0,
  hostUserCpuPct: 22,
  hostSysCpuPct: 8,
  hostWioPct: 58,
  hostIdlePct: 12,
  logicalReadsPerSec: 42000,
  physicalReadsPerSec: 18500,
  physicalWritesPerSec: 3200,
  redoMbPerSec: 12.4,
  executionsPerSec: 3400,
  parseCallsPerSec: 120,
  hardParsesPerSec: 2,
  transactionsPerSec: 140,
  rollbacksPerSec: 2,
  hardParsePct: 0.2,
  softParsePct: 99.8,
  bufferHitPct: 82.4,
  pgaHitPct: 98.1,
  metricsFound: {
    hasHeader: true,
    hasLoadProfile: true,
    hasInstanceEfficiency: true,
    hasWaitEvents: true,
    hasTopSql: true,
    hasOsStats: true,
    hasCompleteSqlText: true
  },
  completeSqlTexts: {
    '8b9f31a7x2d9': `SELECT oi.order_id, oi.product_id, SUM(oi.quantity * oi.unit_price) AS line_total, AVG(p.standard_cost) AS avg_cost
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_status = :b1
  AND o.order_date >= TRUNC(SYSDATE - 30)
GROUP BY oi.order_id, oi.product_id
HAVING SUM(oi.quantity * oi.unit_price) > 5000
ORDER BY line_total DESC;`,
    '3ka901mc77d1': `SELECT c.customer_id, c.customer_name, a.city, a.postal_code, c.credit_limit
FROM customers c
JOIN customer_addresses a ON c.customer_id = a.customer_id
WHERE c.customer_type = :1
  AND c.account_status = 'ACTIVE'
ORDER BY c.customer_name;`
  },
  topWaitEvents: [
    { name: 'DB CPU', waitClass: 'CPU / Scheduler', waits: 0, timeSeconds: 380, avgWaitMs: 0, pctDbTime: 15.1 },
    { name: 'db file sequential read', waitClass: 'User I/O', waits: 78400, timeSeconds: 1420, avgWaitMs: 18.2, pctDbTime: 56.3 },
    { name: 'cursor: pin S wait on X', waitClass: 'Concurrency', waits: 5400, timeSeconds: 320, avgWaitMs: 12.4, pctDbTime: 12.7 },
    { name: 'log file sync', waitClass: 'Commit', waits: 12400, timeSeconds: 240, avgWaitMs: 8.5, pctDbTime: 9.5 }
  ],
  topSql: [
    {
      sqlId: '8b9f31a7x2d9',
      planHashValue: '4829104812',
      executions: 5400,
      elapsedSeconds: 1840.5,
      cpuSeconds: 1680.0,
      bufferGets: 1240000000,
      diskReads: 8500000,
      sqlText: `SELECT oi.order_id, oi.product_id, SUM(oi.quantity * oi.unit_price) AS line_total, AVG(p.standard_cost) AS avg_cost
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_status = :b1
  AND o.order_date >= TRUNC(SYSDATE - 30)
GROUP BY oi.order_id, oi.product_id
HAVING SUM(oi.quantity * oi.unit_price) > 5000
ORDER BY line_total DESC;`,
      elapsedPerExecMs: 340.8,
      getsPerExec: 1240000,
      readsPerExec: 1574,
      pctDbTime: 64.5
    },
    {
      sqlId: '3ka901mc77d1',
      planHashValue: '1948201948',
      executions: 48000,
      elapsedSeconds: 620.0,
      cpuSeconds: 580.0,
      bufferGets: 42500000,
      diskReads: 240000,
      sqlText: `SELECT c.customer_id, c.customer_name, a.city, a.postal_code, c.credit_limit
FROM customers c
JOIN customer_addresses a ON c.customer_id = a.customer_id
WHERE c.customer_type = :1
  AND c.account_status = 'ACTIVE'
ORDER BY c.customer_name;`,
      elapsedPerExecMs: 12.9,
      getsPerExec: 885,
      readsPerExec: 5,
      pctDbTime: 21.7
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('files');
  const [phases, setPhases] = useState<RunbookPhase[]>(initialRunbookPhases);
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AwrBenchmarkScenario | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isExportHubOpen, setIsExportHubOpen] = useState<boolean>(false);

  // New Modals for Performed Checklists, Custom Checks, and Predefined Checklist Management
  const [isPerformedChecksModalOpen, setIsPerformedChecksModalOpen] = useState<boolean>(false);
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState<boolean>(false);
  const [isManagePredefinedModalOpen, setIsManagePredefinedModalOpen] = useState<boolean>(false);
  const [removedPredefinedItems, setRemovedPredefinedItems] = useState<VerificationItem[]>([]);

  // Multi-AWR & In-Memory State: Defaults to null (Store no file data, zero storage)
  const [activeReport, setActiveReport] = useState<ParsedAwrReport | null>(null);
  const [allLoadedReports, setAllLoadedReports] = useState<ParsedAwrReport[]>([]);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // Flatten all items for summary metrics
  const allChecklistItems: VerificationItem[] = phases.flatMap(p => p.items);
  const unreadHotspots = hotspots.filter(h => !h.isAcknowledged).length;

  const handleAwrAnalysisComplete = (result: AwrAnalysisResult, allReports: ParsedAwrReport[]) => {
    setActiveReport(result.report);
    setAllLoadedReports(allReports);
    setHotspots(result.topIssues);

    // Apply checklist updates
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => {
          const update = result.checklistUpdates[item.id];
          if (update) {
            return {
              ...item,
              status: update.status,
              currentValue: update.currentValue,
              notes: update.notes
            };
          }
          return item;
        })
      }))
    );

    setLastNotification(
      `Analyzed ${result.report.fileName} (${result.report.dbName}): 20 Top Hotspots ranked and runbook cross-checked.`
    );

    // Switch to Top 20 Hotspots tab to immediately show results to the user
    setActiveTab('hotspots');
  };

  const handleSelectActiveReport = (report: ParsedAwrReport) => {
    setActiveReport(report);
    const result = evaluateAwrAgainstRunbook(report);
    setHotspots(result.topIssues);

    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => {
          const update = result.checklistUpdates[item.id];
          if (update) {
            return {
              ...item,
              status: update.status,
              currentValue: update.currentValue,
              notes: update.notes
            };
          }
          return item;
        })
      }))
    );
  };

  const handleClearReports = () => {
    setAllLoadedReports([]);
    setActiveReport(null);
    setPhases(initialRunbookPhases);
    setHotspots([]);
    setLastNotification('All files cleared from volatile memory. Zero file data stored.');
  };

  const handlePurgeFileData = () => {
    setActiveReport(null);
    setAllLoadedReports([]);
    setHotspots([]);
    setSelectedScenario(null);
    setPhases(initialRunbookPhases);
    setRemovedPredefinedItems([]);
    setLastNotification('In-memory session reset. All reports and metrics purged.');
  };

  const handleLoadSampleAwr = () => {
    setActiveReport(sampleAwrReport);
    setAllLoadedReports([sampleAwrReport]);
    const result = evaluateAwrAgainstRunbook(sampleAwrReport);
    setHotspots(result.topIssues);
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => {
          const update = result.checklistUpdates[item.id];
          if (update) {
            return {
              ...item,
              status: update.status,
              currentValue: update.currentValue,
              notes: update.notes
            };
          }
          return item;
        })
      }))
    );
    setLastNotification('Loaded demo scenario: SAN I/O Outage (awr_san_io_outage.html). All data strictly in-memory.');
    setActiveTab('files');
  };

  const handleToggleAcknowledge = (id: string, notes?: string) => {
    setHotspots(prev => prev.map(h => {
      if (h.id === id) {
        return {
          ...h,
          isAcknowledged: !h.isAcknowledged,
          ackNotes: notes || h.ackNotes
        };
      }
      return h;
    }));
  };

  const handleUpdateItemStatus = (itemId: string, status: VerificationStatus) => {
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => 
          item.id === itemId ? { ...item, status } : item
        )
      }))
    );
  };

  const handleUpdateItemValue = (itemId: string, currentValue: string) => {
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => 
          item.id === itemId ? { ...item, currentValue } : item
        )
      }))
    );
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => 
          item.id === itemId ? { ...item, notes } : item
        )
      }))
    );
  };

  const handleBulkUpdateStatus = (status: VerificationStatus) => {
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => ({ ...item, status }))
      }))
    );
  };

  const handleResetChecklist = () => {
    setPhases(initialRunbookPhases);
    setHotspots([]);
    setSelectedScenario(null);
  };

  // Add Custom Check Handler
  const handleAddCustomCheck = (newItem: Omit<VerificationItem, 'id'> & { id?: string }) => {
    const checkId = newItem.id || `custom-chk-${Date.now()}`;
    const itemWithId: VerificationItem = {
      ...newItem,
      id: checkId,
      isCustom: true,
      isPredefined: false
    };

    setPhases(prevPhases => {
      const phaseExists = prevPhases.some(p => p.id === itemWithId.phaseId);
      if (phaseExists) {
        return prevPhases.map(phase => 
          phase.id === itemWithId.phaseId
            ? { ...phase, items: [itemWithId, ...phase.items] }
            : phase
        );
      } else if (prevPhases.length > 0) {
        return prevPhases.map((phase, idx) => 
          idx === 0 
            ? { ...phase, items: [itemWithId, ...phase.items] }
            : phase
        );
      }
      return prevPhases;
    });

    setLastNotification(`Added custom verification check: "${itemWithId.title}".`);
  };

  // Remove Check Handler (Handles both custom checks and predefined checks)
  const handleRemoveCheck = (itemId: string) => {
    let removedItem: VerificationItem | null = null;

    setPhases(prevPhases => 
      prevPhases.map(phase => {
        const found = phase.items.find(i => i.id === itemId);
        if (found) {
          removedItem = found;
        }
        return {
          ...phase,
          items: phase.items.filter(i => i.id !== itemId)
        };
      })
    );

    if (removedItem) {
      const it = removedItem as VerificationItem;
      if (it.isCustom) {
        setLastNotification(`Deleted custom check "${it.title}".`);
      } else {
        setRemovedPredefinedItems(prev => [...prev.filter(i => i.id !== itemId), it]);
        setLastNotification(`Removed predefined check "${it.title}" from active runbook.`);
      }
    }
  };

  // Restore Predefined Check Handler
  const handleRestorePredefinedCheck = (item: VerificationItem) => {
    setRemovedPredefinedItems(prev => prev.filter(i => i.id !== item.id));

    setPhases(prevPhases => 
      prevPhases.map(phase => {
        if (phase.id === item.phaseId) {
          const alreadyExists = phase.items.some(i => i.id === item.id);
          if (alreadyExists) return phase;
          return {
            ...phase,
            items: [...phase.items, item]
          };
        }
        return phase;
      })
    );

    setLastNotification(`Restored predefined check "${item.title}".`);
  };

  // Restore All Predefined Checks Handler
  const handleRestoreAllPredefined = () => {
    setPhases(initialRunbookPhases);
    setRemovedPredefinedItems([]);
    setLastNotification('All predefined runbook verification checks restored to active runbook.');
  };

  // Scenario Loader
  const handleSelectScenario = (scenario: AwrBenchmarkScenario) => {
    setSelectedScenario(scenario);

    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => {
          const m = scenario.metrics;
          const aas = Math.round((m.dbTimeMinutes / m.elapsedTimeMinutes) * 10) / 10;

          if (item.id === 'chk-0-0') {
            return {
              ...item,
              status: 'pass',
              currentValue: 'STATISTICS_LEVEL=TYPICAL, PACK_ACCESS=DIAGNOSTIC+TUNING',
              notes: 'Collection parameters meet Oracle Diagnostic & Tuning pack prerequisites.'
            };
          }

          if (item.id === 'chk-0-1') {
            const isCrit = aas > m.cpuCores;
            const isWarn = aas > m.cpuCores * 0.75;
            return {
              ...item,
              status: isCrit ? 'critical' : isWarn ? 'warning' : 'pass',
              currentValue: `AAS = ${aas} (${Math.round((aas / m.cpuCores) * 100)}% of ${m.cpuCores} cores)`,
              notes: isCrit 
                ? `CRITICAL: AAS exceeds physical core capacity (${m.cpuCores} cores). System is CPU-bound.`
                : isWarn
                ? `WARNING: AAS consuming >75% of physical CPU cores.`
                : 'AAS within safe CPU core headroom limit.'
            };
          }

          if (item.id === 'chk-0-3') {
            const isDiluted = m.elapsedTimeMinutes > 120;
            return {
              ...item,
              status: isDiluted ? 'warning' : 'pass',
              currentValue: `${m.elapsedTimeMinutes} mins duration`,
              notes: isDiluted 
                ? 'WARNING: Snapshot duration exceeds 2 hours. High likelihood of transient spike dilution.' 
                : 'Snapshot duration provides appropriate granularity.'
            };
          }

          if (item.id === 'chk-1-1') {
            const hostCpuTotal = m.hostUserCpuPct + m.hostSysCpuPct;
            const isWioCrit = m.hostWioPct > 15;
            const isCpuCrit = hostCpuTotal > 90;
            return {
              ...item,
              status: isWioCrit ? 'critical' : isCpuCrit ? 'critical' : m.hostWioPct > 8 ? 'warning' : 'pass',
              currentValue: `Host CPU = ${hostCpuTotal}%, %WIO = ${m.hostWioPct}%`,
              notes: isWioCrit ? `High storage wait on I/O (%WIO = ${m.hostWioPct}%).` : isCpuCrit ? 'Host CPU pegged near 100% capacity.' : 'Nominal OS CPU distribution.'
            };
          }

          if (item.id === 'chk-2-1') {
            const isCrit = m.topWaitEventTimePct > 40 && m.topWaitEvent !== 'DB CPU';
            const isWarn = m.topWaitEventTimePct > 20 && m.topWaitEvent !== 'DB CPU';
            return {
              ...item,
              status: isCrit ? 'critical' : isWarn ? 'warning' : 'pass',
              currentValue: `${m.topWaitEvent} (${m.topWaitEventTimePct}% DB Time)`,
              notes: isCrit 
                ? `Primary non-idle bottleneck event consuming ${m.topWaitEventTimePct}% of total database time.`
                : isWarn
                ? `Elevated wait event: ${m.topWaitEvent}`
                : 'No single non-idle wait event dominates DB time.'
            };
          }

          if (item.id === 'chk-2-2') {
            if (m.topWaitEvent.includes('sequential read') || m.topWaitEventAvgMs > 0) {
              const isCrit = m.topWaitEventAvgMs > 15;
              const isWarn = m.topWaitEventAvgMs > 5;
              return {
                ...item,
                status: isCrit ? 'critical' : isWarn ? 'warning' : 'pass',
                currentValue: `${m.topWaitEventAvgMs}ms avg latency`,
                notes: isCrit
                  ? `CRITICAL I/O LATENCY: Single-block index reads averaging ${m.topWaitEventAvgMs}ms (> 15ms). Storage bottleneck.`
                  : isWarn
                  ? `Warning: Single-block reads averaging ${m.topWaitEventAvgMs}ms.`
                  : 'Single-block read latency conforms to Flash/SAN standards (< 4ms).'
              };
            }
          }

          if (item.id === 'chk-2-3') {
            if (m.topWaitEvent === 'log file sync') {
              const isCrit = m.topWaitEventAvgMs > 10;
              const isWarn = m.topWaitEventAvgMs > 5;
              return {
                ...item,
                status: isCrit ? 'critical' : isWarn ? 'warning' : 'pass',
                currentValue: `${m.topWaitEventAvgMs}ms avg commit wait`,
                notes: isCrit 
                  ? `CRITICAL COMMIT DELAY: log file sync avg wait is ${m.topWaitEventAvgMs}ms. Check redo log storage or excessive frequent commits.` 
                  : 'Commit response time nominal.'
              };
            }
          }

          if (item.id === 'chk-3-1') {
            return {
              ...item,
              status: 'warning',
              currentValue: `Workload executions: ${m.executionsPerSec}/sec`,
              notes: 'Inspect Top SQL section in AWR for dominant SQL_ID.'
            };
          }

          if (item.id === 'chk-4-1') {
            const isHardParseCrit = m.hardParsePct > 10;
            return {
              ...item,
              status: isHardParseCrit ? 'critical' : m.hardParsePct > 3 ? 'warning' : 'pass',
              currentValue: `${m.hardParsePct}% Hard Parses`,
              notes: isHardParseCrit 
                ? 'CRITICAL: High hard parse ratio. Application literal queries failing to utilize bind variables. Shared pool library cache contention.' 
                : 'Hard parse ratio within nominal operational parameters.'
            };
          }

          if (item.id === 'chk-5-1') {
            const isBufferCrit = m.bufferCacheHitRatio < 85;
            return {
              ...item,
              status: isBufferCrit ? 'warning' : 'pass',
              currentValue: `Buffer Cache Hit: ${m.bufferCacheHitRatio}%`,
              notes: isBufferCrit 
                ? 'Buffer cache hit ratio below 85%. Evaluate physical read volume and Buffer Cache Advisory.' 
                : 'Buffer cache hit ratio nominal.'
            };
          }

          if (item.id === 'chk-5-2') {
            const isPgaCrit = m.pgaCacheHitRatio < 80;
            return {
              ...item,
              status: isPgaCrit ? 'critical' : m.pgaCacheHitRatio < 90 ? 'warning' : 'pass',
              currentValue: `PGA Hit Ratio: ${m.pgaCacheHitRatio}%`,
              notes: isPgaCrit 
                ? 'CRITICAL: PGA cache hit ratio dropped below 80%. Multi-pass temp disk spills detected.' 
                : 'PGA cache hit ratio nominal.'
            };
          }

          return item;
        })
      }))
    );
  };

  // Sync findings calculated in MetricCalculator
  const handleSyncFindings = (findings: {
    aas: number;
    coreLoadRatio: number;
    hostWio: number;
    hardParsePct: number;
    bufferHit: number;
    pgaHit: number;
  }) => {
    setPhases(prevPhases => 
      prevPhases.map(phase => ({
        ...phase,
        items: phase.items.map(item => {
          if (item.id === 'chk-0-1') {
            const isCrit = findings.coreLoadRatio > 100;
            const isWarn = findings.coreLoadRatio > 75;
            return {
              ...item,
              status: isCrit ? 'critical' : isWarn ? 'warning' : 'pass',
              currentValue: `AAS = ${findings.aas} (${findings.coreLoadRatio}% core load)`,
              notes: isCrit ? 'Active sessions exceed physical cores.' : 'Applied from live calculator.'
            };
          }
          if (item.id === 'chk-1-1') {
            const isWioCrit = findings.hostWio > 15;
            return {
              ...item,
              status: isWioCrit ? 'critical' : 'pass',
              currentValue: `Host %WIO: ${findings.hostWio}%`,
              notes: isWioCrit ? 'Severe I/O wait detected.' : 'I/O wait nominal.'
            };
          }
          if (item.id === 'chk-4-1') {
            const isHardCrit = findings.hardParsePct > 15;
            return {
              ...item,
              status: isHardCrit ? 'critical' : 'pass',
              currentValue: `Hard Parse %: ${findings.hardParsePct}%`,
              notes: isHardCrit ? 'Hard parse storm flagged.' : 'Parsing nominal.'
            };
          }
          if (item.id === 'chk-5-2') {
            const isPgaCrit = findings.pgaHit < 80;
            return {
              ...item,
              status: isPgaCrit ? 'critical' : 'pass',
              currentValue: `PGA Hit %: ${findings.pgaHit}%`,
              notes: isPgaCrit ? 'PGA undersized. Workarea multi-pass disk spills.' : 'PGA hit healthy.'
            };
          }
          return item;
        })
      }))
    );
    setActiveTab('runbook');
  };

  const getExportData = (): ExportReportData => ({
    reportDate: new Date().toISOString().split('T')[0],
    activeReport,
    selectedScenario,
    phases,
    checklistItems: allChecklistItems,
    hotspots,
    completeSqlTexts: activeReport?.completeSqlTexts || sampleAwrReport.completeSqlTexts
  });

  const handleDirectExport = (format: 'markdown' | 'pdf' | 'excel' | 'word' | 'csv' | 'json') => {
    const data = getExportData();
    switch (format) {
      case 'excel':
        exportToExcel(data);
        setLastNotification('Exported multi-tab Microsoft Excel (.xls) workbook to downloads.');
        break;
      case 'word':
        exportToWord(data);
        setLastNotification('Exported Microsoft Word (.doc) report to downloads.');
        break;
      case 'pdf':
        exportToPdf(data);
        setLastNotification('Generated official diagnostic PDF (.pdf) dossier.');
        break;
      case 'markdown':
        exportToMarkdown(data);
        setLastNotification('Exported engineering Markdown (.md) spec file.');
        break;
      case 'csv':
        exportToCsv(data);
        setLastNotification('Exported structured RFC 4180 CSV telemetry data.');
        break;
      case 'json':
        exportToJson(data);
        setLastNotification('Exported machine-readable JSON telemetry schema.');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {/* 2-Tier Compact Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectScenario={handleSelectScenario}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenExportHub={() => setIsExportHubOpen(true)}
        onDirectExport={handleDirectExport}
        onResetChecklist={handleResetChecklist}
        checklistItems={allChecklistItems}
        selectedScenario={selectedScenario}
        unreadHotspotCount={unreadHotspots}
        onOpenPerformedChecklistsModal={() => setIsPerformedChecksModalOpen(true)}
        hasLoadedReport={!!activeReport || allLoadedReports.length > 0}
        onPurgeFileData={handlePurgeFileData}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 min-w-0">
        {activeTab === 'files' && (
          <AwrFileUploadWorkbench
            onAwrAnalysisComplete={handleAwrAnalysisComplete}
            activeReport={activeReport}
            allLoadedReports={allLoadedReports}
            onSelectActiveReport={handleSelectActiveReport}
            onClearReports={handleClearReports}
            onNavigateToHotspots={() => setActiveTab('hotspots')}
            onNavigateToRunbook={() => setActiveTab('runbook')}
            onOpenPerformedChecklistsModal={() => setIsPerformedChecksModalOpen(true)}
            onLoadSampleAwr={handleLoadSampleAwr}
            onOpenExportHub={() => setIsExportHubOpen(true)}
          />
        )}

        {activeTab === 'hotspots' && (
          <TopHotspotsNotificationCenter
            hotspots={hotspots}
            onToggleAcknowledge={handleToggleAcknowledge}
            completeSqlTexts={activeReport?.completeSqlTexts || sampleAwrReport.completeSqlTexts}
            onOpenPerformedChecksModal={() => setIsPerformedChecksModalOpen(true)}
            onNavigateToUpload={() => setActiveTab('files')}
            onLoadSampleAwr={handleLoadSampleAwr}
            activeReport={activeReport}
            selectedScenario={selectedScenario}
            phases={phases}
            checklistItems={allChecklistItems}
            onOpenExportHub={() => setIsExportHubOpen(true)}
          />
        )}

        {activeTab === 'runbook' && (
          <RunbookChecklist
            phases={phases}
            onUpdateItemStatus={handleUpdateItemStatus}
            onUpdateItemValue={handleUpdateItemValue}
            onUpdateItemNotes={handleUpdateItemNotes}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onRemoveCheck={handleRemoveCheck}
            onOpenPerformedChecksModal={() => setIsPerformedChecksModalOpen(true)}
            onOpenAddCustomModal={() => setIsAddCustomModalOpen(true)}
            onOpenManagePredefinedModal={() => setIsManagePredefinedModalOpen(true)}
            removedPredefinedCount={removedPredefinedItems.length}
            onRestoreAllPredefined={handleRestoreAllPredefined}
            onOpenExportHub={() => setIsExportHubOpen(true)}
          />
        )}

        {activeTab === 'sop' && <MethodologyAndGlossary />}

        {activeTab === 'triage' && <TriageCheatSheet />}

        {activeTab === 'memory' && <MemoryAdvisories />}

        {activeTab === 'calculator' && (
          <MetricCalculator onSyncFindingsToRunbook={handleSyncFindings} />
        )}

        {activeTab === 'scripts' && <HistoricalScriptsLibrary />}
      </main>

      {/* Enterprise Export Command Hub Modal (Markdown, PDF, CSV, Excel, Word) */}
      <ExportHubModal
        isOpen={isExportHubOpen}
        onClose={() => setIsExportHubOpen(false)}
        data={getExportData()}
      />

      {/* Audit Report Modal */}
      <AuditReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        phases={phases}
        checklistItems={allChecklistItems}
        selectedScenario={selectedScenario}
        hotspots={hotspots}
        activeReport={activeReport}
        completeSqlTexts={activeReport?.completeSqlTexts || sampleAwrReport.completeSqlTexts}
      />

      {/* Performed Checklists Modal */}
      <PerformedChecklistsModal
        isOpen={isPerformedChecksModalOpen}
        onClose={() => setIsPerformedChecksModalOpen(false)}
        phases={phases}
        onUpdateItemStatus={handleUpdateItemStatus}
        onRemoveCheck={handleRemoveCheck}
        onOpenAddCustomModal={() => {
          setIsPerformedChecksModalOpen(false);
          setIsAddCustomModalOpen(true);
        }}
        onOpenManagePredefinedModal={() => {
          setIsPerformedChecksModalOpen(false);
          setIsManagePredefinedModalOpen(true);
        }}
        activeReportName={activeReport?.fileName}
        activeReport={activeReport}
        selectedScenario={selectedScenario}
        hotspots={hotspots}
        completeSqlTexts={activeReport?.completeSqlTexts || sampleAwrReport.completeSqlTexts}
      />

      {/* Add Custom Check Modal */}
      <AddCustomCheckModal
        isOpen={isAddCustomModalOpen}
        onClose={() => setIsAddCustomModalOpen(false)}
        phases={phases}
        onAddCustomCheck={handleAddCustomCheck}
      />

      {/* Manage Predefined Checks Modal */}
      <ManagePredefinedChecksModal
        isOpen={isManagePredefinedModalOpen}
        onClose={() => setIsManagePredefinedModalOpen(false)}
        phases={phases}
        removedPredefinedItems={removedPredefinedItems}
        onRemovePredefinedCheck={handleRemoveCheck}
        onRestorePredefinedCheck={handleRestorePredefinedCheck}
        onRestoreAllPredefined={handleRestoreAllPredefined}
      />

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Oracle AWR Diagnostic Runbook</span>
            <span>·</span>
            <span>Zero File Storage Policy</span>
            <span>·</span>
            <span>100% In-Memory Telemetry Processing</span>
          </div>
          <div className="font-mono text-slate-400">
            AAS Engine: DB Time / Elapsed Time
          </div>
        </div>
      </footer>
    </div>
  );
}
