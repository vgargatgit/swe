window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-26-query-optimization"] = {
  "day": 26,
  "title": "Query Optimization",
  "subtitle": "Reduce total database work using execution plans, predicates, joins, pagination, statistics, and shape-aware SQL.",
  "tags": [
    "Query optimization",
    "EXPLAIN",
    "Join algorithms",
    "Cardinality",
    "Sorting",
    "Pagination"
  ],
  "core": "Query optimization is the process of reducing the total work required to produce the correct result—not merely making the SQL shorter or forcing the database to use an index.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart TD\n  SQL --> Plan[EXPLAIN ANALYZE]\n  Plan --> Estimate{Estimate vs actual}\n  Estimate --> Scan[Scans / filters]\n  Estimate --> Join[Join order / algorithm]\n  Estimate --> Sort[Sort / aggregate / spill]\n  Scan --> Change[Change one thing]\n  Join --> Change\n  Sort --> Change\n  Change --> Measure[Measure again]",
      "body": "<p>A query can be slow because it:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>reads too many rows\njoins tables in the wrong order\nsorts too much data\nmisestimates cardinality\nuses an unsuitable index\nreturns unnecessary columns\nwaits for locks\nspills intermediate data to disk\nexecutes thousands of smaller queries\n</code></pre></div>\n<p>The reliable workflow is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Observe\n   ↓\nMeasure\n   ↓\nRead the execution plan\n   ↓\nIdentify the expensive operation\n   ↓\nChange one thing\n   ↓\nMeasure again\n</code></pre></div>"
    },
    {
      "title": "1. Declarative SQL",
      "diagram": null,
      "body": "<p>When you write:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT p.*\nFROM payment p\nJOIN merchant m ON m.id = p.merchant_id\nWHERE m.external_id = 'M123'\n  AND p.status = 'FAILED';\n</code></pre></div>\n<p>you describe:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>what result you want\n</code></pre></div>\n<p>You do not explicitly say:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Find merchant first.\n2. Read payment index.\n3. Join using nested loop.\n4. Filter failed payments.\n</code></pre></div>\n<p>The database optimizer decides how to execute the query.</p>\n<p>Possible plans include:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Sequential scan\nIndex scan\nBitmap scan\nNested-loop join\nHash join\nMerge join\nSort\nAggregation\nParallel execution\n</code></pre></div>\n<p>The optimizer chooses the plan it estimates will have the lowest cost.</p>"
    },
    {
      "title": "2. SQL text is not the execution plan",
      "diagram": null,
      "body": "<p>These queries may be logically equivalent:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT p.*\nFROM payment p\nJOIN merchant m\n  ON m.id = p.merchant_id\nWHERE m.external_id = ?;\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id IN (\n    SELECT id\n    FROM merchant\n    WHERE external_id = ?\n);\n</code></pre></div>\n<p>A modern optimizer may transform both into similar plans.</p>\n<p>Therefore:</p>\n<div class=\"callout\">\n<p>Do not judge query performance purely from SQL syntax.</p>\n</div>\n<p>Inspect what the database actually does.</p>"
    },
    {
      "title": "3. Start with the execution plan",
      "diagram": null,
      "body": "<p>PostgreSQL:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>EXPLAIN\nSELECT *\nFROM payment\nWHERE merchant_id = 8421;\n</code></pre></div>\n<p>This shows the estimated plan.</p>\n<p>For actual execution data:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>EXPLAIN (ANALYZE, BUFFERS)\nSELECT *\nFROM payment\nWHERE merchant_id = 8421;\n</code></pre></div>\n<p>Important distinction:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>EXPLAIN\n    estimates only\n\nEXPLAIN ANALYZE\n    actually executes the query\n</code></pre></div>\n<p>Be careful with:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>DELETE\nUPDATE\nINSERT\n</code></pre></div>\n<p>because <code class=\"inline-code\">EXPLAIN ANALYZE</code> will perform the change.</p>\n<p>Use a safe environment or wrap it in a rollback-capable transaction where appropriate.</p>"
    },
    {
      "title": "4. Reading a simple plan",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Index Scan using idx_payment_merchant on payment\n  (cost=0.43..18.72 rows=5 width=96)\n  (actual time=0.031..0.041 rows=6 loops=1)\n  Index Cond: (merchant_id = 8421)\n</code></pre></div>\n<p>Important fields:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>cost\n    optimizer's internal estimate\n\nrows\n    estimated number of output rows\n\nactual rows\n    real number of output rows\n\nactual time\n    observed execution time\n\nloops\n    number of times this node executed\n</code></pre></div>\n<p>The most important comparison is often:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>estimated rows\nversus\nactual rows\n</code></pre></div>"
    },
    {
      "title": "5. Estimation errors",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>estimated rows = 10\nactual rows    = 2,000,000\n</code></pre></div>\n<p>The optimizer believed the operation was tiny.</p>\n<p>It may therefore choose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>nested-loop join\n</code></pre></div>\n<p>when a hash join would be much better.</p>\n<p>Large estimate errors often indicate:</p>\n<ul>\n<li>stale statistics</li>\n<li>skewed data</li>\n<li>correlated columns</li>\n<li>parameter-sensitive values</li>\n<li>expressions the optimizer cannot estimate well</li>\n<li>missing multicolumn statistics</li>\n</ul>\n<p>Query optimization frequently begins by correcting the estimate, not by rewriting the query.</p>"
    },
    {
      "title": "6. Look for the first large divergence",
      "diagram": null,
      "body": "<p>Execution plans are trees.</p>\n<p>A slow operation near the top may only be expensive because a lower node produced far more rows than expected.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Aggregate\n  ↓\nSort\n  ↓\nJoin\n  ↓\nScan estimated 100 rows\n       actual 5 million rows\n</code></pre></div>\n<p>The sort is expensive, but the underlying cause is the scan estimate.</p>\n<p>A useful method:</p>\n<div class=\"callout\">\n<p>Start from the deepest nodes and find where estimated and actual row counts first diverge significantly.</p>\n</div>\n<p>That is often where the plan went wrong.</p>"
    },
    {
      "title": "7. Total time versus per-loop time",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>actual time=0.020..0.040 rows=1 loops=500000\n</code></pre></div>\n<p>One execution is cheap.</p>\n<p>But it runs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500,000 times\n</code></pre></div>\n<p>Approximate cumulative cost may be large.</p>\n<p>This is common with nested-loop joins and correlated subqueries.</p>\n<p>Never ignore the <code class=\"inline-code\">loops</code> value.</p>"
    },
    {
      "title": "8. Sequential scans",
      "diagram": null,
      "body": "<p>A sequential scan reads table pages in physical order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Page 1\nPage 2\nPage 3\n...\n</code></pre></div>\n<p>Developers often assume:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Sequential Scan = bad\n</code></pre></div>\n<p>That is incorrect.</p>\n<p>If a query needs 70% of a table, a sequential scan may be ideal.</p>\n<p>It benefits from:</p>\n<ul>\n<li>contiguous reads</li>\n<li>operating-system readahead</li>\n<li>fewer random page accesses</li>\n<li>simple CPU-efficient processing</li>\n</ul>\n<p>An index is most useful when it avoids reading a substantial portion of the table.</p>"
    },
    {
      "title": "9. Index scans",
      "diagram": null,
      "body": "<p>An index scan typically performs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>index lookup\n    ↓\nfind row location\n    ↓\nfetch table row\n</code></pre></div>\n<p>This is efficient for selective predicates.</p>\n<p>But if millions of scattered rows match, the database may perform millions of random heap/table accesses.</p>\n<p>At that point, a sequential scan may be cheaper.</p>"
    },
    {
      "title": "10. Bitmap scans",
      "diagram": null,
      "body": "<p>A bitmap plan sits between an index scan and a sequential scan.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Use index to collect matching row locations.\n2. Group row locations by table page.\n3. Read each required page once.\n</code></pre></div>\n<p>This is useful when:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>too many matches for individual random lookups\nbut too few matches for a full table scan\n</code></pre></div>\n<p>Example PostgreSQL plan:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Bitmap Heap Scan on payment\n  Recheck Cond: (status = 'FAILED')\n  -&gt; Bitmap Index Scan on idx_payment_status\n</code></pre></div>\n<p>A bitmap scan is often a perfectly healthy plan.</p>"
    },
    {
      "title": "11. Filtered rows",
      "diagram": null,
      "body": "<p>A plan may show:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Rows Removed by Filter: 9,800,000\n</code></pre></div>\n<p>while returning only:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>200 rows\n</code></pre></div>\n<p>That suggests the database found or scanned many rows and discarded most afterward.</p>\n<p>Possible improvements:</p>\n<ul>\n<li>better index</li>\n<li>more selective predicate earlier</li>\n<li>partial index</li>\n<li>composite index</li>\n<li>rewrite non-sargable condition</li>\n<li>partition pruning</li>\n</ul>\n<p>The goal is to avoid reading rows that will inevitably be rejected.</p>"
    },
    {
      "title": "12. Predicate pushdown",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM (\n    SELECT *\n    FROM payment\n) p\nWHERE p.status = 'FAILED';\n</code></pre></div>\n<p>A good optimizer pushes the predicate down:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>filter status before producing all rows\n</code></pre></div>\n<p>Predicate pushdown reduces the intermediate result set.</p>\n<p>The same principle applies to:</p>\n<ul>\n<li>views</li>\n<li>joins</li>\n<li>subqueries</li>\n<li>remote data sources</li>\n<li>partitioned tables</li>\n</ul>\n<p>You want selective predicates applied as early as logically possible.</p>"
    },
    {
      "title": "13. Projection pruning",
      "diagram": null,
      "body": "<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = ?;\n</code></pre></div>\n<p>If the caller needs only:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>id\namount\ncreated_at\n</code></pre></div>\n<p>request only those columns:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT id, amount, created_at\nFROM payment\nWHERE merchant_id = ?;\n</code></pre></div>\n<p>Benefits:</p>\n<ul>\n<li>less disk I/O</li>\n<li>smaller memory footprint</li>\n<li>less network traffic</li>\n<li>greater chance of index-only scan</li>\n<li>less ORM object creation</li>\n<li>fewer large text/JSON fields loaded</li>\n</ul>\n<p><code class=\"inline-code\">SELECT *</code> is often costly in production, especially on wide tables.</p>"
    },
    {
      "title": "14. Large object columns",
      "diagram": null,
      "body": "<p>Suppose <code class=\"inline-code\">payment</code> contains:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>request_payload JSONB\nresponse_payload JSONB\naudit_metadata JSONB\nfailure_stack_trace TEXT\n</code></pre></div>\n<p>A dashboard query may only need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>id, status, amount\n</code></pre></div>\n<p>Loading the entire entity can multiply:</p>\n<ul>\n<li>database I/O</li>\n<li>JDBC transfer</li>\n<li>heap usage</li>\n<li>serialization cost</li>\n</ul>\n<p>Use narrow projections for list screens and reports.</p>"
    },
    {
      "title": "15. Join algorithms",
      "diagram": null,
      "body": "<p>The three main join strategies are:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Nested-loop join\nHash join\nMerge join\n</code></pre></div>\n<p>Understanding them is central to query optimization.</p>"
    },
    {
      "title": "16. Nested-loop join",
      "diagram": null,
      "body": "<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>For each row from outer input:\n    find matching rows in inner input\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Outer: 10 merchants\nInner: indexed payments lookup per merchant\n</code></pre></div>\n<p>This can be excellent:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 outer rows\n×\nfast indexed inner lookup\n</code></pre></div>\n<p>But disastrous:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000,000 outer rows\n×\nfull inner scan\n</code></pre></div>\n<p>Nested loops work best when:</p>\n<ul>\n<li>outer input is small</li>\n<li>inner lookup is indexed</li>\n<li>result is selective</li>\n<li>query returns few rows</li>\n</ul>"
    },
    {
      "title": "17. Nested-loop explosion",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>outer rows = 500,000\ninner lookup = 2 ms\n</code></pre></div>\n<p>Total:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500,000 × 2 ms\n≈ 1,000 seconds\n</code></pre></div>\n<p>Each inner lookup looks fast in isolation.</p>\n<p>The repeated execution is the problem.</p>\n<p>In the plan, look for:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>loops=500000\n</code></pre></div>\n<p>on inner nodes.</p>"
    },
    {
      "title": "18. Hash join",
      "diagram": null,
      "body": "<p>A hash join usually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Reads one input.\n2. Builds an in-memory hash table.\n3. Reads the other input.\n4. Probes the hash table for matches.\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Build hash from 100,000 merchants\nProbe with 10 million payments\n</code></pre></div>\n<p>Hash joins are good for:</p>\n<ul>\n<li>equality joins</li>\n<li>larger result sets</li>\n<li>inputs that fit reasonably in memory</li>\n<li>cases where an index lookup per outer row would be expensive</li>\n</ul>\n<p>They do not naturally support range conditions such as:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>a.value &lt; b.value\n</code></pre></div>"
    },
    {
      "title": "19. Hash join spill",
      "diagram": null,
      "body": "<p>If the hash table does not fit in memory, the database may partition and write data to temporary disk files.</p>\n<p>Symptoms:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Batches: 32\ntemp read\ntemp written\n</code></pre></div>\n<p>or equivalent database-specific indicators.</p>\n<p>Disk-spilling hash joins can be much slower.</p>\n<p>Possible responses:</p>\n<ul>\n<li>reduce rows before the join</li>\n<li>improve predicates</li>\n<li>correct bad estimates</li>\n<li>increase query memory cautiously</li>\n<li>add suitable indexes</li>\n<li>change join order</li>\n<li>pre-aggregate one side</li>\n</ul>\n<p>Do not globally increase memory without calculating concurrency impact.</p>"
    },
    {
      "title": "20. Merge join",
      "diagram": null,
      "body": "<p>A merge join requires both inputs ordered by the join key:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Input A sorted by key\nInput B sorted by key\n</code></pre></div>\n<p>Then it advances through both streams:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>A1, A2, A3...\nB1, B2, B3...\n</code></pre></div>\n<p>Merge joins are useful for:</p>\n<ul>\n<li>equality joins</li>\n<li>range-like ordered processing</li>\n<li>large already-sorted inputs</li>\n<li>indexes that provide required ordering</li>\n</ul>\n<p>If sorting is required solely to enable the merge join, the sort cost may outweigh the benefit.</p>"
    },
    {
      "title": "21. Choosing a join strategy",
      "diagram": null,
      "body": "<p>Simplified intuition:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Small outer + indexed inner\n    nested loop\n\nLarge equality join\n    hash join\n\nLarge sorted inputs\n    merge join\n</code></pre></div>\n<p>But the optimizer considers:</p>\n<ul>\n<li>estimated row counts</li>\n<li>available indexes</li>\n<li>memory</li>\n<li>sort cost</li>\n<li>page caching</li>\n<li>parallelism</li>\n<li>expected output size</li>\n</ul>\n<p>The best join algorithm is data-dependent.</p>"
    },
    {
      "title": "22. Join order",
      "diagram": null,
      "body": "<p>For:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>A\nJOIN B\nJOIN C\n</code></pre></div>\n<p>the database may execute:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(A join B) join C\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>A join (B join C)\n</code></pre></div>\n<p>The best order usually reduces intermediate rows quickly.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>A = 100 million rows\nB = 10 million rows\nC = 1 matching row\n</code></pre></div>\n<p>Joining <code class=\"inline-code\">C</code> early may narrow the result dramatically.</p>\n<p>Bad cardinality estimates can make the optimizer choose an expensive order.</p>"
    },
    {
      "title": "23. Join cardinality explosion",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Customer has 10 orders.\nEach order has 20 items.\nEach item has 5 adjustments.\n</code></pre></div>\n<p>Joining everything creates:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 × 20 × 5 = 1,000 rows\n</code></pre></div>\n<p>even if the final result represents one customer.</p>\n<p>This can cause:</p>\n<ul>\n<li>huge intermediate results</li>\n<li>expensive sorting</li>\n<li>duplicate entity data</li>\n<li>excessive ORM hydration</li>\n</ul>\n<p>Sometimes the right solution is:</p>\n<ul>\n<li>pre-aggregate child data</li>\n<li>issue a focused secondary query</li>\n<li>use <code class=\"inline-code\">EXISTS</code></li>\n<li>return nested JSON from a controlled aggregation</li>\n<li>avoid fetching several collection relationships simultaneously</li>\n</ul>"
    },
    {
      "title": "24. `EXISTS` for existence checks",
      "diagram": null,
      "body": "<p>Suppose you only need merchants with at least one failed payment.</p>\n<p>Potentially inefficient:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT DISTINCT m.*\nFROM merchant m\nJOIN payment p\n  ON p.merchant_id = m.id\nWHERE p.status = 'FAILED';\n</code></pre></div>\n<p>This creates all matching join rows, then removes duplicates.</p>\n<p>Often clearer:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT m.*\nFROM merchant m\nWHERE EXISTS (\n    SELECT 1\n    FROM payment p\n    WHERE p.merchant_id = m.id\n      AND p.status = 'FAILED'\n);\n</code></pre></div>\n<p>The database can use a semi-join and stop after finding the first match.</p>"
    },
    {
      "title": "25. `EXISTS` versus `COUNT`",
      "diagram": null,
      "body": "<p>Bad existence check:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT COUNT(*)\nFROM payment\nWHERE merchant_id = ?\n  AND status = 'FAILED';\n</code></pre></div>\n<p>Application checks:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>count &gt; 0\n</code></pre></div>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT EXISTS (\n    SELECT 1\n    FROM payment\n    WHERE merchant_id = ?\n      AND status = 'FAILED'\n);\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT 1\nFROM payment\nWHERE merchant_id = ?\n  AND status = 'FAILED'\nLIMIT 1;\n</code></pre></div>\n<p>The query can stop at the first qualifying row.</p>"
    },
    {
      "title": "26. `NOT EXISTS` and null semantics",
      "diagram": null,
      "body": "<p>Suppose you want merchants with no payments.</p>\n<p>Safe pattern:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT m.*\nFROM merchant m\nWHERE NOT EXISTS (\n    SELECT 1\n    FROM payment p\n    WHERE p.merchant_id = m.id\n);\n</code></pre></div>\n<p>Be cautious with:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE id NOT IN (\n    SELECT merchant_id\n    FROM payment\n);\n</code></pre></div>\n<p>If the subquery contains <code class=\"inline-code\">NULL</code>, SQL's three-valued logic can produce surprising results.</p>\n<p><code class=\"inline-code\">NOT EXISTS</code> is often clearer and safer.</p>"
    },
    {
      "title": "27. Correlated subqueries",
      "diagram": null,
      "body": "<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT m.id,\n       (\n           SELECT COUNT(*)\n           FROM payment p\n           WHERE p.merchant_id = m.id\n       ) AS payment_count\nFROM merchant m;\n</code></pre></div>\n<p>This appears to execute one subquery per merchant.</p>\n<p>Some optimizers can transform it, but not always.</p>\n<p>For millions of merchants, this may become:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>millions of repeated payment lookups\n</code></pre></div>\n<p>Alternative:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT m.id, COUNT(p.id)\nFROM merchant m\nLEFT JOIN payment p\n  ON p.merchant_id = m.id\nGROUP BY m.id;\n</code></pre></div>\n<p>But this can also be expensive if only a few merchants are needed.</p>\n<p>Use the execution plan rather than assuming one form is always superior.</p>"
    },
    {
      "title": "28. Pre-aggregation",
      "diagram": null,
      "body": "<p>Suppose you need merchant totals.</p>\n<p>Instead of joining every payment row and aggregating later:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT m.id, SUM(p.amount)\nFROM merchant m\nJOIN payment p ON p.merchant_id = m.id\nGROUP BY m.id;\n</code></pre></div>\n<p>For more complex joins, pre-aggregate:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT m.id, totals.total_amount\nFROM merchant m\nJOIN (\n    SELECT merchant_id, SUM(amount) AS total_amount\n    FROM payment\n    GROUP BY merchant_id\n) totals\n  ON totals.merchant_id = m.id;\n</code></pre></div>\n<p>This can reduce join cardinality.</p>\n<p>But whether it improves the plan depends on filters and optimizer transformations.</p>"
    },
    {
      "title": "29. CTEs",
      "diagram": null,
      "body": "<p>A Common Table Expression:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WITH failed_payments AS (\n    SELECT *\n    FROM payment\n    WHERE status = 'FAILED'\n)\nSELECT *\nFROM failed_payments\nWHERE merchant_id = ?;\n</code></pre></div>\n<p>Historically, some databases treated CTEs as optimization fences:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>materialize entire CTE\nthen apply outer filter\n</code></pre></div>\n<p>Modern PostgreSQL can inline many CTEs unless explicitly materialized or referenced in ways that require materialization.</p>\n<p>You can specify:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WITH failed_payments AS NOT MATERIALIZED (...)\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WITH failed_payments AS MATERIALIZED (...)\n</code></pre></div>\n<p>when supported.</p>\n<p>Do not assume a CTE is merely formatting. Check the plan.</p>"
    },
    {
      "title": "30. When materialization helps",
      "diagram": null,
      "body": "<p>Materialization can be useful when:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>an expensive subquery is reused multiple times\n</code></pre></div>\n<p>Instead of recomputing it:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>compute once\nstore intermediate result\nreuse\n</code></pre></div>\n<p>But materialization costs:</p>\n<ul>\n<li>memory or temporary disk</li>\n<li>full evaluation before downstream processing</li>\n<li>potentially lost predicate pushdown</li>\n</ul>\n<p>It is a trade-off.</p>"
    },
    {
      "title": "31. `UNION` versus `UNION ALL`",
      "diagram": null,
      "body": "<p><code class=\"inline-code\">UNION</code> removes duplicates:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>result A\n+\nresult B\n+\nsort/hash duplicate elimination\n</code></pre></div>\n<p><code class=\"inline-code\">UNION ALL</code> simply appends results.</p>\n<p>If duplicates are acceptable or impossible:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT ...\nUNION ALL\nSELECT ...\n</code></pre></div>\n<p>is usually cheaper.</p>\n<p>Use <code class=\"inline-code\">UNION</code> only when duplicate removal is required.</p>"
    },
    {
      "title": "32. `DISTINCT` is often a symptom",
      "diagram": null,
      "body": "<p>Developers frequently add:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT DISTINCT ...\n</code></pre></div>\n<p>after a join produces duplicates.</p>\n<p>This may hide an incorrect or overly broad join.</p>\n<p>Before using <code class=\"inline-code\">DISTINCT</code>, ask:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Why are duplicates appearing?\n</code></pre></div>\n<p>Possible causes:</p>\n<ul>\n<li>one-to-many join</li>\n<li>missing join predicate</li>\n<li>fetching multiple collections</li>\n<li>wrong data model assumption</li>\n</ul>\n<p>A final deduplication step may require:</p>\n<ul>\n<li>sort</li>\n<li>hash aggregate</li>\n<li>substantial memory</li>\n<li>temporary disk</li>\n</ul>\n<p>Fixing the join is often better.</p>"
    },
    {
      "title": "33. Sorting",
      "diagram": null,
      "body": "<p>A query with:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY created_at DESC\n</code></pre></div>\n<p>may require a sort.</p>\n<p>If the input is large:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>read rows\n    ↓\nallocate sort memory\n    ↓\nsort\n    ↓\nreturn rows\n</code></pre></div>\n<p>If memory is insufficient, the sort spills to disk.</p>\n<p>Plans may report:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Sort Method: external merge\nDisk: 2048MB\n</code></pre></div>\n<p>This is a significant performance signal.</p>"
    },
    {
      "title": "34. Avoiding sorts with indexes",
      "diagram": null,
      "body": "<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = ?\nORDER BY created_at DESC\nLIMIT 50;\n</code></pre></div>\n<p>Index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(merchant_id, created_at DESC)\n</code></pre></div>\n<p>can provide rows in the needed order.</p>\n<p>The database can:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>seek to merchant\nread first 50 ordered entries\nstop\n</code></pre></div>\n<p>This avoids sorting millions of rows.</p>"
    },
    {
      "title": "35. Top-N sort",
      "diagram": null,
      "body": "<p>When a query includes:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY ...\nLIMIT 50\n</code></pre></div>\n<p>the database may use a top-N heap rather than fully sorting all rows.</p>\n<p>That is cheaper than a full sort, but it still requires examining all candidate rows unless an index provides the desired order.</p>\n<p>The strongest optimization is often reducing candidates or using an ordered index.</p>"
    },
    {
      "title": "36. Aggregation",
      "diagram": null,
      "body": "<p>Two common strategies:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Hash aggregate\nSort/group aggregate\n</code></pre></div>\n<p>Hash aggregation:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>build hash table keyed by group columns\n</code></pre></div>\n<p>Good when groups fit in memory.</p>\n<p>Sort aggregation:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>sort by group key\nprocess adjacent equal values\n</code></pre></div>\n<p>May benefit from existing index order.</p>\n<p>Large numbers of groups can make either strategy expensive.</p>"
    },
    {
      "title": "37. `COUNT(*)` can be expensive",
      "diagram": null,
      "body": "<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT COUNT(*)\nFROM payment;\n</code></pre></div>\n<p>On a large transactional table, an exact count may require scanning a large structure.</p>\n<p>MVCC databases cannot always maintain a simple exact row counter because different transactions may see different visible row sets.</p>\n<p>For dashboards, consider:</p>\n<ul>\n<li>approximate counts</li>\n<li>pre-aggregated counters</li>\n<li>asynchronously maintained summary tables</li>\n<li>cached statistics</li>\n</ul>\n<p>Do not perform exact billion-row counts on every page request.</p>"
    },
    {
      "title": "38. Conditional aggregation",
      "diagram": null,
      "body": "<p>Instead of multiple scans:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT COUNT(*)\nFROM payment\nWHERE status = 'SUCCESS';\n\nSELECT COUNT(*)\nFROM payment\nWHERE status = 'FAILED';\n</code></pre></div>\n<p>you may use one scan:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT\n    COUNT(*) FILTER (WHERE status = 'SUCCESS') AS success_count,\n    COUNT(*) FILTER (WHERE status = 'FAILED')  AS failed_count\nFROM payment;\n</code></pre></div>\n<p>Or portable <code class=\"inline-code\">CASE</code> expressions:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END)\n</code></pre></div>\n<p>This can reduce repeated table access.</p>"
    },
    {
      "title": "39. Window functions",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *,\n       ROW_NUMBER() OVER (\n           PARTITION BY merchant_id\n           ORDER BY created_at DESC\n       ) AS row_num\nFROM payment;\n</code></pre></div>\n<p>Window functions often require:</p>\n<ul>\n<li>sorting</li>\n<li>partitioning</li>\n<li>large intermediate results</li>\n</ul>\n<p>They are powerful but can be costly.</p>\n<p>If you need only the latest payment per merchant, database-specific alternatives may be faster:</p>\n<ul>\n<li>indexed lateral lookup</li>\n<li><code class=\"inline-code\">DISTINCT ON</code> in PostgreSQL</li>\n<li>grouped maximum plus join</li>\n<li>window function with correct index</li>\n</ul>\n<p>Measure each approach on representative data.</p>"
    },
    {
      "title": "40. Latest row per group",
      "diagram": null,
      "body": "<p>PostgreSQL example:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT DISTINCT ON (merchant_id)\n       merchant_id,\n       id,\n       status,\n       created_at\nFROM payment\nORDER BY merchant_id, created_at DESC, id DESC;\n</code></pre></div>\n<p>Candidate index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(merchant_id, created_at DESC, id DESC)\n</code></pre></div>\n<p>Another approach:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT m.id,\n       p.*\nFROM merchant m\nLEFT JOIN LATERAL (\n    SELECT *\n    FROM payment p\n    WHERE p.merchant_id = m.id\n    ORDER BY p.created_at DESC, p.id DESC\n    LIMIT 1\n) p ON true;\n</code></pre></div>\n<p>The better plan depends on:</p>\n<ul>\n<li>number of merchants</li>\n<li>number of payments</li>\n<li>filtering</li>\n<li>index availability</li>\n</ul>"
    },
    {
      "title": "41. Pagination",
      "diagram": null,
      "body": "<p>Offset pagination:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY created_at DESC\nOFFSET 500000\nLIMIT 50;\n</code></pre></div>\n<p>The database may still walk or produce 500,050 rows.</p>\n<p>Keyset pagination:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE (created_at, id) &lt; (?, ?)\nORDER BY cr\n\n&gt; Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.\n</code></pre></div>"
    }
  ],
  "keyTakeaways": [
    "Read actual execution plans and compare estimates with actual rows.",
    "Look for repeated loops, discarded rows, spills, and oversized intermediate results.",
    "Choose join, sort, aggregation, projection, and pagination strategies from data shape.",
    "Remove accidental N+1, unnecessary DISTINCT, SELECT *, and deep OFFSET work.",
    "Change one thing at a time and measure again on representative data."
  ]
};
