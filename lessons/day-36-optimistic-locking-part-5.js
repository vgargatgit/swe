// Day 36 full lesson, part 5 of 5.
(()=>{const lesson=window.FULL_LESSONS['day-36-optimistic-locking'];lesson.sections.push({title:"16. Production incidents to recognize",body:`<h3>62. Production incident: admin screens overwrite changes</h3>
<p>Two support agents open the same merchant configuration.</p>
<p>Agent A enables:</p>
<div class="code-block"><span class="code-label">text</span><pre>instant settlement
</pre></div>
<p>Agent B updates:</p>
<div class="code-block"><span class="code-label">text</span><pre>merchant display name
</pre></div>
<p>Both forms POST the complete record.</p>
<p>B saves last and silently resets:</p>
<div class="code-block"><span class="code-label">text</span><pre>instant settlement = false
</pre></div>
<p>No database failure occurs.</p>
<p>Root cause:</p>
<div class="code-block"><span class="code-label">text</span><pre>full-object stale update
without versioning
</pre></div>
<p>Fix:</p>
<div class="code-block"><span class="code-label">text</span><pre>version/ETag
+
PATCH where appropriate
+
conflict UI
</pre></div>
<p>This is one of the classic real-world uses of optimistic locking.</p>
<h3>63. Production incident: automatic retry overwrites newer decision</h3>
<p>Teacher/admin review status:</p>
<div class="code-block"><span class="code-label">text</span><pre>APPROVED
</pre></div>
<p>A stale process attempts:</p>
<div class="code-block"><span class="code-label">text</span><pre>PENDING
</pre></div>
<p>Optimistic conflict correctly occurs.</p>
<p>Generic retry logic re-reads:</p>
<div class="code-block"><span class="code-label">text</span><pre>APPROVED
</pre></div>
<p>then blindly reapplies:</p>
<div class="code-block"><span class="code-label">text</span><pre>set PENDING
</pre></div>
<p>and succeeds.</p>
<p>Technically, the optimistic retry worked.</p>
<p>Semantically, it destroyed the newer human decision.</p>
<p>Lesson:</p>
<div class="callout">
<p><strong>A concurrency conflict is information. Automatic retry must not erase the meaning of that information.</strong></p>
</div>
<p>Reevaluate whether the command is still valid against current state.</p>
<h3>64. Production incident: hot row retry storm</h3>
<p>Flash sale:</p>
<div class="code-block"><span class="code-label">text</span><pre>inventory row quantity = 10,000
</pre></div>
<p>Thousands of buyers use entity-level optimistic locking.</p>
<p>Most transactions:</p>
<div class="code-block"><span class="code-label">text</span><pre>read same version
one wins
others conflict
retry
</pre></div>
<p>Database CPU spikes even though the business operation is trivial.</p>
<p>Fix:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE inventory
SET quantity = quantity - 1
WHERE product_id = ?
  AND quantity &gt; 0;
</pre></div>
<p>or use more scalable reservation architecture.</p>
<p>Atomic SQL beats generic ORM concurrency here.</p>
<h3>65. Production incident: native query bypass</h3>
<p>Application uses <span class="inline-code">@Version</span>.</p>
<p>A nightly job executes:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer
SET status = 'INACTIVE'
WHERE last_login &lt; ?;
</pre></div>
<p>It does not increment:</p>
<div class="code-block"><span class="code-label">text</span><pre>version
</pre></div>
<p>Meanwhile an admin has version 7 loaded.</p>
<p>Batch changes status.</p>
<p>Version remains 7.</p>
<p>Admin saves stale entity:</p>
<div class="code-block"><span class="code-label">text</span><pre>version 7 still matches
</pre></div>
<p>and overwrites batch state.</p>
<p>Fix:</p>
<div class="code-block"><span class="code-label">text</span><pre>all writers participate in version protocol
</pre></div>
<p>or use business-specific conditional updates that cannot conflict incorrectly.</p>`},{title:"17. Interview-ready explanations",body:`<h3>66. Interview question: What is optimistic locking?</h3>
<p>A strong answer:</p>
<div class="callout">
<p>Optimistic locking detects concurrent modification rather than preventing it. A row carries a version, and an update includes the version originally read in its <span class="inline-code">WHERE</span> clause. If another transaction changed the row first, its version advances, so the stale update affects zero rows and fails with a concurrency conflict.</p>
<p>It works well when conflicts are uncommon because readers and writers do not need to hold locks while doing application work.</p>
</div>
<h3>67. Interview question: Why use a version instead of checking values?</h3>
<p>You could write:</p>
<div class="code-block"><span class="code-label">sql</span><pre>WHERE email = :oldEmail
  AND phone = :oldPhone
  AND status = :oldStatus
</pre></div>
<p>but version is cleaner:</p>
<div class="code-block"><span class="code-label">sql</span><pre>WHERE version = 17
</pre></div>
<p>Benefits:</p>
<div class="code-block"><span class="code-label">text</span><pre>small predicate
stable semantics
works when many columns exist
tracks any protected mutation
easy API token
</pre></div>
<p>Checking individual values can be appropriate for narrow business transitions, but version is a convenient aggregate-level concurrency token.</p>
<h3>68. Interview question: Should you always retry an optimistic conflict?</h3>
<div class="callout">
<p>No. I retry only if the business operation can safely be reapplied against fresh state. For example, an increment or an idempotent state computation may be retryable. If two users made conflicting semantic decisions, such as changing an approval state differently, I would surface the conflict instead of making whichever update retries last automatically win.</p>
<p>Any retry should re-read state and re-evaluate the business rule in a new transaction.</p>
</div>
<h3>69. Interview question: Optimistic or pessimistic locking?</h3>
<div class="callout">
<p>Optimistic locking is preferable when contention is low because it avoids lock waits and lets requests proceed concurrently. The cost appears only when a conflict occurs, at which point one operation must retry or fail.</p>
<p>Pessimistic locking is more appropriate when contention is high, when conflicts are expected, or when the work performed after reading is expensive enough that retrying would be wasteful. It trades retries for blocking and introduces lock-timeout and deadlock risks.</p>
</div>
<h3>70. Interview question: Does optimistic locking prevent all race conditions?</h3>
<div class="callout">
<p>No. Entity versioning primarily prevents lost updates where competing transactions modify the same versioned row. It does not automatically prevent write skew or invariants spanning multiple rows. For those I may need serializable isolation, pessimistic locks, database constraints, an invariant-owner row, or an atomic conditional statement.</p>
</div>
<p>That last sentence distinguishes a strong concurrency answer from a superficial <span class="inline-code">@Version</span> answer.</p>
<h3>71. Interview question: How would you expose it through REST?</h3>
<div class="callout">
<p>I would return a representation version using an ETag and require modifying requests to send <span class="inline-code">If-Match</span>. The server performs the update only if the resource still matches that version. If it has changed, I return <span class="inline-code">412 Precondition Failed</span> so the caller can reload and decide how to merge. The database update should still enforce the version atomically; HTTP validation must not replace database concurrency control.</p>
</div>
<h3>72. Interview question: Why not use a distributed lock?</h3>
<p>If the data resides in one relational database, a distributed lock is often unnecessary.</p>
<p>The database can already provide:</p>
<div class="code-block"><span class="code-label">text</span><pre>atomic conditional update
row locking
transaction isolation
version checks
constraints
</pre></div>
<p>Adding Redis/etcd lock creates:</p>
<div class="code-block"><span class="code-label">text</span><pre>another failure mode
another network hop
lease expiration complexity
fencing problem
</pre></div>
<p>Use the strongest local primitive available where the invariant lives.</p>
<p>Distributed locking is appropriate when the protected resource genuinely spans processes/systems and cannot be coordinated locally. It appears two lessons from now.</p>`},{title:"18. Design checklist",body:`<h3>73. Design checklist</h3>
<p>For a read-modify-write operation, ask:</p>
<ol>
<li>Can two requests update this state concurrently?</li>
<li>What business invariant could be lost?</li>
<li>Can the operation be expressed as one atomic SQL statement?</li>
<li>If not, what is the consistency boundary?</li>
<li>Does a version column represent that boundary correctly?</li>
<li>Does every writer update/check the version?</li>
<li>Are native/bulk queries bypassing it?</li>
<li>Are conflicts expected or exceptional?</li>
<li>Can the operation safely be retried?</li>
<li>Does retry re-read and reevaluate fresh state?</li>
<li>Are retries bounded?</li>
<li>Could repeated retries amplify load?</li>
<li>Should conflicts instead be surfaced to the user?</li>
<li>Does the REST API expose stale-write protection?</li>
<li>Would <span class="inline-code">ETag</span>/<span class="inline-code">If-Match</span> help?</li>
<li>Does the invariant span multiple rows?</li>
<li>Could write skew still occur?</li>
<li>Would a database constraint be stronger?</li>
<li>Would pessimistic locking be more efficient under contention?</li>
<li>Are external side effects executed before the optimistic commit?</li>
<li>If so, are they idempotent and workflow-safe?</li>
<li>Are optimistic conflicts observable as metrics?</li>
<li>Is version granularity causing false conflicts?</li>
<li>Does aggregate decomposition make sense?</li>
<li>Have concurrency tests actually executed competing transactions?</li>
</ol>`},{title:"19. Key takeaways and the deeper principle",body:`<div class="code-block"><span class="code-label">text</span><pre>Optimistic locking
    = detect conflict rather than block it

Version column
    = compare-and-swap token

UPDATE ... WHERE version = ?
    = atomic stale-state check

@Version
    = JPA optimistic concurrency mechanism

Lost update
    = primary anomaly prevented

Retry
    = re-read + reapply business operation

Blind retry
    = can destroy newer decisions

Low contention
    = optimistic sweet spot

High contention
    = retry storm risk

Atomic SQL
    = often better than read-modify-write

ETag / If-Match
    = HTTP optimistic concurrency

409 / 412
    = expose meaningful stale-write conflict

Write skew
    = not solved by row-level versioning

Multi-row invariant
    = may need stronger isolation/locking/constraint

External side effects
    = do not blindly replay after optimistic conflict

Versioning
    = useful in DB, APIs, events, caches and projections
</pre></div>
<p>The deeper principle is:</p>
<div class="callout">
<p><strong>Optimistic locking does not make concurrent operations safe by retrying them until they succeed. It makes concurrency visible. Once a conflict is detected, the system must decide whether the business operation is still valid against the new state.</strong></p>
</div>
<p>The next topic is <strong>Pessimistic Locking</strong>: <span class="inline-code">SELECT ... FOR UPDATE</span>, row locks, lock queues, lock timeouts, <span class="inline-code">NOWAIT</span>, <span class="inline-code">SKIP LOCKED</span>, deadlocks, lock ordering, transaction boundaries, hot rows, inventory/wallet examples, and how to decide when blocking a competing transaction is better than letting it work and fail later.</p>`});})();