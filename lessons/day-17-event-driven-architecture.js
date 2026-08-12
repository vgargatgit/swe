window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-17-event-driven-architecture"] = {
  "day": 17,
  "title": "Event-Driven Architecture",
  "subtitle": "Organize services around durable facts and asynchronous reactions.",
  "tags": [
    "EDA",
    "Domain events",
    "Outbox",
    "Eventual consistency",
    "Choreography",
    "Observability"
  ],
  "core": "Event-Driven Architecture, or EDA, is not simply “using Kafka” or “publishing messages.” It is an architectural style in which important state changes are represented as events, and other parts of the system react to those events asynchronously.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Owner[Domain owner] -- durable fact --> Bus[(Event bus)]\n  Bus --> A[Projection]\n  Bus --> B[Notification]\n  Bus --> C[Analytics]\n  Owner --> Outbox[(Transactional outbox)]\n  Outbox --> Bus",
      "body": "<p>The important shift is this:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Request-driven system:\nService A tells Service B what to do.\n\nEvent-driven system:\nService A announces what happened.\nInterested services decide what to do.\n</code></pre></div>\n<p>That difference changes coupling, consistency, failure handling, observability, and even how you model business workflows.</p>"
    },
    {
      "title": "1. What is an event?",
      "diagram": null,
      "body": "<p>An event is a statement of fact:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\nPaymentAuthorized\nWalletDebited\nUserRegistered\nMessageSent\n</code></pre></div>\n<p>It should normally describe something that has <strong>already happened</strong>.</p>\n<p>Good:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentAuthorized\n</code></pre></div>\n<p>Less ideal:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>AuthorizePayment\n</code></pre></div>\n<p>The second is a command.</p>\n<p>A useful distinction:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Command:\n\"Please do this.\"\n\nEvent:\n\"This happened.\"\n</code></pre></div>"
    },
    {
      "title": "2. Request-driven architecture",
      "diagram": null,
      "body": "<p>Imagine checkout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Checkout Service\n    ↓\nPayment Service\n    ↓\nInventory Service\n    ↓\nNotification Service\n</code></pre></div>\n<p>Checkout orchestrates the whole workflow.</p>\n<p>Advantages:</p>\n<ul>\n<li>easy to understand</li>\n<li>immediate response</li>\n<li>explicit control flow</li>\n<li>easier local debugging</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>temporal coupling</li>\n<li>failure propagation</li>\n<li>long call chains</li>\n<li>higher latency</li>\n<li>tight service knowledge</li>\n</ul>\n<p>If Notification is unavailable, Checkout must decide what to do.</p>"
    },
    {
      "title": "3. Event-driven version",
      "diagram": null,
      "body": "<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Checkout Service\n    ↓\nOrderCreated\n    ↓\nEvent Bus\n    ├── Inventory Service\n    ├── Payment Service\n    ├── Notification Service\n    └── Analytics Service\n</code></pre></div>\n<p>Each service reacts independently.</p>\n<p>The publisher does not know:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>who consumes\nhow many consumers exist\nwhen they process\n</code></pre></div>\n<p>This creates loose runtime coupling.</p>\n<p>But remember:</p>\n<div class=\"callout\">\n<p>Runtime coupling decreases, contract coupling increases.</p>\n</div>\n<p>Everyone now depends on:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event name\nevent meaning\nschema\nordering semantics\ndelivery semantics\n</code></pre></div>"
    },
    {
      "title": "4. EDA is not automatically better",
      "diagram": null,
      "body": "<p>This is important.</p>\n<p>Many teams hear:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>microservices + Kafka = scalable architecture\n</code></pre></div>\n<p>and make everything asynchronous.</p>\n<p>Then simple workflows become hard to understand.</p>\n<p>Use EDA when you benefit from:</p>\n<ul>\n<li>asynchronous processing</li>\n<li>independent scaling</li>\n<li>failure isolation</li>\n<li>fan-out</li>\n<li>replay</li>\n<li>decoupled consumers</li>\n<li>eventual consistency</li>\n</ul>\n<p>Do not use it merely because the technology is fashionable.</p>"
    },
    {
      "title": "5. Three common event-driven styles",
      "diagram": null,
      "body": "<p>There are three patterns worth distinguishing.</p>\n<h4>Event Notification</h4>\n<p>Small event:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"type\": \"OrderCreated\",\n  \"orderId\": \"O123\"\n}\n</code></pre></div>\n<p>Consumer reacts, then calls Order Service for details.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Event\n  ↓\nConsumer\n  ↓\nGET /orders/O123\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>small events</li>\n<li>less duplicated data</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>runtime dependency returns</li>\n<li>producer must remain available</li>\n<li>extra network calls</li>\n</ul>\n\n<h4>Event-Carried State Transfer</h4>\n<p>Event contains enough state:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"type\": \"OrderCreated\",\n  \"orderId\": \"O123\",\n  \"customerId\": \"C456\",\n  \"amount\": 5000,\n  \"currency\": \"INR\"\n}\n</code></pre></div>\n<p>Consumer can act independently.</p>\n<p>Advantages:</p>\n<ul>\n<li>low runtime coupling</li>\n<li>fewer synchronous calls</li>\n<li>better resilience</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>duplicated data</li>\n<li>schema growth</li>\n<li>eventual consistency</li>\n<li>privacy concerns</li>\n</ul>\n\n<h4>Event Sourcing</h4>\n<p>Instead of storing only current state:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order status = PAID\n</code></pre></div>\n<p>store the sequence:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\nPaymentAuthorized\nInventoryReserved\nOrderConfirmed\n</code></pre></div>\n<p>Current state is derived by replaying events.</p>\n<p>This is a much bigger architectural commitment and not required for ordinary EDA.</p>"
    },
    {
      "title": "6. Choreography vs orchestration",
      "diagram": null,
      "body": "<p>This is one of the most important EDA distinctions.</p>\n<h4>Choreography</h4>\n<p>Services react to each other's events.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n    ↓\nInventory Service\n    ↓\nInventoryReserved\n    ↓\nPayment Service\n    ↓\nPaymentAuthorized\n    ↓\nOrder Service\n</code></pre></div>\n<p>No central coordinator.</p>\n<p>Each service knows:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>what events it listens to\nwhat events it emits\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>decentralized</li>\n<li>loose service coupling</li>\n<li>independent evolution</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>flow is hidden</li>\n<li>debugging is harder</li>\n<li>cyclic dependencies can emerge</li>\n<li>ownership becomes unclear</li>\n</ul>\n\n<h4>Orchestration</h4>\n<p>A central workflow component coordinates.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order Saga Orchestrator\n    ↓\nReserve Inventory\n    ↓\nAuthorize Payment\n    ↓\nConfirm Order\n</code></pre></div>\n<p>Services report results back.</p>\n<p>Advantages:</p>\n<ul>\n<li>explicit workflow</li>\n<li>easier to visualize</li>\n<li>centralized retry/compensation logic</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>orchestrator becomes important infrastructure</li>\n<li>more central coordination</li>\n<li>possible coupling to workflow implementation</li>\n</ul>\n<p>We'll cover orchestration more deeply in the Saga lesson.</p>"
    },
    {
      "title": "7. The hidden workflow problem",
      "diagram": null,
      "body": "<p>Choreography often starts simple.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n    ↓\nPayment Service\n</code></pre></div>\n<p>Later:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n    ↓\nInventory Service\n    ↓\nInventoryReserved\n    ↓\nPayment Service\n    ↓\nPaymentAuthorized\n    ↓\nNotification\n    ↓\nLoyalty\n</code></pre></div>\n<p>Then someone asks:</p>\n<div class=\"callout\">\n<p>What exactly happens when an order is created?</p>\n</div>\n<p>The answer is now spread across six repositories.</p>\n<p>This is called an <strong>implicit workflow</strong>.</p>\n<p>A mature EDA system needs:</p>\n<ul>\n<li>event catalog</li>\n<li>dependency map</li>\n<li>schema registry</li>\n<li>tracing</li>\n<li>ownership metadata</li>\n</ul>\n<p>Otherwise the architecture becomes invisible.</p>"
    },
    {
      "title": "8. Eventual consistency",
      "diagram": null,
      "body": "<p>EDA usually implies that not every service updates at once.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentAuthorized at 10:00:00.000\n\nOrder Service updated at 10:00:00.120\n\nAnalytics updated at 10:00:03.000\n\nNotification sent at 10:00:05.000\n</code></pre></div>\n<p>For a few seconds:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment says AUTHORIZED\nOrder still says PENDING\n</code></pre></div>\n<p>This is eventual consistency.</p>\n<p>The key design question is:</p>\n<div class=\"callout\">\n<p>How stale can each view safely be?</p>\n</div>\n<p>For analytics:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>minutes may be acceptable\n</code></pre></div>\n<p>For payment status:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maybe not\n</code></pre></div>\n<p>EDA requires explicit thinking about consistency windows.</p>"
    },
    {
      "title": "9. Business invariant vs eventual consistency",
      "diagram": null,
      "body": "<p>Not every business rule can be eventually consistent.</p>\n<p>Suppose wallet balance is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>₹1,000\n</code></pre></div>\n<p>Two services independently process:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit ₹800\nDebit ₹800\n</code></pre></div>\n<p>If each relies on eventually synchronized events:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>both may succeed\n</code></pre></div>\n<p>That breaks the invariant:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>balance &gt;= 0\n</code></pre></div>\n<p>Strong invariants should usually be enforced by the service that owns the data.</p>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet Service\n    owns balance consistency\n</code></pre></div>\n<p>Other services consume:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WalletDebited\nWalletCreditFailed\n</code></pre></div>\n<p>after the authoritative decision.</p>\n<p>EDA does not remove the need for clear ownership.</p>"
    },
    {
      "title": "10. Event ownership",
      "diagram": null,
      "body": "<p>A good rule:</p>\n<div class=\"callout\">\n<p>The service that owns the business state should publish the event representing that state change.</p>\n</div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment Service\n    publishes PaymentAuthorized\n</code></pre></div>\n<p>not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order Service\n    publishes PaymentAuthorized\n</code></pre></div>\n<p>Order Service can publish:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentRequested\n</code></pre></div>\n<p>or send a command.</p>\n<p>But only Payment Service knows authoritatively:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment was authorized\n</code></pre></div>\n<p>This prevents contradictory sources of truth.</p>"
    },
    {
      "title": "11. Domain events vs integration events",
      "diagram": null,
      "body": "<p>Another useful distinction.</p>\n<h4>Domain event</h4>\n<p>Internal to a bounded context:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BalanceRecalculated\n</code></pre></div>\n<p>May use rich internal structures.</p>\n<h4>Integration event</h4>\n<p>Published externally to other services:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WalletDebited\n</code></pre></div>\n<p>Should have:</p>\n<ul>\n<li>stable schema</li>\n<li>documented semantics</li>\n<li>compatibility guarantees</li>\n<li>controlled sensitive data</li>\n</ul>\n<p>Do not expose every internal implementation event externally.</p>"
    },
    {
      "title": "12. Event schema design",
      "diagram": null,
      "body": "<p>A robust event envelope:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"eventId\": \"evt-123\",\n  \"eventType\": \"PaymentAuthorized\",\n  \"schemaVersion\": 2,\n  \"occurredAt\": \"2026-07-24T02:30:00Z\",\n  \"producer\": \"payment-service\",\n  \"correlationId\": \"order-456\",\n  \"causationId\": \"cmd-789\",\n  \"payload\": {\n    \"paymentId\": \"P100\",\n    \"orderId\": \"O200\",\n    \"amount\": 5000,\n    \"currency\": \"INR\"\n  }\n}\n</code></pre></div>\n<p>Important fields:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>eventId\neventType\nschemaVersion\noccurredAt\ncorrelationId\ncausationId\nproducer\npayload\n</code></pre></div>"
    },
    {
      "title": "13. Correlation and causation",
      "diagram": null,
      "body": "<p>These are very useful for debugging.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CreateOrder command\n    ↓\nOrderCreated event\n    ↓\nPaymentRequested event\n    ↓\nPaymentAuthorized event\n</code></pre></div>\n<p>Correlation ID:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>same for entire business workflow\n</code></pre></div>\n<p>Causation ID:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>identifies the immediate event/command that caused this event\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n  eventId = E1\n  correlationId = C1\n  causationId = CMD1\n\nPaymentRequested\n  eventId = E2\n  correlationId = C1\n  causationId = E1\n</code></pre></div>\n<p>This gives you a causal chain.</p>"
    },
    {
      "title": "14. The dual-write problem",
      "diagram": null,
      "body": "<p>EDA almost immediately hits this problem.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\nINSERT payment\nCOMMIT\n\npublish PaymentAuthorized\n</code></pre></div>\n<p>Crash after commit but before publish:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment exists\nevent missing\n</code></pre></div>\n<p>Reverse order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>publish PaymentAuthorized\n\nBEGIN\nINSERT payment\nCOMMIT\n</code></pre></div>\n<p>Crash after publish but before commit:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event exists\npayment missing\n</code></pre></div>\n<p>This is the classic dual-write problem.</p>"
    },
    {
      "title": "15. Transactional Outbox",
      "diagram": null,
      "body": "<p>The common solution:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN TRANSACTION\n\nINSERT payment\nINSERT outbox_event\n\nCOMMIT\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Outbox Publisher\n    ↓\npublishes event\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>business state\n+\nintent to publish\n</code></pre></div>\n<p>are atomic.</p>\n<p>But the publisher may still publish twice.</p>\n<p>Therefore consumers remain idempotent.</p>\n<p>This gives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>atomic local transaction\n+\nat-least-once publication\n+\nidempotent consumption\n</code></pre></div>\n<p>A very common production pattern.</p>"
    },
    {
      "title": "16. Consumer inbox pattern",
      "diagram": null,
      "body": "<p>On the consumer side:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Event E123\n</code></pre></div>\n<p>Consumer records:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>processed_event(E123)\n</code></pre></div>\n<p>in the same transaction as its business state update.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nINSERT processed_event(E123)\n\nUPDATE order SET status='PAID'\n\nCOMMIT\n</code></pre></div>\n<p>If duplicate E123 arrives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>unique constraint prevents reprocessing\n</code></pre></div>\n<p>This is sometimes called an inbox or deduplication table.</p>"
    },
    {
      "title": "17. Ordering problems",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>E1: PaymentAuthorized\nE2: PaymentRefunded\n</code></pre></div>\n<p>Consumer receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>E2 before E1\n</code></pre></div>\n<p>Now its state may become inconsistent.</p>\n<p>Possible solutions:</p>\n<ul>\n<li>partition by aggregate ID</li>\n<li>sequence numbers</li>\n<li>version numbers</li>\n<li>reject stale events</li>\n<li>buffer and reorder</li>\n<li>design state transitions to tolerate reordering</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"paymentId\": \"P1\",\n  \"version\": 7\n}\n</code></pre></div>\n<p>Consumer currently has version:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>8\n</code></pre></div>\n<p>Incoming event version:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>7\n</code></pre></div>\n<p>Ignore as stale.</p>"
    },
    {
      "title": "18. Duplicate delivery",
      "diagram": null,
      "body": "<p>Assume:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>at-least-once\n</code></pre></div>\n<p>not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>exactly-once\n</code></pre></div>\n<p>Even if a broker advertises exactly-once features, end-to-end business side effects may still duplicate.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Kafka transaction commits\n    ↓\nConsumer sends email\n    ↓\nConsumer crashes\n</code></pre></div>\n<p>Kafka may know processing state, but email already went out.</p>\n<p>Exactly-once transport does not automatically mean exactly-once business effect.</p>\n<p>Idempotency remains essential.</p>"
    },
    {
      "title": "19. The “lost event” problem",
      "diagram": null,
      "body": "<p>Even with outbox, consumers may fail permanently.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event published\nsubscriber broken for 7 days\nretention = 3 days\n</code></pre></div>\n<p>Subscriber misses data.</p>\n<p>Therefore ask:</p>\n<ul>\n<li>How long are events retained?</li>\n<li>Can they be replayed?</li>\n<li>Is broker the system of record?</li>\n<li>Is there another source for reconstruction?</li>\n</ul>\n<p>Critical downstream views should often be rebuildable.</p>"
    },
    {
      "title": "20. Replayability",
      "diagram": null,
      "body": "<p>A strong EDA system often benefits from replay.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Analytics database corrupted\n</code></pre></div>\n<p>If events are retained:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>replay historical events\n    ↓\nrebuild analytics state\n</code></pre></div>\n<p>But replay-safe consumers must avoid unintended external side effects.</p>\n<p>Good replay target:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>projection database\nsearch index\nanalytics model\n</code></pre></div>\n<p>Dangerous:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>send email\ncharge card\nsend SMS\n</code></pre></div>\n<p>Consumers should separate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>state reconstruction\n</code></pre></div>\n<p>from:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>irreversible external action\n</code></pre></div>"
    },
    {
      "title": "21. Materialized views",
      "diagram": null,
      "body": "<p>EDA often creates derived read models.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\nPaymentAuthorized\nOrderShipped\n</code></pre></div>\n<p>Consumer builds:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CustomerOrderSummary\n</code></pre></div>\n<p>This is a materialized view.</p>\n<p>Advantages:</p>\n<ul>\n<li>optimized reads</li>\n<li>service autonomy</li>\n<li>no synchronous cross-service joins</li>\n</ul>\n<p>Trade-off:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>view may be temporarily stale\n</code></pre></div>\n<p>This is common in CQRS-style systems.</p>"
    },
    {
      "title": "22. Event-driven does not mean no APIs",
      "diagram": null,
      "body": "<p>Real systems use both.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Synchronous:\nGET account balance\nPOST payment authorization\n\nAsynchronous:\nPaymentAuthorized\nReceiptRequested\nAnalyticsUpdated\n</code></pre></div>\n<p>A good rule:</p>\n<p>Use synchronous communication when:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>caller needs immediate answer\n</code></pre></div>\n<p>Use events when:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>others need to react after a fact occurs\n</code></pre></div>\n<p>Hybrid architectures are normal.</p>"
    },
    {
      "title": "23. Backpressure in EDA",
      "diagram": null,
      "body": "<p>Suppose publisher emits:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100k events/sec\n</code></pre></div>\n<p>Consumer handles:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>20k/sec\n</code></pre></div>\n<p>Backlog grows.</p>\n<p>This creates:</p>\n<ul>\n<li>consumer lag</li>\n<li>stale projections</li>\n<li>delayed actions</li>\n<li>retention pressure</li>\n</ul>\n<p>You need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>autoscaling\nlag monitoring\nbounded retry\nDLQ\ncapacity planning\n</code></pre></div>\n<p>An event bus is not infinite capacity.</p>"
    },
    {
      "title": "24. Cascading event storms",
      "diagram": null,
      "body": "<p>EDA can create amplification.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Event A\n    ↓\n3 services each emit 2 events\n    ↓\n6 events\n    ↓\neach causes more events\n</code></pre></div>\n<p>One business action can generate dozens of downstream events.</p>\n<p>This is an <strong>event storm</strong>.</p>\n<p>Be careful with:</p>\n<ul>\n<li>event loops</li>\n<li>accidental self-triggering</li>\n<li>recursive workflows</li>\n<li>high fan-out</li>\n<li>duplicate amplification</li>\n</ul>\n<p>Example loop:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CustomerUpdated\n    ↓\nCRM sync\n    ↓\nCustomerUpdated\n    ↓\nCRM sync\n</code></pre></div>\n<p>Add causation tracking and loop detection where needed.</p>"
    },
    {
      "title": "25. Event granularity",
      "diagram": null,
      "body": "<p>Too coarse:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>EntityChanged\n</code></pre></div>\n<p>Consumer has no idea what happened.</p>\n<p>Too fine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CustomerFirstNameCharacterChanged\n</code></pre></div>\n<p>Creates noise.</p>\n<p>Prefer meaningful business events:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CustomerAddressChanged\nPaymentAuthorized\nWalletExpired\n</code></pre></div>\n<p>Events should represent domain-relevant facts.</p>"
    },
    {
      "title": "26. Event naming",
      "diagram": null,
      "body": "<p>Use past tense.</p>\n<p>Good:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\nPaymentFailed\nWalletCredited\n</code></pre></div>\n<p>Avoid vague names:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderUpdated\nDataChanged\nEntityProcessed\n</code></pre></div>\n<p>Precise names improve observability and contracts.</p>"
    },
    {
      "title": "27. Immutable events",
      "diagram": null,
      "body": "<p>Once published, events should generally not change.</p>\n<p>If something was wrong:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>publish correction event\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentAuthorized\n</code></pre></div>\n<p>later:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentReversed\n</code></pre></div>\n<p>Do not mutate historical event records conceptually.</p>\n<p>Events describe history.</p>"
    },
    {
      "title": "28. Versioning",
      "diagram": null,
      "body": "<p>Suppose v1:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"amount\": 100\n}\n</code></pre></div>\n<p>Need currency.</p>\n<p>Prefer:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"amount\": 100,\n  \"currency\": \"INR\"\n}\n</code></pre></div>\n<p>with backward-compatible evolution.</p>\n<p>Avoid:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"amount\": {\n    \"value\": 100,\n    \"currency\": \"INR\"\n  }\n}\n</code></pre></div>\n<p>if old consumers expect a number.</p>\n<p>Use:</p>\n<ul>\n<li>additive changes</li>\n<li>schema compatibility checks</li>\n<li>deprecation windows</li>\n<li>explicit versions when necessary</li>\n</ul>"
    },
    {
      "title": "29. Event schema registry",
      "diagram": null,
      "body": "<p>At scale, you need governance.</p>\n<p>A schema registry can enforce:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>backward compatibility\nforward compatibility\nschema ownership\nversion tracking\n</code></pre></div>\n<p>Especially useful with Avro, Protobuf, or JSON Schema.</p>\n<p>Without governance:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>producer deploys\nfive consumers silently break\n</code></pre></div>"
    },
    {
      "title": "30. Observability",
      "diagram": null,
      "body": "<p>EDA requires different observability from synchronous systems.</p>\n<p>Track:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>publish rate\nconsume rate\nconsumer lag\noldest unprocessed event age\nretry count\nDLQ count\nprocessing latency\nevent-to-effect latency\nduplicate count\nschema failures\n</code></pre></div>\n<p>Also propagate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>traceparent\ncorrelationId\neventId\ncausationId\n</code></pre></div>\n<p>Otherwise debugging becomes:</p>\n<div class=\"callout\">\n<p>“Something happened somewhere five minutes ago.”</p>\n</div>"
    },
    {
      "title": "31. Distributed tracing",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>HTTP request\n    ↓\nOrderCreated\n    ↓\nPaymentRequested\n    ↓\nPaymentAuthorized\n</code></pre></div>\n<p>The trace may span minutes.</p>\n<p>You need asynchronous trace links rather than assuming one continuous synchronous span.</p>\n<p>The important operational goal is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Given orderId O123,\nshow me every event and service involved.\n</code></pre></div>"
    },
    {
      "title": "32. Poison events",
      "diagram": null,
      "body": "<p>One malformed event can repeatedly fail.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>schemaVersion = 999\n</code></pre></div>\n<p>Consumer crashes every time.</p>\n<p>Use:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>bounded retry\n    ↓\nDLQ\n</code></pre></div>\n<p>Do not block an entire partition indefinitely unless ordering semantics require it.</p>\n<p>We will cover DLQs in detail later.</p>"
    },
    {
      "title": "33. Choreography cycle",
      "diagram": null,
      "body": "<p>Dangerous architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>A listens to B\nB listens to C\nC listens to A\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>A → B → C → A\n</code></pre></div>\n<p>Potential infinite cycles.</p>\n<p>At scale, event dependency graphs should be reviewed like code dependencies.</p>\n<p>Maintain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event producers\nevent consumers\nownership\ndirectionality\n</code></pre></div>"
    },
    {
      "title": "34. EDA and microservice boundaries",
      "diagram": null,
      "body": "<p>Events can reveal poor service boundaries.</p>\n<p>If two services constantly need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>strong consistency\nfrequent synchronous calls\nevery state transition mirrored immediately\n</code></pre></div>\n<p>they may belong in the same bounded context.</p>\n<p>EDA should not be used to force artificial separation.</p>\n<p>Sometimes the correct design is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>one service\none transaction\n</code></pre></div>\n<p>not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>five microservices\nten topics\neventual consistency everywhere\n</code></pre></div>"
    },
    {
      "title": "35. Realistic payment architecture",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment Service\n    ↓\nPaymentAuthorized\n</code></pre></div>\n<p>Subscribers:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order Service\n    updates order\n\nNotification Service\n    sends receipt\n\nAnalytics\n    records conversion\n\nLedger Service\n    records accounting entry\n</code></pre></div>\n<p>Question:</p>\n<p>Should Ledger merely consume <code class=\"inline-code\">PaymentAuthorized</code> asynchronously?</p>\n<p>Depends.</p>\n<p>If accounting correctness requires the ledger and payment state to be atomically consistent, this may be too weak.</p>\n<p>Possible options:</p>\n<ul>\n<li>keep ledger inside payment bounded context</li>\n<li>use local transaction</li>\n<li>use orchestrated workflow with reconciliation</li>\n<li>accept temporary inconsistency with strong repair guarantees</li>\n</ul>\n<p>The event bus does not answer this for you.</p>"
    },
    {
      "title": "36. Production failure scenario",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentAuthorized event published\n</code></pre></div>\n<p>Order consumer is down for 30 minutes.</p>\n<p>Customer checks order status immediately:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment = AUTHORIZED\nOrder = PENDING\n</code></pre></div>\n<p>This may be technically correct under eventual consistency but unacceptable to users.</p>\n<p>Solutions:</p>\n<ul>\n<li>synchronous confirmation for critical path</li>\n<li>faster consumer SLA</li>\n<li>show intermediate state explicitly</li>\n<li>query authoritative service</li>\n<li>redesign workflow ownership</li>\n</ul>\n<p>Consistency is a product decision as much as a technical one.</p>"
    },
    {
      "title": "37. Spring Boot example",
      "diagram": null,
      "body": "<p>Event model:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public record PaymentAuthorizedEvent(\n        UUID eventId,\n        int schemaVersion,\n        Instant occurredAt,\n        String correlationId,\n        UUID paymentId,\n        UUID orderId,\n        BigDecimal amount,\n        String currency\n) {\n}\n</code></pre></div>\n<p>Outbox entity:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Entity\n@Table(name = \"outbox_event\")\npublic class OutboxEvent {\n\n    @Id\n    private UUID id;\n\n    private String eventType;\n\n    @Lob\n    private String payload;\n\n    private Instant createdAt;\n\n    private boolean published;\n}\n</code></pre></div>\n<p>Transactional write:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void authorizePayment(Payment payment) {\n    paymentRepository.save(payment.authorize());\n\n    OutboxEvent event = outboxFactory.from(\n            new PaymentAuthorizedEvent(\n                    UUID.randomUUID(),\n                    1,\n                    Instant.now(),\n                    payment.correlationId(),\n                    payment.id(),\n                    payment.orderId(),\n                    payment.amount(),\n                    payment.currency()\n            )\n    );\n\n    outboxRepository.save(event);\n}\n</code></pre></div>\n<p>Publisher:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Scheduled(fixedDelay = 500)\npublic void publishPendingEvents() {\n    List&lt;OutboxEvent&gt; events =\n            outboxRepository.findTop100ByPublishedFalseOrderByCreatedAt();\n\n    for (OutboxEvent event : events) {\n        eventPublisher.pub\n\n&gt; Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.\n</code></pre></div>"
    }
  ],
  "keyTakeaways": [
    "EDA reduces runtime coupling but increases event-contract coupling.",
    "Strong invariants remain inside the authoritative owning service.",
    "Use local transactions plus outbox publication and idempotent inbox consumption.",
    "Make workflows, causation, replay behavior, and consumer ownership visible.",
    "Use synchronous APIs and events together based on when an immediate answer is required."
  ]
};
