window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-05-api-gateways"] = {
  "day": 5,
  "title": "API Gateways",
  "subtitle": "Centralized API policy for authentication, quotas, validation, versioning, and routing.",
  "tags": [
    "API gateway",
    "Authentication",
    "Rate limits",
    "BFF",
    "Versioning",
    "Routing"
  ],
  "core": "An API Gateway is the policy enforcement point for APIs. While a reverse proxy forwards traffic, an API Gateway understands that it is dealing with APIs and can apply business-aware policies such as authentication, quotas, versioning, transformation, and aggregation.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Client --> GW[API Gateway]\n  GW --> Policy[Auth / limits / validation]\n  GW --> User[User Service]\n  GW --> Order[Order Service]\n  GW --> Payment[Payment Service]",
      "body": "<p>A useful mental model is:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Load Balancer\n    ↓\n\"Which server should receive this request?\"\n\nReverse Proxy\n    ↓\n\"How should this request be forwarded?\"\n\nAPI Gateway\n    ↓\n\"Should this API request be allowed, transformed, authenticated,\nlimited, logged, versioned, or rejected?\"\n</code></pre></div>"
    },
    {
      "title": "1. Why API Gateways Exist",
      "diagram": null,
      "body": "<p>Imagine you have a microservice architecture.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>                Internet\n\n                    |\n\n                Mobile App\n\n                    |\n\n         -----------------------\n\n         |     ???            |\n\n         -----------------------\n\n        /      |        |      \\\n\n User   Order Payment Notification\nService Service Service   Service\n</code></pre></div>\n<p>Without a gateway, the client must know:</p>\n<ul>\n<li>every service URL</li>\n<li>authentication for every service</li>\n<li>version of every service</li>\n<li>retries</li>\n<li>rate limits</li>\n<li>API contracts</li>\n</ul>\n<p>That quickly becomes unmanageable.</p>\n<p>Instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>                Client\n\n                  |\n\n            API Gateway\n\n      /        |        \\\n\n User     Order     Payment\n</code></pre></div>\n<p>The client only knows one endpoint.</p>"
    },
    {
      "title": "2. Reverse Proxy vs API Gateway",
      "diagram": null,
      "body": "<p>This distinction is important.</p>\n<h4>Reverse Proxy</h4>\n<p>Concerned with transport.</p>\n<p>Examples:</p>\n<ul>\n<li>TLS</li>\n<li>compression</li>\n<li>buffering</li>\n<li>proxying</li>\n<li>connection reuse</li>\n</ul>\n<p>It generally does not understand business semantics.</p>\n\n<h4>API Gateway</h4>\n<p>Concerned with APIs.</p>\n<p>Examples:</p>\n<ul>\n<li>JWT validation</li>\n<li>API keys</li>\n<li>quotas</li>\n<li>request transformation</li>\n<li>versioning</li>\n<li>analytics</li>\n<li>monetization</li>\n<li>developer portal</li>\n</ul>\n<p>Many gateways internally use reverse proxy technology (for example, Envoy or NGINX), but expose higher-level API features.</p>"
    },
    {
      "title": "3. Where Does the Gateway Sit?",
      "diagram": null,
      "body": "<p>Typical architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Internet\n\n↓\n\nCloudFront\n\n↓\n\nWAF\n\n↓\n\nLoad Balancer\n\n↓\n\nAPI Gateway\n\n↓\n\nServices\n</code></pre></div>\n<p>Sometimes the gateway itself performs load balancing.</p>\n<p>In Kubernetes:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Internet\n\n↓\n\nIngress\n\n↓\n\nGateway\n\n↓\n\nPods\n</code></pre></div>"
    },
    {
      "title": "4. Common API Gateways",
      "diagram": null,
      "body": "<p>Commercial:</p>\n<ul>\n<li>Kong Enterprise</li>\n<li>Apigee</li>\n<li>MuleSoft</li>\n<li>IBM API Connect</li>\n</ul>\n<p>Cloud:</p>\n<ul>\n<li>AWS API Gateway</li>\n<li>Azure API Management</li>\n<li>Google API Gateway</li>\n</ul>\n<p>Open Source:</p>\n<ul>\n<li>Kong</li>\n<li>Apache APISIX</li>\n<li>KrakenD</li>\n<li>Spring Cloud Gateway</li>\n<li>Envoy Gateway</li>\n</ul>"
    },
    {
      "title": "5. Core Responsibilities",
      "diagram": null,
      "body": "<p>A gateway commonly performs:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Receive request\n\n↓\n\nAuthenticate\n\n↓\n\nAuthorize\n\n↓\n\nRate limit\n\n↓\n\nValidate\n\n↓\n\nTransform\n\n↓\n\nRoute\n\n↓\n\nObserve\n\n↓\n\nForward\n</code></pre></div>\n<p>Notice how many infrastructure concerns disappear from backend services.</p>"
    },
    {
      "title": "6. Authentication",
      "diagram": null,
      "body": "<p>Instead of every service validating JWTs:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Client\n\n↓\n\nGateway\n\n↓\n\nJWT validation\n\n↓\n\nForward authenticated request\n</code></pre></div>\n<p>Backend services receive:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>User ID\n\nTenant ID\n\nRoles\n\nScopes\n</code></pre></div>\n<p>Often via headers.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>X-User-Id\n\nX-Tenant-Id\n\nX-Roles\n</code></pre></div>\n\n<h4>Trust Boundary</h4>\n<p>This creates an important rule:</p>\n<p>Backend services must <strong>only</strong> trust these headers when requests originate from the gateway.</p>\n<p>Never expose services directly to the Internet.</p>\n<p>Otherwise an attacker could send:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>X-User-Id: admin\n</code></pre></div>"
    },
    {
      "title": "7. Authorization",
      "diagram": null,
      "body": "<p>Authentication answers:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Who are you?\n</code></pre></div>\n<p>Authorization answers:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>What are you allowed to do?\n</code></pre></div>\n<p>Gateway may reject:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>DELETE /users\n\n↓\n\n403 Forbidden\n</code></pre></div>\n<p>before backend sees the request.</p>"
    },
    {
      "title": "8. API Keys",
      "diagram": null,
      "body": "<p>Public APIs often use:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>X-API-Key\n</code></pre></div>\n<p>Gateway:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Lookup key\n\n↓\n\nDetermine customer\n\n↓\n\nApply quota\n\n↓\n\nForward request\n</code></pre></div>\n<p>Backend doesn't care.</p>"
    },
    {
      "title": "9. Rate Limiting",
      "diagram": null,
      "body": "<p>We covered rate limiting in Day 1.</p>\n<p>Gateway is often the ideal place.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Free plan\n\n↓\n\n100 req/min\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Pro plan\n\n↓\n\n1000 req/min\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Enterprise\n\n↓\n\nUnlimited\n</code></pre></div>\n<p>The gateway knows customer plans.</p>"
    },
    {
      "title": "10. Quotas",
      "diagram": null,
      "body": "<p>Different from rate limits.</p>\n<p>Rate:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>100/minute\n</code></pre></div>\n<p>Quota:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>1 million/month\n</code></pre></div>\n<p>Gateway tracks long-term consumption.</p>\n<p>Useful for:</p>\n<ul>\n<li>billing</li>\n<li>SaaS</li>\n<li>developer APIs</li>\n</ul>"
    },
    {
      "title": "11. Request Validation",
      "diagram": null,
      "body": "<p>Suppose API expects:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>POST /users\n\n{\n   email\n}\n</code></pre></div>\n<p>Gateway validates:</p>\n<ul>\n<li>JSON syntax</li>\n<li>required fields</li>\n<li>schema</li>\n<li>content type</li>\n</ul>\n<p>Bad requests never reach backend.</p>"
    },
    {
      "title": "12. Request Transformation",
      "diagram": null,
      "body": "<p>Suppose legacy backend expects:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>customerId\n</code></pre></div>\n<p>New API uses:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>userId\n</code></pre></div>\n<p>Gateway transforms.</p>\n<p>Client:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>userId\n</code></pre></div>\n<p>Backend receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>customerId\n</code></pre></div>\n<p>Allows backend migration without breaking clients.</p>"
    },
    {
      "title": "13. Response Transformation",
      "diagram": null,
      "body": "<p>Backend returns:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>internalStatus\n</code></pre></div>\n<p>Gateway converts:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>status\n</code></pre></div>\n<p>Or removes internal fields.</p>\n<p>Useful during API evolution.</p>"
    },
    {
      "title": "14. Service Aggregation",
      "diagram": null,
      "body": "<p>Without gateway:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Client\n\n↓\n\nUser Service\n\n↓\n\nOrder Service\n\n↓\n\nRecommendation Service\n</code></pre></div>\n<p>Three round trips.</p>\n<p>Gateway can aggregate:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Client\n\n↓\n\nGateway\n\n↓\n\nUser\n\nOrder\n\nRecommendation\n\n↓\n\nCombined response\n</code></pre></div>\n<p>Reduces mobile latency.</p>"
    },
    {
      "title": "15. Backend For Frontend (BFF)",
      "diagram": null,
      "body": "<p>Different clients need different APIs.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Mobile\n\n↓\n\nGateway-Mobile\n\n↓\n\nServices\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Web\n\n↓\n\nGateway-Web\n\n↓\n\nServices\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Partner\n\n↓\n\nGateway-Partner\n\n↓\n\nServices\n</code></pre></div>\n<p>Each client gets optimized responses.</p>\n<p>Very common.</p>"
    },
    {
      "title": "16. API Versioning",
      "diagram": null,
      "body": "<p>Gateway can expose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>/v1/products\n\n↓\n\nOld service\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>/v2/products\n\n↓\n\nNew service\n</code></pre></div>\n<p>Clients migrate gradually.</p>"
    },
    {
      "title": "17. Canary Releases",
      "diagram": null,
      "body": "<p>Gateway routes traffic.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>95%\n\n↓\n\nVersion 1\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>5%\n\n↓\n\nVersion 2\n</code></pre></div>\n<p>Increase gradually.</p>\n<p>Excellent for deployments.</p>"
    },
    {
      "title": "18. Header-Based Routing",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>X-Beta: true\n\n↓\n\nNew backend\n</code></pre></div>\n<p>Useful for internal testing.</p>"
    },
    {
      "title": "19. Geographic Routing",
      "diagram": null,
      "body": "<p>Gateway can route:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>India\n\n↓\n\nMumbai cluster\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Europe\n\n↓\n\nFrankfurt cluster\n</code></pre></div>\n<p>Improves latency.</p>"
    },
    {
      "title": "20. Observability",
      "diagram": null,
      "body": "<p>Gateway sees every request.</p>\n<p>Metrics:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Requests/sec\n\nLatency\n\nStatus codes\n\nAPI popularity\n\nCustomer usage\n\nAuthentication failures\n\nQuota violations\n\nRate limit violations\n</code></pre></div>\n<p>Very valuable.</p>"
    },
    {
      "title": "21. API Analytics",
      "diagram": null,
      "body": "<p>Example dashboard:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Top APIs\n\nTop customers\n\nAverage latency\n\nError rates\n\nDaily usage\n\nMonthly usage\n</code></pre></div>\n<p>Many commercial gateways provide this out of the box.</p>"
    },
    {
      "title": "22. Caching",
      "diagram": null,
      "body": "<p>Gateway may cache:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>GET /countries\n\n↓\n\nCached\n\n↓\n\nBackend skipped\n</code></pre></div>\n<p>Useful for:</p>\n<ul>\n<li>metadata</li>\n<li>reference APIs</li>\n<li>documentation</li>\n</ul>\n<p>Avoid caching highly personalized responses.</p>"
    },
    {
      "title": "23. Circuit Breaking",
      "diagram": null,
      "body": "<p>Gateway may detect:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment Service\n\n↓\n\nRepeated failures\n</code></pre></div>\n<p>Stop forwarding.</p>\n<p>Return:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>503\n</code></pre></div>\n<p>Protects the rest of the system.</p>\n<p>We'll study circuit breakers in detail later.</p>"
    },
    {
      "title": "24. Timeouts",
      "diagram": null,
      "body": "<p>Gateway should never wait forever.</p>\n<p>Different APIs deserve different timeout budgets.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Search\n\n2 seconds\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Export\n\n60 seconds\n</code></pre></div>\n<p>Timeout configuration should reflect expected workload.</p>"
    },
    {
      "title": "25. Retry Policies",
      "diagram": null,
      "body": "<p>Gateway may retry</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>GET\n</code></pre></div>\n<p>after connection failures.</p>\n<p>Be cautious with:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>POST\nPUT\nPATCH\nDELETE\n</code></pre></div>\n<p>Unless APIs are idempotent.</p>"
    },
    {
      "title": "26. WebSockets",
      "diagram": null,
      "body": "<p>Not every gateway supports WebSockets equally.</p>\n<p>Need:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Upgrade\n\nConnection\n\nPersistent TCP\n</code></pre></div>\n<p>Always verify support before choosing a gateway.</p>"
    },
    {
      "title": "27. Streaming APIs",
      "diagram": null,
      "body": "<p>Gateways must also support:</p>\n<ul>\n<li>Server-Sent Events</li>\n<li>gRPC</li>\n<li>HTTP/2 streaming</li>\n</ul>\n<p>Otherwise buffering can break streaming behavior.</p>"
    },
    {
      "title": "28. Multi-Tenant SaaS",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Tenant A\n\n↓\n\n100 users\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Tenant B\n\n↓\n\n20,000 users\n</code></pre></div>\n<p>Gateway can enforce:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Tenant quota\n\n↓\n\nPrevent noisy neighbor\n</code></pre></div>\n<p>Backend services remain simpler.</p>"
    },
    {
      "title": "29. Gateway Failure",
      "diagram": null,
      "body": "<p>The gateway is now critical infrastructure.</p>\n<p>Need:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>LB\n\n↓\n\nGateway 1\n\nGateway 2\n\nGateway 3\n</code></pre></div>\n<p>Stateless deployment.</p>"
    },
    {
      "title": "30. Configuration Management",
      "diagram": null,
      "body": "<p>Large gateways often have hundreds of routes.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>500 APIs\n\n↓\n\nPolicies\n\n↓\n\nAuthentication\n\n↓\n\nLimits\n\n↓\n\nTransforms\n</code></pre></div>\n<p>Configuration should be:</p>\n<ul>\n<li>version controlled</li>\n<li>tested</li>\n<li>reviewed</li>\n<li>deployed via CI/CD</li>\n</ul>\n<p>Treat gateway configuration as code.</p>"
    },
    {
      "title": "31. Spring Cloud Gateway Example",
      "diagram": null,
      "body": "<p>Route:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>spring:\n  cloud:\n    gateway:\n      routes:\n        - id: user-service\n          uri: http://user-service\n          predicates:\n            - Path=/users/**\n</code></pre></div>\n<p>Filters:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>filters:\n  - AddRequestHeader=X-Gateway, SpringGateway\n</code></pre></div>\n<p>Rate limiting:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>filters:\n  - RequestRateLimiter\n</code></pre></div>\n<p>Authentication:</p>\n<p>Usually via Spring Security filters before routing.</p>"
    },
    {
      "title": "32. AWS API Gateway",
      "diagram": null,
      "body": "<p>Strengths:</p>\n<ul>\n<li>Serverless integration</li>\n<li>Lambda integration</li>\n<li>Usage plans</li>\n<li>API keys</li>\n<li>Authorizers</li>\n<li>Request validation</li>\n<li>Throttling</li>\n<li>Stage variables</li>\n</ul>\n<p>Excellent for:</p>\n<ul>\n<li>public APIs</li>\n<li>serverless systems</li>\n</ul>\n<p>Less attractive for extremely high-throughput, low-latency internal service meshes where self-managed gateways like Envoy or Kong are common.</p>"
    },
    {
      "title": "33. Common Production Mistakes",
      "diagram": null,
      "body": "<h5>❌ Putting business logic into the gateway</h5>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Discount calculations\n\nOrder validation\n\nInventory allocation\n</code></pre></div>\n<p>Don't.</p>\n<p>Gateway handles infrastructure concerns.</p>\n<p>Business logic belongs in services.</p>\n\n<h5>❌ Gateway becoming a monolith</h5>\n<p>Hundreds of custom scripts.</p>\n<p>Thousands of rules.</p>\n<p>Eventually impossible to maintain.</p>\n\n<h5>❌ Trusting gateway headers externally</h5>\n<p>Never expose backend services directly.</p>\n\n<h5>❌ Retrying non-idempotent APIs</h5>\n<p>Duplicate payments.</p>\n<p>Duplicate orders.</p>\n<p>Duplicate emails.</p>\n\n<h5>❌ Too many transformations</h5>\n<p>Debugging becomes difficult.</p>\n<p>Keep transformations simple.</p>"
    },
    {
      "title": "34. Gateway vs Service Mesh",
      "diagram": null,
      "body": "<p>Another common interview topic.</p>\n<p>Gateway:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>North-South traffic\n\nInternet\n\n↓\n\nServices\n</code></pre></div>\n<p>Service Mesh:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>East-West traffic\n\nService A\n\n↓\n\nService B\n\n↓\n\nService C\n</code></pre></div>\n<p>Gateway protects the edge.</p>\n<p>Mesh manages service-to-service communication.</p>\n<p>We'll revisit service meshes in the Kubernetes and Service Discovery lessons.</p>"
    },
    {
      "title": "35. Real-World Architecture",
      "diagram": null,
      "body": "<p>A production SaaS application might look like:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Client\n\n↓\n\nCloudFront\n\n↓\n\nAWS WAF\n\n↓\n\nApplication Load Balancer\n\n↓\n\nAPI Gateway\n\n↓\n\nAuth Service\n\nUser Service\n\nPayment Service\n\nSearch Service\n\nNotification Service\n</code></pre></div>\n<p>Gateway responsibilities:</p>\n<ul>\n<li>JWT validation</li>\n<li>API keys</li>\n<li>rate limiting</li>\n<li>quotas</li>\n<li>request IDs</li>\n<li>logging</li>\n<li>API version routing</li>\n<li>request validation</li>\n</ul>\n<p>Services focus only on domain logic.</p>"
    },
    {
      "title": "36. Interview-Style Answer",
      "diagram": null,
      "body": "<p><strong>Question:</strong> <em>Why would you introduce an API Gateway instead of letting clients call microservices directly?</em></p>\n<p>A strong answer would be:</p>\n<div class=\"callout\">\n<p>An API Gateway provides a single entry point for clients and centralizes cross-cutting concerns such as authentication, authorization, rate limiting, quotas, request validation, API versioning, request and response transformation, observability, and routing. It reduces client complexity, prevents duplication of infrastructure logic across services, enables gradual API evolution, and allows backend services to focus on business functionality rather than edge concerns. The gateway should remain lightweight and avoid implementing business logic.</p>\n</div>"
    },
    {
      "title": "37. Practical Exercise",
      "diagram": null,
      "body": "<p>Design an API Gateway for a payment platform exposing these services:</p>\n<ul>\n<li>User Service</li>\n<li>Wallet Service</li>\n<li>Payment Service</li>\n<li>Transaction History Service</li>\n<li>Notification Service</li>\n</ul>\n<p>Requirements:</p>\n<ul>\n<li>Mobile apps</li>\n<li>Web frontend</li>\n<li>Third-party partner APIs</li>\n<li>Internal admin portal</li>\n</ul>\n<p>Design:</p>\n<ol>\n<li>Authentication strategy for each client type.</li>\n<li>Rate limits for free vs premium partners.</li>\n<li>Which APIs should be aggregated?</li>\n<li>Where should JWT validation occur?</li>\n<li>Which transformations belong in the gateway?</li>\n<li>Which responsibilities should remain inside the services?</li>\n<li>How would you expose <code class=\"inline-code\">/v1</code> and <code class=\"inline-code\">/v2</code> simultaneously during a migration?</li>\n<li>Which metrics would you monitor at the gateway versus within the backend services?</li>\n</ol>"
    },
    {
      "title": "Key Takeaways",
      "diagram": null,
      "body": "<p>Remember these distinctions:</p>\n<table>\n<thead>\n<tr>\n<th>Component</th>\n<th>Primary Responsibility</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><strong>Load Balancer</strong></td>\n<td>Distribute traffic across healthy instances</td>\n</tr>\n<tr>\n<td><strong>Reverse Proxy</strong></td>\n<td>Forward traffic and handle transport-level concerns (TLS, compression, buffering, static content)</td>\n</tr>\n<tr>\n<td><strong>API Gateway</strong></td>\n<td>Apply API-specific policies (authentication, quotas, routing, transformation, versioning)</td>\n</tr>\n<tr>\n<td><strong>Service Mesh</strong></td>\n<td>Manage service-to-service communication inside the platform</td>\n</tr>\n</tbody>\n</table>\n<p>Understanding where one responsibility ends and another begins is one of the hallmarks of a strong backend and systems engineer.</p>\n<p>Tomorrow's topic: <strong>CI/CD</strong>, where we'll explore how mature engineering teams move code from a developer's laptop to production safely, repeatedly, and with minimal downtime.</p>"
    }
  ],
  "keyTakeaways": [
    "Keep the gateway focused on cross-cutting API policy, not domain business logic.",
    "Backends may trust gateway-established identity only when they cannot be reached around the gateway.",
    "Make rate limits, quotas, validation, versioning, and route configuration reviewable as code.",
    "Avoid retrying non-idempotent operations without end-to-end protection.",
    "Scale and observe the gateway as critical shared infrastructure."
  ]
};
