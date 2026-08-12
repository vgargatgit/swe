window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-25-database-indexing"] = {
  "day": 25,
  "title": "Database Indexing",
  "subtitle": "Use extra data structures to reduce lookup work while paying storage and write cost.",
  "tags": [
    "Database indexing",
    "B-tree",
    "Composite index",
    "Selectivity",
    "Sargability",
    "Pagination"
  ],
  "core": "A database index trades additional storage and write cost for faster data access. The goal is not to “add indexes to columns.” The goal is to create the smallest useful data structure that matches the database’s actual query patterns.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Query --> Index[(B-tree / specialized index)]\n  Index --> Candidate[Matching row locations]\n  Candidate --> Table[(Table pages)]\n  Write[INSERT / UPDATE / DELETE] --> Index\n  Write --> Table",
      "body": "<p>An index is conceptually similar to a book index:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Without an index:\nRead every page until you find “distributed transactions.”\n\nWith an index:\nLook up the term, find the page numbers, then jump directly there.\n</code></pre></div>\n<p>In a database:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Without index\n    scan many rows\n\nWith index\n    navigate index\n    locate matching rows\n</code></pre></div>\n<p>But every index must also be maintained during inserts, updates, and deletes.</p>"
    },
    {
      "title": "1. The problem indexes solve",
      "diagram": null,
      "body": "<p>Suppose this table contains 100 million payments:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE TABLE payment (\n    id              BIGINT PRIMARY KEY,\n    merchant_id     BIGINT NOT NULL,\n    customer_id     BIGINT NOT NULL,\n    status          VARCHAR(30) NOT NULL,\n    amount          NUMERIC(19, 2) NOT NULL,\n    created_at      TIMESTAMP NOT NULL\n);\n</code></pre></div>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = 8421;\n</code></pre></div>\n<p>Without a suitable index, the database may perform:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Sequential scan\n    ↓\nRead row 1\nRead row 2\nRead row 3\n...\nRead row 100,000,000\n</code></pre></div>\n<p>Time complexity is roughly:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>O(number of table rows)\n</code></pre></div>\n<p>Add:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_merchant\n    ON payment (merchant_id);\n</code></pre></div>\n<p>Now the database can locate index entries for merchant <code class=\"inline-code\">8421</code> and fetch the matching table rows.</p>"
    },
    {
      "title": "2. An index is a separate data structure",
      "diagram": null,
      "body": "<p>A common misconception is that an index somehow rearranges every table query automatically.</p>\n<p>The database usually stores:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Table data\n+\nIndex data\n</code></pre></div>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Index\n\nmerchant_id      row location\n--------------------------------\n1001             → row A\n1001             → row F\n1002             → row C\n8421             → row B\n8421             → row D\n</code></pre></div>\n<p>The index contains:</p>\n<ul>\n<li>indexed key values</li>\n<li>row identifiers or primary-key values</li>\n<li>optional included columns</li>\n<li>structural metadata</li>\n</ul>\n<p>This means indexing consumes:</p>\n<ul>\n<li>disk</li>\n<li>memory/cache</li>\n<li>write I/O</li>\n<li>maintenance time</li>\n</ul>"
    },
    {
      "title": "3. B-tree indexes",
      "diagram": null,
      "body": "<p>The default index in most relational databases is a B-tree or B+-tree variant.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>                    [40 | 80]\n                   /    |    \\\n                  /     |     \\\n         [10 20 30] [50 60] [90 100]\n</code></pre></div>\n<p>The tree is:</p>\n<ul>\n<li>balanced</li>\n<li>sorted</li>\n<li>shallow</li>\n<li>optimized for storage pages</li>\n</ul>\n<p>A lookup does not walk millions of entries.</p>\n<p>It navigates a small number of levels:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>root\n  ↓\ninternal page\n  ↓\nleaf page\n</code></pre></div>\n<p>Even very large indexes may require only a handful of page reads.</p>"
    },
    {
      "title": "4. Why B-trees support more than equality",
      "diagram": null,
      "body": "<p>Because the leaf entries are sorted, B-tree indexes support:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id = 8421\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id &gt; 8421\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id BETWEEN 8000 AND 9000\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY merchant_id\n</code></pre></div>\n<p>and sometimes:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT MIN(merchant_id)\n</code></pre></div>\n<p>The sorted structure makes range traversal efficient.</p>"
    },
    {
      "title": "5. Index lookup has two stages",
      "diagram": null,
      "body": "<p>For a normal secondary index query:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Search index.\n2. Fetch matching table rows.\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = 8421;\n</code></pre></div>\n<p>The index identifies row locations, but <code class=\"inline-code\">SELECT *</code> requires all columns.</p>\n<p>The database may perform many table-page reads after scanning the index.</p>\n<p>This distinction is important:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Index lookup is cheap\nbut row fetching may still be expensive\n</code></pre></div>"
    },
    {
      "title": "6. When an index may not help",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 million rows\n60 million have status = 'SUCCESS'\n</code></pre></div>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE status = 'SUCCESS';\n</code></pre></div>\n<p>An index on <code class=\"inline-code\">status</code> may locate 60 million index entries, then fetch 60 million table rows.</p>\n<p>That can be slower than simply reading the table sequentially.</p>\n<p>The optimizer may decide:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Sequential scan is cheaper.\n</code></pre></div>\n<p>An index is not automatically used just because it exists.</p>"
    },
    {
      "title": "7. Selectivity",
      "diagram": null,
      "body": "<p>Selectivity describes how strongly a value narrows the result set.</p>\n<p>Highly selective:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment_id = 987654321\n</code></pre></div>\n<p>Likely returns one row.</p>\n<p>Low selectivity:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>status = 'SUCCESS'\n</code></pre></div>\n<p>May return most rows.</p>\n<p>A rough measure:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>selectivity ≈ distinct values / total rows\n</code></pre></div>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Email address\n    high selectivity\n\nCountry code\n    low selectivity\n\nBoolean active flag\n    very low selectivity\n</code></pre></div>\n<p>But selectivity alone does not determine index value. Query shape and table distribution also matter.</p>"
    },
    {
      "title": "8. Cardinality",
      "diagram": null,
      "body": "<p>Cardinality usually means the number of distinct values.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 million payments\n\nstatus:\n    5 distinct values\n\nmerchant_id:\n    500,000 distinct values\n\npayment_id:\n    100 million distinct values\n</code></pre></div>\n<p>Higher-cardinality columns often make stronger equality indexes.</p>\n<p>However, a low-cardinality column can still be useful when combined with another column or in a partial index.</p>"
    },
    {
      "title": "9. Composite indexes",
      "diagram": null,
      "body": "<p>Suppose the common query is:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = 8421\n  AND status = 'FAILED';\n</code></pre></div>\n<p>Possible index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_merchant_status\n    ON payment (merchant_id, status);\n</code></pre></div>\n<p>This is one index containing ordered pairs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(merchant_id, status)\n</code></pre></div>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(1001, FAILED)\n(1001, SUCCESS)\n(1002, FAILED)\n(8421, FAILED)\n(8421, SUCCESS)\n</code></pre></div>\n<p>Column order matters.</p>"
    },
    {
      "title": "10. The leftmost-prefix rule",
      "diagram": null,
      "body": "<p>For an index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(merchant_id, status, created_at)\n</code></pre></div>\n<p>The index can commonly support predicates beginning from the left:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id = ?\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id = ?\n  AND status = ?\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id = ?\n  AND status = ?\n  AND created_at &gt;= ?\n</code></pre></div>\n<p>But it generally cannot efficiently seek directly using only:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE status = ?\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE created_at &gt;= ?\n</code></pre></div>\n<p>because the index is primarily grouped by <code class=\"inline-code\">merchant_id</code>.</p>\n<p>Think of a telephone directory ordered by:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>last_name, first_name, city\n</code></pre></div>\n<p>You can efficiently find:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>last_name\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>last_name + first_name\n</code></pre></div>\n<p>But finding everyone with a particular <code class=\"inline-code\">city</code> requires scanning much of the directory.</p>"
    },
    {
      "title": "11. Equality columns before range columns",
      "diagram": null,
      "body": "<p>Suppose the query is:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = ?\n  AND status = ?\n  AND created_at &gt;= ?\nORDER BY created_at;\n</code></pre></div>\n<p>A strong candidate is:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_merchant_status_created\n    ON payment (merchant_id, status, created_at);\n</code></pre></div>\n<p>Why?</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>merchant_id = equality\nstatus      = equality\ncreated_at  = range + ordering\n</code></pre></div>\n<p>The database can:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>seek to exact merchant/status group\nthen scan a contiguous created_at range\n</code></pre></div>\n<p>A useful heuristic is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>equality predicates first\nthen range/order columns\n</code></pre></div>\n<p>It is a heuristic, not an absolute rule. Actual data distribution and query mix still matter.</p>"
    },
    {
      "title": "12. The first range often limits later index use",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_example\n    ON payment (merchant_id, created_at, status);\n</code></pre></div>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id = ?\n  AND created_at &gt;= ?\n  AND status = 'FAILED'\n</code></pre></div>\n<p>The index can seek to the merchant and then scan the <code class=\"inline-code\">created_at</code> range.</p>\n<p>But once it begins scanning a range of <code class=\"inline-code\">created_at</code>, <code class=\"inline-code\">status</code> may no longer narrow the index traversal as efficiently.</p>\n<p>It may still be evaluated from the index, but not necessarily used to define a tight seek range.</p>\n<p>That is why this order might be better for that query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(merchant_id, status, created_at)\n</code></pre></div>"
    },
    {
      "title": "13. Composite index order is driven by queries",
      "diagram": null,
      "body": "<p>Do not choose column order solely by cardinality.</p>\n<p>Suppose the query always starts with:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE tenant_id = ?\n</code></pre></div>\n<p>Even if <code class=\"inline-code\">tenant_id</code> has lower cardinality than <code class=\"inline-code\">invoice_number</code>, tenant-first may be correct:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(tenant_id, invoice_number)\n</code></pre></div>\n<p>because:</p>\n<ul>\n<li>every query is tenant-scoped</li>\n<li>tenant isolation is part of access patterns</li>\n<li>the index groups each tenant's rows together</li>\n<li>uniqueness may be tenant-relative</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE UNIQUE INDEX uq_invoice_tenant_number\n    ON invoice (tenant_id, invoice_number);\n</code></pre></div>"
    },
    {
      "title": "14. Composite index versus separate indexes",
      "diagram": null,
      "body": "<p>Suppose you have:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_merchant\n    ON payment (merchant_id);\n\nCREATE INDEX idx_payment_status\n    ON payment (status);\n</code></pre></div>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE merchant_id = ?\n  AND status = ?\n</code></pre></div>\n<p>Some databases can combine indexes using bitmap or index-merge strategies.</p>\n<p>But a composite index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(merchant_id, status)\n</code></pre></div>\n<p>is often more efficient for that exact query because it directly stores the combined ordering.</p>\n<p>Separate indexes are not equivalent to one composite index.</p>"
    },
    {
      "title": "15. Indexes and `ORDER BY`",
      "diagram": null,
      "body": "<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT id, amount, created_at\nFROM payment\nWHERE merchant_id = ?\nORDER BY created_at DESC\nLIMIT 50;\n</code></pre></div>\n<p>A useful index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_merchant_created\n    ON payment (merchant_id, created_at DESC);\n</code></pre></div>\n<p>The database can:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>seek to merchant\nread first 50 entries in desired order\nstop\n</code></pre></div>\n<p>Without matching index order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>find all merchant payments\nsort them\nreturn first 50\n</code></pre></div>\n<p>The difference can be enormous.</p>"
    },
    {
      "title": "16. Why `LIMIT` makes index ordering powerful",
      "diagram": null,
      "body": "<p>Suppose one merchant has 10 million payments.</p>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY created_at DESC\nLIMIT 20\n</code></pre></div>\n<p>With the right index:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>read approximately 20 index entries\n</code></pre></div>\n<p>Without it:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>read many matching rows\nsort or top-N process them\nthen return 20\n</code></pre></div>\n<p>Pagination queries often benefit strongly from compound indexes matching:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>filter columns + sort columns\n</code></pre></div>"
    },
    {
      "title": "17. Mixed sort directions",
      "diagram": null,
      "body": "<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY created_at DESC, id ASC\n</code></pre></div>\n<p>The exact index direction can matter, especially for multi-column ordering.</p>\n<p>Candidate:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_created_id\n    ON payment (created_at DESC, id ASC);\n</code></pre></div>\n<p>Modern databases can scan an index backward, but mixed directions deserve careful verification using the execution plan.</p>"
    },
    {
      "title": "18. Stable ordering",
      "diagram": null,
      "body": "<p>Pagination should use deterministic ordering.</p>\n<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY created_at DESC\n</code></pre></div>\n<p>If many rows share the same timestamp, row order can change between requests.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>ORDER BY created_at DESC, id DESC\n</code></pre></div>\n<p>Matching index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_merchant_created_id\n    ON payment (merchant_id, created_at DESC, id DESC);\n</code></pre></div>\n<p>The primary key acts as a tie-breaker.</p>"
    },
    {
      "title": "19. Offset pagination problem",
      "diagram": null,
      "body": "<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = ?\nORDER BY created_at DESC, id DESC\nOFFSET 500000\nLIMIT 50;\n</code></pre></div>\n<p>Even with an index, the database may need to walk past 500,000 entries before returning 50.</p>\n<p>Cost grows with offset.</p>\n<p>Better: keyset or cursor pagination.</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM payment\nWHERE merchant_id = ?\n  AND (created_at, id) &lt; (?, ?)\nORDER BY created_at DESC, id DESC\nLIMIT 50;\n</code></pre></div>\n<p>Matching index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(merchant_id, created_at DESC, id DESC)\n</code></pre></div>\n<p>This seeks near the cursor instead of skipping a huge prefix.</p>"
    },
    {
      "title": "20. Covering indexes",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT id, amount, created_at\nFROM payment\nWHERE merchant_id = ?\nORDER BY created_at DESC\nLIMIT 50;\n</code></pre></div>\n<p>If the index contains all required columns, the database may answer without fetching the table rows.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Index-only scan\n</code></pre></div>\n<p>PostgreSQL example:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_merchant_created_cover\n    ON payment (merchant_id, created_at DESC)\n    INCLUDE (id, amount);\n</code></pre></div>\n<p>The key columns define search/order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>merchant_id, created_at\n</code></pre></div>\n<p>Included columns are carried for coverage:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>id, amount\n</code></pre></div>"
    },
    {
      "title": "21. Why not put every column in the index key?",
      "diagram": null,
      "body": "<p>You could create:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>(merchant_id, created_at, id, amount, customer_id, status, ...)\n</code></pre></div>\n<p>But that makes the index:</p>\n<ul>\n<li>larger</li>\n<li>slower to update</li>\n<li>harder to cache</li>\n<li>more expensive to maintain</li>\n<li>potentially less reusable</li>\n</ul>\n<p><code class=\"inline-code\">INCLUDE</code> columns can cover a query without participating in the key ordering.</p>\n<p>Use covering indexes selectively for hot read paths.</p>"
    },
    {
      "title": "22. Index-only does not always mean zero table access",
      "diagram": null,
      "body": "<p>In PostgreSQL, an index-only scan may still need to check table visibility unless the visibility map shows that the page is all-visible.</p>\n<p>Therefore:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>index contains all columns\n</code></pre></div>\n<p>does not absolutely guarantee:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>no heap access\n</code></pre></div>\n<p>Frequent updates can reduce the benefit of index-only scans.</p>\n<p>This is a good example of why execution plans and production measurements matter.</p>"
    },
    {
      "title": "23. Primary-key indexes",
      "diagram": null,
      "body": "<p>A primary key normally creates a unique index automatically.</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>PRIMARY KEY (id)\n</code></pre></div>\n<p>You usually do not need an additional:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX ... ON table(id);\n</code></pre></div>\n<p>That would be redundant.</p>\n<p>Similarly, a unique constraint usually creates a unique index.</p>"
    },
    {
      "title": "24. Unique indexes enforce correctness",
      "diagram": null,
      "body": "<p>An index is not only a performance structure.</p>\n<p>It can enforce invariants.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE UNIQUE INDEX uq_processed_event_consumer_event\n    ON processed_event (consumer_name, event_id);\n</code></pre></div>\n<p>This guarantees that a consumer processes an event once, even under concurrency.</p>\n<p>Application code like:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>if (!exists(eventId)) {\n    insert(eventId);\n}\n</code></pre></div>\n<p>is race-prone.</p>\n<p>The unique index is the concurrency-safe final guard.</p>"
    },
    {
      "title": "25. Multi-tenant uniqueness",
      "diagram": null,
      "body": "<p>Suppose usernames are unique within a tenant, not globally.</p>\n<p>Correct:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE UNIQUE INDEX uq_user_tenant_username\n    ON app_user (tenant_id, username);\n</code></pre></div>\n<p>Incorrect:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>UNIQUE(username)\n</code></pre></div>\n<p>unless business rules require global uniqueness.</p>\n<p>Indexes should encode domain invariants accurately.</p>"
    },
    {
      "title": "26. Partial indexes",
      "diagram": null,
      "body": "<p>Suppose most jobs are completed, but queries frequently access active jobs:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM job\nWHERE status IN ('PENDING', 'RUNNING')\nORDER BY created_at;\n</code></pre></div>\n<p>Instead of indexing every row:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_job_active\n    ON job (created_at)\n    WHERE status IN ('PENDING', 'RUNNING');\n</code></pre></div>\n<p>This partial index contains only active jobs.</p>\n<p>Benefits:</p>\n<ul>\n<li>smaller</li>\n<li>cheaper to maintain</li>\n<li>more cache-friendly</li>\n<li>focused on the hot subset</li>\n</ul>"
    },
    {
      "title": "27. Soft-delete partial uniqueness",
      "diagram": null,
      "body": "<p>Suppose rows are soft-deleted:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>deleted_at IS NULL means active\n</code></pre></div>\n<p>You want active email addresses to be unique, but allow reuse after deletion.</p>\n<p>PostgreSQL:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE UNIQUE INDEX uq_active_user_email\n    ON app_user (lower(email))\n    WHERE deleted_at IS NULL;\n</code></pre></div>\n<p>This combines:</p>\n<ul>\n<li>partial indexing</li>\n<li>functional indexing</li>\n<li>uniqueness enforcement</li>\n</ul>"
    },
    {
      "title": "28. Functional or expression indexes",
      "diagram": null,
      "body": "<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM app_user\nWHERE lower(email) = lower(?);\n</code></pre></div>\n<p>A normal index on:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>email\n</code></pre></div>\n<p>may not support <code class=\"inline-code\">lower(email)</code> efficiently.</p>\n<p>Create:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_user_lower_email\n    ON app_user (lower(email));\n</code></pre></div>\n<p>Now the indexed expression matches the query expression.</p>\n<p>The expression must match closely enough for the optimizer to use it.</p>"
    },
    {
      "title": "29. Sargability",
      "diagram": null,
      "body": "<p>A predicate is sargable when the database can use it as an index search argument.</p>\n<p>Good:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE created_at &gt;= TIMESTAMP '2026-08-01 00:00:00'\n  AND created_at &lt;  TIMESTAMP '2026-08-02 00:00:00'\n</code></pre></div>\n<p>Less index-friendly:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE DATE(created_at) = DATE '2026-08-01'\n</code></pre></div>\n<p>The function is applied to every row's indexed column.</p>\n<p>Rewrite the predicate as a range whenever possible.</p>"
    },
    {
      "title": "30. More sargability examples",
      "diagram": null,
      "body": "<p>Potentially index-friendly:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE amount &gt;= 100\n</code></pre></div>\n<p>Potentially not:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE amount + 10 &gt;= 110\n</code></pre></div>\n<p>Index-friendly prefix search:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE name LIKE 'Vikas%'\n</code></pre></div>\n<p>Usually not B-tree-friendly:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE name LIKE '%Vikas%'\n</code></pre></div>\n<p>The leading wildcard prevents seeking to a known ordered prefix.</p>\n<p>For substring or full-text searches, use specialized indexes.</p>"
    },
    {
      "title": "31. Implicit type conversions",
      "diagram": null,
      "body": "<p>Suppose <code class=\"inline-code\">customer_id</code> is a numeric column:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>customer_id BIGINT\n</code></pre></div>\n<p>But the application binds a string in a way that causes the database to cast the indexed column:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE CAST(customer_id AS TEXT) = '123'\n</code></pre></div>\n<p>This may prevent efficient index use.</p>\n<p>Prefer matching parameter and column types.</p>\n<p>In Java/JPA:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Long property\n↔ BIGINT column\n</code></pre></div>\n<p>not a string representation passed throughout the query layer.</p>"
    },
    {
      "title": "32. Indexes on foreign keys",
      "diagram": null,
      "body": "<p>A foreign-key constraint does not always automatically create an index on the referencing column.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>order_item.order_id\n</code></pre></div>\n<p>Queries frequently do:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM order_item\nWHERE order_id = ?;\n</code></pre></div>\n<p>The foreign-key column usually deserves an index:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_order_item_order\n    ON order_item (order_id);\n</code></pre></div>\n<p>It also helps parent deletes/updates verify referencing rows efficiently.</p>\n<p>Database behavior differs, so verify whether indexes are created automatically.</p>"
    },
    {
      "title": "33. Low-cardinality indexes can still matter",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>status = 'PENDING'\n</code></pre></div>\n<p>Suppose only 0.1% of rows are pending.</p>\n<p>Even though <code class=\"inline-code\">status</code> has few distinct values, the specific value is highly selective.</p>\n<p>A partial index may be excellent:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE INDEX idx_payment_pending\n    ON payment (created_at)\n    WHERE status = 'PENDING';\n</code></pre></div>\n<p>Column cardinality alone does not describe value distribution.</p>"
    },
    {
      "title": "34. Data skew",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>status:\n    SUCCESS = 99.8%\n    FAILED  = 0.1%\n    PENDING = 0.1%\n</code></pre></div>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE status = 'FAILED'\n</code></pre></div>\n<p>may benefit greatly from an index.</p>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE status = 'SUCCESS'\n</code></pre></div>\n<p>may not.</p>\n<p>The same column and index can have very different usefulness for different values.</p>\n<p>The optimizer relies on statistics to estimate this.</p>"
    },
    {
      "title": "35. Statistics and cardinality estimation",
      "diagram": null,
      "body": "<p>The query optimizer does not execute every possible plan.</p>\n<p>It estimates:</p>\n<ul>\n<li>expected row count</li>\n<li>selectivity</li>\n<li>page reads</li>\n<li>join sizes</li>\n<li>sort cost</li>\n<li>CPU cost</li>\n</ul>\n<p>Based on statistics such as:</p>\n<ul>\n<li>row count</li>\n<li>distinct values</li>\n<li>histograms</li>\n<li>null fraction</li>\n<li>value frequency</li>\n<li>column correlation</li>\n</ul>\n<p>If estimates are wrong, the optimizer may choose a bad plan.</p>"
    },
    {
      "title": "36. Stale statistics",
      "diagram": null,
      "body": "<p>After a large data load:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>table grows from 1 million to 100 million rows\n</code></pre></div>\n<p>but statistics remain stale.</p>\n<p>The optimizer may believe:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>query returns 100 rows\n</code></pre></div>\n<p>when it returns:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 million rows\n</code></pre></div>\n<p>Possible result:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>nested-loop plan\n</code></pre></div>\n<p>when a hash join or sequential scan would be better.</p>\n<p>Regular statistics maintenance is essential.</p>\n<p>PostgreSQL uses <code class=\"inline-code\">ANALYZE</code>, usually driven by autovacuum.</p>"
    },
    {
      "title": "37. Correlated columns",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>country = 'IN'\ncity = 'Mumbai'\n</code></pre></div>\n<p>These columns are correlated.</p>\n<p>Basic statistics may incorrectly estimate them as independent.</p>\n<p>The optimizer might estimate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>P(country='IN') × P(city='Mumbai')\n</code></pre></div>\n<p>even though nearly every Mumbai row is in India.</p>\n<p>Some databases support extended/multicolumn statistics to improve such estimates.</p>\n<p>This matters for complex filters and joins.</p>"
    },
    {
      "title": "38. Clustered versus secondary indexes",
      "diagram": null,
      "body": "<p>The term varies across databases.</p>\n<h4>InnoDB</h4>\n<p>The primary key is clustered:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>table rows are stored in primary-key order\n</code></pre></div>\n<p>Secondary indexes contain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>secondary key\n+\nprimary-key value\n</code></pre></div>\n<p>A secondary lookup may require:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>secondary index\n    ↓\nprimary-key lookup\n    ↓\nrow\n</code></pre></div>\n<p>This makes primary-key width important because it is repeated in every secondary index.</p>\n\n<h4>PostgreSQL</h4>\n<p>Tables are heap-organized.</p>\n<p>Indexes contain references to heap tuples.</p>\n<p>PostgreSQL has a <code class=\"inline-code\">CLUSTER</code> operation that physically rewrites the table according to an index, but this ordering is not automatically preserved by later writes.</p>\n<p>So “clustered index” semantics are database-specific.</p>"
    },
    {
      "title": "39. Primary-key width matters",
      "diagram": null,
      "body": "<p>In InnoDB, consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>UUID text primary key\n</code></pre></div>\n<p>versus:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BIGINT primary key\n</code></pre></div>\n<p>Every secondary index contains the primary-key value.</p>\n<p>A wider primary key means:</p>\n<ul>\n<li>larger secondary indexes</li>\n<li>more cache usage</li>\n<li>more I/O</li>\n<li>lower page density</li>\n</ul>\n<p>This does not mean</p>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "Design indexes from real predicates, ordering, projections, and pagination.",
    "Composite-index order determines which prefixes and ranges are efficient.",
    "Low-cardinality values can still be useful when skew or partial indexes make them selective.",
    "Indexes enforce domain uniqueness as well as performance.",
    "Validate choices with statistics and execution plans, and include write/maintenance cost."
  ]
};
