window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-27-n-plus-one-queries"] = {
  "day": 27,
  "title": "N+1 Queries",
  "subtitle": "Avoid one parent query followed by one lazy relationship query per parent.",
  "tags": [
    "N+1",
    "Hibernate",
    "JPA",
    "Fetch join",
    "Batch fetching",
    "DTO projection"
  ],
  "core": "An N+1 query problem occurs when an application runs one query to load a collection of parent objects and then executes one additional query for each parent to load related data.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart TD\n  API --> Parents[1 parent query]\n  Parents --> Q1[relationship query 1]\n  Parents --> Q2[relationship query 2]\n  Parents --> QN[relationship query N]\n  Parents -. replace with .-> Fix[Fetch join / batch / projection / bounded queries]",
      "body": "<p>Instead of:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 query\n</code></pre></div>\n<p>the application performs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 parent query\n+\nN relationship queries\n</code></pre></div>\n<p>For 100 orders:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 + 100 = 101 queries\n</code></pre></div>\n<p>For 10,000 orders:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 + 10,000 = 10,001 queries\n</code></pre></div>\n<p>The individual SQL statements may each be fast. The system becomes slow because of:</p>\n<ul>\n<li>database round trips</li>\n<li>query parsing and planning</li>\n<li>connection-pool occupation</li>\n<li>network latency</li>\n<li>repeated index lookups</li>\n<li>ORM object creation</li>\n<li>transaction overhead</li>\n</ul>\n<p>N+1 is especially common with Hibernate and JPA because object navigation makes database access look like ordinary field access.</p>"
    },
    {
      "title": "1. A basic JPA example",
      "diagram": null,
      "body": "<p>Entities:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Entity\n@Table(name = \"customer_order\")\npublic class Order {\n\n    @Id\n    private Long id;\n\n    private String status;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    @JoinColumn(name = \"customer_id\")\n    private Customer customer;\n\n    @OneToMany(\n            mappedBy = \"order\",\n            fetch = FetchType.LAZY\n    )\n    private List&lt;OrderItem&gt; items = new ArrayList&lt;&gt;();\n}\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Entity\n@Table(name = \"order_item\")\npublic class OrderItem {\n\n    @Id\n    private Long id;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    @JoinColumn(name = \"order_id\")\n    private Order order;\n\n    private String productName;\n    private BigDecimal amount;\n}\n</code></pre></div>\n<p>Repository call:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>List&lt;Order&gt; orders = orderRepository.findByStatus(\"PENDING\");\n</code></pre></div>\n<p>Generated query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM customer_order\nWHERE status = 'PENDING';\n</code></pre></div>\n<p>So far:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 query\n</code></pre></div>\n<p>Application code:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>for (Order order : orders) {\n    System.out.println(order.getItems().size());\n}\n</code></pre></div>\n<p>Hibernate now loads each collection separately:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM order_item\nWHERE order_id = 1;\n\nSELECT *\nFROM order_item\nWHERE order_id = 2;\n\nSELECT *\nFROM order_item\nWHERE order_id = 3;\n\n...\n</code></pre></div>\n<p>If 100 orders were returned:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 order query\n+\n100 item queries\n=\n101 total queries\n</code></pre></div>\n<p>That is the classic N+1 problem.</p>"
    },
    {
      "title": "2. Why lazy loading causes it",
      "diagram": null,
      "body": "<p>With:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@OneToMany(fetch = FetchType.LAZY)\n</code></pre></div>\n<p>Hibernate initially places a collection proxy in the entity.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order\n    id = 123\n    status = PENDING\n    items = UninitializedPersistentCollection\n</code></pre></div>\n<p>When application code calls:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>order.getItems()\n</code></pre></div>\n<p>Hibernate asks:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Has this collection been loaded?\n</code></pre></div>\n<p>If not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Execute SQL now.\n</code></pre></div>\n<p>Lazy loading is not inherently bad. It becomes problematic when code lazily loads the same relationship repeatedly across many parent entities.</p>"
    },
    {
      "title": "3. Lazy loading is often the correct default",
      "diagram": null,
      "body": "<p>A common reaction is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Lazy loading caused N+1.\nMake everything eager.\n</code></pre></div>\n<p>That is usually the wrong fix.</p>\n<p>Most requests do not need every relationship.</p>\n<p>Suppose an order has:</p>\n<ul>\n<li>customer</li>\n<li>items</li>\n<li>payments</li>\n<li>shipment</li>\n<li>refunds</li>\n<li>audit events</li>\n<li>discount rules</li>\n</ul>\n<p>Loading everything for every order would create:</p>\n<ul>\n<li>huge joins</li>\n<li>excessive memory use</li>\n<li>unnecessary database I/O</li>\n<li>large object graphs</li>\n<li>slow serialization</li>\n<li>Cartesian-product explosions</li>\n</ul>\n<p>A better principle is:</p>\n<div class=\"callout\">\n<p>Keep entity relationships lazy by default and explicitly fetch what each use case needs.</p>\n</div>"
    },
    {
      "title": "4. EAGER does not guarantee one query",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@ManyToOne(fetch = FetchType.EAGER)\nprivate Customer customer;\n</code></pre></div>\n<p>Developers often expect Hibernate to generate:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT ...\nFROM customer_order o\nJOIN customer c ON ...\n</code></pre></div>\n<p>But JPA's eager requirement means:</p>\n<div class=\"callout\">\n<p>The relationship must be initialized before the entity is returned.</p>\n</div>\n<p>It does not require initialization through one join.</p>\n<p>Hibernate may execute:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM customer_order\nWHERE status = 'PENDING';\n</code></pre></div>\n<p>then:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM customer\nWHERE id = ?;\n</code></pre></div>\n<p>for each distinct customer.</p>\n<p>So changing <code class=\"inline-code\">LAZY</code> to <code class=\"inline-code\">EAGER</code> can still produce N+1.</p>\n<p>It may also create N+1 in places where the relationship is never accessed explicitly.</p>"
    },
    {
      "title": "5. N+1 with `ManyToOne`",
      "diagram": null,
      "body": "<p>N+1 is not limited to collections.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>List&lt;Order&gt; orders = orderRepository.findAll();\n\nfor (Order order : orders) {\n    System.out.println(order.getCustomer().getName());\n}\n</code></pre></div>\n<p>Possible SQL:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM customer_order;\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT * FROM customer WHERE id = 10;\nSELECT * FROM customer WHERE id = 11;\nSELECT * FROM customer WHERE id = 12;\n...\n</code></pre></div>\n<p>This produces:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 order query\n+\nN customer queries\n</code></pre></div>\n<p>If several orders share the same customer, Hibernate's first-level cache may reduce duplicates within the same persistence context.</p>\n<p>But relying on accidental cache reuse is not a robust query strategy.</p>"
    },
    {
      "title": "6. N+1 can hide during development",
      "diagram": null,
      "body": "<p>Suppose development data contains:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5 orders\n</code></pre></div>\n<p>N+1 produces:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>6 queries\n</code></pre></div>\n<p>Nobody notices.</p>\n<p>Production contains:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5,000 orders\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5,001 queries\n</code></pre></div>\n<p>Even if each child query takes only 2 ms:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5,000 × 2 ms = 10 seconds\n</code></pre></div>\n<p>This ignores connection waiting, network latency, and object mapping.</p>\n<p>N+1 is strongly data-volume dependent.</p>"
    },
    {
      "title": "7. Why database round trips matter",
      "diagram": null,
      "body": "<p>Assume:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>database round-trip latency = 3 ms\n</code></pre></div>\n<p>One joined query:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>3–20 ms\n</code></pre></div>\n<p>One thousand individual queries:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000 × 3 ms\n=\n3 seconds minimum\n</code></pre></div>\n<p>The database may still report each query as “fast.”</p>\n<p>Application tracing reveals the real issue:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>request duration = 4 seconds\nslowest SQL       = 5 ms\nSQL count         = 1,001\n</code></pre></div>\n<p>This is why monitoring only slow individual SQL statements misses N+1.</p>"
    },
    {
      "title": "8. First solution: fetch join",
      "diagram": null,
      "body": "<p>JPQL:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Query(\"\"\"\n    select distinct o\n    from Order o\n    left join fetch o.items\n    where o.status = :status\n    \"\"\")\nList&lt;Order&gt; findWithItemsByStatus(\n        @Param(\"status\") String status);\n</code></pre></div>\n<p>Generated SQL resembles:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT o.*, i.*\nFROM customer_order o\nLEFT JOIN order_item i\n    ON i.order_id = o.id\nWHERE o.status = ?;\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 query\n</code></pre></div>\n<p>loads both orders and their items.</p>"
    },
    {
      "title": "9. Why `DISTINCT` is used",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order 1 has 3 items\nOrder 2 has 2 items\n</code></pre></div>\n<p>The SQL result contains:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order 1 + Item A\nOrder 1 + Item B\nOrder 1 + Item C\nOrder 2 + Item D\nOrder 2 + Item E\n</code></pre></div>\n<p>The parent order data appears repeatedly.</p>\n<p>Without entity-level deduplication, the result list may contain repeated references to the same order.</p>\n<p>JPQL:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>select distinct o\n</code></pre></div>\n<p>tells Hibernate that the parent result should be deduplicated.</p>\n<p>The SQL still returns multiple rows because that is required to represent the collection.</p>\n<p><code class=\"inline-code\">DISTINCT</code> does not make the join physically return one row per order.</p>"
    },
    {
      "title": "10. Fetch joins trade round trips for row multiplication",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 orders\n20 items per order\n</code></pre></div>\n<p>A fetch join returns approximately:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>2,000 rows\n</code></pre></div>\n<p>This may be much better than 101 queries.</p>\n<p>But suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000 orders\n100 items each\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000,000 joined rows\n</code></pre></div>\n<p>One query is not automatically efficient.</p>\n<p>The correct goal is not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>minimum number of SQL statements at any cost\n</code></pre></div>\n<p>It is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>reasonable number of queries\n+\nbounded result size\n+\npredictable memory use\n</code></pre></div>"
    },
    {
      "title": "11. Fetching multiple collections",
      "diagram": null,
      "body": "<p>Suppose an order has:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@OneToMany\nprivate List&lt;OrderItem&gt; items;\n\n@OneToMany\nprivate List&lt;Payment&gt; payments;\n</code></pre></div>\n<p>Fetch both:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Query(\"\"\"\n    select distinct o\n    from Order o\n    left join fetch o.items\n    left join fetch o.payments\n    where o.id = :id\n    \"\"\")\nOptional&lt;Order&gt; findCompleteOrder(Long id);\n</code></pre></div>\n<p>Suppose one order has:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 items\n4 payments\n</code></pre></div>\n<p>SQL rows:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 × 4 = 40 rows\n</code></pre></div>\n<p>Each item is repeated for every payment.</p>\n<p>Each payment is repeated for every item.</p>\n<p>Add five shipments:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 × 4 × 5 = 200 rows\n</code></pre></div>\n<p>This is a Cartesian-product explosion.</p>"
    },
    {
      "title": "12. Hibernate's multiple-bag problem",
      "diagram": null,
      "body": "<p>Hibernate may reject fetching multiple <code class=\"inline-code\">List</code> collections simultaneously with an error such as:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>MultipleBagFetchException\n</code></pre></div>\n<p>A “bag” is an unordered collection allowing duplicates.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>List&lt;OrderItem&gt; items;\nList&lt;Payment&gt; payments;\n</code></pre></div>\n<p>Hibernate cannot reliably reconstruct multiple bag collections from one multiplied SQL result without ambiguity.</p>\n<p>Changing one collection from <code class=\"inline-code\">List</code> to <code class=\"inline-code\">Set</code> may remove the exception, but it does not remove the underlying row multiplication.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>No exception\n≠\nefficient query\n</code></pre></div>\n<p>Do not change domain collection semantics merely to silence the ORM.</p>"
    },
    {
      "title": "13. Better strategy for multiple collections",
      "diagram": null,
      "body": "<p>Instead of one enormous join:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Query 1:\nLoad orders\n\nQuery 2:\nLoad items for all order IDs\n\nQuery 3:\nLoad payments for all order IDs\n</code></pre></div>\n<p>This is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>3 bounded queries\n</code></pre></div>\n<p>rather than:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 huge Cartesian join\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 + N + N\n</code></pre></div>\n<p>A small fixed number of well-designed queries is often optimal.</p>"
    },
    {
      "title": "14. Batch fetching",
      "diagram": null,
      "body": "<p>Hibernate can batch lazy relationship initialization.</p>\n<p>Configuration:</p>\n<div class=\"code-block\"><span class=\"code-label\">properties</span><pre><code>spring.jpa.properties.hibernate.default_batch_fetch_size=50\n</code></pre></div>\n<p>Suppose 100 orders are loaded.</p>\n<p>Without batching:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 parent query\n+\n100 child queries\n=\n101\n</code></pre></div>\n<p>With batch size 50:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 parent query\n+\n2 child queries\n=\n3\n</code></pre></div>\n<p>The child queries resemble:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM order_item\nWHERE order_id IN (?, ?, ..., ?);\n</code></pre></div>\n<p>Batch fetching is useful when:</p>\n<ul>\n<li>relationships should remain lazy</li>\n<li>many parents are processed together</li>\n<li>fetch joins would multiply rows excessively</li>\n<li>the access pattern is not known directly in the repository method</li>\n</ul>"
    },
    {
      "title": "15. `@BatchSize`",
      "diagram": null,
      "body": "<p>You can configure batching for a specific relationship:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@OneToMany(\n        mappedBy = \"order\",\n        fetch = FetchType.LAZY\n)\n@BatchSize(size = 50)\nprivate List&lt;OrderItem&gt; items;\n</code></pre></div>\n<p>Or for entities:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Entity\n@BatchSize(size = 50)\npublic class Customer {\n    // ...\n}\n</code></pre></div>\n<p>When one proxy is initialized, Hibernate attempts to initialize several pending proxies in the same query.</p>"
    },
    {
      "title": "16. Batch size trade-offs",
      "diagram": null,
      "body": "<p>Too small:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>batch size = 5\n</code></pre></div>\n<p>Still many queries.</p>\n<p>Too large:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>batch size = 5,000\n</code></pre></div>\n<p>Can produce:</p>\n<ul>\n<li>huge <code class=\"inline-code\">IN</code> clauses</li>\n<li>database parameter-limit problems</li>\n<li>expensive parsing</li>\n<li>poor plans</li>\n<li>excess data loading</li>\n</ul>\n<p>Typical values might be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>16\n32\n50\n100\n</code></pre></div>\n<p>The correct choice depends on:</p>\n<ul>\n<li>expected page size</li>\n<li>relationship cardinality</li>\n<li>database limits</li>\n<li>row width</li>\n<li>query concurrency</li>\n</ul>\n<p>Measure rather than choose arbitrarily.</p>"
    },
    {
      "title": "17. Batch fetching is still lazy",
      "diagram": null,
      "body": "<p>Suppose you load 100 orders but access <code class=\"inline-code\">items</code> for only one.</p>\n<p>Batch fetching may load items for several additional orders proactively.</p>\n<p>This reduces future queries but may fetch data that is never used.</p>\n<p>Trade-off:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>fewer round trips\nversus\nextra relationship data\n</code></pre></div>\n<p>Batch fetching is a compromise, not a universal replacement for explicit query design.</p>"
    },
    {
      "title": "18. Subselect fetching",
      "diagram": null,
      "body": "<p>Hibernate supports subselect-style collection loading.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Query 1:\nLoad all selected orders.\n\nQuery 2:\nLoad items for every order returned by Query 1.\n</code></pre></div>\n<p>SQL may resemble:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT *\nFROM order_item\nWHERE order_id IN (\n    SELECT id\n    FROM customer_order\n    WHERE status = 'PENDING'\n);\n</code></pre></div>\n<p>Mapping:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Fetch(FetchMode.SUBSELECT)\n@OneToMany(mappedBy = \"order\")\nprivate List&lt;OrderItem&gt; items;\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>avoids one query per parent</li>\n<li>useful when most parent collections will be accessed</li>\n</ul>\n<p>Risks:</p>\n<ul>\n<li>can load very large collections</li>\n<li>tied to the original parent query</li>\n<li>less predictable than explicit fetching</li>\n<li>may perform poorly for large parent sets</li>\n</ul>\n<p>Use deliberately.</p>"
    },
    {
      "title": "19. Entity graphs",
      "diagram": null,
      "body": "<p>JPA entity graphs allow use-case-specific fetch plans.</p>\n<p>Entity:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@NamedEntityGraph(\n        name = \"Order.withCustomerAndItems\",\n        attributeNodes = {\n                @NamedAttributeNode(\"customer\"),\n                @NamedAttributeNode(\"items\")\n        }\n)\n@Entity\npublic class Order {\n    // ...\n}\n</code></pre></div>\n<p>Repository:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@EntityGraph(\n        value = \"Order.withCustomerAndItems\",\n        type = EntityGraph.EntityGraphType.FETCH\n)\nList&lt;Order&gt; findByStatus(String status);\n</code></pre></div>\n<p>Or ad hoc:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@EntityGraph(attributePaths = {\n        \"customer\",\n        \"items\"\n})\nList&lt;Order&gt; findByStatus(String status);\n</code></pre></div>\n<p>Entity graphs keep fetch requirements near repository operations without changing global mappings.</p>"
    },
    {
      "title": "20. `fetchgraph` versus `loadgraph`",
      "diagram": null,
      "body": "<p>Conceptually:</p>\n<h5>Fetch graph</h5>\n<p>Attributes included in the graph are fetched eagerly.</p>\n<p>Other attributes are treated as lazy where possible.</p>\n<h5>Load graph</h5>\n<p>Attributes included in the graph are fetched eagerly.</p>\n<p>Other attributes follow their mapping defaults.</p>\n<p>This distinction matters if the entity already contains eager mappings.</p>\n<p>A fetch graph offers stronger control over the exact use-case fetch plan.</p>"
    },
    {
      "title": "21. Entity graph limitations",
      "diagram": null,
      "body": "<p>Entity graphs can still generate:</p>\n<ul>\n<li>joins</li>\n<li>multiple SQL statements</li>\n<li>row multiplication</li>\n<li>large object graphs</li>\n</ul>\n<p>They describe what should be initialized, not necessarily the exact SQL strategy.</p>\n<p>Always inspect generated SQL and execution plans.</p>"
    },
    {
      "title": "22. DTO projections",
      "diagram": null,
      "body": "<p>Often the endpoint does not need entities or relationships at all.</p>\n<p>Suppose an order-list page needs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>order ID\ncustomer name\nstatus\ntotal amount\nitem count\n</code></pre></div>\n<p>Projection:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public record OrderSummary(\n        Long orderId,\n        String customerName,\n        String status,\n        BigDecimal totalAmount,\n        long itemCount\n) {\n}\n</code></pre></div>\n<p>Repository query:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Query(\"\"\"\n    select new com.example.api.OrderSummary(\n        o.id,\n        c.name,\n        o.status,\n        o.totalAmount,\n        count(i.id)\n    )\n    from Order o\n    join o.customer c\n    left join o.items i\n    where o.status = :status\n    group by\n        o.id,\n        c.name,\n        o.status,\n        o.totalAmount\n    \"\"\")\nList&lt;OrderSummary&gt; findOrderSummaries(String status);\n</code></pre></div>\n<p>This avoids:</p>\n<ul>\n<li>entity graph hydration</li>\n<li>lazy relationships</li>\n<li>dirty checking</li>\n<li>unnecessary columns</li>\n<li>accidental serialization traversal</li>\n</ul>\n<p>DTO projections are frequently the best solution for read APIs.</p>"
    },
    {
      "title": "23. Interface projections",
      "diagram": null,
      "body": "<p>Spring Data supports:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public interface OrderSummaryView {\n\n    Long getId();\n\n    String getStatus();\n\n    BigDecimal getTotalAmount();\n\n    String getCustomerName();\n}\n</code></pre></div>\n<p>Repository:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Query(\"\"\"\n    select\n        o.id as id,\n        o.status as status,\n        o.totalAmount as totalAmount,\n        c.name as customerName\n    from Order o\n    join o.customer c\n    where o.id = :id\n    \"\"\")\nOptional&lt;OrderSummaryView&gt; findSummaryById(Long id);\n</code></pre></div>\n<p>Projection queries make the required data explicit.</p>"
    },
    {
      "title": "24. Do not serialize JPA entities directly",
      "diagram": null,
      "body": "<p>Controller:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@GetMapping(\"/orders\")\npublic List&lt;Order&gt; getOrders() {\n    return orderRepository.findAll();\n}\n</code></pre></div>\n<p>This is dangerous.</p>\n<p>Jackson may call getters while serializing:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>getCustomer()\ngetItems()\ngetPayments()\ngetShipment()\n</code></pre></div>\n<p>Each getter can trigger another SQL query.</p>\n<p>A seemingly simple endpoint can produce hundreds or thousands of queries.</p>\n<p>It can also encounter:</p>\n<ul>\n<li>infinite recursion from bidirectional relationships</li>\n<li><code class=\"inline-code\">LazyInitializationException</code></li>\n<li>huge accidental payloads</li>\n<li>sensitive field exposure</li>\n</ul>\n<p>Prefer DTOs at API boundaries.</p>"
    },
    {
      "title": "25. Bidirectional relationship recursion",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order\n    contains items\n\nOrderItem\n    contains order\n</code></pre></div>\n<p>Serialization may traverse:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order\n → Item\n   → Order\n     → Item\n       → Order\n       ...\n</code></pre></div>\n<p>Annotations such as:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@JsonIgnore\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@JsonManagedReference\n@JsonBackReference\n</code></pre></div>\n<p>may prevent recursion, but they do not create a good API model.</p>\n<p>A dedicated response DTO is clearer and safer.</p>"
    },
    {
      "title": "26. Open Session in View",
      "diagram": null,
      "body": "<p>Spring Boot has historically allowed Open Session in View in many configurations.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>HTTP request begins\n    ↓\nHibernate session remains open\n    ↓\nservice method returns\n    ↓\ncontroller/serializer accesses lazy relationships\n    ↓\nSQL runs during rendering\n</code></pre></div>\n<p>This avoids immediate <code class=\"inline-code\">LazyInitializationException</code>.</p>\n<p>But it can hide N+1 problems outside the service transaction.</p>\n<p>Problems include:</p>\n<ul>\n<li>queries executed during JSON serialization</li>\n<li>unpredictable database access</li>\n<li>longer-held persistence context</li>\n<li>controller layer triggering database I/O</li>\n<li>difficult performance testing</li>\n</ul>\n<p>Many production teams disable OSIV:</p>\n<div class=\"code-block\"><span class=\"code-label\">properties</span><pre><code>spring.jpa.open-in-view=false\n</code></pre></div>\n<p>Then fetch requirements must be resolved deliberately in the service/repository layer.</p>"
    },
    {
      "title": "27. `LazyInitializationException`",
      "diagram": null,
      "body": "<p>If OSIV is disabled:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Order order = orderService.findOrder(id);\n\n// Transaction is over here.\n\norder.getItems().size();\n</code></pre></div>\n<p>Hibernate may throw:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>LazyInitializationException:\ncould not initialize proxy - no Session\n</code></pre></div>\n<p>The wrong fix is often:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>make everything EAGER\n</code></pre></div>\n<p>Better fixes:</p>\n<ul>\n<li>fetch required relationships inside the transaction</li>\n<li>map to DTO inside the transaction</li>\n<li>use fetch join/entity graph</li>\n<li>use an explicit projection</li>\n</ul>\n<p>The exception is exposing an unclear data-loading boundary.</p>"
    },
    {
      "title": "28. Pagination plus collection fetch join",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Query(\"\"\"\n    select distinct o\n    from Order o\n    left join fetch o.items\n    where o.status = :status\n    \"\"\")\nPage&lt;Order&gt; findPageWithItems(\n        String status,\n        Pageable pageable);\n</code></pre></div>\n<p>This is problematic.</p>\n<p>SQL pagination applies to joined rows, not unique orders.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order A has 20 items.\nOrder B has 1 item.\nPage size = 10 SQL rows.\n</code></pre></div>\n<p>The database may return only rows belonging to Order A.</p>\n<p>Hibernate may:</p>\n<ul>\n<li>paginate in memory</li>\n<li>warn about collection fetch pagination</li>\n<li>load far more data than requested</li>\n<li>produce incomplete or unpredictable pages</li>\n</ul>\n<p>Avoid collection fetch joins in paginated parent queries.</p>"
    },
    {
      "title": "29. Two-query pagination pattern",
      "diagram": null,
      "body": "<p>A robust pattern:</p>\n<h5>Query 1: page parent IDs</h5>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT o.id\nFROM customer_order o\nWHERE o.status = ?\nORDER BY o.created_at DESC, o.id DESC\nLIMIT 25;\n</code></pre></div>\n<h5>Query 2: fetch details</h5>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT DISTINCT o.*, i.*\nFROM customer_order o\nLEFT JOIN order_item i\n    ON i.order_id = o.id\nWHERE o.id IN (...);\n</code></pre></div>\n<p>In JPA:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Page&lt;Long&gt; orderIds =\n        orderRepository.findIdsByStatus(status, pageable);\n\nList&lt;Order&gt; orders =\n        orderRepository.findWithItemsByIdIn(\n                orderIds.getContent());\n</code></pre></div>\n<p>This provides:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>bounded parent pagination\n+\nexplicit relationship fetch\n</code></pre></div>\n<p>Restore the original page ordering after the second query if the database does not preserve <code class=\"inline-code\">IN</code>-list order.</p>"
    },
    {
      "title": "30. Ordering after an `IN` query",
      "diagram": null,
      "body": "<p>Suppose page IDs are:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>[91, 70, 44, 12]\n</code></pre></div>\n<p>Query:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>WHERE id IN (91, 70, 44, 12)\n</code></pre></div>\n<p>The database is not required to return rows in that order.</p>\n<p>Possible solutions:</p>\n<ul>\n<li>add equivalent <code class=\"inline-code\">ORDER BY</code></li>\n<li>map results by ID and reorder in application code</li>\n<li>use a database-specific ordering expression</li>\n<li>join against a temporary/value table containing positions</li>\n</ul>\n<p>Do not assume <code class=\"inline-code\">IN</code> preserves input ordering.</p>"
    },
    {
      "title": "31. Count-query surprises",
      "diagram": null,
      "body": "<p>Spring Data <code class=\"inline-code\">Page</code> typically executes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 data query\n+\n1 count query\n</code></pre></div>\n<p>When joins are involved, the count may require:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>COUNT(DISTINCT o.id)\n</code></pre></div>\n<p>The count query can be more expensive than the page query.</p>\n<p>Where the UI only needs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>is another page available?\n</code></pre></div>\n<p>consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Slice&lt;OrderSummary&gt;\n</code></pre></div>\n<p>A slice typically fetches one extra row rather than calculating the exact total.</p>"
    },
    {
      "title": "32. N+1 in nested mappings",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order\n    → Customer\n       → Address\n          → Country\n</code></pre></div>\n<p>Mapping code:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>return orders.stream()\n        .map(order -&gt; new OrderResponse(\n                order.getId(),\n                order.getCustomer().getName(),\n                or\n\n&gt; Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.\n</code></pre></div>"
    }
  ],
  "keyTakeaways": [
    "Keep mappings lazy and define an explicit fetch plan per use case.",
    "A small fixed number of bounded queries can be better than one Cartesian join.",
    "Use fetch joins, batch/subselect fetching, entity graphs, or DTO projections deliberately.",
    "Do not serialize JPA entities directly or rely on Open Session in View to hide access patterns.",
    "Test query count and production-scale result sizes, especially with pagination."
  ]
};
