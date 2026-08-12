window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-24-server-sent-events"] = {
  "day": 24,
  "title": "Server-Sent Events",
  "subtitle": "Stream one-way server-to-browser events over HTTP with replay, reconnect, and backpressure controls.",
  "tags": [
    "SSE",
    "EventSource",
    "Last-Event-ID",
    "Proxy buffering",
    "Backpressure",
    "Authentication"
  ],
  "core": "Server-Sent Events provide a long-lived, one-way HTTP stream from server to client. The server can continuously push events, while the client uses ordinary HTTP requests for client-to-server actions.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "sequenceDiagram\n  participant Browser\n  participant SSE\n  participant Broker\n  Browser->>SSE: GET text/event-stream + Last-Event-ID\n  Broker-->>SSE: domain event\n  SSE-->>Browser: id / event / data\n  SSE-->>Browser: heartbeat comment\n  Browser->>SSE: automatic reconnect after disconnect",
      "body": "<p>SSE sits between long polling and WebSockets:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Long polling\n    one response, then reconnect\n\nSSE\n    one HTTP response, many server events\n\nWebSocket\n    one persistent full-duplex connection\n</code></pre></div>\n<p>SSE is often the simplest correct choice when the requirement is:</p>\n<div class=\"callout\">\n<p>“The server needs to push updates to the browser, but the client does not need a high-frequency bidirectional channel.”</p>\n</div>"
    },
    {
      "title": "1. The basic model",
      "diagram": null,
      "body": "<p>The client opens an HTTP request:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /api/events HTTP/1.1\nAccept: text/event-stream\n</code></pre></div>\n<p>The server replies:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>HTTP/1.1 200 OK\nContent-Type: text/event-stream\nCache-Control: no-cache\nConnection: keep-alive\n</code></pre></div>\n<p>The response remains open.</p>\n<p>The server sends events over time:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>data: first update\n\ndata: second update\n\ndata: third update\n\n</code></pre></div>\n<p>Each event ends with a blank line.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client                     Server\n\nGET /events ──────────────►\n\n             ◄──────────── data: event 1\n\n             ◄──────────── data: event 2\n\n             ◄──────────── data: event 3\n\nconnection remains open\n</code></pre></div>\n<p>Unlike long polling, the client does not reconnect after every event.</p>"
    },
    {
      "title": "2. SSE is one-way",
      "diagram": null,
      "body": "<p>SSE supports:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Server ─────────► Client\n</code></pre></div>\n<p>It does not provide a persistent client-to-server channel.</p>\n<p>The browser sends commands using normal HTTP:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>POST /messages\nPOST /orders\nPUT  /preferences\n</code></pre></div>\n<p>and receives asynchronous updates through SSE:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET /events\n</code></pre></div>\n<p>A common architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n   │\n   ├── HTTP POST ──────► Commands/API\n   │\n   └── SSE stream ◄──── Events/updates\n</code></pre></div>\n<p>This separation is often simpler than WebSockets.</p>"
    },
    {
      "title": "3. SSE wire format",
      "diagram": null,
      "body": "<p>An SSE event can contain several fields:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>id: 105\nevent: order-status\ndata: {\"orderId\":\"O123\",\"status\":\"SHIPPED\"}\nretry: 5000\n\n</code></pre></div>\n<p>Meaning:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>id\n    persistent event identifier\n\nevent\n    application event type\n\ndata\n    payload\n\nretry\n    suggested reconnect delay in milliseconds\n</code></pre></div>\n<p>The final blank line terminates the event.</p>"
    },
    {
      "title": "4. Multiple data lines",
      "diagram": null,
      "body": "<p>An event may contain multiple <code class=\"inline-code\">data:</code> lines:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>data: line one\ndata: line two\ndata: line three\n\n</code></pre></div>\n<p>The browser combines them with newline characters.</p>\n<p>For JSON, it is usually simpler to send one serialized line:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>data: {\"type\":\"PAYMENT_AUTHORIZED\",\"paymentId\":\"P123\"}\n\n</code></pre></div>\n<p>Avoid manually constructing unescaped JSON strings.</p>\n<p>Use your normal JSON serializer.</p>"
    },
    {
      "title": "5. Browser API",
      "diagram": null,
      "body": "<p>A simple browser client:</p>\n<div class=\"code-block\"><span class=\"code-label\">javascript</span><pre><code>const source = new EventSource(\"/api/events\");\n\nsource.onmessage = (event) =&gt; {\n  const payload = JSON.parse(event.data);\n  console.log(payload);\n};\n\nsource.onerror = (error) =&gt; {\n  console.error(\"SSE connection error\", error);\n};\n</code></pre></div>\n<p>For named events:</p>\n<div class=\"code-block\"><span class=\"code-label\">javascript</span><pre><code>source.addEventListener(\"order-status\", (event) =&gt; {\n  const update = JSON.parse(event.data);\n  updateOrderStatus(update);\n});\n</code></pre></div>\n<p>The browser automatically reconnects after disconnection.</p>\n<p>This is one of SSE's strongest advantages.</p>"
    },
    {
      "title": "6. Automatic reconnection",
      "diagram": null,
      "body": "<p>Suppose the connection fails:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client ──X── Server\n</code></pre></div>\n<p><code class=\"inline-code\">EventSource</code> normally reconnects automatically.</p>\n<p>The server can suggest a delay:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>retry: 5000\n\n</code></pre></div>\n<p>This means:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>retry after approximately 5 seconds\n</code></pre></div>\n<p>However, application-level reconnect behavior should still avoid synchronized reconnect storms.</p>\n<p>A single fixed retry delay across hundreds of thousands of clients can cause:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>all clients disconnect\n    ↓\nall reconnect after 5 seconds\n    ↓\nconnection spike\n</code></pre></div>\n<p>Browser-native <code class=\"inline-code\">EventSource</code> offers limited control over adding jitter, so large systems may use:</p>\n<ul>\n<li>randomized server-side disconnect timing</li>\n<li>infrastructure admission control</li>\n<li>a custom fetch-based SSE client</li>\n<li>staggered retry hints</li>\n<li>reconnect rate limiting</li>\n</ul>"
    },
    {
      "title": "7. Event IDs and recovery",
      "diagram": null,
      "body": "<p>Suppose the server sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>id: 105\ndata: {\"message\":\"hello\"}\n\n</code></pre></div>\n<p>The browser remembers:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>105\n</code></pre></div>\n<p>After reconnecting, it sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Last-Event-ID: 105\n</code></pre></div>\n<p>The server can then resume:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event 106\nevent 107\nevent 108\n</code></pre></div>\n<p>This is SSE's built-in recovery mechanism.</p>\n<p>But it only works if the server maintains durable event history or can reconstruct events after that ID.</p>"
    },
    {
      "title": "8. `Last-Event-ID` is not magic",
      "diagram": null,
      "body": "<p>The browser sends the ID.</p>\n<p>The server must decide what it means.</p>\n<p>A good event ID may be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>database sequence\nbroker offset\nstream position\nopaque resume token\n</code></pre></div>\n<p>A poor event ID is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>current server memory index\n</code></pre></div>\n<p>because reconnecting to a different server may make it meaningless.</p>\n<p>The ID must be valid across:</p>\n<ul>\n<li>server restarts</li>\n<li>multiple application instances</li>\n<li>load-balancer routing</li>\n<li>reconnects</li>\n</ul>"
    },
    {
      "title": "9. Snapshot plus stream",
      "diagram": null,
      "body": "<p>A common race occurs during initial loading.</p>\n<p>Naive flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Fetch current state\n2. Open SSE connection\n</code></pre></div>\n<p>An event may happen between the two:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Fetch state at version 100\n    ↓\nevent 101 occurs\n    ↓\nopen stream after 101\n</code></pre></div>\n<p>The client may miss event 101.</p>\n<p>A safer pattern:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Fetch snapshot plus cursor/version.\n2. Open SSE starting after that cursor.\n</code></pre></div>\n<p>Example snapshot:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"orders\": [...],\n  \"cursor\": 1050\n}\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /api/events?after=1050\n</code></pre></div>\n<p>or use an equivalent resume mechanism.</p>"
    },
    {
      "title": "10. Another safe bootstrap pattern",
      "diagram": null,
      "body": "<p>You can also open the stream first:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Open SSE stream.\n2. Buffer incoming events.\n3. Fetch initial snapshot.\n4. Apply buffered events after snapshot version.\n</code></pre></div>\n<p>This avoids the gap but increases client complexity.</p>\n<p>The best choice depends on whether your backend can atomically associate a snapshot with a stream cursor.</p>"
    },
    {
      "title": "11. Event notification versus event replay",
      "diagram": null,
      "body": "<p>Suppose SSE sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event: order-changed\ndata: {\"orderId\":\"O123\"}\n\n</code></pre></div>\n<p>The client then fetches the latest order:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /orders/O123\n</code></pre></div>\n<p>This is an event-notification model.</p>\n<p>Alternatively, SSE can carry the full state:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event: order-status\ndata: {\n  \"orderId\":\"O123\",\n  \"status\":\"SHIPPED\",\n  \"version\":12\n}\n\n</code></pre></div>\n<p>This reduces follow-up requests but increases payload and schema coupling.</p>\n<p>The trade-off is the same as in event-driven architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>small notification\n    less payload, more API fetching\n\nevent-carried state\n    more payload, less runtime coupling\n</code></pre></div>"
    },
    {
      "title": "12. Durable versus ephemeral updates",
      "diagram": null,
      "body": "<p>SSE is a transport.</p>\n<p>It does not decide whether events should be replayable.</p>\n<p>Examples:</p>\n<h5>Durable</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>chat messages\npayment status\norder status\naudit notifications\n</code></pre></div>\n<p>Missing these may be unacceptable.</p>\n<p>Use event IDs, retention, replay, and client deduplication.</p>\n<h5>Ephemeral</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>typing indicator\nCPU utilization\nlive cursor position\ncurrent stock price\n</code></pre></div>\n<p>If one intermediate update is missed, sending the latest state may be sufficient.</p>\n<p>For ephemeral updates, replaying thousands of old values can be harmful.</p>"
    },
    {
      "title": "13. Heartbeats",
      "diagram": null,
      "body": "<p>Many proxies and load balancers close idle connections.</p>\n<p>If no business event is emitted for several minutes, the connection may appear idle.</p>\n<p>SSE supports comment lines:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>: heartbeat\n\n</code></pre></div>\n<p>A comment begins with <code class=\"inline-code\">:</code> and is ignored by <code class=\"inline-code\">EventSource</code>.</p>\n<p>Send periodically:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>: keepalive\n\n</code></pre></div>\n<p>This keeps the connection active without producing an application event.</p>\n<p>Typical interval:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>15–30 seconds\n</code></pre></div>\n<p>But it must be shorter than the smallest idle timeout in the path.</p>"
    },
    {
      "title": "14. Heartbeats also detect dead clients",
      "diagram": null,
      "body": "<p>A heartbeat write can reveal that the client connection has disappeared.</p>\n<p>Without periodic writes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>client disconnects\n    ↓\nserver may retain emitter state\n</code></pre></div>\n<p>until another business event arrives or timeout cleanup occurs.</p>\n<p>Heartbeats improve cleanup speed, though TCP failure detection is not instantaneous.</p>"
    },
    {
      "title": "15. Timeout hierarchy",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>SSE heartbeat every 45 seconds\nload balancer idle timeout 30 seconds\n</code></pre></div>\n<p>The load balancer closes the connection before every heartbeat.</p>\n<p>Correct hierarchy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>heartbeat interval\n&lt;\nsmallest infrastructure idle timeout\n</code></pre></div>\n<p>Inspect:</p>\n<ul>\n<li>browser/client behavior</li>\n<li>CDN</li>\n<li>WAF</li>\n<li>API gateway</li>\n<li>load balancer</li>\n<li>ingress</li>\n<li>reverse proxy</li>\n<li>application server</li>\n</ul>\n<p>The shortest timeout controls the connection.</p>"
    },
    {
      "title": "16. Proxy buffering",
      "diagram": null,
      "body": "<p>This is one of the most common SSE production problems.</p>\n<p>The application writes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>data: event 1\n\n</code></pre></div>\n<p>but the reverse proxy buffers it.</p>\n<p>The browser receives nothing until:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>buffer fills\nconnection closes\nlarge amount of data accumulates\n</code></pre></div>\n<p>That destroys real-time behavior.</p>\n<p>For NGINX, SSE paths commonly need buffering disabled:</p>\n<div class=\"code-block\"><span class=\"code-label\">nginx</span><pre><code>location /api/events {\n    proxy_pass http://backend;\n\n    proxy_http_version 1.1;\n    proxy_set_header Connection \"\";\n\n    proxy_buffering off;\n    proxy_cache off;\n\n    proxy_read_timeout 1h;\n\n    add_header X-Accel-Buffering no;\n}\n</code></pre></div>\n<p>Exact configuration depends on the infrastructure, but the design requirement is:</p>\n<div class=\"callout\">\n<p>Events must be flushed through every intermediary rather than buffered.</p>\n</div>"
    },
    {
      "title": "17. Application flushing",
      "diagram": null,
      "body": "<p>Even with proxy buffering disabled, the application/runtime may buffer output.</p>\n<p>After writing an event, flush it.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>writer.write(event);\nwriter.flush();\n</code></pre></div>\n<p>Framework abstractions often handle this, but verify with real network tests.</p>\n<p>A server log saying:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event sent\n</code></pre></div>\n<p>does not prove that the browser received it immediately.</p>"
    },
    {
      "title": "18. Compression can introduce buffering",
      "diagram": null,
      "body": "<p>Compression middleware may wait for more bytes before producing a compressed block.</p>\n<p>For tiny SSE events, this may delay delivery.</p>\n<p>SSE endpoints are often configured with:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>compression disabled\n</code></pre></div>\n<p>or carefully tested compression behavior.</p>\n<p>Compression may still be useful for large streams, but low-latency flushing matters more than theoretical bandwidth savings for small events.</p>"
    },
    {
      "title": "19. Caching must be disabled",
      "diagram": null,
      "body": "<p>An SSE stream is not an ordinary cacheable response.</p>\n<p>Use headers such as:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Cache-Control: no-cache\nContent-Type: text/event-stream\n</code></pre></div>\n<p>CDNs and proxies must not cache the event stream.</p>\n<p>Also ensure application-level response caching does not intercept the endpoint.</p>"
    },
    {
      "title": "20. HTTP/1.1 connection limits",
      "diagram": null,
      "body": "<p>Browsers traditionally limit the number of simultaneous HTTP/1.1 connections per origin.</p>\n<p>Multiple tabs or multiple SSE streams can exhaust that limit.</p>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tab 1: SSE stream\nTab 2: SSE stream\nTab 3: SSE stream\nother HTTP requests\n</code></pre></div>\n<p>This may interfere with normal API calls under HTTP/1.1.</p>\n<p>HTTP/2 multiplexing improves this because many logical streams share one underlying connection.</p>\n<p>Still, avoid opening unnecessary SSE streams.</p>\n<p>A useful client pattern is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>one SSE stream per browser tab\n</code></pre></div>\n<p>or potentially one shared stream across tabs using:</p>\n<ul>\n<li>SharedWorker</li>\n<li>BroadcastChannel</li>\n<li>service-worker coordination</li>\n</ul>\n<p>This reduces connection count but adds client complexity.</p>"
    },
    {
      "title": "21. Multiple tabs and devices",
      "diagram": null,
      "body": "<p>One user may have:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Laptop tab A\nLaptop tab B\nPhone\nTablet\n</code></pre></div>\n<p>Each may maintain its own SSE connection.</p>\n<p>That means:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>one user ≠ one stream\n</code></pre></div>\n<p>Design separate concepts:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>userId\ndeviceId\nbrowserSessionId\nclientInstanceId\nconnectionId\n</code></pre></div>\n<p>Rate limiting may enforce:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maximum active streams per user\nmaximum active streams per device\nmaximum stream creations per minute\n</code></pre></div>\n<p>Do not incorrectly treat browser tabs as separate API endpoints. They are separate client instances using the same endpoint.</p>"
    },
    {
      "title": "22. Authentication limitation of native `EventSource`",
      "diagram": null,
      "body": "<p>The browser's native <code class=\"inline-code\">EventSource</code> API does not let you freely set arbitrary headers such as:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Authorization: Bearer ...\n</code></pre></div>\n<p>This matters for token-based APIs.</p>\n<p>Common solutions:</p>\n<h5>Cookie authentication</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>secure HttpOnly session cookie\n</code></pre></div>\n<p>This works naturally with same-origin SSE and is often the cleanest browser approach.</p>\n<h5>Query-string token</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>/events?token=...\n</code></pre></div>\n<p>Generally less desirable because tokens may leak through:</p>\n<ul>\n<li>logs</li>\n<li>browser history</li>\n<li>monitoring</li>\n<li>referrer handling</li>\n</ul>\n<p>Use only short-lived, narrowly scoped tokens if necessary.</p>\n<h5>Fetch-based SSE client</h5>\n<p>Use <code class=\"inline-code\">fetch()</code> and parse the stream manually, allowing custom headers.</p>\n<h5>Signed one-time connection token</h5>\n<p>Client obtains a short-lived connection credential through a normal authenticated API, then uses it to open the stream.</p>"
    },
    {
      "title": "23. Cross-origin SSE",
      "diagram": null,
      "body": "<p>For cross-origin connections, configure CORS carefully.</p>\n<p>The server may need:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Access-Control-Allow-Origin: https://app.example.com\nAccess-Control-Allow-Credentials: true\n</code></pre></div>\n<p>Do not use:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Access-Control-Allow-Origin: *\n</code></pre></div>\n<p>with credentials.</p>\n<p>The client can create:</p>\n<div class=\"code-block\"><span class=\"code-label\">javascript</span><pre><code>const source = new EventSource(url, {\n  withCredentials: true\n});\n</code></pre></div>\n<p>Treat SSE authorization exactly like any other sensitive API.</p>\n<p>CORS does not replace authentication or authorization.</p>"
    },
    {
      "title": "24. Token expiration",
      "diagram": null,
      "body": "<p>Suppose the user opens an SSE stream with a session valid for one hour.</p>\n<p>The connection remains open for four hours.</p>\n<p>Questions:</p>\n<ul>\n<li>Should it remain valid?</li>\n<li>Should the server close it at expiry?</li>\n<li>Should permissions be rechecked?</li>\n<li>How is token refresh handled?</li>\n</ul>\n<p>Possible policy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>authenticate on connect\n    ↓\nenforce maximum stream lifetime\n    ↓\nclose before credential expiry\n    ↓\nclient refreshes credentials\n    ↓\nreconnects using Last-Event-ID\n</code></pre></div>\n<p>For highly sensitive events, authorization may also be revalidated periodically or at event-delivery time.</p>"
    },
    {
      "title": "25. Authorization can change midstream",
      "diagram": null,
      "body": "<p>Suppose a user is subscribed to room 123.</p>\n<p>While the stream remains open:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>user removed from room\n</code></pre></div>\n<p>The server must stop delivering room events.</p>\n<p>This may require:</p>\n<ul>\n<li>dynamic subscription updates</li>\n<li>authorization cache invalidation</li>\n<li>connection closure</li>\n<li>delivery-time permission checks</li>\n</ul>\n<p>Authorizing only at connection establishment may expose later data.</p>"
    },
    {
      "title": "26. Server-side connection state",
      "diagram": null,
      "body": "<p>Each open SSE stream requires:</p>\n<ul>\n<li>socket/file descriptor</li>\n<li>emitter/subscriber object</li>\n<li>timeout/heartbeat state</li>\n<li>pending output buffer</li>\n<li>identity/subscription metadata</li>\n</ul>\n<p>As with WebSockets:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>persistent connections consume persistent resources\n</code></pre></div>\n<p>The per-connection overhead may be small, but multiplied by hundreds of thousands it becomes significant.</p>"
    },
    {
      "title": "27. Do not hold a thread per stream",
      "diagram": null,
      "body": "<p>A naive blocking servlet approach may consume:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>one thread per SSE connection\n</code></pre></div>\n<p>At 100,000 clients, that is not viable.</p>\n<p>Use:</p>\n<ul>\n<li>asynchronous servlet handling</li>\n<li>reactive/non-blocking server</li>\n<li>event-loop architecture</li>\n<li>framework-specific streaming abstraction</li>\n</ul>\n<p>The stream can be open without a worker thread waiting continuously.</p>"
    },
    {
      "title": "28. Do not hold a database connection",
      "diagram": null,
      "body": "<p>The SSE response may live for hours.</p>\n<p>Never hold:</p>\n<ul>\n<li>database connection</li>\n<li>open transaction</li>\n<li>row lock</li>\n<li>ORM persistence context</li>\n</ul>\n<p>for the lifetime of the stream.</p>\n<p>Instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>connection waits asynchronously\n    ↓\nnew event arrives from broker\n    ↓\nperform short DB read if needed\n    ↓\nrelease DB resources\n    ↓\nwrite event\n</code></pre></div>"
    },
    {
      "title": "29. Spring MVC with `SseEmitter`",
      "diagram": null,
      "body": "<p>A simple Spring MVC controller:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@RestController\n@RequestMapping(\"/api/events\")\npublic class EventStreamController {\n\n    private static final long STREAM_TIMEOUT_MS = 30 * 60 * 1000L;\n\n    private final EventStreamRegistry registry;\n\n    public EventStreamController(EventStreamRegistry registry) {\n        this.registry = registry;\n    }\n\n    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)\n    public SseEmitter subscribe(Principal principal) {\n        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);\n\n        String connectionId = UUID.randomUUID().toString();\n        String userId = principal.getName();\n\n        registry.register(userId, connectionId, emitter);\n\n        emitter.onCompletion(() -&gt;\n                registry.remove(userId, connectionId));\n\n        emitter.onTimeout(() -&gt; {\n            registry.remove(userId, connectionId);\n            emitter.complete();\n        });\n\n        emitter.onError(error -&gt;\n                registry.remove(userId, connectionId));\n\n        return emitter;\n    }\n}\n</code></pre></div>\n<p>The difficult part is not creating <code class=\"inline-code\">SseEmitter</code>.</p>\n<p>The difficult parts are:</p>\n<ul>\n<li>reliable cleanup</li>\n<li>horizontal scaling</li>\n<li>slow clients</li>\n<li>replay</li>\n<li>authorization changes</li>\n<li>connection limits</li>\n<li>deployment behavior</li>\n</ul>"
    },
    {
      "title": "30. Sending an event safely",
      "diagram": null,
      "body": "<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public void send(\n        SseEmitter emitter,\n        DomainEvent event) {\n\n    try {\n        emitter.send(\n                SseEmitter.event()\n                        .id(event.sequence().toString())\n                        .name(event.type())\n                        .data(event.payload())\n        );\n    } catch (IOException | IllegalStateException ex) {\n        // Treat the connection as unusable and remove it.\n        emitter.completeWithError(ex);\n    }\n}\n</code></pre></div>\n<p>After a write failure, remove the emitter.</p>\n<p>Do not repeatedly attempt to send to a dead connection.</p>"
    },
    {
      "title": "31. Connection registry race conditions",
      "diagram": null,
      "body": "<p>Several actions may happen concurrently:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>heartbeat write\nbusiness event write\nclient disconnect\nserver timeout\nshutdown\n</code></pre></div>\n<p>Two threads must not corrupt a single response stream.</p>\n<p>Use:</p>\n<ul>\n<li>serialized writes per emitter</li>\n<li>connection lifecycle state</li>\n<li>atomic removal</li>\n<li>idempotent cleanup</li>\n</ul>\n<p>A plain unsynchronized:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Map&lt;String, SseEmitter&gt;\n</code></pre></div>\n<p>is insufficient in a concurrent production server.</p>"
    },
    {
      "title": "32. Multiple writers",
      "diagram": null,
      "body": "<p>Suppose one stream receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>order event\nnotification event\nheartbeat\n</code></pre></div>\n<p>from different threads.</p>\n<p>Concurrent writes can interleave or fail unpredictably.</p>\n<p>A robust design uses a per-connection send queue:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>producers\n   ↓\nbounded per-connection queue\n   ↓\nsingle serialized writer\n   ↓\nSSE stream\n</code></pre></div>\n<p>This also provides a place to enforce backpressure.</p>"
    },
    {
      "title": "33. Backpressure and slow clients",
      "diagram": null,
      "body": "<p>Suppose the server produces:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000 events/sec\n</code></pre></div>\n<p>but a client's network can send only:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>50 events/sec\n</code></pre></div>\n<p>Output buffers grow.</p>\n<p>Eventually:</p>\n<ul>\n<li>heap usage increases</li>\n<li>latency becomes unbounded</li>\n<li>the process may run out of memory</li>\n</ul>\n<p>You need a policy.</p>\n<p>Possible policies:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>disconnect slow client\ndrop replaceable updates\ncoalesce updates\nlimit pending bytes/events\npersist backlog and require replay\n</code></pre></div>\n<p>Never use an unbounded per-client queue.</p>"
    },
    {
      "title": "34. Coalescing",
      "diagram": null,
      "body": "<p>For state-style events, intermediate updates may be replaceable.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CPU=31%\nCPU=32%\nCPU=33%\nCPU=34%\n</code></pre></div>\n<p>A slow client may only need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CPU=34%\n</code></pre></div>\n<p>Coalesce by key:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>latest value for metric X\n</code></pre></div>\n<p>For durable business events:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PaymentAuthorized\nOrderShipped\n</code></pre></div>\n<p>dropping is generally unacceptable.</p>\n<p>Backpressure policy depends on event semantics.</p>"
    },
    {
      "title": "35. Bounded queue example",
      "diagram": null,
      "body": "<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>final class ClientConnection {\n\n    private final BlockingQueue&lt;OutboundEvent&gt; pending =\n            new ArrayBlockingQueue&lt;&gt;(500);\n\n    boolean enqueue(OutboundEvent event) {\n        return pending.offer(event);\n    }\n}\n</code></pre></div>\n<p>If the queue is full:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>ephemeral event\n    replace/drop safely\n\ndurable event\n    disconnect and require resume/replay\n\ncritical unreplayable event\n    architecture is unsafe and must be redesigned\n</code></pre></div>\n<p>The answer cannot simply be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>keep buffering\n</code></pre></div>"
    },
    {
      "title": "36. Horizontal scaling",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client A → Server 1\nClient B → Server 3\n</code></pre></div>\n<p>An order update is processed by Server 2.</p>\n<p>Server 2 does not own either client connection.</p>\n<p>You need shared event distribution:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Business Service\n       │\n       ▼\n  Pub/Sub Broker\n    /    |    \\\n   ▼     ▼     ▼\nSSE 1  SSE 2  SSE 3\n   │           │\nClient A     Client B\n</code></pre></div>\n<p>Each SSE node:</p>\n<ul>\n<li>consumes relev</li>\n</ul>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "SSE is one-way; commands remain ordinary HTTP requests.",
    "Use durable event IDs and Last-Event-ID only when replay is actually supported.",
    "Disable buffering/caching and heartbeat below the smallest infrastructure idle timeout.",
    "Bound per-client queues and choose drop, coalesce, disconnect, or replay by event semantics.",
    "Plan authentication refresh, authorization changes, reconnect storms, and horizontal fan-out."
  ]
};
