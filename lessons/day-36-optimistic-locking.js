window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS['day-36-optimistic-locking'] = {
  day: 36,
  title: 'Optimistic Locking',
  subtitle: 'Detect stale writes instead of blocking every reader or writer.',
  tags: ['Concurrency', 'JPA @Version', 'REST ETags', 'Lost updates', 'Compare-and-swap'],
  core: 'Optimistic locking assumes concurrent conflicts are uncommon. Each writer records the version it originally read and succeeds only if that version is still current when the update happens.',
  sections: [
    {
      title: '1. The mental model',
      diagram: `flowchart LR
        A[Read row version V] --> B[Do application work]
        B --> C{UPDATE ... WHERE version = V}
        C -- one row updated --> D[Success: version becomes V+1]
        C -- zero rows updated --> E[Conflict: stale writer]
        E --> F[Re-read and decide again]`,
      body: `<p>Optimistic locking is database-level compare-and-swap. The database performs the stale-state check and the mutation atomically.</p>
      <div class="code-block"><span class="code-label">concept</span><pre>Read version V
  ↓
Do work
  ↓
UPDATE row
SET fields = ..., version = V + 1
WHERE id = ? AND version = V
  ↓
1 row updated = success
0 rows updated = stale write conflict</pre></div>
      <p>The key point is that the application does not first check the version and then update later. That would be a race. The version comparison must be part of the write statement itself.</p>`
    },
    {
      title: '2. The lost-update bug',
      diagram: `sequenceDiagram
        participant A as Request A
        participant B as Request B
        participant DB as Database
        A->>DB: Read customer v17
        B->>DB: Read customer v17
        A->>DB: Save email change, v17 -> v18
        B->>DB: Save stale full object with v17
        DB-->>B: Reject: 0 rows updated`,
      body: `<p>A lost update happens when two callers read the same old state and the later save silently overwrites the earlier save.</p>
      <div class="split"><div class="mini-card"><h4>Without optimistic locking</h4><p>A changes email. B changes phone using a stale full object. B's save can reset A's email back to the old value.</p></div><div class="mini-card"><h4>With optimistic locking</h4><p>B's update includes <span class="inline-code">WHERE version = 17</span>. Since A already advanced the row to version 18, B updates zero rows and the conflict becomes visible.</p></div></div>
      <p>The danger of lost updates is that nothing looks broken. Both requests can return success unless you deliberately detect stale writes.</p>`
    },
    {
      title: '3. SQL shape',
      body: `<p>A versioned update should look conceptually like this:</p>
      <div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer
SET email = :email,
    phone = :phone,
    version = version + 1
WHERE customer_id = :customerId
  AND version = :expectedVersion;</pre></div>
      <p>Interpret the affected row count:</p>
      <table><thead><tr><th>Rows updated</th><th>Meaning</th><th>Next step</th></tr></thead><tbody><tr><td>1</td><td>The row was still at the expected version.</td><td>Commit success.</td></tr><tr><td>0</td><td>The row was changed or removed since the caller read it.</td><td>Re-read and retry if safe, or return a conflict.</td></tr></tbody></table>
      <div class="callout warn"><strong>Trap:</strong> A separate <span class="inline-code">SELECT version</span> followed by an unconditional <span class="inline-code">UPDATE</span> is not optimistic locking. Another writer can slip in between those two statements.</div>`
    },
    {
      title: '4. JPA @Version',
      body: `<p>JPA/Hibernate can generate this conditional update for you when an entity has a version field.</p>
      <div class="code-block"><span class="code-label">java</span><pre>@Entity
@Table(name = "customer")
public class Customer {

    @Id
    private Long id;

    private String email;
    private String phone;

    @Version
    private Long version;
}</pre></div>
      <p>When Hibernate flushes a modified entity, the generated SQL is conceptually:</p>
      <div class="code-block"><span class="code-label">conceptual generated sql</span><pre>UPDATE customer
SET email = ?,
    phone = ?,
    version = ?
WHERE id = ?
  AND version = ?;</pre></div>
      <p>If no row is updated, Hibernate raises an optimistic-lock exception. In Spring this is commonly translated to an <span class="inline-code">OptimisticLockingFailureException</span> family exception.</p>
      <div class="callout"><strong>Flush timing:</strong> the exception may appear at flush or commit time, not exactly where you call a setter. Put retry boundaries outside the transaction.</div>`
    },
    {
      title: '5. Correct retry semantics',
      diagram: `flowchart TD
        Conflict[Optimistic conflict] --> Retryable{Can operation be safely re-applied?}
        Retryable -- yes --> Fresh[Start new transaction and re-read fresh state]
        Fresh --> Apply[Re-apply business operation]
        Apply --> Commit[Try commit]
        Retryable -- no --> Caller[Return 409/412 conflict]
        Commit -- conflict again --> Limit{Retry budget left?}
        Limit -- yes --> Fresh
        Limit -- no --> Caller`,
      body: `<p>Retrying an optimistic conflict means retrying the business operation against fresh state. It does not mean sending the same stale update again.</p>
      <div class="code-block"><span class="code-label">java</span><pre>public void incrementRetryCount(Long paymentId) {
    int attempts = 0;

    while (true) {
        try {
            transactionTemplate.executeWithoutResult(status -> {
                Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow();

                payment.setRetryCount(payment.getRetryCount() + 1);
            });
            return;
        } catch (OptimisticLockingFailureException ex) {
            attempts++;
            if (attempts >= 3) {
                throw ex;
            }
            sleepWithSmallJitter(attempts);
        }
    }
}</pre></div>
      <p>Each attempt starts a new transaction, re-reads current state, and re-applies the operation.</p>
      <div class="callout danger"><strong>Danger:</strong> Do not blindly retry human/business decisions. If one user approved something and another stale process wants to set it back to pending, the conflict is meaningful. Surface it.</div>`
    },
    {
      title: '6. REST APIs: ETag and If-Match',
      diagram: `sequenceDiagram
        participant Client
        participant API
        participant DB
        Client->>API: GET /orders/123
        API->>DB: read version 41
        API-->>Client: 200 OK + ETag: "41"
        Client->>API: PATCH /orders/123 If-Match: "41"
        API->>DB: UPDATE ... WHERE version = 41
        DB-->>API: 1 row or 0 rows
        API-->>Client: 200 with ETag "42" or 412 Precondition Failed`,
      body: `<p>Optimistic locking should often be visible in the API contract, not only hidden in the ORM.</p>
      <div class="code-block"><span class="code-label">http</span><pre>GET /orders/123

HTTP/1.1 200 OK
ETag: "41"

{
  "id": "123",
  "status": "PENDING"
}</pre></div>
      <div class="code-block"><span class="code-label">http</span><pre>PATCH /orders/123
If-Match: "41"
Content-Type: application/json

{
  "status": "CANCELLED"
}</pre></div>
      <p>If the resource is no longer at version 41, return <span class="inline-code">412 Precondition Failed</span>. A plain application-level conflict can also use <span class="inline-code">409 Conflict</span>. The important thing is that the caller knows the save was rejected because the resource changed.</p>`
    },
    {
      title: '7. Atomic SQL can be better than entity retry',
      body: `<p>For some operations, the best solution is not a read-modify-write entity workflow at all. Encode the business transition as one atomic SQL statement.</p>
      <div class="code-block"><span class="code-label">inventory reservation</span><pre>UPDATE inventory
SET quantity = quantity - 1
WHERE product_id = :productId
  AND quantity > 0;</pre></div>
      <div class="code-block"><span class="code-label">wallet debit sketch</span><pre>UPDATE wallet
SET balance = balance - :amount,
    version = version + 1
WHERE wallet_id = :walletId
  AND balance >= :amount;</pre></div>
      <p>If one row is updated, the invariant was true and the transition happened. If zero rows are updated, the invariant was false by the time the database evaluated it.</p>
      <div class="callout good"><strong>Rule of thumb:</strong> if the operation is a simple conditional state transition, prefer an atomic conditional update over loading an entity, computing in Java, and retrying optimistic failures.</div>`
    },
    {
      title: '8. Wallet and ledger example',
      diagram: `flowchart TD
        Req[Debit request with operationId] --> Tx[DB transaction]
        Tx --> Idy[Check idempotency key]
        Tx --> Funds[Atomic funds check / wallet version]
        Tx --> Ledger[Insert balanced ledger entries]
        Tx --> Balance[Update materialized balance]
        Tx --> Commit[Commit]
        Commit --> Event[Outbox event]`,
      body: `<p>For a wallet, optimistic locking may participate in the debit flow, but it is rarely the whole design. You usually also need idempotency, ledger entries, and transactional state.</p>
      <p>A safe debit flow commonly combines:</p>
      <ul class="checklist"><li>Operation ID / idempotency key.</li><li>Authoritative funds check inside the database transaction.</li><li>Ledger entries written atomically with the balance/materialized state.</li><li>Version or conditional update to reject stale concurrent decisions.</li><li>Outbox event after commit for projections and notifications.</li></ul>
      <p>If an optimistic conflict happens, the debit logic must re-read the current balance and re-evaluate whether funds are still sufficient. It cannot assume that a decision made 20 milliseconds ago is still valid.</p>`
    },
    {
      title: '9. State machines: compare expected business state',
      diagram: `stateDiagram-v2
        [*] --> PENDING
        PENDING --> PAYMENT_IN_PROGRESS
        PAYMENT_IN_PROGRESS --> PAID
        PAYMENT_IN_PROGRESS --> PAYMENT_FAILED
        PENDING --> CANCELLED
        PAYMENT_IN_PROGRESS --> CANCEL_REQUESTED`,
      body: `<p>Sometimes the best concurrency guard is not only <span class="inline-code">version = 17</span>, but also an expected business state.</p>
      <div class="code-block"><span class="code-label">state transition</span><pre>UPDATE orders
SET status = 'PAID',
    version = version + 1
WHERE order_id = :orderId
  AND status = 'PENDING'
  AND version = :expectedVersion;</pre></div>
      <p>Zero rows updated means either the row changed version or the state transition is no longer valid. This is more meaningful than treating all optimistic conflicts as generic retry candidates.</p>
      <div class="callout warn"><strong>External side effect trap:</strong> do not call a payment provider and then discover your optimistic update no longer fits the order state. First transition to a durable in-progress state, then perform the external call with an idempotency key.</div>`
    },
    {
      title: '10. What optimistic locking does not solve',
      diagram: `flowchart TD
        Invariant[Invariant spans multiple rows] --> A[Tx A reads both rows]
        Invariant --> B[Tx B reads both rows]
        A --> AUpdate[Tx A updates row A]
        B --> BUpdate[Tx B updates row B]
        AUpdate --> Final[Both commits can succeed]
        BUpdate --> Final
        Final --> Broken[Invariant broken without same-row version conflict]`,
      body: `<p>Optimistic row versioning mainly prevents stale updates to the same versioned row. It does not automatically prevent invariants that span multiple rows.</p>
      <p>Classic write-skew example:</p>
      <div class="code-block"><span class="code-label">write skew</span><pre>Rule: at least one doctor must remain on call.

Doctor A: on_call = true, version = 5
Doctor B: on_call = true, version = 9

Tx A reads both rows and sets A off-call.
Tx B reads both rows and sets B off-call.

Each updates a different row.
No version conflict occurs.
Final: nobody is on call.</pre></div>
      <p>Possible fixes include serializable isolation, pessimistic locking of all relevant rows, an invariant-owner row, a database constraint, or redesigning the aggregate boundary.</p>`
    },
    {
      title: '11. High contention and retry storms',
      body: `<p>Optimistic locking performs best when conflicts are rare. It performs badly when many callers fight over the same row.</p>
      <div class="code-block"><span class="code-label">hot row pattern</span><pre>100 writers read version 10
1 writer commits version 11
99 writers conflict
99 writers retry
1 commits version 12
98 conflict again
...</pre></div>
      <p>This can amplify load: more conflicts create more retries, and more retries create more conflicts.</p>
      <p>For hot resources, consider:</p>
      <ul><li>Atomic SQL transitions.</li><li>Pessimistic locking.</li><li>Queue-based serialization.</li><li>Partitioned ownership.</li><li>Append-only event/ledger model.</li><li>Preallocated inventory/escrow rights.</li></ul>`
    },
    {
      title: '12. Version granularity and aggregate design',
      body: `<p>One version column means one conflict boundary. If a huge entity contains many unrelated business concerns, false conflicts become common.</p>
      <table><thead><tr><th>Symptom</th><th>Possible design response</th></tr></thead><tbody><tr><td>Profile photo edit conflicts with notification preference edit.</td><td>Split the aggregate/table or use narrower commands.</td></tr><tr><td>Admin metadata changes invalidate public API ETags.</td><td>Separate persistence version from representation version.</td></tr><tr><td>Frequent conflicts on one global config row.</td><td>Break config into scoped records or use explicit update operations.</td></tr></tbody></table>
      <p>A useful rule: one version should usually represent one consistency boundary.</p>`
    },
    {
      title: '13. Production incidents to recognize',
      body: `<div class="mini-card"><h4>Admin screens overwrite changes</h4><p>Two support agents edit one merchant record. The second full-form save silently resets the first agent's field. Fix with ETag/version checks and narrower PATCH operations.</p></div>
      <div class="mini-card"><h4>Generic retry destroys a human decision</h4><p>A stale process conflicts, re-reads, then blindly reapplies its old command and overwrites a newer approval. Fix by revalidating business intent against current state.</p></div>
      <div class="mini-card"><h4>Native query bypasses @Version</h4><p>A batch job updates rows without incrementing version. Later JPA saves stale entities because the version still matches. Fix every writer to participate in the version protocol.</p></div>
      <div class="mini-card"><h4>Flash-sale hot row</h4><p>Thousands of buyers update the same inventory entity. Optimistic conflicts become the main workload. Fix with atomic decrement, queueing, or reservation architecture.</p></div>`
    },
    {
      title: '14. Interview-style answers',
      body: `<h4>What is optimistic locking?</h4><p>Optimistic locking detects concurrent modification rather than preventing it. A row carries a version, and the update includes the originally read version in its WHERE clause. If another transaction changed the row first, the stale update affects zero rows and fails with a concurrency conflict.</p>
      <h4>Should you always retry?</h4><p>No. Retry only if the business operation can safely be re-applied against fresh state. A mechanical increment may be retryable. A competing approval/rejection decision should usually be returned as a conflict.</p>
      <h4>Does it prevent all race conditions?</h4><p>No. It primarily prevents lost updates on the same versioned row. It does not automatically protect invariants spanning multiple rows, such as write skew or count-based constraints.</p>
      <h4>How would you expose it through REST?</h4><p>Return an ETag or version token on GET and require modifying requests to send If-Match. The server still enforces the version atomically in the database and returns 412 or 409 when the resource changed.</p>`
    },
    {
      title: '15. Design checklist',
      body: `<ul class="checklist"><li>Identify the real read-modify-write state.</li><li>Decide whether the invariant is one row, one aggregate, or multiple rows.</li><li>Prefer atomic SQL when the state transition can be expressed directly.</li><li>Add a version column when stale full-object updates are possible.</li><li>Make every writer participate: ORM, native SQL, batch jobs, admin tools, other services.</li><li>Put retry outside the transaction and re-read fresh state.</li><li>Retry only operations that are semantically safe to reapply.</li><li>Return meaningful API conflicts using ETag/If-Match, 412, or 409.</li><li>Measure conflict rate, retry count, retry exhaustion, and hot aggregates.</li><li>Do not execute irreversible external side effects before the optimistic commit unless idempotency and workflow recovery are designed.</li><li>Check for write skew and multi-row invariants separately.</li><li>Revisit aggregate boundaries if false conflicts are frequent.</li></ul>`
    }
  ],
  keyTakeaways: [
    'Optimistic locking detects stale writes; it does not block readers up front.',
    'The version check must be part of the atomic UPDATE.',
    'JPA @Version is convenient, but every write path must obey the protocol.',
    'Retry means re-read and reapply business logic, not replay stale SQL.',
    'ETag and If-Match bring optimistic concurrency to REST APIs.',
    'Atomic conditional SQL is often better for counters, inventory, and wallet debits.',
    'Row-level versioning does not prevent write skew across multiple rows.',
    'High contention can turn optimistic locking into a retry storm.',
    'A conflict is business information; do not blindly erase it with generic retry logic.'
  ],
  next: 'Pessimistic Locking'
};
