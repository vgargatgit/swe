window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-21-cron-jobs"] = {
  "day": 21,
  "title": "Cron Jobs",
  "subtitle": "Design scheduled workflows for clustered execution, recovery, idempotency, and operational control.",
  "tags": [
    "Cron",
    "Scheduling",
    "Singleton execution",
    "Checkpointing",
    "Time zones",
    "Kubernetes CronJob"
  ],
  "core": "A cron job is not simply \"code that runs every night.\" In distributed systems, it is a scheduled workflow that must execute at the correct time, exactly the correct number of times, despite crashes, deployments, clock drift, retries, and multiple application instances.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Scheduler --> Claim[(Durable execution claim)]\n  Claim -- winner --> Fanout[Create partition jobs]\n  Claim -- duplicate --> Skip\n  Fanout --> Queue[(Work queue)]\n  Queue --> Workers[Idempotent workers]\n  Workers --> Checkpoint[(Progress / checkpoint)]",
      "body": "<p>Most developers learn cron like this:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Scheduled(cron = \"0 0 * * * *\")\npublic void cleanup() {\n    ...\n}\n</code></pre></div>\n<p>That works perfectly...</p>\n<p>...until your application is deployed on Kubernetes with <strong>20 replicas</strong>.</p>\n<p>Then you suddenly have:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Replica 1\n    ↓\ncleanup()\n\nReplica 2\n    ↓\ncleanup()\n\nReplica 3\n    ↓\ncleanup()\n\n...\n\nReplica 20\n    ↓\ncleanup()\n</code></pre></div>\n<p>Your nightly cleanup just ran twenty times.</p>\n<p>This lesson is about why scheduled jobs become surprisingly difficult in production.</p>"
    },
    {
      "title": "1. What is a cron job?",
      "diagram": null,
      "body": "<p>A cron job executes work based on time.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Every minute\nEvery midnight\nEvery Sunday\nFirst day of month\nEvery 5 minutes\n</code></pre></div>\n<p>Typical examples:</p>\n<ul>\n<li>Send invoices</li>\n<li>Expire sessions</li>\n<li>Generate reports</li>\n<li>Retry failed payments</li>\n<li>Archive logs</li>\n<li>Delete expired tokens</li>\n<li>Refresh caches</li>\n<li>Settlement jobs</li>\n<li>Interest calculation</li>\n<li>Email digests</li>\n</ul>\n<p>The defining characteristic is:</p>\n<div class=\"callout\">\n<p><strong>Time</strong>, not user requests, triggers execution.</p>\n</div>"
    },
    {
      "title": "2. The simplest implementation",
      "diagram": null,
      "body": "<p>Single JVM:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Scheduled(cron = \"0 0 2 * * *\")\npublic void settlementJob() {\n    settlementService.run();\n}\n</code></pre></div>\n<p>Architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Application\n\n↓\n\nScheduler\n\n↓\n\nSettlement Job\n</code></pre></div>\n<p>Perfectly fine.</p>\n<p>As long as:</p>\n<ul>\n<li>one process</li>\n<li>one machine</li>\n<li>process never crashes</li>\n</ul>\n<p>Production rarely looks like this.</p>"
    },
    {
      "title": "3. First distributed problem",
      "diagram": null,
      "body": "<p>Suppose Kubernetes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Replica A\n\nReplica B\n\nReplica C\n</code></pre></div>\n<p>Each starts:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Scheduled(...)\n</code></pre></div>\n<p>Result:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:00\n\n↓\n\nA executes\n\n↓\n\nB executes\n\n↓\n\nC executes\n</code></pre></div>\n<p>Three settlements.</p>\n<p>Three invoices.</p>\n<p>Three emails.</p>\n<p>Three refunds.</p>\n<p>Usually disastrous.</p>"
    },
    {
      "title": "4. Singleton execution",
      "diagram": null,
      "body": "<p>Most scheduled jobs actually require:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Exactly one instance\n</code></pre></div>\n<p>not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>One execution per replica\n</code></pre></div>\n<p>This introduces the first production requirement:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Leader election\n\nOR\n\nDistributed locking\n\nOR\n\nExternal scheduler\n</code></pre></div>"
    },
    {
      "title": "5. Leader election",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Pod A\nPod B\nPod C\n</code></pre></div>\n<p>One becomes leader.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Leader\n    ↓\nRuns cron\n\nFollowers\n    ↓\nDo nothing\n</code></pre></div>\n<p>If leader dies:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Pod B\n\n↓\n\nNew leader\n</code></pre></div>\n<p>Only one scheduler remains active.</p>"
    },
    {
      "title": "6. Distributed lock approach",
      "diagram": null,
      "body": "<p>Instead of permanent leadership:</p>\n<p>Every scheduler tries:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Acquire lock\n</code></pre></div>\n<p>Only one succeeds.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Pod A\n↓\n\nLOCK ACQUIRED\n\nPod B\n↓\n\nFAILED\n\nPod C\n↓\n\nFAILED\n</code></pre></div>\n<p>Only Pod A executes.</p>\n<p>After completion:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Release lock\n</code></pre></div>"
    },
    {
      "title": "7. Lock duration",
      "diagram": null,
      "body": "<p>Suppose job normally takes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>30 seconds\n</code></pre></div>\n<p>Lock TTL:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>60 seconds\n</code></pre></div>\n<p>Seems reasonable.</p>\n<p>But then:</p>\n<p>GC pause:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>70 seconds\n</code></pre></div>\n<p>Lock expires.</p>\n<p>Another pod acquires it.</p>\n<p>Now:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Pod A\n\nstill running\n\n+\n\nPod B\n\nstarted running\n</code></pre></div>\n<p>Duplicate execution.</p>\n<p>TTL selection matters.</p>"
    },
    {
      "title": "8. Clock skew",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Server A\n\n02:00\n\nServer B\n\n01:59:45\n</code></pre></div>\n<p>Who should run?</p>\n<p>Clock differences create subtle scheduling bugs.</p>\n<p>Production systems synchronize clocks using:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>NTP\n</code></pre></div>\n<p>But skew never becomes exactly zero.</p>\n<p>Avoid assuming perfect clock agreement.</p>"
    },
    {
      "title": "9. Missed schedules",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Nightly job\n\n02:00\n</code></pre></div>\n<p>Application crashes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>01:55\n\n↓\n\nRestart\n\n↓\n\n02:15\n</code></pre></div>\n<p>Should:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:00 job\n</code></pre></div>\n<p>run?</p>\n<p>Two possible semantics:</p>\n<h5>Fire immediately</h5>\n<p>Catch up.</p>\n<h5>Skip</h5>\n<p>Wait until tomorrow.</p>\n<p>Business requirements determine which is correct.</p>"
    },
    {
      "title": "10. Catch-up jobs",
      "diagram": null,
      "body": "<p>Example:</p>\n<p>Interest calculation.</p>\n<p>Missing a day is unacceptable.</p>\n<p>Restart:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:15\n\n↓\n\nRun missed execution\n</code></pre></div>\n<p>Correct.</p>"
    },
    {
      "title": "11. Skip semantics",
      "diagram": null,
      "body": "<p>Example:</p>\n<p>Refresh homepage cache every minute.</p>\n<p>Restart after:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>15 minutes\n</code></pre></div>\n<p>No need to replay:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>15 cache refreshes\n</code></pre></div>\n<p>Simply execute the next scheduled refresh.</p>"
    },
    {
      "title": "12. Long-running jobs",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Daily report\n</code></pre></div>\n<p>Normally:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 minutes\n</code></pre></div>\n<p>Today:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>3 hours\n</code></pre></div>\n<p>Next schedule arrives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Already running.\n</code></pre></div>\n<p>Options:</p>\n<h5>Skip next execution</h5>\n<p>Common.</p>\n<h5>Queue another execution</h5>\n<p>Useful for ETL.</p>\n<h5>Run concurrently</h5>\n<p>Dangerous unless designed.</p>"
    },
    {
      "title": "13. Re-entrancy",
      "diagram": null,
      "body": "<p>Question:</p>\n<p>Can the same cron safely execute twice simultaneously?</p>\n<p>Some jobs:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cache refresh\n\n↓\n\nYes\n</code></pre></div>\n<p>Others:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Settlement\n\n↓\n\nNo\n</code></pre></div>\n<p>This determines concurrency policy.</p>"
    },
    {
      "title": "14. Idempotency",
      "diagram": null,
      "body": "<p>Suppose nightly billing:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Generate invoice\n</code></pre></div>\n<p>Crash:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Invoice generated\n\n↓\n\nResponse lost\n\n↓\n\nRetry\n</code></pre></div>\n<p>Without idempotency:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Invoice generated twice\n</code></pre></div>\n<p>Every cron should be designed assuming retries.</p>"
    },
    {
      "title": "15. Checkpointing",
      "diagram": null,
      "body": "<p>Suppose processing:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>50 million rows\n</code></pre></div>\n<p>Crash after:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>40 million\n</code></pre></div>\n<p>Restart options:</p>\n<h5>Start over</h5>\n<p>Very expensive.</p>\n<h5>Resume</h5>\n<p>Store checkpoints.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Last processed ID\n\n=\n\n40,000,000\n</code></pre></div>\n<p>Restart:</p>\n<p>Continue.</p>"
    },
    {
      "title": "16. Chunk processing",
      "diagram": null,
      "body": "<p>Instead of:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Process everything\n</code></pre></div>\n<p>Prefer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1000 rows\n\n↓\n\nCommit\n\n↓\n\n1000 rows\n\n↓\n\nCommit\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>restart easier</li>\n<li>less memory</li>\n<li>reduced lock duration</li>\n<li>partial progress preserved</li>\n</ul>\n<p>Frameworks like Spring Batch are built around this idea.</p>"
    },
    {
      "title": "17. Job state",
      "diagram": null,
      "body": "<p>Production jobs usually persist:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Job ID\n\nStatus\n\nStart time\n\nEnd time\n\nProgress\n\nRetry count\n\nWorker\n\nLast checkpoint\n</code></pre></div>\n<p>Without state:</p>\n<p>Operations cannot answer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Is today's job still running?\n</code></pre></div>"
    },
    {
      "title": "18. Cron vs queue",
      "diagram": null,
      "body": "<p>Developers often write:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:00\n\n↓\n\nGenerate 5 million emails\n</code></pre></div>\n<p>One JVM now sends:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5 million SMTP requests\n</code></pre></div>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cron\n\n↓\n\nPublish email tasks\n\n↓\n\nQueue\n\n↓\n\nWorkers\n</code></pre></div>\n<p>Cron triggers work.</p>\n<p>Workers perform work.</p>"
    },
    {
      "title": "19. Fan-out pattern",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Nightly settlement\n\n↓\n\nFind all merchants\n\n↓\n\nPublish merchant settlement jobs\n\n↓\n\nWorkers process independently\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>scalable</li>\n<li>retryable</li>\n<li>parallel</li>\n<li>observable</li>\n</ul>\n<p>Cron should orchestrate.</p>\n<p>Not necessarily perform all work itself.</p>"
    },
    {
      "title": "20. Batch windows",
      "diagram": null,
      "body": "<p>Banks often define:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Settlement window\n\n02:00–04:00\n</code></pre></div>\n<p>Job starts only inside window.</p>\n<p>If delayed beyond:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>04:00\n</code></pre></div>\n<p>May require:</p>\n<ul>\n<li>manual approval</li>\n<li>next cycle</li>\n<li>emergency procedure</li>\n</ul>\n<p>Business timing matters.</p>"
    },
    {
      "title": "21. DST problems",
      "diagram": null,
      "body": "<p>Suppose schedule:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:30 every day\n</code></pre></div>\n<p>Daylight Saving Time:</p>\n<p>Spring:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:30\n\nnever exists\n</code></pre></div>\n<p>Autumn:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:30\n\nexists twice\n</code></pre></div>\n<p>Should job execute:</p>\n<ul>\n<li>once?</li>\n<li>twice?</li>\n<li>never?</li>\n</ul>\n<p>Always understand scheduler semantics.</p>\n<p>Many production systems prefer UTC internally.</p>"
    },
    {
      "title": "22. Time zones",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Midnight\n</code></pre></div>\n<p>Whose midnight?</p>\n<p>Customer?</p>\n<p>Server?</p>\n<p>Business headquarters?</p>\n<p>UTC?</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Interest calculation\n\n↓\n\nIndia\n\n↓\n\n00:00 IST\n</code></pre></div>\n<p>Explicitly define time zones.</p>\n<p>Never assume server local time.</p>"
    },
    {
      "title": "23. Job dependencies",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Settlement\n\n↓\n\nInvoice\n\n↓\n\nEmail\n</code></pre></div>\n<p>Email should not begin before invoice generation.</p>\n<p>Simple cron:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:00 Settlement\n\n02:01 Invoice\n\n02:02 Email\n</code></pre></div>\n<p>Fails if settlement takes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>5 minutes\n</code></pre></div>\n<p>Dependencies should be event-driven or workflow-driven rather than purely time-driven.</p>"
    },
    {
      "title": "24. Failure handling",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1000 merchants\n</code></pre></div>\n<p>Merchant:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>857\n</code></pre></div>\n<p>fails.</p>\n<p>Options:</p>\n<ul>\n<li>fail entire job</li>\n<li>retry merchant</li>\n<li>continue others</li>\n<li>create repair task</li>\n</ul>\n<p>Usually:</p>\n<p>Partial progress is preferable.</p>"
    },
    {
      "title": "25. Distributed cron",
      "diagram": null,
      "body": "<p>Many organizations separate scheduling entirely.</p>\n<p>Architecture:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Scheduler\n\n↓\n\nQueue\n\n↓\n\nWorkers\n</code></pre></div>\n<p>Workers contain business logic.</p>\n<p>Scheduler only decides:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>When\n</code></pre></div>\n<p>This improves scalability.</p>"
    },
    {
      "title": "26. Kubernetes CronJob",
      "diagram": null,
      "body": "<p>Kubernetes provides:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CronJob\n\n↓\n\nJob\n\n↓\n\nPod\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>independent lifecycle</li>\n<li>retries</li>\n<li>history</li>\n<li>isolation</li>\n</ul>\n<p>Better than embedding many cron tasks inside application pods.</p>\n<p>However:</p>\n<p>Your application logic must still be:</p>\n<ul>\n<li>idempotent</li>\n<li>retry-safe</li>\n<li>restart-safe</li>\n</ul>"
    },
    {
      "title": "27. Spring Batch",
      "diagram": null,
      "body": "<p>Large ETL jobs often use Spring Batch.</p>\n<p>Features:</p>\n<ul>\n<li>checkpoints</li>\n<li>restartability</li>\n<li>chunk commits</li>\n<li>job repository</li>\n<li>execution metadata</li>\n<li>skip policies</li>\n<li>retry policies</li>\n</ul>\n<p>It's designed for exactly these production problems.</p>"
    },
    {
      "title": "28. Lock implementation example",
      "diagram": null,
      "body": "<p>A common table:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>scheduler_lock\n\n-----------------------\njob_name\nowner\nexpires_at\n</code></pre></div>\n<p>Execution:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Acquire row\n\n↓\n\nSuccess?\n\n↓\n\nRun\n\n↓\n\nRelease\n</code></pre></div>\n<p>Simple.</p>\n<p>But beware:</p>\n<ul>\n<li>stale locks</li>\n<li>expired locks</li>\n<li>clock drift</li>\n<li>crashed owner</li>\n</ul>"
    },
    {
      "title": "29. Redis locks",
      "diagram": null,
      "body": "<p>Many teams use:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>SET lock-key value NX PX 60000\n</code></pre></div>\n<p>Advantages:</p>\n<p>Simple.</p>\n<p>Fast.</p>\n<p>Problems:</p>\n<p>Lock expiration.</p>\n<p>Redis restart.</p>\n<p>Network partition.</p>\n<p>The lock must not be considered perfect.</p>"
    },
    {
      "title": "30. Database locks",
      "diagram": null,
      "body": "<p>Using:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT ...\n\nFOR UPDATE\n</code></pre></div>\n<p>works well only if:</p>\n<ul>\n<li>single database</li>\n<li>same transactional boundary</li>\n</ul>\n<p>Not always appropriate across clusters.</p>"
    },
    {
      "title": "31. Duplicate execution",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cron starts.\n\n↓\n\nGC pause.\n\n↓\n\nLock expires.\n\n↓\n\nSecond worker starts.\n\n↓\n\nFirst worker resumes.\n</code></pre></div>\n<p>Two jobs.</p>\n<p>Therefore:</p>\n<p>Every scheduled workflow should also be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Idempotent\n</code></pre></div>\n<p>Locks reduce duplicates.</p>\n<p>They do not eliminate every failure mode.</p>"
    },
    {
      "title": "32. Job cancellation",
      "diagram": null,
      "body": "<p>Suppose deployment starts.</p>\n<p>Should:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Running settlement\n</code></pre></div>\n<p>be interrupted?</p>\n<p>Some jobs:</p>\n<p>Yes.</p>\n<p>Others:</p>\n<p>Must finish.</p>\n<p>Graceful shutdown should consider scheduled work.</p>"
    },
    {
      "title": "33. Monitoring",
      "diagram": null,
      "body": "<p>Useful metrics:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Job duration\n\nLast success\n\nFailure count\n\nRetry count\n\nRunning jobs\n\nSkipped executions\n\nMissed executions\n\nOldest unfinished job\n</code></pre></div>\n<p>Alert if:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Daily settlement\n\nLast success:\n\n48 hours ago\n</code></pre></div>"
    },
    {
      "title": "34. Logging",
      "diagram": null,
      "body": "<p>Every execution should have:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Execution ID\n</code></pre></div>\n<p>Log:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Job started\n\nCheckpoint\n\nRows processed\n\nRetries\n\nCompletion\n\nFailure reason\n</code></pre></div>\n<p>Avoid:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>\"Nightly job failed\"\n</code></pre></div>\n<p>without context.</p>"
    },
    {
      "title": "35. Production incident",
      "diagram": null,
      "body": "<p>A real scenario:</p>\n<p>Nightly billing.</p>\n<p>Deployment at:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>01:59\n</code></pre></div>\n<p>Pods restart.</p>\n<p>Two pods both acquire expired locks.</p>\n<p>Billing executes twice.</p>\n<p>Customers receive:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Two invoices\n</code></pre></div>\n<p>Root cause:</p>\n<p>Lock TTL shorter than restart + GC delay.</p>\n<p>Lesson:</p>\n<p>Distributed scheduling must assume overlapping execution is possible.</p>"
    },
    {
      "title": "36. Spring example",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Component\npublic class SettlementJob {\n\n    @Scheduled(cron = \"0 0 2 * * *\")\n    public void execute() {\n\n        if (!lockService.tryAcquire(\"settlement\")) {\n            return;\n        }\n\n        try {\n            settlementService.run();\n        } finally {\n            lockService.release(\"settlement\");\n        }\n    }\n}\n</code></pre></div>\n<p>This illustrates the pattern, but a production-grade <code class=\"inline-code\">lockService</code> must handle:</p>\n<ul>\n<li>crashes</li>\n<li>expiration</li>\n<li>ownership validation</li>\n<li>fencing (discussed later in the Distributed Locks lesson)</li>\n</ul>"
    },
    {
      "title": "37. Interview question",
      "diagram": null,
      "body": "<p><strong>Why is <code class=\"inline-code\">@Scheduled</code> alone insufficient in Kubernetes?</strong></p>\n<p>A strong answer:</p>\n<div class=\"callout\">\n<p><code class=\"inline-code\">@Scheduled</code> executes independently in every application instance. In a clustered deployment, that usually means the scheduled job runs once per replica rather than once for the entire application. Production systems therefore use leader election, distributed locking, Kubernetes CronJobs, or an external scheduler. Even then, scheduled tasks should remain idempotent because crashes, lock expiry, retries, and overlapping execution can still produce duplicates.</p>\n</div>"
    },
    {
      "title": "38. Practical design exercise",
      "diagram": null,
      "body": "<p>You're building a payment platform.</p>\n<p>Every night:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>02:00\n\n↓\n\nSettlement\n</code></pre></div>\n<p>Requirements:</p>\n<ul>\n<li>200 million transactions</li>\n<li>Multiple Kubernetes replicas</li>\n<li>Job may take 4 hours</li>\n<li>Resume after crash</li>\n<li>Never settle twice</li>\n<li>Generate reports</li>\n<li>Send completion email</li>\n</ul>\n<p>Design:</p>\n<ol>\n<li>Scheduling mechanism.</li>\n<li>Singleton execution strategy.</li>\n<li>Checkpoint model.</li>\n<li>Chunk size.</li>\n<li>Lock strategy.</li>\n<li>Retry policy.</li>\n<li>Progress tracking.</li>\n<li>Monitoring.</li>\n<li>Failure recovery.</li>\n<li>Deployment strategy during execution.</li>\n</ol>"
    },
    {
      "title": "39. Common anti-patterns",
      "diagram": null,
      "body": "<h5>Using <code class=\"inline-code\">@Scheduled</code> on every pod</h5>\n<p>Duplicate execution.</p>\n\n<h5>No checkpoints</h5>\n<p>Crash means restart from zero.</p>\n\n<h5>Huge transaction</h5>\n<p>Millions of updates in one transaction.</p>\n\n<h5>No idempotency</h5>\n<p>Retry duplicates business effects.</p>\n\n<h5>Cron directly performs massive work</h5>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cron\n\n↓\n\nQueue\n\n↓\n\nWorkers\n</code></pre></div>\n\n<h5>Assuming local server time</h5>\n<p>Breaks across regions.</p>\n\n<h5>Ignoring missed executions</h5>\n<p>Business inconsistencies accumulate.</p>"
    },
    {
      "title": "Key takeaways",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cron\n    = time-triggered workflow\n\nDistributed cron\n    = scheduling + coordination problem\n\nSingleton execution\n    = leader election or distributed lock\n\nRetries\n    = expected\n\nIdempotency\n    = mandatory\n\nCheckpointing\n    = enables recovery\n\nChunk processing\n    = scalability + restartability\n\nCron\n    = trigger work\n\nQueue\n    = distribute work\n\nScheduler\n    = should know WHEN\n\nWorkers\n    = should know HOW\n\nMonitoring\n    = execution health is as important as business logic\n</code></pre></div>"
    },
    {
      "title": "Production Case Study: Interest Calculation",
      "diagram": null,
      "body": "<p>Imagine a bank that credits daily savings interest.</p>\n<p>Requirements:</p>\n<ul>\n<li>Run at <strong>00:05 IST</strong> every day.</li>\n<li>Process <strong>80 million accounts</strong>.</li>\n<li>Must never credit interest twice.</li>\n<li>Must resume after failure.</li>\n<li>Finish within two hours.</li>\n<li>Produce an audit report.</li>\n</ul>\n<p>A robust architecture could be:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Kubernetes CronJob\n        │\n        ▼\nInterest Scheduler\n        │\n        ▼\nPublish 80,000 partition jobs (1,000 accounts each)\n        │\n        ▼\nMessage Queue\n        │\n        ▼\nWorker Fleet\n        │\n        ▼\nInterest Service\n</code></pre></div>\n<p>Each worker:</p>\n<ul>\n<li>Claims one partition.</li>\n<li>Processes accounts in chunks (e.g., 100 accounts/transaction).</li>\n<li>Records checkpoints.</li>\n<li>Uses an idempotency key such as <code class=\"inline-code\">(account_id, business_date)</code> to prevent duplicate credits.</li>\n<li>Emits progress metrics.</li>\n</ul>\n<p>If a worker crashes after processing 700 of its 1,000 accounts, another worker resumes from the checkpoint instead of starting over. If the scheduler accidentally launches twice, idempotency prevents duplicate interest credits.</p>\n<p>Notice how the \"cron job\" itself performs almost no business work—it coordinates a distributed workflow.</p>\n\n<p>Tomorrow we'll cover <strong>WebSockets</strong>, including connection lifecycle, scaling millions of persistent connections, sticky sessions, authentication, backpressure, presence, heartbeats, reconnection, fan-out, and how systems like chat applications and live trading platforms are built.</p>"
    }
  ],
  "keyTakeaways": [
    "An embedded scheduler runs once per replica unless coordination exists.",
    "Locks and leader election reduce duplicates; idempotency remains the final protection.",
    "Define missed-run, overlap, catch-up, time-zone, and DST semantics explicitly.",
    "Checkpoint large jobs and fan work out to queues rather than one giant transaction.",
    "Persist execution state and alert on business deadlines, not only process errors."
  ]
};
