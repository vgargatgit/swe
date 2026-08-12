window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-19-saga-pattern"] = {
  "day": 19,
  "title": "Saga Pattern",
  "subtitle": "Run a sequence of local transactions with durable state, retries, and compensating actions.",
  "tags": [
    "Saga",
    "Orchestration",
    "Choreography",
    "Compensation",
    "Durable workflow",
    "Idempotency"
  ],
  "core": "A saga manages a business transaction that spans multiple services by breaking it into a sequence of local transactions and using compensating actions when later steps fail.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "stateDiagram-v2\n  [*] --> Started\n  Started --> InventoryReserved\n  InventoryReserved --> WalletDebited\n  WalletDebited --> Completed\n  WalletDebited --> Compensating: later step fails\n  Compensating --> Refunded\n  Refunded --> InventoryReleased\n  InventoryReleased --> Failed",
      "body": "<p>A saga does not provide one global ACID transaction.</p>\n<p>Instead, it provides:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Local transaction\n    ↓\nLocal transaction\n    ↓\nLocal transaction\n    ↓\nIf failure occurs:\nrun compensating transactions\n</code></pre></div>\n<p>The goal is not to make it appear that nothing ever happened.</p>\n<p>The goal is to leave the system in an acceptable business state.</p>"
    },
    {
      "title": "1. Why sagas exist",
      "diagram": null,
      "body": "<p>Consider checkout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Reserve inventory\n2. Debit wallet\n3. Create order\n4. Arrange shipment\n</code></pre></div>\n<p>These operations belong to separate services:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Inventory Service\nWallet Service\nOrder Service\nShipping Service\n</code></pre></div>\n<p>A global transaction would require all four services and databases to participate in a distributed commit protocol.</p>\n<p>That is often impractical.</p>\n<p>So instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reserve inventory\n    ↓\nDebit wallet\n    ↓\nCreate order\n    ↓\nArrange shipment\n</code></pre></div>\n<p>If shipment fails:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cancel order\n    ↓\nRefund wallet\n    ↓\nRelease inventory\n</code></pre></div>\n<p>That sequence is a saga.</p>"
    },
    {
      "title": "2. Local transaction plus compensation",
      "diagram": null,
      "body": "<p>Each saga step has two parts:</p>\n<table>\n<thead>\n<tr>\n<th>Forward action</th>\n<th>Compensation</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Reserve inventory</td>\n<td>Release inventory</td>\n</tr>\n<tr>\n<td>Debit wallet</td>\n<td>Refund wallet</td>\n</tr>\n<tr>\n<td>Create order</td>\n<td>Cancel order</td>\n</tr>\n<tr>\n<td>Book shipment</td>\n<td>Cancel shipment</td>\n</tr>\n</tbody>\n</table>\n<p>A compensation is not a database rollback.</p>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WalletDebited\nWalletRefunded\n</code></pre></div>\n<p>Both remain in the business history.</p>\n<p>That is desirable for auditability.</p>"
    },
    {
      "title": "3. Saga state is not ACID rollback",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet debit succeeds.\nInventory reservation succeeds.\nOrder creation fails.\n</code></pre></div>\n<p>Traditional rollback would conceptually erase the first two operations.</p>\n<p>A saga instead executes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Release inventory\nRefund wallet\n</code></pre></div>\n<p>The resulting history is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>InventoryReserved\nWalletDebited\nOrderCreationFailed\nInventoryReleased\nWalletRefunded\n</code></pre></div>\n<p>The system reached a consistent business state, but intermediate facts still occurred.</p>"
    },
    {
      "title": "4. Two saga styles",
      "diagram": null,
      "body": "<p>There are two major implementation styles:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Choreography\nOrchestration\n</code></pre></div>\n<p>Both can implement the same business workflow.</p>\n<p>The difference is where coordination logic lives.</p>"
    },
    {
      "title": "5. Choreography",
      "diagram": null,
      "body": "<p>In choreography, services react to events and publish new events.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order Service\n    publishes OrderCreated\n        ↓\nInventory Service\n    reserves inventory\n    publishes InventoryReserved\n        ↓\nWallet Service\n    debits wallet\n    publishes WalletDebited\n        ↓\nShipping Service\n    creates shipment\n    publishes ShipmentCreated\n</code></pre></div>\n<p>There is no central coordinator.</p>\n<p>The workflow emerges from event reactions.</p>"
    },
    {
      "title": "6. Choreography success path",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n    ↓\nInventoryReserved\n    ↓\nWalletDebited\n    ↓\nShipmentCreated\n    ↓\nOrderConfirmed\n</code></pre></div>\n<p>Each service performs one local transaction and emits the next event.</p>"
    },
    {
      "title": "7. Choreography failure path",
      "diagram": null,
      "body": "<p>Suppose wallet debit fails:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n    ↓\nInventoryReserved\n    ↓\nWalletDebitFailed\n</code></pre></div>\n<p>Inventory Service listens for <code class=\"inline-code\">WalletDebitFailed</code> and releases inventory:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WalletDebitFailed\n    ↓\nInventoryReleased\n</code></pre></div>\n<p>Order Service listens and marks the order failed:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WalletDebitFailed\n    ↓\nOrderCancelled\n</code></pre></div>\n<p>The compensation logic is distributed across subscribers.</p>"
    },
    {
      "title": "8. Benefits of choreography",
      "diagram": null,
      "body": "<p>Choreography provides:</p>\n<ul>\n<li>low central coordination</li>\n<li>service autonomy</li>\n<li>natural event-driven integration</li>\n<li>independent deployment</li>\n<li>loose runtime coupling</li>\n</ul>\n<p>It works well when:</p>\n<ul>\n<li>workflow has relatively few steps</li>\n<li>event relationships are simple</li>\n<li>participating services already use messaging</li>\n<li>no single component needs a complete workflow view</li>\n</ul>"
    },
    {
      "title": "9. Choreography problems",
      "diagram": null,
      "body": "<p>The biggest problem is hidden control flow.</p>\n<p>To understand checkout, you may need to inspect:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order repository\nInventory repository\nWallet repository\nShipping repository\nNotification repository\n</code></pre></div>\n<p>The workflow is not visible in one place.</p>\n<p>Other problems include:</p>\n<ul>\n<li>event cycles</li>\n<li>accidental duplicate reactions</li>\n<li>unclear ownership</li>\n<li>difficult timeout handling</li>\n<li>hard operational debugging</li>\n<li>complicated compensation chains</li>\n</ul>\n<p>Choreography can become an unmaintainable event web.</p>"
    },
    {
      "title": "10. Orchestration",
      "diagram": null,
      "body": "<p>In orchestration, a central coordinator explicitly controls the workflow.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Checkout Saga Orchestrator\n    ↓ command\nInventory Service\n\nInventory Service\n    ↓ result\nOrchestrator\n\nOrchestrator\n    ↓ command\nWallet Service\n</code></pre></div>\n<p>The orchestrator decides which step comes next.</p>"
    },
    {
      "title": "11. Orchestration success path",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Orchestrator\n    ↓ ReserveInventory\nInventory\n    ↓ InventoryReserved\n\nOrchestrator\n    ↓ DebitWallet\nWallet\n    ↓ WalletDebited\n\nOrchestrator\n    ↓ CreateShipment\nShipping\n    ↓ ShipmentCreated\n\nOrchestrator\n    ↓ ConfirmOrder\nOrder\n</code></pre></div>\n<p>The workflow is explicit.</p>"
    },
    {
      "title": "12. Orchestration failure path",
      "diagram": null,
      "body": "<p>Suppose shipment creation fails:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CreateShipment\n    ↓\nShipmentFailed\n</code></pre></div>\n<p>The orchestrator executes compensations in reverse order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cancel order if created\n    ↓\nRefund wallet\n    ↓\nRelease inventory\n</code></pre></div>\n<p>The orchestrator owns the state machine.</p>"
    },
    {
      "title": "13. Benefits of orchestration",
      "diagram": null,
      "body": "<p>Orchestration gives:</p>\n<ul>\n<li>explicit workflow definition</li>\n<li>centralized timeout handling</li>\n<li>visible saga state</li>\n<li>easier compensation ordering</li>\n<li>clearer observability</li>\n<li>easier operational recovery</li>\n</ul>\n<p>It is often preferable for:</p>\n<ul>\n<li>payment workflows</li>\n<li>wallet operations</li>\n<li>travel booking</li>\n<li>onboarding</li>\n<li>order fulfillment</li>\n<li>long-running business processes</li>\n</ul>"
    },
    {
      "title": "14. Orchestration drawbacks",
      "diagram": null,
      "body": "<p>The orchestrator can become:</p>\n<ul>\n<li>a central point of workflow complexity</li>\n<li>tightly coupled to service commands</li>\n<li>operationally important</li>\n<li>a potential bottleneck if poorly designed</li>\n</ul>\n<p>It must not become a domain monolith that performs the business logic of every service.</p>\n<p>A good orchestrator decides:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>what step happens next\n</code></pre></div>\n<p>but each service still owns:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>how its own business operation works\n</code></pre></div>"
    },
    {
      "title": "15. Choreography vs orchestration",
      "diagram": null,
      "body": "<table>\n<thead>\n<tr>\n<th>Concern</th>\n<th>Choreography</th>\n<th>Orchestration</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Coordinator</td>\n<td>None</td>\n<td>Central saga coordinator</td>\n</tr>\n<tr>\n<td>Flow visibility</td>\n<td>Distributed</td>\n<td>Explicit</td>\n</tr>\n<tr>\n<td>Service autonomy</td>\n<td>Higher</td>\n<td>Slightly lower</td>\n</tr>\n<tr>\n<td>Complexity for many steps</td>\n<td>High</td>\n<td>More manageable</td>\n</tr>\n<tr>\n<td>Timeout handling</td>\n<td>Distributed</td>\n<td>Centralized</td>\n</tr>\n<tr>\n<td>Debugging</td>\n<td>Harder</td>\n<td>Easier</td>\n</tr>\n<tr>\n<td>Risk</td>\n<td>Event spaghetti</td>\n<td>God orchestrator</td>\n</tr>\n</tbody>\n</table>\n<p>A practical rule:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>2–3 simple reactions\n    → choreography may be fine\n\nCritical multi-step workflow\n    → orchestration is often clearer\n</code></pre></div>"
    },
    {
      "title": "16. Saga state machine",
      "diagram": null,
      "body": "<p>A saga should be modeled explicitly.</p>\n<p>Example states:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>STARTED\nINVENTORY_RESERVED\nWALLET_DEBITED\nSHIPMENT_CREATED\nCOMPLETED\n\nCOMPENSATING\nINVENTORY_RELEASED\nWALLET_REFUNDED\nFAILED\n</code></pre></div>\n<p>Transitions:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>STARTED\n    ↓ InventoryReserved\nINVENTORY_RESERVED\n    ↓ WalletDebited\nWALLET_DEBITED\n    ↓ ShipmentCreated\nSHIPMENT_CREATED\n    ↓\nCOMPLETED\n</code></pre></div>\n<p>Failure:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WALLET_DEBITED\n    ↓ ShipmentFailed\nCOMPENSATING\n    ↓ WalletRefunded\n    ↓ InventoryReleased\nFAILED\n</code></pre></div>\n<p>Persist saga state durably.</p>\n<p>Do not keep it only in process memory.</p>"
    },
    {
      "title": "17. Why saga state must be durable",
      "diagram": null,
      "body": "<p>Suppose the orchestrator sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DebitWallet\n</code></pre></div>\n<p>Then crashes before recording the result.</p>\n<p>On restart, it must know:</p>\n<ul>\n<li>which saga was running</li>\n<li>which command was sent</li>\n<li>whether the step completed</li>\n<li>whether compensation is required</li>\n</ul>\n<p>Without durable state, recovery is guesswork.</p>\n<p>Typical storage:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>saga_id\nsaga_type\ncurrent_state\nversion\npayload/context\nlast_command_id\ncreated_at\nupdated_at\n</code></pre></div>"
    },
    {
      "title": "18. Commands and events",
      "diagram": null,
      "body": "<p>An orchestrated saga commonly uses commands and replies.</p>\n<p>Commands:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>ReserveInventory\nDebitWallet\nCreateShipment\nRefundWallet\nReleaseInventory\n</code></pre></div>\n<p>Replies/events:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>InventoryReserved\nInventoryReservationFailed\nWalletDebited\nWalletDebitFailed\nShipmentCreated\nShipmentFailed\n</code></pre></div>\n<p>The distinction matters:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Command:\nrequested action\n\nEvent/result:\nobserved outcome\n</code></pre></div>"
    },
    {
      "title": "19. Every saga command needs an operation ID",
      "diagram": null,
      "body": "<p>Suppose the orchestrator sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DebitWallet\noperationId = saga-123-wallet-debit\n</code></pre></div>\n<p>It times out and retries.</p>\n<p>Wallet Service receives the command twice.</p>\n<p>Without idempotency:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>wallet debited twice\n</code></pre></div>\n<p>With operation-level idempotency:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>same operationId\n    ↓\nsame existing result\n</code></pre></div>\n<p>Every forward and compensation command should be idempotent.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>saga-123-reserve-inventory\nsaga-123-debit-wallet\nsaga-123-refund-wallet\n</code></pre></div>"
    },
    {
      "title": "20. Compensation must also be idempotent",
      "diagram": null,
      "body": "<p>Suppose <code class=\"inline-code\">RefundWallet</code> succeeds but its response is lost.</p>\n<p>The orchestrator retries.</p>\n<p>Without idempotency:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>refund twice\n</code></pre></div>\n<p>Compensations require the same protection as forward operations.</p>\n<p>A unique business operation ID is often enforced in the service database.</p>\n<p>For a wallet ledger:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>UNIQUE(wallet_id, operation_id)\n</code></pre></div>"
    },
    {
      "title": "21. Compensation is not always the inverse",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reserve hotel room\n</code></pre></div>\n<p>The compensation might be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cancel reservation\n</code></pre></div>\n<p>But cancellation may incur a fee.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Charge credit card\n</code></pre></div>\n<p>Compensation:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Issue refund\n</code></pre></div>\n<p>A refund is not identical to reversing the original charge:</p>\n<ul>\n<li>fees may remain</li>\n<li>settlement may already have occurred</li>\n<li>refund may take days</li>\n<li>customer sees two entries</li>\n</ul>\n<p>Compensation represents the best business correction, not mathematical inversion.</p>"
    },
    {
      "title": "22. Some actions cannot be compensated",
      "diagram": null,
      "body": "<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Email sent\nSMS delivered\nPhysical shipment handed to courier\nSensitive information exposed\nExternal market order executed\n</code></pre></div>\n<p>You cannot truly undo them.</p>\n<p>Mitigations:</p>\n<ul>\n<li>perform irreversible actions late</li>\n<li>delay them until the saga commits</li>\n<li>send corrective follow-up</li>\n<li>require manual intervention</li>\n<li>redesign workflow boundaries</li>\n</ul>\n<p>This affects step ordering.</p>"
    },
    {
      "title": "23. Pivot transaction",
      "diagram": null,
      "body": "<p>Saga literature often distinguishes three categories.</p>\n<h4>Compensatable transactions</h4>\n<p>Can be undone using a business action.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reserve inventory\nBlock wallet funds\nCreate provisional booking\n</code></pre></div>\n<h4>Pivot transaction</h4>\n<p>The point of no return.</p>\n<p>Once it succeeds, the saga should complete rather than compensate backward.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>External payment settlement\nFinal ticket issuance\n</code></pre></div>\n<h4>Retryable transactions</h4>\n<p>Steps after the pivot that must eventually succeed through retries.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Record final order state\nSend confirmation\nUpdate analytics\n</code></pre></div>\n<p>This classification helps design the workflow.</p>"
    },
    {
      "title": "24. Prefer reservation before irreversible commit",
      "diagram": null,
      "body": "<p>A robust payment workflow often uses:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Block funds\n    ↓\nReserve inventory\n    ↓\nConfirm order\n    ↓\nCommit blocked funds\n</code></pre></div>\n<p>rather than immediately debiting funds.</p>\n<p>If inventory fails:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Unblock funds\n</code></pre></div>\n<p>This is easier than:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Debit\n    ↓\nRefund\n</code></pre></div>\n<p>The pattern is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Try\nConfirm\nCancel\n</code></pre></div>\n<p>often called a TCC-style model:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Try:\nreserve resources\n\nConfirm:\nmake permanent\n\nCancel:\nrelease reservation\n</code></pre></div>"
    },
    {
      "title": "25. Wallet example",
      "diagram": null,
      "body": "<p>Suppose a wallet supports:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>block\ncommit\nunblock\n</code></pre></div>\n<p>Saga:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Block ₹500\n2. Reserve inventory\n3. Create order\n4. Commit ₹500\n</code></pre></div>\n<p>Failure before commit:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Unblock ₹500\nRelease inventory\nCancel order\n</code></pre></div>\n<p>This reduces financial compensation complexity.</p>\n<p>The wallet owns the invariant:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>available balance cannot go below zero\n</code></pre></div>\n<p>The saga only coordinates business progression.</p>"
    },
    {
      "title": "26. Saga isolation problem",
      "diagram": null,
      "body": "<p>Traditional ACID transactions provide isolation.</p>\n<p>Sagas do not.</p>\n<p>While a saga is running, other transactions may observe intermediate state.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Inventory reserved\nOrder not yet confirmed\n</code></pre></div>\n<p>Another user sees reduced inventory.</p>\n<p>Or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet funds blocked\nOrder still pending\n</code></pre></div>\n<p>The customer sees less available balance.</p>\n<p>This is expected.</p>\n<p>You need business-level isolation strategies.</p>"
    },
    {
      "title": "27. Semantic locks",
      "diagram": null,
      "body": "<p>A semantic lock is a business state that indicates an operation is in progress.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order status = PENDING\n</code></pre></div>\n<p>Other processes know:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>do not ship yet\ndo not treat as confirmed\n</code></pre></div>\n<p>For wallet:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>funds = BLOCKED\n</code></pre></div>\n<p>For inventory:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>stock = RESERVED\n</code></pre></div>\n<p>These are domain-level locks rather than database locks held across services.</p>"
    },
    {
      "title": "28. Commutative updates",
      "diagram": null,
      "body": "<p>Where possible, design operations whose order does not matter.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Increment analytics counter\n</code></pre></div>\n<p>may commute with another increment.</p>\n<p>But:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>set balance to value\n</code></pre></div>\n<p>may not.</p>\n<p>Commutative operations reduce saga concurrency problems.</p>"
    },
    {
      "title": "29. Version checks",
      "diagram": null,
      "body": "<p>Suppose a saga tries to update an order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Expected version = 5\n</code></pre></div>\n<p>But another process already changed it to:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>version = 6\n</code></pre></div>\n<p>Use optimistic locking:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>UPDATE order\nSET status = ..., version = 6\nWHERE id = ?\n  AND version = 5\n</code></pre></div>\n<p>If zero rows update, the saga detects conflict and decides whether to retry, compensate, or escalate.</p>"
    },
    {
      "title": "30. Timeouts in sagas",
      "diagram": null,
      "body": "<p>Suppose the orchestrator sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>ReserveInventory\n</code></pre></div>\n<p>No reply arrives.</p>\n<p>Possible causes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Command not delivered\nCommand processed, reply lost\nService still processing\nService failed\n</code></pre></div>\n<p>The orchestrator must not immediately assume failure.</p>\n<p>It should use:</p>\n<ul>\n<li>idempotent retries</li>\n<li>operation status lookup</li>\n<li>timeout state</li>\n<li>reconciliation</li>\n</ul>\n<p>A timeout is an unknown outcome, not definitive failure.</p>"
    },
    {
      "title": "31. Saga timers",
      "diagram": null,
      "body": "<p>Long-running sagas need durable timers.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment must complete within 15 minutes\nReservation expires after 10 minutes\nExternal review may take 24 hours\n</code></pre></div>\n<p>Do not implement durable business timers using:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Thread.sleep(...)\n</code></pre></div>\n<p>or in-memory scheduled tasks alone.</p>\n<p>Use:</p>\n<ul>\n<li>durable workflow engine</li>\n<li>scheduled message</li>\n<li>database-backed timer</li>\n<li>queue delay</li>\n<li>external scheduler</li>\n</ul>\n<p>The timer must survive process restarts.</p>"
    },
    {
      "title": "32. Retry vs compensation",
      "diagram": null,
      "body": "<p>When a step fails, decide:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Is failure transient?\n    → retry\n\nIs failure business-final?\n    → compensate\n\nIs outcome unknown?\n    → reconcile/query status\n</code></pre></div>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connection timeout\n    → retry with same operation ID\n\nInsufficient wallet balance\n    → business-final, compensate prior steps\n\nHTTP response lost after external charge\n    → reconcile before retry or compensate\n</code></pre></div>\n<p>Do not compensate immediately for every technical failure.</p>"
    },
    {
      "title": "33. Compensation failure",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Shipment failed\n    ↓\nRefund wallet\n</code></pre></div>\n<p>But refund fails.</p>\n<p>Now the saga is stuck in:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>COMPENSATION_PENDING\n</code></pre></div>\n<p>This must be treated as a first-class state.</p>\n<p>Do not silently mark the saga failed and forget it.</p>\n<p>You need:</p>\n<ul>\n<li>retry policy</li>\n<li>alerting</li>\n<li>reconciliation</li>\n<li>manual repair tools</li>\n<li>audit trail</li>\n</ul>\n<p>A saga is not complete until forward processing or required compensation reaches a terminal state.</p>"
    },
    {
      "title": "34. Manual intervention",
      "diagram": null,
      "body": "<p>Some sagas cannot recover automatically.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Airline booking confirmed\nHotel cancellation failed\nRefund provider unavailable\n</code></pre></div>\n<p>A production saga system should support:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>MANUAL_REVIEW_REQUIRED\n</code></pre></div>\n<p>along with:</p>\n<ul>\n<li>current state</li>\n<li>completed steps</li>\n<li>failed step</li>\n<li>attempted compensations</li>\n<li>operation IDs</li>\n<li>external references</li>\n<li>operator actions</li>\n</ul>\n<p>Human recovery is part of the design, not an embarrassment.</p>"
    },
    {
      "title": "35. Saga logs and observability",
      "diagram": null,
      "body": "<p>For every saga, you should be able to answer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>What step is it on?\nWhat has completed?\nWhat failed?\nWhat is being retried?\nWhat compensations ran?\nHow long has it been stuck?\n</code></pre></div>\n<p>Useful fields:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>sagaId\nsagaType\nbusinessId\nstate\ncurrentStep\nattempt\ncorrelationId\nlastError\nnextRetryAt\nstartedAt\nupdatedAt\n</code></pre></div>\n<p>Metrics:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>sagas_started_total\nsagas_completed_total\nsagas_failed_total\nsagas_compensating_total\nsagas_stuck_total\nsaga_duration\nstep_retry_count\ncompensation_failure_count\n</code></pre></div>"
    },
    {
      "title": "36. Avoid logging only technical success",
      "diagram": null,
      "body": "<p>A broker message may be delivered successfully while the business saga remains stuck.</p>\n<p>You need business metrics such as:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>orders pending over 10 minutes\nwallet refunds pending\ninventory reservations expired\nsagas awaiting manual repair\n</code></pre></div>\n<p>Infrastructure health is not workflow health.</p>"
    },
    {
      "title": "37. Transactional outbox in a saga participant",
      "diagram": null,
      "body": "<p>Suppose Inventory Service handles <code class=\"inline-code\">ReserveInventory</code>.</p>\n<p>Inside one transaction:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nCreate reservation\nInsert outbox event InventoryReserved\n\nCOMMIT\n</code></pre></div>\n<p>Then the event is published asynchronously.</p>\n<p>This ensures:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>reservation state\n+\nresult event intent\n</code></pre></div>\n<p>are atomic.</p>\n<p>Every saga participant may need an outbox.</p>"
    },
    {
      "title": "38. Inbox for saga commands",
      "diagram": null,
      "body": "<p>Inventory Service receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>ReserveInventory\ncommandId = C123\n</code></pre></div>\n<p>Inside one local transaction:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nInsert inbox record C123\nCreate reservation\nInsert outbox result event\n\nCOMMIT\n</code></pre></div>\n<p>If C123 is redelivered:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>duplicate inbox key\n    ↓\nreturn/replay existing result\n</code></pre></div>\n<p>This creates reliable local processing.</p>"
    },
    {
      "title": "39. Saga consistency architecture",
      "diagram": null,
      "body": "<p>A robust participant flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Receive command\n    ↓\nInbox deduplication\n    ↓\nLocal business transaction\n    ↓\nOutbox result event\n    ↓\nCommit\n    ↓\nPublisher sends result\n</code></pre></div>\n<p>The orchestrator itself similarly persists:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>saga state\n+\nnext command outbox\n</code></pre></div>\n<p>atomically.</p>"
    },
    {
      "title": "40. Spring Boot orchestrator model",
      "diagram": null,
      "body": "<p>A simplified saga entity:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Entity\n@Table(name = \"checkout_saga\")\npublic class CheckoutSaga {\n\n    @Id\n    private UUID sagaId;\n\n    private UUID orderId;\n\n    @Enumerated(EnumType.STRING)\n    private CheckoutSagaState state;\n\n    @Version\n    private long version;\n\n    private String lastError;\n    private Instant nextRetryAt;\n    private Instant createdAt;\n    private Instant updatedAt;\n}\n</code></pre></div>\n<p>States:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public enum CheckoutSagaState {\n    STARTED,\n    INVENTORY_RESERVATION_PENDING,\n    INVENTORY_RESERVED,\n    WALLET_DEBIT_PENDING,\n    WALLET_DEBITED,\n    SHIPMENT_PENDING,\n    COMPLETED,\n    COMPENSATING_WALLET,\n    COMPENSATING_INVENTORY,\n    FAILED,\n    MANUAL_REVIEW\n}\n</code></pre></div>\n<p>The <code class=\"inline-code\">@Version</code> field helps prevent two orchestrator workers from advancing the same saga concurrently.</p>"
    },
    {
      "title": "41. Command envelope",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public record SagaCommand&lt;T&gt;(\n        UUID commandId,\n        UUID sagaId,\n        String commandType,\n        Instant createdAt,\n        T payload\n) {\n}\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public record DebitWalletCommand(\n        UUID walletId,\n        BigDecimal amount,\n        String currency,\n        String operationId\n) {\n}\n</code></pre></div>\n<p>The operation ID must remain stable across retries.</p>"
    },
    {
      "title": "42. Transition example",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void onInventoryReserved(InventoryReserved event) {\n    CheckoutSaga saga = repository.findById(event.sagaId())\n            .orElseThrow();\n\n    if (saga.getState() != INVENTORY_RESERVATION_PENDING) {\n        // Duplicate or stale event.\n        return;\n    }\n\n    saga.setState(WALLET_DEBIT_PENDING);\n\n    outboxRepository.save(\n            commandFactory.debitWallet(saga)\n    );\n}\n</code></pre></div>\n<p>The transaction stores:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>new saga state\n+\nnext command\n</code></pre></div>\n<p>together.</p>\n<p>This avoids:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>state advanced but command not sent\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>command sent but state not advanced\n</code></pre></div>"
    },
    {
      "title": "43. Compensation transition",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void onShipmentFailed(ShipmentFailed event) {\n    CheckoutSaga saga = repository.findById(event.sagaId())\n            .orElseThrow();\n\n    if (saga.getState() != SHIPMENT_PENDING) {\n        return;\n    }\n\n    saga.setState(COMPENSATING_WALLET);\n\n    outboxRepository.save(\n            commandFactory.refundWallet(saga)\n    );\n}\n</code></pre></div>\n<p>When refund completes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>COMPENSATING_WALLET\n    ↓\nCOMPENSATING_INVENTORY\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>FAILED\n</code></pre></div>\n<p>or a more specific terminal state.</p>"
    },
    {
      "title": "44. Workflow engines",
      "diagram": null,
      "body": "<p>F</p>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "Persist saga state and timers durably.",
    "Every forward and compensation command needs a stable idempotent operation ID.",
    "Retry transient failure, compensate business-final failure, and reconcile unknown outcomes.",
    "Order compensatable, pivot, retryable, and irreversible steps deliberately.",
    "Expose stuck and compensation-pending workflows for operational repair."
  ]
};
