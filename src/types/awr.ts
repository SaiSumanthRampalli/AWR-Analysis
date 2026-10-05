export type VerificationStatus = 'unverified' | 'pass' | 'warning' | 'critical' | 'na';

export interface VerificationItem {
  id: string;
  phaseId: string;
  title: string;
  awrSection: string;
  metricName: string;
  formula?: string;
  normalThreshold: string;
  warningThreshold: string;
  criticalThreshold: string;
  pointsToNote: string[];
  diagnosticQuery?: string;
  verificationAction: string;
  status: VerificationStatus;
  currentValue?: string;
  notes?: string;
  isCustom?: boolean;
  isPredefined?: boolean;
  createdAt?: number;
}

export interface RunbookPhase {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  category: 'context' | 'host' | 'waits' | 'sql' | 'activity' | 'memory' | 'rac' | 'io';
  items: VerificationItem[];
}

export interface WaitEventItem {
  id: string;
  name: string;
  waitClass: 'User I/O' | 'System I/O' | 'Concurrency' | 'Application' | 'Commit' | 'Configuration' | 'Cluster' | 'Administrative' | 'CPU / Scheduler';
  normalLatency: string;
  warningThreshold: string;
  criticalThreshold: string;
  commonCauses: string[];
  impact: string;
  remediation: string[];
  diagnosticSql: string;
  ashQuery?: string;
}

export interface SqlTuningPath {
  id: string;
  title: string;
  symptom: string;
  keyMetric: string;
  ruleOfThumb: string;
  decisionSteps: {
    stepNumber: number;
    checkTitle: string;
    checkCondition: string;
    actionIfTrue: string;
    diagnosticSql: string;
  }[];
  mitigationStrategies: string[];
  recommendedPackages: string[];
}

export interface MemoryAdvisoryRule {
  id: string;
  component: 'Buffer Cache' | 'Shared Pool' | 'PGA Target' | 'Linux HugePages' | 'SGA Target';
  targetParameter: string;
  advisorView: string;
  sizingMetric: string;
  inflectionPointRule: string;
  mathematicalThreshold: string;
  dbaCaveats: string[];
  optimizationSteps: string[];
  diagnosticSql: string;
}

export interface HistoricalScript {
  id: string;
  title: string;
  category: 'Report Generation' | 'Top SQL Trending' | 'Wait Events' | 'OS & CPU' | 'Memory & Advisory' | 'Plan Changes' | 'ASH Diagnostics';
  description: string;
  targetViews: string[];
  parameters: {
    name: string;
    defaultValue: string;
    description: string;
  }[];
  sqlCode: string;
  sampleOutput: string;
  dbaTip: string;
}

export interface AwrBenchmarkScenario {
  id: string;
  name: string;
  description: string;
  dbVersion: string;
  hardwareProfile: string;
  metrics: {
    elapsedTimeMinutes: number;
    dbTimeMinutes: number;
    cpuCores: number;
    numNodes: number;
    hostUserCpuPct: number;
    hostSysCpuPct: number;
    hostWioPct: number;
    logicalReadsPerSec: number;
    physicalReadsPerSec: number;
    physicalWritesPerSec: number;
    redoMbPerSec: number;
    executionsPerSec: number;
    parseCallsPerSec: number;
    hardParsePct: number;
    topWaitEvent: string;
    topWaitEventTimePct: number;
    topWaitEventAvgMs: number;
    bufferCacheHitRatio: number;
    pgaCacheHitRatio: number;
  };
  keyFindings: string[];
  suggestedAction: string;
}

export interface HotspotItem {
  rank: number;
  id: string;
  category: 'SQL' | 'Wait Event' | 'Segment/Object' | 'Host & I/O' | 'Lock & Concurrency';
  name: string;
  metricDimension: string;
  severity: 'critical' | 'warning' | 'attention';
  impactPct: number; // % of DB Time or resource impact
  observedValue?: string;
  rootCause: string;
  evidenceSummary: string;
  awrSourceSection: string;
  thresholdBreached: string;
  perExecutionCost?: {
    elapsedPerExecMs?: string;
    cpuPerExecMs?: string;
    getsPerExec?: string;
    readsPerExec?: string;
  };
  sqlText?: string;
  isCompleteSqlText?: boolean;
  completeSqlSectionFound?: boolean;
  sqlStatementType?: string;
  planHashValue?: string;
  diagnosticSql: string;
  notifiedAt: string;
  isAcknowledged: boolean;
  ackNotes?: string;
}

export interface InvestigationStep {
  stepNumber: number;
  title: string;
  targetSection: string;
  objective: string;
  keyQuestions: string[];
  diagnosticCommand: string;
}

export interface GlossaryItem {
  term: string;
  category: 'Core Concepts' | 'Time Model' | 'Memory & Storage' | 'Execution & SQL' | 'Locking & Concurrency' | 'Architecture';
  meaning: string;
  dbaTip: string;
}

export interface SoaCorrelationRule {
  id: string;
  symptom: string;
  middlewareEvidence: string;
  databaseEvidence: string;
  investigationSteps: string[];
  tuningTactic: string;
}
