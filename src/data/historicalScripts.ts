import { HistoricalScript } from '../types/awr';

export const historicalScripts: HistoricalScript[] = [
  {
    id: 'script-awr-batch',
    title: 'Automated AWR Batch Report HTML Generator',
    category: 'Report Generation',
    description: 'Generates standalone HTML AWR reports automatically between consecutive snapshots over a specified date range and saves them to a server directory.',
    targetViews: ['DBA_HIST_SNAPSHOT', 'DBMS_WORKLOAD_REPOSITORY.AWR_REPORT_HTML'],
    parameters: [
      { name: 'DAYS_BACK', defaultValue: '1', description: 'Number of past days to generate reports for' },
      { name: 'OUTPUT_DIR', defaultValue: 'DATA_PUMP_DIR', description: 'Oracle Directory object where HTML files will be written' }
    ],
    sqlCode: `-- ====================================================================
-- Automated AWR HTML Report Batch Generator
-- Generates individual hourly HTML reports between snapshots
-- ====================================================================
SET SERVEROUTPUT ON SIZE UNLIMITED
SET FEEDBACK OFF

DECLARE
    v_dbid         NUMBER;
    v_inst_num     NUMBER;
    v_dir          VARCHAR2(30) := '&OUTPUT_DIR';
    v_file_handle  UTL_FILE.FILE_TYPE;
    v_filename     VARCHAR2(100);
    
    CURSOR c_snaps IS
        SELECT 
            snap_id AS begin_snap,
            LEAD(snap_id) OVER (ORDER BY snap_id) AS end_snap,
            TO_CHAR(begin_interval_time, 'YYYYMMDD_HH24MI') AS begin_time
        FROM dba_hist_snapshot
        WHERE begin_interval_time >= SYSDATE - &DAYS_BACK
          AND instance_number = (SELECT instance_number FROM v$instance)
        ORDER BY snap_id;
BEGIN
    SELECT dbid, instance_number INTO v_dbid, v_inst_num FROM v$database, v$instance;
    
    DBMS_OUTPUT.PUT_LINE('Starting automated batch AWR report extraction for DBID=' || v_dbid);
    
    FOR r IN c_snaps LOOP
        IF r.end_snap IS NOT NULL THEN
            v_filename := 'awr_' || v_inst_num || '_' || r.begin_snap || '_' || r.end_snap || '_' || r.begin_time || '.html';
            DBMS_OUTPUT.PUT_LINE('Generating: ' || v_filename || ' (Snaps ' || r.begin_snap || ' to ' || r.end_snap || ')');
            
            v_file_handle := UTL_FILE.FOPEN(v_dir, v_filename, 'W', 32767);
            
            FOR l IN (
                SELECT output 
                FROM TABLE(DBMS_WORKLOAD_REPOSITORY.AWR_REPORT_HTML(v_dbid, v_inst_num, r.begin_snap, r.end_snap))
            ) LOOP
                UTL_FILE.PUT_LINE(v_file_handle, l.output);
            END LOOP;
            
            UTL_FILE.FCLOSE(v_file_handle);
        END IF;
    END LOOP;
    
    DBMS_OUTPUT.PUT_LINE('Batch AWR extraction completed successfully.');
EXCEPTION
    WHEN OTHERS THEN
        IF UTL_FILE.IS_OPEN(v_file_handle) THEN
            UTL_FILE.FCLOSE(v_file_handle);
        END IF;
        DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
        RAISE;
END;
/`,
    sampleOutput: `Starting automated batch AWR report extraction for DBID=1928475829
Generating: awr_1_48210_48211_20261001_0800.html (Snaps 48210 to 48211)
Generating: awr_1_48211_48212_20261001_0900.html (Snaps 48211 to 48212)
Generating: awr_1_48212_48213_20261001_1000.html (Snaps 48212 to 48213)
Batch AWR extraction completed successfully.`,
    dbaTip: 'Ensure the Oracle directory object (e.g. DATA_PUMP_DIR) has WRITE privileges granted to the executing user before running.'
  },
  {
    id: 'script-awr-diff',
    title: 'AWR Compare Periods (Diff) HTML Generator',
    category: 'Report Generation',
    description: 'Produces a differential AWR report comparing a known healthy baseline snapshot period against a degraded incident window using DBMS_WORKLOAD_REPOSITORY.AWR_DIFF_REPORT_HTML.',
    targetViews: ['DBA_HIST_SNAPSHOT', 'DBMS_WORKLOAD_REPOSITORY.AWR_DIFF_REPORT_HTML'],
    parameters: [
      { name: 'BASE_BEGIN_SNAP', defaultValue: '48100', description: 'Snapshot ID start for healthy baseline period' },
      { name: 'BASE_END_SNAP', defaultValue: '48102', description: 'Snapshot ID end for healthy baseline period' },
      { name: 'PEAK_BEGIN_SNAP', defaultValue: '48210', description: 'Snapshot ID start for degraded incident period' },
      { name: 'PEAK_END_SNAP', defaultValue: '48212', description: 'Snapshot ID end for degraded incident period' }
    ],
    sqlCode: `-- ====================================================================
-- AWR Compare Periods Report Generator
-- Compares Baseline vs Incident Peak to isolate deltas
-- ====================================================================
SET PAGESIZE 0 LINESIZE 32767 TRIMSPOOL ON FEEDBACK OFF
SPOOL awr_compare_report.html

SELECT output 
FROM TABLE(
    DBMS_WORKLOAD_REPOSITORY.AWR_DIFF_REPORT_HTML(
        (SELECT dbid FROM v$database),
        (SELECT instance_number FROM v$instance),
        &BASE_BEGIN_SNAP,
        &BASE_END_SNAP,
        (SELECT dbid FROM v$database),
        (SELECT instance_number FROM v$instance),
        &PEAK_BEGIN_SNAP,
        &PEAK_END_SNAP
    )
);

SPOOL OFF
SET FEEDBACK ON PAGESIZE 50;`,
    sampleOutput: `<!-- Produces complete side-by-side AWR HTML comparison table:
  1st Period (Baseline): Snaps 48100 - 48102 | DB Time: 120 mins | Avg Load: 2.0
  2nd Period (Incident): Snaps 48210 - 48212 | DB Time: 1,840 mins | Avg Load: 30.6
  Highlighted Deltas: db file sequential read (+840%), Buffer Gets (+1250%)
-->`,
    dbaTip: 'Choose baseline and peak periods with equal elapsed durations (e.g., both exactly 2 hours) to avoid skewing load profile ratios.'
  },
  {
    id: 'script-sql-trending',
    title: 'Historical Top SQL Elapsed & Plan Trending',
    category: 'Top SQL Trending',
    description: 'Tracks execution counts, average elapsed time, buffer gets, and plan hash values for a target SQL_ID across all historical AWR snapshots.',
    targetViews: ['DBA_HIST_SQLSTAT', 'DBA_HIST_SNAPSHOT'],
    parameters: [
      { name: 'TARGET_SQL_ID', defaultValue: '4g7y6m8a2bc41', description: 'Target SQL_ID to investigate' },
      { name: 'DAYS_BACK', defaultValue: '7', description: 'Analysis time window in days' }
    ],
    sqlCode: `-- ====================================================================
-- Historical Top SQL Performance Trend across AWR Snapshots
-- ====================================================================
SET LINESIZE 200 PAGESIZE 100
COL snap_time FORMAT A17 HEADING "Snapshot Time"
COL plan_hash FORMAT 9999999999 HEADING "Plan Hash"
COL execs FORMAT 999,999 HEADING "Executions"
COL avg_et_ms FORMAT 999,990.99 HEADING "Avg ET (ms)"
COL avg_cpu_ms FORMAT 999,990.99 HEADING "Avg CPU (ms)"
COL avg_gets FORMAT 999,999,999 HEADING "Avg Gets"
COL avg_reads FORMAT 999,999 HEADING "Avg Reads"

SELECT 
    TO_CHAR(s.begin_interval_time, 'YYYY-MM-DD HH24:MI') AS snap_time,
    st.snap_id,
    st.plan_hash_value AS plan_hash,
    st.executions_delta AS execs,
    ROUND(st.elapsed_time_delta / NULLIF(st.executions_delta, 0) / 1000, 2) AS avg_et_ms,
    ROUND(st.cpu_time_delta / NULLIF(st.executions_delta, 0) / 1000, 2) AS avg_cpu_ms,
    ROUND(st.buffer_gets_delta / NULLIF(st.executions_delta, 0)) AS avg_gets,
    ROUND(st.disk_reads_delta / NULLIF(st.executions_delta, 0)) AS avg_reads
FROM dba_hist_sqlstat st
JOIN dba_hist_snapshot s ON st.snap_id = s.snap_id AND st.instance_number = s.instance_number
WHERE st.sql_id = '&TARGET_SQL_ID'
  AND s.begin_interval_time >= SYSDATE - &DAYS_BACK
ORDER BY st.snap_id DESC;`,
    sampleOutput: `Snapshot Time     SNAP_ID    Plan Hash  Executions  Avg ET (ms)  Avg CPU (ms)     Avg Gets  Avg Reads
----------------- ------- ------------ ----------- ------------ ------------- ------------ ----------
2026-10-01 09:00    48212   1948201948      12,450       420.50        380.10      840,200     14,200  <-- Degraded Plan!
2026-10-01 08:00    48211   1948201948      11,200       415.20        375.00      838,100     13,900
2026-10-01 07:00    48210   3419502841      14,800         3.40          2.10          420         12  <-- Normal Baseline`,
    dbaTip: 'Spot the exact snapshot where Plan Hash Value flipped. A plan flip coupled with an explosion in Avg Gets is the signature of optimizer regression.'
  },
  {
    id: 'script-wait-trend',
    title: 'Historical Top Wait Events Trend by Snapshot',
    category: 'Wait Events',
    description: 'Calculates the delta wait time and average latency per wait event across historical AWR snapshots to isolate when an I/O or locking storm began.',
    targetViews: ['DBA_HIST_SYSTEM_EVENT', 'DBA_HIST_SNAPSHOT'],
    parameters: [
      { name: 'WAIT_EVENT_PATTERN', defaultValue: '%read%', description: 'SQL LIKE pattern for wait event name' },
      { name: 'DAYS_BACK', defaultValue: '3', description: 'Number of past days to analyze' }
    ],
    sqlCode: `-- ====================================================================
-- Historical Wait Event Latency Trend across Snapshots
-- ====================================================================
SET LINESIZE 180 PAGESIZE 60
COL snap_time FORMAT A17 HEADING "Snapshot Time"
COL event_name FORMAT A32 HEADING "Wait Event"
COL total_waits FORMAT 999,999,999 HEADING "Total Waits"
COL time_waited_sec FORMAT 999,990.9 HEADING "Time Waited (s)"
COL avg_wait_ms FORMAT 999,990.99 HEADING "Avg Wait (ms)"

SELECT 
    TO_CHAR(s.begin_interval_time, 'YYYY-MM-DD HH24:MI') AS snap_time,
    e.event_name,
    e.total_waits_total - LAG(e.total_waits_total, 1) OVER (
        PARTITION BY e.event_id ORDER BY s.snap_id
    ) AS total_waits,
    ROUND((e.time_waited_micro_total - LAG(e.time_waited_micro_total, 1) OVER (
        PARTITION BY e.event_id ORDER BY s.snap_id
    )) / 1000000, 1) AS time_waited_sec,
    ROUND((e.time_waited_micro_total - LAG(e.time_waited_micro_total, 1) OVER (
        PARTITION BY e.event_id ORDER BY s.snap_id
    )) / NULLIF(e.total_waits_total - LAG(e.total_waits_total, 1) OVER (
        PARTITION BY e.event_id ORDER BY s.snap_id
    ), 0) / 1000, 2) AS avg_wait_ms
FROM dba_hist_system_event e
JOIN dba_hist_snapshot s ON e.snap_id = s.snap_id AND e.instance_number = s.instance_number
WHERE e.event_name LIKE '&WAIT_EVENT_PATTERN'
  AND s.begin_interval_time >= SYSDATE - &DAYS_BACK
ORDER BY s.snap_id DESC, time_waited_sec DESC;`,
    sampleOutput: `Snapshot Time     Wait Event                        Total Waits  Time Waited (s)  Avg Wait (ms)
----------------- -------------------------------- ------------ ---------------- --------------
2026-10-01 09:00  db file sequential read            2,450,120          39,201.9          16.00  <-- SAN Latency Spike!
2026-10-01 08:00  db file sequential read            1,890,200           7,560.8           4.00
2026-10-01 07:00  db file sequential read            1,750,000           6,125.0           3.50`,
    dbaTip: 'Filter by "log file sync" to track redo log write degradation, or "%block%" in RAC to observe private interconnect health over time.'
  },
  {
    id: 'script-plan-detector',
    title: 'SQL Plan Regression Detector (Automatic Alert)',
    category: 'Plan Changes',
    description: 'Scans the AWR repository to identify all SQL statements whose execution plan changed in the last 24-48 hours and caused > 3x elapsed time degradation.',
    targetViews: ['DBA_HIST_SQLSTAT', 'DBA_HIST_SNAPSHOT'],
    parameters: [
      { name: 'HOURS_BACK', defaultValue: '24', description: 'Hours of history to audit' },
      { name: 'DEGRADATION_FACTOR', defaultValue: '3', description: 'Multiplier threshold for elapsed time degradation' }
    ],
    sqlCode: `-- ====================================================================
-- Automated SQL Plan Regression Detector
-- Flags queries with plan hash changes and > 3x elapsed time surge
-- ====================================================================
WITH plan_stats AS (
    SELECT 
        st.sql_id,
        st.plan_hash_value,
        SUM(st.executions_delta) AS total_execs,
        ROUND(SUM(st.elapsed_time_delta) / NULLIF(SUM(st.executions_delta), 0) / 1000, 2) AS avg_et_ms,
        ROUND(SUM(st.buffer_gets_delta) / NULLIF(SUM(st.executions_delta), 0)) AS avg_gets,
        MIN(s.begin_interval_time) AS first_seen,
        MAX(s.begin_interval_time) AS last_seen
    FROM dba_hist_sqlstat st
    JOIN dba_hist_snapshot s ON st.snap_id = s.snap_id AND st.instance_number = s.instance_number
    WHERE s.begin_interval_time >= SYSDATE - (&HOURS_BACK / 24)
    GROUP BY st.sql_id, st.plan_hash_value
    HAVING SUM(st.executions_delta) > 50
),
ranked_plans AS (
    SELECT 
        sql_id,
        plan_hash_value,
        total_execs,
        avg_et_ms,
        avg_gets,
        first_seen,
        last_seen,
        ROW_NUMBER() OVER (PARTITION BY sql_id ORDER BY last_seen DESC) AS plan_order
    FROM plan_stats
)
SELECT 
    curr.sql_id,
    curr.plan_hash_value AS current_plan_hash,
    curr.avg_et_ms AS current_avg_et_ms,
    prev.plan_hash_value AS previous_plan_hash,
    prev.avg_et_ms AS previous_avg_et_ms,
    ROUND(curr.avg_et_ms / NULLIF(prev.avg_et_ms, 0), 1) AS degradation_ratio,
    curr.avg_gets AS current_gets,
    prev.avg_gets AS previous_gets
FROM ranked_plans curr
JOIN ranked_plans prev ON curr.sql_id = prev.sql_id AND prev.plan_order = 2
WHERE curr.plan_order = 1
  AND curr.plan_hash_value != prev.plan_hash_value
  AND curr.avg_et_ms >= prev.avg_et_ms * &DEGRADATION_FACTOR
ORDER BY curr.avg_et_ms * curr.total_execs DESC;`,
    sampleOutput: `SQL_ID         CURRENT_PLAN CURRENT_ET_MS PREV_PLAN   PREV_ET_MS DEGRADATION CURRENT_GETS PREV_GETS
------------- ------------ ------------- ----------- ---------- ----------- ------------ ---------
9a8fbc21d4ef    1849204812        345.20  4091823901       4.10       84.2x      410,200       850
2x9cd8103efa     772849103        120.40  3382910482       8.30       14.5x      128,000     1,200`,
    dbaTip: 'Run this query immediately after scheduled database maintenance, upgrade, or stats gathering to catch regressions before end users complain.'
  },
  {
    id: 'script-ash-blockers',
    title: 'Deep ASH Active Session History & Blocker Hierarchy',
    category: 'ASH Diagnostics',
    description: 'Navigates historical Active Session History (ASH) to uncover top blocked sessions, blocking roots, wait events, and target SQL_IDs during an incident.',
    targetViews: ['DBA_HIST_ACTIVE_SESS_HISTORY', 'DBA_OBJECTS'],
    parameters: [
      { name: 'TARGET_TIME_WINDOW_MINUTES', defaultValue: '60', description: 'Past minutes to analyze in ASH' }
    ],
    sqlCode: `-- ====================================================================
-- Deep ASH Wait & Root Blocker Hierarchy Analysis
-- ====================================================================
SET LINESIZE 200 PAGESIZE 60
COL event FORMAT A30 HEADING "Wait Event"
COL sql_id FORMAT A14 HEADING "SQL ID"
COL blocker_sid FORMAT 999999 HEADING "Blocker SID"
COL blocked_sessions FORMAT 999,999 HEADING "Blocked Samples"
COL object_name FORMAT A28 HEADING "Target Object"

SELECT 
    NVL(ash.event, 'ON CPU') AS event,
    ash.sql_id,
    ash.blocking_session AS blocker_sid,
    o.object_name,
    o.object_type,
    COUNT(*) AS blocked_samples,
    ROUND(COUNT(*) * 100 / SUM(COUNT(*)) OVER (), 2) AS pct_impact
FROM dba_hist_active_sess_history ash
LEFT JOIN dba_objects o ON ash.current_obj# = o.object_id
WHERE ash.sample_time >= SYSDATE - (&TARGET_TIME_WINDOW_MINUTES / 1440)
GROUP BY NVL(ash.event, 'ON CPU'), ash.sql_id, ash.blocking_session, o.object_name, o.object_type
ORDER BY blocked_samples DESC
FETCH FIRST 15 ROWS ONLY;`,
    sampleOutput: `Wait Event                     SQL ID         Blocker SID Target Object                Blocked Samples Pct Impact
------------------------------ -------------- ----------- ---------------------------- --------------- ----------
enq: TX - row lock contention  8k71mb2d94fx1        1482  ORDERS_TBL                             4,820      42.50%
db file sequential read        3fa8cb912ef00              ORDERS_PK                              2,150      18.95%
cursor: pin S wait on X        19ab82dcfe123              SHARED_POOL_CURSOR                     1,420      12.51%`,
    dbaTip: 'Focus on entries with non-null Blocker SID to resolve application deadlock chains before rebooting instances.'
  },
  {
    id: 'script-awr-config',
    title: 'AWR Retention & Snapshot Granularity Configurator',
    category: 'Report Generation',
    description: 'Inspects and modifies AWR snapshot frequency (interval) and retention period to optimize diagnostic precision without exhausting SYSAUX space.',
    targetViews: ['DBA_HIST_WR_CONTROL', 'DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS'],
    parameters: [
      { name: 'INTERVAL_MINUTES', defaultValue: '15', description: 'Snapshot frequency in minutes (default is often 60; recommended 15 or 30)' },
      { name: 'RETENTION_DAYS', defaultValue: '14', description: 'Number of days to preserve historical snapshots in SYSAUX' }
    ],
    sqlCode: `-- ====================================================================
-- Check Current AWR Snapshot Interval & Retention Settings
-- ====================================================================
SELECT 
    snap_interval, 
    retention, 
    topnsql
FROM dba_hist_wr_control;

-- ====================================================================
-- Set Snapshot Interval to 15 Minutes and Retention to 14 Days
-- (Interval in minutes, Retention in minutes: 14 days = 14 * 24 * 60 = 20160)
-- ====================================================================
BEGIN
    DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS(
        retention => &RETENTION_DAYS * 24 * 60,
        interval  => &INTERVAL_MINUTES,
        topnsql   => 'MAXIMUM'
    );
END;
/

-- Verify modified settings
SELECT 
    snap_interval, 
    retention, 
    topnsql
FROM dba_hist_wr_control;`,
    sampleOutput: `SNAP_INTERVAL        RETENTION            TOPNSQL
-------------------- -------------------- ----------
+00000 00:15:00.0    +00014 00:00:00.0    MAXIMUM`,
    dbaTip: 'Setting topnsql to "MAXIMUM" captures complete top SQL statistics during high-workload periods, avoiding missing SQL_IDs in AWR reports.'
  },
  {
    id: 'script-awrsqrpt',
    title: 'SQL-Specific AWR Report HTML Generator (awrsqrpt.sql wrapper)',
    category: 'Report Generation',
    description: 'Generates a deep-dive SQL-specific AWR report for a single problematic SQL_ID across a snapshot interval using DBMS_WORKLOAD_REPOSITORY.AWR_SQL_REPORT_HTML.',
    targetViews: ['DBA_HIST_SQLSTAT', 'DBMS_WORKLOAD_REPOSITORY.AWR_SQL_REPORT_HTML'],
    parameters: [
      { name: 'TARGET_SQL_ID', defaultValue: '8b9f31a7x2d9', description: 'SQL ID to generate detailed report for' },
      { name: 'BEGIN_SNAP', defaultValue: '48210', description: 'Starting snapshot ID' },
      { name: 'END_SNAP', defaultValue: '48212', description: 'Ending snapshot ID' }
    ],
    sqlCode: `-- ====================================================================
-- SQL-Specific AWR Report Generator (awrsqrpt.sql equivalent)
-- Extracts execution plans, plan history, and runtime stats for 1 SQL
-- ====================================================================
SET PAGESIZE 0 LINESIZE 32767 TRIMSPOOL ON FEEDBACK OFF
SPOOL awr_sql_&TARGET_SQL_ID._report.html

SELECT output 
FROM TABLE(
    DBMS_WORKLOAD_REPOSITORY.AWR_SQL_REPORT_HTML(
        (SELECT dbid FROM v$database),
        (SELECT instance_number FROM v$instance),
        &BEGIN_SNAP,
        &END_SNAP,
        '&TARGET_SQL_ID'
    )
);

SPOOL OFF
SET FEEDBACK ON PAGESIZE 50;`,
    sampleOutput: `<!-- Produces complete standalone HTML report for target SQL:
  Plan Hash History, Buffer Gets Trend, CPU Trend, Child Cursor Breakdown
-->`,
    dbaTip: 'Use awrsqrpt when a single SQL statement is already identified as the primary consumer of DB Time.'
  },
  {
    id: 'script-top20-extract',
    title: 'Top 20 System Hotspots Automated Extractor',
    category: 'Top SQL Trending',
    description: 'Unified diagnostic query that extracts and ranks the top 20 performance consumers across SQL Elapsed Time, Wait Events, and Hot Objects in the current snapshot.',
    targetViews: ['DBA_HIST_SQLSTAT', 'DBA_HIST_SYSTEM_EVENT', 'DBA_HIST_SEG_STAT'],
    parameters: [
      { name: 'SNAP_ID', defaultValue: '(SELECT MAX(snap_id) FROM dba_hist_snapshot)', description: 'Snapshot ID to analyze' }
    ],
    sqlCode: `-- ====================================================================
-- Top 20 System Performance Hotspots Extractor
-- Unifies Top SQL, Top Wait Events, and Top Segments into a ranked audit
-- ====================================================================
SET LINESIZE 220 PAGESIZE 100
COL category FORMAT A12 HEADING "Category"
COL name FORMAT A38 HEADING "Hotspot Name"
COL metric_impact FORMAT A30 HEADING "Metric / Impact"
COL elapsed_sec FORMAT 999,990.9 HEADING "Time (s)"

WITH top_sql AS (
    SELECT 
        'SQL' AS category,
        'SQL_ID: ' || sql_id || ' (Plan: ' || plan_hash_value || ')' AS name,
        'Gets: ' || ROUND(buffer_gets_delta/NULLIF(executions_delta,0)) || ' | Execs: ' || executions_delta AS metric_impact,
        ROUND(elapsed_time_delta / 1000000, 1) AS elapsed_sec
    FROM dba_hist_sqlstat
    WHERE snap_id = &SNAP_ID
    ORDER BY elapsed_time_delta DESC
    FETCH FIRST 10 ROWS ONLY
),
top_waits AS (
    SELECT 
        'Wait Event' AS category,
        event_name AS name,
        'Waits: ' || total_waits_total || ' | Avg: ' || ROUND(time_waited_micro_total/NULLIF(total_waits_total,0)/1000, 1) || 'ms' AS metric_impact,
        ROUND(time_waited_micro_total / 1000000, 1) AS elapsed_sec
    FROM dba_hist_system_event
    WHERE snap_id = &SNAP_ID
      AND wait_class != 'Idle'
    ORDER BY time_waited_micro_total DESC
    FETCH FIRST 10 ROWS ONLY
)
SELECT ROWNUM AS rank, category, name, metric_impact, elapsed_sec
FROM (
    SELECT * FROM top_sql
    UNION ALL
    SELECT * FROM top_waits
    ORDER BY elapsed_sec DESC
)
FETCH FIRST 20 ROWS ONLY;`,
    sampleOutput: `RANK Category     Hotspot Name                           Metric / Impact                Time (s)
---- ------------ -------------------------------------- ------------------------------ --------
   1 SQL          SQL_ID: 8b9f31a7x2d9 (Plan: 4829104812) Gets: 1240000 | Execs: 5400      1,840.5
   2 Wait Event   db file sequential read                Waits: 78000 | Avg: 18.2ms       1,420.0
   3 Wait Event   cursor: pin S wait on X                Waits: 54200 | Avg: 16.4ms         890.0`,
    dbaTip: 'Schedule this query as an hourly cron or database alert to immediately notify DBAs when any hotspot consumes > 20% of snapshot time.'
  }
];
