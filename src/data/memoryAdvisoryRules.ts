import { MemoryAdvisoryRule } from '../types/awr';

export const memoryAdvisoryRules: MemoryAdvisoryRule[] = [
  {
    id: 'mem-buffer-cache',
    component: 'Buffer Cache',
    targetParameter: 'DB_CACHE_SIZE / SGA_TARGET',
    advisorView: 'V$DB_CACHE_ADVICE / DBA_HIST_DB_CACHE_ADVICE',
    sizingMetric: 'ESTD_PHYSICAL_READ_FACTOR vs SIZE_FACTOR',
    inflectionPointRule: 'Identify the "knee" on the curve where increasing cache size provides less than 2% additional physical read reduction.',
    mathematicalThreshold: 'If SIZE_FACTOR = 1.5 yields ESTD_PHYSICAL_READ_FACTOR < 0.70, resizing will deliver massive 30%+ disk read reduction. If SIZE_FACTOR = 1.5 yields factor 0.98, resizing is a waste of memory.',
    dbaCaveats: [
      'Never allocate memory away from PGA if the system is suffering from temp disk spills.',
      'A buffer cache larger than necessary can prolong checkpoint duration and DBWR flush sweeps.',
      'Check if SQL statements are doing unnecessary full table scans before increasing cache size.'
    ],
    optimizationSteps: [
      'Query V$DB_CACHE_ADVICE across SIZE_FACTOR from 0.5 to 2.0.',
      'Plot the physical read factor curve.',
      'If currently on the steep reduction slope, increase DB_CACHE_SIZE or SGA_TARGET.',
      'If on the flat asymptote, reallocate excess memory to PGA_AGGREGATE_TARGET or OS cache.'
    ],
    diagnosticSql: `-- Query current Buffer Cache Advisory
SELECT size_for_estimate AS size_mb, size_factor,
       estd_physical_reads,
       ROUND(estd_physical_read_factor, 3) AS read_factor,
       estd_pct_of_db_time_for_reads AS estd_pct_db_time
FROM v$db_cache_advice
WHERE id = (SELECT id FROM v$buffer_pool WHERE name = 'DEFAULT')
ORDER BY size_factor;`
  },
  {
    id: 'mem-pga-target',
    component: 'PGA Target',
    targetParameter: 'PGA_AGGREGATE_TARGET / PGA_AGGREGATE_LIMIT',
    advisorView: 'V$PGA_TARGET_ADVICE / DBA_HIST_PGA_TARGET_ADVICE',
    sizingMetric: 'PGA Cache Hit % & ESTD_EXTRA_BYTES_RW',
    inflectionPointRule: 'Target size must achieve PGA Cache Hit % >= 95% and reduce ESTD_EXTRA_BYTES_RW to near zero.',
    mathematicalThreshold: 'If current PGA size shows MULTI-PASS executions > 0 or ESTD_EXTRA_BYTES_RW > 10GB/hour, the instance is in severe sort/hash thrashing. Increase PGA until Multi-Pass drops to 0.',
    dbaCaveats: [
      'In Oracle 12c+, always set PGA_AGGREGATE_LIMIT (recommended 200% of PGA_AGGREGATE_TARGET) to prevent ORA-04036 (PGA memory used by instance exceeds limit) or host OS OOM killer.',
      'Complex analytic queries with WINDOW functions and massive HASH JOINs can consume gigabytes per session.'
    ],
    optimizationSteps: [
      'Query V$PGA_TARGET_ADVICE for predicted cache hit percentage and extra bytes read/written to disk.',
      'Identify whether optimal workarea executions can be achieved by sizing up PGA by 25% - 50%.',
      'Verify total physical host RAM before increasing PGA to avoid OS paging/swapping.'
    ],
    diagnosticSql: `-- Query current PGA Target Advisory
SELECT 
    ROUND(pga_target_for_estimate / 1024 / 1024) AS pga_target_mb,
    pga_target_factor,
    estd_pga_cache_hit_percentage AS estd_hit_pct,
    ROUND(estd_extra_bytes_rw / 1024 / 1024 / 1024, 2) AS estd_extra_gb_rw
FROM v$pga_target_advice
ORDER BY pga_target_factor;`
  },
  {
    id: 'mem-shared-pool',
    component: 'Shared Pool',
    targetParameter: 'SHARED_POOL_SIZE / SGA_TARGET',
    advisorView: 'V$SHARED_POOL_ADVICE / DBA_HIST_SHARED_POOL_ADVICE',
    sizingMetric: 'ESTD_LC_SIZE & ESTD_LC_TIME_SAVED_FACTOR',
    inflectionPointRule: 'Ensure ESTD_LC_TIME_SAVED_FACTOR is maximized and library cache reload percentage is under 1%.',
    mathematicalThreshold: 'If increasing shared pool by 20% does not improve ESTD_LC_TIME_SAVED_FACTOR, the root cause is SQL littering/literal parsing, not memory deficiency.',
    dbaCaveats: [
      'Never blindly increase SHARED_POOL_SIZE to extreme sizes (e.g. > 48GB). Huge shared pools increase latch spin times and ORA-04031 frequency during allocation fragmentation!',
      'Always configure SHARED_POOL_RESERVED_SIZE = 10% - 15% of SHARED_POOL_SIZE for large contiguous requests.',
      'Pin critical PL/SQL packages (DBMS_STANDARD, STANDARD, DBMS_UTILITY) into memory with DBMS_SHARED_POOL.KEEP.'
    ],
    optimizationSteps: [
      'Check V$SHARED_POOL_ADVICE for diminishing returns.',
      'Examine V$SQLAREA for literals or un-shared cursor flood.',
      'Ensure SHARED_POOL_RESERVED_SIZE is properly sized.',
      'Inspect V$SHARED_POOL_RESERVED for request failures and free space.'
    ],
    diagnosticSql: `-- Query Shared Pool Advisory & Library Cache Reload Stats
SELECT 
    shared_pool_size_for_estimate AS size_mb,
    shared_pool_size_factor AS size_factor,
    estd_lc_size AS estd_lc_mb,
    estd_lc_memory_objects AS estd_objects,
    estd_lc_time_saved AS time_saved_sec,
    estd_lc_time_saved_factor AS saved_factor
FROM v$shared_pool_advice
ORDER BY size_factor;`
  },
  {
    id: 'mem-hugepages',
    component: 'Linux HugePages',
    targetParameter: 'USE_LARGE_PAGES = ONLY, nr_hugepages kernel sysctl',
    advisorView: 'OS /proc/meminfo & V$OSSTAT',
    sizingMetric: 'Page Table Overhead vs Total SGA Allocation',
    inflectionPointRule: 'For any Linux production database with SGA > 16GB, HugePages (2MB or 1GB pages) is mandatory to eliminate page table bloat and CPU TLB thrashing.',
    mathematicalThreshold: 'HugePages Calculation: nr_hugepages = CEIL(Total SGA Size (MB) / Hugepagesize (MB)) + 100 buffer pages. For example, 64GB SGA with 2MB hugepages requires 32,868 huge pages.',
    dbaCaveats: [
      'Linux HugePages cannot be swapped out to disk, protecting the database from catastrophic OS memory paging.',
      'HugePages are incompatible with Automatic Memory Management (MEMORY_TARGET / MEMORY_MAX_TARGET). AMM must be disabled (MEMORY_TARGET=0) and ASMM (SGA_TARGET + PGA_AGGREGATE_TARGET) used instead.',
      'Always configure USE_LARGE_PAGES = ONLY in SPFILE to ensure Oracle refuses to start if HugePages are insufficient, rather than silently falling back to slow 4KB pages.'
    ],
    optimizationSteps: [
      'Calculate nr_hugepages based on aggregate SGA of all instances on the host.',
      'Add vm.nr_hugepages to /etc/sysctl.conf and run sysctl -p.',
      'Set memlock in /etc/security/limits.conf to unlimited for the oracle user.',
      'Set USE_LARGE_PAGES = ONLY in Oracle SPFILE and restart the database.'
    ],
    diagnosticSql: `-- Verify Oracle Large Pages configuration status
SELECT name, value, description 
FROM v$parameter 
WHERE name = 'use_large_pages';

-- In SQL*Plus, check alert.log startup lines:
-- "Large Pages Information: Total Shared Global Area = ... Huge Pages size = 2048 KB"
-- "Huge Pages available = ... Huge Pages used = ..."`
  }
];
