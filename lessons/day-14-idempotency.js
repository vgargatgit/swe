window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-14-idempotency"] = {
  "day": 14,
  "title": "Idempotency",
  "subtitle": "Make repeated execution of the same logical operation safe after retries, timeouts, and duplicate delivery.",
  "tags": [
    "Idempotency",
    "Payments",
    "Deduplication",
    "Unique constraint",
    "Request fingerprint",
    "Reconciliation"
  ],
  "core": "An idempotent operation can be repeated without causing additional unintended side effects.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Client -- stable idempotency key --> API\n  API --> Record[(PENDING / COMPLETED record)]\n  Record -- new --> Effect[Perform domain effect]\n  Effect --> Complete[Store final result]\n  Record -- duplicate completed --> Replay[Replay original result]\n  Record -- duplicate pending --> InProgress[Return processing / reconcile]",
      "body": "<p>This is what makes retries safe.</p>\n<p>The connection to the previous lessons is direct:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Timeout\n    ↓\nCaller does not know outcome\n\nRetry\n    ↓\nCaller repeats operation\n\nIdempotency\n    ↓\nRepeated operation does not create duplicate effect\n</code></pre></div>\n<p>For payment systems, order creation, wallet debit, message processing, and webhook delivery, idempotency is one of the most important correctness patterns.</p>"
    },
    {
      "title": "1. What idempotency actually means",
      "diagram": null,
      "body": "<p>Mathematically:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>f(f(x)) = f(x)\n</code></pre></div>\n<p>In system terms:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Perform operation once\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Perform same logical operation multiple times\n</code></pre></div>\n<p>should produce the same externally meaningful state.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Set account status = CLOSED\n</code></pre></div>\n<p>Repeating it:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CLOSED\nCLOSED\nCLOSED\n</code></pre></div>\n<p>does not change the final state.</p>\n<p>That is naturally idempotent.</p>\n<p>Now compare:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Increase balance by ₹100\n</code></pre></div>\n<p>Repeated twice:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>+₹100\n+₹100\n</code></pre></div>\n<p>Final result differs.</p>\n<p>Not naturally idempotent.</p>"
    },
    {
      "title": "2. HTTP method semantics",
      "diagram": null,
      "body": "<p>At the HTTP level:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET\nHEAD\nPUT\nDELETE\n</code></pre></div>\n<p>are generally considered idempotent.</p>\n<p><code class=\"inline-code\">POST</code> is not necessarily idempotent.</p>\n<p>But don't confuse protocol semantics with business semantics.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>PUT /users/123\n{\n  \"name\": \"Vikas\"\n}\n</code></pre></div>\n<p>Repeated requests set the same state.</p>\n<p>Good.</p>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>POST /wallet/123/credit\n{\n  \"amount\": 100\n}\n</code></pre></div>\n<p>Repeated requests may credit twice.</p>\n<p>Bad.</p>\n<p>But <code class=\"inline-code\">POST</code> can be made idempotent through an idempotency key.</p>"
    },
    {
      "title": "3. The classic payment problem",
      "diagram": null,
      "body": "<p>Caller sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Charge ₹5,000\n</code></pre></div>\n<p>Flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n    ↓\nPayment Service\n    ↓\nPayment Provider\n    ↓\nCharge succeeds\n    ↓\nResponse is lost\n</code></pre></div>\n<p>Client sees:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Timeout\n</code></pre></div>\n<p>Now it does not know:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Did payment fail?\n\nOR\n\nDid payment succeed and response get lost?\n</code></pre></div>\n<p>It retries.</p>\n<p>Without idempotency:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Charge #1 = ₹5,000\nCharge #2 = ₹5,000\n</code></pre></div>\n<p>Customer gets charged twice.</p>\n<p>With idempotency:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Idempotency-Key: payment-123\n</code></pre></div>\n<p>First request:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment-123\n    ↓\nProcess\n    ↓\nStore result\n</code></pre></div>\n<p>Retry:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment-123\n    ↓\nAlready processed\n    ↓\nReturn stored result\n</code></pre></div>\n<p>No duplicate side effect.</p>"
    },
    {
      "title": "4. The idempotency key",
      "diagram": null,
      "body": "<p>A client generates an identifier for the logical operation.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>POST /payments\nIdempotency-Key: 8df23d45-1c4e-4ea4-a18f-b0a2d9...\n</code></pre></div>\n<p>Server uses the key to distinguish:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Same logical operation\n</code></pre></div>\n<p>from:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>New operation\n</code></pre></div>\n<p>The key must remain the same across retries.</p>\n<p>Wrong:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1 → UUID-A\nAttempt 2 → UUID-B\n</code></pre></div>\n<p>Server sees two different requests.</p>\n<p>Correct:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment P123\n\nAttempt 1 → P123\nAttempt 2 → P123\nAttempt 3 → P123\n</code></pre></div>"
    },
    {
      "title": "5. What should the server store?",
      "diagram": null,
      "body": "<p>A minimal idempotency record:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>idempotency_key\nstatus\nrequest_hash\nresponse_status\nresponse_body\ncreated_at\nexpires_at\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Key: payment-123\nStatus: COMPLETED\nRequest hash: abc123\nHTTP status: 201\nResponse:\n{\n  \"paymentId\": \"p-98231\",\n  \"status\": \"AUTHORIZED\"\n}\n</code></pre></div>\n<p>A retry receives the exact same result.</p>"
    },
    {
      "title": "6. Request fingerprinting",
      "diagram": null,
      "body": "<p>A subtle edge case:</p>\n<p>First request:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Idempotency-Key: abc\n</code></pre></div>\n<p>Body:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"amount\": 1000,\n  \"currency\": \"INR\"\n}\n</code></pre></div>\n<p>Second request:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Idempotency-Key: abc\n</code></pre></div>\n<p>Body:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"amount\": 5000,\n  \"currency\": \"INR\"\n}\n</code></pre></div>\n<p>Should the server return the original result?</p>\n<p>No.</p>\n<p>This probably indicates a client bug or malicious misuse.</p>\n<p>So compute a normalized request hash:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>SHA-256(\n  method\n  + path\n  + normalized body\n  + tenant/user context\n)\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Same key + same hash\n    → return previous result\n\nSame key + different hash\n    → reject\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>409 Conflict\n</code></pre></div>\n<p>or a domain-specific error.</p>"
    },
    {
      "title": "7. Concurrency is the hard part",
      "diagram": null,
      "body": "<p>Suppose two identical requests arrive simultaneously:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Request A with key X\nRequest B with key X\n</code></pre></div>\n<p>Naive implementation:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>A checks DB → key absent\nB checks DB → key absent\n\nA processes payment\nB processes payment\n\nA inserts key\nB insert fails\n</code></pre></div>\n<p>Too late.</p>\n<p>The duplicate side effect already happened.</p>\n<p>This is the most important implementation edge case.</p>\n<p>You need to prevent concurrent execution for the same key.</p>"
    },
    {
      "title": "8. Database unique constraint",
      "diagram": null,
      "body": "<p>At minimum:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE TABLE idempotency_record (\n    idempotency_key VARCHAR(128) PRIMARY KEY,\n    request_hash VARCHAR(64) NOT NULL,\n    status VARCHAR(32) NOT NULL,\n    response_status INT,\n    response_body TEXT,\n    created_at TIMESTAMP NOT NULL\n);\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>INSERT key X\n</code></pre></div>\n<p>Only one request succeeds.</p>\n<p>The other gets a unique-key violation and then reads the existing record.</p>\n<p>But insertion must happen <strong>before the business side effect</strong>.</p>"
    },
    {
      "title": "9. State machine",
      "diagram": null,
      "body": "<p>A useful model:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PENDING\n    ↓\nCOMPLETED\n\nor\n\nPENDING\n    ↓\nFAILED\n</code></pre></div>\n<p>First request:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Create PENDING record\n    ↓\nExecute business operation\n    ↓\nStore COMPLETED + response\n</code></pre></div>\n<p>Second concurrent request:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Find PENDING\n</code></pre></div>\n<p>Then choose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wait briefly\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Return 409 / 425 / operation-in-progress\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Poll status endpoint\n</code></pre></div>\n<p>Do not execute the operation again.</p>"
    },
    {
      "title": "10. The crash window problem",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Insert idempotency record PENDING\n2. Charge external provider\n3. Application crashes\n4. Never mark COMPLETED\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Provider may have charged customer\nIdempotency record remains PENDING\n</code></pre></div>\n<p>Retry arrives.</p>\n<p>What should happen?</p>\n<p>This is why idempotency does not magically solve distributed transactions.</p>\n<p>You need reconciliation.</p>\n<p>Possible solution:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PENDING too long\n    ↓\nQuery provider by external reference\n    ↓\nDetermine real outcome\n    ↓\nMark COMPLETED or FAILED\n</code></pre></div>\n<p>For payment systems, always send your own stable external reference:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment-123\n</code></pre></div>\n<p>to the downstream provider if supported.</p>\n<p>Then you can reconcile.</p>"
    },
    {
      "title": "11. Idempotency key scope",
      "diagram": null,
      "body": "<p>Keys should not necessarily be globally unique forever.</p>\n<p>Scope them appropriately.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>tenant + idempotency key\nuser + idempotency key\nAPI client + idempotency key\noperation type + idempotency key\n</code></pre></div>\n<p>Example internal storage key:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>tenant123:payment:create:abc123\n</code></pre></div>\n<p>This prevents accidental collision across tenants.</p>"
    },
    {
      "title": "12. Key expiration",
      "diagram": null,
      "body": "<p>How long should idempotency keys live?</p>\n<p>Depends on retry window and business semantics.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>API retries:\n24 hours\n\nWebhook delivery:\n7 days\n\nPayment:\ncould be days or longer\n\nMessage deduplication:\ndepends on retention period\n</code></pre></div>\n<p>If expiration is too short:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Original request completed\nKey expires\nLate retry arrives\nOperation executes again\n</code></pre></div>\n<p>If expiration is too long:</p>\n<ul>\n<li>storage grows</li>\n<li>old keys accumulate</li>\n<li>collision risk rises</li>\n</ul>\n<p>Choose TTL based on maximum expected duplicate-arrival window.</p>"
    },
    {
      "title": "13. Exactly-once is usually an illusion",
      "diagram": null,
      "body": "<p>Distributed systems commonly offer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>At-most-once\nAt-least-once\n</code></pre></div>\n<p>Exactly-once end-to-end processing is very difficult.</p>\n<p>A more practical approach is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>At-least-once delivery\n+\nIdempotent processing\n=\nEffectively once\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Message delivered twice\n</code></pre></div>\n<p>Consumer checks:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event_id\n</code></pre></div>\n<p>If already processed:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>skip\n</code></pre></div>\n<p>This gives effectively-once business behavior.</p>"
    },
    {
      "title": "14. Idempotent message consumers",
      "diagram": null,
      "body": "<p>Suppose queue delivers:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated event\neventId = evt-123\n</code></pre></div>\n<p>Consumer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Notification Service\n</code></pre></div>\n<p>may receive it twice.</p>\n<p>Use processed-event table:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>CREATE TABLE processed_event (\n    event_id VARCHAR(128) PRIMARY KEY,\n    processed_at TIMESTAMP NOT NULL\n);\n</code></pre></div>\n<p>Processing flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nINSERT evt-123\n\nIf duplicate:\n    stop\n\nSend/update state\n\nCOMMIT\n</code></pre></div>\n<p>But beware external side effects.</p>\n<p>If email is sent before DB commit and then commit fails:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Email sent\nprocessed_event not stored\n</code></pre></div>\n<p>Retry sends email again.</p>\n<p>This is where outbox/inbox patterns become important.</p>"
    },
    {
      "title": "15. Idempotency with database operations",
      "diagram": null,
      "body": "<p>Some operations can be made naturally idempotent.</p>\n<p>Instead of:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>UPDATE wallet\nSET balance = balance + 100\n</code></pre></div>\n<p>use a ledger entry with unique transaction ID:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>transaction_id = credit-123\n</code></pre></div>\n<p>Insert:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>INSERT INTO wallet_ledger (\n    transaction_id,\n    wallet_id,\n    amount\n)\nVALUES (\n    'credit-123',\n    42,\n    100\n);\n</code></pre></div>\n<p>with:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>UNIQUE(transaction_id)\n</code></pre></div>\n<p>Retry:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>duplicate transaction_id\n</code></pre></div>\n<p>No second credit.</p>\n<p>This is much stronger than trying to deduplicate at the HTTP layer alone.</p>"
    },
    {
      "title": "16. Wallet-specific example",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Commit ₹500 from blocked balance\n</code></pre></div>\n<p>Bad API:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>POST /wallet/123/commit\n{\n  \"amount\": 500\n}\n</code></pre></div>\n<p>Repeated request may commit twice.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>POST /wallet/123/commit\nIdempotency-Key: reservation-789\n</code></pre></div>\n<p>And ledger:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>operation_id = reservation-789\ntype = COMMIT\namount = 500\n</code></pre></div>\n<p>Unique constraint:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(wallet_id, operation_id)\n</code></pre></div>\n<p>Retry:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>same operation_id\n</code></pre></div>\n<p>returns existing result.</p>\n<p>For financial systems, idempotency should usually be enforced at the <strong>ledger/business transaction level</strong>, not only via a temporary API cache.</p>"
    },
    {
      "title": "17. Idempotency and retries",
      "diagram": null,
      "body": "<p>Recall:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry\n    asks:\n    \"Can I safely repeat?\"\n\nIdempotency\n    answers:\n    \"Yes, if the repeated operation is recognized as the same logical action.\"\n</code></pre></div>\n<p>A safe retry pipeline:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Generate idempotency key once\n    ↓\nAttempt 1\n    ↓ timeout\nBackoff\n    ↓\nAttempt 2 with SAME key\n</code></pre></div>\n<p>Never generate new key per attempt.</p>"
    },
    {
      "title": "18. Idempotency and timeouts",
      "diagram": null,
      "body": "<p>Timeouts create ambiguous results.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client timeout\n    ↓\nServer still working\n</code></pre></div>\n<p>Retry arrives while original is still processing.</p>\n<p>Server sees:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>same idempotency key\nstatus = PENDING\n</code></pre></div>\n<p>Possible response:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>409 Conflict\n</code></pre></div>\n<p>with:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"status\": \"PROCESSING\"\n}\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>202 Accepted\n</code></pre></div>\n<p>with status URL:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>/payments/p-123/status\n</code></pre></div>\n<p>This is often safer than blocking the second request indefinitely.</p>"
    },
    {
      "title": "19. What response should duplicates receive?",
      "diagram": null,
      "body": "<p>Three common strategies.</p>\n<h4>Replay original response</h4>\n<p>Best when possible.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>First:\n201 Created\n\nRetry:\n201 Created\nsame response body\n</code></pre></div>\n<p>Very client-friendly.</p>\n\n<h4>Return current resource state</h4>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment already exists\n</code></pre></div>\n<p>Return:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>200 OK\n</code></pre></div>\n<p>with current payment object.</p>\n<p>Also reasonable.</p>\n\n<h4>Return duplicate/conflict response</h4>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>409 Conflict\n</code></pre></div>\n<p>This is simpler but pushes complexity onto clients.</p>\n<p>For APIs explicitly supporting idempotency keys, replaying the original result is usually the best developer experience.</p>"
    },
    {
      "title": "20. Don't cache only successful responses",
      "diagram": null,
      "body": "<p>Suppose first request returns:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>400 Invalid request\n</code></pre></div>\n<p>Should a retry with the same key and same body run again?</p>\n<p>Usually no reason.</p>\n<p>You may cache deterministic failures too.</p>\n<p>But be careful with transient errors.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>503 Service Unavailable\n</code></pre></div>\n<p>You probably do not want to permanently store that as final result.</p>\n<p>Classify:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Final deterministic outcome\n    → persist\n\nTransient infrastructure failure\n    → allow retry\n</code></pre></div>"
    },
    {
      "title": "21. Idempotency store failure",
      "diagram": null,
      "body": "<p>Suppose Redis holds idempotency state.</p>\n<p>Redis goes down.</p>\n<p>Should payment requests proceed?</p>\n<p>Dangerous.</p>\n<p>If idempotency guarantees are critical:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Fail closed\n</code></pre></div>\n<p>because:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cannot prove duplicate protection\n</code></pre></div>\n<p>For financial operations, durable database-backed idempotency is usually safer than volatile cache-only storage.</p>\n<p>Redis can be used as an optimization, but the real uniqueness guarantee often belongs in a durable database.</p>"
    },
    {
      "title": "22. Redis SETNX pattern",
      "diagram": null,
      "body": "<p>A common simple implementation:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>SET key value NX EX 3600\n</code></pre></div>\n<p>Only one client creates the key.</p>\n<p>Good for:</p>\n<ul>\n<li>short-lived deduplication</li>\n<li>low-risk operations</li>\n<li>request coalescing</li>\n</ul>\n<p>Less suitable as the only guarantee for critical financial effects because:</p>\n<ul>\n<li>Redis failover semantics matter</li>\n<li>TTL expiry may re-enable duplicate processing</li>\n<li>crash recovery is harder</li>\n<li>response persistence may be lost</li>\n</ul>\n<p>Use carefully.</p>"
    },
    {
      "title": "23. Database transaction pattern",
      "diagram": null,
      "body": "<p>For DB-local side effects:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>BEGIN\n\nInsert idempotency key\n    ↓\nExecute business update\n    ↓\nStore result\n    ↓\nCOMMIT\n</code></pre></div>\n<p>If insert fails due to uniqueness:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Read existing result\n</code></pre></div>\n<p>This is strong because the idempotency record and business state commit atomically.</p>\n<p>This works well when both are in the same database.</p>"
    },
    {
      "title": "24. External side effects are harder",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DB\n+\nExternal payment provider\n</code></pre></div>\n<p>You cannot commit both atomically.</p>\n<p>Sequence A:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DB record\n    ↓\nExternal call\n</code></pre></div>\n<p>Crash after external success.</p>\n<p>Sequence B:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>External call\n    ↓\nDB record\n</code></pre></div>\n<p>Crash before DB record.</p>\n<p>Both have failure windows.</p>\n<p>Solutions include:</p>\n<ul>\n<li>downstream idempotency key</li>\n<li>stable external transaction reference</li>\n<li>reconciliation</li>\n<li>saga</li>\n<li>transactional outbox where appropriate</li>\n</ul>\n<p>Idempotency is necessary but not sufficient.</p>"
    },
    {
      "title": "25. Request hash normalization",
      "diagram": null,
      "body": "<p>A request hash should be deterministic.</p>\n<p>Be careful with JSON:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"amount\": 100,\n  \"currency\": \"INR\"\n}\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"currency\": \"INR\",\n  \"amount\": 100\n}\n</code></pre></div>\n<p>Semantically same.</p>\n<p>Raw-byte hashes differ.</p>\n<p>Options:</p>\n<ul>\n<li>canonical JSON serialization</li>\n<li>hash selected semantic fields</li>\n<li>construct domain-specific fingerprint</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>hash(\n    tenantId\n  + walletId\n  + amount\n  + currency\n  + operationType\n)\n</code></pre></div>\n<p>This is often better than hashing raw payload bytes.</p>"
    },
    {
      "title": "26. Security concerns",
      "diagram": null,
      "body": "<p>Idempotency keys should be:</p>\n<ul>\n<li>hard to guess if exposed publicly</li>\n<li>sufficiently long</li>\n<li>bounded in length</li>\n<li>validated</li>\n<li>scoped by tenant/user</li>\n<li>never trusted as authorization</li>\n</ul>\n<p>An attacker should not be able to use another customer's idempotency key to retrieve their response.</p>\n<p>Always lookup using context:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>tenant_id\n+\nidempotency_key\n</code></pre></div>\n<p>not just:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>idempotency_key\n</code></pre></div>"
    },
    {
      "title": "27. Spring Boot implementation",
      "diagram": null,
      "body": "<p>A practical JPA entity:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Entity\n@Table(\n    name = \"idempotency_record\",\n    uniqueConstraints = @UniqueConstraint(\n        name = \"uk_idempotency_scope_key\",\n        columnNames = {\"scope\", \"idempotency_key\"}\n    )\n)\npublic class IdempotencyRecord {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n\n    @Column(nullable = false)\n    private String scope;\n\n    @Column(name = \"idempotency_key\", nullable = false)\n    private String idempotencyKey;\n\n    @Column(name = \"request_hash\", nullable = false)\n    private String requestHash;\n\n    @Enumerated(EnumType.STRING)\n    @Column(nullable = false)\n    private Status status;\n\n    @Column(name = \"response_status\")\n    private Integer responseStatus;\n\n    @Lob\n    @Column(name = \"response_body\")\n    private String responseBody;\n\n    private Instant createdAt;\n\n    public enum Status {\n        PENDING,\n        COMPLETED,\n        FAILED\n    }\n}\n</code></pre></div>"
    },
    {
      "title": "28. Repository",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public interface IdempotencyRecordRepository\n        extends JpaRepository&lt;IdempotencyRecord, Long&gt; {\n\n    Optional&lt;IdempotencyRecord&gt;\n    findByScopeAndIdempotencyKey(\n        String scope,\n        String idempotencyKey\n    );\n}\n</code></pre></div>"
    },
    {
      "title": "29. Processing flow",
      "diagram": null,
      "body": "<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic IdempotencyRecord begin(\n        String scope,\n        String key,\n        String requestHash) {\n\n    IdempotencyRecord record =\n            new IdempotencyRecord(\n                scope,\n                key,\n                requestHash,\n                Status.PENDING\n            );\n\n    try {\n        return repository.saveAndFlush(record);\n\n    } catch (DataIntegrityViolationException ex) {\n\n        IdempotencyRecord existing =\n                repository\n                    .findByScopeAndIdempotencyKey(scope, key)\n                    .orElseThrow();\n\n        if (!existing.getRequestHash().equals(requestHash)) {\n            throw new IdempotencyKeyReuseException();\n        }\n\n        return existing;\n    }\n}\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PENDING\n    → operation already running\n\nCOMPLETED\n    → replay response\n\nFAILED\n    → retry only if failure is classified as retryable\n</code></pre></div>\n<p>For concurrency-heavy systems, make sure transaction isolation and exception handling are tested against your actual database.</p>"
    },
    {
      "title": "30. API filter/interceptor pattern",
      "diagram": null,
      "body": "<p>You can implement idempotency in:</p>\n<ul>\n<li>servlet filter</li>\n<li>Spring interceptor</li>\n<li>controller aspect</li>\n<li>service layer</li>\n</ul>\n<p>For generic HTTP replay:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Filter/interceptor\n</code></pre></div>\n<p>works well.</p>\n<p>For financial correctness:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Business service + database constraint\n</code></pre></div>\n<p>is essential.</p>\n<p>Best architecture often uses both:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>HTTP idempotency layer\n    ↓\nDomain operation ID\n    ↓\nDatabase unique constraint\n</code></pre></div>\n<p>Defense in depth.</p>"
    },
    {
      "title": "31. Common production mistakes",
      "diagram": null,
      "body": "<h5>Generating a new key on every retry</h5>\n<p>Defeats idempotency.</p>\n<h5>No request fingerprint</h5>\n<p>Same key reused for different payloads.</p>\n<h5>Check-then-act race</h5>\n<p>Two concurrent requests both execute.</p>\n<h5>Storing key only after processing</h5>\n<p>Too late to prevent concurrent duplicates.</p>\n<h5>Expiring keys too quickly</h5>\n<p>Late retries execute again.</p>\n<h5>Idempotency only in Redis for money movement</h5>\n<p>Durability may be insufficient.</p>\n<h5>Treating PENDING as safe to rerun</h5>\n<p>Original request may still be executing.</p>\n<h5>Using idempotency key as authorization</h5>\n<p>Security vulnerability.</p>\n<h5>Ignoring external side-effect ambiguity</h5>\n<p>Local database record doesn't prove provider outcome.</p>\n<h5>Assuming exactly-once delivery</h5>\n<p>Usually unrealistic.</p>"
    },
    {
      "title": "32. Interview-style answer",
      "diagram": null,
      "body": "<p><strong>Question:</strong> How would you make a payment API idempotent?</p>\n<p>A strong answer:</p>\n<div class=\"callout\">\n<p>I would require the client to send an idempotency key representing one logical payment operation and reuse the same key across retries. The server would scope the key by tenant or account, store it under a unique database constraint, and persist a normalized request fingerprint so reuse of the same key with a different request is rejected.</p>\n<p>The first request would atomically create a PENDING idempotency record before executing the business operation. Concurrent requests with the same key would see the existing record rather than execute again. Once the operation completes, the final HTTP status and response would be persisted so retries can replay the original result.</p>\n<p>For external payment providers, I would propagate a stable transaction reference or provider-supported idempotency key, because a local database record alone cannot eliminate the crash window between the external side effect and local commit. Ambiguous outcomes would be reconciled rather than blindly retried.</p>\n</div>"
    },
    {
      "title": "33. Practical payment flow",
      "diagram": null,
      "body": "<p>A robust flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n    ↓\nPOST /payments\nIdempotency-Key: payment-123\n    ↓\nPayment Service\n    ↓\nInsert PENDING(payment-123)\n    ↓\nCall provider with externalRef=payment-123\n    ↓\nProvider authorizes\n    ↓\nPersist payment\n    ↓\nMark idempotency COMPLETED\n    ↓\nReturn 201\n</code></pre></div>\n<p>Retry after lost response:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /payments\nIdempotency-Key: payment-123\n    ↓\nFind COMPLETED\n    ↓\nReturn same result\n</code></pre></div>\n<p>Crash after provider authorization:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Find PENDING\n    ↓\nQuery provider by payment-123\n    ↓\nRecover actual status\n    ↓\nComplete local state\n</code></pre></div>\n<p>That is the production-grade mental model.</p>"
    },
    {
      "title": "34. Practical exercise",
      "diagram": null,
      "body": "<p>Design idempotency for:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /wallet/block\nPOST /wallet/commit\nPOST /wallet/refund\nPOST /payments\nPOST /orders\nPOST /notifications\n</code></pre></div>\n<p>For each decide:</p>\n<ol>\n<li>What is the logical operation ID?</li>\n<li>Who generates it?</li>\n<li>What is the idempotency scope?</li>\n<li>What fields form the request fingerprint?</li>\n<li>Where is uniqueness enforced?</li>\n<li>What happens on concurrent duplicate requests?</li>\n<li>How long is the key retained?</li>\n<li>What happens if processing crashes after an external side effect?</li>\n</ol>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "One logical operation must reuse the same idempotency key across every retry.",
    "Enforce uniqueness before the side effect and make concurrent duplicates observe one state machine.",
    "Reject the same key with a different normalized request fingerprint.",
    "Persist durable results long enough for the maximum duplicate-arrival window.",
    "For external effects, propagate a stable reference and reconcile crash-window ambiguity."
  ]
};
