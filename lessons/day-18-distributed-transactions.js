window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-18-distributed-transactions"] = {
  "day": 18,
  "title": "Distributed Transactions",
  "subtitle": "Coordinate one logical business operation across multiple independent services or resources.",
  "tags": [
    "Distributed transactions",
    "2PC",
    "XA",
    "Compensation",
    "Outbox",
    "Unknown outcomes"
  ],
  "core": "A distributed transaction attempts to make one logical business operation succeed or fail atomically across multiple independent resources (databases, services, message brokers, etc.).",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Business[Logical operation] --> A[Service A / DB A]\n  Business --> B[Service B / DB B]\n  Business --> C[Broker / external system]\n  A -. partial success .-> Repair[Retry / reconcile / compensate]\n  B -. unknown outcome .-> Repair\n  C -. duplicate .-> Repair",
      "body": "<p>This is one of the hardest problems in distributed systems because <strong>ACID transactions were originally designed for a single database</strong>, not an entire network.</p>"
    },
    {
      "title": "1. What is a distributed transaction?",
      "diagram": null,
      "body": "<p>Consider a simple money transfer within one database:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nUPDATE accounts\nSET balance = balance - 100\nWHERE id = 'A';\n\nUPDATE accounts\nSET balance = balance + 100\nWHERE id = 'B';\n\nCOMMIT;\n</code></pre></div>\n<p>If the database crashes halfway:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Rollback\n</code></pre></div>\n<p>Everything remains consistent.</p>\n<p>The database provides:</p>\n<ul>\n<li>Atomicity</li>\n<li>Consistency</li>\n<li>Isolation</li>\n<li>Durability</li>\n</ul>\n<p>Now suppose A and B live in different services.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet Service\n      ↓\nPayment Service\n      ↓\nLedger Service\n</code></pre></div>\n<p>Each owns its own database.</p>\n<p>Now there is <strong>no single database transaction</strong>.</p>"
    },
    {
      "title": "2. The first failure window",
      "diagram": null,
      "body": "<p>Suppose Checkout performs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit Wallet\n      ↓\nReserve Inventory\n      ↓\nCreate Order\n</code></pre></div>\n<p>Timeline:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet ✓\nInventory ✓\nOrder ✗\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Money deducted\nInventory reserved\nOrder missing\n</code></pre></div>\n<p>Every individual service behaved correctly.</p>\n<p>The <strong>system</strong> is inconsistent.</p>"
    },
    {
      "title": "3. Why can't we just wrap everything in @Transactional?",
      "diagram": null,
      "body": "<p>Many developers initially imagine:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void checkout() {\n\n    walletService.debit();\n\n    inventoryService.reserve();\n\n    orderService.create();\n}\n</code></pre></div>\n<p>Unfortunately:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>@Transactional\n</code></pre></div>\n<p>only protects <strong>the local resource manager</strong>.</p>\n<p>Each remote HTTP call starts a completely separate transaction.</p>\n<p>The annotation does <strong>not</strong> magically create a global transaction.</p>"
    },
    {
      "title": "4. Local transaction vs distributed transaction",
      "diagram": null,
      "body": "<p>Local:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Application\n      │\n      ▼\nDatabase\n</code></pre></div>\n<p>Distributed:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Application\n     │\n ┌───┼─────────────┐\n │   │             │\n ▼   ▼             ▼\nDB1 DB2         Message Broker\n</code></pre></div>\n<p>Now someone must coordinate:</p>\n<ul>\n<li>begin</li>\n<li>prepare</li>\n<li>commit</li>\n<li>rollback</li>\n</ul>\n<p>across all participants.</p>"
    },
    {
      "title": "5. Why distributed transactions are difficult",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Service A\nService B\nService C\n</code></pre></div>\n<p>Need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>All commit\n\nOR\n\nAll rollback\n</code></pre></div>\n<p>But:</p>\n<ul>\n<li>machines crash</li>\n<li>packets disappear</li>\n<li>clocks differ</li>\n<li>processes restart</li>\n<li>networks partition</li>\n</ul>\n<p>There is no central \"truth\" that always knows the state of every participant.</p>"
    },
    {
      "title": "6. The naive approach",
      "diagram": null,
      "body": "<p>Checkout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit wallet\n\nif success:\n    reserve inventory\n\nif success:\n    create order\n\nif success:\n    send email\n</code></pre></div>\n<p>Failure:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit wallet ✓\n\nReserve inventory ✓\n\nCreate order ✗\n</code></pre></div>\n<p>Developer now tries:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Undo inventory\n\nUndo wallet\n</code></pre></div>\n<p>But what if:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Undo inventory fails?\n</code></pre></div>\n<p>Or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Undo wallet times out?\n</code></pre></div>\n<p>Rollback itself becomes distributed.</p>"
    },
    {
      "title": "7. Two Phase Commit (2PC)",
      "diagram": null,
      "body": "<p>Historically, databases solved this with <strong>Two Phase Commit</strong>.</p>\n<p>Participants:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Coordinator\n\nParticipant A\nParticipant B\nParticipant C\n</code></pre></div>\n<p>Phase 1:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Coordinator\n\n↓\n\nCan you commit?\n</code></pre></div>\n<p>Each participant responds:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>YES\n\nor\n\nNO\n</code></pre></div>\n<p>No one commits yet.</p>"
    },
    {
      "title": "8. Prepare phase",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Coordinator\n      │\n      ├── Prepare A\n      │\n      ├── Prepare B\n      │\n      └── Prepare C\n</code></pre></div>\n<p>Each participant:</p>\n<ul>\n<li>validates</li>\n<li>acquires locks</li>\n<li>writes undo/redo logs</li>\n<li>promises it <em>can</em> commit</li>\n</ul>\n<p>Response:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Prepared\n</code></pre></div>"
    },
    {
      "title": "9. Commit phase",
      "diagram": null,
      "body": "<p>If every participant says:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Prepared\n</code></pre></div>\n<p>Coordinator sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Commit\n</code></pre></div>\n<p>Everyone commits.</p>\n<p>If anyone says:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Abort\n</code></pre></div>\n<p>Coordinator sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Rollback\n</code></pre></div>"
    },
    {
      "title": "10. Timeline",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Coordinator\n\n    │\n    │ PREPARE\n    ▼\n\nA → Prepared\nB → Prepared\nC → Prepared\n\n    │\n    │ COMMIT\n    ▼\n\nA commits\nB commits\nC commits\n</code></pre></div>\n<p>Looks perfect.</p>\n<p>But...</p>"
    },
    {
      "title": "11. Coordinator crash",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Prepare succeeds\n\nCoordinator crashes\n</code></pre></div>\n<p>Participants are waiting:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Prepared\nWaiting...\nWaiting...\nWaiting...\n</code></pre></div>\n<p>Can they decide themselves?</p>\n<p>No.</p>\n<p>Because they don't know whether others committed.</p>\n<p>Therefore they must:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Hold locks\nWait\n</code></pre></div>\n<p>This is the classic blocking problem.</p>"
    },
    {
      "title": "12. Why blocking is bad",
      "diagram": null,
      "body": "<p>Suppose Account A is locked.</p>\n<p>Other transactions:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Withdraw\n\nDeposit\n\nBalance Update\n</code></pre></div>\n<p>must wait.</p>\n<p>If coordinator is down:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Minutes\n\nHours\n</code></pre></div>\n<p>Locks remain.</p>\n<p>The database throughput collapses.</p>"
    },
    {
      "title": "13. Network partition",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Coordinator\n      │\n      X\n      │\nParticipant\n</code></pre></div>\n<p>The network fails.</p>\n<p>Did coordinator send:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>COMMIT\n</code></pre></div>\n<p>or not?</p>\n<p>Participant cannot know.</p>\n<p>This uncertainty is fundamental.</p>"
    },
    {
      "title": "14. Three Phase Commit",
      "diagram": null,
      "body": "<p>Researchers proposed <strong>Three Phase Commit (3PC)</strong>.</p>\n<p>Adds another phase:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Prepare\n\nPreCommit\n\nCommit\n</code></pre></div>\n<p>Attempts to reduce blocking.</p>\n<p>Unfortunately:</p>\n<ul>\n<li>more messages</li>\n<li>more complexity</li>\n<li>still assumes timing guarantees</li>\n</ul>\n<p>Therefore 3PC is rarely used in practice.</p>"
    },
    {
      "title": "15. XA Transactions",
      "diagram": null,
      "body": "<p>Java historically standardized distributed transactions through <strong>XA</strong>.</p>\n<p>Architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Application\n\n↓\n\nTransaction Manager\n\n↓\n\nXA Resource A\nXA Resource B\nXA Resource C\n</code></pre></div>\n<p>Examples:</p>\n<ul>\n<li>Database</li>\n<li>JMS Broker</li>\n<li>Another XA-capable database</li>\n</ul>\n<p>Frameworks like older Java EE application servers supported this model.</p>"
    },
    {
      "title": "16. Why XA became unpopular",
      "diagram": null,
      "body": "<p>Microservices changed everything.</p>\n<p>Suppose services are:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment\n\nInventory\n\nShipping\n\nWallet\n</code></pre></div>\n<p>Each:</p>\n<ul>\n<li>deployed independently</li>\n<li>owns database</li>\n<li>different technology</li>\n<li>different teams</li>\n</ul>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Global XA transaction\n</code></pre></div>\n<p>means:</p>\n<ul>\n<li>everyone supports XA</li>\n<li>coordinator exists</li>\n<li>long-held locks</li>\n<li>synchronous availability</li>\n<li>higher latency</li>\n</ul>\n<p>This hurts scalability.</p>"
    },
    {
      "title": "17. Long-running business transactions",
      "diagram": null,
      "body": "<p>Imagine booking travel.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reserve Flight\n\nReserve Hotel\n\nReserve Taxi\n</code></pre></div>\n<p>User spends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>15 minutes\n</code></pre></div>\n<p>choosing seats.</p>\n<p>Should the airline DB lock rows for:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>15 minutes?\n</code></pre></div>\n<p>Obviously not.</p>\n<p>Traditional transactions were never intended for business workflows lasting minutes or hours.</p>"
    },
    {
      "title": "18. The CAP perspective",
      "diagram": null,
      "body": "<p>Distributed transactions strongly prefer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Consistency\n</code></pre></div>\n<p>during execution.</p>\n<p>During network partitions:</p>\n<p>you may lose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Availability\n</code></pre></div>\n<p>because everyone waits for coordination.</p>\n<p>Modern systems often choose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Availability\n\n+\n\nEventual consistency\n</code></pre></div>\n<p>instead.</p>"
    },
    {
      "title": "19. Compensation instead of rollback",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet debited\n</code></pre></div>\n<p>Instead of rolling back database history:</p>\n<p>publish:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WalletRefunded\n</code></pre></div>\n<p>History becomes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WalletDebited\n\nWalletRefunded\n</code></pre></div>\n<p>Notice:</p>\n<p>Nothing is erased.</p>\n<p>A new business event compensates for the earlier one.</p>\n<p>This is fundamentally different from SQL rollback.</p>"
    },
    {
      "title": "20. Example",
      "diagram": null,
      "body": "<p>Traditional transaction:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit\n\nFailure\n\nRollback\n</code></pre></div>\n<p>History:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Nothing happened\n</code></pre></div>\n<p>Saga-style compensation:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit\n\nFailure\n\nRefund\n</code></pre></div>\n<p>History:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit happened\n\nRefund happened\n</code></pre></div>\n<p>Both remain visible.</p>\n<p>Accounting systems often prefer this model.</p>"
    },
    {
      "title": "21. Why compensation isn't always possible",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Email sent\n</code></pre></div>\n<p>Can you \"unsend\" it?</p>\n<p>No.</p>\n<p>Or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>SMS delivered\n</code></pre></div>\n<p>Cannot rollback.</p>\n<p>Instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Send correction\n</code></pre></div>\n<p>Some actions are:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Irreversible\n</code></pre></div>\n<p>Distributed transaction design depends heavily on which operations are compensatable.</p>"
    },
    {
      "title": "22. Ordering of irreversible actions",
      "diagram": null,
      "body": "<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Send Email\n\n↓\n\nCharge Card\n</code></pre></div>\n<p>Charge fails.</p>\n<p>Customer already received:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Thanks for your purchase!\n</code></pre></div>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Charge\n\n↓\n\nCommit business state\n\n↓\n\nEmail\n</code></pre></div>\n<p>Irreversible side effects usually belong near the end of a workflow.</p>"
    },
    {
      "title": "23. Idempotency again",
      "diagram": null,
      "body": "<p>Suppose coordinator retries:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit wallet\n</code></pre></div>\n<p>because response timed out.</p>\n<p>Did wallet receive it?</p>\n<p>Unknown.</p>\n<p>Wallet endpoint must be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Idempotent\n</code></pre></div>\n<p>Otherwise:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit twice\n</code></pre></div>\n<p>Distributed transactions heavily depend on idempotent operations.</p>"
    },
    {
      "title": "24. Timeouts",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reserve inventory\n</code></pre></div>\n<p>times out after:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5 seconds\n</code></pre></div>\n<p>Question:</p>\n<p>Did reservation happen?</p>\n<p>Three possibilities:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>No\n\nYes\n\nUnknown\n</code></pre></div>\n<p>The third case is the hardest.</p>\n<p>The coordinator cannot simply assume failure.</p>\n<p>Unknown outcomes appear constantly in distributed systems.</p>"
    },
    {
      "title": "25. Retry danger",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /reserve\n</code></pre></div>\n<p>times out.</p>\n<p>Retry:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reserve again\n</code></pre></div>\n<p>Inventory becomes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reserved twice\n</code></pre></div>\n<p>Unless:</p>\n<ul>\n<li>idempotency key</li>\n<li>unique reservation ID</li>\n<li>deduplication</li>\n</ul>\n<p>are used.</p>"
    },
    {
      "title": "26. Partial failure is normal",
      "diagram": null,
      "body": "<p>Single database thinking:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Success\n\nor\n\nFailure\n</code></pre></div>\n<p>Distributed systems:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Success\n\nFailure\n\nUnknown\n\nPartial success\n\nTimeout after success\n\nTimeout before success\n\nDuplicate success\n</code></pre></div>\n<p>Designs must explicitly handle these states.</p>"
    },
    {
      "title": "27. Outbox pattern revisited",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Update payment DB\n\nPublish PaymentAuthorized\n</code></pre></div>\n<p>Need atomicity.</p>\n<p>Solution:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nUpdate payment\n\nInsert outbox row\n\nCOMMIT\n</code></pre></div>\n<p>Publisher later emits event.</p>\n<p>No distributed transaction required.</p>\n<p>This replaces:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DB\n\n+\n\nBroker\n\nglobal transaction\n</code></pre></div>\n<p>with:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Local transaction\n\n+\n\nReliable asynchronous publication\n</code></pre></div>"
    },
    {
      "title": "28. Inbox pattern",
      "diagram": null,
      "body": "<p>Consumer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Receive event\n</code></pre></div>\n<p>Transaction:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nInsert eventId\n\nUpdate local DB\n\nCOMMIT\n</code></pre></div>\n<p>Duplicate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Unique constraint\n\n↓\n\nIgnore\n</code></pre></div>\n<p>Again:</p>\n<p>No distributed transaction.</p>"
    },
    {
      "title": "29. Why modern architectures avoid global transactions",
      "diagram": null,
      "body": "<p>Instead of:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Huge ACID transaction\n</code></pre></div>\n<p>Modern systems often compose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Local ACID\n\n+\n\nOutbox\n\n+\n\nInbox\n\n+\n\nIdempotency\n\n+\n\nRetries\n\n+\n\nCompensation\n\n+\n\nEventually consistent workflow\n</code></pre></div>\n<p>Each piece is simpler.</p>\n<p>Together they achieve reliable business behavior.</p>"
    },
    {
      "title": "30. Banking example",
      "diagram": null,
      "body": "<p>Transfer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Withdraw ₹500\n\nDeposit ₹500\n</code></pre></div>\n<p>Inside one bank database:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Local transaction\n</code></pre></div>\n<p>Easy.</p>\n<p>Across:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Bank A\n\nBank B\n</code></pre></div>\n<p>Now:</p>\n<ul>\n<li>network</li>\n<li>regulations</li>\n<li>independent ownership</li>\n<li>independent databases</li>\n</ul>\n<p>Distributed transaction becomes much harder.</p>\n<p>Instead, banks often rely on:</p>\n<ul>\n<li>settlement systems</li>\n<li>reconciliation</li>\n<li>compensating entries</li>\n<li>audit trails</li>\n</ul>\n<p>rather than one giant ACID transaction.</p>"
    },
    {
      "title": "31. Spring example",
      "diagram": null,
      "body": "<p>Incorrect expectation:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void checkout() {\n\n    paymentClient.pay();\n\n    inventoryClient.reserve();\n\n    orderClient.create();\n}\n</code></pre></div>\n<p>The annotation does <strong>not</strong> span:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment service\n\ninventory service\n\norder service\n</code></pre></div>\n<p>Each remote service has its own transaction.</p>\n\n<p>Better architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order Service\n\nBEGIN\n\nCreate order\n\nInsert outbox\n\nCOMMIT\n\n↓\n\nPublish OrderCreated\n</code></pre></div>\n<p>Consumers:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Inventory\n\nPayment\n\nNotification\n</code></pre></div>\n<p>Each:</p>\n<ul>\n<li>local transaction</li>\n<li>inbox deduplication</li>\n<li>compensation if needed</li>\n</ul>"
    },
    {
      "title": "32. Production incident",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment Service\n\n↓\n\nInventory Service\n\n↓\n\nOrder Service\n</code></pre></div>\n<p>Inventory experiences a:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30-second GC pause\n</code></pre></div>\n<p>Payment already committed.</p>\n<p>Checkout times out.</p>\n<p>User retries.</p>\n<p>Without idempotency:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Card charged twice.\n</code></pre></div>\n<p>Root cause wasn't payment.</p>\n<p>It was distributed uncertainty.</p>"
    },
    {
      "title": "33. Interview question",
      "diagram": null,
      "body": "<p><strong>Why don't modern microservices use distributed XA transactions everywhere?</strong></p>\n<p>Strong answer:</p>\n<div class=\"callout\">\n<p>XA provides atomic commits across multiple resource managers using a coordinator and two-phase commit. However, it introduces blocking, higher latency, coordinator dependence, lock contention, and requires all participants to support the protocol. In independently deployed microservices, especially across heterogeneous technologies, these trade-offs usually outweigh the benefits.</p>\n<p>Modern systems typically prefer local ACID transactions combined with patterns such as transactional outbox, inbox deduplication, idempotent APIs, retries, and compensating actions through sagas. This accepts eventual consistency while improving availability, scalability, and operational simplicity.</p>\n</div>"
    },
    {
      "title": "34. Decision framework",
      "diagram": null,
      "body": "<p>When a workflow spans multiple services, ask:</p>\n<ol>\n<li>Does this truly require atomic commit?</li>\n<li>Which service owns each piece of state?</li>\n<li>Which operations are reversible?</li>\n<li>Which operations are irreversible?</li>\n<li>Can compensation express the business correction?</li>\n<li>Which APIs must be idempotent?</li>\n<li>What happens after timeout?</li>\n<li>What happens after duplicate delivery?</li>\n<li>Can reconciliation repair inconsistencies?</li>\n<li>Can eventual consistency satisfy business requirements?</li>\n</ol>"
    },
    {
      "title": "Key takeaways",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Single database\n    ACID transaction\n\nMultiple services\n    Distributed transaction problem\n\n2PC\n    Atomic but blocking\n\nXA\n    Useful but heavy for microservices\n\nModern microservices\n    Prefer local transactions\n\nOutbox\n    Reliable publication\n\nInbox\n    Reliable consumption\n\nIdempotency\n    Handles duplicates\n\nCompensation\n    Reverses business effects\n\nEventual consistency\n    Replaces global locking\n\nUnknown outcomes\n    Must be explicitly designed for\n</code></pre></div>"
    },
    {
      "title": "Case Study: Designing a Wallet-Based Checkout",
      "diagram": null,
      "body": "<p>Imagine you're designing an e-commerce checkout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Customer\n    │\n    ▼\nCheckout Service\n    │\n    ├── Wallet Service\n    ├── Inventory Service\n    ├── Order Service\n    └── Notification Service\n</code></pre></div>\n<p>The business requirement is:</p>\n<ol>\n<li>Debit the customer's wallet.</li>\n<li>Reserve inventory.</li>\n<li>Create the order.</li>\n<li>Send a confirmation.</li>\n</ol>\n<p>Think through these scenarios:</p>\n<ul>\n<li>Wallet debit succeeds, inventory reservation fails.</li>\n<li>Inventory reservation succeeds, but the outbox publisher is temporarily down.</li>\n<li>The <code class=\"inline-code\">OrderCreated</code> event is published twice.</li>\n<li>The customer retries checkout after a timeout, but the original request eventually completes.</li>\n<li>Notification is unavailable for two hours.</li>\n</ul>\n<p>For each case, identify:</p>\n<ul>\n<li>Which service owns the authoritative state?</li>\n<li>Where local transactions begin and end.</li>\n<li>Which operations require idempotency keys.</li>\n<li>Which failures are handled by retries versus compensating actions.</li>\n<li>Which inconsistencies require reconciliation.</li>\n</ul>\n<p>If you can design this workflow without relying on a global transaction coordinator, you've internalized the key lessons from today's topic.</p>\n<p>Tomorrow we'll build directly on this foundation with <strong>Saga Pattern</strong>, where we'll see how long-running business workflows are coordinated using orchestration and choreography, compensation ordering, failure recovery, and practical implementations in Spring Boot and cloud-native systems.</p>"
    }
  ],
  "keyTakeaways": [
    "@Transactional does not span remote services.",
    "2PC/XA trades availability, latency, and lock duration for coordinated atomicity.",
    "Unknown and partial outcomes are normal across a network.",
    "Modern services often compose local ACID, outbox, inbox, idempotency, retries, reconciliation, and compensation.",
    "Choose eventual consistency only when the business invariant permits it."
  ]
};
