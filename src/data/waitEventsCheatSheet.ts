import { WaitEventItem } from '../types/awr';

export const waitEventsCheatSheet: WaitEventItem[] = [
  {
    id: 'we-db-file-seq-read',
    name: 'db file sequential read',
    waitClass: 'User I/O',
    normalLatency: '< 4ms (SSD/Flash), < 8ms (Tier-1 SAN)',
    warningThreshold: '8ms - 15ms',
    criticalThreshold: '> 15ms or dominant in Top 5 (> 30% DB Time)',
    commonCauses: [
      'Single-block index lookups or table access by index ROWID.',
      'Unselective indexes with high clustering factor scanning too many blocks.',
      'Cold buffer cache after database restart or buffer cache undersizing.',
      'Slow storage array or SAN controller saturation.'
    ],
    impact: 'Session stalls waiting for storage to fetch individual blocks into the buffer cache.',
    remediation: [
      'Check SQL ordered by Reads: verify if an index with low selectivity is being chosen.',
      'Check Index Clustering Factor (if clustering factor is close to NUM_ROWS, table is disordered).',
      'Add columns to create covering index and eliminate TABLE ACCESS BY INDEX ROWID.',
      'Consider caching small lookup tables or verifying storage I/O response times in AWR Tablespace IO section.'
    ],
    diagnosticSql: `-- Find SQL statements spending most time on db file sequential read
SELECT sql_id, count(*) AS samples,
       ROUND(count(*) * 100 / sum(count(*)) over (), 1) AS pct_activity
FROM v$active_session_history
WHERE event = 'db file sequential read'
  AND sample_time > sysdate - 1/24
GROUP BY sql_id
ORDER BY samples DESC
FETCH FIRST 10 ROWS ONLY;`,
    ashQuery: `-- Check which object (table/index) is experiencing sequential reads
SELECT current_obj#, o.object_name, o.object_type, count(*) AS wait_count
FROM v$active_session_history ash
LEFT JOIN dba_objects o ON ash.current_obj# = o.object_id
WHERE event = 'db file sequential read'
  AND sample_time > sysdate - 1/24
GROUP BY current_obj#, o.object_name, o.object_type
ORDER BY wait_count DESC
FETCH FIRST 10 ROWS ONLY;`
  },
  {
    id: 'we-db-file-scatt-read',
    name: 'db file scattered read',
    waitClass: 'User I/O',
    normalLatency: '< 8ms',
    warningThreshold: '10ms - 20ms',
    criticalThreshold: '> 25ms or > 20% DB Time',
    commonCauses: [
      'Multi-block physical I/O caused by Full Table Scans (FTS) or Index Fast Full Scans (IFFS).',
      'Missing indexes on filtered columns or inappropriate optimizer cost estimates.',
      'Stale optimizer table statistics causing the CBO to underestimate row counts.'
    ],
    impact: 'Massive volume of blocks pulled into buffer cache, flushing out active working sets.',
    remediation: [
      'Check SQL ordered by Reads for large table full scans.',
      'Create selective indexes or composite indexes for frequent WHERE clauses.',
      'Verify DB_FILE_MULTIBLOCK_READ_COUNT parameter is defaulted.',
      'Implement table partitioning for large historical transaction tables to enable partition pruning.'
    ],
    diagnosticSql: `-- Top tables undergoing full table scans in current active workload
SELECT o.owner, o.object_name, count(*) AS fts_sample_count
FROM v$active_session_history ash
JOIN dba_objects o ON ash.current_obj# = o.object_id
WHERE ash.event = 'db file scattered read'
  AND ash.sample_time > sysdate - 1/24
GROUP BY o.owner, o.object_name
ORDER BY fts_sample_count DESC
FETCH FIRST 10 ROWS ONLY;`
  },
  {
    id: 'we-direct-path-read',
    name: 'direct path read',
    waitClass: 'User I/O',
    normalLatency: '< 5ms',
    warningThreshold: '8ms - 15ms',
    criticalThreshold: '> 20ms or dominant wait event',
    commonCauses: [
      'Serial direct path reads for Full Table Scans (Oracle 11g+ default behavior for tables larger than small table threshold).',
      'Parallel query execution slaves reading data blocks directly into session PGA, bypassing SGA.',
      'Exadata Smart Scan reads (in Exadata, high cell smart table scan appears under direct path read).'
    ],
    impact: 'Bypasses buffer cache. If storage cannot deliver high multi-block throughput, sessions wait.',
    remediation: [
      'Check if Full Table Scans are intentional. If not, add missing index.',
      'If running in Parallel Query, verify degree of parallelism (DOP) is not excessive.',
      'On Exadata, verify offloading cell passthru % (ensure offload capability is not disabled by functions).'
    ],
    diagnosticSql: `-- Check SQL statements executing serial direct path reads
SELECT sql_id, count(*) AS direct_reads_samples
FROM v$active_session_history
WHERE event = 'direct path read'
  AND sample_time > sysdate - 1/24
GROUP BY sql_id
ORDER BY direct_reads_samples DESC
FETCH FIRST 10 ROWS ONLY;`
  },
  {
    id: 'we-direct-path-read-temp',
    name: 'direct path read temp / write temp',
    waitClass: 'User I/O',
    normalLatency: '< 5ms',
    warningThreshold: '8ms - 15ms',
    criticalThreshold: '> 20ms or appearing in Top 5 waits',
    commonCauses: [
      'PGA memory exhaustion causing Sorts, Hash Joins, or Group By operations to spill to temporary tablespace.',
      'Undersized PGA_AGGREGATE_TARGET or session workarea limit.',
      'Catastrophic cardinality misestimates multiplying row counts into gigabytes of hash join buffers.'
    ],
    impact: 'Orders of magnitude slower than in-memory PGA sorts; saturates TEMP disk I/O.',
    remediation: [
      'Check PGA Memory Advisory in AWR to verify if PGA_AGGREGATE_TARGET needs enlargement.',
      'Inspect SQL ordered by Elapsed Time with large Sorts/Hash operations.',
      'Tune Cartesian products or bad join orders that artificially amplify row counts into TEMP.'
    ],
    diagnosticSql: `-- Identify queries currently spilling massive amounts to TEMP
SELECT s.sid, s.serial#, s.username, s.sql_id, u.tablespace,
       ROUND((u.blocks * 8192) / 1024 / 1024, 2) AS temp_mb,
       s.program
FROM v$session s
JOIN v$sort_usage u ON s.saddr = u.session_addr
ORDER BY temp_mb DESC;`
  },
  {
    id: 'we-log-file-sync',
    name: 'log file sync',
    waitClass: 'Commit',
    normalLatency: '< 3ms (Flash/NVMe redo), < 8ms (SAN)',
    warningThreshold: '8ms - 15ms',
    criticalThreshold: '> 15ms or > 20% of total DB Time',
    commonCauses: [
      'Frequent commits inside loops (row-by-row commits instead of bulk batching).',
      'Slow disk storage hosting online redo logs (e.g., RAID-5 parity write penalty).',
      'LGWR process CPU starvation or high OS context switching.',
      'Compare with background event "log file parallel write".'
    ],
    impact: 'Blocks client commit operations until redo buffer is physically flushed to disk.',
    remediation: [
      'DIAGNOSTIC RATIO: Compare "log file sync" (foreground) with "log file parallel write" (background LGWR write).',
      'If parallel write is HIGH (> 10ms): Storage issue on redo logs. Move redo logs to dedicated ultra-fast NVMe/SSD with write-back cache.',
      'If parallel write is LOW (< 2ms) but sync is HIGH (> 15ms): LGWR is CPU starved or delayed by OS process wake-up (check NUM_CPU_CORES, run queue, and post-wait overhead).',
      'Application fix: Batch commits (commit every 1,000 - 10,000 rows rather than per row).'
    ],
    diagnosticSql: `-- Compare log file sync vs log file parallel write in AWR
SELECT event, total_waits,
       ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) AS avg_latency_ms
FROM v$system_event
WHERE event IN ('log file sync', 'log file parallel write');`
  },
  {
    id: 'we-enq-tx-row',
    name: 'enq: TX - row lock contention',
    waitClass: 'Application',
    normalLatency: '< 1ms',
    warningThreshold: '> 3% of DB Time',
    criticalThreshold: '> 10% of DB Time (Application deadlock / severe row lock queuing)',
    commonCauses: [
      'Multiple concurrent sessions attempting to UPDATE or DELETE the exact same row (Mode 6 - Exclusive).',
      'Multiple sessions trying to INSERT the same primary/unique key value (Mode 4 - Share).',
      'Insufficient Interested Transaction List (ITL) entries in table/index block (Mode 4).'
    ],
    impact: 'Transactions freeze, waiting for the holding transaction to issue COMMIT or ROLLBACK.',
    remediation: [
      'Query ASH or V$SESSION to locate blocking session (BLOCKING_SESSION column).',
      'Check if long-running reporting queries or batch updates are locking operational rows.',
      'For ITL contention, rebuild the table/index with higher INITRANS (e.g., INITRANS 16 or 32).',
      'Ensure application releases locks promptly (avoid client-side user think-time with open transactions).'
    ],
    diagnosticSql: `-- Find blocking session and blocked session details in real time
SELECT 
    s.sid AS blocked_sid, s.serial# AS blocked_serial, s.username, s.sql_id,
    s.blocking_session, s.blocking_instance, s.seconds_in_wait,
    b.sql_id AS blocker_sql_id, b.program AS blocker_program
FROM v$session s
JOIN v$session b ON s.blocking_session = b.sid
WHERE s.event = 'enq: TX - row lock contention';`,
    ashQuery: `-- Historical blocker analysis from ASH
SELECT blocking_session, count(*) AS blocked_samples,
       min(sample_time) AS first_seen, max(sample_time) AS last_seen
FROM v$active_session_history
WHERE event = 'enq: TX - row lock contention'
GROUP BY blocking_session
ORDER BY blocked_samples DESC;`
  },
  {
    id: 'we-enq-tm-contention',
    name: 'enq: TM - contention',
    waitClass: 'Application',
    normalLatency: '< 1ms',
    warningThreshold: '> 2% of DB Time',
    criticalThreshold: '> 5% of DB Time (Severe table-level locking)',
    commonCauses: [
      'MISSING FOREIGN KEY INDEX: Modifying a parent table acquires a share lock on the child table if the FK column is not indexed!',
      'Direct-path INSERT (APPEND hint) on a table while other sessions are modifying it.',
      'Explicit LOCK TABLE statements issued by application logic.'
    ],
    impact: 'Entire table is locked, preventing concurrent DML from all sessions across the database.',
    remediation: [
      'CRITICAL CHECK: Run the unindexed foreign keys query immediately.',
      'Create B-Tree indexes on all foreign key constraint columns.',
      'Avoid APPEND hints on concurrent OLTP transactions.'
    ],
    diagnosticSql: `-- Find all unindexed foreign key constraints in the schema
SELECT c.table_name, c.constraint_name, cc.column_name
FROM user_constraints c
JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
WHERE c.constraint_type = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM user_ind_columns ic
    WHERE ic.table_name = cc.table_name 
      AND ic.column_name = cc.column_name
      AND ic.column_position = 1
  );`
  },
  {
    id: 'we-latch-cbc',
    name: 'latch: cache buffers chains',
    waitClass: 'Concurrency',
    normalLatency: '< 1ms',
    warningThreshold: '> 2% of DB Time',
    criticalThreshold: '> 5% of DB Time or persistent spin',
    commonCauses: [
      'Buffer cache hot block contention: hundreds of sessions concurrently reading the exact same data or index leaf block.',
      'Inefficient SQL statements repeatedly re-visiting the same buffer headers (extremely high buffer gets per execution).',
      'Small reference tables subjected to intense nested loop lookups.'
    ],
    impact: 'Foreground processes spin on CPU attempting to acquire exclusive latch on hash chain, driving up host %User CPU.',
    remediation: [
      'Identify the hot block: query ASH for P1 (file#) and P2 (block#) when event is latch: cache buffers chains.',
      'Tune the offending SQL to drastically reduce buffer gets per execution.',
      'Hash partition the hot table or index to spread data across multiple blocks.',
      'For sequence-generated primary keys, consider reverse key indexes (with caution on range scans) or hash partitioning.'
    ],
    diagnosticSql: `-- Find the specific hot data block and object causing CBC latch contention
SELECT ash.current_obj#, o.object_name, o.object_type,
       ash.p1 AS file_id, ash.p2 AS block_id, count(*) AS latch_waits
FROM v$active_session_history ash
LEFT JOIN dba_objects o ON ash.current_obj# = o.object_id
WHERE ash.event = 'latch: cache buffers chains'
  AND ash.sample_time > sysdate - 1/24
GROUP BY ash.current_obj#, o.object_name, o.object_type, ash.p1, ash.p2
ORDER BY latch_waits DESC
FETCH FIRST 10 ROWS ONLY;`
  },
  {
    id: 'we-buffer-busy-waits',
    name: 'buffer busy waits',
    waitClass: 'Concurrency',
    normalLatency: '< 2ms',
    warningThreshold: '> 3% of DB Time',
    criticalThreshold: '> 8% of DB Time',
    commonCauses: [
      'Multiple sessions attempting to read or modify the same block while another session is reading it from disk into the cache.',
      'Concurrent INSERTs into the same table/index block (block header contention or data block space).',
      'Sequence contention on right-hand index leaf block.'
    ],
    impact: 'Sessions serialize behind the active block pinned by another session.',
    remediation: [
      'Examine P3 parameter in V$SESSION_WAIT or AWR: P3 = 130 (block read wait) vs P3 = 220/230 (block modification wait).',
      'If P3 indicates segment header: Convert tablespace to ASSM (Automatic Segment Space Management).',
      'If P3 indicates data block during INSERTs: Increase PCTFREE on the table to reduce rows per block.',
      'If right-hand index contention: Use hash partitioning or increase sequence CACHE size (e.g., CACHE 1000).'
    ],
    diagnosticSql: `-- Identify object and block class experiencing buffer busy waits
SELECT o.object_name, o.object_type, ash.p3 AS reason_code, count(*) AS waits
FROM v$active_session_history ash
JOIN dba_objects o ON ash.current_obj# = o.object_id
WHERE ash.event = 'buffer busy waits'
  AND ash.sample_time > sysdate - 1/24
GROUP BY o.object_name, o.object_type, ash.p3
ORDER BY waits DESC
FETCH FIRST 10 ROWS ONLY;`
  },
  {
    id: 'we-cursor-pin-s',
    name: 'cursor: pin S wait on X',
    waitClass: 'Concurrency',
    normalLatency: '< 1ms',
    warningThreshold: '> 2% of DB Time',
    criticalThreshold: '> 5% of DB Time (Parsing contention crisis)',
    commonCauses: [
      'A session is parsing or compiling a SQL statement in exclusive mode (X) while other sessions try to execute it in shared mode (S).',
      'Hard parse storms on identical SQL or cursor invalidation loops.',
      'Dynamic SQL without bind variables generating massive child cursor trees.'
    ],
    impact: 'Dozens to hundreds of application threads block waiting for cursor pin mutex.',
    remediation: [
      'Check top SQL by Version Count in AWR report.',
      'Identify reason for cursor sharing failure in V$SQL_SHARED_CURSOR.',
      'Implement bind variables in application queries.',
      'Avoid running DDL or gathering stats on active tables during peak production hours.'
    ],
    diagnosticSql: `-- Find SQL_ID causing cursor pin mutex contention
SELECT sql_id, count(*) AS mutex_waits
FROM v$active_session_history
WHERE event = 'cursor: pin S wait on X'
  AND sample_time > sysdate - 1/24
GROUP BY sql_id
ORDER BY mutex_waits DESC
FETCH FIRST 10 ROWS ONLY;`
  },
  {
    id: 'we-gc-cr-block-2way',
    name: 'gc cr block 2-way / gc current block 2-way',
    waitClass: 'Cluster',
    normalLatency: '< 1.5ms (Private 10GbE/Infiniband)',
    warningThreshold: '2.0ms - 5.0ms',
    criticalThreshold: '> 6.0ms or > 20% of cluster DB Time',
    commonCauses: [
      'RAC private interconnect latency, packet drops, or MTU mismatch.',
      'LMS (Lock Manager Service) background process CPU starvation.',
      'Cross-node block pinging: Instance 1 is updating rows in a block that Instance 2 is concurrently reading or updating.'
    ],
    impact: 'Inter-instance block transfers slow down the entire RAC cluster.',
    remediation: [
      'Verify private network interfaces, MTU 9000 (Jumbo frames) end-to-end, and switch port statistics.',
      'Partition application workload using RAC Services (DBMS_SERVICE) so that related tables/modules are serviced by a dedicated instance.',
      'Increase sequence cache sizes to CACHE 10,000 with NOORDER to prevent cross-node sequence lock pinging.'
    ],
    diagnosticSql: `-- Check RAC Global Cache average wait times by node
SELECT inst_id, event, total_waits,
       ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) AS avg_wait_ms
FROM gv$system_event
WHERE event IN ('gc cr block 2-way', 'gc current block 2-way', 'gc cr block 3-way')
ORDER BY avg_wait_ms DESC;`
  }
];
