window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-20-dead-letter-queues"] = {
  "day": 20,
  "title": "Dead Letter Queues",
  "subtitle": "Quarantine messages after bounded retry exhaustion so poison events do not block normal flow.",
  "tags": [
    "DLQ",
    "Poison messages",
    "Retry policy",
    "Replay",
    "Operations",
    "Schema failures"
  ],
  "core": "A Dead Letter Queue is not a retry mechanism. It is a quarantine area for messages that could not be processed successfully after the system has exhausted its automated recovery strategies.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Queue --> Consumer\n  Consumer -- transient --> Retry[Bounded retry + backoff]\n  Retry --> Consumer\n  Consumer -- permanent / exhausted --> DLQ[(Dead Letter Queue)]\n  DLQ --> Inspect[Inspect / repair]\n  Inspect --> Replay[Rate-limited replay]\n  Replay --> Queue",
      "body": "<p>A common misconception is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Queue\n   ↓\nConsumer fails\n   ↓\nDLQ\n</code></pre></div>\n<p>That misses the important part:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Queue\n   ↓\nRetry\n   ↓\nRetry\n   ↓\nRetry\n   ↓\nStill failing?\n   ↓\nDLQ\n</code></pre></div>\n<p>A DLQ exists because <strong>automation has reached the limit of what it can safely do</strong>.</p>"
    },
    {
      "title": "1. Why do we need a DLQ?",
      "diagram": null,
      "body": "<p>Suppose your queue contains:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>M1\nM2\nM3\nM4\n</code></pre></div>\n<p>Processing:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>M1 ✓\n\nM2 ✓\n\nM3 ✗\n\nM4 ✓\n</code></pre></div>\n<p>What should happen to M3?</p>\n<p>Three possibilities:</p>\n<h5>Option A</h5>\n<p>Retry forever.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>M3\n↓\n\nRetry\n↓\n\nRetry\n↓\n\nRetry\n↓\n\nRetry...\n</code></pre></div>\n<p>Problem:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Infinite CPU\nInfinite logs\nInfinite retries\n</code></pre></div>\n\n<h5>Option B</h5>\n<p>Drop it.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>M3\n\n↓\n\nDelete\n</code></pre></div>\n<p>Problem:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Business data lost.\n</code></pre></div>\n<p>Usually unacceptable.</p>\n\n<h5>Option C</h5>\n<p>Move it somewhere safe.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Main Queue\n\n↓\n\nRetry exhausted\n\n↓\n\nDead Letter Queue\n</code></pre></div>\n<p>Now humans or automated repair processes can investigate.</p>\n<p>This is the purpose of a DLQ.</p>"
    },
    {
      "title": "2. What is a poison message?",
      "diagram": null,
      "body": "<p>A <strong>poison message</strong> is one that consistently causes processing failure.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n    \"orderId\": null,\n    \"amount\": -500\n}\n</code></pre></div>\n<p>Consumer throws:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>IllegalArgumentException\n</code></pre></div>\n<p>every time.</p>\n<p>Retrying cannot fix malformed business data.</p>\n<p>Another example:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n    \"schemaVersion\": 17\n}\n</code></pre></div>\n<p>Consumer only understands:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>schemaVersion &lt;= 16\n</code></pre></div>\n<p>Again:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry\n\n↓\n\nRetry\n\n↓\n\nRetry\n</code></pre></div>\n<p>will never succeed.</p>"
    },
    {
      "title": "3. Temporary failure vs permanent failure",
      "diagram": null,
      "body": "<p>This distinction drives retry policy.</p>\n<h4>Temporary</h4>\n<p>Examples:</p>\n<ul>\n<li>database unavailable</li>\n<li>HTTP timeout</li>\n<li>network interruption</li>\n<li>broker restart</li>\n<li>GC pause</li>\n<li>downstream 503</li>\n<li>transient lock contention</li>\n</ul>\n<p>Retry is reasonable.</p>\n\n<h4>Permanent</h4>\n<p>Examples:</p>\n<ul>\n<li>invalid schema</li>\n<li>missing required field</li>\n<li>impossible business state</li>\n<li>corrupt payload</li>\n<li>unsupported event version</li>\n<li>programming bug</li>\n<li>missing referenced entity that will never exist</li>\n</ul>\n<p>Retry alone cannot fix these.</p>\n<p>Eventually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ\n</code></pre></div>"
    },
    {
      "title": "4. The retry storm",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000 messages\n</code></pre></div>\n<p>Downstream database crashes.</p>\n<p>Every consumer immediately retries.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Consumer 1\n↓\n\nRetry\n\nConsumer 2\n↓\n\nRetry\n\nConsumer 3\n↓\n\nRetry\n</code></pre></div>\n<p>When database comes back:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Thousands of retries\n</code></pre></div>\n<p>hit simultaneously.</p>\n<p>This is the same retry storm we discussed previously.</p>\n<p>Therefore retries should use:</p>\n<ul>\n<li>exponential backoff</li>\n<li>jitter</li>\n<li>maximum attempts</li>\n</ul>\n<p>Only after retries fail should the message enter the DLQ.</p>"
    },
    {
      "title": "5. DLQ is not for transient overload",
      "diagram": null,
      "body": "<p>Suppose database is down for:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 seconds\n</code></pre></div>\n<p>Sending everything immediately to the DLQ is wrong.</p>\n<p>DLQ should represent:</p>\n<div class=\"callout\">\n<p>\"We've already attempted reasonable automated recovery.\"</p>\n</div>\n<p>Not:</p>\n<div class=\"callout\">\n<p>\"The first attempt failed.\"</p>\n</div>"
    },
    {
      "title": "6. Typical lifecycle",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Producer\n\n↓\n\nQueue\n\n↓\n\nConsumer\n\n↓\n\nSuccess\nOR\nFailure\n\n↓\n\nRetry\n\n↓\n\nRetry\n\n↓\n\nRetry\n\n↓\n\nDLQ\n</code></pre></div>\n<p>Only the messages that remain unsuccessful after policy exhaustion become dead letters.</p>"
    },
    {
      "title": "7. Retry count",
      "diagram": null,
      "body": "<p>A typical message gains metadata:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>messageId = 123\n\nattempt = 1\n</code></pre></div>\n<p>Retry:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>attempt = 2\n</code></pre></div>\n<p>Eventually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>attempt = 5\n</code></pre></div>\n<p>If policy says:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maxAttempts = 5\n</code></pre></div>\n<p>then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>attempt == 5\n\n↓\n\nDLQ\n</code></pre></div>\n<p>Different systems count attempts differently, so understand your broker's semantics.</p>"
    },
    {
      "title": "8. Why not retry forever?",
      "diagram": null,
      "body": "<p>Suppose a programming bug exists.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>NullPointerException\n</code></pre></div>\n<p>Every message:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry\n\n↓\n\nNullPointerException\n\n↓\n\nRetry\n\n↓\n\nNullPointerException\n</code></pre></div>\n<p>Forever.</p>\n<p>Consequences:</p>\n<ul>\n<li>queue never drains</li>\n<li>CPU wasted</li>\n<li>log explosion</li>\n<li>infrastructure cost</li>\n<li>operational noise</li>\n</ul>\n<p>Bounded retries are essential.</p>"
    },
    {
      "title": "9. Queue blocking",
      "diagram": null,
      "body": "<p>Imagine FIFO processing.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>M1 ✓\n\nM2 ✓\n\nM3 ✗\n\nM4\n\nM5\n</code></pre></div>\n<p>If M3 retries forever:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>M4\n\nM5\n</code></pre></div>\n<p>never process.</p>\n<p>One poison message blocks the queue.</p>\n<p>DLQs allow forward progress.</p>"
    },
    {
      "title": "10. Ordering trade-off",
      "diagram": null,
      "body": "<p>Suppose events:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n\n↓\n\nOrderPaid\n\n↓\n\nOrderShipped\n</code></pre></div>\n<p>If:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderPaid\n</code></pre></div>\n<p>goes to DLQ while:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderShipped\n</code></pre></div>\n<p>continues,</p>\n<p>you may violate business ordering.</p>\n<p>Different systems choose differently.</p>\n<p>Sometimes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Stop processing partition\n</code></pre></div>\n<p>is correct.</p>\n<p>Sometimes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Skip bad message\n</code></pre></div>\n<p>is acceptable.</p>\n<p>Ordering requirements determine DLQ strategy.</p>"
    },
    {
      "title": "11. Partitioned logs",
      "diagram": null,
      "body": "<p>In log-based systems like Apache Kafka:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Partition\n\nOffset 10\n\nOffset 11\n\nOffset 12\n</code></pre></div>\n<p>If offset 11 continually fails:</p>\n<p>Should offset 12 proceed?</p>\n<p>Depends on business semantics.</p>\n<p>Some applications:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Block partition\n</code></pre></div>\n<p>Others:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Publish failed record to DLQ topic\n\nCommit offset\n\nContinue\n</code></pre></div>\n<p>Neither is universally correct.</p>"
    },
    {
      "title": "12. What should a DLQ message contain?",
      "diagram": null,
      "body": "<p>Never store only:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payload\n</code></pre></div>\n<p>Also include metadata:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>messageId\n\noriginal topic\n\npartition\n\noffset\n\nattempt count\n\nfailure timestamp\n\nstack trace\n\nexception class\n\nconsumer name\n\nschema version\n\ncorrelationId\n\ncausationId\n</code></pre></div>\n<p>Without metadata, debugging becomes much harder.</p>"
    },
    {
      "title": "13. Preserve the original payload",
      "diagram": null,
      "body": "<p>Avoid modifying messages before placing them into the DLQ.</p>\n<p>Good:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Original message\n\n+\n\nFailure metadata\n</code></pre></div>\n<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Only transformed payload\n</code></pre></div>\n<p>You want the original evidence.</p>\n<p>Think of a DLQ as a forensic artifact.</p>"
    },
    {
      "title": "14. Exception classification",
      "diagram": null,
      "body": "<p>Not every exception deserves identical handling.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>TimeoutException\n</code></pre></div>\n<p>Usually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>JsonParseException\n</code></pre></div>\n<p>Usually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ immediately\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>IllegalArgumentException\n</code></pre></div>\n<p>May indicate invalid business data.</p>\n<p>Retry probably won't help.</p>\n<p>Good consumers classify failures.</p>"
    },
    {
      "title": "15. Retry policy example",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1\n\n↓\n\n5 seconds\n\n↓\n\nAttempt 2\n\n↓\n\n30 seconds\n\n↓\n\nAttempt 3\n\n↓\n\n2 minutes\n\n↓\n\nAttempt 4\n\n↓\n\n10 minutes\n\n↓\n\nDLQ\n</code></pre></div>\n<p>Notice:</p>\n<p>Increasing delay</p>\n<p>Limited attempts</p>\n<p>Eventually stops</p>"
    },
    {
      "title": "16. Immediate DLQ cases",
      "diagram": null,
      "body": "<p>Some failures should bypass retries.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Unknown schema version\n</code></pre></div>\n<p>Retrying wastes resources.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Missing mandatory field\n</code></pre></div>\n<p>Again:</p>\n<p>Permanent failure.</p>\n<p>Immediate DLQ may be preferable.</p>"
    },
    {
      "title": "17. Replay",
      "diagram": null,
      "body": "<p>Eventually someone fixes the bug.</p>\n<p>Can we replay DLQ messages?</p>\n<p>Usually:</p>\n<p>Yes.</p>\n<p>Architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ\n\n↓\n\nRepair\n\n↓\n\nReplay\n\n↓\n\nMain Queue\n</code></pre></div>\n<p>Replay should preserve:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>messageId\n\ncorrelationId\n</code></pre></div>\n<p>Otherwise duplicates become harder to detect.</p>"
    },
    {
      "title": "18. Replay danger",
      "diagram": null,
      "body": "<p>Suppose message:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>ChargeCard\n</code></pre></div>\n<p>already partially executed.</p>\n<p>Blind replay may:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Charge again\n</code></pre></div>\n<p>Replay requires idempotent consumers.</p>\n<p>Exactly the same lesson we've repeated throughout this course.</p>"
    },
    {
      "title": "19. Bulk replay",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500,000 DLQ messages\n</code></pre></div>\n<p>Developer fixes the bug.</p>\n<p>Should they immediately replay all?</p>\n<p>Probably not.</p>\n<p>If all replay simultaneously:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500,000 requests\n</code></pre></div>\n<p>may overwhelm downstream systems.</p>\n<p>Replay should usually be:</p>\n<ul>\n<li>rate limited</li>\n<li>monitored</li>\n<li>batched</li>\n<li>cancelable</li>\n</ul>"
    },
    {
      "title": "20. Root-cause categories",
      "diagram": null,
      "body": "<p>When a DLQ grows, classify failures.</p>\n<p>Typical buckets:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Bad producer\n\nConsumer bug\n\nSchema mismatch\n\nTransient infrastructure\n\nBusiness rule violation\n\nDependency outage\n\nConfiguration error\n</code></pre></div>\n<p>The classification determines the fix.</p>"
    },
    {
      "title": "21. DLQ growth is an operational alert",
      "diagram": null,
      "body": "<p>A DLQ should normally remain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Nearly empty\n</code></pre></div>\n<p>A steadily growing DLQ indicates:</p>\n<ul>\n<li>broken deployment</li>\n<li>producer bug</li>\n<li>consumer incompatibility</li>\n<li>infrastructure issue</li>\n<li>business data corruption</li>\n</ul>\n<p>Monitor:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ depth\n\nDLQ arrival rate\n\nOldest DLQ message age\n</code></pre></div>"
    },
    {
      "title": "22. \"DLQ as storage\" is an anti-pattern",
      "diagram": null,
      "body": "<p>Some teams treat:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ\n</code></pre></div>\n<p>as permanent storage.</p>\n<p>Months later:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>3 million messages\n</code></pre></div>\n<p>remain.</p>\n<p>Nobody investigates.</p>\n<p>DLQs become data graveyards.</p>\n<p>Instead:</p>\n<p>Every DLQ message should have an operational outcome:</p>\n<ul>\n<li>repaired</li>\n<li>replayed</li>\n<li>manually handled</li>\n<li>intentionally discarded</li>\n</ul>"
    },
    {
      "title": "23. Human workflow",
      "diagram": null,
      "body": "<p>A mature production process:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ\n\n↓\n\nAlert\n\n↓\n\nEngineer investigates\n\n↓\n\nRoot cause identified\n\n↓\n\nBug fixed\n\n↓\n\nReplay\n\n↓\n\nVerify\n\n↓\n\nClose incident\n</code></pre></div>\n<p>Notice:</p>\n<p>DLQ is part of operations, not just architecture.</p>"
    },
    {
      "title": "24. Automatic repair",
      "diagram": null,
      "body": "<p>Sometimes repair can be automated.</p>\n<p>Example:</p>\n<p>Old schema:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n    \"price\":100\n}\n</code></pre></div>\n<p>New consumer expects:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n    \"price\":{\n        \"value\":100\n    }\n}\n</code></pre></div>\n<p>A migration service might transform old messages before replay.</p>\n<p>Be careful:</p>\n<p>Transformation must preserve business semantics.</p>"
    },
    {
      "title": "25. Schema evolution",
      "diagram": null,
      "body": "<p>Many DLQ incidents result from:</p>\n<p>Producer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Version 3\n</code></pre></div>\n<p>Consumer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Version 2\n</code></pre></div>\n<p>Consumer crashes.</p>\n<p>Better compatibility testing reduces DLQ growth dramatically.</p>"
    },
    {
      "title": "26. Exactly-once myth",
      "diagram": null,
      "body": "<p>Suppose replay succeeds.</p>\n<p>Consumer already processed message once.</p>\n<p>Replay causes duplicate.</p>\n<p>Again:</p>\n<p>Exactly-once transport does <strong>not</strong> remove the need for business idempotency.</p>"
    },
    {
      "title": "27. Spring Boot example",
      "diagram": null,
      "body": "<p>Conceptual listener:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@RabbitListener(queues = \"orders\")\npublic void consume(OrderCreatedEvent event) {\n\n    try {\n\n        service.process(event);\n\n    } catch (TransientDatabaseException ex) {\n\n        throw ex;\n\n    } catch (InvalidSchemaException ex) {\n\n        throw new ImmediateDlqException(ex);\n\n    }\n}\n</code></pre></div>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Transient\n\n↓\n\nRetry\n\nPermanent\n\n↓\n\nDLQ\n</code></pre></div>\n<p>The exact implementation depends on the broker.</p>"
    },
    {
      "title": "28. SQS example",
      "diagram": null,
      "body": "<p>Amazon Simple Queue Service supports a <strong>redrive policy</strong>.</p>\n<p>Main queue:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrdersQueue\n</code></pre></div>\n<p>DLQ:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrdersDLQ\n</code></pre></div>\n<p>Policy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maxReceiveCount = 5\n</code></pre></div>\n<p>After five failed receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrdersDLQ\n</code></pre></div>\n<p>The broker moves the message automatically.</p>"
    },
    {
      "title": "29. RabbitMQ example",
      "diagram": null,
      "body": "<p>RabbitMQ uses:</p>\n<ul>\n<li>dead-letter exchange</li>\n<li>routing keys</li>\n<li>dead-letter queues</li>\n</ul>\n<p>Messages rejected or expired may be routed automatically to DLQs.</p>\n<p>This makes investigation easier.</p>"
    },
    {
      "title": "30. Kafka example",
      "diagram": null,
      "body": "<p>Kafka often models DLQs as another topic:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>orders\n\n↓\n\norders.DLQ\n</code></pre></div>\n<p>Consumers publish failed records explicitly.</p>\n<p>This preserves:</p>\n<ul>\n<li>offsets</li>\n<li>payload</li>\n<li>metadata</li>\n</ul>\n<p>while allowing independent replay tooling.</p>"
    },
    {
      "title": "31. Correlation IDs",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n</code></pre></div>\n<p>failed.</p>\n<p>You should be able to trace:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>OrderCreated\n\n↓\n\nPaymentRequested\n\n↓\n\nPaymentAuthorized\n\n↓\n\nNotificationRequested\n</code></pre></div>\n<p>The DLQ message should retain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>correlationId\n</code></pre></div>\n<p>to support distributed tracing.</p>"
    },
    {
      "title": "32. Production incident",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<p>Deployment:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Consumer v7\n</code></pre></div>\n<p>Bug:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Currency enum parsing broken.\n</code></pre></div>\n<p>Incoming traffic:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>20,000 messages/minute\n</code></pre></div>\n<p>Within an hour:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1.2 million DLQ messages\n</code></pre></div>\n<p>Recovery:</p>\n<ol>\n<li>Roll back deployment.</li>\n<li>Verify consumer.</li>\n<li>Replay in batches.</li>\n<li>Monitor downstream.</li>\n<li>Verify no duplicate business effects.</li>\n</ol>\n<p>The replay phase often requires more care than the bug fix.</p>"
    },
    {
      "title": "33. Business vs technical DLQs",
      "diagram": null,
      "body": "<p>Sometimes it's useful to separate:</p>\n<p>Technical failures:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Deserialization\n\nDatabase unavailable\n\nInfrastructure\n</code></pre></div>\n<p>Business failures:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Unknown customer\n\nInsufficient funds\n\nInvalid order\n</code></pre></div>\n<p>Business failures may require manual review rather than replay.</p>"
    },
    {
      "title": "34. Manual repair queue",
      "diagram": null,
      "body": "<p>A mature architecture often introduces:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ\n\n↓\n\nManual Review Queue\n</code></pre></div>\n<p>Operations staff decide:</p>\n<p>Approve</p>\n<p>Reject</p>\n<p>Correct</p>\n<p>Replay</p>\n<p>instead of blindly replaying everything.</p>"
    },
    {
      "title": "35. Metrics",
      "diagram": null,
      "body": "<p>Useful metrics include:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>dlq_messages_total\n\ndlq_arrival_rate\n\noldest_dlq_message\n\nreplay_success_rate\n\nreplay_failure_rate\n\nretry_attempts\n\nconsumer_failures\n\ntransient_failures\n\npermanent_failures\n</code></pre></div>"
    },
    {
      "title": "36. Testing",
      "diagram": null,
      "body": "<p>DLQ behavior deserves testing.</p>\n<p>Examples:</p>\n<ul>\n<li>malformed JSON</li>\n<li>duplicate replay</li>\n<li>unknown schema</li>\n<li>dependency timeout</li>\n<li>permanent validation failure</li>\n<li>replay after bug fix</li>\n<li>replay after partial processing</li>\n</ul>\n<p>Chaos testing should include DLQ scenarios.</p>"
    },
    {
      "title": "37. Decision framework",
      "diagram": null,
      "body": "<p>When designing DLQ handling, ask:</p>\n<ol>\n<li>Is failure transient or permanent?</li>\n<li>Should retry happen?</li>\n<li>How many retries?</li>\n<li>How much backoff?</li>\n<li>Should retry include jitter?</li>\n<li>What metadata is preserved?</li>\n<li>Can message be replayed safely?</li>\n<li>Is consumer idempotent?</li>\n<li>How are operators alerted?</li>\n<li>Who owns replay?</li>\n<li>How is replay rate limited?</li>\n<li>Can failures be repaired automatically?</li>\n<li>Should some failures bypass retries?</li>\n<li>When is manual intervention required?</li>\n</ol>"
    },
    {
      "title": "38. Common anti-patterns",
      "diagram": null,
      "body": "<h4>Infinite retries</h4>\n<p>Creates retry storms.</p>\n\n<h4>No DLQ</h4>\n<p>Messages disappear.</p>\n\n<h4>DLQ without monitoring</h4>\n<p>Nobody notices failures.</p>\n\n<h4>Replay everything immediately</h4>\n<p>Creates second outage.</p>\n\n<h4>No idempotency</h4>\n<p>Replay causes duplicate business operations.</p>\n\n<h4>Deleting DLQ</h4>\n<p>Loses forensic evidence.</p>\n\n<h4>Ignoring DLQ for months</h4>\n<p>Turns operational issues into data loss.</p>"
    },
    {
      "title": "39. Interview question",
      "diagram": null,
      "body": "<p><strong>How would you design failure handling for an event consumer?</strong></p>\n<p>A strong answer:</p>\n<div class=\"callout\">\n<p>I would first classify failures into transient and permanent categories. Transient failures such as timeouts or temporary dependency outages would use bounded retries with exponential backoff and jitter. Permanent failures such as schema incompatibility or invalid business data would bypass repeated retries and be routed to a Dead Letter Queue.</p>\n<p>Every DLQ message would preserve the original payload along with diagnostic metadata including message ID, correlation ID, consumer, exception type, retry count, and timestamps. Consumers would be idempotent so that repaired messages could be replayed safely. I would monitor DLQ depth, arrival rate, and oldest-message age, and provide controlled replay tooling with rate limiting and operational approval.</p>\n</div>"
    },
    {
      "title": "40. Practical case study",
      "diagram": null,
      "body": "<p>Imagine your payment system publishes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentAuthorized\n</code></pre></div>\n<p>Consumers:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Ledger Service\n\nAnalytics Service\n\nNotification Service\n</code></pre></div>\n<p>One deployment introduces a bug in Ledger.</p>\n<p>Questions to work through:</p>\n<ol>\n<li>Should Ledger retry indefinitely?</li>\n<li>Should Analytics continue processing?</li>\n<li>Should Notification continue processing?</li>\n<li>How many retries before Ledger uses its DLQ?</li>\n<li>Can Ledger replay later?</li>\n<li>What if replay duplicates ledger entries?</li>\n<li>Which IDs guarantee idempotency?</li>\n<li>How should replay be throttled?</li>\n<li>What alerts should fire?</li>\n<li>What business dashboards reveal the issue?</li>\n</ol>\n<p>These questions capture the real operational challenges of DLQ design.</p>"
    },
    {
      "title": "Key takeaways",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ\n    = quarantine after automated recovery is exhausted\n\nPoison message\n    = repeatedly failing message\n\nRetry\n    = for transient failures\n\nImmediate DLQ\n    = for permanent failures\n\nReplay\n    = requires idempotent consumers\n\nDLQ\n    = operational workflow, not permanent storage\n\nMetadata\n    = just as important as payload\n\nGrowing DLQ\n    = production incident\n\nReplay\n    = batch, monitor, rate-limit\n\nNever\n    = infinite retries\n</code></pre></div>\n<p>The most important mental model is:</p>\n<div class=\"callout\">\n<p><strong>Retries answer the question, \"Can automation recover?\" A Dead Letter Queue answers the question, \"Automation couldn't recover—how do we preserve the failure, continue processing the healthy workload, and enable safe investigation and repair?\"</strong></p>\n</div>"
    },
    {
      "title": "Practical exercise",
      "diagram": null,
      "body": "<p>Design the DLQ strategy for your wallet-based payment system:</p>\n<ul>\n<li><code class=\"inline-code\">PaymentAuthorized</code></li>\n<li><code class=\"inline-code\">WalletDebited</code></li>\n<li><code class=\"inline-code\">InventoryReserved</code></li>\n<li><code class=\"inline-code\">OrderConfirmed</code></li>\n</ul>\n<p>For each event, decide:</p>\n<ol>\n<li>Which exceptions are transient?</li>\n<li>Which are permanent?</li>\n<li>How many retry attempts are appropriate?</li>\n<li>What backoff schedule will you use?</li>\n<li>What metadata will you preserve in the DLQ?</li>\n<li>Can the event be replayed safely?</li>\n<li>What idempotency key will protect replay?</li>\n<li>What alert should fire when messages begin accumulating?</li>\n<li>Who owns investigation and replay?</li>\n<li>What business impact occurs if the DLQ grows for one hour?</li>\n</ol>\n<p>By the end of this exercise, you'll have a production-grade failure handling strategy rather than just \"put failed messages into another queue.\"</p>\n<p>The next topic is <strong>Cron Jobs</strong>, where we'll cover scheduling in distributed systems, singleton execution, missed schedules, clock drift, leader election, idempotent scheduled tasks, distributed locking, and why <code class=\"inline-code\">@Scheduled</code> is often insufficient in a clustered production deployment.</p>"
    }
  ],
  "keyTakeaways": [
    "Classify transient and permanent failures before deciding whether to retry.",
    "Preserve the original payload and enough metadata for forensic analysis.",
    "Alert on DLQ arrival rate, depth, and oldest age.",
    "Replay only with idempotent consumers, controlled rate, and downstream capacity protection.",
    "Every dead letter needs an owned repair, replay, manual decision, or intentional discard."
  ]
};
