window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-28-connection-pooling"] = {
  "day": 28,
  "title": "Connection Pooling",
  "subtitle": "Reuse database sessions and impose a concurrency boundary between the application and database.",
  "tags": [
    "Connection pooling",
    "HikariCP",
    "Pool sizing",
    "Leaks",
    "Admission control",
    "Transactions"
  ],
  "core": "A database connection pool is both a reuse mechanism and an admission-control boundary . It avoids repeatedly creating expensive physical connections while limiting how much concurrent work the application can push into the database.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Requests[Application work] --> Pool[Connection pool]\n  Pool --> C1[Connection 1]\n  Pool --> C2[Connection 2]\n  Pool --> C3[Connection 3]\n  C1 --> DB[(Database)]\n  C2 --> DB\n  C3 --> DB\n  Requests -. pending / timeout .-> Pool",
      "body": "<p>The dangerous misconception is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>More connections\n    =\nMore throughput\n</code></pre></div>\n<p>The real relationship is usually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Too few connections\n    → application threads wait unnecessarily\n\nEnough connections\n    → database resources remain efficiently utilized\n\nToo many connections\n    → contention, queueing, memory pressure,\n      lock competition and worse tail latency\n</code></pre></div>\n<p>A pool should be large enough to keep the database productively busy, but small enough to protect it from excessive concurrency.</p>"
    },
    {
      "title": "1. What is a database connection?",
      "diagram": null,
      "body": "<p>A JDBC connection represents a stateful session between the application and the database.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Application\n    │\n    │ TCP/TLS connection\n    │ authentication\n    │ database session\n    ▼\nDatabase\n</code></pre></div>\n<p>A physical connection may carry session state such as:</p>\n<ul>\n<li>current transaction</li>\n<li>isolation level</li>\n<li>read-only mode</li>\n<li>auto-commit mode</li>\n<li>current schema</li>\n<li>temporary tables</li>\n<li>prepared statements</li>\n<li>session variables</li>\n<li>advisory locks</li>\n</ul>\n<p>Creating one can require:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DNS lookup\nTCP handshake\nTLS handshake\nauthentication\nsession initialization\n</code></pre></div>\n<p>Opening a new physical connection for every SQL operation would add latency and create substantial database overhead.</p>"
    },
    {
      "title": "2. Without connection pooling",
      "diagram": null,
      "body": "<p>Naive flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public Payment findPayment(long id) throws SQLException {\n    try (Connection connection =\n                 DriverManager.getConnection(url, username, password)) {\n\n        // Execute query.\n    }\n}\n</code></pre></div>\n<p>Every call performs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Create physical connection\n    ↓\nAuthenticate\n    ↓\nExecute query\n    ↓\nClose physical connection\n</code></pre></div>\n<p>At 2,000 requests per second:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>2,000 connection creations/sec\n</code></pre></div>\n<p>The application and database spend significant effort managing connections rather than executing useful SQL.</p>"
    },
    {
      "title": "3. With connection pooling",
      "diagram": null,
      "body": "<p>A pool creates and maintains reusable physical connections:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>                    Connection Pool\n\n                  ┌───────────────┐\nRequest A ───────►│ Connection 1  │\nRequest B ───────►│ Connection 2  │\nRequest C waits   │ Connection 3  │\n                  └───────────────┘\n                         │\n                         ▼\n                      Database\n</code></pre></div>\n<p>Application flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Borrow connection\n    ↓\nExecute transaction\n    ↓\nReturn connection\n</code></pre></div>\n<p>The physical database session remains available for reuse.</p>"
    },
    {
      "title": "4. `close()` usually means “return”",
      "diagram": null,
      "body": "<p>With a pooled <code class=\"inline-code\">DataSource</code>:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>try (Connection connection = dataSource.getConnection()) {\n    // Use connection.\n}\n</code></pre></div>\n<p>calling:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>connection.close();\n</code></pre></div>\n<p>normally does not close the physical database connection.</p>\n<p>The application receives a wrapper or proxy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Application connection proxy\n            │\n            ▼\nPhysical database connection\n</code></pre></div>\n<p>Closing the proxy returns the physical connection to the pool.</p>\n<p>Therefore, try-with-resources remains exactly the correct pattern.</p>"
    },
    {
      "title": "5. Pooling is also admission control",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>HTTP worker threads = 200\nPool size           = 20\n</code></pre></div>\n<p>At most 20 requests can actively use database connections at one time.</p>\n<p>The remaining database-bound requests wait at the pool:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>200 request threads\n        │\n        ▼\n20 database connections\n        │\n        ▼\nDatabase\n</code></pre></div>\n<p>This protects the database from all 200 requests executing SQL simultaneously.</p>\n<p>The pool is effectively a semaphore around the database.</p>"
    },
    {
      "title": "6. Pool state",
      "diagram": null,
      "body": "<p>A connection pool generally exposes four important states:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Total\n    all physical connections owned by pool\n\nActive\n    currently borrowed\n\nIdle\n    available for immediate borrowing\n\nPending\n    callers waiting for a connection\n</code></pre></div>\n<p>Relationship:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>total = active + idle\n</code></pre></div>\n<p>When:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>active = maximum pool size\nidle   = 0\n</code></pre></div>\n<p>new callers enter the pending queue.</p>"
    },
    {
      "title": "7. What happens when the pool is exhausted?",
      "diagram": null,
      "body": "<p>Suppose the maximum size is 20:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>20 active\n0 idle\n15 waiting\n</code></pre></div>\n<p>Each waiting caller blocks until:</p>\n<ul>\n<li>another transaction returns a connection, or</li>\n<li>the acquisition timeout expires</li>\n</ul>\n<p>In HikariCP, <code class=\"inline-code\">connectionTimeout</code> controls how long <code class=\"inline-code\">getConnection()</code> waits when no pooled connection is available; once it expires, the caller receives an exception. HikariCP currently documents a 30-second default, but that default is usually far too long for a latency-sensitive API.</p>\n<p>Typical exception:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connection is not available,\nrequest timed out after 500ms\n</code></pre></div>\n<p>This does not necessarily mean the database rejected a connection.</p>\n<p>It often means:</p>\n<div class=\"callout\">\n<p>All existing pooled connections were occupied for too long.</p>\n</div>"
    },
    {
      "title": "8. Pool exhaustion is usually a symptom",
      "diagram": null,
      "body": "<p>Common causes include:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Slow queries\nLock waits\nLong transactions\nConnection leaks\nN+1 queries\nDatabase overload\nExternal calls inside transactions\nVery large result streaming\nSudden traffic spikes\nPool genuinely too small\n</code></pre></div>\n<p>Increasing the pool size can temporarily hide these problems.</p>\n<p>It may also push more work into an already struggling database and make the incident worse.</p>"
    },
    {
      "title": "9. Why a larger pool can reduce throughput",
      "diagram": null,
      "body": "<p>A database has finite:</p>\n<ul>\n<li>CPU cores</li>\n<li>memory</li>\n<li>buffer cache</li>\n<li>disk throughput</li>\n<li>lock-manager capacity</li>\n<li>internal worker capacity</li>\n</ul>\n<p>Suppose the database can efficiently execute 20 active queries.</p>\n<p>With 20 connections:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>20 queries execute\nremaining work waits in application\n</code></pre></div>\n<p>With 500 connections:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500 queries compete for 20-query capacity\n</code></pre></div>\n<p>Now the database handles:</p>\n<ul>\n<li>more context switching</li>\n<li>more lock competition</li>\n<li>more memory consumption</li>\n<li>more concurrent random I/O</li>\n<li>more cache churn</li>\n<li>larger internal queues</li>\n</ul>\n<p>HikariCP's own pool-sizing guidance explicitly warns that excessive database connections can have a major negative performance effect.</p>\n<p>A queue has not disappeared.</p>\n<p>It has merely moved:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Small pool\n    queue at application\n\nHuge pool\n    queue inside database\n</code></pre></div>\n<p>The application queue is generally easier to bound, observe and time out.</p>"
    },
    {
      "title": "10. Pool size is not request-thread count",
      "diagram": null,
      "body": "<p>Suppose a service has:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tomcat worker threads = 200\n</code></pre></div>\n<p>That does not mean:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>pool size = 200\n</code></pre></div>\n<p>Many requests:</p>\n<ul>\n<li>do not access the database</li>\n<li>perform one short query</li>\n<li>use a connection for only part of the request</li>\n<li>wait on downstream services without needing a connection</li>\n</ul>\n<p>The relevant quantity is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>concurrent database work\n</code></pre></div>\n<p>not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>concurrent HTTP requests\n</code></pre></div>"
    },
    {
      "title": "11. Estimating concurrency with Little’s Law",
      "diagram": null,
      "body": "<p>A useful starting point is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Average concurrent connections\n    ≈\ndatabase operations per second\n×\naverage connection-hold time in seconds\n</code></pre></div>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Database transactions = 600/sec\nAverage connection hold = 25 ms = 0.025 sec\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>600 × 0.025 = 15\n</code></pre></div>\n<p>Approximately 15 connections are busy on average.</p>\n<p>A possible starting pool might be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>20–25\n</code></pre></div>\n<p>to accommodate variability.</p>\n<p>This is only a starting estimate because averages hide:</p>\n<ul>\n<li>bursts</li>\n<li>slow outliers</li>\n<li>lock waits</li>\n<li>unequal pod traffic</li>\n<li>multi-query transactions</li>\n<li>P95/P99 hold time</li>\n</ul>\n<p>Validate it under representative load.</p>"
    },
    {
      "title": "12. Connection-hold time matters more than query count",
      "diagram": null,
      "body": "<p>Consider two requests.</p>\n<h5>Request A</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Borrow connection\nExecute 10 queries\nReturn after 15 ms\n</code></pre></div>\n<h5>Request B</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Borrow connection\nExecute one query\nWait for HTTP call\nReturn after 3 seconds\n</code></pre></div>\n<p>Request B is much more damaging to pool capacity.</p>\n<p>A pool cares about:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>How long was the connection unavailable?\n</code></pre></div>\n<p>not merely:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>How many queries ran?\n</code></pre></div>"
    },
    {
      "title": "13. Cluster-wide sizing",
      "diagram": null,
      "body": "<p>A common mistake is sizing each pod independently.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maximumPoolSize = 30\nKubernetes replicas = 10\n</code></pre></div>\n<p>Potential database connections:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 × 10 = 300\n</code></pre></div>\n<p>Autoscale to 30 pods:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 × 30 = 900\n</code></pre></div>\n<p>Pool capacity must be calculated from the maximum expected replica count, not today's replica count.</p>"
    },
    {
      "title": "14. The complete connection budget",
      "diagram": null,
      "body": "<p>For one database, calculate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Maximum API pods × pool per API pod\n+\nmaximum worker pods × worker pool\n+\nbatch jobs\n+\nmigration tools\n+\nmonitoring\n+\nadministrative sessions\n+\nother services\n+\nfailover/recovery headroom\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet API:\n    12 pods × 8 = 96\n\nSettlement workers:\n    4 pods × 5 = 20\n\nReporting:\n    2 pods × 5 = 10\n\nFlyway/admin/monitoring reserve:\n    14\n\nTotal potential:\n    140\n</code></pre></div>\n<p>The database must safely support this total, not merely one service's pool.</p>\n<p>PostgreSQL limits simultaneous sessions using <code class=\"inline-code\">max_connections</code>, and its documentation notes that increasing that setting causes additional resource allocation, including shared memory. Some connection slots must also remain available for privileged administration.</p>"
    },
    {
      "title": "15. Reserve emergency capacity",
      "diagram": null,
      "body": "<p>Do not allocate every database slot to applications.</p>\n<p>During an incident, operators may need to connect to:</p>\n<ul>\n<li>inspect locks</li>\n<li>terminate runaway queries</li>\n<li>examine replication</li>\n<li>change configuration</li>\n<li>perform emergency repair</li>\n</ul>\n<p>Bad budget:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Database max = 200\nApplications = 200\n</code></pre></div>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Database max = 200\n\nApplication budgets = 160\nAdministration      = 10\nMigrations/jobs     = 10\nFailure headroom    = 20\n</code></pre></div>\n<p>Exact values depend on the environment, but zero headroom is unsafe.</p>"
    },
    {
      "title": "16. Spring Boot and HikariCP",
      "diagram": null,
      "body": "<p>Current Spring Boot documentation says that it prefers HikariCP when available, and both <code class=\"inline-code\">spring-boot-starter-jdbc</code> and <code class=\"inline-code\">spring-boot-starter-data-jpa</code> bring HikariCP in automatically.</p>\n<p>Typical configuration:</p>\n<div class=\"code-block\"><span class=\"code-label\">properties</span><pre><code>spring.datasource.url=jdbc:postgresql://db.example.com/wallet\nspring.datasource.username=wallet_app\nspring.datasource.password=${DB_PASSWORD}\n\nspring.datasource.hikari.pool-name=wallet-primary\nspring.datasource.hikari.maximum-pool-size=20\nspring.datasource.hikari.connection-timeout=500\n</code></pre></div>\n<p>These numbers are illustrative. They must come from capacity analysis and load testing.</p>"
    },
    {
      "title": "17. `maximumPoolSize`",
      "diagram": null,
      "body": "<p><code class=\"inline-code\">maximumPoolSize</code> is the maximum number of physical connections HikariCP will maintain, including both borrowed and idle connections.</p>\n<p>When the pool has reached this size and all connections are borrowed:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>getConnection()\n    ↓\nwait up to connectionTimeout\n    ↓\nconnection returned or exception\n</code></pre></div>\n<p>HikariCP's documented default maximum is currently 10, but a default is not a capacity decision.</p>\n<p>Configure it from:</p>\n<ul>\n<li>database capacity</li>\n<li>maximum application replica count</li>\n<li>workload concurrency</li>\n<li>transaction duration</li>\n<li>other consumers' connection budgets</li>\n</ul>"
    },
    {
      "title": "18. `minimumIdle`",
      "diagram": null,
      "body": "<p><code class=\"inline-code\">minimumIdle</code> controls how many idle connections HikariCP attempts to maintain.</p>\n<p>HikariCP currently recommends leaving it unset for fixed-size pool behavior; its default is the same as <code class=\"inline-code\">maximumPoolSize</code>.</p>\n<p>Two strategies are possible.</p>\n<h5>Fixed pool</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>minimumIdle = maximumPoolSize\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>ready for spikes</li>\n<li>predictable capacity</li>\n<li>no connection-creation latency during traffic</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>every pod may hold unused connections</li>\n<li>autoscaling can create a connection surge</li>\n<li>wasteful for highly intermittent workloads</li>\n</ul>\n<h5>Elastic idle population</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>minimumIdle &lt; maximumPoolSize\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>fewer idle physical sessions</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>connections may need to be created during spikes</li>\n<li>slower response if connection creation is expensive</li>\n<li>more complex behavior during outages</li>\n</ul>\n<p>For stable backend services, fixed pools are often operationally simpler.</p>"
    },
    {
      "title": "19. `connectionTimeout`",
      "diagram": null,
      "body": "<p>This is not a database query timeout.</p>\n<p>It means:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>How long may the application wait\nto borrow a pooled connection?\n</code></pre></div>\n<p>For an API with a 2-second end-to-end deadline, this is usually a poor configuration:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>connectionTimeout = 30 seconds\n</code></pre></div>\n<p>The user has already timed out long before the pool gives up.</p>\n<p>A more coherent hierarchy might be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Gateway deadline          3,000 ms\nService request deadline  2,500 ms\nPool acquisition timeout    200 ms\nSQL statement timeout      1,500 ms\nRemaining application work   800 ms\n</code></pre></div>\n<p>The actual budget must reflect the endpoint.</p>"
    },
    {
      "title": "20. Fail fast or queue longer?",
      "diagram": null,
      "body": "<p>A short acquisition timeout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>connectionTimeout = 200 ms\n</code></pre></div>\n<p>means overload produces fast failures.</p>\n<p>Advantages:</p>\n<ul>\n<li>prevents huge request queues</li>\n<li>preserves resources</li>\n<li>allows upstream retry or load shedding</li>\n<li>keeps tail latency bounded</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>brief harmless spikes may fail</li>\n<li>callers need appropriate error handling</li>\n<li>retry policies can create more pressure</li>\n</ul>\n<p>A longer timeout absorbs transient bursts but allows larger queues.</p>\n<p>This is a queueing-policy decision, not merely a JDBC setting.</p>"
    },
    {
      "title": "21. `maxLifetime`",
      "diagram": null,
      "body": "<p><code class=\"inline-code\">maxLifetime</code> controls how long a physical connection may remain in the pool.</p>\n<p>When its lifetime expires:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Idle connection\n    → retire and replace\n\nBorrowed connection\n    → allow current use to finish\n    → retire when returned\n</code></pre></div>\n<p>HikariCP recommends configuring <code class=\"inline-code\">maxLifetime</code> several seconds shorter than any database, firewall or infrastructure connection-lifetime limit. It also applies slight per-connection variation to avoid every connection expiring simultaneously.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Infrastructure kills connections after 30 minutes\n\nHikari maxLifetime:\n    approximately 25–29 minutes\n</code></pre></div>\n<p>Do not configure the exact same lifetime at every layer.</p>"
    },
    {
      "title": "22. Mass connection expiry",
      "diagram": null,
      "body": "<p>Bad configuration:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 connections created at startup\nall expire exactly 30 minutes later\n</code></pre></div>\n<p>Potential result:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 retirements\n+\n100 replacements\n+\ntemporary acquisition delays\n</code></pre></div>\n<p>A good pool introduces some timing variation.</p>\n<p>Rolling deployments and autoscaling should also be considered because they can synchronize connection ages across pods.</p>"
    },
    {
      "title": "23. `idleTimeout`",
      "diagram": null,
      "body": "<p><code class=\"inline-code\">idleTimeout</code> controls how long excess idle connections can remain when <code class=\"inline-code\">minimumIdle</code> is lower than <code class=\"inline-code\">maximumPoolSize</code>.</p>\n<p>It does not reduce the pool below <code class=\"inline-code\">minimumIdle</code>.</p>\n<p>HikariCP documents that it only applies when <code class=\"inline-code\">minimumIdle &lt; maximumPoolSize</code>; it also allows timing variation in actual retirement.</p>\n<p>If the pool is fixed size:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>minimumIdle = maximumPoolSize\n</code></pre></div>\n<p><code class=\"inline-code\">idleTimeout</code> is effectively irrelevant.</p>"
    },
    {
      "title": "24. `keepaliveTime`",
      "diagram": null,
      "body": "<p>Some firewalls, NAT devices or database infrastructure silently remove idle TCP connections.</p>\n<p>A pool may believe a connection is valid while the network path has discarded it.</p>\n<p>HikariCP's <code class=\"inline-code\">keepaliveTime</code> periodically tests idle connections and requires the value to be shorter than <code class=\"inline-code\">maxLifetime</code>.</p>\n<p>Use it when needed to stay below infrastructure idle limits.</p>\n<p>Do not set extremely aggressive keepalives across thousands of connections because the health-check traffic itself creates load.</p>"
    },
    {
      "title": "25. TCP keepalive",
      "diagram": null,
      "body": "<p>Pool-level keepalive and operating-system TCP keepalive solve related but different problems.</p>\n<p>TCP keepalive helps detect dead network peers or silently broken paths at the socket layer.</p>\n<p>HikariCP's current documentation specifically recommends properly configuring TCP keepalive for reliable recovery from some network failure conditions.</p>\n<p>You may need configuration at:</p>\n<ul>\n<li>JDBC driver</li>\n<li>operating system</li>\n<li>load balancer</li>\n<li>firewall</li>\n<li>cloud database proxy</li>\n</ul>"
    },
    {
      "title": "26. Connection validation",
      "diagram": null,
      "body": "<p>Before lending a connection, the pool needs confidence that it is usable.</p>\n<p>Modern JDBC drivers support:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>connection.isValid(timeoutSeconds);\n</code></pre></div>\n<p>HikariCP recommends not setting <code class=\"inline-code\">connectionTestQuery</code> when the driver supports JDBC4 validation; explicit test queries are mainly for legacy drivers.</p>\n<p>Avoid validating every connection with an expensive query such as:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM enormous_table\nLIMIT 1;\n</code></pre></div>\n<p>Connection validation should be cheap.</p>"
    },
    {
      "title": "27. Validation cannot guarantee the next query succeeds",
      "diagram": null,
      "body": "<p>A connection can pass validation and fail milliseconds later because:</p>\n<ul>\n<li>database restarts</li>\n<li>network partition occurs</li>\n<li>failover begins</li>\n<li>firewall resets the socket</li>\n<li>transaction is terminated</li>\n<li>backend process dies</li>\n</ul>\n<p>Validation reduces stale-connection errors.</p>\n<p>It cannot eliminate distributed-system failures.</p>\n<p>Application transactions must still handle database exceptions correctly.</p>"
    },
    {
      "title": "28. `leakDetectionThreshold`",
      "diagram": null,
      "body": "<p>HikariCP can log a possible leak when a connection remains borrowed longer than a configured threshold. Leak detection is disabled by default, and HikariCP currently requires at least two seconds when enabled.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">properties</span><pre><code>spring.datasource.hikari.leak-detection-threshold=5000\n</code></pre></div>\n<p>Meaning:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Log warning if connection is borrowed\nfor more than five seconds\n</code></pre></div>\n<p>This does not forcibly reclaim the connection.</p>\n<p>It reports the stack trace where the connection was borrowed.</p>"
    },
    {
      "title": "29. Leak detection produces possible leaks",
      "diagram": null,
      "body": "<p>Suppose a legitimate report query takes 12 seconds.</p>\n<p>With:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>leakDetectionThreshold = 5 seconds\n</code></pre></div>\n<p>it triggers a warning even though the connection is eventually returned.</p>\n<p>Therefore set the threshold above the legitimate expected hold time for the workload.</p>\n<p>Use separate pools for:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>interactive OLTP\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>long-running reporting\n</code></pre></div>\n<p>when their connection behavior differs significantly.</p>"
    },
    {
      "title": "30. A real connection leak",
      "diagram": null,
      "body": "<p>Without try-with-resources:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public Payment load(long id) throws SQLException {\n    Connection connection = dataSource.getConnection();\n\n    PreparedStatement statement =\n            connection.prepareStatement(\n                    \"select * from payment where id = ?\"\n            );\n\n    statement.setLong(1, id);\n\n    ResultSet resultSet = statement.executeQuery();\n\n    if (!resultSet.next()) {\n        throw new PaymentNotFoundException(id);\n    }\n\n    // Connection is never returned.\n    return map(resultSet);\n}\n</code></pre></div>\n<p>After enough calls:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>all connections active forever\nidle = 0\npending increases\nacquisition timeouts begin\n</code></pre></div>\n<p>Correct:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public Payment load(long id) throws SQLException {\n    String sql = \"\"\"\n        select id, status, amount\n        from payment\n        where id = ?\n        \"\"\";\n\n    try (\n        Connection connection = dataSource.getConnection();\n        PreparedStatement statement =\n                connection.prepareStatement(sql)\n    ) {\n        statement.setLong(1, id);\n\n        try (ResultSet resultSet = statement.executeQuery()) {\n            if (!resultSet.next()) {\n                throw new PaymentNotFoundException(id);\n            }\n\n            return map(resultSet);\n        }\n    }\n}\n</code></pre></div>"
    },
    {
      "title": "31. Framework-managed connections",
      "diagram": null,
      "body": "<p>With Spring Data or <code class=\"inline-code\">JdbcTemplate</code>, application code normally does not borrow and close the connection directly.</p>\n<p>Spring:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Starts transaction\n    ↓\nBinds connection to current thread\n    ↓\nRepositories reuse it\n    ↓\nCommits or rolls back\n    ↓\nReturns connection to pool\n</code></pre></div>\n<p>A method annotated with <code class=\"inline-code\">@Transactional</code> usually holds the connection for the transaction's lifetime.</p>\n<p>Therefore transaction boundaries directly affect pool capacity.</p>"
    },
    {
      "title": "32. External calls inside transactions",
      "diagram": null,
      "body": "<p>Dangerous:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void checkout(CheckoutRequest request) {\n    orderRepository.createPending(request);\n\n    paymentGateway.charge(request); // 3-second HTTP call\n\n    orderRepository.confirm(request.orderId());\n}\n</code></pre></div>\n<p>Potential timeline:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Borrow DB connection\nExecute INSERT\nWait 3 seconds on payment provider\nExecute UPDATE\nReturn connection\n</code></pre></div>\n<p>The database connection is unavailable during the network call even thou</p>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "Size pools from concurrent connection-hold time and total cluster budget.",
    "Pool exhaustion usually indicates slow work, long transactions, or leaks—not simply a small maximum.",
    "Keep acquisition timeout within the request deadline and expose active, idle, pending, and hold-time metrics.",
    "Never hold a connection across slow external work.",
    "Reserve database capacity for jobs, migrations, administration, failover, and autoscaling."
  ]
};
