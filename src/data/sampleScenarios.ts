import { AwrBenchmarkScenario } from '../types/awr';

export const sampleScenarios: AwrBenchmarkScenario[] = [
  {
    id: 'scen-san-io',
    name: 'SAN Storage Latency Crisis (I/O Bottleneck)',
    description: 'Storage tier switch failure throttled SAN paths, causing single block read latencies to jump to 18ms. Average Active Sessions jumped to 42 on a 16-core host.',
    dbVersion: 'Oracle 19c Enterprise Edition (19.18 RU)',
    hardwareProfile: '16 Physical Cores (32 vCPUs), 256GB RAM, SAN All-Flash Array via Fibre Channel',
    metrics: {
      elapsedTimeMinutes: 60.0,
      dbTimeMinutes: 2520.0, // AAS = 42.0
      cpuCores: 16,
      numNodes: 1,
      hostUserCpuPct: 22,
      hostSysCpuPct: 8,
      hostWioPct: 58,
      logicalReadsPerSec: 42000,
      physicalReadsPerSec: 18500,
      physicalWritesPerSec: 3200,
      redoMbPerSec: 12.4,
      executionsPerSec: 3400,
      parseCallsPerSec: 120,
      hardParsePct: 0.2,
      topWaitEvent: 'db file sequential read',
      topWaitEventTimePct: 68.4,
      topWaitEventAvgMs: 18.2,
      bufferCacheHitRatio: 82.4,
      pgaCacheHitRatio: 98.1
    },
    keyFindings: [
      'AAS = 42.0 on 16 cores (2.6x saturation). Sessions are heavily queued.',
      'OS %WIO is 58% while CPU %User is only 22%, confirming an I/O wait crisis.',
      'db file sequential read average latency is 18.2ms (Normal is < 4ms for all-flash).',
      'Datafile I/O section highlights TBS_DATA_03 datafile taking 24ms per read.',
      'SQL ordered by Reads shows 3 queries accounting for 65% of all disk reads.'
    ],
    suggestedAction: 'Engage SAN storage team to inspect FC switch error counters and multi-pathing failover. In parallel, review top 3 SQL statements for index clustering factor improvements to reduce physical read volume.'
  },
  {
    id: 'scen-hard-parse',
    name: 'Hard Parse CPU Storm (Missing Bind Variables)',
    description: 'A third-party reporting service deployed dynamic SQL statements with embedded literal numbers into production, generating 1,400 hard parses per second.',
    dbVersion: 'Oracle 21c (21.8)',
    hardwareProfile: '32 Physical Cores, 512GB RAM, Exadata X8-2 Quarter Rack',
    metrics: {
      elapsedTimeMinutes: 30.0,
      dbTimeMinutes: 1980.0, // AAS = 66.0
      cpuCores: 32,
      numNodes: 1,
      hostUserCpuPct: 88,
      hostSysCpuPct: 10,
      hostWioPct: 1,
      logicalReadsPerSec: 120000,
      physicalReadsPerSec: 420,
      physicalWritesPerSec: 180,
      redoMbPerSec: 4.8,
      executionsPerSec: 1800,
      parseCallsPerSec: 1750,
      hardParsePct: 78.4, // Disaster!
      topWaitEvent: 'cursor: pin S wait on X',
      topWaitEventTimePct: 44.5,
      topWaitEventAvgMs: 14.8,
      bufferCacheHitRatio: 99.8,
      pgaCacheHitRatio: 99.2
    },
    keyFindings: [
      'Soft Parse % dropped to an catastrophic 21.6% (Hard Parse % = 78.4%).',
      'Host CPU is pegged at 98% (88% User + 10% System).',
      'Top wait events: cursor: pin S wait on X (44.5%) and library cache: mutex X (22.1%).',
      'V$SQLAREA reveals over 180,000 distinct SQL statements executed only 1 time each.',
      'Shared pool fragmentation is imminent with rising ORA-04031 risks.'
    ],
    suggestedAction: 'Emergency remediation: Execute ALTER SYSTEM SET cursor_sharing = FORCE SCOPE=BOTH to halt library cache spin. Instruct development team to rewrite reporting service with parameterized bind variables.'
  },
  {
    id: 'scen-plan-flip',
    name: 'Post-Maintenance SQL Plan Hash Regression',
    description: 'Following a scheduled statistics refresh on high-volume ORDER_ITEMS table, the CBO flipped an index range scan to a parallel full table scan, degrading runtime by 42x.',
    dbVersion: 'Oracle 19c Enterprise Edition',
    hardwareProfile: '24 Physical Cores, 384GB RAM, NVMe Flash',
    metrics: {
      elapsedTimeMinutes: 60.0,
      dbTimeMinutes: 2850.0, // AAS = 47.5
      cpuCores: 24,
      numNodes: 1,
      hostUserCpuPct: 72,
      hostSysCpuPct: 12,
      hostWioPct: 14,
      logicalReadsPerSec: 850000,
      physicalReadsPerSec: 9200,
      physicalWritesPerSec: 850,
      redoMbPerSec: 18.5,
      executionsPerSec: 520,
      parseCallsPerSec: 40,
      hardParsePct: 0.1,
      topWaitEvent: 'db file scattered read',
      topWaitEventTimePct: 38.2,
      topWaitEventAvgMs: 9.4,
      bufferCacheHitRatio: 98.9,
      pgaCacheHitRatio: 94.2
    },
    keyFindings: [
      'Single query (SQL_ID 8b9f31a7x2d9) accounts for 74% of total database elapsed time.',
      'DBA_HIST_SQLSTAT reveals Plan Hash Value changed from 1204918234 (Index Range Scan, 8ms) to 4829104812 (Full Table Scan, 340ms).',
      'Buffer gets exploded from 420 per execution to 1,240,000 per execution.',
      'Buffer cache hit ratio is misleadingly high at 98.9% due to repeated memory churn.'
    ],
    suggestedAction: 'Immediately restore the previous execution plan using DBMS_SPM.LOAD_PLANS_FROM_AWR or lock the plan baseline. Restore previous optimizer stats for ORDER_ITEMS with DBMS_STATS.RESTORE_TABLE_STATS.'
  },
  {
    id: 'scen-pga-thrash',
    name: 'PGA Memory Starvation & TEMP Disk Spill',
    description: 'Quarterly financial aggregation batch kicked off during normal business hours without allocated workarea memory, forcing hundreds of multi-pass hash joins to spill to TEMP.',
    dbVersion: 'Oracle 19c (19.16)',
    hardwareProfile: '32 Physical Cores, 512GB RAM (PGA set to 16GB)',
    metrics: {
      elapsedTimeMinutes: 45.0,
      dbTimeMinutes: 1890.0, // AAS = 42.0
      cpuCores: 32,
      numNodes: 1,
      hostUserCpuPct: 35,
      hostSysCpuPct: 15,
      hostWioPct: 48,
      logicalReadsPerSec: 65000,
      physicalReadsPerSec: 28000,
      physicalWritesPerSec: 24000,
      redoMbPerSec: 8.2,
      executionsPerSec: 1200,
      parseCallsPerSec: 60,
      hardParsePct: 0.1,
      topWaitEvent: 'direct path write temp',
      topWaitEventTimePct: 54.2,
      topWaitEventAvgMs: 16.5,
      bufferCacheHitRatio: 88.0,
      pgaCacheHitRatio: 64.2 // Disastrous PGA cache hit
    },
    keyFindings: [
      'PGA Cache Hit Ratio plunged to 64.2% with Multi-Pass Executions > 0.',
      'Top wait events: direct path write temp (54.2%) and direct path read temp (28.4%).',
      'PGA Target Advisory indicates increasing PGA from 16GB to 48GB eliminates 98% of temporary disk writes.',
      'TEMP tablespace grew by 180GB in 40 minutes.'
    ],
    suggestedAction: 'Increase PGA_AGGREGATE_TARGET to 48GB (or 25% of physical RAM) to absorb the large hash joins in memory. Set PGA_AGGREGATE_LIMIT=96G to prevent host OS paging.'
  },
  {
    id: 'scen-rac-gc',
    name: 'RAC Interconnect Latency & GC Block Contention',
    description: 'Network switch port buffer overrun on the private interconnect caused inter-node block transfer latencies to spike from 0.8ms to 7.4ms across a 4-node RAC cluster.',
    dbVersion: 'Oracle 19c RAC (4 Nodes)',
    hardwareProfile: '4 Nodes x 16 Cores (64 Cores total), 10GbE Private Interconnect',
    metrics: {
      elapsedTimeMinutes: 30.0,
      dbTimeMinutes: 3200.0, // AAS = 106.6
      cpuCores: 64,
      numNodes: 4,
      hostUserCpuPct: 42,
      hostSysCpuPct: 18,
      hostWioPct: 8,
      logicalReadsPerSec: 240000,
      physicalReadsPerSec: 3200,
      physicalWritesPerSec: 1800,
      redoMbPerSec: 28.0,
      executionsPerSec: 8900,
      parseCallsPerSec: 340,
      hardParsePct: 0.2,
      topWaitEvent: 'gc cr block 2-way',
      topWaitEventTimePct: 52.8,
      topWaitEventAvgMs: 7.4,
      bufferCacheHitRatio: 98.4,
      pgaCacheHitRatio: 96.5
    },
    keyFindings: [
      'RAC cluster DB Time dominated by Global Cache waits (52.8% on gc cr block 2-way, 18.2% on gc current block 2-way).',
      'Average latency per block transfer is 7.4ms (Normal threshold is < 1.5ms).',
      'Lost blocks detected in GV$SYSSTAT (gc blocks lost = 4,812).',
      'Application services are randomly distributed across all 4 nodes, causing intense cross-instance block pinging.'
    ],
    suggestedAction: 'Check MTU 9000 end-to-end and fix UDP buffer drops on private switch ports. Implement RAC application service partitioning using DBMS_SERVICE to collocate transactional modules on dedicated instances.'
  }
];
