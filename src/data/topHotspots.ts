import { HotspotItem } from '../types/awr';

export const initialTopHotspots: HotspotItem[] = [
  {
    rank: 1,
    id: 'hs-sql-1',
    category: 'SQL',
    name: 'SQL_ID: 8b9f31a7x2d9',
    metricDimension: 'Elapsed Time: 1,840.5s (64.5% of Total DB Time)',
    severity: 'critical',
    impactPct: 64.5,
    rootCause: 'Single SQL statement dominates foreground database time. Execution plan hash changed between snapshots from 1204918234 to 4829104812 with a 42x elapsed time degradation.',
    evidenceSummary: 'Recorded in AWR "SQL ordered by Elapsed Time". 5,400 executions consumed 1,840.5s of DB Time (avg 340.8ms/exec). Buffer gets averaged 1,240,000 per execution.',
    awrSourceSection: 'SQL Statistics -> SQL ordered by Elapsed Time',
    thresholdBreached: 'Single SQL_ID accounts for > 40% of Total DB Time (Observed: 64.5%)',
    perExecutionCost: {
      elapsedPerExecMs: '340.8 ms',
      cpuPerExecMs: '312.4 ms',
      getsPerExec: '1,240,000',
      readsPerExec: '1,420'
    },
    sqlText: `SELECT oi.order_id, oi.product_id, SUM(oi.quantity * oi.unit_price) AS line_total, AVG(p.standard_cost) AS avg_cost
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_status = :b1
  AND o.order_date >= TRUNC(SYSDATE - 30)
GROUP BY oi.order_id, oi.product_id
HAVING SUM(oi.quantity * oi.unit_price) > 5000
ORDER BY line_total DESC;`,
    isCompleteSqlText: true,
    completeSqlSectionFound: true,
    planHashValue: '4829104812 (Historical: 1204918234)',
    diagnosticSql: `-- Inspect historical plan statistics and compare execution plans
SELECT snap_id, plan_hash_value, executions_delta,
       ROUND(elapsed_time_delta / NULLIF(executions_delta, 0) / 1000, 2) AS avg_et_ms,
       ROUND(buffer_gets_delta / NULLIF(executions_delta, 0)) AS avg_gets
FROM dba_hist_sqlstat
WHERE sql_id = '8b9f31a7x2d9'
ORDER BY snap_id DESC;`,
    notifiedAt: 'Detected from SQL Statistics',
    isAcknowledged: false
  },
  {
    rank: 2,
    id: 'hs-wait-1',
    category: 'Wait Event',
    name: 'Wait Event: db file sequential read',
    metricDimension: 'Time Waited: 1,420s (49.8% DB Time) | Avg Latency: 18.2ms',
    severity: 'critical',
    impactPct: 49.8,
    rootCause: 'Single-block physical I/O average latency is 18.2ms across 78,400 waits, substantially exceeding storage SLAs for flash/tier-1 storage.',
    evidenceSummary: 'Recorded in "Top 10 Foreground Events". AWR Datafile IO section attributes 58% of read time to datafile TBS_DATA_03.dbf with 24.1ms average read latency.',
    awrSourceSection: 'Top 10 Foreground Events by Total Wait Time',
    thresholdBreached: 'Single-block read latency > 10ms (Observed: 18.2ms)',
    diagnosticSql: `-- Check tablespace and datafile physical I/O response times
SELECT tsname, phyrds, ROUND(readtim / NULLIF(phyrds, 0) * 10, 2) AS avg_read_ms,
       phywrts, ROUND(writetim / NULLIF(phywrts, 0) * 10, 2) AS avg_write_ms
FROM v$tablespace ts JOIN v$filestat fs ON ts.ts# = fs.ts#
ORDER BY avg_read_ms DESC;`,
    notifiedAt: 'Detected from Top Foreground Events',
    isAcknowledged: false
  },
  {
    rank: 3,
    id: 'hs-wait-2',
    category: 'Wait Event',
    name: 'Wait Event: cursor: pin S wait on X',
    metricDimension: 'Time Waited: 890s (31.2% DB Time) | Mutex Waits: 54,200',
    severity: 'critical',
    impactPct: 31.2,
    rootCause: 'Sessions are competing for exclusive library cache cursor pin mutexes during concurrent cursor compilation and invalidation.',
    evidenceSummary: 'Recorded in "Top 10 Foreground Events". Load Profile reveals Hard Parse % at 78.4% with 1,750 parse calls per second.',
    awrSourceSection: 'Top 10 Foreground Events by Total Wait Time',
    thresholdBreached: 'Mutex wait accounts for > 5% of DB Time (Observed: 31.2%)',
    diagnosticSql: `-- Identify SQL statements incurring cursor pin mutex waits
SELECT sql_id, count(*) AS mutex_waits
FROM v$active_session_history
WHERE event = 'cursor: pin S wait on X'
GROUP BY sql_id ORDER BY mutex_waits DESC FETCH FIRST 5 ROWS ONLY;`,
    notifiedAt: 'Detected from Top Foreground Events',
    isAcknowledged: false
  },
  {
    rank: 4,
    id: 'hs-sql-2',
    category: 'SQL',
    name: 'SQL_ID: 3ka901mc77d1',
    metricDimension: 'Buffer Gets: 42,500,000 | DB CPU: 720.0s (25.3% DB Time)',
    severity: 'critical',
    impactPct: 25.3,
    rootCause: 'High logical read consumer. 48,000 executions generated 42.5M buffer gets and 720 seconds of DB CPU time.',
    evidenceSummary: 'Recorded in AWR "SQL ordered by Gets" and "SQL ordered by CPU Time". Average buffer gets per execution is 885 gets/exec.',
    awrSourceSection: 'SQL Statistics -> SQL ordered by Gets',
    thresholdBreached: 'Buffer Gets > 20M and DB CPU > 20% of Total DB Time',
    perExecutionCost: {
      elapsedPerExecMs: '12.9 ms',
      cpuPerExecMs: '15.0 ms',
      getsPerExec: '885',
      readsPerExec: '5'
    },
    sqlText: `SELECT c.customer_name, a.city, a.postal_code FROM customers c JOIN customer_addresses a ON c.customer_id = a.customer_id WHERE c.customer_type = :1;`,
    planHashValue: '1948201948',
    diagnosticSql: `-- View actual runtime execution statistics for this cursor
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('3ka901mc77d1', NULL, 'ALLSTATS LAST +PEEKED_BINDS'));`,
    notifiedAt: 'Detected from SQL ordered by Gets',
    isAcknowledged: false
  },
  {
    rank: 5,
    id: 'hs-host-1',
    category: 'Host & I/O',
    name: 'Host CPU & Workload AAS Saturation',
    metricDimension: 'AAS = 42.0 on 16 Cores (262% Core Capacity)',
    severity: 'critical',
    impactPct: 100.0,
    rootCause: 'Average Active Sessions (AAS = 42.0) exceeds physical CPU cores (16 cores). OS run queue length exceeds CPU count.',
    evidenceSummary: 'Report Header shows DB Time = 2,520 mins across 60.0 mins elapsed time. Operating System Statistics indicates Host %WIO = 58% and %User = 22%.',
    awrSourceSection: 'Report Summary -> Header & Operating System Statistics',
    thresholdBreached: 'AAS > Physical CPU Cores (Observed: 42.0 > 16.0)',
    diagnosticSql: `-- Inspect active foreground sessions and OS run queue load
SELECT (SELECT value FROM v$osstat WHERE stat_name = 'LOAD') AS os_load,
       (SELECT value FROM v$osstat WHERE stat_name = 'NUM_CPU_CORES') AS cores,
       COUNT(*) AS active_sessions
FROM v$session WHERE status = 'ACTIVE' AND type != 'BACKGROUND';`,
    notifiedAt: 'Calculated from AWR Header',
    isAcknowledged: false
  },
  {
    rank: 6,
    id: 'hs-wait-3',
    category: 'Wait Event',
    name: 'Wait Event: log file sync',
    metricDimension: 'Time Waited: 580s (20.3% DB Time) | Avg Latency: 16.5ms',
    severity: 'critical',
    impactPct: 20.3,
    rootCause: 'Commit latency is elevated. Foreground processes spent 580 seconds waiting for LGWR redo buffer flush.',
    evidenceSummary: 'Recorded in "Top 10 Foreground Events". Background event "log file parallel write" latency is 14.8ms with 34,000 writes.',
    awrSourceSection: 'Top 10 Foreground Events by Total Wait Time',
    thresholdBreached: 'log file sync latency > 10ms (Observed: 16.5ms)',
    diagnosticSql: `-- Compare foreground log file sync vs background log file parallel write
SELECT event, total_waits, ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) AS avg_ms
FROM v$system_event WHERE event IN ('log file sync', 'log file parallel write');`,
    notifiedAt: 'Detected from Top Foreground Events',
    isAcknowledged: false
  },
  {
    rank: 7,
    id: 'hs-host-2',
    category: 'Host & I/O',
    name: 'Storage Wait on I/O (%WIO = 58%)',
    metricDimension: 'Host %WIO: 58% | %User: 22% | %Sys: 8%',
    severity: 'critical',
    impactPct: 58.0,
    rootCause: 'Host CPU threads were suspended waiting on storage array responses for 58% of the snapshot window.',
    evidenceSummary: 'Operating System Statistics records %WIO at 58%. Corresponds with elevated single-block and multi-block read latencies.',
    awrSourceSection: 'Operating System Statistics',
    thresholdBreached: 'Host %WIO > 10% (Observed: 58%)',
    diagnosticSql: `-- Query OS wait statistics
SELECT stat_name, value FROM v$osstat WHERE stat_name IN ('BUSY_TIME', 'IDLE_TIME', 'USER_TIME', 'SYS_TIME', 'IOWAIT_TIME');`,
    notifiedAt: 'Detected from OS Statistics',
    isAcknowledged: false
  },
  {
    rank: 8,
    id: 'hs-sql-3',
    category: 'SQL',
    name: 'SQL_ID: 1v8k92ma01bf',
    metricDimension: 'Executions: 2,400,000 (666 execs/sec) | Total ET: 480.0s',
    severity: 'warning',
    impactPct: 16.8,
    rootCause: 'Extreme execution frequency. Statement ran 2.4 million times during the 60-minute window, consuming 480 seconds of elapsed time.',
    evidenceSummary: 'Recorded in "SQL ordered by Executions". Average elapsed time per execution is 0.20ms with 4 gets/exec.',
    awrSourceSection: 'SQL Statistics -> SQL ordered by Executions',
    thresholdBreached: 'Executions > 500,000 in snapshot window (Observed: 2,400,000)',
    perExecutionCost: {
      elapsedPerExecMs: '0.20 ms',
      cpuPerExecMs: '0.18 ms',
      getsPerExec: '4',
      readsPerExec: '0'
    },
    sqlText: `SELECT product_id, sku, product_name, price FROM products WHERE product_id = :1;`,
    planHashValue: '3419502841',
    diagnosticSql: `-- Check user calls and execution counts
SELECT sql_id, executions, parse_calls, elapsed_time/1000000 AS et_sec FROM v$sql WHERE sql_id = '1v8k92ma01bf';`,
    notifiedAt: 'Detected from SQL ordered by Executions',
    isAcknowledged: false
  },
  {
    rank: 9,
    id: 'hs-wait-4',
    category: 'Wait Event',
    name: 'Wait Event: direct path write temp',
    metricDimension: 'Time Waited: 490s (17.2% DB Time) | Spilled: 42 GB',
    severity: 'warning',
    impactPct: 17.2,
    rootCause: 'Workarea memory spills to temporary tablespace during sort or hash join operations.',
    evidenceSummary: 'Recorded in "Top 10 Foreground Events". Load Profile and Advisory Statistics show PGA Cache Hit % below target.',
    awrSourceSection: 'Top 10 Foreground Events by Total Wait Time',
    thresholdBreached: 'TEMP wait event accounts for > 10% of DB Time (Observed: 17.2%)',
    diagnosticSql: `-- Check sessions currently utilizing temporary tablespace
SELECT s.sid, s.serial#, s.username, s.sql_id, u.tablespace, ROUND((u.blocks * 8192)/1024/1024, 2) AS temp_mb
FROM v$session s JOIN v$sort_usage u ON s.saddr = u.session_addr ORDER BY temp_mb DESC;`,
    notifiedAt: 'Detected from Top Foreground Events',
    isAcknowledged: false
  },
  {
    rank: 10,
    id: 'hs-sql-4',
    category: 'SQL',
    name: 'SQL_ID: 99ab4c102fea',
    metricDimension: 'Buffer Gets: 38,000,000 | Elapsed Time: 410.0s',
    severity: 'warning',
    impactPct: 14.3,
    rootCause: 'High logical I/O volume. 1,200 executions accumulated 38 million buffer gets (avg 31,666 gets/exec).',
    evidenceSummary: 'Recorded in "SQL ordered by Gets" and "SQL ordered by Elapsed Time". Projecting 1.8M rows.',
    awrSourceSection: 'SQL Statistics -> SQL ordered by Gets',
    thresholdBreached: 'Buffer Gets per execution > 20,000 (Observed: 31,666)',
    perExecutionCost: {
      elapsedPerExecMs: '341.6 ms',
      cpuPerExecMs: '325.0 ms',
      getsPerExec: '31,666',
      readsPerExec: '150'
    },
    sqlText: `SELECT p.promo_code, l.loyalty_tier, SUM(s.sale_amount) FROM promotions p, customer_loyalty l, sales s WHERE s.promo_id = p.promo_id GROUP BY p.promo_code, l.loyalty_tier;`,
    planHashValue: '772849103',
    diagnosticSql: `-- Display execution plan operations
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('99ab4c102fea', NULL, 'TYPICAL'));`,
    notifiedAt: 'Detected from SQL ordered by Gets',
    isAcknowledged: false
  },
  {
    rank: 11,
    id: 'hs-parse-1',
    category: 'Lock & Concurrency',
    name: 'Hard Parse Ratio Anomaly',
    metricDimension: 'Hard Parse %: 78.4% (Soft Parse %: 21.6%)',
    severity: 'critical',
    impactPct: 78.4,
    rootCause: '78.4% of all parse operations resulted in hard parses. 180,000 unique cursors generated in shared pool.',
    evidenceSummary: 'Recorded in "Instance Efficiency Percentages" and "Load Profile". Hard parse count = 1,372 / sec.',
    awrSourceSection: 'Instance Efficiency Percentages / Load Profile',
    thresholdBreached: 'Soft Parse % < 95% (Observed: 21.6%)',
    diagnosticSql: `-- Check single-execution SQL statements in shared pool
SELECT substr(sql_text, 1, 60), count(*) FROM v$sqlarea WHERE executions = 1 GROUP BY substr(sql_text, 1, 60) HAVING count(*) > 50 ORDER BY count(*) DESC;`,
    notifiedAt: 'Calculated from Load Profile',
    isAcknowledged: false
  },
  {
    rank: 12,
    id: 'hs-sql-5',
    category: 'SQL',
    name: 'SQL_ID: 7a8c901bf33d',
    metricDimension: 'Disk Reads: 8,400,000 (34.2% of All System Reads)',
    severity: 'warning',
    impactPct: 12.6,
    rootCause: 'Physical read heavyweight. 850 executions performed 8.4 million disk reads (avg 9,882 physical reads per exec).',
    evidenceSummary: 'Recorded in "SQL ordered by Reads". Accounts for 34.2% of total physical disk block reads in the snapshot.',
    awrSourceSection: 'SQL Statistics -> SQL ordered by Reads',
    thresholdBreached: 'Physical reads per execution > 1,000 (Observed: 9,882)',
    perExecutionCost: {
      elapsedPerExecMs: '423.5 ms',
      cpuPerExecMs: '141.1 ms',
      getsPerExec: '21,764',
      readsPerExec: '9,882'
    },
    sqlText: `SELECT user_id, first_name, last_name, status FROM users WHERE UPPER(email_address) = UPPER(:b1);`,
    planHashValue: '5928104812',
    diagnosticSql: `-- Display execution plan
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('7a8c901bf33d', NULL, 'TYPICAL'));`,
    notifiedAt: 'Detected from SQL ordered by Reads',
    isAcknowledged: false
  },
  {
    rank: 13,
    id: 'hs-wait-5',
    category: 'Wait Event',
    name: 'Wait Event: db file scattered read',
    metricDimension: 'Time Waited: 380s (13.3% DB Time) | Avg Latency: 9.4ms',
    severity: 'warning',
    impactPct: 13.3,
    rootCause: 'Multi-block physical I/O from full table scans and index fast full scans accounted for 13.3% of database time.',
    evidenceSummary: 'Recorded in "Top 10 Foreground Events". 40,400 waits totaling 380 seconds.',
    awrSourceSection: 'Top 10 Foreground Events by Total Wait Time',
    thresholdBreached: 'Multi-block read accounts for > 10% of DB Time',
    diagnosticSql: `-- Find objects incurring multi-block read waits
SELECT current_obj#, count(*) FROM v$active_session_history WHERE event = 'db file scattered read' GROUP BY current_obj# ORDER BY count(*) DESC FETCH FIRST 5 ROWS ONLY;`,
    notifiedAt: 'Detected from Top Foreground Events',
    isAcknowledged: false
  },
  {
    rank: 14,
    id: 'hs-lock-1',
    category: 'Lock & Concurrency',
    name: 'Wait Event: enq: TX - row lock contention',
    metricDimension: 'Time Waited: 340s (11.9% DB Time) | Blocked Sessions: 24',
    severity: 'warning',
    impactPct: 11.9,
    rootCause: 'Transactional row lock serialization. Sessions queued waiting for another transaction to commit or rollback.',
    evidenceSummary: 'Recorded in "Top 10 Foreground Events" and "Enqueue Activity".',
    awrSourceSection: 'Top 10 Foreground Events / Enqueue Activity',
    thresholdBreached: 'Transaction lock contention > 5% of DB Time (Observed: 11.9%)',
    diagnosticSql: `-- Check current blocking sessions
SELECT sid, blocking_session, seconds_in_wait, event FROM v$session WHERE blocking_session IS NOT NULL;`,
    notifiedAt: 'Detected from Enqueue Activity',
    isAcknowledged: false
  },
  {
    rank: 15,
    id: 'hs-obj-1',
    category: 'Segment/Object',
    name: 'Segment: ORDERS_PK (Leaf Block Contention)',
    metricDimension: 'Buffer Busy Waits: 18,400 | Logical Reads: 18.2M',
    severity: 'warning',
    impactPct: 11.5,
    rootCause: 'Top segment in AWR Segment Statistics by Buffer Busy Waits.',
    evidenceSummary: 'Recorded in "Segments by Buffer Busy Waits". Concentrated on primary key index segment.',
    awrSourceSection: 'Segment Statistics -> Segments by Buffer Busy Waits',
    thresholdBreached: 'Single index segment accounts for > 40% of all buffer busy waits',
    diagnosticSql: `-- Check segment wait statistics
SELECT object_name, object_type, statistic_name, value FROM v$segment_statistics WHERE object_name = 'ORDERS_PK';`,
    notifiedAt: 'Detected from Segment Statistics',
    isAcknowledged: false
  },
  {
    rank: 16,
    id: 'hs-mem-1',
    category: 'Segment/Object',
    name: 'PGA Cache Hit Ratio Degradation',
    metricDimension: 'PGA Cache Hit %: 64.2% (Normal >= 95%)',
    severity: 'warning',
    impactPct: 35.8,
    rootCause: 'PGA memory allocation insufficient for active workarea operations.',
    evidenceSummary: 'Recorded in "Advisory Statistics -> PGA Memory Advisory". Multi-pass workarea executions recorded.',
    awrSourceSection: 'Advisory Statistics -> PGA Memory Advisory',
    thresholdBreached: 'PGA Cache Hit % < 80% (Observed: 64.2%)',
    diagnosticSql: `-- Query PGA target advice
SELECT pga_target_factor, estd_pga_cache_hit_percentage, estd_extra_bytes_rw FROM v$pga_target_advice;`,
    notifiedAt: 'Detected from PGA Advisory',
    isAcknowledged: false
  },
  {
    rank: 17,
    id: 'hs-wait-6',
    category: 'Wait Event',
    name: 'Wait Event: latch: cache buffers chains',
    metricDimension: 'Time Waited: 310s (10.8% DB Time) | Sleeps: 82,000',
    severity: 'warning',
    impactPct: 10.8,
    rootCause: 'Buffer cache hash chain contention. Sessions competing for shared access to buffer headers.',
    evidenceSummary: 'Recorded in "Top 10 Foreground Events" and "Latch Activity". Corresponds with high logical read statements.',
    awrSourceSection: 'Top 10 Foreground Events by Total Wait Time',
    thresholdBreached: 'CBC latch wait > 5% of DB Time (Observed: 10.8%)',
    diagnosticSql: `-- Identify hot blocks associated with CBC latch contention
SELECT ash.p1 AS file_id, ash.p2 AS block_id, count(*) AS waits FROM v$active_session_history ash WHERE event = 'latch: cache buffers chains' GROUP BY ash.p1, ash.p2 ORDER BY waits DESC FETCH FIRST 5 ROWS ONLY;`,
    notifiedAt: 'Detected from Top Foreground Events',
    isAcknowledged: false
  },
  {
    rank: 18,
    id: 'hs-obj-2',
    category: 'Segment/Object',
    name: 'Datafile: TBS_DATA_03.dbf Latency Outlier',
    metricDimension: 'Average Read Latency: 24.1ms | Physical Reads: 45,000',
    severity: 'warning',
    impactPct: 9.8,
    rootCause: 'Physical datafile I/O latency outlier.',
    evidenceSummary: 'Recorded in AWR "Datafile IO Statistics". Represents 58% of all single-block read wait time.',
    awrSourceSection: 'Datafile IO Statistics',
    thresholdBreached: 'Datafile read latency > 20ms (Observed: 24.1ms)',
    diagnosticSql: `-- Check datafile latency
SELECT file#, phyrds, ROUND(readtim/NULLIF(phyrds,0)*10, 2) AS avg_ms FROM v$filestat ORDER BY avg_ms DESC;`,
    notifiedAt: 'Detected from Datafile IO Statistics',
    isAcknowledged: false
  },
  {
    rank: 19,
    id: 'hs-sql-6',
    category: 'SQL',
    name: 'SQL_ID: 2c4d98ef0134',
    metricDimension: 'Executions: 850,000 | Elapsed Time: 320.0s',
    severity: 'attention',
    impactPct: 9.5,
    rootCause: 'High execution count statement consuming 320s elapsed time.',
    evidenceSummary: 'Recorded in AWR "SQL ordered by Executions".',
    awrSourceSection: 'SQL Statistics -> SQL ordered by Executions',
    thresholdBreached: 'Executions > 500,000 in snapshot window',
    perExecutionCost: {
      elapsedPerExecMs: '0.37 ms',
      cpuPerExecMs: '0.35 ms',
      getsPerExec: '8',
      readsPerExec: '0'
    },
    planHashValue: '4019284102',
    diagnosticSql: `-- Inspect SQL text and plan
SELECT sql_text FROM v$sql WHERE sql_id = '2c4d98ef0134';`,
    notifiedAt: 'Detected from SQL ordered by Executions',
    isAcknowledged: false
  },
  {
    rank: 20,
    id: 'hs-host-3',
    category: 'Host & I/O',
    name: 'Snapshot Interval Duration Anomaly',
    metricDimension: 'Snapshot Duration: 60.0 mins (Standard Hourly)',
    severity: 'attention',
    impactPct: 8.0,
    rootCause: 'Hourly snapshot interval captures aggregate counters across 60 minutes.',
    evidenceSummary: 'Recorded in AWR Snapshot Information. Check for shorter transient incidents using ASH.',
    awrSourceSection: 'Report Summary -> Snapshot Information',
    thresholdBreached: 'Informational: Confirm whether peak incident was shorter than 60 mins',
    diagnosticSql: `-- Check snapshot intervals
SELECT snap_id, begin_interval_time, end_interval_time FROM dba_hist_snapshot ORDER BY snap_id DESC FETCH FIRST 5 ROWS ONLY;`,
    notifiedAt: 'Verified from Snapshot Header',
    isAcknowledged: false
  }
];
