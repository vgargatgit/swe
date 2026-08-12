window.FULL_LESSONS=window.FULL_LESSONS||{};
window.FULL_LESSONS['day-36-optimistic-locking']={day:36,title:'Optimistic Locking',subtitle:'Make stale concurrent writes visible, then choose whether to retry, reject, or redesign the transition.',tags:['Concurrency','Lost updates','JPA @Version','ETag / If-Match','Atomic SQL','Write skew'],core:"Optimistic locking assumes concurrent conflicts are uncommon. Instead of locking a row before modifying it, each writer records the version it originally read and succeeds only if that version is still current when the update happens.",sections:[{title:"1. The essential optimistic-lock operation",diagram:`flowchart LR
  Read[Read row at version V] --> Work[Do application work]
  Work --> Update{Conditional UPDATE where version equals V}
  Update -- one row --> Success[Success and advance version]
  Update -- zero rows --> Conflict[Concurrent modification detected]
  Conflict --> Decide[Re-read and decide whether command is still valid]`,body:`<p>The essential operation is:</p>
<div class="code-block"><span class="code-label">text</span><pre>Read version V
    ↓
Do work
    ↓
UPDATE ... WHERE version = V
    ↓
If one row updated:
    success

If zero rows updated:
    someone changed it first
    → concurrency conflict
</pre></div>
<p>Optimistic locking prevents one of the most common concurrency bugs in backend systems: the <strong>lost update</strong>.</p>`},{title:"2. Lost updates, version columns, and compare-and-swap",diagram:`sequenceDiagram
  participant A as Request A
  participant B as Request B
  participant DB as Database
  A->>DB: Read customer version 17
  B->>DB: Read customer version 17
  A->>DB: Update email where version is 17
  DB-->>A: 1 row updated; version becomes 18
  B->>DB: Update stale object where version is 17
  DB-->>B: 0 rows updated; concurrency conflict`,body:`<h3>1. The lost-update problem</h3>
<p>Suppose a customer record contains:</p>
<div class="code-block"><span class="code-label">text</span><pre>customer_id = 42
email       = old@example.com
phone       = 9999999999
</pre></div>
<p>Two requests arrive at roughly the same time.</p>
<p>Request A reads:</p>
<div class="code-block"><span class="code-label">text</span><pre>email = old@example.com
phone = 9999999999
</pre></div>
<p>Request B reads the same state.</p>
<p>A changes the email:</p>
<div class="code-block"><span class="code-label">text</span><pre>email = new@example.com
</pre></div>
<p>B changes the phone:</p>
<div class="code-block"><span class="code-label">text</span><pre>phone = 8888888888
</pre></div>
<p>Naïve sequence:</p>
<div class="code-block"><span class="code-label">text</span><pre>T1 A reads old row
T2 B reads old row

T3 A writes:
   email = new@example.com
   phone = 9999999999

T4 B writes its stale object:
   email = old@example.com
   phone = 8888888888
</pre></div>
<p>Final state:</p>
<div class="code-block"><span class="code-label">text</span><pre>email = old@example.com
phone = 8888888888
</pre></div>
<p>A's update has silently disappeared.</p>
<p>That is a <strong>lost update</strong>.</p>
<p>Nothing crashed. No SQL failed. Both HTTP requests may even return <span class="inline-code">200 OK</span>.</p>
<p>That makes lost updates especially dangerous.</p>
<h3>2. Add a version column</h3>
<p>Store:</p>
<div class="code-block"><span class="code-label">text</span><pre>customer_id
email
phone
version
</pre></div>
<p>Initial:</p>
<div class="code-block"><span class="code-label">text</span><pre>id      = 42
email   = old@example.com
phone   = 9999999999
version = 17
</pre></div>
<p>Both A and B read:</p>
<div class="code-block"><span class="code-label">text</span><pre>version = 17
</pre></div>
<p>A updates with:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer
SET email = 'new@example.com',
    phone = '9999999999',
    version = 18
WHERE customer_id = 42
  AND version = 17;
</pre></div>
<p>One row updated.</p>
<p>A succeeds.</p>
<p>Now B attempts:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer
SET email = 'old@example.com',
    phone = '8888888888',
    version = 18
WHERE customer_id = 42
  AND version = 17;
</pre></div>
<p>But the database now contains:</p>
<div class="code-block"><span class="code-label">text</span><pre>version = 18
</pre></div>
<p>So:</p>
<div class="code-block"><span class="code-label">text</span><pre>rows updated = 0
</pre></div>
<p>The database has detected that B's copy is stale.</p>
<p>B cannot silently overwrite A.</p>
<h3>3. Why it is called optimistic</h3>
<p>A pessimistic approach assumes:</p>
<div class="code-block"><span class="code-label">text</span><pre>Someone else may modify this row.
Lock it now.
</pre></div>
<p>Optimistic locking assumes:</p>
<div class="code-block"><span class="code-label">text</span><pre>Probably nobody else will modify it.
Let's work normally and detect conflict at commit/update time.
</pre></div>
<p>The difference is:</p>
<div class="code-block"><span class="code-label">text</span><pre>Pessimistic:
    prevent conflict

Optimistic:
    detect conflict
</pre></div>
<p>This works very well when:</p>
<div class="code-block"><span class="code-label">text</span><pre>reads are frequent
writes are less frequent
simultaneous writes to the same object are uncommon
transactions should remain short
</pre></div>
<p>Examples:</p>
<div class="code-block"><span class="code-label">text</span><pre>user profiles
configuration records
business objects
order metadata
document editing
inventory metadata under moderate contention
</pre></div>
<p>It performs poorly if many threads constantly compete for the same row.</p>
<h3>4. Compare-and-swap</h3>
<p>Optimistic locking is essentially database-level <strong>compare-and-swap</strong>.</p>
<p>Conceptually:</p>
<div class="code-block"><span class="code-label">text</span><pre>IF currentVersion == expectedVersion
THEN
    apply update
    version++
ELSE
    reject
</pre></div>
<p>This is the same fundamental primitive behind many concurrency mechanisms.</p>
<p>Instead of:</p>
<div class="code-block"><span class="code-label">text</span><pre>read
then blindly write
</pre></div>
<p>we perform:</p>
<div class="code-block"><span class="code-label">text</span><pre>write only if the state has not changed
</pre></div>
<p>The check and write must be atomic.</p>
<p>That is why application code such as this is unsafe:</p>
<div class="code-block"><span class="code-label">java</span><pre>Customer current = repository.findById(id);

if (current.getVersion() == request.getVersion()) {
    repository.save(updated);
}
</pre></div>
<p>Another transaction can modify the row between:</p>
<div class="code-block"><span class="code-label">text</span><pre>version check
</pre></div>
<p>and:</p>
<div class="code-block"><span class="code-label">text</span><pre>save
</pre></div>
<p>The database must enforce the condition in the <span class="inline-code">UPDATE</span>.</p>`},{title:"3. JPA @Version, flush timing, and transaction boundaries",diagram:`flowchart TD
  Tx[Start transaction] --> Read[Load entity and version]
  Read --> Change[Change managed entity]
  Change --> Flush[Flush or commit]
  Flush --> SQL[UPDATE with original version]
  SQL --> Rows{Rows affected}
  Rows -- one --> Commit[Commit with incremented version]
  Rows -- zero --> Fail[Optimistic-lock exception and rollback]`,body:`<h3>5. JPA &#96;@Version&#96;</h3>
<p>JPA has built-in optimistic locking.</p>
<p>Entity:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Entity
@Table(name = "customer")
public class Customer {

    @Id
    private Long id;

    private String email;

    private String phone;

    @Version
    private Long version;

    // getters/setters
}
</pre></div>
<p>Database:</p>
<div class="code-block"><span class="code-label">text</span><pre>id | email           | phone      | version
------------------------------------------------
42 | old@example.com | 9999999999 | 17
</pre></div>
<p>Hibernate loads:</p>
<div class="code-block"><span class="code-label">text</span><pre>Customer version = 17
</pre></div>
<p>When the entity changes, generated SQL is conceptually:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE customer
SET email = ?,
    phone = ?,
    version = 18
WHERE id = 42
  AND version = 17;
</pre></div>
<p>If:</p>
<div class="code-block"><span class="code-label">text</span><pre>affected rows = 0
</pre></div>
<p>Hibernate concludes:</p>
<div class="code-block"><span class="code-label">text</span><pre>the entity changed after I read it
</pre></div>
<p>and raises an optimistic-locking exception.</p>
<p>In Spring/JPA this commonly appears through exceptions such as:</p>
<div class="code-block"><span class="code-label">text</span><pre>OptimisticLockException
ObjectOptimisticLockingFailureException
OptimisticLockingFailureException
</pre></div>
<p>depending on where it is translated.</p>
<h3>6. When the conflict is detected</h3>
<p>A subtle JPA detail:</p>
<div class="code-block"><span class="code-label">java</span><pre>customer.setEmail(...);
</pre></div>
<p>does not necessarily execute SQL immediately.</p>
<p>Hibernate may wait until:</p>
<div class="code-block"><span class="code-label">text</span><pre>flush
commit
explicit flush()
</pre></div>
<p>Therefore:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Transactional
public void update(...) {
    Customer customer = repository.findById(...).orElseThrow();

    customer.setEmail(...);

    // No SQL may have happened yet.
}
</pre></div>
<p>The optimistic conflict can appear during transaction commit after the method body finishes.</p>
<p>This matters when exception handling is placed in the same method.</p>
<h3>7. Why retry outside the transaction</h3>
<p>Consider:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Transactional
public void updateCustomer(...) {
    try {
        ...
    } catch (OptimisticLockException e) {
        // retry?
    }
}
</pre></div>
<p>This can be problematic because once a transaction has encountered certain persistence failures, it may already be marked rollback-only.</p>
<p>A safer architecture is:</p>
<div class="code-block"><span class="code-label">text</span><pre>Retry boundary
    ↓
start transaction
    ↓
read fresh entity
    ↓
apply business operation
    ↓
commit
</pre></div>
<p>On conflict:</p>
<div class="code-block"><span class="code-label">text</span><pre>discard transaction
start a completely new transaction
re-read current data
re-apply operation
</pre></div>
<p>Retry should not simply repeat the <span class="inline-code">UPDATE</span> using the same stale object.</p>`},{title:"4. Correct retry semantics",diagram:`flowchart TD
  Conflict[Optimistic conflict] --> Safe{Can the business operation be safely reapplied?}
  Safe -- no --> Caller[Return a meaningful conflict]
  Safe -- yes --> Fresh[Start a new transaction]
  Fresh --> Read[Re-read current state]
  Read --> Apply[Re-apply and revalidate the business operation]
  Apply --> Commit[Attempt commit]
  Commit -- conflict --> Budget{Retry budget left?}
  Budget -- yes, with backoff --> Fresh
  Budget -- no --> Caller
  Commit -- success --> Done[Complete]`,body:`<h3>8. Correct retry semantics</h3>
<p>Suppose the operation is:</p>
<div class="code-block"><span class="code-label">text</span><pre>Increase retry count by 1
</pre></div>
<p>Initial:</p>
<div class="code-block"><span class="code-label">text</span><pre>retry_count = 10
version = 5
</pre></div>
<p>Two requests increment.</p>
<p>Both read:</p>
<div class="code-block"><span class="code-label">text</span><pre>10
</pre></div>
<p>A writes:</p>
<div class="code-block"><span class="code-label">text</span><pre>11
version 6
</pre></div>
<p>B conflicts.</p>
<p>Incorrect retry:</p>
<div class="code-block"><span class="code-label">text</span><pre>write my previously calculated value 11 again
</pre></div>
<p>Final:</p>
<div class="code-block"><span class="code-label">text</span><pre>11
</pre></div>
<p>Still wrong.</p>
<p>Correct retry:</p>
<div class="code-block"><span class="code-label">text</span><pre>re-read:
retry_count = 11
version = 6

re-apply:
11 + 1 = 12

write:
retry_count = 12
version = 7
</pre></div>
<p>Optimistic retry means:</p>
<div class="callout">
<p><strong>Retry the business operation against fresh state, not merely the previous SQL statement.</strong></p>
</div>
<h3>9. Spring retry pattern</h3>
<p>Conceptually:</p>
<div class="code-block"><span class="code-label">java</span><pre>public void incrementRetryCount(Long paymentId) {
    int attempts = 0;

    while (true) {
        try {
            transactionTemplate.executeWithoutResult(
                    status -&gt; incrementOnce(paymentId)
            );
            return;
        } catch (OptimisticLockingFailureException ex) {
            attempts++;

            if (attempts &gt;= 3) {
                throw ex;
            }
        }
    }
}
</pre></div>
<p>Transaction body:</p>
<div class="code-block"><span class="code-label">java</span><pre>private void incrementOnce(Long paymentId) {
    Payment payment = paymentRepository
            .findById(paymentId)
            .orElseThrow();

    payment.setRetryCount(
            payment.getRetryCount() + 1
    );
}
</pre></div>
<p>Each attempt must run in a <strong>new transaction</strong>.</p>
<p>For repeated contention, add:</p>
<div class="code-block"><span class="code-label">text</span><pre>bounded retries
+
short randomized backoff
</pre></div>
<p>rather than creating a tight retry loop.</p>
<h3>10. Do not automatically retry everything</h3>
<p>Suppose two users edit the same support ticket.</p>
<p>User A changes:</p>
<div class="code-block"><span class="code-label">text</span><pre>priority = HIGH
</pre></div>
<p>User B changes:</p>
<div class="code-block"><span class="code-label">text</span><pre>priority = LOW
</pre></div>
<p>B conflicts.</p>
<p>Should the server automatically retry B and overwrite HIGH with LOW?</p>
<p>Probably not.</p>
<p>This is a genuine semantic conflict.</p>
<p>The correct response may be:</p>
<div class="code-block"><span class="code-label">text</span><pre>409 Conflict
</pre></div>
<p>and tell the caller:</p>
<div class="code-block"><span class="code-label">text</span><pre>The resource has changed since you loaded it.
Retrieve the current version and decide again.
</pre></div>
<p>Optimistic-lock conflicts fall into two categories:</p>
<div class="code-block"><span class="code-label">text</span><pre>Mechanical conflict
    operation can safely be re-applied

Semantic conflict
    human/business decision required
</pre></div>
<p>Do not hide semantic conflicts with automatic retries.</p>`}]};