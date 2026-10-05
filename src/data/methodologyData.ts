import { InvestigationStep, GlossaryItem, SoaCorrelationRule } from '../types/awr';

export const investigationSequence: InvestigationStep[] = [
  {
    stepNumber: 1,
    title: 'Header and Snapshot Validation',
    targetSection: 'Report Header & Snapshot Information',
    objective: 'Confirm database identity (DBID, version, CDB/PDB, RAC vs single), uptime/restart check, and ensure the snapshot interval cleanly brackets the incident without dilution.',
    keyQuestions: [
      'Did an instance bounce occur between begin and end snap (invalidating cumulative stats)?',
      'Does the snapshot interval closely cover the incident (e.g. 15-60 min) or does a 4-hour window dilute a 10-minute spike?',
      'Is the workload type documented (OLTP, batch, reporting, mixed)?'
    ],
    diagnosticCommand: `SELECT instance_name, host_name, startup_time, status FROM v$instance;`
  },
  {
    stepNumber: 2,
    title: 'Load Profile Analysis',
    targetSection: 'Report Summary -> Load Profile',
    objective: 'Evaluate normalized activity rates per second, per transaction, and per execution across DB Time, DB CPU, Logical Reads, Physical Reads, Executions, and Redo volume.',
    keyQuestions: [
      'Is AAS (DB Time / Elapsed Time) approaching or exceeding physical CPU cores?',
      'Are executions high with low elapsed time, or low executions with extreme elapsed time?',
      'Is logical reads per execution excessive (> 10,000 gets/exec)?',
      'Are parse calls nearly equal to executions (poor cursor caching)?'
    ],
    diagnosticCommand: `SELECT name, value FROM v$sysstat WHERE name IN ('user calls', 'execute count', 'parse count (total)', 'parse count (hard)');`
  },
  {
    stepNumber: 3,
    title: 'Instance Efficiency & Time Model',
    targetSection: 'Instance Efficiency Percentages & Time Model Statistics',
    objective: 'Understand where foreground time is spent using the fundamental formula: Database Wait Time ≈ DB Time - DB CPU. Inspect Parse time, PL/SQL time, and Java time.',
    keyQuestions: [
      'Is DB CPU the dominant component (executing work), or does Wait Time dominate (waiting for resources)?',
      'Is PL/SQL execution time a major portion of DB Time (row-by-row loops)?',
      'Are hard parses driving high parse elapsed time?'
    ],
    diagnosticCommand: `SELECT stat_name, ROUND(value/1000000, 2) AS sec FROM v$sys_time_model WHERE stat_name IN ('DB time', 'DB CPU', 'parse time elapsed', 'PL/SQL execution elapsed time');`
  },
  {
    stepNumber: 4,
    title: 'Top Timed Foreground Events',
    targetSection: 'Top 10 Foreground Events by Total Wait Time',
    objective: 'Identify the primary bottleneck wait class (User I/O, Concurrency, Commit, Cluster, System I/O) and calculate Average Wait Time = Time Waited / Number of Waits.',
    keyQuestions: [
      'Which wait event accounts for > 20% of DB Time?',
      'Is single-block read latency (db file sequential read) > 8ms - 15ms?',
      'Is log file sync latency > 10ms (commit lag)?',
      'Are mutexes (cursor: pin S wait on X) or row locks (enq: TX) appearing in Top 5?'
    ],
    diagnosticCommand: `SELECT event, total_waits, ROUND(time_waited_micro/1000000, 2) AS time_waited_sec, ROUND(time_waited_micro/NULLIF(total_waits,0)/1000, 2) AS avg_wait_ms FROM v$system_event ORDER BY time_waited_micro DESC FETCH FIRST 10 ROWS ONLY;`
  },
  {
    stepNumber: 5,
    title: 'Host CPU & Operating System Statistics',
    targetSection: 'Operating System Statistics',
    objective: 'Determine if CPU capacity exists at the host level or if other non-Oracle processes (backups, Java middleware, agents) or OS swapping are starving the database.',
    keyQuestions: [
      'Is Host CPU high and DB CPU high (database-driven CPU bottleneck)?',
      'Is Host CPU high but DB CPU low (external processes, backups, or antivirus consuming CPU)?',
      'Is Host CPU low but DB CPU high (Resource Manager, instance caging, or cgroup limits)?',
      'Is OS paging/swapping occurring (VM_PAGES_OUT > 0)?'
    ],
    diagnosticCommand: `SELECT stat_name, value FROM v$osstat WHERE stat_name IN ('LOAD', 'NUM_CPU_CORES', 'USER_TIME', 'SYS_TIME', 'IDLE_TIME', 'IOWAIT_TIME');`
  },
  {
    stepNumber: 6,
    title: 'Memory & Storage I/O Sections',
    targetSection: 'Tablespace IO Stats, Datafile IO Stats, Redo Log Stats',
    objective: 'Pinpoint specific tablespaces and physical datafiles suffering from storage latency (> 15ms-20ms) and evaluate redo log switch frequencies.',
    keyQuestions: [
      'Which specific datafile is generating the highest average read latency?',
      'Are redo logs switching more frequently than once every 15 minutes?',
      'Is TEMP tablespace experiencing high read/write activity (spills to disk)?'
    ],
    diagnosticCommand: `SELECT tsname, phyrds, ROUND(readtim/NULLIF(phyrds,0)*10, 2) AS avg_read_ms, phywrts, ROUND(writetim/NULLIF(phywrts,0)*10, 2) AS avg_write_ms FROM v$tablespace ts JOIN v$filestat fs ON ts.ts# = fs.ts# ORDER BY avg_read_ms DESC;`
  },
  {
    stepNumber: 7,
    title: 'SQL Ordered by Multiple Dimensions',
    targetSection: 'SQL Statistics (Elapsed Time, CPU, Gets, Reads, Executions, Parse, Version Count)',
    objective: 'Never look at a single SQL ranking! Cross-examine SQL across Elapsed Time, CPU Time, User I/O, Buffer Gets, Physical Reads, Executions, and Version Count.',
    keyQuestions: [
      'What are the per-execution costs: Elapsed/Exec, CPU/Exec, Gets/Exec, Reads/Exec?',
      'Is the top elapsed SQL running slow individually, or is it executed millions of times (ORM N+1)?',
      'Does high version count indicate dynamic SQL without bind variables?'
    ],
    diagnosticCommand: `SELECT sql_id, executions, ROUND(elapsed_time/1000000, 2) AS et_sec, buffer_gets, disk_reads, ROUND(buffer_gets/NULLIF(executions,0)) AS gets_per_exec FROM v$sqlarea WHERE executions > 0 ORDER BY elapsed_time DESC FETCH FIRST 10 ROWS ONLY;`
  },
  {
    stepNumber: 8,
    title: 'Blocking, Locking & Concurrency',
    targetSection: 'Enqueue Activity, Segment Statistics by Row Lock Waits',
    objective: 'Trace transaction serialization roots, uncommitted sessions, missing foreign key indexes, and Interested Transaction List (ITL) contention.',
    keyQuestions: [
      'Who is the root blocking session (BLOCKING_SESSION)?',
      'Is enq: TM contention present (indicating unindexed foreign keys)?',
      'Are sessions waiting on ITL allocations in specific data blocks?'
    ],
    diagnosticCommand: `SELECT s.sid, s.serial#, s.username, s.blocking_session, s.seconds_in_wait, s.sql_id FROM gv$session s WHERE s.blocking_session IS NOT NULL OR s.event LIKE 'enq:%';`
  },
  {
    stepNumber: 9,
    title: 'Segment and Object Hotspot Activity',
    targetSection: 'Segment Statistics (Logical Reads, Physical Reads, Buffer Busy, Row Lock Waits)',
    objective: 'Identify the exact physical database tables, indexes, and partitions absorbing the most I/O and lock contention.',
    keyQuestions: [
      'Which index or table accounts for the top logical reads?',
      'Are buffer busy waits concentrated on an index primary key right-hand leaf block?',
      'Can the hot segment be partitioned or redesigned?'
    ],
    diagnosticCommand: `SELECT owner, object_name, subobject_name, object_type, statistic_name, value FROM v$segment_statistics WHERE value > 0 ORDER BY value DESC FETCH FIRST 10 ROWS ONLY;`
  },
  {
    stepNumber: 10,
    title: 'Memory Advisory Evaluations',
    targetSection: 'Advisory Statistics (Buffer Pool, PGA Target, Shared Pool Advice)',
    objective: 'Identify inflection points (knee of the curve) on advisory graphs before altering memory parameters. Verify whether resizing yields real disk I/O reduction.',
    keyQuestions: [
      'Does increasing buffer cache by 20% reduce physical reads by > 25% or < 2% (diminishing returns)?',
      'Does PGA target advice show multi-pass executions dropping to zero with a moderate memory increase?',
      'Is Linux HugePages (HugeTLB) enabled to eliminate 4KB page table overhead?'
    ],
    diagnosticCommand: `SELECT size_factor, estd_physical_read_factor FROM v$db_cache_advice;
SELECT pga_target_factor, estd_pga_cache_hit_percentage, estd_extra_bytes_rw FROM v$pga_target_advice;`
  },
  {
    stepNumber: 11,
    title: 'ADDM Findings & Recommendations',
    targetSection: 'ADDM Findings Summary',
    objective: 'Review automated diagnostic findings from ADDM to corroborate raw statistics. Record finding name, DB Time impact %, affected SQL IDs, and verify application safety.',
    keyQuestions: [
      'What is the highest-impact ADDM recommendation?',
      'Is the recommended SQL profile or index addition safe for the production workload?',
      'Does the finding match the evidence found in Top Timed Events and SQL statistics?'
    ],
    diagnosticCommand: `SELECT f.task_name, f.finding_name, f.type, f.impact/1000000 AS impact_sec, f.message FROM dba_advisor_findings f ORDER BY f.impact DESC FETCH FIRST 10 ROWS ONLY;`
  },
  {
    stepNumber: 12,
    title: 'Comparison with a Known Healthy Baseline',
    targetSection: 'AWR Compare Periods Report (AWR Diff)',
    objective: 'Always compare the degraded incident window with a baseline of identical duration and similar transaction volume to confirm the exact delta chain of evidence.',
    keyQuestions: [
      'Did DB Time increase, and was the increase in DB CPU or Wait Events?',
      'Did a SQL statement plan hash value change (plan regression)?',
      'Did physical reads increase due to a bad access path or simply higher user transaction volume?'
    ],
    diagnosticCommand: `@?/rdbms/admin/awrddrpt.sql`
  }
];

export const glossaryItems: GlossaryItem[] = [
  {
    term: 'AWR (Automatic Workload Repository)',
    category: 'Core Concepts',
    meaning: 'Built-in Oracle database repository that periodically captures, processes, and maintains cumulative performance statistics between snapshots.',
    dbaTip: 'Default snapshot interval is 60 minutes. For high-volume production, set to 15 or 30 minutes with 14-day retention.'
  },
  {
    term: 'DB Time (Database Time)',
    category: 'Time Model',
    meaning: 'The total time spent by all foreground sessions executing database calls. DB Time = Foreground CPU Time + Non-idle Wait Time.',
    dbaTip: 'DB Time is aggregated across sessions, so on a multi-core system DB Time can vastly exceed wall-clock elapsed time. The tuning objective is to reduce DB Time.'
  },
  {
    term: 'DB CPU',
    category: 'Time Model',
    meaning: 'CPU time consumed by foreground database sessions while executing SQL, sorting, parsing, or running PL/SQL code.',
    dbaTip: 'Database Wait Time ≈ DB Time - DB CPU. If DB CPU accounts for > 80% of DB Time, sessions are actively executing rather than waiting on I/O or locks.'
  },
  {
    term: 'AAS (Average Active Sessions)',
    category: 'Time Model',
    meaning: 'Normalized load metric: AAS = DB Time (min) / Elapsed Time (min). Represents the average number of sessions active at any given instant.',
    dbaTip: 'AAS should remain below physical CPU cores. If AAS > CPU Cores, sessions are waiting in the OS run queue.'
  },
  {
    term: 'ASH (Active Session History)',
    category: 'Core Concepts',
    meaning: 'Samples active database sessions every second and records them in V$ACTIVE_SESSION_HISTORY and DBA_HIST_ACTIVE_SESS_HISTORY.',
    dbaTip: 'Essential for transient 5-minute incidents that get diluted inside a 1-hour AWR report average.'
  },
  {
    term: 'STATISTICS_LEVEL',
    category: 'Architecture',
    meaning: 'System initialization parameter that controls database performance data collection (TYPICAL, ALL, or BASIC).',
    dbaTip: 'Never set to BASIC in production—it disables AWR, ADDM, and time model statistics.'
  },
  {
    term: 'CONTROL_MANAGEMENT_PACK_ACCESS',
    category: 'Architecture',
    meaning: 'Controls access to Oracle Enterprise Manager Diagnostic and Tuning pack features (DIAGNOSTIC+TUNING, DIAGNOSTIC, or NONE).',
    dbaTip: 'Must be set to DIAGNOSTIC or DIAGNOSTIC+TUNING to legally generate AWR, ADDM, and ASH reports.'
  },
  {
    term: 'Buffer Gets (Logical Reads)',
    category: 'Execution & SQL',
    meaning: 'Memory block accesses from the Oracle buffer cache (consistent gets + db block gets).',
    dbaTip: 'Logical reads consume CPU! Millions of buffer gets directly drive high DB CPU.'
  },
  {
    term: 'Physical Reads',
    category: 'Memory & Storage',
    meaning: 'Database blocks read from physical storage (SAN, NVMe, disk) into the buffer cache or session PGA.',
    dbaTip: 'High physical reads with low wait latency indicates inefficient SQL access paths, not bad storage.'
  },
  {
    term: 'Hard Parse vs Soft Parse',
    category: 'Execution & SQL',
    meaning: 'Hard parse creates a new executable cursor, syntax analysis, semantic check, and CBO plan. Soft parse finds and reuses an existing cursor.',
    dbaTip: 'Soft Parse % should be > 98%. Low soft parse indicates dynamic SQL without bind variables.'
  },
  {
    term: 'Plan Hash Value (PHV)',
    category: 'Execution & SQL',
    meaning: 'A numeric hash representing the operational shape and join order of an execution plan.',
    dbaTip: 'Multiple plan hash values for the same SQL_ID indicates plan instability or bind variable peeking sensitivity.'
  },
  {
    term: 'SPM (SQL Plan Management)',
    category: 'Execution & SQL',
    meaning: 'Framework that allows DBAs to preserve and enforce verified execution plan baselines (SQL Plan Baselines).',
    dbaTip: 'Use DBMS_SPM.LOAD_PLANS_FROM_AWR to fix a verified good plan when an optimizer regression occurs.'
  },
  {
    term: 'PGA Workarea (Optimal / One-Pass / Multi-Pass)',
    category: 'Memory & Storage',
    meaning: 'Memory allocated to sort, hash join, and bitmap operations. Optimal fits in RAM; Multi-pass spills repeatedly to TEMP.',
    dbaTip: 'Any Multi-Pass execution > 0 indicates severe TEMP disk thrashing and undersized PGA.'
  },
  {
    term: 'Linux HugePages (HugeTLB)',
    category: 'Memory & Storage',
    meaning: 'Linux OS mechanism allocating 2MB or 1GB memory pages to lock the Oracle SGA into RAM.',
    dbaTip: 'Mandatory for SGA > 16GB. HugePages cannot swap out and eliminate tens of gigabytes of 4KB page table RAM overhead.'
  },
  {
    term: 'log file sync vs log file parallel write',
    category: 'Locking & Concurrency',
    meaning: 'log file sync is foreground session wait for commit; log file parallel write is background LGWR writing to redo disks.',
    dbaTip: 'If parallel write is high (> 10ms), storage is slow. If parallel write is low (< 2ms) but sync is high (> 15ms), LGWR is CPU starved.'
  },
  {
    term: 'enq: TM - contention',
    category: 'Locking & Concurrency',
    meaning: 'Table enqueue lock contention, frequently caused by unindexed foreign key constraints.',
    dbaTip: 'Updating or deleting parent rows locks the entire child table if the foreign key lacks an index!'
  },
  {
    term: 'gc cr block 2-way',
    category: 'Architecture',
    meaning: 'RAC wait event where an instance requests a consistent read block from another cluster node across the private interconnect.',
    dbaTip: 'Latency should be < 1.0 - 1.5ms on healthy 10GbE/Infiniband with 9000 MTU Jumbo Frames.'
  },
  {
    term: 'ADDM (Automatic Database Diagnostic Monitor)',
    category: 'Core Concepts',
    meaning: 'Self-diagnostic engine that analyzes AWR statistics at each snapshot to locate top system bottlenecks.',
    dbaTip: 'Use ADDM as a second opinion to confirm findings derived from raw AWR evidence.'
  }
];

export const soaCorrelationRules: SoaCorrelationRule[] = [
  {
    id: 'soa-timeout',
    symptom: 'WebLogic Composite Timeout / Stuck Threads',
    middlewareEvidence: 'WebLogic logs report [STUCK] ExecuteThread for 600 seconds on JDBC executeQuery / executeUpdate.',
    databaseEvidence: 'AWR shows high SQL Elapsed Time, enq: TX row lock contention, or direct path write temp.',
    investigationSteps: [
      'Correlate exact timestamp between WebLogic thread dump and AWR/ASH sample time.',
      'Check if database session was blocked by another uncommitted transaction (enq: TX).',
      'Inspect SQL execution plan for Cartesian join or regressed full table scan.'
    ],
    tuningTactic: 'Tune the offending SQL statement to finish well within WebLogic JTA transaction timeout (e.g. 30 seconds).'
  },
  {
    id: 'soa-pool-exhaustion',
    symptom: 'JDBC Connection Pool Exhaustion',
    middlewareEvidence: 'java.sql.SQLTimeoutException: Connection pool reached maximum capacity (e.g. 100/100 connections in use).',
    databaseEvidence: 'AWR Load Profile shows high Logons per second, high session count in V$SESSION, and sessions waiting on locks.',
    investigationSteps: [
      'Check if application sessions are holding database connections idle in transaction (missing commit/rollback).',
      'Inspect WebLogic Statement Cache size and Connection Reserve Timeout.',
      'Verify whether slow queries are backing up connection return to pool.'
    ],
    tuningTactic: 'Enable connection leak profiling in WebLogic datasource. Fix uncommitted transactions and tune database SQL latency.'
  },
  {
    id: 'soa-retry-storm',
    symptom: 'Duplicate Retries & Queue Redelivery Storm',
    middlewareEvidence: 'JMS or SOA error queue redelivery loop repeating same payload 10 times in 1 minute.',
    databaseEvidence: 'AWR shows surge in Executions per second for DML statements and high enq: TX - row lock contention.',
    investigationSteps: [
      'Check for duplicate business keys being inserted or updated concurrently.',
      'Check if client retries are multiplying lock duration.',
      'Verify idempotency key handling in integration layer.'
    ],
    tuningTactic: 'Implement idempotency checks in application service. Apply exponential backoff on retries.'
  },
  {
    id: 'soa-xa-delay',
    symptom: 'XA 2-Phase Commit (2PC) Delay',
    middlewareEvidence: 'WebLogic JTA logs report prolonged PREPARE or COMMIT phase on distributed transaction.',
    databaseEvidence: 'AWR shows waits on log file sync, distributed transaction lock, or V$2PC_PENDING entries.',
    investigationSteps: [
      'Query DBA_2PC_PENDING for in-doubt distributed transactions.',
      'Check network round-trip latency between WebLogic cluster and Oracle database.',
      'Verify undo and redo write response times.'
    ],
    tuningTactic: 'Resolve in-doubt transactions using COMMIT FORCE or ROLLBACK FORCE. Ensure low-latency interconnect between middleware and database.'
  }
];
