window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-13-exponential-backoff"] = {
  "day": 13,
  "title": "Exponential Backoff",
  "subtitle": "Spread retries over time using capped exponential delays and jitter to avoid retry storms.",
  "tags": [
    "Exponential backoff",
    "Jitter",
    "Retry-After",
    "Reconnects",
    "Recovery storm",
    "Retry budget"
  ],
  "core": "When a dependency fails, retrying immediately is usually the worst possible response. Exponential backoff progressively increases the delay between attempts, giving the failing system time to recover and reducing retry-generated load.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  F1[Attempt 1 fails] --> J1[Random delay within cap 1]\n  J1 --> F2[Attempt 2 fails]\n  F2 --> J2[Random delay within larger cap]\n  J2 --> F3[Attempt 3]\n  J2 -. capped .-> Max[Maximum delay]",
      "body": "<p>Yesterday we established that a retry should happen only when:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Failure is transient\n        +\nOperation is safe to repeat\n        +\nDeadline permits another attempt\n        +\nRetry budget remains\n</code></pre></div>\n<p>Today we answer the next question:</p>\n<div class=\"callout\">\n<p><strong>If we are going to retry, when should we retry?</strong></p>\n</div>\n<p>The basic answer is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Exponential backoff + jitter\n</code></pre></div>\n<p>The <strong>jitter</strong> part is just as important as the exponential part.</p>"
    },
    {
      "title": "1. Why immediate retries are dangerous",
      "diagram": null,
      "body": "<p>Suppose a database normally handles:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000 requests/sec\n</code></pre></div>\n<p>It becomes overloaded and starts rejecting 20% of requests.</p>\n<p>Clients immediately retry failures.</p>\n<p>Original load:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000 req/sec\n</code></pre></div>\n<p>Retries add:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>2,000 req/sec\n</code></pre></div>\n<p>New load:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>12,000 req/sec\n</code></pre></div>\n<p>The database was already unable to handle 10,000.</p>\n<p>Now it gets 12,000.</p>\n<p>More requests fail:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>12,000\n   ↓\n30% fail\n   ↓\n3,600 retries\n</code></pre></div>\n<p>The system enters a feedback loop:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Overload\n   ↓\nFailures\n   ↓\nImmediate retries\n   ↓\nMore load\n   ↓\nMore failures\n   ↓\nMore retries\n</code></pre></div>\n<p>Retries intended to improve reliability instead prolong the outage.</p>"
    },
    {
      "title": "2. Fixed-delay retries",
      "diagram": null,
      "body": "<p>A first improvement is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1\n   ↓ fail\nWait 1 second\n   ↓\nAttempt 2\n   ↓ fail\nWait 1 second\n   ↓\nAttempt 3\n</code></pre></div>\n<p>This reduces immediate pressure.</p>\n<p>But imagine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100,000 clients\n</code></pre></div>\n<p>all receive an error at:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10:00:00\n</code></pre></div>\n<p>All wait:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 second\n</code></pre></div>\n<p>At:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10:00:01\n</code></pre></div>\n<p>the dependency receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100,000 retries\n</code></pre></div>\n<p>The traffic pattern becomes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Traffic\n\n100k | █       █       █\n     | █       █       █\n     | █       █       █\n   0 +-----------------------\n       0s      1s      2s\n</code></pre></div>\n<p>This is called <strong>synchronization</strong> or the <strong>thundering herd</strong> problem.</p>\n<p>Fixed delays move the traffic spike rather than solving it.</p>"
    },
    {
      "title": "3. Exponential backoff",
      "diagram": null,
      "body": "<p>Instead of a constant delay:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1s\n1s\n1s\n1s\n</code></pre></div>\n<p>increase the delay exponentially:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1s\n2s\n4s\n8s\n16s\n</code></pre></div>\n<p>A common formula is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>delay = baseDelay × 2^retryNumber\n</code></pre></div>\n<p>For:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>baseDelay = 100 ms\n</code></pre></div>\n<p>you might get:</p>\n<table>\n<thead>\n<tr>\n<th>Retry</th>\n<th style=\"text-align:right\">Delay</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>1</td>\n<td style=\"text-align:right\">100 ms</td>\n</tr>\n<tr>\n<td>2</td>\n<td style=\"text-align:right\">200 ms</td>\n</tr>\n<tr>\n<td>3</td>\n<td style=\"text-align:right\">400 ms</td>\n</tr>\n<tr>\n<td>4</td>\n<td style=\"text-align:right\">800 ms</td>\n</tr>\n<tr>\n<td>5</td>\n<td style=\"text-align:right\">1600 ms</td>\n</tr>\n<tr>\n<td>6</td>\n<td style=\"text-align:right\">3200 ms</td>\n</tr>\n</tbody>\n</table>\n<p>This provides two useful properties.</p>\n<p>Early retries happen quickly because transient failures often recover quickly.</p>\n<p>Repeated failures cause increasingly long delays, reducing pressure on a dependency that appears to be genuinely unhealthy.</p>"
    },
    {
      "title": "4. Why exponential growth?",
      "diagram": null,
      "body": "<p>Consider a dependency outage lasting:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 seconds\n</code></pre></div>\n<p>With a one-second fixed retry:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 attempts per client\n</code></pre></div>\n<p>For one million clients:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 million retry attempts\n</code></pre></div>\n<p>With exponential backoff:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1s\n2s\n4s\n8s\n16s\n</code></pre></div>\n<p>Only around five attempts occur during the same period.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Fixed:\n\nx-x-x-x-x-x-x-x-x-x-x-x-x-x-x\n\nExponential:\n\nx--x----x--------x----------------x\n</code></pre></div>\n<p>The longer the failure lasts, the less frequently clients probe.</p>"
    },
    {
      "title": "5. Why exponential backoff alone is insufficient",
      "diagram": null,
      "body": "<p>Suppose 100,000 clients fail simultaneously.</p>\n<p>All calculate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry 1 = 1 second\nRetry 2 = 2 seconds\nRetry 3 = 4 seconds\n</code></pre></div>\n<p>They still retry together:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>T+1s  → 100,000 requests\nT+3s  → 100,000 requests\nT+7s  → 100,000 requests\n</code></pre></div>\n<p>You now have exponentially spaced traffic spikes.</p>\n<p>The dependency may recover at T+6 seconds.</p>\n<p>Then at T+7:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100,000 clients\n</code></pre></div>\n<p>hit it simultaneously and knock it down again.</p>\n<p>This is why production retry systems usually need:</p>\n<div class=\"callout\">\n<p><strong>Exponential backoff with jitter.</strong></p>\n</div>"
    },
    {
      "title": "6. What is jitter?",
      "diagram": null,
      "body": "<p>Jitter adds randomness to retry delays.</p>\n<p>Instead of every client retrying after exactly:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>4 seconds\n</code></pre></div>\n<p>clients choose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client A → 1.7 s\nClient B → 3.2 s\nClient C → 0.8 s\nClient D → 3.9 s\n</code></pre></div>\n<p>Now traffic spreads over time:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Without jitter:\n\n        ███████████\n--------|----------------\n        4 seconds\n\nWith jitter:\n\n   ██  █ █   ██ █  █\n---|---|---|---|---|---\n   0   1   2   3   4\n</code></pre></div>\n<p>The total number of retries may be similar, but peak concurrency is dramatically lower.</p>\n<p>This helps the dependency recover.</p>"
    },
    {
      "title": "7. Full jitter",
      "diagram": null,
      "body": "<p>One widely used strategy is <strong>full jitter</strong>.</p>\n<p>First calculate exponential delay:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>cap = min(maxDelay, baseDelay × 2^attempt)\n</code></pre></div>\n<p>Then choose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>actualDelay = random(0, cap)\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>baseDelay = 1 second\nattempt = 3\n\ncap = 8 seconds\n</code></pre></div>\n<p>Possible clients:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client A → 0.7 s\nClient B → 2.1 s\nClient C → 6.4 s\nClient D → 7.9 s\n</code></pre></div>\n<p>Traffic is well distributed.</p>\n<p>Pseudo-code:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>long exponentialDelay =\n        Math.min(\n            maxDelay,\n            baseDelay * (1L &lt;&lt; retryNumber)\n        );\n\nlong delay =\n        ThreadLocalRandom.current()\n                .nextLong(exponentialDelay + 1);\n</code></pre></div>\n<p>In production code, guard against numeric overflow when calculating exponential growth.</p>"
    },
    {
      "title": "8. Equal jitter",
      "diagram": null,
      "body": "<p>Another strategy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>delay =\n    exponentialDelay / 2\n    +\n    random(0, exponentialDelay / 2)\n</code></pre></div>\n<p>For:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>exponentialDelay = 8 seconds\n</code></pre></div>\n<p>actual delay is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>4–8 seconds\n</code></pre></div>\n<p>This guarantees some minimum waiting period.</p>\n<p>Compare:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Full jitter:\n\n0 ---------------- 8s\n\nEqual jitter:\n\n        4s -------- 8s\n</code></pre></div>\n<p>Full jitter spreads traffic more aggressively.</p>\n<p>Equal jitter prevents very short retry delays.</p>"
    },
    {
      "title": "9. Decorrelated jitter",
      "diagram": null,
      "body": "<p>Another approach calculates the next delay based partly on the previous delay:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>delay =\n    min(\n        maxDelay,\n        random(baseDelay, previousDelay × 3)\n    )\n</code></pre></div>\n<p>Example sequence:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>500 ms\n1.2 s\n2.7 s\n1.8 s\n4.3 s\n8.1 s\n</code></pre></div>\n<p>Notice it is not strictly increasing.</p>\n<p>This helps prevent synchronized retry patterns while still generally increasing delays during prolonged failure.</p>\n<p>It is useful for:</p>\n<ul>\n<li>long-running background workers</li>\n<li>distributed clients</li>\n<li>reconnection loops</li>\n</ul>\n<p>For ordinary application-level retries with only two or three attempts, full jitter is often easier to reason about.</p>"
    },
    {
      "title": "10. Always cap exponential backoff",
      "diagram": null,
      "body": "<p>Pure exponential growth becomes absurd:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1s\n2s\n4s\n8s\n16s\n32s\n64s\n128s\n256s\n...\n</code></pre></div>\n<p>Eventually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry after 18 hours\n</code></pre></div>\n<p>Usually undesirable.</p>\n<p>Use:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>delay =\nmin(\n    maxDelay,\n    exponentialDelay\n)\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>base = 500 ms\nmax  = 30 seconds\n</code></pre></div>\n<p>Schedule:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>0.5s\n1s\n2s\n4s\n8s\n16s\n30s\n30s\n30s\n</code></pre></div>\n<p>Then jitter within the appropriate range.</p>"
    },
    {
      "title": "11. Backoff and request deadlines",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>User deadline = 3 seconds\n</code></pre></div>\n<p>Retry policy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1 timeout = 1 second\n\nBackoff = 500 ms\n\nAttempt 2 timeout = 1 second\n\nBackoff = 1 second\n\nAttempt 3 timeout = 1 second\n</code></pre></div>\n<p>Total:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>4.5 seconds\n</code></pre></div>\n<p>Impossible.</p>\n<p>Before sleeping, calculate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>remainingDeadline\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Remaining = 600 ms\n\nNext delay = 400 ms\n\nAttempt timeout = 500 ms\n</code></pre></div>\n<p>Required:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>900 ms\n</code></pre></div>\n<p>Remaining:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>600 ms\n</code></pre></div>\n<p>Therefore:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Do not retry.\n</code></pre></div>\n<p>A retry that cannot finish before the caller's deadline is wasted work.</p>"
    },
    {
      "title": "12. Backoff should not hold scarce resources",
      "diagram": null,
      "body": "<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Begin database transaction\n    ↓\nCall service\n    ↓\nFailure\n    ↓\nSleep 8 seconds\n    ↓\nRetry\n</code></pre></div>\n<p>During those eight seconds you may still hold:</p>\n<ul>\n<li>database connection</li>\n<li>database locks</li>\n<li>transaction state</li>\n<li>thread</li>\n<li>bulkhead permit</li>\n</ul>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Release scarce resources\n    ↓\nSchedule retry\n    ↓\nWait\n    ↓\nAcquire resources again\n</code></pre></div>\n<p>This is particularly important for long backoff intervals.</p>\n<p>For asynchronous systems, schedule delayed retries rather than blocking threads with:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Thread.sleep(...)\n</code></pre></div>"
    },
    {
      "title": "13. Backoff for synchronous APIs",
      "diagram": null,
      "body": "<p>User-facing synchronous APIs usually have tight deadlines.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>API deadline = 2 seconds\n</code></pre></div>\n<p>You might afford:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1\n    ↓ fail quickly\n\nWait 50–150 ms\n\nAttempt 2\n</code></pre></div>\n<p>Maybe one more attempt.</p>\n<p>You probably cannot afford:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1s\n2s\n4s\n8s\n</code></pre></div>\n<p>That pattern is better suited to asynchronous processing.</p>\n<p>Therefore:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Synchronous retry:\nfew attempts\nsmall delays\nstrict deadline\n</code></pre></div>"
    },
    {
      "title": "14. Backoff for background jobs",
      "diagram": null,
      "body": "<p>Background processing can use much longer schedules.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1 → immediately\nAttempt 2 → ~1 minute\nAttempt 3 → ~5 minutes\nAttempt 4 → ~15 minutes\nAttempt 5 → ~1 hour\n</code></pre></div>\n<p>Eventually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Dead Letter Queue\n</code></pre></div>\n<p>or:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Manual intervention\n</code></pre></div>\n<p>This is often appropriate for:</p>\n<ul>\n<li>email delivery</li>\n<li>webhook delivery</li>\n<li>report generation</li>\n<li>external API synchronization</li>\n</ul>"
    },
    {
      "title": "15. Webhook retry example",
      "diagram": null,
      "body": "<p>Suppose your system sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>POST https://customer.com/webhook\n</code></pre></div>\n<p>Customer endpoint is unavailable.</p>\n<p>Bad policy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry every second forever\n</code></pre></div>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1 → immediately\nAttempt 2 → ~30 seconds\nAttempt 3 → ~2 minutes\nAttempt 4 → ~10 minutes\nAttempt 5 → ~1 hour\nAttempt 6 → ~6 hours\n</code></pre></div>\n<p>With jitter.</p>\n<p>Why?</p>\n<p>Webhook delivery usually does not require millisecond recovery.</p>\n<p>You want:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reliability\n</code></pre></div>\n<p>without:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DDoSing your customer's endpoint.\n</code></pre></div>"
    },
    {
      "title": "16. Respect `Retry-After`",
      "diagram": null,
      "body": "<p>Suppose server returns:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>429 Too Many Requests\nRetry-After: 60\n</code></pre></div>\n<p>Your local exponential policy says:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry after 4 seconds\n</code></pre></div>\n<p>Do not ignore the server.</p>\n<p>Usually use at least the server-provided delay:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>delay =\nmax(\n    localBackoff,\n    serverRetryAfter\n)\n</code></pre></div>\n<p>subject to your own deadline and retry policy.</p>\n<p>Similarly, a <code class=\"inline-code\">503</code> may include <code class=\"inline-code\">Retry-After</code>.</p>\n<p>The server knows more about its own recovery or throttling policy than the client does.</p>"
    },
    {
      "title": "17. The `Retry-After` herd problem",
      "diagram": null,
      "body": "<p>Even server-provided delays can synchronize clients.</p>\n<p>Suppose one million clients receive:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>Retry-After: 60\n</code></pre></div>\n<p>Exactly 60 seconds later:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 million requests\n</code></pre></div>\n<p>Therefore you may apply jitter around the allowed retry point when semantics permit.</p>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry-After = 60 seconds\n\nactual retry =\n60 seconds + random(0, 10 seconds)\n</code></pre></div>\n<p>But don't retry earlier than the server explicitly allows.</p>"
    },
    {
      "title": "18. Backoff and circuit breakers",
      "diagram": null,
      "body": "<p>During sustained failure:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt\n    ↓ fail\nBackoff\n    ↓\nRetry\n    ↓ fail\n</code></pre></div>\n<p>Eventually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Circuit opens\n</code></pre></div>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry attempt\n    ↓\nCircuit OPEN\n    ↓\nFail immediately\n</code></pre></div>\n<p>Do not interpret:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CallNotPermittedException\n</code></pre></div>\n<p>as a transient downstream failure that deserves another retry.</p>\n<p>That creates:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Circuit rejects\n↓\nRetry\n↓\nCircuit rejects\n↓\nRetry\n</code></pre></div>\n<p>The breaker already decided:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Stop calling.\n</code></pre></div>\n<p>Respect that decision.</p>"
    },
    {
      "title": "19. Backoff and autoscaling",
      "diagram": null,
      "body": "<p>Imagine a service becomes overloaded.</p>\n<p>Clients back off.</p>\n<p>Traffic falls.</p>\n<p>Autoscaler sees:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CPU decreasing\n</code></pre></div>\n<p>and may conclude:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>We don't need more instances.\n</code></pre></div>\n<p>But millions of retries may be waiting.</p>\n<p>Then their timers expire:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Traffic spike\n</code></pre></div>\n<p>This can cause oscillation.</p>\n<p>Useful signals for autoscaling may include:</p>\n<ul>\n<li>queue depth</li>\n<li>outstanding work</li>\n<li>request arrival rate</li>\n<li>retry backlog</li>\n</ul>\n<p>not just current CPU.</p>"
    },
    {
      "title": "20. Backoff after database failover",
      "diagram": null,
      "body": "<p>Suppose primary database fails.</p>\n<p>Failover takes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 seconds\n</code></pre></div>\n<p>Applications continuously retry connections.</p>\n<p>Without backoff:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100 application Pods\n×\n100 retries/sec\n=\n10,000 connection attempts/sec\n</code></pre></div>\n<p>The new primary becomes available.</p>\n<p>Immediately it faces a connection storm.</p>\n<p>Backoff + jitter spreads reconnection:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Pod A → 27.3 s\nPod B → 31.8 s\nPod C → 34.1 s\n...\n</code></pre></div>\n<p>This is particularly important for:</p>\n<ul>\n<li>databases</li>\n<li>message brokers</li>\n<li>Redis</li>\n<li>WebSockets</li>\n<li>service startup dependencies</li>\n</ul>"
    },
    {
      "title": "21. WebSocket reconnects",
      "diagram": null,
      "body": "<p>Suppose a WebSocket server restarts.</p>\n<p>Connected clients:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000,000\n</code></pre></div>\n<p>All connections drop simultaneously.</p>\n<p>Bad client:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Disconnected\n    ↓\nReconnect immediately\n</code></pre></div>\n<p>The new server receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1 million connection handshakes\n</code></pre></div>\n<p>It crashes.</p>\n<p>Correct:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reconnect attempt 1\n    ↓\nBackoff + jitter\n\nAttempt 2\n    ↓\nLonger backoff + jitter\n</code></pre></div>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1s\n2s\n4s\n8s\n16s\n30s cap\n</code></pre></div>\n<p>with full jitter.</p>\n<p>This is one of the most important practical uses of exponential backoff.</p>"
    },
    {
      "title": "22. Resetting the backoff",
      "diagram": null,
      "body": "<p>When should the backoff return to its initial value?</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Connect\n↓\nFail\n↓\n1s\n↓\nFail\n↓\n2s\n↓\nSuccess\n</code></pre></div>\n<p>Normally:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reset backoff\n</code></pre></div>\n<p>But for long-lived connections, immediate reset can cause problems.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>WebSocket connects\n↓\nstays alive 100 ms\n↓\ndisconnects\n</code></pre></div>\n<p>If you reset immediately:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1s retry\n</code></pre></div>\n<p>Repeatedly unstable connections never reach longer delays.</p>\n<p>A better rule may be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Reset only after connection has remained healthy\nfor 30 seconds\n</code></pre></div>\n<p>This prevents flapping systems from creating rapid reconnect loops.</p>"
    },
    {
      "title": "23. Backoff and message queues",
      "diagram": null,
      "body": "<p>Suppose a consumer fails to process:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Message M\n</code></pre></div>\n<p>Immediate redelivery:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>M\n↓\nFail\n↓\nM\n↓\nFail\n↓\nM\n↓\nFail\n</code></pre></div>\n<p>creates a hot loop.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1\n↓\nDelay\n↓\nAttempt 2\n↓\nLonger delay\n</code></pre></div>\n<p>Implementation approaches include:</p>\n<ul>\n<li>visibility timeout adjustment</li>\n<li>delayed queues</li>\n<li>retry topics</li>\n<li>scheduled messages</li>\n</ul>\n<p>Eventually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>DLQ\n</code></pre></div>\n<p>The consumer should not spend 100% of its capacity repeatedly processing one poison message.</p>"
    },
    {
      "title": "24. Backoff and concurrency",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000 failing requests\n</code></pre></div>\n<p>Each independently schedules retries.</p>\n<p>Even with backoff, you may still have too much concurrency.</p>\n<p>Combine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Exponential backoff\n    +\nJitter\n    +\nBulkhead\n    +\nRetry budget\n</code></pre></div>\n<p>Each solves a different problem:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Backoff\n→ reduces retry frequency\n\nJitter\n→ reduces synchronization\n\nBulkhead\n→ limits concurrent attempts\n\nRetry budget\n→ limits total retry volume\n</code></pre></div>"
    },
    {
      "title": "25. Choosing a base delay",
      "diagram": null,
      "body": "<p>Base delay depends on the failure mode.</p>\n<p>For a transient connection race:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>50–100 ms\n</code></pre></div>\n<p>may be reasonable.</p>\n<p>For rate limiting:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>seconds\n</code></pre></div>\n<p>may be appropriate.</p>\n<p>For webhook delivery:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>minutes\n</code></pre></div>\n<p>may be appropriate.</p>\n<p>For failed batch processing:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>minutes or hours\n</code></pre></div>\n<p>may be appropriate.</p>\n<p>Ask:</p>\n<div class=\"callout\">\n<p>How quickly can the underlying condition realistically change?</p>\n</div>\n<p>Retrying a database every 10 milliseconds during a 30-second failover is pointless.</p>"
    },
    {
      "title": "26. Choosing maximum delay",
      "diagram": null,
      "body": "<p>Maximum delay depends on:</p>\n<ul>\n<li>recovery expectations</li>\n<li>business urgency</li>\n<li>retry duration</li>\n<li>queue retention</li>\n<li>SLA/SLO</li>\n<li>whether humans may intervene</li>\n</ul>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Synchronous REST call:\nmax delay ≈ hundreds of milliseconds\n\nWebSocket reconnect:\nmax delay ≈ 30–60 seconds\n\nWebhook:\nmax delay ≈ hours\n\nBackground synchronization:\nmax delay ≈ hours\n</code></pre></div>\n<p>Again, one configuration does not fit every workload.</p>"
    },
    {
      "title": "27. Maximum attempts vs maximum elapsed time",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maxAttempts = 10\n</code></pre></div>\n<p>With exponential backoff, this might take hours.</p>\n<p>Sometimes a better policy is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry for at most 15 minutes\n</code></pre></div>\n<p>rather than:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Retry exactly 10 times\n</code></pre></div>\n<p>You can combine both:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maxAttempts = 10\nmaxElapsedTime = 15 minutes\n</code></pre></div>\n<p>Stop when either is reached.</p>\n<p>This is often easier to align with business requirements.</p>"
    },
    {
      "title": "28. Java implementation",
      "diagram": null,
      "body": "<p>A simple full-jitter calculation:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>import java.time.Duration;\nimport java.util.concurrent.ThreadLocalRandom;\n\npublic final class Backoff {\n\n    private Backoff() {\n    }\n\n    public static Duration fullJitter(\n            int retryNumber,\n            Duration baseDelay,\n            Duration maxDelay) {\n\n        long baseMillis = baseDelay.toMillis();\n        long maxMillis = maxDelay.toMillis();\n\n        // Prevent overflow by capping exponential growth.\n        int shift = Math.min(retryNumber, 30);\n\n        long exponential;\n\n        try {\n            exponential =\n                    Math.multiplyExact(\n                            baseMillis,\n                            1L &lt;&lt; shift);\n        } catch (ArithmeticException e) {\n            exponential = maxMillis;\n        }\n\n        long cap =\n                Math.min(exponential, maxMillis);\n\n        long delay =\n                ThreadLocalRandom.current()\n                        .nextLong(cap + 1);\n\n        return Duration.ofMillis(delay);\n    }\n}\n</code></pre></div>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Duration delay =\n        Backoff.fullJitter(\n                retryNumber,\n                Duration.ofMillis(100),\n                Duration.ofSeconds(10));\n</code></pre></div>\n<p>Production retry libraries generally provide these mechanisms, so prefer a well-tested library over implementing a complete retry engine yourself.</p>"
    },
    {
      "title": "29. Resilience4j-style configuration",
      "diagram": null,
      "body": "<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>resilience4j:\n  retry:\n    instances:\n      inventoryService:\n        maxAttempts: 3\n        waitDuration: 100ms\n        enableExponentialBackoff: true\n        exponentialBackoffMultiplier: 2\n        enableRandomizedWait: true\n</code></pre></div>\n<p>The exact supported property names can vary by Resilience4j and Spring integration version, so verify them against the version used by your application rather than copying configuration blindly.</p>\n<p>A representative schedule could be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1\n↓\nFailure\n\nWait random(0–100 ms)\n\nAttempt 2\n↓\nFailure\n\nWait random(0–200 ms)\n\nAttempt 3\n</code></pre></div>\n<p>For a user-facing request, three total attempts is often already aggressive.</p>"
    },
    {
      "title": "30. Observability",
      "diagram": null,
      "body": "<p>Track:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>retry attempts\nbackoff duration\nretry reason\nattempt number\nfinal outcome\nretry budget exhaustion\ndeadline exhaustion\n</code></pre></div>\n<p>Useful distribution:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Attempt 1 success = 98.5%\nAttempt 2 success = 1.2%\nAttempt 3 success = 0.2%\nExhausted         = 0.1%\n</code></pre></div>\n<p>Also track:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Total time spent waiting in backoff\n</code></pre></div>\n<p>A service may have low processing latency but high user latency because requests spend most of their time sleeping between retries.</p>"
    },
    {
      "title": "31. Backoff can hide dependency problems",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Final success rate = 99.9%\n</code></pre></div>\n<p>Looks healthy.</p>\n<p>But:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30% require retry\nAverage backoff = 500 ms\n</code></pre></div>\n<p>Users experience higher latency.</p>\n<p>The dependency is degraded.</p>\n<p>Monitor separately:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>first-attempt success rate\nretry success rate\nfinal success rate\n</code></pre></div>\n<p>A falling first-attempt success rate is an early warning signal.</p>"
    },
    {
      "title": "32. Common production mistakes",
      "diagram": null,
      "body": "<h5>Exponential backoff without jitter</h5>\n<p>Clients remain synchronized.</p>\n<h5>Jitter without exponential growth</h5>\n<p>Retries are spread but still occur too frequently during long outages.</p>\n<h5>No maximum delay</h5>\n<p>Retry intervals become impractically large.</p>\n<h5>No total retry deadline</h5>\n<p>Background retries may continue indefinitely.</p>\n<h5>Ignoring <code class=\"inline-code\">Retry-After</code></h5>\n<p>Client overrides explicit server throttling.</p>\n<h5>Sleeping while holding database resources</h5>\n<p>Connections and locks are wasted.</p>\n<h5>Retrying after circuit opens</h5>\n<p>The breaker decision is ignored.</p>\n<h5>Resetting reconnect backoff after a 100-ms connection</h5>\n<p>Flapping systems generate rapid reconnect loops.</p>\n<h5>Using the same backoff for every operation</h5>\n<p>REST calls, WebSockets, webhooks, and batch jobs have very different requirements.</p>\n<h5>No retry budget</h5>\n<p>Even perfectly jittered retries can still overload the dependency if there are enough of them.</p>"
    },
    {
      "title": "33. A practical architecture",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Checkout\n    ↓\nPayment Service\n    ↓\nExternal Payment Provider\n</code></pre></div>\n<p>You might design:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Overall deadline\n    3 seconds\n\nPayment attempt timeout\n    1 second\n\nMaximum attempts\n    2\n\nBackoff\n    Full jitter, cap 200 ms\n\nIdempotency key\n    paymentId\n\nCircuit breaker\n    Yes\n\nRetryable\n    connection failure\n    selected 502/503\n\nNot blindly retryable\n    ambiguous payment timeout\n    validation failure\n    payment decline\n\n429\n    respect Retry-After if deadline permits\n</code></pre></div>\n<p>Compare that with WebSocket</p>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "Exponential growth reduces probe frequency during longer outages.",
    "Jitter is essential because deterministic schedules synchronize clients.",
    "Cap delays and elapsed time, and respect Retry-After.",
    "Do not sleep while holding scarce transactions, connections, or permits.",
    "Use very different schedules for synchronous calls, background jobs, webhooks, and reconnects."
  ]
};
