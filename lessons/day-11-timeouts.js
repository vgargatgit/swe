window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-11-timeouts"] = {
  "day": 11,
  "title": "Timeouts",
  "subtitle": "Bound every remote, database, queue, and lock wait so resources are not held indefinitely.",
  "tags": [
    "Timeouts",
    "Deadlines",
    "Connection pools",
    "Database locks",
    "Ambiguous outcomes",
    "Observability"
  ],
  "core": "Every network call, database call, lock acquisition, queue operation, and distributed workflow needs a bounded waiting time.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Deadline[End-to-end deadline] --> Pool[Pool acquisition]\n  Pool --> Connect[Connect / TLS]\n  Connect --> Work[Remote processing]\n  Work --> Read[Response / read]\n  Deadline -. remaining budget .-> Pool\n  Deadline -. remaining budget .-> Connect\n  Deadline -. remaining budget .-> Work",
      "body": "<p>Without timeouts, failure becomes resource exhaustion.</p>\n<p>A timeout answers:</p>\n<div class=\"callout\">\n<p>“How long am I willing to wait before treating this operation as unsuccessful or indeterminate?”</p>\n</div>\n<p>That last word—<strong>indeterminate</strong>—matters. A timeout tells you the caller stopped waiting. It does not always tell you whether the remote side completed the operation.</p>"
    },
    {
      "title": "1. Why timeouts are essential",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Checkout Service\n    ↓\nPayment Service\n</code></pre></div>\n<p>Payment normally responds in:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>200 ms\n</code></pre></div>\n<p>One day it becomes slow and takes 30 seconds.</p>\n<p>Checkout has:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>200 request threads\n</code></pre></div>\n<p>If no timeout is configured:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>200 requests\n    ↓\nAll threads wait\n    ↓\nThread pool exhausted\n    ↓\nNew requests queue\n    ↓\nMemory and latency rise\n    ↓\nCheckout fails too\n</code></pre></div>\n<p>A downstream slowdown becomes an upstream outage.</p>\n<p>With a two-second timeout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Call exceeds 2 seconds\n    ↓\nCaller stops waiting\n    ↓\nThread and connection are eventually released\n    ↓\nFailure remains bounded\n</code></pre></div>\n<p>Timeouts are therefore primarily about:</p>\n<ul>\n<li>resource protection</li>\n<li>latency control</li>\n<li>failure isolation</li>\n<li>predictable degradation</li>\n</ul>"
    },
    {
      "title": "2. “Timeout” is not one timeout",
      "diagram": null,
      "body": "<p>A single HTTP call may involve many phases:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DNS lookup\n    ↓\nTCP connection\n    ↓\nTLS handshake\n    ↓\nAcquire pooled connection\n    ↓\nWrite request\n    ↓\nWait for first response byte\n    ↓\nRead response body\n</code></pre></div>\n<p>Each phase can hang independently.</p>\n<p>A production client may need separate settings for:</p>\n<ul>\n<li>DNS resolution timeout</li>\n<li>connection-pool acquisition timeout</li>\n<li>connect timeout</li>\n<li>TLS handshake timeout</li>\n<li>write timeout</li>\n<li>response-header timeout</li>\n<li>read timeout</li>\n<li>idle timeout</li>\n<li>total operation timeout</li>\n</ul>\n<p>Setting only one of these may leave other phases unbounded.</p>"
    },
    {
      "title": "3. Connect timeout",
      "diagram": null,
      "body": "<p>The connect timeout limits how long the client waits to establish a TCP connection.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connect timeout = 500 ms\n</code></pre></div>\n<p>It covers situations such as:</p>\n<ul>\n<li>target host unreachable</li>\n<li>security group dropping packets</li>\n<li>load balancer not accepting connections</li>\n<li>network routing failure</li>\n<li>overloaded server accept queue</li>\n</ul>\n<p>It does not normally cover:</p>\n<ul>\n<li>application processing</li>\n<li>response generation</li>\n<li>reading the response body</li>\n</ul>\n<p>A common mistake is configuring a short connect timeout and assuming the whole request is bounded.</p>"
    },
    {
      "title": "4. Connection-pool acquisition timeout",
      "diagram": null,
      "body": "<p>Most production HTTP clients reuse pooled connections.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>HTTP pool size = 100\nAll 100 connections are busy\n</code></pre></div>\n<p>The 101st request waits for a connection.</p>\n<p>Without an acquisition timeout, it may wait indefinitely even before trying the network.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Pool acquisition timeout = 100 ms\n</code></pre></div>\n<p>This failure tells you something different from a connect timeout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connect timeout\n    → downstream/network path could not be established\n\nPool acquisition timeout\n    → caller's own client pool is saturated\n</code></pre></div>\n<p>That distinction is valuable operationally.</p>"
    },
    {
      "title": "5. TLS handshake timeout",
      "diagram": null,
      "body": "<p>For HTTPS:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>TCP connected\n    ↓\nTLS negotiation begins\n</code></pre></div>\n<p>The handshake may stall because of:</p>\n<ul>\n<li>overloaded TLS endpoint</li>\n<li>certificate negotiation issue</li>\n<li>proxy problem</li>\n<li>network packet loss</li>\n<li>broken middlebox</li>\n</ul>\n<p>A connect timeout may already have completed successfully, so TLS needs its own bound in clients that support one.</p>"
    },
    {
      "title": "6. Write timeout",
      "diagram": null,
      "body": "<p>The write timeout controls how long the client may spend sending the request body.</p>\n<p>Important for:</p>\n<ul>\n<li>file uploads</li>\n<li>large JSON payloads</li>\n<li>slow or congested networks</li>\n<li>downstream services that stop reading</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /bulk-import\nRequest body = 500 MB\n</code></pre></div>\n<p>A short write timeout may reject legitimate large uploads.</p>\n<p>A very long one may let malicious or broken clients occupy connections for too long.</p>\n<p>Timeout values must match endpoint behavior.</p>"
    },
    {
      "title": "7. Response-header timeout",
      "diagram": null,
      "body": "<p>This limits how long the client waits for the response to begin.</p>\n<p>Often described as:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Time to first byte\n</code></pre></div>\n<p>It primarily captures:</p>\n<ul>\n<li>server processing time</li>\n<li>downstream queueing</li>\n<li>thread starvation</li>\n<li>dependency delays</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connect succeeds in 10 ms\nPayment processing hangs for 20 seconds\n</code></pre></div>\n<p>The connect timeout does nothing here. A response timeout is required.</p>"
    },
    {
      "title": "8. Read timeout",
      "diagram": null,
      "body": "<p>A read timeout is often misunderstood.</p>\n<p>Depending on the client, it may mean:</p>\n<div class=\"callout\">\n<p>No data may remain unread for longer than this interval.</p>\n</div>\n<p>It may not mean:</p>\n<div class=\"callout\">\n<p>The entire body must finish within this interval.</p>\n</div>\n<p>Suppose the server sends one byte every four seconds and the read timeout is five seconds.</p>\n<p>The response may continue for hours because each byte resets the idle timer.</p>\n<p>For bounded total duration, you may need an overall deadline in addition to a read timeout.</p>"
    },
    {
      "title": "9. Idle timeout",
      "diagram": null,
      "body": "<p>An idle timeout closes a connection if no traffic flows for a configured period.</p>\n<p>This matters for:</p>\n<ul>\n<li>keep-alive HTTP connections</li>\n<li>WebSockets</li>\n<li>Server-Sent Events</li>\n<li>streaming responses</li>\n<li>load balancers</li>\n<li>reverse proxies</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>ALB idle timeout = 60 seconds\nWebSocket sends no traffic for 2 minutes\n</code></pre></div>\n<p>The load balancer may close a healthy logical connection.</p>\n<p>Long-lived connections often need:</p>\n<ul>\n<li>appropriate idle timeout</li>\n<li>ping/pong or heartbeat traffic</li>\n<li>reconnect logic</li>\n</ul>"
    },
    {
      "title": "10. Request timeout vs deadline",
      "diagram": null,
      "body": "<p>A timeout is usually relative:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wait at most 2 seconds from now.\n</code></pre></div>\n<p>A deadline is absolute:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>This entire operation must complete before 10:30:15.500.\n</code></pre></div>\n<p>Deadlines are often better in multi-service call chains.</p>\n<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n  ↓\nAPI Gateway\n  ↓\nOrder Service\n  ↓\nInventory\n  ↓\nPayment\n</code></pre></div>\n<p>The client has a total budget of three seconds.</p>\n<p>If every service independently applies a three-second timeout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Gateway waits 3 s\nOrder waits 3 s\nInventory waits 3 s\nPayment waits 3 s\n</code></pre></div>\n<p>The total can greatly exceed the user's budget.</p>\n<p>Instead, propagate a deadline:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Original deadline = now + 3 seconds\n</code></pre></div>\n<p>Each service calculates:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>remaining time = deadline - current time\n</code></pre></div>\n<p>and allocates only part of what remains.</p>"
    },
    {
      "title": "11. End-to-end timeout budgeting",
      "diagram": null,
      "body": "<p>Suppose an API must respond within:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>2 seconds\n</code></pre></div>\n<p>A possible budget:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Gateway overhead             50 ms\nOrder Service processing    100 ms\nInventory call              300 ms\nPayment call                900 ms\nSerialization/network       150 ms\nSafety margin               500 ms\n</code></pre></div>\n<p>The safety margin matters because:</p>\n<ul>\n<li>scheduling is imperfect</li>\n<li>GC pauses happen</li>\n<li>queues form</li>\n<li>retries consume time</li>\n<li>network latency varies</li>\n</ul>\n<p>Do not allocate the entire user-visible timeout to downstream work.</p>\n<p>A good rule is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Downstream timeout &lt; caller timeout\n</code></pre></div>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client timeout          3.0 s\nGateway timeout         2.8 s\nOrder timeout           2.5 s\nPayment timeout         1.5 s\nDatabase timeout        500 ms\n</code></pre></div>\n<p>Each upstream layer should fail after its downstreams, not before them, while still preserving cleanup time.</p>"
    },
    {
      "title": "12. The timeout inversion problem",
      "diagram": null,
      "body": "<p>Bad configuration:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client timeout      = 2 seconds\nGateway timeout     = 30 seconds\nApplication timeout = 20 seconds\nDatabase timeout    = 10 seconds\n</code></pre></div>\n<p>The client gives up after two seconds, but the backend continues doing expensive work for another 18 seconds.</p>\n<p>Consequences:</p>\n<ul>\n<li>wasted CPU</li>\n<li>wasted database work</li>\n<li>unnecessary side effects</li>\n<li>misleading success metrics</li>\n<li>resource exhaustion under retries</li>\n</ul>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client deadline propagates inward\n</code></pre></div>\n<p>or downstream work is cancelled when the caller disconnects, where supported and safe.</p>"
    },
    {
      "title": "13. Cancellation is not guaranteed",
      "diagram": null,
      "body": "<p>Suppose the caller times out during:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /payments\n</code></pre></div>\n<p>The remote service may still be processing the request.</p>\n<p>Possible sequence:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Caller sends payment request\n    ↓\nProvider charges card\n    ↓\nResponse packet is delayed\n    ↓\nCaller times out\n</code></pre></div>\n<p>The caller sees failure, but the payment succeeded.</p>\n<p>This is called an <strong>ambiguous outcome</strong>.</p>\n<p>A timeout does not mean:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>The operation definitely did not happen.\n</code></pre></div>\n<p>It means:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>The caller did not observe completion before its deadline.\n</code></pre></div>\n<p>For side-effecting operations, use:</p>\n<ul>\n<li>idempotency keys</li>\n<li>status reconciliation</li>\n<li>durable workflow state</li>\n<li>request correlation IDs</li>\n</ul>"
    },
    {
      "title": "14. Database timeouts",
      "diagram": null,
      "body": "<p>Database access can require several different bounds.</p>\n<h4>Connection acquisition timeout</h4>\n<p>How long to wait for a connection from the application pool.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Hikari connectionTimeout\n</code></pre></div>\n<p>This protects against local pool exhaustion.</p>\n<h4>Database network timeout</h4>\n<p>How long to wait for network communication with the database.</p>\n<h4>Query timeout</h4>\n<p>How long a SQL statement may execute.</p>\n<h4>Lock timeout</h4>\n<p>How long a transaction waits for a database lock.</p>\n<h4>Transaction timeout</h4>\n<p>Maximum duration of the whole transaction.</p>\n<p>These are not equivalent.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Query timeout = 2 seconds\n</code></pre></div>\n<p>does not necessarily stop time spent waiting to obtain a pool connection before execution.</p>"
    },
    {
      "title": "15. Lock timeouts",
      "diagram": null,
      "body": "<p>Suppose two transactions compete for the same row:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Transaction A holds lock\nTransaction B waits\n</code></pre></div>\n<p>Without a lock timeout, B may wait far longer than the API can tolerate.</p>\n<p>Configure a bounded wait:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Lock wait timeout = 500 ms\n</code></pre></div>\n<p>Then decide:</p>\n<ul>\n<li>retry?</li>\n<li>return conflict?</li>\n<li>enqueue for later?</li>\n<li>use optimistic locking instead?</li>\n</ul>\n<p>Lock timeouts are especially important in high-contention wallet and payment systems.</p>"
    },
    {
      "title": "16. Transaction timeout",
      "diagram": null,
      "body": "<p>A transaction can remain open while:</p>\n<ul>\n<li>application performs remote calls</li>\n<li>user code waits</li>\n<li>downstream service responds slowly</li>\n<li>thread is paused</li>\n</ul>\n<p>Long transactions cause:</p>\n<ul>\n<li>retained locks</li>\n<li>growing MVCC versions</li>\n<li>reduced concurrency</li>\n<li>replication lag</li>\n<li>deadlocks</li>\n<li>connection-pool exhaustion</li>\n</ul>\n<p>Avoid this pattern:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Begin DB transaction\n    ↓\nCall external payment provider\n    ↓\nWait 10 seconds\n    ↓\nUpdate database\n    ↓\nCommit\n</code></pre></div>\n<p>Prefer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Short local transaction\n    ↓\nExternal interaction\n    ↓\nShort local transaction\n</code></pre></div>\n<p>with workflow state, idempotency, or saga logic as needed.</p>"
    },
    {
      "title": "17. Queue timeouts",
      "diagram": null,
      "body": "<p>Message-oriented systems also need time bounds.</p>\n<p>Examples:</p>\n<ul>\n<li>producer send timeout</li>\n<li>acknowledgement timeout</li>\n<li>consumer poll timeout</li>\n<li>visibility timeout</li>\n<li>message retention</li>\n<li>processing timeout</li>\n</ul>\n<p>For a queue such as SQS, visibility timeout is especially important:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Consumer receives message\n    ↓\nMessage hidden for 30 seconds\n    ↓\nProcessing takes 60 seconds\n    ↓\nMessage becomes visible again\n    ↓\nSecond consumer processes same message\n</code></pre></div>\n<p>Now duplicate processing occurs.</p>\n<p>The visibility timeout should exceed expected processing time, or the consumer should extend it while working.</p>\n<p>Even then, consumers must remain idempotent.</p>"
    },
    {
      "title": "18. HTTP proxy and load-balancer timeouts",
      "diagram": null,
      "body": "<p>In a chain like:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n  ↓\nCloudFront\n  ↓\nALB\n  ↓\nNGINX\n  ↓\nSpring Boot\n</code></pre></div>\n<p>Each layer may have:</p>\n<ul>\n<li>connect timeout</li>\n<li>idle timeout</li>\n<li>response timeout</li>\n<li>request-body timeout</li>\n</ul>\n<p>These must be coordinated.</p>\n<p>Example bad chain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>NGINX proxy_read_timeout = 60 s\nALB idle timeout         = 30 s\nApplication timeout      = 45 s\n</code></pre></div>\n<p>The ALB may close the connection before NGINX or the application expects it.</p>\n<p>The shortest relevant timeout wins from the caller's perspective.</p>"
    },
    {
      "title": "19. WebSocket timeouts",
      "diagram": null,
      "body": "<p>WebSockets are long-lived, so ordinary request timeouts do not apply directly.</p>\n<p>Relevant controls include:</p>\n<ul>\n<li>handshake timeout</li>\n<li>idle timeout</li>\n<li>ping interval</li>\n<li>pong timeout</li>\n<li>maximum connection age</li>\n<li>reconnect backoff</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Ping every 20 seconds\nExpect pong within 10 seconds\nClose after 2 missed pongs\n</code></pre></div>\n<p>Do not use an aggressive inactivity timeout if silent connections are valid.</p>\n<p>At the same time, completely unbounded dead connections can consume file descriptors and memory.</p>"
    },
    {
      "title": "20. Scheduled jobs and batch timeouts",
      "diagram": null,
      "body": "<p>Cron jobs and batch processes also need deadlines.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Daily report job normally takes 10 minutes\n</code></pre></div>\n<p>Without a timeout, one stuck run may overlap with the next.</p>\n<p>Use:</p>\n<ul>\n<li>job execution timeout</li>\n<li>distributed lock expiration</li>\n<li>cancellation handling</li>\n<li>checkpointing</li>\n<li>overlap prevention</li>\n</ul>\n<p>Be careful with automatic termination during partial writes. The job must be restart-safe.</p>"
    },
    {
      "title": "21. Timeouts and retries",
      "diagram": null,
      "body": "<p>Retries multiply timeout cost.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Per-attempt timeout = 3 seconds\nRetries             = 3\nBackoff             = 1 s, 2 s, 4 s\n</code></pre></div>\n<p>Maximum duration is roughly:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>4 attempts × 3 s = 12 s\nBackoff           = 7 s\nTotal             = 19 s\n</code></pre></div>\n<p>If the caller's overall timeout is five seconds, this retry policy is impossible.</p>\n<p>Always calculate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Total retry budget\n=\nsum(attempt timeouts)\n+\nsum(backoff delays)\n+\nprocessing overhead\n</code></pre></div>\n<p>Then keep it below the end-to-end deadline.</p>"
    },
    {
      "title": "22. Timeout selection",
      "diagram": null,
      "body": "<p>A timeout should not be chosen because:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5 seconds feels reasonable.\n</code></pre></div>\n<p>Use observed latency distributions.</p>\n<p>Suppose dependency latency is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>P50 = 80 ms\nP95 = 200 ms\nP99 = 450 ms\nP99.9 = 900 ms\n</code></pre></div>\n<p>Possible timeout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1.2 seconds\n</code></pre></div>\n<p>This allows normal tail variation while bounding pathological requests.</p>\n<p>But also consider:</p>\n<ul>\n<li>business deadline</li>\n<li>dependency SLO</li>\n<li>retry budget</li>\n<li>traffic volume</li>\n<li>cost of false timeout</li>\n<li>cost of waiting too long</li>\n</ul>\n<p>For payments, a false timeout creates reconciliation work. For search autocomplete, a false timeout may simply suppress suggestions.</p>"
    },
    {
      "title": "23. Why averages are dangerous",
      "diagram": null,
      "body": "<p>Suppose average latency is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 ms\n</code></pre></div>\n<p>But distribution is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>99% at 50 ms\n1% at 5 seconds\n</code></pre></div>\n<p>The average appears acceptable, but the slow 1% can exhaust resources at scale.</p>\n<p>Timeouts should be based on percentiles and capacity impact, not averages alone.</p>\n<p>We will revisit this in the P99 and tail-latency lessons.</p>"
    },
    {
      "title": "24. Adaptive timeouts",
      "diagram": null,
      "body": "<p>Static timeouts are simple and predictable.</p>\n<p>Adaptive timeouts change based on observed latency.</p>\n<p>Potential benefit:</p>\n<ul>\n<li>react to changing network conditions</li>\n<li>reduce false timeouts</li>\n<li>adapt by region or dependency</li>\n</ul>\n<p>Risks:</p>\n<ul>\n<li>instability</li>\n<li>slow failures gradually become normalized</li>\n<li>attackers or incidents can inflate the learned timeout</li>\n<li>inconsistent behavior across instances</li>\n</ul>\n<p>Adaptive timeout systems need:</p>\n<ul>\n<li>upper and lower bounds</li>\n<li>stable percentile estimation</li>\n<li>outlier protection</li>\n<li>careful observability</li>\n</ul>\n<p>For most application teams, static timeouts based on measured percentiles are safer.</p>"
    },
    {
      "title": "25. Per-operation timeouts",
      "diagram": null,
      "body": "<p>Do not use one timeout for an entire service.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET /currencies           300 ms\nGET /payment/{id}         500 ms\nPOST /payment             2 s\nPOST /report/export       asynchronous\nWebSocket connection      long-lived\n</code></pre></div>\n<p>Different operations have different:</p>\n<ul>\n<li>latency profiles</li>\n<li>business criticality</li>\n<li>payload sizes</li>\n<li>side-effect risks</li>\n<li>fallback options</li>\n</ul>\n<p>Timeout configuration should usually be operation-aware.</p>"
    },
    {
      "title": "26. Timeouts in Spring Boot HTTP clients",
      "diagram": null,
      "body": "<p>The exact APIs vary by client, but conceptually configure at least:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connection-pool acquisition timeout\nConnect timeout\nResponse/read timeout\nOverall deadline\n</code></pre></div>\n<p>For a synchronous client, the shape may look like:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>HttpClient httpClient = HttpClient.newBuilder()\n        .connectTimeout(Duration.ofMillis(500))\n        .build();\n\nHttpRequest request = HttpRequest.newBuilder()\n        .uri(URI.create(paymentUrl))\n        .timeout(Duration.ofSeconds(2))\n        .POST(HttpRequest.BodyPublishers.ofString(payload))\n        .build();\n</code></pre></div>\n<p>Here:</p>\n<ul>\n<li><code class=\"inline-code\">connectTimeout</code> bounds TCP establishment</li>\n<li>request timeout bounds the HTTP exchange at a higher level</li>\n</ul>\n<p>For Spring's <code class=\"inline-code\">RestClient</code>, Apache HttpClient, Reactor Netty, or OkHttp, the configuration names and semantics differ. Always verify whether “read timeout” means inactivity or total duration.</p>"
    },
    {
      "title": "27. Reactive timeout example",
      "diagram": null,
      "body": "<p>A reactive call may use:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>return webClient.post()\n        .uri(\"/payments\")\n        .bodyValue(request)\n        .retrieve()\n        .bodyToMono(PaymentResponse.class)\n        .timeout(Duration.ofSeconds(2));\n</code></pre></div>\n<p>The operator bounds the reactive sequence.</p>\n<p>But still verify lower-layer settings:</p>\n<ul>\n<li>connect timeout</li>\n<li>pool acquisition timeout</li>\n<li>response timeout</li>\n</ul>\n<p>Also decide what happens on timeout:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>.onErrorMap(\n    TimeoutException.class,\n    ex -&gt; new PaymentOutcomeUnknownException(request.paymentId(), ex)\n);\n</code></pre></div>\n<p>For side-effecting operations, do not automatically label the result as definitively failed.</p>"
    },
    {
      "title": "28. Propagating deadlines",
      "diagram": null,
      "body": "<p>A simple approach is to send remaining time in a header:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>X-Request-Deadline: 2026-07-15T03:01:02.123Z\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>X-Timeout-Ms: 1250\n</code></pre></div>\n<p>Absolute deadlines avoid losing time information at each hop, but they rely on reasonably synchronized clocks.</p>\n<p>Relative budgets avoid clock-skew issues but may be reset or misinterpreted at every hop.</p>\n<p>A robust implementation should:</p>\n<ul>\n<li>validate incoming values</li>\n<li>cap them at a server maximum</li>\n<li>subtract internal overhead</li>\n<li>never trust clients to request unlimited time</li>\n<li>use monotonic clocks for local elapsed-time measurement where possible</li>\n</ul>"
    },
    {
      "title": "29. Clock skew and deadlines",
      "diagram": null,
      "body": "<p>Absolute timestamps across machines can be affected by clock skew.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Caller clock = correct\nServer clock = 500 ms ahead\n</code></pre></div>\n<p>A deadline may appear to have less remaining time than intended.</p>\n<p>Mitigations:</p>\n<ul>\n<li>synchronize clocks using NTP</li>\n<li>maintain safety margins</li>\n<li>use relative timeout propagation where appropriate</li>\n<li>use monotonic clocks for local duration measurement</li>\n</ul>\n<p>Wall-clock time can jump. Monotonic time is better for measuring elapsed duration inside one process.</p>"
    },
    {
      "title": "30. What happens after a timeout?",
      "diagram": null,
      "body": "<p>A correct timeout path should define:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. What exception is raised?\n2. Is the connection reusable?\n3. Is remote work cancelled?\n4. Is the operation outcome known?\n5. Should the caller retry?\n6. Should a circuit breaker count it?\n7. What metric is emitted?\n8. What response reaches the user?\n</code></pre></div>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET request timeout\n    → likely retryable if budget remains\n\nPOST payment timeout\n    → outcome unknown; use idempotency and status lookup\n\nDatabase lock timeout\n    → possibly retry transaction with backoff\n\nQueue publish timeout\n    → unclear whether broker accepted message; use producer idempotency/outbox\n</code></pre></div>"
    },
    {
      "title": "31. Timeout error classification",
      "diagram": null,
      "body": "<p>Do not collapse every timeout into one generic error.</p>\n<p>Useful categories:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POOL_ACQUIRE_TIMEOUT\nCONNECT_TIMEOUT\nTLS_HANDSHAKE_TIMEOUT\nWRITE_TIMEOUT\nRESPONSE_TIMEOUT\nREAD_IDLE_TIMEOUT\nDATABASE_QUERY_TIMEOUT\nLOCK_TIMEOUT\nTRANSACTION_TIMEOUT\nDEADLINE_EXCEEDED\n</code></pre></div>\n<p>This helps diagnose the real bottleneck.</p>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connect timeouts rising\n    → routing, firewall, target availability\n\nPool acquisition timeouts rising\n    → local saturation or downstream slowness\n\nQuery timeouts rising\n    → SQL/index/locking problem\n\nRead timeouts rising\n    → downstream processing or network issue\n</code></pre></div>"
    },
    {
      "title": "32. Observability",
      "diagram": null,
      "body": "<p>Track:</p>\n<ul>\n<li>total timeout count</li>\n<li>timeout count by dependency</li>\n<li>timeout count by operation</li>\n<li>timeout phase</li>\n<li>remaining deadline at call start</li>\n<li>actual duration before timeout</li>\n<li>retries after timeout</li>\n<li>ambiguous side-effect outcomes</li>\n<li>connection-pool utilization</li>\n<li>thread-pool saturation</li>\n<li>database lock waits</li>\n</ul>\n<p>Example structured log:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"event\": \"downstream_timeout\",\n  \"dependency\": \"payment-provider\",\n  \"operation\": \"authorize\",\n  \"timeoutType\": \"RESPONSE_TIMEOUT\",\n  \"configuredTimeoutMs\": 1500,\n  \"elapsedMs\": 1504,\n  \"requestId\": \"req-8fa712c\",\n  \"paymentId\": \"pay-98231\",\n  \"outcome\": \"UNKNOWN\"\n}\n</code></pre></div>\n<p>Do not log card data, authorization tokens, or sensitive request bodies.</p>"
    },
    {
      "title": "33. Timeout alerts",
      "diagram": null,
      "body": "<p>Alerting only on timeout count may be misleading because traffic varies.</p>\n<p>Prefer ratios and sa</p>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "Configure each waiting phase, not only a generic request timeout.",
    "Propagate an end-to-end deadline and keep inner timeouts within the remaining budget.",
    "A timeout can leave a side-effecting operation in an unknown state.",
    "Bound pool acquisition, database queries, locks, transactions, queues, proxies, and jobs.",
    "Classify timeout phases in metrics so local saturation is not mistaken for network failure."
  ]
};
