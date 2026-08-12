// Day 36 full lesson, part 2 of 5.
(()=>{const lesson=window.FULL_LESSONS['day-36-optimistic-locking'];lesson.sections.push({title:"5. End-to-end REST concurrency: versions, ETags, PATCH, and dirty fields",diagram:`sequenceDiagram
  participant Client
  participant API
  participant DB
  Client->>API: GET resource
  API->>DB: Read state and version 17
  API-->>Client: 200 OK with ETag 17
  Client->>API: PUT or PATCH with If-Match 17
  API->>DB: UPDATE where version is 17
  alt resource unchanged
    DB-->>API: 1 row updated
    API-->>Client: Success with ETag 18
  else resource changed
    DB-->>API: 0 rows updated
    API-->>Client: 412 Precondition Failed
  end`,body:`<h3>11. REST optimistic concurrency</h3>
<p>Optimistic concurrency should often extend beyond JPA into the API contract.</p>
<p>Suppose client GETs:</p>
<div class="code-block"><span class="code-label">http</span><pre>GET /customers/42
</pre></div>
<p>Response:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  "id": 42,
  "email": "old@example.com",
  "version": 17
}
</pre></div>
<p>Later client updates:</p>
<div class="code-block"><span class="code-label">http</span><pre>PUT /customers/42
</pre></div>
<p>with:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  "email": "new@example.com",
  "version": 17
}
</pre></div>
<p>Server updates only if:</p>
<div class="code-block"><span class="code-label">text</span><pre>current version = 17
</pre></div>
<p>If current version is 18:</p>
<div class="code-block"><span class="code-label">text</span><pre>client edited stale state
</pre></div>
<p>Return:</p>
<div class="code-block"><span class="code-label">http</span><pre>409 Conflict
</pre></div>
<p>or, using HTTP conditional semantics, often:</p>
<div class="code-block"><span class="code-label">http</span><pre>412 Precondition Failed
</pre></div>
<p>depending on the API design.</p>
<h3>12. ETags</h3>
<p>HTTP already has a concurrency mechanism.</p>
<p>GET:</p>
<div class="code-block"><span class="code-label">http</span><pre>GET /customers/42
</pre></div>
<p>Response:</p>
<div class="code-block"><span class="code-label">http</span><pre>HTTP/1.1 200 OK
ETag: "17"
</pre></div>
<p>Client changes data and sends:</p>
<div class="code-block"><span class="code-label">http</span><pre>PUT /customers/42
If-Match: "17"
</pre></div>
<p>Server means:</p>
<div class="code-block"><span class="code-label">text</span><pre>Apply this update only if the current representation still has ETag 17.
</pre></div>
<p>If current version is:</p>
<div class="code-block"><span class="code-label">text</span><pre>18
</pre></div>
<p>return:</p>
<div class="code-block"><span class="code-label">http</span><pre>412 Precondition Failed
</pre></div>
<p>This is HTTP-level compare-and-swap.</p>
<h3>13. ETag does not have to expose DB version</h3>
<p>You could use:</p>
<div class="code-block"><span class="code-label">text</span><pre>ETag: "17"
</pre></div>
<p>directly.</p>
<p>Or generate an opaque value:</p>
<div class="code-block"><span class="code-label">text</span><pre>ETag: "af82b013..."
</pre></div>
<p>based on:</p>
<ul>
<li>database version</li>
<li>resource revision</li>
<li>content hash</li>
<li>opaque version token</li>
</ul>
<p>Opaque values have advantages:</p>
<div class="code-block"><span class="code-label">text</span><pre>do not expose internal persistence details
can change storage implementation later
</pre></div>
<p>The key property is:</p>
<div class="code-block"><span class="code-label">text</span><pre>ETag changes whenever conflicting modifications occur.
</pre></div>
<h3>14. &#96;If-Match&#96; versus &#96;If-None-Match&#96;</h3>
<p>Concurrency update:</p>
<div class="code-block"><span class="code-label">http</span><pre>If-Match
</pre></div>
<p>means:</p>
<div class="code-block"><span class="code-label">text</span><pre>modify only if resource still matches this version
</pre></div>
<p>Creation semantics can sometimes use:</p>
<div class="code-block"><span class="code-label">http</span><pre>If-None-Match: *
</pre></div>
<p>meaning:</p>
<div class="code-block"><span class="code-label">text</span><pre>perform only if resource does not already exist
</pre></div>
<p>That can be useful for conditional creation APIs.</p>
<p>HTTP conditional requests are underused but elegant concurrency tools.</p>
<h3>15. PATCH can reduce conflicts</h3>
<p>Suppose two users change unrelated fields.</p>
<p>A:</p>
<div class="code-block"><span class="code-label">text</span><pre>email
</pre></div>
<p>B:</p>
<div class="code-block"><span class="code-label">text</span><pre>phone
</pre></div>
<p>A full <span class="inline-code">PUT</span> sends the whole object and can create lost updates.</p>
<p>A narrow <span class="inline-code">PATCH</span>:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  "email": "new@example.com"
}
</pre></div>
<p>may avoid overwriting unrelated fields.</p>
<p>However:</p>
<div class="code-block"><span class="code-label">text</span><pre>PATCH
</pre></div>
<p>does not remove concurrency problems.</p>
<p>If both users patch:</p>
<div class="code-block"><span class="code-label">text</span><pre>email
</pre></div>
<p>you still need version checking.</p>
<p>And sometimes two fields participate in one invariant, so apparently independent patches can still conflict logically.</p>
<h3>16. Dirty-field updates</h3>
<p>Hibernate can sometimes update only modified fields, depending on mapping/configuration.</p>
<p>Suppose A changes:</p>
<div class="code-block"><span class="code-label">text</span><pre>email
</pre></div>
<p>and B changes:</p>
<div class="code-block"><span class="code-label">text</span><pre>phone
</pre></div>
<p>SQL might become:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer SET email = ? ...
</pre></div>
<p>versus:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer SET phone = ? ...
</pre></div>
<p>Then both updates could coexist.</p>
<p>But whether they <strong>should</strong> coexist is a domain question.</p>
<p>If changes are logically independent, this can improve concurrency.</p>
<p>If any concurrent modification should force the user to reconsider, entity-level versioning is safer.</p>`},{title:"6. Version granularity, aggregate boundaries, and bypassed writers",diagram:`flowchart LR
  JPA[JPA writes] --> Protocol[One aggregate version protocol]
  Native[Native SQL] --> Protocol
  Batch[Batch jobs] --> Protocol
  Procedure[Stored procedures] --> Protocol
  Service[Other services] --> Protocol
  Protocol --> Rule[Every protected writer checks and advances the version]`,body:`<h3>17. Version granularity</h3>
<p>Suppose a huge <span class="inline-code">Customer</span> aggregate contains:</p>
<div class="code-block"><span class="code-label">text</span><pre>profile
preferences
billing settings
security settings
notification settings
</pre></div>
<p>One version column means:</p>
<div class="code-block"><span class="code-label">text</span><pre>change notification setting
</pre></div>
<p>can conflict with:</p>
<div class="code-block"><span class="code-label">text</span><pre>change profile photo
</pre></div>
<p>even though the operations are independent.</p>
<p>This is a <strong>false conflict</strong>.</p>
<p>Possible solutions:</p>
<div class="code-block"><span class="code-label">text</span><pre>split aggregate
separate tables/entities
use field-specific revisions
use command-specific conditional updates
</pre></div>
<p>Optimistic locking often reveals that your aggregate is too coarse.</p>
<h3>18. Aggregate boundary matters</h3>
<p>A useful rule:</p>
<div class="callout">
<p>One optimistic version should usually represent one consistency boundary.</p>
</div>
<p>If several fields must change together under one invariant:</p>
<div class="code-block"><span class="code-label">text</span><pre>one aggregate/version
</pre></div>
<p>makes sense.</p>
<p>If unrelated business concerns constantly conflict:</p>
<div class="code-block"><span class="code-label">text</span><pre>aggregate may need decomposition
</pre></div>
<p>Concurrency control and domain modeling are connected.</p>
<h3>19. Direct SQL can bypass JPA versioning</h3>
<p>Suppose entity uses:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Version
private Long version;
</pre></div>
<p>but someone writes:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer
SET email = ?
WHERE id = ?;
</pre></div>
<p>without:</p>
<div class="code-block"><span class="code-label">text</span><pre>version condition
</pre></div>
<p>Now the row can change without advancing the JPA version.</p>
<p>Hibernate may not detect that modification later.</p>
<p>Every write path affecting the protected aggregate must participate in the version protocol.</p>
<p>This includes:</p>
<div class="code-block"><span class="code-label">text</span><pre>JPA
native SQL
batch jobs
stored procedures
admin scripts
other services
</pre></div>
<p>A version mechanism is only as strong as the least disciplined writer.</p>
<h3>20. Bulk JPQL updates are dangerous</h3>
<p>Example:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Modifying
@Query("""
    update Order o
    set o.status = :status
    where o.createdAt &lt; :cutoff
""")
int expireOrders(...);
</pre></div>
<p>Bulk JPQL updates bypass normal managed-entity dirty checking and can bypass ordinary optimistic version handling unless explicitly designed to update/check versions.</p>
<p>Afterward, the persistence context may contain stale entities.</p>
<p>For bulk operations:</p>
<div class="code-block"><span class="code-label">text</span><pre>consider version bump
clear persistence context
carefully define concurrency semantics
</pre></div>
<p>Do not assume <span class="inline-code">@Version</span> magically protects every bulk update.</p>`},{title:"7. Atomic business transitions can be better than entity retries",diagram:`flowchart LR
  Request[Business command] --> Update[Atomic conditional UPDATE]
  Update --> Result{Rows affected}
  Result -- one --> Applied[Invariant held and transition applied]
  Result -- zero --> Rejected[Predicate no longer held or row was absent]
  Applied --> Commit[Commit once without read-modify-write retry]`,body:`<h3>21. Atomic update can be better than optimistic locking</h3>
<p>Suppose operation is simply:</p>
<div class="code-block"><span class="code-label">text</span><pre>increment counter
</pre></div>
<p>Instead of:</p>
<div class="code-block"><span class="code-label">text</span><pre>read counter
modify
version check
retry
</pre></div>
<p>use:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE counter
SET value = value + 1
WHERE id = ?;
</pre></div>
<p>The database performs the increment atomically.</p>
<p>Similarly:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE inventory
SET quantity = quantity - 1
WHERE product_id = ?
  AND quantity &gt;= 1;
</pre></div>
<p>Then:</p>
<div class="code-block"><span class="code-label">text</span><pre>1 row updated
    reservation succeeded

0 rows
    no inventory
</pre></div>
<p>This often avoids an entire read-modify-write race.</p>
<p>Before adding optimistic locking, ask:</p>
<div class="callout">
<p><strong>Can I express the business state transition atomically in SQL?</strong></p>
</div>
<p>Often that is simpler and faster.</p>
<h3>22. Wallet debit example</h3>
<p>Naïve:</p>
<div class="code-block"><span class="code-label">text</span><pre>Read balance = ₹1000

Application:
1000 - 700 = 300

UPDATE balance = 300
</pre></div>
<p>Concurrent ₹600 debit can cause lost updates or overdraft logic failures.</p>
<p>Better atomic conditional update:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE wallet
SET balance = balance - :amount,
    version = version + 1
WHERE wallet_id = :walletId
  AND balance &gt;= :amount;
</pre></div>
<p>If:</p>
<div class="code-block"><span class="code-label">text</span><pre>rows updated = 1
</pre></div>
<p>funds were reserved/debited.</p>
<p>If:</p>
<div class="code-block"><span class="code-label">text</span><pre>rows updated = 0
</pre></div>
<p>either:</p>
<div class="code-block"><span class="code-label">text</span><pre>insufficient funds
or row missing
</pre></div>
<p>You may distinguish those separately.</p>
<p>For financial systems, the authoritative ledger design may be richer, but the principle stands:</p>
<div class="code-block"><span class="code-label">text</span><pre>push invariant enforcement into an atomic DB operation
</pre></div>
<p>rather than:</p>
<div class="code-block"><span class="code-label">text</span><pre>read → decide → blindly write
</pre></div>
<h3>23. Optimistic locking and ledger systems</h3>
<p>Imagine wallet entity:</p>
<div class="code-block"><span class="code-label">text</span><pre>balance
version
</pre></div>
<p>Transaction:</p>
<div class="code-block"><span class="code-label">text</span><pre>read wallet
verify balance
insert ledger entries
update wallet balance/version
commit
</pre></div>
<p>Two debit transactions race.</p>
<p>One succeeds.</p>
<p>The second receives optimistic conflict.</p>
<p>It then must:</p>
<div class="code-block"><span class="code-label">text</span><pre>re-read balance
re-evaluate whether funds are still sufficient
</pre></div>
<p>This is crucial.</p>
<p>Retry cannot assume:</p>
<div class="code-block"><span class="code-label">text</span><pre>because transaction was valid 20 ms ago,
it is still valid now
</pre></div>
<p>Business predicates must be re-evaluated from fresh state.</p>
<h3>24. Read-modify-write</h3>
<p>Optimistic locking mainly protects the pattern:</p>
<div class="code-block"><span class="code-label">text</span><pre>READ
    ↓
compute new state
    ↓
WRITE
</pre></div>
<p>Examples:</p>
<div class="code-block"><span class="code-label">text</span><pre>balance
status transition
settings update
inventory quantity
workflow state
versioned document
</pre></div>
<p>Pure append operations often need different concurrency mechanisms.</p>
<p>For example:</p>
<div class="code-block"><span class="code-label">text</span><pre>INSERT ledger_entry
</pre></div>
<p>may rely on:</p>
<div class="code-block"><span class="code-label">text</span><pre>unique operation_id
</pre></div>
<p>rather than row versioning.</p>
<h3>25. State machines</h3>
<p>Suppose order states:</p>
<div class="code-block"><span class="code-label">text</span><pre>PENDING
PAID
SHIPPED
CANCELLED
</pre></div>
<p>Rather than:</p>
<div class="code-block"><span class="code-label">text</span><pre>read PENDING
set PAID
optimistic version
</pre></div>
<p>you can sometimes encode transition directly:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE orders
SET status = 'PAID',
    version = version + 1
WHERE order_id = ?
  AND status = 'PENDING';
</pre></div>
<p>If zero rows update:</p>
<div class="code-block"><span class="code-label">text</span><pre>current state no longer permits transition
</pre></div>
<p>This is often more expressive than checking only a numeric version.</p>
<p>You can combine both:</p>
<div class="code-block"><span class="code-label">sql</span><pre>WHERE status = 'PENDING'
  AND version = 17
</pre></div>
<p>depending on required semantics.</p>
<h3>26. Compare business state, not merely version</h3>
<p>Sometimes version is unnecessarily broad.</p>
<p>Suppose operation is:</p>
<div class="code-block"><span class="code-label">text</span><pre>mark notification READ
</pre></div>
<p>An unrelated metadata update increments version.</p>
<p>Your operation conflicts unnecessarily.</p>
<p>Instead:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE notification
SET read = true
WHERE id = ?
  AND read = false;
</pre></div>
<p>The transition itself is idempotent and atomic.</p>
<p>Concurrency mechanisms should reflect the specific business invariant.</p>
<p><span class="inline-code">@Version</span> is convenient, but not always the best abstraction.</p>`});})();