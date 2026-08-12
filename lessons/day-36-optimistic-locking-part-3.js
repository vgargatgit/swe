// Day 36 full lesson, part 3 of 5.
(()=>{const lesson=window.FULL_LESSONS['day-36-optimistic-locking'];lesson.sections.push({title:"8. Limits of row versions: write skew, phantoms, and isolation",diagram:`sequenceDiagram
  participant A as Transaction A
  participant B as Transaction B
  participant RA as Doctor A row
  participant RB as Doctor B row
  A->>RA: Read on-call true
  A->>RB: Read on-call true
  B->>RA: Read on-call true
  B->>RB: Read on-call true
  A->>RA: Set A off-call
  B->>RB: Set B off-call
  Note over A,B: Different rows are updated, so no row-version conflict occurs
  Note over RA,RB: Final state violates the multi-row invariant`,body:`<h3>27. Write skew: optimistic locking does not solve everything</h3>
<p>Here is a deeper concurrency anomaly.</p>
<p>Suppose hospital rule:</p>
<div class="code-block"><span class="code-label">text</span><pre>At least one doctor must remain on call.
</pre></div>
<p>Rows:</p>
<div class="code-block"><span class="code-label">text</span><pre>Doctor A: on_call = true
Doctor B: on_call = true
</pre></div>
<p>Transaction A:</p>
<div class="code-block"><span class="code-label">text</span><pre>reads A=true, B=true
sets A=false
</pre></div>
<p>Transaction B:</p>
<div class="code-block"><span class="code-label">text</span><pre>reads A=true, B=true
sets B=false
</pre></div>
<p>Each updates a different row.</p>
<p>Each row has its own version.</p>
<p>No optimistic-lock conflict occurs.</p>
<p>Final:</p>
<div class="code-block"><span class="code-label">text</span><pre>A=false
B=false
</pre></div>
<p>Invariant violated.</p>
<p>This is <strong>write skew</strong>.</p>
<h3>28. Why &#96;@Version&#96; misses write skew</h3>
<p>Optimistic row versioning detects:</p>
<div class="code-block"><span class="code-label">text</span><pre>two transactions update the same versioned row
</pre></div>
<p>In write skew:</p>
<div class="code-block"><span class="code-label">text</span><pre>Transaction A updates row A.
Transaction B updates row B.
</pre></div>
<p>No row is modified by both.</p>
<p>The invariant spans:</p>
<div class="code-block"><span class="code-label">text</span><pre>multiple rows
</pre></div>
<p>Therefore no row-level version conflict occurs.</p>
<p>Solutions may include:</p>
<div class="code-block"><span class="code-label">text</span><pre>SERIALIZABLE isolation
pessimistic locking of relevant rows
constraint redesign
single aggregate/version row
explicit invariant record
</pre></div>
<p>Optimistic locking is not a substitute for understanding transaction isolation.</p>
<h3>29. Phantom-style invariants</h3>
<p>Suppose rule:</p>
<div class="code-block"><span class="code-label">text</span><pre>At most 10 active reservations for an event.
</pre></div>
<p>Two transactions both execute:</p>
<div class="code-block"><span class="code-label">sql</span><pre>SELECT COUNT(*)
FROM reservations
WHERE event_id = 1
  AND status = 'ACTIVE';
</pre></div>
<p>Both see:</p>
<div class="code-block"><span class="code-label">text</span><pre>9
</pre></div>
<p>Each inserts one reservation.</p>
<p>Final:</p>
<div class="code-block"><span class="code-label">text</span><pre>11
</pre></div>
<p>No existing row was concurrently updated.</p>
<p>A <span class="inline-code">@Version</span> on each reservation cannot prevent it.</p>
<p>Potential solutions include:</p>
<div class="code-block"><span class="code-label">text</span><pre>atomic counter row
database constraint
serializable isolation
lock event row
reservation token allocation
</pre></div>
<p>Again, identify the invariant's true concurrency boundary.</p>
<h3>30. Optimistic locking versus isolation level</h3>
<p>These solve overlapping but different problems.</p>
<p>Optimistic locking:</p>
<div class="code-block"><span class="code-label">text</span><pre>explicitly detects stale writes to protected state
</pre></div>
<p>Isolation level:</p>
<div class="code-block"><span class="code-label">text</span><pre>controls which interleavings/snapshots transactions can observe
</pre></div>
<p>At <span class="inline-code">READ COMMITTED</span>, <span class="inline-code">@Version</span> is often very useful.</p>
<p>At stronger isolation levels, the database may detect additional anomalies.</p>
<p>Even <span class="inline-code">REPEATABLE READ</span> does not automatically solve every write-skew case depending on the database's implementation.</p>
<p><span class="inline-code">SERIALIZABLE</span> aims to make concurrent transactions behave as though serially executed, but comes with:</p>
<div class="code-block"><span class="code-label">text</span><pre>abort/retry cost
reduced concurrency
more conflict detection
</pre></div>
<p>Use the mechanism that protects the actual invariant.</p>`},{title:"9. High contention, retry amplification, jitter, and observability",diagram:`flowchart LR
  Hot[Hot row] --> Conflicts[Many optimistic conflicts]
  Conflicts --> Retries[More retries]
  Retries --> Load[Higher database load]
  Load --> Wider[Longer conflict windows]
  Wider --> Conflicts
  Metrics[Conflict and retry metrics] -. reveal .-> Hot`,body:`<h3>31. High contention</h3>
<p>Suppose 1,000 requests/sec update the same row:</p>
<div class="code-block"><span class="code-label">text</span><pre>global_counter
</pre></div>
<p>Optimistic locking produces:</p>
<div class="code-block"><span class="code-label">text</span><pre>many conflicts
many retries
more database load
</pre></div>
<p>Example:</p>
<div class="code-block"><span class="code-label">text</span><pre>100 writers read version 10

1 succeeds with version 11
99 fail

99 re-read version 11

1 succeeds with version 12
98 fail
...
</pre></div>
<p>This is pathological.</p>
<p>Optimistic locking works best when:</p>
<div class="code-block"><span class="code-label">text</span><pre>conflict probability is low
</pre></div>
<p>For hot resources, consider:</p>
<div class="code-block"><span class="code-label">text</span><pre>atomic SQL
pessimistic locking
queue/serialization
partitioning ownership
distributed counter
append model
</pre></div>
<h3>32. Retry amplification</h3>
<p>Suppose:</p>
<div class="code-block"><span class="code-label">text</span><pre>original load = 1,000 writes/sec
conflict rate = 50%
</pre></div>
<p>Retries can create:</p>
<div class="code-block"><span class="code-label">text</span><pre>1,500+
DB attempts/sec
</pre></div>
<p>Higher load increases conflict windows.</p>
<p>Higher conflicts create more retries.</p>
<p>You can get:</p>
<div class="code-block"><span class="code-label">text</span><pre>contention
    ↓
retries
    ↓
more contention
    ↓
more retries
</pre></div>
<p>This is a positive feedback loop.</p>
<p>Retry should therefore be:</p>
<div class="code-block"><span class="code-label">text</span><pre>bounded
backed off
measured
</pre></div>
<p>not infinite.</p>
<h3>33. Retry jitter</h3>
<p>Without jitter:</p>
<div class="code-block"><span class="code-label">text</span><pre>100 transactions conflict
all retry after exactly 10 ms
</pre></div>
<p>They collide again.</p>
<p>With randomized delay:</p>
<div class="code-block"><span class="code-label">text</span><pre>7 ms
11 ms
18 ms
23 ms
...
</pre></div>
<p>retries spread out.</p>
<p>For low conflict, immediate retry may be fine.</p>
<p>For moderate contention:</p>
<div class="code-block"><span class="code-label">text</span><pre>small exponential backoff + jitter
</pre></div>
<p>can help.</p>
<p>But if contention is inherently high, changing the concurrency strategy is usually better than ever-more-sophisticated retries.</p>
<h3>34. Measuring conflict rate</h3>
<p>Expose metrics such as:</p>
<div class="code-block"><span class="code-label">text</span><pre>optimistic_lock_conflicts_total
retries_total
retry_exhausted_total
conflict_rate by entity/operation
retry latency
</pre></div>
<p>A conflict is not necessarily an error.</p>
<p>A low rate may be normal.</p>
<p>But:</p>
<div class="code-block"><span class="code-label">text</span><pre>conflict rate suddenly jumps from 0.1% to 30%
</pre></div>
<p>may indicate:</p>
<ul>
<li>hot record</li>
<li>new batch job</li>
<li>changed traffic distribution</li>
<li>overly coarse aggregate</li>
<li>unexpected duplicate requests</li>
</ul>
<p>Concurrency conflicts are useful observability signals.</p>
<h3>35. Do not log every conflict as ERROR</h3>
<p>If the system automatically handles expected low-rate conflicts:</p>
<div class="code-block"><span class="code-label">text</span><pre>WARN/DEBUG or metric
</pre></div>
<p>may be more appropriate.</p>
<p>Otherwise production logs fill with false alarms.</p>
<p>But retry exhaustion or conflicts involving high-value workflows deserve stronger visibility.</p>
<p>Distinguish:</p>
<div class="code-block"><span class="code-label">text</span><pre>expected concurrency signal
</pre></div>
<p>from:</p>
<div class="code-block"><span class="code-label">text</span><pre>failed user operation
</pre></div>`},{title:"10. Long user think-time, conflict UX, and explicit overwrite",diagram:`sequenceDiagram
  participant User
  participant API
  participant Admin
  User->>API: Open editor at version 17
  Admin->>API: Update resource to version 18
  User->>API: Save with expected version 17
  API-->>User: Conflict with current version 18
  User->>API: Reload, merge, or explicitly force overwrite
  Note over User,API: No database lock is held during human think-time`,body:`<h3>36. Optimistic locking and long user think-time</h3>
<p>Optimistic locking is especially useful when editing happens outside a database transaction.</p>
<p>Example:</p>
<div class="code-block"><span class="code-label">text</span><pre>09:00 User opens profile editor.
09:10 Admin updates profile.
09:30 User clicks Save.
</pre></div>
<p>You obviously cannot hold a database row lock for 30 minutes.</p>
<p>Versioning works perfectly:</p>
<div class="code-block"><span class="code-label">text</span><pre>User loaded version 17.
Current version = 18.
Save rejected.
</pre></div>
<p>This is why optimistic concurrency is common in web applications.</p>
<p>Pessimistic DB locks should generally not span human interaction.</p>
<h3>37. Conflict UX</h3>
<p>A bad response:</p>
<div class="code-block"><span class="code-label">text</span><pre>500 Internal Server Error
</pre></div>
<p>A better response:</p>
<div class="code-block"><span class="code-label">http</span><pre>409 Conflict
</pre></div>
<p>with:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  "code": "RESOURCE_MODIFIED",
  "message": "The resource was modified after you loaded it.",
  "currentVersion": 18
}
</pre></div>
<p>For interactive editors, UI might show:</p>
<div class="code-block"><span class="code-label">text</span><pre>Your version
Current version
</pre></div>
<p>and allow:</p>
<div class="code-block"><span class="code-label">text</span><pre>reload
merge
overwrite intentionally
</pre></div>
<p>Concurrency control is partly a product/UX problem.</p>
<h3>38. Force overwrite</h3>
<p>Sometimes user explicitly chooses:</p>
<div class="code-block"><span class="code-label">text</span><pre>Overwrite anyway.
</pre></div>
<p>That may be valid.</p>
<p>Do not implement by simply removing concurrency checks everywhere.</p>
<p>Instead create an explicit operation:</p>
<div class="code-block"><span class="code-label">text</span><pre>force update
</pre></div>
<p>with appropriate authorization and audit logging.</p>
<p>This makes conflict override intentional rather than accidental.</p>`},{title:"11. Versions across services, events, tokens, deletes, creates, and idempotency",diagram:`flowchart LR
  Aggregate[(Aggregate state)] --> DB[Persistence version]
  Aggregate --> API[Representation ETag]
  Aggregate --> Event[Event sequence]
  Aggregate --> Cache[Cache or projection revision]
  DB --> Align{Do the semantics align?}
  API --> Align
  Event --> Align
  Cache --> Align
  Align -- yes --> Reuse[One revision may serve several roles]
  Align -- no --> Separate[Use distinct version concepts]`,body:`<h3>39. Optimistic locking across services</h3>
<p>Suppose Service A and Service B can both write the same database row.</p>
<p>Both must respect:</p>
<div class="code-block"><span class="code-label">text</span><pre>version
</pre></div>
<p>If B executes:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE account
SET ...
WHERE id = ?
</pre></div>
<p>without version check, A's optimistic locking guarantee is undermined.</p>
<p>This is one reason service ownership matters:</p>
<div class="callout">
<p>Prefer one service owning mutations of an aggregate.</p>
</div>
<p>Cross-service shared-database writes make concurrency much harder to reason about.</p>
<h3>40. Version in events</h3>
<p>Version columns are also useful beyond the database.</p>
<p>Source:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order version = 41
</pre></div>
<p>publishes:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  "orderId": 123,
  "version": 41,
  "status": "PAID"
}
</pre></div>
<p>Consumer currently has:</p>
<div class="code-block"><span class="code-label">text</span><pre>version = 42
</pre></div>
<p>It ignores event 41.</p>
<p>The same version participates in:</p>
<div class="code-block"><span class="code-label">text</span><pre>optimistic writes
event ordering
projection convergence
cache invalidation
ETags
</pre></div>
<p>One carefully designed aggregate version can be powerful throughout the architecture.</p>
<h3>41. But do not overload version semantics blindly</h3>
<p>Database entity version may advance for:</p>
<div class="code-block"><span class="code-label">text</span><pre>internal audit metadata change
</pre></div>
<p>while API representation remains unchanged.</p>
<p>Should HTTP ETag change?</p>
<p>Maybe.</p>
<p>Maybe not.</p>
<p>Likewise, projection version may represent:</p>
<div class="code-block"><span class="code-label">text</span><pre>business event sequence
</pre></div>
<p>rather than JPA dirty-write count.</p>
<p>Different version concepts can be appropriate:</p>
<div class="code-block"><span class="code-label">text</span><pre>persistence version
domain version
API representation version
event sequence
</pre></div>
<p>Reuse them only if their semantics genuinely align.</p>
<h3>42. Timestamp-based optimistic locking</h3>
<p>Some systems use:</p>
<div class="code-block"><span class="code-label">text</span><pre>last_updated_at
</pre></div>
<p>instead of an integer version.</p>
<p>Update:</p>
<div class="code-block"><span class="code-label">sql</span><pre>WHERE last_updated_at = :originalTimestamp
</pre></div>
<p>This can work, but integer versions are usually safer.</p>
<p>Timestamp risks include:</p>
<div class="code-block"><span class="code-label">text</span><pre>precision differences
rounding
clock semantics
multiple writes within same timestamp precision
driver conversions
timezone confusion
</pre></div>
<p>A monotonic integer version is simpler.</p>
<h3>43. UUID version tokens</h3>
<p>Another option:</p>
<div class="code-block"><span class="code-label">text</span><pre>version_token = random UUID
</pre></div>
<p>Each update generates a new token.</p>
<p>Update:</p>
<div class="code-block"><span class="code-label">sql</span><pre>WHERE version_token = :oldToken
</pre></div>
<p>This works as an opaque compare-and-swap token.</p>
<p>Advantages:</p>
<div class="code-block"><span class="code-label">text</span><pre>does not expose update count
easy API ETag token
</pre></div>
<p>Disadvantages:</p>
<div class="code-block"><span class="code-label">text</span><pre>cannot order versions
larger storage/index key
</pre></div>
<p>An integer is usually preferable when ordering is useful.</p>
<h3>44. Optimistic locking and soft deletes</h3>
<p>Suppose:</p>
<div class="code-block"><span class="code-label">text</span><pre>version 5:
active row
</pre></div>
<p>Transaction A loads it.</p>
<p>Transaction B soft-deletes:</p>
<div class="code-block"><span class="code-label">text</span><pre>deleted = true
version = 6
</pre></div>
<p>A later tries to update version 5.</p>
<p>Optimistic check fails.</p>
<p>Good.</p>
<p>Without versioning, A might accidentally resurrect or modify the deleted object.</p>
<p>Soft-delete operations should participate in the same concurrency protocol.</p>
<h3>45. Delete with version</h3>
<p>Delete can itself be conditional:</p>
<div class="code-block"><span class="code-label">sql</span><pre>DELETE FROM customer
WHERE id = ?
  AND version = ?;
</pre></div>
<p>If zero rows are deleted:</p>
<div class="code-block"><span class="code-label">text</span><pre>already deleted
or changed since read
</pre></div>
<p>This prevents deleting a newer state that the caller never reviewed.</p>
<p>JPA optimistic deletion semantics can use the version column as well.</p>
<h3>46. Create races</h3>
<p>Optimistic versioning applies to existing rows.</p>
<p>For creation:</p>
<div class="code-block"><span class="code-label">text</span><pre>Two requests try creating same username.
</pre></div>
<p>There is no version yet.</p>
<p>The correct mechanism is usually:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UNIQUE(username)
</pre></div>
<p>One insert succeeds.</p>
<p>One fails.</p>
<p>Do not solve create races with:</p>
<div class="code-block"><span class="code-label">text</span><pre>SELECT username first
then INSERT
</pre></div>
<p>because both can see no row.</p>
<p>Database uniqueness is the appropriate atomic concurrency primitive.</p>
<h3>47. Optimistic locking plus idempotency</h3>
<p>These solve different races.</p>
<p>Suppose payment request is retried.</p>
<p>Idempotency answers:</p>
<div class="code-block"><span class="code-label">text</span><pre>Is this the same logical operation again?
</pre></div>
<p>Optimistic locking answers:</p>
<div class="code-block"><span class="code-label">text</span><pre>Has this state changed since this transaction read it?
</pre></div>
<p>A robust wallet debit might use:</p>
<div class="code-block"><span class="code-label">text</span><pre>idempotency key
+
wallet version/atomic balance condition
+
ledger transaction
</pre></div>
<p>Each solves a distinct concurrency problem.</p>`});})();