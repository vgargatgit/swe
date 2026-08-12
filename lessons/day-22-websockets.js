window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-22-websockets"] = {
  "day": 22,
  "title": "WebSockets",
  "subtitle": "Operate long-lived bidirectional connections for chat, notifications, dashboards, games, and presence.",
  "tags": [
    "WebSockets",
    "Presence",
    "Heartbeats",
    "Reconnect",
    "Backpressure",
    "Fan-out"
  ],
  "core": "WebSockets convert the traditional request-response model of HTTP into a long-lived, full-duplex communication channel . Once established, either the client or the server can send data at any time without waiting for a request.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Clients --> LB[Connection-aware LB]\n  LB --> W1[WebSocket node A]\n  LB --> W2[WebSocket node B]\n  W1 <--> Broker[(Pub/Sub broker)]\n  W2 <--> Broker\n  W1 --> Store[(Durable message store)]\n  W2 --> Store",
      "body": "<p>Most developers first encounter WebSockets while building chat applications.</p>\n<p>However, production systems use them for:</p>\n<ul>\n<li>Chat</li>\n<li>Trading platforms</li>\n<li>Multiplayer games</li>\n<li>Live dashboards</li>\n<li>Collaborative editors</li>\n<li>IoT devices</li>\n<li>Presence systems</li>\n<li>Notifications</li>\n<li>Live metrics</li>\n<li>Video signaling</li>\n</ul>\n<p>WebSockets introduce an entirely different set of scaling and operational challenges than stateless HTTP.</p>"
    },
    {
      "title": "1. HTTP vs WebSocket",
      "diagram": null,
      "body": "<p>HTTP:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n   │\nRequest\n   ▼\nServer\n   │\nResponse\n   ▼\nConnection closed\n</code></pre></div>\n<p>Every request starts a new conversation.</p>\n\n<p>WebSocket:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n      │\nHandshake\n      ▼\nServer\n\n==========================\nPersistent Connection\n==========================\n\nClient  ─────────► Server\nClient ◄───────── Server\n\nEither side may send data\nat any time.\n</code></pre></div>\n<p>The connection remains open for minutes, hours, or even days.</p>"
    },
    {
      "title": "2. Full duplex",
      "diagram": null,
      "body": "<p>HTTP is essentially:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n\n↓\n\nRequest\n\n↓\n\nServer\n\n↓\n\nResponse\n</code></pre></div>\n<p>The server cannot suddenly decide:</p>\n<div class=\"callout\">\n<p>\"By the way, here's a new stock price.\"</p>\n</div>\n<p>The client must ask again.</p>\n<p>WebSocket:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client ◄────────► Server\n</code></pre></div>\n<p>Both sides can transmit independently.</p>"
    },
    {
      "title": "3. The WebSocket handshake",
      "diagram": null,
      "body": "<p>A WebSocket begins as an ordinary HTTP request.</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /chat HTTP/1.1\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Key: ...\n</code></pre></div>\n<p>Server replies:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>HTTP/1.1 101 Switching Protocols\nUpgrade: websocket\nConnection: Upgrade\n</code></pre></div>\n<p>After that:</p>\n<p>HTTP ends.</p>\n<p>Raw WebSocket frames begin.</p>"
    },
    {
      "title": "4. Why not just poll?",
      "diagram": null,
      "body": "<p>Traditional polling:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Every second\n\n↓\n\nGET /messages\n\n↓\n\nNo messages\n\n↓\n\n1 second later\n\n↓\n\nGET /messages\n\n↓\n\nNo messages\n\n↓\n\n1 second later...\n</code></pre></div>\n<p>Most requests return nothing.</p>\n<p>Wasteful.</p>\n\n<p>WebSocket:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client connects\n\n↓\n\nWaits\n\n↓\n\nServer sends only when needed.\n</code></pre></div>\n<p>Much more efficient for real-time updates.</p>"
    },
    {
      "title": "5. Long-lived connections change everything",
      "diagram": null,
      "body": "<p>HTTP server:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Receive request\n\n↓\n\nWork\n\n↓\n\nClose socket\n</code></pre></div>\n<p>WebSocket server:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Accept connection\n\n↓\n\nKeep socket\n\n↓\n\nKeep memory\n\n↓\n\nKeep buffers\n\n↓\n\nKeep state\n</code></pre></div>\n<p>Every connected client consumes resources continuously.</p>"
    },
    {
      "title": "6. Memory scaling",
      "diagram": null,
      "body": "<p>Suppose each connection requires:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>50 KB\n</code></pre></div>\n<p>Then:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100,000 clients\n\n↓\n\n5 GB memory\n</code></pre></div>\n<p>Just for connections.</p>\n<p>Not business logic.</p>\n<p>Real systems optimize aggressively.</p>"
    },
    {
      "title": "7. File descriptors",
      "diagram": null,
      "body": "<p>Every TCP connection consumes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Socket\n\n↓\n\nFile descriptor\n</code></pre></div>\n<p>Linux defaults may allow only:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1024\n</code></pre></div>\n<p>open descriptors.</p>\n<p>Production WebSocket servers often increase:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>ulimit -n\n</code></pre></div>\n<p>into the hundreds of thousands.</p>\n<p>Otherwise connections fail unexpectedly.</p>"
    },
    {
      "title": "8. Connection lifecycle",
      "diagram": null,
      "body": "<p>Typical lifecycle:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>TCP connect\n\n↓\n\nHTTP Upgrade\n\n↓\n\nAuthenticate\n\n↓\n\nJoin channels\n\n↓\n\nExchange messages\n\n↓\n\nHeartbeat\n\n↓\n\nDisconnect\n\n↓\n\nReconnect\n</code></pre></div>\n<p>Every stage requires design.</p>"
    },
    {
      "title": "9. Authentication",
      "diagram": null,
      "body": "<p>Question:</p>\n<p>Should authentication happen:</p>\n<p>Before upgrade?</p>\n<p>Or after?</p>\n<p>Usually:</p>\n<p>Authenticate during the HTTP handshake.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /chat\n\nAuthorization: Bearer ...\n</code></pre></div>\n<p>or</p>\n<p>Secure session cookie.</p>\n<p>The connection becomes associated with an authenticated user.</p>"
    },
    {
      "title": "10. Token expiration",
      "diagram": null,
      "body": "<p>Suppose JWT expires after:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 minutes\n</code></pre></div>\n<p>WebSocket stays open:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>4 hours\n</code></pre></div>\n<p>Questions:</p>\n<p>Should connection remain valid?</p>\n<p>Disconnect?</p>\n<p>Reauthenticate?</p>\n<p>Refresh token?</p>\n<p>Production systems need explicit policy.</p>"
    },
    {
      "title": "11. Session association",
      "diagram": null,
      "body": "<p>One authenticated user may have:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Laptop\n\nPhone\n\nTablet\n\nBrowser Tab 1\n\nBrowser Tab 2\n</code></pre></div>\n<p>Five simultaneous WebSockets.</p>\n<p>Never assume:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>One user\n\n↓\n\nOne connection\n</code></pre></div>\n<p>Presence systems must distinguish:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>User\n\n↓\n\nDevice\n\n↓\n\nConnection\n</code></pre></div>\n<p>This relates directly to the session modeling we discussed earlier.</p>"
    },
    {
      "title": "12. Connection IDs",
      "diagram": null,
      "body": "<p>Every socket usually receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>connectionId\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>User 42\n\n↓\n\nConnection A\n\nConnection B\n\nConnection C\n</code></pre></div>\n<p>Messages can target:</p>\n<ul>\n<li>user</li>\n<li>device</li>\n<li>connection</li>\n<li>room</li>\n<li>channel</li>\n</ul>\n<p>depending on application semantics.</p>"
    },
    {
      "title": "13. Presence",
      "diagram": null,
      "body": "<p>Question:</p>\n<p>Is the user online?</p>\n<p>Not always simple.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Browser tab closes.\n\n↓\n\nOther tab still open.\n</code></pre></div>\n<p>User is still online.</p>\n<p>Better model:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>User\n\n↓\n\nActive connections &gt; 0\n\n↓\n\nOnline\n</code></pre></div>\n<p>Presence often aggregates across all connections.</p>"
    },
    {
      "title": "14. Heartbeats",
      "diagram": null,
      "body": "<p>How does server know connection still exists?</p>\n<p>TCP doesn't immediately detect network loss.</p>\n<p>Solution:</p>\n<p>Heartbeat.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n\nPING\n\n↓\n\nServer\n\nPONG\n</code></pre></div>\n<p>or reverse.</p>\n<p>If heartbeat missing:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Disconnect\n</code></pre></div>"
    },
    {
      "title": "15. Half-open connections",
      "diagram": null,
      "body": "<p>Suppose laptop loses Wi-Fi.</p>\n<p>No TCP FIN.</p>\n<p>Server still thinks:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connected\n</code></pre></div>\n<p>Heartbeat timeout eventually removes stale connection.</p>\n<p>Without heartbeats:</p>\n<p>Memory leaks.</p>\n<p>Ghost users.</p>\n<p>Incorrect presence.</p>"
    },
    {
      "title": "16. Reconnection",
      "diagram": null,
      "body": "<p>Mobile users constantly switch:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wi-Fi\n\n↓\n\nCellular\n\n↓\n\nWi-Fi\n</code></pre></div>\n<p>Connections break.</p>\n<p>Client should:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reconnect\n\n↓\n\nAuthenticate\n\n↓\n\nResume subscriptions\n</code></pre></div>\n<p>Usually with exponential backoff.</p>"
    },
    {
      "title": "17. Reconnect storm",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<p>Power outage.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500,000 clients\n</code></pre></div>\n<p>lose connections simultaneously.</p>\n<p>Power returns.</p>\n<p>All reconnect immediately.</p>\n<p>Server sees:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500,000 handshakes\n</code></pre></div>\n<p>within seconds.</p>\n<p>Always add:</p>\n<ul>\n<li>random jitter</li>\n<li>exponential backoff</li>\n<li>connection rate limiting</li>\n</ul>"
    },
    {
      "title": "18. Sticky sessions",
      "diagram": null,
      "body": "<p>Suppose load balancer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n\n↓\n\nLB\n\n↓\n\nServer A\n</code></pre></div>\n<p>Connection established.</p>\n<p>Next packet:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>LB\n\n↓\n\nServer B\n</code></pre></div>\n<p>Impossible.</p>\n<p>A WebSocket stays attached to one backend.</p>\n<p>Solutions:</p>\n<ul>\n<li>sticky sessions</li>\n<li>consistent hashing</li>\n<li>connection-aware load balancer</li>\n</ul>"
    },
    {
      "title": "19. What if server dies?",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Server A\n</code></pre></div>\n<p>crashes.</p>\n<p>Every connected client disconnects.</p>\n<p>They reconnect:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>LB\n\n↓\n\nServer B\n\nServer C\n\nServer D\n</code></pre></div>\n<p>Your application must tolerate mass reconnects.</p>"
    },
    {
      "title": "20. Horizontal scaling",
      "diagram": null,
      "body": "<p>One server:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100,000 connections\n</code></pre></div>\n<p>Need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 million\n</code></pre></div>\n<p>Scale:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>LB\n\n↓\n\nServer A\n\nServer B\n\nServer C\n\n...\n\nServer J\n</code></pre></div>\n<p>Each owns its own active connections.</p>"
    },
    {
      "title": "21. Cross-server messaging",
      "diagram": null,
      "body": "<p>Problem:</p>\n<p>Alice connects to:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Server A\n</code></pre></div>\n<p>Bob connects to:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Server D\n</code></pre></div>\n<p>Alice sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Hello\n</code></pre></div>\n<p>Server A doesn't know Bob's connection.</p>\n<p>Need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Pub/Sub\n\n↓\n\nCross-server routing\n</code></pre></div>"
    },
    {
      "title": "22. Typical architecture",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>           Client\n\n              │\n\n        Load Balancer\n\n              │\n\n      ┌───────┼────────┐\n\n      ▼       ▼        ▼\n\n  WS A     WS B     WS C\n\n      │       │        │\n\n      └───────┼────────┘\n\n              ▼\n\n      Pub/Sub Broker\n</code></pre></div>\n<p>Message flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Alice\n\n↓\n\nWS A\n\n↓\n\nBroker\n\n↓\n\nWS C\n\n↓\n\nBob\n</code></pre></div>\n<p>The broker synchronizes servers.</p>"
    },
    {
      "title": "23. Chat room fan-out",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Room 123\n\n↓\n\n5,000 users\n</code></pre></div>\n<p>Message arrives.</p>\n<p>Need:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5,000 sends\n</code></pre></div>\n<p>Efficient fan-out becomes important.</p>\n<p>Some systems:</p>\n<ul>\n<li>push individually</li>\n</ul>\n<p>Others:</p>\n<ul>\n<li>multicast internally</li>\n</ul>\n<p>Others:</p>\n<ul>\n<li>partition room ownership</li>\n</ul>\n<p>Large chat rooms become scaling problems.</p>"
    },
    {
      "title": "24. Backpressure",
      "diagram": null,
      "body": "<p>Suppose client reads slowly.</p>\n<p>Server sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 MB/sec\n</code></pre></div>\n<p>Client consumes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 MB/sec\n</code></pre></div>\n<p>Outgoing buffer grows.</p>\n<p>Eventually:</p>\n<p>Memory explosion.</p>\n<p>Need:</p>\n<ul>\n<li>bounded buffers</li>\n<li>disconnect slow clients</li>\n<li>drop optional updates</li>\n<li>apply flow control</li>\n</ul>\n<p>Backpressure applies to WebSockets just like message queues.</p>"
    },
    {
      "title": "25. Message ordering",
      "diagram": null,
      "body": "<p>TCP guarantees ordered delivery <strong>within one connection</strong>.</p>\n<p>Across reconnects?</p>\n<p>No.</p>\n<p>Across multiple servers?</p>\n<p>No.</p>\n<p>Applications requiring ordering often include:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>sequenceNumber\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"sequence\": 105\n}\n</code></pre></div>\n<p>Client detects missing messages.</p>"
    },
    {
      "title": "26. Delivery guarantees",
      "diagram": null,
      "body": "<p>WebSockets provide:</p>\n<p>Reliable TCP transport.</p>\n<p>They do <strong>not</strong> provide:</p>\n<ul>\n<li>exactly-once delivery</li>\n<li>durable delivery</li>\n<li>replay</li>\n<li>acknowledgements</li>\n</ul>\n<p>Applications implement these if needed.</p>"
    },
    {
      "title": "27. Acknowledgements",
      "diagram": null,
      "body": "<p>Suppose server sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Message 105\n</code></pre></div>\n<p>Did client receive it?</p>\n<p>Maybe.</p>\n<p>Maybe not.</p>\n<p>Application-level ACK:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Server\n\n↓\n\n105\n\n↓\n\nClient\n\n↓\n\nACK 105\n</code></pre></div>\n<p>Without ACKs:</p>\n<p>Reconnect may lose messages.</p>"
    },
    {
      "title": "28. Offline users",
      "diagram": null,
      "body": "<p>Suppose Bob disconnects.</p>\n<p>Alice sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 messages\n</code></pre></div>\n<p>Where do they go?</p>\n<p>Options:</p>\n<h5>Discard</h5>\n<p>For live dashboards.</p>\n<h5>Persist</h5>\n<p>For chat.</p>\n<p>Architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Message\n\n↓\n\nDatabase\n\n↓\n\nDelivery when reconnecting\n</code></pre></div>\n<p>WebSocket is transport.</p>\n<p>Persistence is separate.</p>"
    },
    {
      "title": "29. Presence service",
      "diagram": null,
      "body": "<p>Production chat systems often maintain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>User\n\n↓\n\nActive Connections\n\n↓\n\nOnline?\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>User 42\n\n↓\n\nConn A\n\nConn B\n\nConn C\n</code></pre></div>\n<p>Last connection closes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Offline\n</code></pre></div>\n<p>Presence often becomes its own service.</p>"
    },
    {
      "title": "30. Broadcasting",
      "diagram": null,
      "body": "<p>Need to notify:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Everyone\n</code></pre></div>\n<p>Don't iterate every connection on every server.</p>\n<p>Instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Broker\n\n↓\n\nServers\n\n↓\n\nLocal connections\n</code></pre></div>\n<p>Each server only sends to clients it owns.</p>"
    },
    {
      "title": "31. WebSocket security",
      "diagram": null,
      "body": "<p>Never trust client messages.</p>\n<p>Validate:</p>\n<ul>\n<li>authorization</li>\n<li>message size</li>\n<li>rate limits</li>\n<li>schema</li>\n<li>permissions</li>\n</ul>\n<p>Attackers may keep thousands of idle connections.</p>\n<p>Connection limits matter.</p>"
    },
    {
      "title": "32. Rate limiting",
      "diagram": null,
      "body": "<p>Unlike HTTP:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Requests/sec\n</code></pre></div>\n<p>WebSocket also requires:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Messages/sec\n\nConnections/user\n\nConnections/IP\n\nSubscriptions/user\n</code></pre></div>\n<p>Otherwise attackers can overwhelm servers.</p>"
    },
    {
      "title": "33. Graceful shutdown",
      "diagram": null,
      "body": "<p>Deployment begins.</p>\n<p>Should server immediately terminate?</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Stop accepting new connections\n\n↓\n\nNotify clients\n\n↓\n\nWait\n\n↓\n\nClose sockets\n\n↓\n\nTerminate\n</code></pre></div>\n<p>Reduces reconnect storms.</p>"
    },
    {
      "title": "34. Spring Boot example",
      "diagram": null,
      "body": "<p>Configuration:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Configuration\n@EnableWebSocket\npublic class WebSocketConfig\n        implements WebSocketConfigurer {\n\n    @Override\n    public void registerWebSocketHandlers(\n            WebSocketHandlerRegistry registry) {\n\n        registry.addHandler(chatHandler(), \"/chat\");\n    }\n}\n</code></pre></div>\n<p>Handler:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Component\npublic class ChatHandler\n        extends TextWebSocketHandler {\n\n    @Override\n    public void handleTextMessage(\n            WebSocketSession session,\n            TextMessage message) {\n\n        // Validate\n        // Route\n        // Publish\n    }\n}\n</code></pre></div>\n<p>In production:</p>\n<p>Avoid keeping global state inside one JVM.</p>\n<p>Use shared infrastructure.</p>"
    },
    {
      "title": "35. Scaling Spring Boot",
      "diagram": null,
      "body": "<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>HashMap&lt;User, Session&gt;\n</code></pre></div>\n<p>inside one JVM.</p>\n<p>Scale to:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Multiple pods\n</code></pre></div>\n<p>Problem:</p>\n<p>One pod knows only its own users.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WebSocket Server\n\n↓\n\nBroker\n\n↓\n\nDistributed routing\n</code></pre></div>"
    },
    {
      "title": "36. AWS example",
      "diagram": null,
      "body": "<p>A common AWS architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Clients\n\n↓\n\nLoad Balancer\n\n↓\n\nEKS Pods\n\n↓\n\nRedis / Kafka / SNS\n\n↓\n\nOther Pods\n</code></pre></div>\n<p>Or managed services that maintain connection state for you.</p>\n<p>Notice how this resembles the architecture you explored when working with real-time messaging systems.</p>"
    },
    {
      "title": "37. Production incident",
      "diagram": null,
      "body": "<p>Chat deployment.</p>\n<p>Pods restarted.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>300,000 users\n</code></pre></div>\n<p>Reconnect instantly.</p>\n<p>Authentication service melts down.</p>\n<p>Root cause:</p>\n<p>No reconnect backoff.</p>\n<p>Fix:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reconnect after\n\n1s–5s random\n\n↓\n\nThen exponential backoff\n</code></pre></div>\n<p>Simple.</p>\n<p>Huge operational improvement.</p>"
    },
    {
      "title": "38. Interview question",
      "diagram": null,
      "body": "<p><strong>Why can't WebSocket servers simply store all sessions in memory?</strong></p>\n<p>Strong answer:</p>\n<div class=\"callout\">\n<p>Because horizontal scaling means different users connect to different server instances. One server only knows about its own connections. If Alice connects to Server A and Bob connects to Server C, Server A cannot directly send to Bob without some shared routing mechanism. Production systems therefore combine WebSocket servers with a shared broker or distributed session registry. Each server owns its local sockets while the broker distributes events across the cluster.</p>\n</div>"
    },
    {
      "title": "39. Common anti-patterns",
      "diagram": null,
      "body": "<h5>No heartbeat</h5>\n<p>Ghost connections accumulate.</p>\n\n<h5>No reconnect backoff</h5>\n<p>Reconnect storms.</p>\n\n<h5>Global in-memory session map</h5>\n<p>Fails after horizontal scaling.</p>\n\n<h5>No authentication refresh policy</h5>\n<p>Long-lived unauthorized sessions.</p>\n\n<h5>No backpressure</h5>\n<p>Memory exhaustion.</p>\n\n<h5>No persistence</h5>\n<p>Offline users lose messages unexpectedly.</p>\n\n<h5>Assuming one user = one connection</h5>\n<p>Multiple tabs and devices break logic.</p>\n\n<h5>No graceful shutdown</h5>\n<p>Deployments disconnect everyone simultaneously.</p>"
    },
    {
      "title": "40. Design exercise",
      "diagram": null,
      "body": "<p>Design a chat platform supporting:</p>\n<ul>\n<li>5 million concurrent users</li>\n<li>20 million daily users</li>\n<li>Multiple browser tabs</li>\n<li>Mobile devices</li>\n<li>Offline message delivery</li>\n<li>Typing indicators</li>\n<li>Read receipts</li>\n<li>Presence</li>\n<li>Group chat</li>\n<li>Deployments without mass disconnects</li>\n</ul>\n<p>Think through:</p>\n<ol>\n<li>How will connections be distributed?</li>\n<li>How will presence be tracked?</li>\n<li>How will messages reach users on different servers?</li>\n<li>Which data is transient vs persistent?</li>\n<li>How are reconnects handled?</li>\n<li>What happens if one WebSocket server crashes?</li>\n<li>How are slow clients managed?</li>\n<li>How are chat rooms partitioned?</li>\n<li>Which events need acknowledgements?</li>\n<li>How do you avoid reconnect storms?</li>\n</ol>"
    },
    {
      "title": "Key takeaways",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WebSocket\n    = long-lived bidirectional connection\n\nPersistent connections\n    = memory + socket resources\n\nScaling\n    = connection distribution problem\n\nAuthentication\n    = handshake + long-lived identity\n\nPresence\n    = aggregate of active connections\n\nHeartbeats\n    = detect dead peers\n\nReconnect\n    = expected\n\nReconnect storm\n    = operational hazard\n\nSticky sessions\n    = required for connection lifetime\n\nBroker\n    = routes cross-server messages\n\nBackpressure\n    = protect server memory\n\nWebSocket\n    = transport, not persistence\n\nOrdering\n    = only guaranteed within one TCP connection\n\nIdempotency\n    = still important after reconnects\n</code></pre></div>"
    },
    {
      "title": "Case Study: Building a Real-Time Trading Dashboard",
      "diagram": null,
      "body": "<p>Suppose you're building a dashboard showing live stock prices.</p>\n<p>Requirements:</p>\n<ul>\n<li>500,000 concurrent WebSocket connections.</li>\n<li>Price updates every 100 ms.</li>\n<li>Clients subscribe to different stock symbols.</li>\n<li>Missing one intermediate price update is acceptable; the latest price is what matters.</li>\n</ul>\n<p>A good architecture would be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Market Data Feed\n        │\n        ▼\nPrice Publisher\n        │\n        ▼\nPub/Sub Broker\n        │\n   ┌────┴────┐\n   ▼         ▼\nWS Server A  WS Server B\n   │         │\nClients    Clients\n</code></pre></div>\n<p>Each WebSocket server maintains only its local client connections. When a price update for <code class=\"inline-code\">RELIANCE</code> arrives, it is published once to the broker, and only servers with interested subscribers forward it to their connected clients.</p>\n<p>Notice an important design choice:</p>\n<ul>\n<li><strong>Stock prices</strong> are <em>ephemeral</em>. If one update is missed during a reconnect, sending the latest price is usually enough.</li>\n<li><strong>Chat messages</strong> are <em>durable</em>. Missing a message is unacceptable, so they must be stored and replayed after reconnect.</li>\n</ul>\n<p>Understanding whether your data is <strong>ephemeral state</strong> or <strong>durable business events</strong> is one of the most important architectural decisions when designing WebSocket systems.</p>\n<p>Tomorrow we'll cover <strong>Long Polling</strong>, why it existed before WebSockets, where it is still useful today, how it compares with WebSockets and Server-Sent Events, and the infrastructure trade-offs between the three approaches.</p>"
    }
  ],
  "keyTakeaways": [
    "Model user, device, session, and connection separately.",
    "Use heartbeats, bounded buffers, reconnect backoff, and graceful draining.",
    "Each node owns local sockets; a broker or routing layer connects users across nodes.",
    "WebSocket transport does not provide durability, replay, acknowledgements, or exactly-once effects.",
    "Differentiate ephemeral updates from durable messages that must be stored and replayed."
  ]
};
