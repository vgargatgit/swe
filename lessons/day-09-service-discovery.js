window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-09-service-discovery"] = {
  "day": 9,
  "title": "Service Discovery",
  "subtitle": "Map logical service names to changing instances without hardcoded IP addresses.",
  "tags": [
    "Service discovery",
    "DNS",
    "Registry",
    "Kubernetes Service",
    "Health",
    "Locality"
  ],
  "core": "In a distributed system, services must discover each other dynamically. Hardcoding IP addresses or hostnames is fundamentally incompatible with autoscaling, rolling deployments, self-healing, and cloud-native infrastructure.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Caller --> Name[Logical service name]\n  Name --> Discovery[DNS / Registry / Service]\n  Discovery --> A[Healthy instance A]\n  Discovery --> B[Healthy instance B]\n  Discovery --> C[Healthy instance C]\n  Discovery -. updates .-> Name",
      "body": "<p>If Kubernetes taught us that <strong>Pods are ephemeral</strong>, Service Discovery answers the obvious next question:</p>\n<div class=\"callout\">\n<p><strong>If Pods constantly change, how does one service ever find another?</strong></p>\n</div>\n<p>This topic is one of the foundations upon which Kubernetes, service meshes, API gateways, and microservices are built.</p>"
    },
    {
      "title": "1. The Problem",
      "diagram": null,
      "body": "<p>Imagine two services:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>User Service\n\n↓\n\nPayment Service\n</code></pre></div>\n<p>Initially:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment Service\n\n↓\n\n10.1.5.12\n</code></pre></div>\n<p>User Service configuration:</p>\n<div class=\"code-block\"><span class=\"code-label\">properties</span><pre><code>payment.host=10.1.5.12\n</code></pre></div>\n<p>Everything works.</p>\n<p>Then Kubernetes performs a rolling deployment.</p>\n<p>Old Pod dies.</p>\n<p>New Pod appears:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>10.1.8.31\n</code></pre></div>\n<p>User Service still calls:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>10.1.5.12\n</code></pre></div>\n<p>Result:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Connection Refused\n</code></pre></div>\n<p>This is why <strong>service discovery exists</strong>.</p>"
    },
    {
      "title": "2. Static Configuration Doesn't Scale",
      "diagram": null,
      "body": "<p>Suppose you have:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>10 services\n</code></pre></div>\n<p>Each service talks to:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>5 others\n</code></pre></div>\n<p>Hardcoded addresses:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>User\n\n↓\n\nPayment\n10.1.5.12\n\n↓\n\nWallet\n10.1.6.19\n\n↓\n\nNotification\n10.1.7.42\n</code></pre></div>\n<p>Now autoscaling begins.</p>\n<p>Pods appear and disappear.</p>\n<p>Every IP changes.</p>\n<p>Configuration becomes impossible.</p>"
    },
    {
      "title": "3. What Service Discovery Actually Does",
      "diagram": null,
      "body": "<p>Instead of asking:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Where is Payment Service?\n</code></pre></div>\n<p>Applications ask:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>How do I contact\npayment-service?\n</code></pre></div>\n<p>Some discovery mechanism answers:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Current healthy instances:\n\n10.1.8.31\n\n10.1.8.42\n\n10.1.9.14\n</code></pre></div>\n<p>Applications no longer care about IP addresses.</p>"
    },
    {
      "title": "4. Service Discovery vs DNS",
      "diagram": null,
      "body": "<p>Many developers think these are the same.</p>\n<p>DNS is often <strong>one implementation</strong> of service discovery.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Application\n\n↓\n\nLogical Service Name\n\n↓\n\nDiscovery\n\n↓\n\nActual Instance\n</code></pre></div>\n<p>DNS may provide that mapping.</p>\n<p>A registry may provide it.</p>\n<p>A service mesh may provide it.</p>"
    },
    {
      "title": "5. Two Major Models",
      "diagram": null,
      "body": "<p>There are two classic architectures.</p>\n<h4>Client-side discovery</h4>\n<p>Application asks registry.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Application\n\n↓\n\nRegistry\n\n↓\n\nInstance list\n\n↓\n\nApplication chooses instance\n</code></pre></div>\n<p>Examples:</p>\n<ul>\n<li>Netflix Eureka</li>\n<li>Consul</li>\n<li>ZooKeeper</li>\n</ul>\n<p>Client performs load balancing.</p>\n\n<h4>Server-side discovery</h4>\n<p>Application asks one endpoint.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Application\n\n↓\n\nLoad Balancer\n\n↓\n\nRegistry\n\n↓\n\nBackend\n</code></pre></div>\n<p>Client knows nothing.</p>\n<p>Examples:</p>\n<ul>\n<li>AWS ALB</li>\n<li>Kubernetes Service</li>\n<li>NGINX</li>\n</ul>\n<p>This is increasingly common.</p>"
    },
    {
      "title": "6. Client-Side Discovery",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>User Service\n\n↓\n\nEureka\n\n↓\n\nPayment instances\n\n↓\n\nChoose one\n\n↓\n\nCall directly\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>client controls load balancing</li>\n<li>lower hop count</li>\n<li>flexible algorithms</li>\n</ul>\n<p>Disadvantages:</p>\n<p>Every client must:</p>\n<ul>\n<li>know registry protocol</li>\n<li>implement discovery</li>\n<li>cache instances</li>\n<li>refresh periodically</li>\n</ul>\n<p>Operational complexity grows.</p>"
    },
    {
      "title": "7. Server-Side Discovery",
      "diagram": null,
      "body": "<p>Client simply calls:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n</code></pre></div>\n<p>Infrastructure handles everything.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>User Service\n\n↓\n\nKubernetes Service\n\n↓\n\nHealthy Pods\n</code></pre></div>\n<p>Much simpler for application developers.</p>"
    },
    {
      "title": "8. Service Registry",
      "diagram": null,
      "body": "<p>A registry stores:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment Service\n\n↓\n\nInstance A\n\n↓\n\nInstance B\n\n↓\n\nInstance C\n</code></pre></div>\n<p>Each entry usually includes:</p>\n<ul>\n<li>IP</li>\n<li>port</li>\n<li>health</li>\n<li>metadata</li>\n<li>zone</li>\n<li>version</li>\n<li>tags</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n\n10.1.4.5\n\n8080\n\nhealthy\n\nzone=us-east-1a\n\nversion=v2\n</code></pre></div>"
    },
    {
      "title": "9. Registration",
      "diagram": null,
      "body": "<p>When a service starts:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Spring Boot\n\n↓\n\nRegistry\n\n↓\n\nRegister me\n</code></pre></div>\n<p>Registry stores:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n\n↓\n\n10.1.8.31\n\n↓\n\nhealthy\n</code></pre></div>"
    },
    {
      "title": "10. Deregistration",
      "diagram": null,
      "body": "<p>When service shuts down:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>SIGTERM\n\n↓\n\nRegistry\n\n↓\n\nRemove instance\n</code></pre></div>\n<p>Clients stop sending traffic.</p>\n<p>Very important during deployments.</p>"
    },
    {
      "title": "11. Heartbeats",
      "diagram": null,
      "body": "<p>How does registry know service is alive?</p>\n<p>Heartbeat.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Every 30 seconds\n\n↓\n\nI'm alive\n</code></pre></div>\n<p>Miss enough heartbeats:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Remove instance\n</code></pre></div>"
    },
    {
      "title": "12. Health Checks",
      "diagram": null,
      "body": "<p>Better than heartbeats.</p>\n<p>Registry asks:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>GET /health\n</code></pre></div>\n<p>If:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>200 OK\n</code></pre></div>\n<p>Instance remains.</p>\n<p>Else:</p>\n<p>Removed.</p>"
    },
    {
      "title": "13. Kubernetes Service Discovery",
      "diagram": null,
      "body": "<p>Kubernetes avoids most explicit registration.</p>\n<p>Deployment:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment Pods\n</code></pre></div>\n<p>↓</p>\n<p>Service:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n</code></pre></div>\n<p>↓</p>\n<p>DNS automatically created:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service.default.svc.cluster.local\n</code></pre></div>\n<p>Application simply calls:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>http://payment-service\n</code></pre></div>\n<p>No registry client needed.</p>"
    },
    {
      "title": "14. How Kubernetes DNS Works",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n</code></pre></div>\n<p>Application requests:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n</code></pre></div>\n<p>DNS returns:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>ClusterIP\n</code></pre></div>\n<p>Service forwards to healthy Pods.</p>\n<p>Flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Application\n\n↓\n\nDNS\n\n↓\n\nService\n\n↓\n\nPod\n</code></pre></div>"
    },
    {
      "title": "15. ClusterIP Isn't a Pod",
      "diagram": null,
      "body": "<p>Common misconception.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Service\n\n↓\n\nClusterIP\n\n↓\n\nVirtual IP\n</code></pre></div>\n<p>It is not tied to one Pod.</p>\n<p>Instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>ClusterIP\n\n↓\n\niptables/IPVS\n\n↓\n\nCurrent Pods\n</code></pre></div>\n<p>Pods change.</p>\n<p>ClusterIP remains.</p>"
    },
    {
      "title": "16. kube-proxy",
      "diagram": null,
      "body": "<p>Every node runs:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>kube-proxy\n</code></pre></div>\n<p>Responsibilities:</p>\n<ul>\n<li>program networking rules</li>\n<li>route Service traffic</li>\n<li>load balance among Pods</li>\n</ul>\n<p>Applications never see this.</p>"
    },
    {
      "title": "17. Endpoint Objects",
      "diagram": null,
      "body": "<p>Every Service has endpoints.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n\n↓\n\n10.1.8.31\n\n10.1.8.42\n\n10.1.9.14\n</code></pre></div>\n<p>These change automatically as Pods change.</p>"
    },
    {
      "title": "18. DNS Caching",
      "diagram": null,
      "body": "<p>An overlooked production issue.</p>\n<p>Application:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Resolve payment-service\n</code></pre></div>\n<p>↓</p>\n<p>Caches answer.</p>\n<p>Pod changes.</p>\n<p>↓</p>\n<p>Application keeps old answer.</p>\n<p>Many HTTP clients cache DNS differently.</p>\n<p>Examples:</p>\n<ul>\n<li>JVM</li>\n<li>Go</li>\n<li>Node.js</li>\n</ul>\n<p>DNS TTL matters.</p>"
    },
    {
      "title": "19. JVM DNS Cache",
      "diagram": null,
      "body": "<p>Java historically cached DNS aggressively.</p>\n<p>Sometimes:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Forever\n</code></pre></div>\n<p>Depending on configuration.</p>\n<p>Danger:</p>\n<p>Rolling deployment.</p>\n<p>↓</p>\n<p>Old IP cached.</p>\n<p>↓</p>\n<p>Requests fail.</p>\n<p>Modern JVMs and Kubernetes deployments generally avoid infinite caching, but this still deserves attention.</p>"
    },
    {
      "title": "20. Service Discovery and Load Balancing",
      "diagram": null,
      "body": "<p>Discovery answers:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Who exists?\n</code></pre></div>\n<p>Load balancing answers:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Which one should receive this request?\n</code></pre></div>\n<p>They solve different problems.</p>"
    },
    {
      "title": "21. Zones and Locality",
      "diagram": null,
      "body": "<p>Suppose AWS:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>AZ1\n\nAZ2\n\nAZ3\n</code></pre></div>\n<p>Registry knows:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment A\n\nAZ1\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment B\n\nAZ2\n</code></pre></div>\n<p>Client in AZ1 may prefer AZ1.</p>\n<p>Benefits:</p>\n<ul>\n<li>lower latency</li>\n<li>lower cross-AZ cost</li>\n</ul>"
    },
    {
      "title": "22. Metadata",
      "diagram": null,
      "body": "<p>Registry may store:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Version\n\nRegion\n\nZone\n\nEnvironment\n\nCapabilities\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n\nversion=v2\n\nregion=india\n\ntenant=premium\n</code></pre></div>\n<p>Allows sophisticated routing.</p>"
    },
    {
      "title": "23. Version-Aware Discovery",
      "diagram": null,
      "body": "<p>Suppose deployment:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>v1\n\nv2\n</code></pre></div>\n<p>Registry knows:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment\n\n↓\n\nv1\n\n↓\n\nv2\n</code></pre></div>\n<p>Gateway may request:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Only v2\n</code></pre></div>\n<p>Useful for:</p>\n<ul>\n<li>canary</li>\n<li>blue-green</li>\n<li>A/B testing</li>\n</ul>"
    },
    {
      "title": "24. Service Mesh Integration",
      "diagram": null,
      "body": "<p>Later we'll study service meshes.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Application\n\n↓\n\nSidecar\n\n↓\n\nDiscovery\n\n↓\n\nConnection\n</code></pre></div>\n<p>Application no longer performs discovery itself.</p>"
    },
    {
      "title": "25. External Services",
      "diagram": null,
      "body": "<p>Not everything runs in Kubernetes.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Spring Boot\n\n↓\n\nAWS RDS\n</code></pre></div>\n<p>or</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Stripe\n\n↓\n\nOpenAI\n\n↓\n\nSMTP\n</code></pre></div>\n<p>These still need discovery.</p>\n<p>Usually:</p>\n<ul>\n<li>DNS</li>\n<li>configuration</li>\n<li>service entries</li>\n</ul>\n<p>depending on platform.</p>"
    },
    {
      "title": "26. Failure Modes",
      "diagram": null,
      "body": "<h4>Registry unavailable</h4>\n<p>Question:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Can applications still communicate?\n</code></pre></div>\n<p>Most clients cache known instances.</p>\n<p>Temporary registry outage doesn't necessarily break traffic.</p>\n\n<h4>Stale registry</h4>\n<p>Registry says:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Healthy\n</code></pre></div>\n<p>Reality:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Dead\n</code></pre></div>\n<p>Requests fail.</p>\n<p>Health checking quality matters.</p>\n\n<h4>Split brain</h4>\n<p>Two registries disagree.</p>\n<p>Different clients receive different instance lists.</p>\n<p>Can lead to inconsistent routing.</p>"
    },
    {
      "title": "27. Eureka",
      "diagram": null,
      "body": "<p>Netflix Eureka became popular before Kubernetes.</p>\n<p>Flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment\n\n↓\n\nRegister\n\n↓\n\nEureka\n</code></pre></div>\n<p>Client:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Ask Eureka\n\n↓\n\nReceive instances\n\n↓\n\nChoose instance\n</code></pre></div>\n<p>Spring Cloud integrates well.</p>\n<p>Less common in Kubernetes-native systems.</p>"
    },
    {
      "title": "28. Consul",
      "diagram": null,
      "body": "<p>Consul provides:</p>\n<ul>\n<li>service discovery</li>\n<li>health checks</li>\n<li>KV store</li>\n<li>service mesh integration</li>\n</ul>\n<p>Useful outside Kubernetes too.</p>"
    },
    {
      "title": "29. ZooKeeper",
      "diagram": null,
      "body": "<p>Originally popular for:</p>\n<ul>\n<li>coordination</li>\n<li>leader election</li>\n<li>discovery</li>\n</ul>\n<p>Less common today purely for service discovery.</p>"
    },
    {
      "title": "30. Cloud-Native Approach",
      "diagram": null,
      "body": "<p>Modern Kubernetes applications often need no registry client.</p>\n<p>Simply:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>RestClient.create(\"http://payment-service\")\n</code></pre></div>\n<p>DNS + Services handle everything.</p>\n<p>Huge simplification.</p>"
    },
    {
      "title": "31. Common Production Mistakes",
      "diagram": null,
      "body": "<h5>❌ Hardcoding Pod IPs</h5>\n<p>Pods are temporary.</p>\n\n<h5>❌ Infinite DNS cache</h5>\n<p>Rolling deployments break.</p>\n\n<h5>❌ No health checks</h5>\n<p>Dead instances remain discoverable.</p>\n\n<h5>❌ Treating discovery as load balancing</h5>\n<p>Different concerns.</p>\n\n<h5>❌ Ignoring locality</h5>\n<p>Cross-region traffic becomes expensive.</p>\n\n<h5>❌ Manual registration</h5>\n<p>Automation should handle lifecycle.</p>"
    },
    {
      "title": "32. Real AWS Example",
      "diagram": null,
      "body": "<p>Suppose your architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>AWS ALB\n\n↓\n\nNGINX\n\n↓\n\nSpring Boot\n\n↓\n\nRedis\n\n↓\n\nMySQL\n</code></pre></div>\n<p>External clients discover:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>api.example.com\n</code></pre></div>\n<p>via public DNS.</p>\n<p>Internally:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n\n↓\n\nCluster DNS\n\n↓\n\nPods\n</code></pre></div>\n<p>External:</p>\n<p>DNS.</p>\n<p>Internal:</p>\n<p>Kubernetes Services.</p>"
    },
    {
      "title": "33. Interview Discussion",
      "diagram": null,
      "body": "<h5>Why not use IP addresses?</h5>\n<p>Because:</p>\n<ul>\n<li>Pods restart</li>\n<li>autoscaling</li>\n<li>deployments</li>\n<li>failures</li>\n<li>cloud networking</li>\n</ul>\n<p>IPs are ephemeral.</p>\n\n<h5>Why DNS instead of registry client?</h5>\n<p>Simpler.</p>\n<p>Built into Kubernetes.</p>\n<p>Language independent.</p>\n\n<h5>Difference between Service and Deployment?</h5>\n<p>Deployment:</p>\n<p>Manages Pods.</p>\n<p>Service:</p>\n<p>Provides stable networking.</p>\n\n<h5>Does Service perform load balancing?</h5>\n<p>Yes.</p>\n<p>Among healthy endpoints.</p>\n<p>But discovery and load balancing remain conceptually separate.</p>"
    },
    {
      "title": "34. Practical Exercise",
      "diagram": null,
      "body": "<p>Design service discovery for a payment platform with:</p>\n<ul>\n<li>User Service</li>\n<li>Wallet Service</li>\n<li>Payment Service</li>\n<li>Notification Service</li>\n<li>Redis</li>\n<li>PostgreSQL</li>\n<li>Kafka</li>\n</ul>\n<p>Questions:</p>\n<ol>\n<li>Which components need Kubernetes Services?</li>\n<li>Which should use ClusterIP?</li>\n<li>Which should be externally exposed?</li>\n<li>How would Payment discover Wallet?</li>\n<li>How would you perform a rolling deployment without breaking service discovery?</li>\n<li>How would you avoid stale DNS caching in a Java application?</li>\n<li>How would you prefer same-AZ instances when possible?</li>\n<li>What happens if one node fails?</li>\n<li>How would service discovery differ if you were running directly on EC2 without Kubernetes?</li>\n<li>At what scale or architectural point would you consider introducing a service mesh?</li>\n</ol>"
    },
    {
      "title": "35. Key Takeaways",
      "diagram": null,
      "body": "<p>Keep these mental models:</p>\n<table>\n<thead>\n<tr>\n<th>Concept</th>\n<th>Mental Model</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Service Discovery</td>\n<td>\"Where is the service right now?\"</td>\n</tr>\n<tr>\n<td>Service Registry</td>\n<td>Directory of live service instances</td>\n</tr>\n<tr>\n<td>DNS</td>\n<td>One mechanism for implementing discovery</td>\n</tr>\n<tr>\n<td>Kubernetes Service</td>\n<td>Stable virtual endpoint for changing Pods</td>\n</tr>\n<tr>\n<td>Deployment</td>\n<td>Creates and replaces Pods</td>\n</tr>\n<tr>\n<td>Service</td>\n<td>Makes Pods discoverable</td>\n</tr>\n<tr>\n<td>kube-proxy</td>\n<td>Routes Service traffic to healthy Pods</td>\n</tr>\n<tr>\n<td>Registry</td>\n<td>Knows <em>who exists</em></td>\n</tr>\n<tr>\n<td>Load Balancer</td>\n<td>Decides <em>who receives this request</em></td>\n</tr>\n</tbody>\n</table>\n<p>The most important distinction to remember is:</p>\n<div class=\"callout\">\n<p><strong>Service Discovery answers \"Where can I find the service?\" Load Balancing answers \"Which healthy instance should I send this request to?\"</strong></p>\n</div>\n<p>Tomorrow we'll cover <strong>Circuit Breakers</strong>, one of the most important resilience patterns in distributed systems. We'll explore cascading failures, failure isolation, half-open states, retry interaction, timeout coordination, and practical implementations using libraries like Resilience4j in Spring Boot.</p>"
    }
  ],
  "keyTakeaways": [
    "Discovery answers where a service exists; load balancing chooses an instance.",
    "Prefer stable logical names over hardcoded IP addresses.",
    "Health, deregistration, DNS caching, and locality determine whether discovery stays accurate.",
    "Cache known instances carefully so a registry outage does not instantly stop traffic.",
    "Use the platform-native mechanism unless a separate registry solves a real requirement."
  ]
};
