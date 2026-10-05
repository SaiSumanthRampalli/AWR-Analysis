import { RunbookPhase } from '../types/awr';

export const initialRunbookPhases: RunbookPhase[] = [
  {
    id: 'phase-0',
    number: '00',
    title: 'Pre-Flight Context & Snapshot Validity',
    shortDesc: 'Verify collection parameters, database & container identity, snapshot delta, instance restart, Average Active Sessions (AAS), and DB Time vs Elapsed Time ratio.',
    category: 'context',
    items: [
      {
        id: 'chk-0-0',
        phaseId: 'phase-0',
        title: 'Collection Settings & Pack License Check',
        awrSection: 'Report Summary -> Initialization Parameters',
        metricName: 'STATISTICS_LEVEL & CONTROL_MANAGEMENT_PACK_ACCESS',
        formula: 'STATISTICS_LEVEL in (TYPICAL, ALL) AND PACK_ACCESS in (DIAGNOSTIC+TUNING, DIAGNOSTIC)',
        normalThreshold: 'STATISTICS_LEVEL = TYPICAL or ALL; CONTROL_MANAGEMENT_PACK_ACCESS = DIAGNOSTIC+TUNING',
        warningThreshold: 'CONTROL_MANAGEMENT_PACK_ACCESS = DIAGNOSTIC only (Tuning pack features disabled)',
        criticalThreshold: 'STATISTICS_LEVEL = BASIC (Disables AWR, ADDM, and time model statistics!)',
        pointsToNote: [
          'STATISTICS_LEVEL = BASIC turns off automated statistics collection and invalidates AWR/ASH/ADDM.',
          'CONTROL_MANAGEMENT_PACK_ACCESS must permit Diagnostic Pack for AWR/ADDM/ASH usage legally.',
          'Verify container context (CDB root vs specific PDB) when analyzing multi-tenant databases.'
        ],
        diagnosticQuery: `-- Check AWR prerequisites
SELECT name, value FROM v$parameter 
WHERE name IN ('statistics_level', 'control_management_pack_access', 'sga_target', 'pga_aggregate_target', 'memory_target');`,
        verificationAction: 'ALTER SYSTEM SET statistics_level = TYPICAL SCOPE=BOTH; Ensure licensing compliance with Oracle Diagnostic & Tuning Pack.',
        status: 'unverified'
      },
      {
        id: 'chk-0-ctx',
        phaseId: 'phase-0',
        title: 'Investigation Scope & Baseline Period Availability',
        awrSection: 'Report Header -> Scope & Baseline Comparison',
        metricName: 'Context Documentation & Baseline Comparison',
        formula: 'Document DBID, Version, Workload Type (OLTP/Batch), Peak Window, and Healthy Baseline Snapshots',
        normalThreshold: 'Full context documented; Healthy comparison baseline snapshot of identical duration available',
        warningThreshold: 'Baseline comparison available but from different time of day or duration',
        criticalThreshold: 'No healthy baseline available; Comparing peak OLTP hour with quiet weekend (invalid comparison!)',
        pointsToNote: [
          'Never compare an OLTP peak hour with a low-load weekend and conclude a parameter change solved the problem.',
          'Record: DB name, DBID, CDB/PDB, Instance number, RAC scope, Workload type, Symptom, Changes deployed.',
          'Use @?/rdbms/admin/awrrpt.sql for general AWR, @?/rdbms/admin/awrsqrpt.sql for SQL-specific, and @?/rdbms/admin/awrddrpt.sql for Diff reports.'
        ],
        diagnosticQuery: `-- Retrieve snapshot list with timestamps to identify matching healthy baseline
SELECT snap_id, begin_interval_time, end_interval_time, snap_level
FROM dba_hist_snapshot
WHERE begin_interval_time >= SYSDATE - 7
ORDER BY snap_id DESC;`,
        verificationAction: 'Select a known-good snapshot period from the same day last week with identical duration and similar transaction volume for AWR diff analysis.',
        status: 'unverified'
      },
      {
        id: 'chk-0-1',
        phaseId: 'phase-0',
        title: 'DB Time vs Elapsed Time (AAS Calculation)',
        awrSection: 'Report Summary -> Header',
        metricName: 'Average Active Sessions (AAS)',
        formula: 'AAS = DB Time (min) / Elapsed Time (min)',
        normalThreshold: 'AAS < Total Host CPU Cores (under 75% core capacity)',
        warningThreshold: 'AAS between 75% and 100% of Total CPU Cores',
        criticalThreshold: 'AAS > Total Host CPU Cores (Severe queueing / CPU starvation)',
        pointsToNote: [
          'DB Time represents cumulative foreground session time spent doing work (CPU + Non-idle waits).',
          'DB Time is NOT wall-clock time; on multi-core systems DB Time can vastly exceed Elapsed Time.',
          'If AAS << 1, the instance was largely idle during the snapshot window.',
          'Rule of thumb: AAS = 1 means on average 1 session was active at every instant.'
        ],
        diagnosticQuery: `-- Current Active Sessions vs CPU Cores
SELECT 
    COUNT(*) AS active_foreground_sessions,
    (SELECT value FROM v$osstat WHERE stat_name = 'NUM_CPU_CORES') AS num_cpu_cores,
    ROUND(COUNT(*) / (SELECT value FROM v$osstat WHERE stat_name = 'NUM_CPU_CORES'), 2) AS core_load_ratio
FROM v$session
WHERE status = 'ACTIVE' 
  AND type != 'BACKGROUND';`,
        verificationAction: 'If AAS > CPU Cores, pivot to Phase 1 (Host CPU saturation) and Phase 2 (Top wait events) to isolate whether sessions are spinning on CPU or queuing on non-idle waits.',
        status: 'unverified'
      },
      {
        id: 'chk-0-2',
        phaseId: 'phase-0',
        title: 'Instance Restart & Uptime Anomaly Check',
        awrSection: 'Report Summary -> Header',
        metricName: 'Begin Snap / End Snap Startup Time',
        formula: 'Check if STARTUP_TIME changed between snaps',
        normalThreshold: 'No restart (Instance Startup Time is identical in Begin & End snaps)',
        warningThreshold: 'N/A',
        criticalThreshold: 'Instance bounced during snapshot interval (Invalidates cumulative counters!)',
        pointsToNote: [
          'If the database was bounced mid-snapshot, delta calculations in AWR are corrupted or truncated.',
          'Cold buffer cache immediately after restart causes temporary high physical reads and hard parses.',
          'Always verify database uptime prior to diagnosing sudden cache hit ratio drops.'
        ],
        diagnosticQuery: `-- Check instance bounce and startup timestamp
SELECT instance_name, host_name, startup_time, 
       ROUND((SYSDATE - startup_time) * 24, 2) AS uptime_hours,
       status
FROM v$instance;`,
        verificationAction: 'If an unplanned bounce occurred, review alert.log, core dump trace files, and ORA-00600/ORA-07445 errors before tuning SQL.',
        status: 'unverified'
      },
      {
        id: 'chk-0-3',
        phaseId: 'phase-0',
        title: 'Snapshot Interval & Granularity Check',
        awrSection: 'Report Summary -> Snapshot Info',
        metricName: 'Snapshot Duration',
        formula: 'End Snap Time - Begin Snap Time',
        normalThreshold: '15 to 60 minutes snapshot window',
        warningThreshold: 'Duration between 60m and 180m (Dilutes short transient spikes)',
        criticalThreshold: 'Duration > 4 hours or < 5 minutes',
        pointsToNote: [
          'Averaging over 8 or 24 hours smooths out critical 15-minute outage spikes (the "flaw of averages").',
          'For acute performance incidents, generate 15-minute or 30-minute AWR or ASH reports.',
          'Never use multi-day AWR reports for performance triage.'
        ],
        diagnosticQuery: `-- Verify AWR snapshot interval and retention settings
SELECT snap_interval, retention, topnsql 
FROM dba_hist_wr_control;`,
        verificationAction: 'Adjust snapshot interval to 15 or 30 minutes in production using DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS.',
        status: 'unverified'
      },
      {
        id: 'chk-0-4',
        phaseId: 'phase-0',
        title: 'RAC Node Workload Distribution Skew',
        awrSection: 'RAC Summary / System Summary (RAC only)',
        metricName: 'DB Time % across RAC Instances',
        formula: 'DB Time(Instance N) / Total Cluster DB Time',
        normalThreshold: 'Even distribution (no single node handling > 60% in multi-node RAC)',
        warningThreshold: 'Node handling 65% - 80% of cluster DB Time',
        criticalThreshold: 'Severe node skew: Single node handling > 85% of total cluster DB Time',
        pointsToNote: [
          'Uneven client connection load balancing across VIPs / SCAN addresses.',
          'Service placement configuration pinned to a single instance.',
          'Single-node heavy batch jobs can cause cross-instance Global Cache (GC) churn.'
        ],
        diagnosticQuery: `-- RAC Service workload distribution
SELECT inst_id, service_name, count(*) AS active_sessions
FROM gv$session
WHERE status = 'ACTIVE'
GROUP BY inst_id, service_name
ORDER BY inst_id;`,
        verificationAction: 'Review SCAN listener distribution and client TNS LOAD_BALANCE=ON settings. Verify DBMS_SERVICE configurations.',
        status: 'unverified'
      }
    ]
  },
  {
    id: 'phase-1',
    number: '01',
    title: 'Host Operating System & CPU Saturation',
    shortDesc: 'Evaluate CPU %User, %System, %IOwait, %Idle, Run Queue length, and swap memory paging activity.',
    category: 'host',
    items: [
      {
        id: 'chk-1-1',
        phaseId: 'phase-1',
        title: 'OS %User vs %System vs %WIO vs %Idle',
        awrSection: 'Operating System Statistics',
        metricName: 'Host CPU Distribution',
        formula: '%User + %Sys + %WIO + %Idle = 100%',
        normalThreshold: '%Idle >= 20%, %Sys <= 10%, %WIO <= 5%',
        warningThreshold: '%Idle < 15% OR %Sys between 12% - 20% OR %WIO > 10%',
        criticalThreshold: '%Idle < 5% (CPU pegged) OR %Sys > 25% (Kernel overhead/paging)',
        pointsToNote: [
          'High %User: Oracle foreground processes executing SQL or in-memory operations.',
          'High %System: Kernel context switches, memory swapping, hugepage misconfiguration, excessive semaphores.',
          'High %WIO (Wait on I/O): OS threads suspended waiting on disk/SAN response.',
          'If %User is high, focus on SQL Top by CPU. If %Sys is high, check OS paging & memory allocation.'
        ],
        diagnosticQuery: `-- Current OS CPU breakdown from v$osstat
SELECT stat_name, value, comments
FROM v$osstat
WHERE stat_name IN ('BUSY_TIME', 'IDLE_TIME', 'USER_TIME', 'SYS_TIME', 'IOWAIT_TIME', 'NUM_CPU_CORES');`,
        verificationAction: 'If %User dominates, inspect SQL hotspots by CPU Time in Phase 3. If %Sys dominates, inspect OS hugepages, semaphore arrays, and file system mount options.',
        status: 'unverified'
      },
      {
        id: 'chk-1-2',
        phaseId: 'phase-1',
        title: 'Run Queue Length vs CPU Cores',
        awrSection: 'Operating System Statistics',
        metricName: 'LOAD (Run Queue)',
        formula: 'Run Queue / NUM_CPU_CORES',
        normalThreshold: 'Load ratio <= 1.0 (Queue length <= Core count)',
        warningThreshold: 'Load ratio between 1.0 and 2.0',
        criticalThreshold: 'Load ratio > 2.0 (Processes actively queuing for CPU time slices)',
        pointsToNote: [
          'On modern Hyper-Threaded CPUs, physical core count is the true constraint, not virtual SMT threads.',
          'Run queue > physical cores causes latency inflation for every single SQL statement.',
          'Check if non-Oracle third-party processes (backups, antivirus, batch agents) are hogging host CPU.'
        ],
        diagnosticQuery: `-- Run queue length and CPU saturation check
SELECT 
    (SELECT value FROM v$osstat WHERE stat_name = 'LOAD') AS current_load,
    (SELECT value FROM v$osstat WHERE stat_name = 'NUM_CPU_CORES') AS num_cpu_cores,
    ROUND((SELECT value FROM v$osstat WHERE stat_name = 'LOAD') / 
          (SELECT value FROM v$osstat WHERE stat_name = 'NUM_CPU_CORES'), 2) AS run_queue_per_core
FROM dual;`,
        verificationAction: 'Identify runaway sessions in v$session via CPU consumption. Throttle parallel execution using PARALLEL_MAX_SERVERS.',
        status: 'unverified'
      },
      {
        id: 'chk-1-3',
        phaseId: 'phase-1',
        title: 'OS Memory Swapping & Paging Activity',
        awrSection: 'Operating System Statistics',
        metricName: 'VM_PAGES_IN / VM_PAGES_OUT',
        formula: 'Rate of paging to/from disk swap space',
        normalThreshold: 'Zero swap in/out (0 pages/sec)',
        warningThreshold: 'Transient paging (< 50 pages/sec during peak bursts)',
        criticalThreshold: 'Continuous swapping (> 100 pages/sec) -> Severe memory thrashing',
        pointsToNote: [
          'Oracle SGA and PGA must NEVER be swapped to disk; swapping crushes database performance.',
          'Double-check that Linux HugePages are configured to lock SGA into physical RAM.',
          'Ensure OS kernel parameter vm.swappiness is set to 1 or 10 on Linux database servers.'
        ],
        diagnosticQuery: `-- Check OS memory metrics recorded in Oracle
SELECT stat_name, ROUND(value / 1024 / 1024, 2) AS value_mb
FROM v$osstat
WHERE stat_name IN ('PHYSICAL_MEMORY_BYTES', 'FREE_MEMORY_BYTES');`,
        verificationAction: 'Configure Linux HugePages (HugeTLB) to lock SGA in RAM. Reduce MEMORY_TARGET or SGA_MAX_SIZE if total RAM is overcommitted.',
        status: 'unverified'
      }
    ]
  },
  {
    id: 'phase-2',
    number: '02',
    title: 'Top Timed Foreground Wait Events',
    shortDesc: 'Analyze dominant wait classes, average wait latency, and identify whether the bottleneck is CPU, I/O, Concurrency, or Locks.',
    category: 'waits',
    items: [
      {
        id: 'chk-2-1',
        phaseId: 'phase-2',
        title: 'DB CPU as Primary Consumer of DB Time',
        awrSection: 'Top 10 Foreground Events by Total Wait Time',
        metricName: 'DB CPU % of DB Time',
        formula: 'DB CPU Time / DB Time * 100',
        normalThreshold: 'DB CPU represents 60% - 90% of DB Time (Healthy workload doing productive work)',
        warningThreshold: 'DB CPU < 30% of DB Time (Database is spending > 70% of time stalled on waits)',
        criticalThreshold: 'DB CPU > 95% with 100% Host CPU (Runaway CPU spinning/bad execution plans)',
        pointsToNote: [
          'When DB CPU is the dominant event, the database is active; check for inefficient SQL, unindexed scans, in-memory sorting.',
          'When wait events dominate over DB CPU, sessions are stalled waiting for external resources (I/O, locks, network).'
        ],
        diagnosticQuery: `-- Current foreground time breakdown: CPU vs Wait Time
SELECT 
    stat_name, 
    ROUND(value / 1000000, 2) AS time_seconds,
    ROUND(value * 100 / SUM(value) OVER (), 1) AS pct_of_time
FROM v$sys_time_model
WHERE stat_name IN ('DB CPU', 'DB time')
ORDER BY value DESC;`,
        verificationAction: 'If DB CPU is the top consumer, prioritize Phase 3: SQL Statistics by CPU Time.',
        status: 'unverified'
      },
      {
        id: 'chk-2-2',
        phaseId: 'phase-2',
        title: 'Single-Block Read Latency (db file sequential read)',
        awrSection: 'Top 10 Foreground Events',
        metricName: 'db file sequential read - Avg Wait (ms)',
        formula: 'Total Wait Time (ms) / Total Waits',
        normalThreshold: 'Avg Wait < 4ms (Flash/NVMe/Tier-1 SAN storage)',
        warningThreshold: 'Avg Wait between 5ms and 12ms (Traditional spinning disk arrays or moderate SAN contention)',
        criticalThreshold: 'Avg Wait > 15ms (Severe SAN queueing, controller bottleneck, or overloaded LUNs)',
        pointsToNote: [
          'Single block I/O is typically index lookups or table fetch by ROWID.',
          'High wait count with LOW latency: Application is reading too many index blocks (SQL tuning required).',
          'Low wait count with HIGH latency: Storage I/O subsystem bottleneck (Hardware/SAN tuning required).'
        ],
        diagnosticQuery: `-- Check current wait event stats for single block reads
SELECT event, total_waits, time_waited_micro/1000 AS time_waited_ms,
       ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) AS avg_wait_ms
FROM v$system_event
WHERE event = 'db file sequential read';`,
        verificationAction: 'Identify SQL statements with high physical reads in Phase 3. Verify index clustering factors and missing composite indexes.',
        status: 'unverified'
      },
      {
        id: 'chk-2-3',
        phaseId: 'phase-2',
        title: 'Multi-Block Read Latency (db file scattered read)',
        awrSection: 'Top 10 Foreground Events',
        metricName: 'db file scattered read - Avg Wait (ms)',
        formula: 'Total Wait Time (ms) / Total Waits',
        normalThreshold: 'Avg Wait < 8ms',
        warningThreshold: 'Avg Wait between 8ms and 20ms',
        criticalThreshold: 'Avg Wait > 25ms OR scattered reads dominate > 30% of total DB Time',
        pointsToNote: [
          'Multi-block reads represent Full Table Scans (FTS) or Index Fast Full Scans (IFFS).',
          'Check parameter db_file_multiblock_read_count.',
          'In Oracle 11g+ serial direct path reads (direct path read) often supersede scattered reads for FTS.'
        ],
        diagnosticQuery: `-- Check scattered read occurrence and average latency
SELECT event, total_waits, 
       ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) AS avg_wait_ms
FROM v$system_event
WHERE event IN ('db file scattered read', 'direct path read');`,
        verificationAction: 'Investigate SQL with Full Table Scans on large tables. Add suitable selective indexes or partition pruning.',
        status: 'unverified'
      },
      {
        id: 'chk-2-4',
        phaseId: 'phase-2',
        title: 'Log File Sync Commit Latency',
        awrSection: 'Top 10 Foreground Events',
        metricName: 'log file sync - Avg Wait (ms)',
        formula: 'Time spent waiting for LGWR to flush redo buffer to disk',
        normalThreshold: 'Avg Wait < 3ms (NVMe / Write-back cache SAN)',
        warningThreshold: 'Avg Wait between 5ms and 15ms',
        criticalThreshold: 'Avg Wait > 15ms OR log file sync accounts for > 20% of DB Time',
        pointsToNote: [
          'High wait count with small average wait: Application commits inside loops (row-by-row commits).',
          'Small wait count with huge average wait: LGWR I/O latency issue (slow redo disks).',
          'Compare log file sync with background event log file parallel write. If sync >> parallel write, LGWR CPU starvation or post-wait semaphore delay exists.'
        ],
        diagnosticQuery: `-- Compare foreground log file sync vs background log file parallel write
SELECT event, total_waits, 
       ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) AS avg_wait_ms
FROM v$system_event
WHERE event IN ('log file sync', 'log file parallel write');`,
        verificationAction: 'Batch commits in PL/SQL loops. Place online redo logs on dedicated low-latency SSD/NVMe storage without RAID-5.',
        status: 'unverified'
      },
      {
        id: 'chk-2-5',
        phaseId: 'phase-2',
        title: 'Concurrency & Locking Contention (enq: TX / TM)',
        awrSection: 'Top 10 Foreground Events / Enqueue Activity',
        metricName: 'enq: TX - row lock contention / enq: TM - contention',
        formula: 'Foreground wait time on transaction locks',
        normalThreshold: 'Not in Top 10 Foreground Wait Events (< 1% DB Time)',
        warningThreshold: 'Accounts for 3% - 8% of DB Time',
        criticalThreshold: 'Top 3 wait event OR accounts for > 10% of DB Time (Application deadlock / serializing)',
        pointsToNote: [
          'enq: TX - row lock contention (mode 6): Multiple sessions updating the exact same row.',
          'enq: TX - row lock contention (mode 4): Unique key index contention or ITL (Interested Transaction List) slot shortage in block.',
          'enq: TM - contention: Missing foreign key indexes causing table-level lock on child/parent updates!'
        ],
        diagnosticQuery: `-- Find unindexed foreign keys causing enq: TM locks
SELECT c.table_name, c.constraint_name, cc.column_name
FROM user_constraints c
JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
WHERE c.constraint_type = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM user_ind_columns ic
    WHERE ic.table_name = cc.table_name 
      AND ic.column_name = cc.column_name
      AND ic.column_position = 1
  );`,
        verificationAction: 'Create B-tree indexes on all unindexed Foreign Keys. Increase INITRANS on high-concurrency tables/indexes. Tune application commit scope.',
        status: 'unverified'
      },
      {
        id: 'chk-2-6',
        phaseId: 'phase-2',
        title: 'Shared Pool & Library Cache Latches / Mutexes',
        awrSection: 'Top 10 Foreground Events / Latch Activity',
        metricName: 'cursor: pin S wait on X / library cache lock / latch: shared pool',
        formula: 'Foreground wait time on parsing and cursor management',
        normalThreshold: 'Not appearing in Top 10 wait events',
        warningThreshold: 'Accounts for 2% - 5% of DB Time',
        criticalThreshold: '> 5% of DB Time (Hard parse storm or severe cursor invalidation thrashing)',
        pointsToNote: [
          'Caused by excessive dynamic SQL without bind variables, causing concurrent hard parsing.',
          'High child cursor counts on single SQL_IDs due to bind length variations or optimizer environment differences.',
          'Frequent DDL, TRUNCATE, or schema object recompilation that invalidates shared cursors.'
        ],
        diagnosticQuery: `-- Check SQL statements with high version/child cursor count
SELECT sql_id, version_count, executions, parse_calls
FROM v$sqlarea
WHERE version_count > 50
ORDER BY version_count DESC
FETCH FIRST 10 ROWS ONLY;`,
        verificationAction: 'Enforce bind variables in application code. Consider temporary CURSOR_SHARING = FORCE. Investigate v$sql_shared_cursor for reason of proliferation.',
        status: 'unverified'
      }
    ]
  },
  {
    id: 'phase-3',
    number: '03',
    title: 'SQL Statistics & Hotspot Identification',
    shortDesc: 'Inspect Top SQL by Elapsed Time, CPU Time, Buffer Gets, Physical Reads, Executions, and Parse Calls.',
    category: 'sql',
    items: [
      {
        id: 'chk-3-1',
        phaseId: 'phase-3',
        title: 'SQL by Elapsed Time Concentration (Pareto 80/20 Rule)',
        awrSection: 'SQL Statistics -> SQL ordered by Elapsed Time',
        metricName: 'Top 5 SQL % of Total DB Time',
        formula: 'SUM(Elapsed Time of Top 5 SQL) / DB Time * 100',
        normalThreshold: 'Even distribution across many statements (no single SQL > 20% DB Time)',
        warningThreshold: 'Top 3 SQL account for 30% - 50% of Total DB Time',
        criticalThreshold: 'Single SQL_ID accounts for > 40% of DB Time (Targeted silver-bullet tuning candidate)',
        pointsToNote: [
          'If 1 or 2 SQL_IDs account for most of DB Time, tuning those specific statements resolves the system-wide issue.',
          'Always compare Elapsed Time vs CPU Time. If Elapsed Time >> CPU Time, statement is blocked on I/O or locks.',
          'If Elapsed Time ~= CPU Time, statement is burning pure CPU on logical reads or joins.'
        ],
        diagnosticQuery: `-- Retrieve Top SQL by Elapsed Time from ASH / AWR
SELECT sql_id, plan_hash_value, executions_delta,
       ROUND(elapsed_time_delta / 1000000, 2) AS elapsed_sec,
       ROUND(cpu_time_delta / 1000000, 2) AS cpu_sec,
       buffer_gets_delta
FROM dba_hist_sqlstat
WHERE snap_id = (SELECT max(snap_id) FROM dba_hist_snapshot)
ORDER BY elapsed_time_delta DESC
FETCH FIRST 10 ROWS ONLY;`,
        verificationAction: 'Extract the full execution plan using DBMS_XPLAN.DISPLAY_AWR(sql_id). Check for plan regressions using historical plan baselines.',
        status: 'unverified'
      },
      {
        id: 'chk-3-2',
        phaseId: 'phase-3',
        title: 'Logical I/O Efficiency (Buffer Gets per Execution)',
        awrSection: 'SQL Statistics -> SQL ordered by Gets',
        metricName: 'Buffer Gets per Exec',
        formula: 'Buffer Gets / Executions',
        normalThreshold: '< 1,000 gets per execution for OLTP queries',
        warningThreshold: '1,000 to 20,000 gets per execution for single-record queries',
        criticalThreshold: '> 50,000 gets per execution for frequent OLTP lookups',
        pointsToNote: [
          'High buffer gets per execution indicates inefficient access paths: full table scans, or index range scans scanning millions of leaf blocks.',
          'Logical reads consume CPU! Millions of buffer gets directly drive high DB CPU.',
          'Look for Cartesian joins or unselective index range scans.'
        ],
        diagnosticQuery: `-- Identify SQL with highest Buffer Gets per Exec
SELECT sql_id, executions, buffer_gets,
       ROUND(buffer_gets / NULLIF(executions, 0)) AS gets_per_exec,
       sql_text
FROM v$sqlarea
WHERE executions > 10
ORDER BY gets_per_exec DESC
FETCH FIRST 10 ROWS ONLY;`,
        verificationAction: 'Inspect predicate selectivity. Add covering indexes to eliminate table access by index rowid. Check optimizer statistics.',
        status: 'unverified'
      },
      {
        id: 'chk-3-3',
        phaseId: 'phase-3',
        title: 'Physical I/O Heavyweights (Reads per Execution)',
        awrSection: 'SQL Statistics -> SQL ordered by Reads',
        metricName: 'Physical Reads per Exec',
        formula: 'Physical Reads / Executions',
        normalThreshold: '< 50 physical reads per execution for OLTP queries',
        warningThreshold: '50 to 500 physical reads per execution',
        criticalThreshold: '> 1,000 physical reads per execution for high-frequency queries',
        pointsToNote: [
          'High physical reads flush other active blocks out of the buffer cache.',
          'Distinguish between Direct Path Reads (bypasses buffer cache) vs Cache Reads.',
          'Verify if partition pruning is functioning correctly for partitioned tables.'
        ],
        diagnosticQuery: `-- Top SQL causing disk reads
SELECT sql_id, executions, disk_reads,
       ROUND(disk_reads / NULLIF(executions, 0)) AS reads_per_exec
FROM v$sqlarea
WHERE executions > 0
ORDER BY disk_reads DESC
FETCH FIRST 10 ROWS ONLY;`,
        verificationAction: 'Verify table size and index status. If direct path reads occur, check optimizer serial direct read threshold (_serial_direct_read).',
        status: 'unverified'
      },
      {
        id: 'chk-3-4',
        phaseId: 'phase-3',
        title: 'SQL Plan Instability & Regressions (Plan Hash Value)',
        awrSection: 'SQL Statistics -> Complete List of SQL Statements',
        metricName: 'Multiple Plan Hash Values per SQL_ID',
        formula: 'COUNT(DISTINCT plan_hash_value) > 1 in AWR',
        normalThreshold: 'Stable execution plan (Single Plan Hash Value with consistent elapsed time)',
        warningThreshold: '2 plan hash values with moderate elapsed time variance (< 50%)',
        criticalThreshold: 'Plan flip causing > 5x - 50x elapsed time degradation (Classic plan regression incident)',
        pointsToNote: [
          'Plan flips frequently occur after weekend DBMS_STATS runs, parameter changes, or database version upgrades.',
          'Bind variable peeking (ACS - Adaptive Cursor Sharing) can alternate plans based on initial bind parameters.',
          'Oracle SQL Plan Management (SPM) can lock in verified baselines.'
        ],
        diagnosticQuery: `-- Check historical execution plan flips for a SQL_ID
SELECT snap_id, plan_hash_value, executions_delta,
       ROUND(elapsed_time_delta / NULLIF(executions_delta, 0) / 1000, 2) AS avg_elapsed_ms,
       ROUND(buffer_gets_delta / NULLIF(executions_delta, 0)) AS avg_buffer_gets
FROM dba_hist_sqlstat
WHERE sql_id = :target_sql_id
ORDER BY snap_id DESC;`,
        verificationAction: 'Load the historical good plan into a SQL Plan Baseline using DBMS_SPM.LOAD_PLANS_FROM_AWR.',
        status: 'unverified'
      },
      {
        id: 'chk-3-per-exec',
        phaseId: 'phase-3',
        title: 'Per-Execution Cost Math vs Total Volume (ORM N+1 Detection)',
        awrSection: 'SQL Statistics -> Multi-Dimension Cross Check',
        metricName: 'Elapsed/Exec, CPU/Exec, Gets/Exec, Reads/Exec',
        formula: 'Elapsed/Exec = Elapsed Time / Executions; Gets/Exec = Buffer Gets / Executions',
        normalThreshold: 'Normal: Fast per-exec (< 1ms) with moderate executions, OR high batch work with low execution count',
        warningThreshold: 'Chatty application executing single query > 500,000 times/hour with micro-delays (N+1 query problem)',
        criticalThreshold: 'Extreme per-execution cost (> 5,000ms/exec on frequent OLTP) OR > 1,000,000 execs/hr causing thread queueing',
        pointsToNote: [
          'A SQL with high total elapsed time may simply be running millions of times (chatty ORM/loops).',
          'Another SQL may execute only 5 times but take 10 minutes each due to bad joins.',
          'Always calculate: Elapsed/Exec, CPU/Exec, Gets/Exec, and Reads/Exec before proposing a rewrite.'
        ],
        diagnosticQuery: `-- Per-execution cost breakdown
SELECT sql_id, executions,
       ROUND(elapsed_time / NULLIF(executions, 0) / 1000, 2) AS elapsed_per_exec_ms,
       ROUND(cpu_time / NULLIF(executions, 0) / 1000, 2) AS cpu_per_exec_ms,
       ROUND(buffer_gets / NULLIF(executions, 0)) AS gets_per_exec,
       ROUND(disk_reads / NULLIF(executions, 0)) AS reads_per_exec
FROM v$sqlarea WHERE executions > 0 ORDER BY elapsed_time DESC FETCH FIRST 10 ROWS ONLY;`,
        verificationAction: 'For high executions: implement array fetching, eager fetch / JOINs, and statement caching. For high per-exec cost: tune indexing and join operations.',
        status: 'unverified'
      }
    ]
  },
  {
    id: 'phase-4',
    number: '04',
    title: 'Instance Activity & System Load Profile',
    shortDesc: 'Evaluate logical reads/sec, physical I/O rate, redo throughput, parse efficiency, and soft parse ratios.',
    category: 'activity',
    items: [
      {
        id: 'chk-4-0',
        phaseId: 'phase-4',
        title: 'Time Model Breakdown (DB Time vs DB CPU & Wait Time)',
        awrSection: 'Time Model Statistics',
        metricName: 'Database Wait Time ≈ DB Time - DB CPU',
        formula: 'Database Wait Time = DB Time - DB CPU; Parse Time %; PL/SQL Time %; Java Time %',
        normalThreshold: 'DB CPU accounts for 60% - 90% of DB Time; PL/SQL & Parse time < 10%',
        warningThreshold: 'Wait Time accounts for > 60% of DB Time OR PL/SQL execution time > 25% of DB Time',
        criticalThreshold: 'Wait Time > 85% of DB Time (database paralyzed on locks/IO) OR Hard Parse time > 40%',
        pointsToNote: [
          'Database Wait Time ≈ DB Time - DB CPU indicates whether the instance is executing or stalled waiting.',
          'High PL/SQL time indicates row-by-row procedural processing or excessive PL/SQL-to-SQL context switches.',
          'High parse time elapsed indicates literal SQL without bind variables or cursor invalidations.'
        ],
        diagnosticQuery: `-- Time model foreground breakdown
SELECT stat_name, ROUND(value / 1000000, 2) AS time_sec,
       ROUND(value * 100 / (SELECT value FROM v$sys_time_model WHERE stat_name = 'DB time'), 1) AS pct_db_time
FROM v$sys_time_model
WHERE stat_name IN ('DB time', 'DB CPU', 'parse time elapsed', 'hard parse elapsed time', 'PL/SQL execution elapsed time', 'Java execution elapsed time')
ORDER BY value DESC;`,
        verificationAction: 'If wait time dominates, inspect Phase 2 wait events. If PL/SQL time dominates, refactor loops into BULK COLLECT / FORALL.',
        status: 'unverified'
      },
      {
        id: 'chk-4-1',
        phaseId: 'phase-4',
        title: 'Parse to Execute Ratio & Hard Parse Storms',
        awrSection: 'Instance Activity Stats / Load Profile',
        metricName: 'Soft Parse % and Parse / Execute Ratio',
        formula: 'Soft Parse % = (Total Parses - Hard Parses) / Total Parses * 100',
        normalThreshold: 'Soft Parse % >= 98%, Execute to Parse % >= 70%',
        warningThreshold: 'Soft Parse % between 90% and 95%',
        criticalThreshold: 'Soft Parse % < 85% (Severe Hard Parse storm flooding Shared Pool)',
        pointsToNote: [
          'Hard parsing requires allocating memory in the shared pool, syntax check, semantic analysis, and cost optimization.',
          'Hard parse storms cause mutex contention (cursor: pin S wait on X) and library cache latches.',
          'Application missing bind variables: WHERE id = 12345 vs WHERE id = :b1.'
        ],
        diagnosticQuery: `-- Check current Hard vs Soft Parse metrics
SELECT name, value
FROM v$sysstat
WHERE name IN ('parse count (total)', 'parse count (hard)', 'execute count');`,
        verificationAction: 'Rewrite application SQL to use parameterized bind variables. In extreme emergencies, set CURSOR_SHARING = FORCE.',
        status: 'unverified'
      },
      {
        id: 'chk-4-2',
        phaseId: 'phase-4',
        title: 'Redo Generation Rate & Log Switch Frequency',
        awrSection: 'Load Profile & Redo Log Activity',
        metricName: 'Redo Generation (MB/sec) & Log Switches per Hour',
        formula: 'Redo Size (bytes/sec) / 1024 / 1024',
        normalThreshold: 'Log switches every 15 - 30 minutes (2 to 4 switches per hour)',
        warningThreshold: 'Log switches every 5 - 10 minutes (6 to 12 switches per hour)',
        criticalThreshold: 'Log switches > 15 times/hour (every < 4 min) OR Redo > 150 MB/s continuous',
        pointsToNote: [
          'Rapid log switches trigger frequent database checkpoints and DBWR write storms.',
          'Check for "checkpoint not complete" or "log file switch (checkpoint incomplete)" waits in alert.log.',
          'Excessive redo is generated by unindexed bulk updates, mass deletes, or missing NOLOGGING on staging tables.'
        ],
        diagnosticQuery: `-- Hourly redo log switch frequency over past 24 hours
SELECT TO_CHAR(first_time, 'YYYY-MM-DD HH24') AS log_hour,
       COUNT(*) AS switches
FROM v$log_history
WHERE first_time > SYSDATE - 1
GROUP BY TO_CHAR(first_time, 'YYYY-MM-DD HH24')
ORDER BY 1 DESC;`,
        verificationAction: 'Resize Online Redo Log files to larger sizes (e.g. 8GB - 16GB). Add standby redo logs if Data Guard is enabled.',
        status: 'unverified'
      },
      {
        id: 'chk-4-3',
        phaseId: 'phase-4',
        title: 'Buffer Cache Hit Ratio Context & Pitfalls',
        awrSection: 'Instance Efficiency Percentages',
        metricName: 'Buffer Hit %',
        formula: '1 - (physical reads cache / session logical reads)',
        normalThreshold: 'Informational only (> 90% typical for OLTP)',
        warningThreshold: '< 80% with high physical read wait times',
        criticalThreshold: 'Misinterpreted as health indicator (Warning: A 99% hit ratio can still hide catastrophic CPU waste!)',
        pointsToNote: [
          'CRITICAL DBA RULE: A high Buffer Cache Hit Ratio (99%+) is NOT proof of good performance!',
          'A catastrophic Cartesian join scanning billions of cached blocks yields 99.9% hit ratio while incinerating CPU.',
          'Never rely solely on Buffer Hit % to diagnose database health.'
        ],
        diagnosticQuery: `-- Current Buffer Cache Hit Ratio calculation
SELECT 
    ROUND((1 - (phy.value / (cur.value + con.value))) * 100, 2) AS buffer_cache_hit_pct
FROM v$sysstat phy, v$sysstat cur, v$sysstat con
WHERE phy.name = 'physical reads cache'
  AND cur.name = 'db block gets'
  AND con.name = 'consistent gets';`,
        verificationAction: 'Cross-examine Buffer Cache Advisory in Phase 5 rather than optimizing purely for Buffer Hit %.',
        status: 'unverified'
      }
    ]
  },
  {
    id: 'phase-5',
    number: '05',
    title: 'Memory Advisory & Sizing Tuning Rules',
    shortDesc: 'Evaluate Buffer Cache Advisory, PGA Target Advisory, Shared Pool Advisory, and Linux HugePages validation.',
    category: 'memory',
    items: [
      {
        id: 'chk-5-1',
        phaseId: 'phase-5',
        title: 'Buffer Cache Advisory Inflection Point',
        awrSection: 'Advisory Statistics -> Buffer Pool Advisory',
        metricName: 'Physical Read Factor vs Size Multiplier',
        formula: 'ESTD_PHYSICAL_READ_FACTOR at 1.0 vs 1.5 vs 2.0 size',
        normalThreshold: 'Current size (1.0 factor) sits on the flat plateau of the curve',
        warningThreshold: 'Increasing buffer cache by 20% would reduce physical reads by > 30%',
        criticalThreshold: 'Current size sits on steep slope where small shrinkage doubles physical reads',
        pointsToNote: [
          'If doubling buffer cache only reduces physical reads by 2%, do NOT allocate more RAM to buffer cache.',
          'Diminishing returns rule: Look for the knee/inflection point where physical reads curve flattens.',
          'Ensure memory is not taken away from PGA if the workload is hash/sort intensive.'
        ],
        diagnosticQuery: `-- Inspect Buffer Pool Advisory curve
SELECT size_for_estimate, size_factor, 
       estd_physical_reads, estd_physical_read_factor
FROM v$db_cache_advice
ORDER BY size_factor;`,
        verificationAction: 'Adjust DB_CACHE_SIZE or SGA_TARGET up to the inflection point. If curve is flat, avoid allocating more memory.',
        status: 'unverified'
      },
      {
        id: 'chk-5-2',
        phaseId: 'phase-5',
        title: 'PGA Aggregate Target & Cache Hit Ratio',
        awrSection: 'Advisory Statistics -> PGA Memory Advisory',
        metricName: 'PGA Cache Hit % & ESTD Extra MB Read/Written',
        formula: 'Optimal Executions % / (Optimal + One-Pass + Multi-Pass)',
        normalThreshold: 'PGA Cache Hit % >= 95%, 100% Optimal Executions',
        warningThreshold: 'PGA Cache Hit % between 80% and 92% (One-Pass workarea executions occurring)',
        criticalThreshold: 'PGA Cache Hit % < 75% OR Multi-Pass Executions > 0 (Severe temporary tablespace disk thrashing!)',
        pointsToNote: [
          'Multi-pass executions mean workareas (hash joins / order by sorts) cannot fit into PGA RAM and spill repeatedly to TEMP.',
          'Direct path write temp and direct path read temp wait events are the classic signature of starved PGA.',
          'PGA Target Advisory shows exact estimated extra MBs read/written to TEMP for each hypothetical PGA size.'
        ],
        diagnosticQuery: `-- Query current PGA workarea execution profile
SELECT name, value, ROUND(value * 100 / SUM(value) OVER (), 2) AS pct
FROM v$sysstat
WHERE name IN ('workarea executions optimal', 'workarea executions onepass', 'workarea executions multipass');`,
        verificationAction: 'Increase PGA_AGGREGATE_TARGET to the point where Multi-Pass executions drop to zero. In 12c+, set PGA_AGGREGATE_LIMIT to prevent OOM.',
        status: 'unverified'
      },
      {
        id: 'chk-5-3',
        phaseId: 'phase-5',
        title: 'Shared Pool Advisory & Library Cache Reloads',
        awrSection: 'Advisory Statistics -> Shared Pool Advisory',
        metricName: 'ESTD_LC_TIME_SAVED_FACTOR & Reloads',
        formula: 'Library cache gethit ratio and reload ratio',
        normalThreshold: 'Reload ratio < 1%, current size factor = 1.0 is stable',
        warningThreshold: 'Reload ratio 1% - 3%, memory sizing on steep gain curve',
        criticalThreshold: 'Frequent ORA-04031 errors or reload ratio > 5% (Severe shared pool fragmentation)',
        pointsToNote: [
          'Making Shared Pool too large (> 32GB) can actually degrade performance due to long mutex spin loops traversing massive hash buckets.',
          'Shared pool sizing is best solved by eliminating dynamic un-bound SQL rather than endlessly growing the pool.',
          'Reserve 10% - 15% for SHARED_POOL_RESERVED_SIZE.'
        ],
        diagnosticQuery: `-- Check Library Cache gethit and reload ratios
SELECT namespace, gets, gethitratio, reloads, 
       ROUND(reloads / NULLIF(pins, 0) * 100, 3) AS reload_pct
FROM v$librarycache
ORDER BY gets DESC;`,
        verificationAction: 'Identify memory hogs in v$sqlarea. Pin frequently executed packages with DBMS_SHARED_POOL.KEEP.',
        status: 'unverified'
      },
      {
        id: 'chk-5-4',
        phaseId: 'phase-5',
        title: 'Linux HugePages (HugeTLB) vs AMM Compatibility',
        awrSection: 'Operating System Statistics / Parameters',
        metricName: 'USE_LARGE_PAGES setting & AMM disabled',
        formula: 'Linux /proc/meminfo HugePages_Total vs SGA_TARGET',
        normalThreshold: 'USE_LARGE_PAGES = ONLY/TRUE, Automatic Memory Management (MEMORY_TARGET) = 0',
        warningThreshold: 'USE_LARGE_PAGES = TRUE but partial regular page fallback',
        criticalThreshold: 'MEMORY_TARGET > 0 on Linux (> 16GB RAM) -> Automatic Memory Management incompatible with HugePages!',
        pointsToNote: [
          'Automatic Memory Management (MEMORY_TARGET / MEMORY_MAX_TARGET) uses /dev/shm which CANNOT use HugePages.',
          'Without HugePages, a 128GB SGA requires millions of 4KB page table entries, consuming 10GB-30GB of RAM just for OS page tables!',
          'Always use Automatic Shared Memory Management (ASMM: SGA_TARGET + PGA_AGGREGATE_TARGET) with Linux HugePages.'
        ],
        diagnosticQuery: `-- Check Large Pages parameter in Oracle
SELECT name, value 
FROM v$parameter 
WHERE name IN ('use_large_pages', 'memory_target', 'sga_target', 'pga_aggregate_target');`,
        verificationAction: 'Set MEMORY_TARGET=0, configure OS nr_hugepages in /etc/sysctl.conf, set USE_LARGE_PAGES=ONLY in SPFILE, restart instance.',
        status: 'unverified'
      }
    ]
  },
  {
    id: 'phase-6',
    number: '06',
    title: 'RAC & Interconnect Cluster Latency (RAC Only)',
    shortDesc: 'Verify Global Cache block transfer times, private interconnect bandwidth, and cross-instance LMS contention.',
    category: 'rac',
    items: [
      {
        id: 'chk-6-1',
        phaseId: 'phase-6',
        title: 'Global Cache (GC) Block Receive Latency',
        awrSection: 'Global Cache Load Profile / RAC Summary',
        metricName: 'gc cr block 2-way / gc current block 2-way (ms)',
        formula: 'Average wait time for inter-node block transfer',
        normalThreshold: 'Avg wait < 1.0ms - 1.5ms across private Infiniband/10GbE+ interconnect',
        warningThreshold: 'Avg wait between 2.0ms and 5.0ms',
        criticalThreshold: 'Avg wait > 6.0ms OR gc wait events dominate > 20% of total DB Time',
        pointsToNote: [
          'Interconnect latency > 2ms indicates packet drops, MTU mismatch (Jumbo frames 9000 MTU misconfigured), or switch saturation.',
          'Compare gc cr block 2-way vs gc cr block 3-way. 3-way requests require talking to master node then holder node.',
          'High current block transfers indicate table/index block pinging (inter-instance update contention).'
        ],
        diagnosticQuery: `-- RAC Global Cache wait event latencies
SELECT inst_id, event, total_waits,
       ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) AS avg_wait_ms
FROM gv$system_event
WHERE event LIKE 'gc%block%'
ORDER BY time_waited_micro DESC;`,
        verificationAction: 'Verify 9000 MTU end-to-end with ping -s 8972. Partition workload by application service using DBMS_SERVICE to minimize cross-instance pinging.',
        status: 'unverified'
      },
      {
        id: 'chk-6-2',
        phaseId: 'phase-6',
        title: 'Interconnect Lost Blocks & LMS Process Health',
        awrSection: 'Global Cache Transfer Stats',
        metricName: 'gc cr/current blocks lost',
        formula: 'Blocks lost during interconnect transport',
        normalThreshold: '0 blocks lost (Zero tolerance on healthy private interconnect)',
        warningThreshold: 'Transient lost blocks during network failover test',
        criticalThreshold: 'Continuous lost blocks > 0 (Network hardware / UDP buffer drop disaster)',
        pointsToNote: [
          'Lost blocks force Oracle to retry and eventually wait for timeouts, spiking application latency.',
          'Check OS UDP socket buffer sizes: net.core.rmem_default, net.core.rmem_max.',
          'Ensure LMS background processes have elevated realtime priority (RT scheduling).'
        ],
        diagnosticQuery: `-- Check for lost blocks in RAC interconnect
SELECT inst_id, name, value 
FROM gv$sysstat 
WHERE name IN ('gc blocks lost', 'gc cr blocks lost', 'gc current blocks lost');`,
        verificationAction: 'Increase OS network buffer limits. Inspect switch port error counters (CRC errors, packet drops).',
        status: 'unverified'
      }
    ]
  },
  {
    id: 'phase-7',
    number: '07',
    title: 'Redo Log Subsystem & Datafile I/O Profile',
    shortDesc: 'Audit I/O response times per tablespace, async I/O status, and write bottlenecks on redo logs.',
    category: 'io',
    items: [
      {
        id: 'chk-7-1',
        phaseId: 'phase-7',
        title: 'Tablespace & Datafile Read/Write Latency Distribution',
        awrSection: 'Tablespace IO Stats / Datafile IO Stats',
        metricName: 'Av Rd(ms) and Av Wr(ms) per Datafile',
        formula: 'Read Time (ms) / Total Reads per datafile',
        normalThreshold: 'Average read < 5ms across all active tablespaces',
        warningThreshold: 'Average read between 8ms and 15ms on specific tablespaces',
        criticalThreshold: 'Average read > 20ms on primary DATA or UNDO tablespace (I/O bottleneck localized)',
        pointsToNote: [
          'AWR Datafile I/O section identifies exactly which tablespaces and physical datafiles suffer from storage lag.',
          'High write latency on UNDO tablespace indicates intense rollback generation during concurrent DML.',
          'High read/write latency on TEMP datafiles indicates massive sorting/hash join spills.'
        ],
        diagnosticQuery: `-- Check physical I/O latency by tablespace
SELECT 
    tsname, 
    phyrds, 
    ROUND(readtim / NULLIF(phyrds, 0) * 10, 2) AS avg_read_ms,
    phywrts,
    ROUND(writetim / NULLIF(phywrts, 0) * 10, 2) AS avg_write_ms
FROM v$tablespace ts
JOIN v$filestat fs ON ts.ts# = fs.ts#
ORDER BY avg_read_ms DESC;`,
        verificationAction: 'Redistribute hot datafiles across independent storage LUNs. Enable Oracle Asynchronous I/O (filesystemio_options=SETALL).',
        status: 'unverified'
      },
      {
        id: 'chk-7-2',
        phaseId: 'phase-7',
        title: 'Asynchronous I/O (AIO) Kernel Status',
        awrSection: 'Operating System Statistics / Parameters',
        metricName: 'FILESYSTEMIO_OPTIONS & DISK_ASYNCH_IO',
        formula: 'Verifying async direct I/O enablement',
        normalThreshold: 'FILESYSTEMIO_OPTIONS = SETALL (or ASYNC/DIRECTIO), DISK_ASYNCH_IO = TRUE',
        warningThreshold: 'FILESYSTEMIO_OPTIONS = ASYNC without direct I/O',
        criticalThreshold: 'FILESYSTEMIO_OPTIONS = NONE on file system storage (Synchronous I/O stalling DBWR/LGWR)',
        pointsToNote: [
          'Without SETALL on Linux ext4/xfs, Oracle processes block on synchronous writes and double-buffer in OS page cache.',
          'ASM uses direct asynchronous I/O natively.',
          'Direct I/O bypasses OS page cache and eliminates double-caching of database blocks.'
        ],
        diagnosticQuery: `-- Check Asynchronous I/O parameter settings
SELECT name, value 
FROM v$parameter 
WHERE name IN ('filesystemio_options', 'disk_asynch_io');`,
        verificationAction: 'ALTER SYSTEM SET filesystemio_options = SETALL SCOPE=SPFILE; Restart instance to enable kernel asynchronous direct I/O.',
        status: 'unverified'
      },
      {
        id: 'chk-7-3',
        phaseId: 'phase-7',
        title: 'Segment & Object Hotspot Activity (Tables/Indexes/Partitions)',
        awrSection: 'Segment Statistics (Logical Reads, Physical Reads, Row Lock, Buffer Busy)',
        metricName: 'Top Segments by Logical Reads, Physical Reads, Buffer Busy, Row Lock Waits',
        formula: 'Segment Value / Total System Activity * 100',
        normalThreshold: 'Even distribution across many tables/indexes; no single segment > 20% of system I/O or lock waits',
        warningThreshold: 'Top 3 segments absorb 30% - 50% of all logical reads or physical reads',
        criticalThreshold: 'Single table or index absorbs > 50% of system I/O or dominates buffer busy waits / ITL lock contention',
        pointsToNote: [
          'Review: Top segments by logical reads, physical reads, row lock waits, buffer busy waits, and ITL waits.',
          'Right-hand index leaf block hotspots occur when monotonic sequences increment without sufficient CACHE size.',
          'Small lookup tables accessed via nested loops create intense cache buffers chains and buffer busy waits.'
        ],
        diagnosticQuery: `-- Top segments by physical and logical reads
SELECT owner, object_name, subobject_name, object_type, statistic_name, value
FROM v$segment_statistics
WHERE statistic_name IN ('logical reads', 'physical reads', 'buffer busy waits', 'row lock waits')
ORDER BY value DESC
FETCH FIRST 10 ROWS ONLY;`,
        verificationAction: 'For hot index leaf blocks: increase sequence CACHE to 10,000 NOORDER, or hash-partition the index. For hot tables: add ASSM, increase INITRANS, or partition by range/hash.',
        status: 'unverified'
      }
    ]
  }
];
