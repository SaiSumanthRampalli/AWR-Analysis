import { SqlTuningPath } from '../types/awr';

export const sqlTuningPaths: SqlTuningPath[] = [
  {
    id: 'path-buffer-gets',
    title: 'Path 1: Inefficient Access Paths & High Buffer Gets',
    symptom: 'SQL ordered by Buffer Gets has statements consuming millions of gets per execution, dominating DB CPU.',
    keyMetric: 'Buffer Gets per Execution > 10,000 for single-row lookups or > 100,000 for OLTP transactions',
    ruleOfThumb: 'Logical I/O consumes CPU. If Elapsed Time ~= CPU Time with massive buffer gets, the query is reading far more data blocks in memory than required.',
    decisionSteps: [
      {
        stepNumber: 1,
        checkTitle: 'Inspect Execution Plan Operation',
        checkCondition: 'Check if plan contains TABLE ACCESS FULL on large table or INDEX FULL SCAN instead of INDEX RANGE SCAN',
        actionIfTrue: 'Check column predicate data types and function wrapping: WHERE UPPER(col) = :b1 disables standard B-Tree index on col (create function-based index). Check for implicit data type conversion (e.g. VARCHAR column compared with NUMBER).',
        diagnosticSql: `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(:sql_id, NULL, 'TYPICAL +PEEKED_BINDS +ALLSTATS LAST'));`
      },
      {
        stepNumber: 2,
        checkTitle: 'Evaluate Index Clustering Factor',
        checkCondition: 'CLUSTERING_FACTOR of index is close to NUM_ROWS of the table (disorganized table storage)',
        actionIfTrue: 'The optimizer may favor a Full Table Scan because an Index Range Scan would require hopping across thousands of different blocks. Consider creating a composite index that covers all projection columns or re-clustering table data.',
        diagnosticSql: `SELECT index_name, clustering_factor, num_rows, 
       ROUND(clustering_factor / NULLIF(num_rows, 0), 2) AS cluster_ratio
FROM user_indexes
WHERE table_name = :table_name;`
      },
      {
        stepNumber: 3,
        checkTitle: 'Check for Cartesian Join or Wrong Join Order',
        checkCondition: 'Plan shows MERGE JOIN CARTESIAN or Hash Join with massive row amplification',
        actionIfTrue: 'Check for missing join predicates in WHERE clause. Check for stale table statistics that misled the Cost Based Optimizer (CBO) into estimating 1 row when 10,000,000 exist.',
        diagnosticSql: `SELECT owner, table_name, num_rows, last_analyzed, stale_stats
FROM dba_tab_statistics
WHERE table_name IN (:table1, :table2);`
      }
    ],
    mitigationStrategies: [
      'Create covering composite indexes to satisfy queries entirely from index leaf blocks without touching table blocks (TABLE ACCESS BY INDEX ROWID eliminated).',
      'Gather fresh statistics using DBMS_STATS.GATHER_TABLE_STATS with ESTIMATE_PERCENT => DBMS_STATS.AUTO_SAMPLE_SIZE.',
      'Check for hidden implicit type conversions in client code (e.g., passing numeric literals to indexed VARCHAR2 columns).',
      'Use SQL Profile or SQL Plan Baseline to lock in the optimal execution plan.'
    ],
    recommendedPackages: ['DBMS_XPLAN', 'DBMS_STATS', 'DBMS_SQLTUNE', 'DBMS_SPM']
  },
  {
    id: 'path-plan-regression',
    title: 'Path 2: Execution Plan Regression & Plan Hash Flips',
    symptom: 'A previously fast query suddenly takes 10x - 100x longer to execute after weekend stats collection, patch, or bounce.',
    keyMetric: 'Multiple PLAN_HASH_VALUE records in DBA_HIST_SQLSTAT with drastic differences in AVG_ET_SECS',
    ruleOfThumb: 'If SQL_ID is identical but elapsed time spiked, check if PLAN_HASH_VALUE changed. If plan changed, restore the historical good plan immediately.',
    decisionSteps: [
      {
        stepNumber: 1,
        checkTitle: 'Query Historical AWR Plan Stats',
        checkCondition: 'Identify all historical plan hash values for the target SQL_ID and compare elapsed time per execution',
        actionIfTrue: 'Determine the specific snap_id and plan_hash_value where the plan degraded.',
        diagnosticSql: `SELECT snap_id, plan_hash_value, executions_delta,
       ROUND(elapsed_time_delta / NULLIF(executions_delta, 0) / 1000, 2) AS avg_et_ms,
       ROUND(buffer_gets_delta / NULLIF(executions_delta, 0)) AS avg_gets
FROM dba_hist_sqlstat
WHERE sql_id = :target_sql_id
ORDER BY snap_id DESC;`
      },
      {
        stepNumber: 2,
        checkTitle: 'Compare Old Plan vs New Plan in AWR',
        checkCondition: 'Generate side-by-side execution plan comparison to pinpoint the exact regressed operation',
        actionIfTrue: 'Look for index dropped, index made unusable, hint ignored, or optimizer environment parameter change.',
        diagnosticSql: `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_AWR(:target_sql_id, :good_plan_hash));
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_AWR(:target_sql_id, :bad_plan_hash));`
      },
      {
        stepNumber: 3,
        checkTitle: 'Lock in Good Plan via SQL Plan Baseline (SPM)',
        checkCondition: 'Good plan exists in AWR repository or cursor cache',
        actionIfTrue: 'Load the verified good plan from AWR into SQL Plan Management (SPM) baseline with FIXED=YES so the optimizer cannot deviate.',
        diagnosticSql: `DECLARE
  l_plans_loaded PLS_INTEGER;
BEGIN
  l_plans_loaded := DBMS_SPM.LOAD_PLANS_FROM_AWR(
    begin_snap => :begin_snap_id,
    end_snap   => :end_snap_id,
    basic_filter => 'sql_id = ''' || :target_sql_id || ''' AND plan_hash_value = ' || :good_plan_hash
  );
  COMMIT;
END;
/`
      }
    ],
    mitigationStrategies: [
      'Create an enabled, accepted, fixed SQL Plan Baseline (SPM) using DBMS_SPM.',
      'If SPM is unavailable, attach a SQL Patch with targeted hints using DBMS_SQLDIAG.CREATE_SQL_PATCH.',
      'Restore previous optimizer table statistics using DBMS_STATS.RESTORE_TABLE_STATS.',
      'Check for Bind Variable Peeking sensitivity; enable Adaptive Cursor Sharing (ACS) or adjust histograms.'
    ],
    recommendedPackages: ['DBMS_SPM', 'DBMS_SQLDIAG', 'DBMS_STATS']
  },
  {
    id: 'path-parse-thrash',
    title: 'Path 3: Hard Parsing & High Version Count Triage',
    symptom: 'AWR shows low Soft Parse % (< 90%), high Parse Calls, and concurrency wait events: cursor: pin S wait on X or library cache lock.',
    keyMetric: 'Version Count > 100 on a single SQL_ID or Parse Count (Hard) > 100/sec',
    ruleOfThumb: 'Hard parsing consumes shared pool memory and CPU cycles while locking library cache structures. Literals kill scalability.',
    decisionSteps: [
      {
        stepNumber: 1,
        checkTitle: 'Inspect V$SQL_SHARED_CURSOR Reasons',
        checkCondition: 'Query why child cursors cannot be shared across executions',
        actionIfTrue: 'Common reasons: BIND_LENGTH_UPGRADEABLE (bind variables passed with fluctuating string lengths 32 -> 128 -> 4000), OPTIMIZER_MISMATCH (different session optimizer settings), or PURGED_CURSOR.',
        diagnosticSql: `SELECT * FROM v$sql_shared_cursor WHERE sql_id = :target_sql_id;`
      },
      {
        stepNumber: 2,
        checkTitle: 'Identify Literal SQL Statements in V$SQLAREA',
        checkCondition: 'Hundreds of SQL statements that differ only by literal values in WHERE clause',
        actionIfTrue: 'Application is concatenating user input strings rather than using parameterized queries. Urgent security (SQL injection) and scalability issue.',
        diagnosticSql: `SELECT substr(sql_text, 1, 60) AS sql_prefix, count(*), sum(executions)
FROM v$sqlarea
WHERE executions = 1
GROUP BY substr(sql_text, 1, 60)
HAVING count(*) > 50
ORDER BY count(*) DESC;`
      },
      {
        stepNumber: 3,
        checkTitle: 'Temporary Triage Mitigation',
        checkCondition: 'Production system paralyzed by hard parsing before application code can be refactored',
        actionIfTrue: 'Set parameter CURSOR_SHARING = FORCE at system or session level to force Oracle to replace literals with system-generated binds (:SYS_B_0).',
        diagnosticSql: `ALTER SYSTEM SET cursor_sharing = 'FORCE' SCOPE=BOTH;`
      }
    ],
    mitigationStrategies: [
      'Refactor application codebase to use prepared statements and parameterized bind variables.',
      'If using Java/Python/Node.js, set statement cache size on connection pools (e.g. setStatementCacheSize(50)).',
      'Ensure client bind variable types and lengths are normalized across execution calls.',
      'Avoid running DDL or TRUNCATE on tables while high-concurrency queries are active.'
    ],
    recommendedPackages: ['V$SQL_SHARED_CURSOR', 'V$SQLAREA', 'DBMS_SHARED_POOL']
  },
  {
    id: 'path-high-executions',
    title: 'Path 4: Micro-Latency & High Frequency Execution Churn (N+1 Query Problem)',
    symptom: 'Single execution takes only 0.5ms, but SQL is executed 5,000,000 times per hour, accumulating huge total DB Time.',
    keyMetric: 'Executions per second > 1,000 for a single statement; Average Elapsed Time < 1ms',
    ruleOfThumb: 'A query running in 1ms is fast, but running it 1,000,000 times inside a loop costs 1,000 seconds of latency and millions of round-trips.',
    decisionSteps: [
      {
        stepNumber: 1,
        checkTitle: 'Verify Client Round-Trip Overhead',
        checkCondition: 'User calls vs SQL executions ratio in Load Profile',
        actionIfTrue: 'The application ORM (Hibernate, Entity Framework, Prisma) is executing individual SELECT queries inside a loop for each child record (classic N+1 problem).',
        diagnosticSql: `SELECT sql_id, executions, 
       ROUND(elapsed_time / 1000000, 2) AS total_et_sec,
       ROUND(elapsed_time / NULLIF(executions, 0) / 1000, 3) AS avg_et_ms,
       sql_text
FROM v$sqlarea
WHERE executions > 100000
ORDER BY total_et_sec DESC
FETCH FIRST 5 ROWS ONLY;`
      },
      {
        stepNumber: 2,
        checkTitle: 'Batch Processing & Array Fetch Sizing',
        checkCondition: 'Fetch calls equal number of rows retrieved (ARRAYSIZE = 1)',
        actionIfTrue: 'Increase client prefetch size / arraysize to 100 or 500 to fetch multiple rows in a single network round-trip.',
        diagnosticSql: `-- Check user calls and fetch metrics
SELECT name, value FROM v$sysstat WHERE name IN ('user calls', 'execute count', 'sql execute elapsed time');`
      }
    ],
    mitigationStrategies: [
      'Refactor ORM queries to use eager fetching / JOIN queries instead of lazy fetching inside application loops.',
      'In PL/SQL, replace row-by-row FOR loops with BULK COLLECT and FORALL batch operations.',
      'Increase client JDBC defaultRowPrefetch or SQL*Plus arraysize to reduce network round-trips.'
    ],
    recommendedPackages: ['PL/SQL BULK COLLECT / FORALL', 'JDBC PreparedStatement Batching']
  },
  {
    id: 'path-parallel-skew',
    title: 'Path 5: Parallel Execution (PX) Skew & Downgrades',
    symptom: 'Queries using PARALLEL hints fail to scale or cause erratic CPU spikes and parallel query waits.',
    keyMetric: 'PX Deq: Table Q Normal wait events or high "Parallel operations downgraded to serial"',
    ruleOfThumb: 'Parallelism is only effective if data distribution across PX slaves is uniform and the storage can deliver multi-gigabyte throughput.',
    decisionSteps: [
      {
        stepNumber: 1,
        checkTitle: 'Check for Parallel Downgrades in System Statistics',
        checkCondition: 'System metric "Parallel operations downgraded" is increasing',
        actionIfTrue: 'Oracle downgraded the requested Degree of Parallelism (DOP) because PARALLEL_MAX_SERVERS was reached or PARALLEL_ADAPTIVE_MULTI_USER intervened.',
        diagnosticSql: `SELECT name, value FROM v$sysstat WHERE name LIKE 'Parallel operations%';`
      },
      {
        stepNumber: 2,
        checkTitle: 'Inspect Slave Row Distribution Skew',
        checkCondition: 'One PX slave processes 90% of rows while other 7 slaves sit idle waiting',
        actionIfTrue: 'Skew is caused by unselective join keys in hash distribution or data skew on partition keys. Use PQ_DISTRIBUTE hints or fix join predicate.',
        diagnosticSql: `SELECT dfo_number, tq_id, server_type, process, num_rows, bytes
FROM v$pq_tqstat
ORDER BY dfo_number, tq_id, server_type, process;`
      }
    ],
    mitigationStrategies: [
      'Avoid hardcoding excessive DOP hints (e.g. /*+ PARALLEL(32) */ on small tables).',
      'Enable Oracle Auto DOP: Set PARALLEL_DEGREE_POLICY = AUTO or ADAPTIVE with Statement Queuing.',
      'Check V$PQ_TQSTAT immediately after query execution to diagnose slave skew.'
    ],
    recommendedPackages: ['V$PQ_TQSTAT', 'V$PQ_SYSSTAT', 'DBMS_PARALLEL_EXECUTE']
  }
];
