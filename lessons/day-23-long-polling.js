window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-23-long-polling"] = {
  "day": 23,
  "title": "Long Polling",
  "subtitle": "Hold an HTTP request until an event or timeout, then reconnect safely with a cursor.",
  "tags": [
    "Long polling",
    "Cursor",
    "DeferredResult",
    "Replay",
    "Timeouts",
    "Horizontal scaling"
  ],
  "core": "Long polling lets a client wait for new data over ordinary HTTP by keeping a request open until the server has something to return or a timeout occurs.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "sequenceDiagram\n  participant Client\n  participant API\n  participant Store\n  Client->>API: GET /events?after=105\n  API->>Store: check backlog\n  alt backlog exists\n    Store-->>API: events 106..n\n    API-->>Client: batch + next cursor\n  else caught up\n    API-->>Client: wait until event or timeout\n  end\n  Client->>API: reconnect with next cursor",
      "body": "<p>It sits between basic polling and WebSockets:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Basic polling\n    client asks repeatedly\n\nLong polling\n    client asks once and waits\n\nWebSocket\n    client and server keep a full-duplex connection\n</code></pre></div>\n<p>Long polling is older than WebSockets, but it is still useful when you want near-real-time server-to-client updates while retaining ordinary HTTP semantics.</p>"
    },
    {
      "title": "1. Basic polling first",
      "diagram": null,
      "body": "<p>Suppose a chat client checks for messages every two seconds:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client                     Server\n\nGET /messages?after=100 ──►\n                        ◄── no messages\n\nwait 2 seconds\n\nGET /messages?after=100 ──►\n                        ◄── no messages\n\nwait 2 seconds\n\nGET /messages?after=100 ──►\n                        ◄── message 101\n</code></pre></div>\n<p>This is simple, but inefficient.</p>\n<p>If the client polls every two seconds:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 requests/minute/client\n</code></pre></div>\n<p>With 100,000 clients:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>3,000,000 requests/minute\n</code></pre></div>\n<p>Most responses may contain nothing.</p>"
    },
    {
      "title": "2. Long-polling flow",
      "diagram": null,
      "body": "<p>With long polling:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client                     Server\n\nGET /messages?after=100 ──►\n                            request remains open\n                            ...\n                            message 101 arrives\n                        ◄── message 101\n\nGET /messages?after=101 ──►\n                            request remains open\n</code></pre></div>\n<p>The client immediately starts another request after receiving a response.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>request\n    ↓\nwait for event or timeout\n    ↓\nrespond\n    ↓\nclient reconnects immediately\n</code></pre></div>\n<p>The server does not hold one request forever. It eventually responds, and the client creates another.</p>"
    },
    {
      "title": "3. Why the server must still use a timeout",
      "diagram": null,
      "body": "<p>Suppose no message arrives for hours.</p>\n<p>Keeping the request open indefinitely is risky because:</p>\n<ul>\n<li>proxies have idle timeouts</li>\n<li>load balancers terminate old connections</li>\n<li>clients disappear</li>\n<li>servers need resource cleanup</li>\n<li>network failures can leave stale requests</li>\n</ul>\n<p>A common pattern:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Long-poll timeout = 20–60 seconds\n</code></pre></div>\n<p>If no event arrives:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>HTTP/1.1 204 No Content\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"events\": [],\n  \"nextCursor\": \"100\"\n}\n</code></pre></div>\n<p>The client then reconnects.</p>"
    },
    {
      "title": "4. Long polling is not the same as a long-running API",
      "diagram": null,
      "body": "<p>These are different:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET /events\nwait until an event is available\n</code></pre></div>\n<p>versus:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /generate-report\nperform 20 minutes of computation\n</code></pre></div>\n<p>Long polling waits for a state change or notification.</p>\n<p>It should not normally execute expensive work while holding the request.</p>\n<p>For long-running jobs, use:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /reports\n    ↓\n202 Accepted\n    ↓\njobId\n    ↓\npoll status or receive notification\n</code></pre></div>"
    },
    {
      "title": "5. The basic server algorithm",
      "diagram": null,
      "body": "<p>A conceptual endpoint:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>GET /messages?afterSequence=100\n</code></pre></div>\n<p>Server logic:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Check whether messages after 100 already exist.\n2. If yes, return immediately.\n3. Otherwise register this request as a waiter.\n4. Wait until:\n   a. a new message arrives, or\n   b. timeout occurs, or\n   c. client disconnects.\n5. Return available messages or empty result.\n6. Remove waiter and release resources.\n</code></pre></div>\n<p>Step 1 is important.</p>\n<p>Without it, you can create a lost-wakeup race.</p>"
    },
    {
      "title": "6. The lost-wakeup race",
      "diagram": null,
      "body": "<p>A naive implementation:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Check database: no new messages.\n2. Message 101 arrives.\n3. Register waiter.\n4. Wait for future message.\n</code></pre></div>\n<p>The request may wait until timeout even though message 101 already exists.</p>\n<p>The event occurred between:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>check\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>subscribe\n</code></pre></div>\n<p>This is the classic check-then-wait race.</p>"
    },
    {
      "title": "7. Fixing the lost-wakeup problem",
      "diagram": null,
      "body": "<p>You need an atomic or race-safe pattern.</p>\n<p>One approach:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Register waiter.\n2. Recheck current sequence.\n3. If new data exists, complete immediately.\n4. Otherwise continue waiting.\n</code></pre></div>\n<p>Another approach is to synchronize the event-state check and registration.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>lock event stream\n    register waiter\n    check latest sequence\nunlock\n</code></pre></div>\n<p>At scale, a sequence number or cursor is usually more reliable than trying to perfectly coordinate transient notifications.</p>"
    },
    {
      "title": "8. Use cursors, not \"give me the latest\"",
      "diagram": null,
      "body": "<p>A robust request includes the last event the client has processed:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /events?after=105\n</code></pre></div>\n<p>Response:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"events\": [\n    {\n      \"sequence\": 106,\n      \"type\": \"MESSAGE_CREATED\"\n    },\n    {\n      \"sequence\": 107,\n      \"type\": \"MESSAGE_READ\"\n    }\n  ],\n  \"nextCursor\": 107\n}\n</code></pre></div>\n<p>The next request is:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /events?after=107\n</code></pre></div>\n<p>The cursor enables:</p>\n<ul>\n<li>reconnection</li>\n<li>replay</li>\n<li>duplicate detection</li>\n<li>gap detection</li>\n<li>ordered consumption</li>\n</ul>"
    },
    {
      "title": "9. Never use timestamps alone as the cursor",
      "diagram": null,
      "body": "<p>A timestamp seems convenient:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /events?after=2026-07-30T08:00:00Z\n</code></pre></div>\n<p>But two events can have the same timestamp.</p>\n<p>Clocks can also differ between servers.</p>\n<p>You may skip or duplicate records.</p>\n<p>Prefer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>monotonically increasing sequence\ndatabase ID\nbroker offset\nopaque continuation token\n</code></pre></div>\n<p>A timestamp can be part of the cursor, but usually should not be the only ordering key.</p>"
    },
    {
      "title": "10. At-least-once delivery is the safest assumption",
      "diagram": null,
      "body": "<p>Suppose the server returns event 106, but the response is lost.</p>\n<p>The client reconnects with:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>after=105\n</code></pre></div>\n<p>Event 106 is returned again.</p>\n<p>That is usually correct.</p>\n<p>The client should tolerate duplicates using:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>eventId\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>sequence number\n</code></pre></div>\n<p>Trying to ensure that every event is returned exactly once over an unreliable network is usually unrealistic.</p>\n<p>A practical design is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>at-least-once delivery\n+\nclient-side deduplication\n</code></pre></div>"
    },
    {
      "title": "11. The dangerous client sequence",
      "diagram": null,
      "body": "<p>Incorrect:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Receive event 106\n    ↓\nAdvance cursor to 106\n    ↓\nProcess event\n</code></pre></div>\n<p>If processing fails after advancing the cursor, event 106 is lost.</p>\n<p>Safer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Receive event 106\n    ↓\nProcess successfully\n    ↓\nPersist/advance cursor to 106\n</code></pre></div>\n<p>For browser UI updates, cursor persistence may only be in memory. For durable consumers, it may need persistent storage.</p>"
    },
    {
      "title": "12. What happens when several events arrive?",
      "diagram": null,
      "body": "<p>Do not necessarily complete the request with only one event.</p>\n<p>Suppose messages 101–110 arrive together.</p>\n<p>Return a batch:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"events\": [\n    {\"sequence\": 101},\n    {\"sequence\": 102},\n    {\"sequence\": 103}\n  ],\n  \"hasMore\": true,\n  \"nextCursor\": 103\n}\n</code></pre></div>\n<p>The client can request the next batch immediately.</p>\n<p>Batching reduces request overhead.</p>\n<p>But set limits:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maximum events\nmaximum response bytes\n</code></pre></div>\n<p>Otherwise a slow client may receive an enormous response.</p>"
    },
    {
      "title": "13. Backlog recovery and live waiting are different modes",
      "diagram": null,
      "body": "<p>Suppose a client was offline for a week and has 50,000 events pending.</p>\n<p>It should not open a request and wait.</p>\n<p>The server should immediately return backlog pages:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>after=100\n    ↓\nevents 101–500\n    ↓\nafter=500\n    ↓\nevents 501–900\n</code></pre></div>\n<p>Only after the client catches up should the endpoint behave as a waiting long poll.</p>\n<p>So the endpoint has two modes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>backlog exists\n    → return immediately\n\ncaught up\n    → wait\n</code></pre></div>"
    },
    {
      "title": "14. Slow clients",
      "diagram": null,
      "body": "<p>Suppose events arrive faster than a client consumes them.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event production = 1,000/sec\nclient processing = 100/sec\n</code></pre></div>\n<p>Long polling does not solve this.</p>\n<p>The backlog grows in storage.</p>\n<p>You need:</p>\n<ul>\n<li>response batching</li>\n<li>pagination</li>\n<li>retention rules</li>\n<li>compaction where appropriate</li>\n<li>slow-client limits</li>\n<li>possibly disconnect/reset semantics</li>\n</ul>\n<p>For ephemeral state, sending only the latest state may be better than replaying every update.</p>"
    },
    {
      "title": "15. Events versus state snapshots",
      "diagram": null,
      "body": "<p>Consider live stock prices.</p>\n<p>During a one-minute disconnection:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000 price updates\n</code></pre></div>\n<p>Does the client need all 1,000?</p>\n<p>Probably not.</p>\n<p>It may only need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>latest price\n</code></pre></div>\n<p>For chat messages, however, missing intermediate messages is unacceptable.</p>\n<p>Therefore choose between:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event stream\n</code></pre></div>\n<p>and:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>latest-state notification\n</code></pre></div>\n<p>based on business semantics.</p>"
    },
    {
      "title": "16. Server resource usage",
      "diagram": null,
      "body": "<p>Each open long-poll request consumes at least:</p>\n<ul>\n<li>socket/file descriptor</li>\n<li>request metadata</li>\n<li>timeout registration</li>\n<li>waiting-state record</li>\n<li>proxy/load-balancer capacity</li>\n</ul>\n<p>A thread-per-request model can be disastrous.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100,000 waiting clients\n</code></pre></div>\n<p>You do not want:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100,000 blocked application threads\n</code></pre></div>\n<p>Use asynchronous or non-blocking request handling.</p>"
    },
    {
      "title": "17. Blocking versus asynchronous servers",
      "diagram": null,
      "body": "<p>Bad scaling model:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>One request\n    ↓\nOne blocked thread\n</code></pre></div>\n<p>At 50,000 clients:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>50,000 threads\n</code></pre></div>\n<p>This causes:</p>\n<ul>\n<li>high memory use</li>\n<li>context switching</li>\n<li>scheduler overhead</li>\n<li>thread-pool exhaustion</li>\n</ul>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event-loop or asynchronous continuation\n</code></pre></div>\n<p>The request is suspended without holding a worker thread.</p>"
    },
    {
      "title": "18. Spring MVC implementation with DeferredResult",
      "diagram": null,
      "body": "<p>A simplified pattern:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@RestController\n@RequestMapping(\"/api/events\")\npublic class EventPollingController {\n\n    private final EventPollingService pollingService;\n\n    public EventPollingController(EventPollingService pollingService) {\n        this.pollingService = pollingService;\n    }\n\n    @GetMapping\n    public DeferredResult&lt;ResponseEntity&lt;EventBatch&gt;&gt; poll(\n            @RequestParam long afterSequence) {\n\n        DeferredResult&lt;ResponseEntity&lt;EventBatch&gt;&gt; result =\n                new DeferredResult&lt;&gt;(30_000L);\n\n        pollingService.register(afterSequence, result);\n\n        result.onTimeout(() -&gt;\n                result.setResult(\n                        ResponseEntity.noContent().build()\n                )\n        );\n\n        result.onCompletion(() -&gt;\n                pollingService.unregister(result)\n        );\n\n        return result;\n    }\n}\n</code></pre></div>\n<p><code class=\"inline-code\">DeferredResult</code> allows the servlet request to be released from the normal request thread while waiting.</p>\n<p>The production difficulty is not the annotation. It is making registration, rechecking, cleanup, and cluster routing correct.</p>"
    },
    {
      "title": "19. A safer registration sequence",
      "diagram": null,
      "body": "<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public void register(\n        long afterSequence,\n        DeferredResult&lt;ResponseEntity&lt;EventBatch&gt;&gt; result) {\n\n    Waiter waiter = waiters.add(afterSequence, result);\n\n    EventBatch current = repository.findAfter(afterSequence, MAX_BATCH);\n\n    if (!current.isEmpty()) {\n        if (waiters.remove(waiter)) {\n            result.setResult(ResponseEntity.ok(current));\n        }\n    }\n}\n</code></pre></div>\n<p>Why register before rechecking?</p>\n<p>Because it closes the gap where an event could arrive after the query but before registration.</p>\n<p>You still need carefully designed synchronization because event notification and waiter removal may race.</p>"
    },
    {
      "title": "20. Completing a waiter exactly once",
      "diagram": null,
      "body": "<p>These can happen simultaneously:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event arrives\ntimeout fires\nclient disconnects\n</code></pre></div>\n<p>Only one should complete the request.</p>\n<p>Use atomic removal or completion:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>if (waiters.remove(waiter)) {\n    waiter.complete(response);\n}\n</code></pre></div>\n<p>Do not allow multiple code paths to independently send a response or leak waiter state.</p>"
    },
    {
      "title": "21. Cleanup is mandatory",
      "diagram": null,
      "body": "<p>Requests may end because of:</p>\n<ul>\n<li>normal event response</li>\n<li>timeout</li>\n<li>client disconnect</li>\n<li>server shutdown</li>\n<li>proxy reset</li>\n<li>application error</li>\n</ul>\n<p>Every path must remove the waiter.</p>\n<p>Otherwise you create:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>memory leak\n+\nattempted delivery to dead requests\n</code></pre></div>\n<p>Track:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>active waiters\nwaiter age\ncompletion reason\n</code></pre></div>"
    },
    {
      "title": "22. The multiple-tabs case",
      "diagram": null,
      "body": "<p>One user may have:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tab A\nTab B\nTab C\nPhone\n</code></pre></div>\n<p>Each may open a long poll.</p>\n<p>Therefore:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>one user ≠ one active request\n</code></pre></div>\n<p>You need to decide whether the system permits:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>one request per connection\none request per browser tab\none request per device\nmultiple requests per user\n</code></pre></div>\n<p>A practical rate/concurrency limit could be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maximum 5 active long polls per user\n</code></pre></div>\n<p>Do not treat each tab as a separate endpoint. They are concurrent callers of the same endpoint.</p>"
    },
    {
      "title": "23. Duplicate active polls from one client",
      "diagram": null,
      "body": "<p>A client bug may accidentally open ten overlapping requests.</p>\n<p>Then one event arrives and may be returned ten times.</p>\n<p>Mitigations:</p>\n<ul>\n<li>client maintains exactly one active poll</li>\n<li>server limits active polls per session/device</li>\n<li>each poll has a connection/client ID</li>\n<li>older poll can be superseded</li>\n</ul>\n<p>Possible key:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(userId, clientInstanceId)\n</code></pre></div>\n<p>When a new poll arrives for the same client instance:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>replace or terminate the previous poll\n</code></pre></div>\n<p>Be careful not to collapse legitimate multiple tabs unless that is intended.</p>"
    },
    {
      "title": "24. Choosing the right client identity",
      "diagram": null,
      "body": "<p>Possible scopes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>user\ndevice\nbrowser profile\ntab/client instance\nsession\nconnection\n</code></pre></div>\n<p>For chat delivery:</p>\n<ul>\n<li>all user devices may need the message</li>\n<li>each tab may update its own UI</li>\n<li>read acknowledgement may be user-level</li>\n<li>typing status may be connection-level</li>\n</ul>\n<p>Identity scope must match the feature.</p>\n<p>A tab can generate a random in-memory <code class=\"inline-code\">clientInstanceId</code>. A browser/device identity may use a first-party cookie. Neither should replace authenticated user identity for authorization.</p>"
    },
    {
      "title": "25. Horizontal scaling problem",
      "diagram": null,
      "body": "<p>Suppose the long poll is connected to Server A:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n    ↓\nLoad Balancer\n    ↓\nServer A\n</code></pre></div>\n<p>A new message is processed by Server C.</p>\n<p>How does Server A learn about it?</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Server C\n    ↓\nshared broker\n    ↓\nServer A\n    ↓\ncomplete waiting request\n</code></pre></div>\n<p>As with WebSockets, in-memory waiters only cover one server.</p>"
    },
    {
      "title": "26. Cluster architecture",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>                         Message Service\n                               │\n                               ▼\n                         Pub/Sub Broker\n                          /     |     \\\n                         ▼      ▼      ▼\n                    Poll A   Poll B   Poll C\n                       │        │        │\n                     local    local    local\n                    waiters  waiters  waiters\n</code></pre></div>\n<p>Each server holds only its own waiting HTTP requests.</p>\n<p>A shared broker notifies all relevant servers, or routes by user/channel ownership.</p>"
    },
    {
      "title": "27. Do you need sticky sessions?",
      "diagram": null,
      "body": "<p>Strictly speaking, each long-poll request is independent.</p>\n<p>Unlike a WebSocket, the next request can reach another server.</p>\n<p>Therefore sticky sessions are not inherently required.</p>\n<p>But sticky sessions may help if servers cache:</p>\n<ul>\n<li>subscription state</li>\n<li>session state</li>\n<li>recent cursor information</li>\n</ul>\n<p>Prefer shared or reconstructible state so that any server can handle the next poll.</p>\n<p>This makes failover simpler.</p>"
    },
    {
      "title": "28. The notification-versus-storage race",
      "diagram": null,
      "body": "<p>A broker notification says:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>new event available\n</code></pre></div>\n<p>The server then queries storage.</p>\n<p>But due to replication lag, storage may not yet expose the event.</p>\n<p>Possible sequence:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Producer writes primary database.\n2. Producer publishes notification.\n3. Poll server reads lagging replica.\n4. No event found.\n</code></pre></div>\n<p>The waiter might be completed with nothing or wait incorrectly.</p>\n<p>Solutions:</p>\n<ul>\n<li>publish only after durable commit</li>\n<li>read from an appropriate consistency source</li>\n<li>retry the read briefly</li>\n<li>include enough event data in the broker notification</li>\n<li>use a transactional outbox</li>\n</ul>\n<p>This is another manifestation of the dual-write and replication-lag problems.</p>"
    },
    {
      "title": "29. Database polling inside long polling is not enough",
      "diagram": null,
      "body": "<p>A naive server might do:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>while timeout not reached:\n    query database\n    sleep 500 ms\n</code></pre></div>\n<p>For 100,000 requests, this creates enormous database load.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>database stores durable events\nbroker signals new availability\nlong-poll servers wake relevant waiters\n</code></pre></div>\n<p>Storage provides truth; the broker provides efficient notification.</p>"
    },
    {
      "title": "30. Timeout alignment across layers",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>application long-poll timeout = 60 seconds\nload balancer idle timeout = 30 seconds\n</code></pre></div>\n<p>The load balancer closes the request before the application does.</p>\n<p>The client sees network errors instead of a clean timeout response.</p>\n<p>Choose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>application timeout\n&lt;\nproxy/load-balancer timeout\n</code></pre></div>\n<p>with a safety margin.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>application: 25 seconds\nload balancer: 30 seconds\n</code></pre></div>\n<p>Also consider:</p>\n<ul>\n<li>API gateway maximum integration timeout</li>\n<li>CDN timeout</li>\n<li>ingress timeout</li>\n<li>reverse proxy read timeout</li>\n<li>client HTTP timeout</li>\n</ul>\n<p>The smallest timeout wins.</p>"
    },
    {
      "title": "31. Proxy buffering",
      "diagram": null,
      "body": "<p>Some reverse proxies buffer responses.</p>\n<p>For long polling, this is usually less problematic than SSE because the response is sent once at completion.</p>\n<p>But proxy configuration still matters for:</p>\n<ul>\n<li>request timeout</li>\n<li>connection limits</li>\n<li>keep-alive behavior</li>\n<li>buffering of large event batches</li>\n<li>upstream retry behavior</li>\n</ul>\n<p>A proxy must not transparently retry a non-idempotent request. Long-poll endpoints should normally be <code class=\"inline-code\">GET</code> and side-effect free.</p>"
    },
    {
      "title": "32. Load balancer retries can duplicate active polls",
      "diagram": null,
      "body": "<p>Suppose the upstream connection appears to fail and the load balancer retries the request against another server.</p>\n<p>Now two waiters may exist.</p>\n<p>For a safe <code class=\"inline-code\">GET</code>, duplicate execution is usually acceptable, but it can increase resource use and duplicate delivery.</p>\n<p>The client must deduplicate events regardless.</p>"
    },
    {
      "title": "33. Cancellation",
      "diagram": null,
      "body": "<p>When the user navigates away or starts a new request, the browser should cancel the old poll:</p>\n<div class=\"code-block\"><span class=\"code-label\">javascript</span><pre><code>const controller = new AbortController();\n\nfetch(\"/api/events?after=107\", {\n  signal: controller.signal\n});\n\n// Later:\ncontroller.abort();\n</code></pre></div>\n<p>Server-side disconnect detection is not always instantaneous, so timeout-based cleanup is still necessary.</p>"
    },
    {
      "title": "34. Client loop",
      "diagram": null,
      "body": "<p>A robust client loop:</p>\n<div class=\"code-block\"><span class=\"code-label\">javascript</span><pre><code>async function pollEvents(initialCursor) {\n  let cursor = initialCursor;\n  let delayMs = 0;\n\n  while (true) {\n    try {\n      if (delayMs &gt; 0) {\n        await sleep(delayMs);\n      }\n\n      const response = await fetch(\n        `/api/events?after=${encodeURIComponent(cursor)}`,\n        {\n          credentials: \"include\",\n          headers: {\n            \"Accept\": \"application/json\"\n          }\n        }\n      );\n\n      if (response.status === 204) {\n        delayMs = 0;\n        continue;\n      }\n\n      if (!response.ok) {\n        throw new Error(`Polling failed: ${response.status}`);\n      }\n\n      const batch = await response.json();\n\n      for (const event of batch.events) {\n        await processEventIdempotently(event);\n        cursor = event.sequence;\n      }\n\n      delayMs = 0;\n    } catch (error) {\n      delayMs = nextBackoffWithJitter(delayMs);\n    }\n  }\n}\n</code></pre></div>\n<p>Key behaviors:</p>\n<ul>\n<li>immediately reconnect after successful response</li>\n<li>do not delay after a normal empty timeout</li>\n<li>back off after actual failure</li>\n<li>process and advance cursor safely</li>\n<li>tolerate duplicates</li>\n</ul>"
    },
    {
      "title": "35. Normal timeout is not an error",
      "diagram": null,
      "body": "<p>A long poll timing out after 25 seconds with no data is expected.</p>\n<p>Do not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>log ERROR\nincrement failure alert\nexponentially back off\n</code></pre></div>\n<p>for a normal empty timeout.</p>\n<p>Differentiate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>normal poll expiration\n</code></pre></div>\n<p>from:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>network failure\nserver 500\nauthentication failure\nrate limit\n</code></pre></div>\n<p>Otherwise healthy quiet periods look like incidents.</p>"
    },
    {
      "title": "36. Status-code behavior",
      "diagram": null,
      "body": "<p>A practical scheme:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>200 OK\n    events returned\n\n204 No Content\n    normal timeout, no events\n\n400 Bad Request\n    invalid cursor\n\n401/403\n    authentication/authorization failure\n\n409 Conflict\n    cursor or client-state conflict\n\n410 Gone\n    cursor is older than retained history\n\n429 Too Many Requests\n    excessive polling/concurrent polls\n\n500/503\n    server or dependency failure\n</code></pre></div>\n<p><code class=\"inline-code\">410 Gone</code> is especially useful when the client asks for data older than retention.</p>"
    },
    {
      "title": "37. Cursor expiration",
      "diagram": null,
      "body": "<p>Suppose the server retains events for seven days.</p>\n<p>Client returns after one month with:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>after=100\n</code></pre></div>\n<p>But the earliest retained sequence is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000\n</code></pre></div>\n<p>The server cannot reconstruct the gap.</p>\n<p>Possible response:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>HTTP/1.1 410 Gone\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"code\": \"CURSOR_EXPIRED\",\n  \"\n\n&gt; Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.\n</code></pre></div>"
    }
  ],
  "keyTakeaways": [
    "Use an asynchronous waiting model, not one blocked thread per client.",
    "Register and recheck to close the lost-wakeup race.",
    "Resume with a durable cursor and assume at-least-once delivery.",
    "Treat normal empty timeouts differently from failures.",
    "Use shared notification infrastructure so any server can wake its local waiters."
  ]
};
