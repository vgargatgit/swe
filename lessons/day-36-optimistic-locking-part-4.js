// Day 36 full lesson, part 4 of 5.
(()=>{const lesson=window.FULL_LESSONS['day-36-optimistic-locking'];lesson.sections.push({title:"12. Message consumers, batch jobs, and the conflict decision pattern",diagram:`flowchart TD
  Conflict[Optimistic conflict] --> Commutative{Operation commutative or idempotent?}
  Commutative -- yes --> Fresh[Re-read and retry within a bound]
  Commutative -- no --> Reevaluate{Can the business rule be reevaluated automatically?}
  Reevaluate -- yes --> Fresh
  Reevaluate -- no --> Surface[Return or record the conflict]
  Fresh --> Obsolete{Command or event now obsolete?}
  Obsolete -- yes --> Ignore[Stop rather than retry until it wins]
  Obsolete -- no --> Apply[Apply against fresh state]`,body:`<h3>48. Optimistic locking and message consumers</h3>
<p>Two consumers accidentally process messages for the same aggregate concurrently.</p>
<p>Both load:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order version 20
</pre></div>
<p>Each attempts an update.</p>
<p>One succeeds.</p>
<p>One receives optimistic conflict.</p>
<p>That can protect state from silent overwrite.</p>
<p>But ordering semantics still matter.</p>
<p>If messages are:</p>
<div class="code-block"><span class="code-label">text</span><pre>OrderPaid version 21
OrderCancelled version 22
</pre></div>
<p>you may want explicit source-version checks rather than blindly retrying the older event.</p>
<p>A conflict should not automatically mean:</p>
<div class="code-block"><span class="code-label">text</span><pre>retry until my update wins
</pre></div>
<p>because the event may now be obsolete.</p>
<h3>49. Optimistic locking and batch jobs</h3>
<p>Suppose a batch job updates customer status while interactive requests update the same customers.</p>
<p>With <span class="inline-code">@Version</span>, conflicts surface instead of silently overwriting.</p>
<p>The batch should decide:</p>
<div class="code-block"><span class="code-label">text</span><pre>retry
skip
re-read and reevaluate
record conflict for later processing
</pre></div>
<p>For millions of rows, repeated entity-level retries may be inefficient.</p>
<p>A set-based atomic transition may be better.</p>
<h3>50. Pseudocode decision pattern</h3>
<p>When an optimistic conflict occurs:</p>
<div class="code-block"><span class="code-label">text</span><pre>Conflict
   │
   ├── Is operation commutative/idempotent?
   │       │
   │       ├── Yes → re-read and retry, bounded
   │       └── No
   │
   ├── Can business rule be reevaluated automatically?
   │       │
   │       ├── Yes → fresh transaction and retry
   │       └── No
   │
   └── Return conflict to caller
</pre></div>
<p>This is better than:</p>
<div class="code-block"><span class="code-label">text</span><pre>catch exception
retry 5 times
</pre></div>
<p>for every entity.</p>`},{title:"13. Where optimistic locking fits—and where pessimistic locking may win",diagram:`flowchart TD
  Start[Choose a concurrency strategy] --> Contention{Is same-row contention usually low?}
  Contention -- yes --> Optimistic[Optimistic version check]
  Contention -- no --> Work{Is repeated work expensive?}
  Work -- yes --> Pessimistic[Pessimistic locking or serialization]
  Work -- no --> Atomic[Atomic SQL, partitioning, queue, or append model]
  Optimistic --> Rare[Pay retry cost only on rare conflicts]
  Pessimistic --> Wait[Pay blocking, timeout, and deadlock costs]`,body:`<h3>51. When optimistic locking is a good fit</h3>
<p>Strong candidates include:</p>
<div class="code-block"><span class="code-label">text</span><pre>user settings
profile edits
business records
CMS documents
configuration
workflow metadata
orders with moderate write contention
administrative screens
long user-edit sessions
</pre></div>
<p>The shared characteristic is:</p>
<div class="code-block"><span class="code-label">text</span><pre>conflicts are possible but unusual
</pre></div>
<p>and:</p>
<div class="code-block"><span class="code-label">text</span><pre>waiting for a lock would be wasteful
</pre></div>
<h3>52. When optimistic locking is a poor fit</h3>
<p>Be cautious with:</p>
<div class="code-block"><span class="code-label">text</span><pre>hot counters
single inventory row during flash sale
global rate-limit row
high-frequency wallet balance contention
job queue head
leader-election row under extreme contention
</pre></div>
<p>If conflicts are expected on most writes, optimistic locking converts normal workload into exceptions/retries.</p>
<p>This is where pessimistic locking, atomic SQL, queues, ownership partitioning, or specialized data structures may be better.</p>
<h3>53. Optimistic versus pessimistic at a glance</h3>
<div class="code-block"><span class="code-label">text</span><pre>Optimistic

Read:
    no lock

Write:
    conditional version check

Conflict:
    fail/retry

Best:
    low contention

Risk:
    repeated retry under hotspot
</pre></div>
<p>versus:</p>
<div class="code-block"><span class="code-label">text</span><pre>Pessimistic

Read-for-update:
    acquire DB lock

Other writer:
    waits

Conflict:
    serialized before work completes

Best:
    higher contention
    expensive work that should not be repeated

Risk:
    blocking
    deadlock
    long lock waits
</pre></div>
<p>Neither is universally superior.</p>
<h3>54. The wasted-work trade-off</h3>
<p>Suppose an operation does:</p>
<div class="code-block"><span class="code-label">text</span><pre>read DB
calculate for 200 ms
update DB
</pre></div>
<p>With optimistic locking:</p>
<div class="code-block"><span class="code-label">text</span><pre>two requests do all 200 ms
one loses
one repeats work
</pre></div>
<p>With pessimistic locking:</p>
<div class="code-block"><span class="code-label">text</span><pre>second waits
first finishes
second then works from fresh state
</pre></div>
<p>If conflicts are rare:</p>
<div class="code-block"><span class="code-label">text</span><pre>optimistic wins
</pre></div>
<p>because nobody normally waits.</p>
<p>If conflicts are frequent and work is expensive:</p>
<div class="code-block"><span class="code-label">text</span><pre>pessimistic may win
</pre></div>
<p>because retry waste becomes costly.</p>`},{title:"14. Expensive compute, external side effects, and reservation workflows",diagram:`stateDiagram-v2
  [*] --> PENDING
  PENDING --> PAYMENT_IN_PROGRESS: reserve state and commit
  PAYMENT_IN_PROGRESS --> PAID: provider succeeds
  PAYMENT_IN_PROGRESS --> PAYMENT_FAILED: provider fails
  PAYMENT_IN_PROGRESS --> RETRY_REQUIRED: uncertain result
  RETRY_REQUIRED --> PAYMENT_IN_PROGRESS: idempotent retry
  PAID --> [*]
  PAYMENT_FAILED --> [*]`,body:`<h3>55. Do not hold a DB transaction during expensive compute</h3>
<p>Even with optimistic locking, you usually do not want:</p>
<div class="code-block"><span class="code-label">text</span><pre>begin transaction
read row
perform 20-second ML inference
update row
commit
</pre></div>
<p>That can hold:</p>
<div class="code-block"><span class="code-label">text</span><pre>DB connection
MVCC snapshot
transaction resources
</pre></div>
<p>for 20 seconds.</p>
<p>Depending on requirements, use:</p>
<div class="code-block"><span class="code-label">text</span><pre>read state/version
commit
perform expensive compute
start new transaction
conditional update WHERE version = original
</pre></div>
<p>If it conflicts:</p>
<div class="code-block"><span class="code-label">text</span><pre>discard/recompute if necessary
</pre></div>
<p>This is optimistic concurrency across transactions.</p>
<h3>56. External calls and optimistic locking</h3>
<p>Suppose:</p>
<div class="code-block"><span class="code-label">text</span><pre>read entity version 10
call payment provider
attempt version update
conflict
</pre></div>
<p>You cannot simply retry the whole operation if the payment provider was already called.</p>
<p>This is critical.</p>
<p>Optimistic retries are easy only when the operation is side-effect-free before commit.</p>
<p>If external side effects exist, use:</p>
<div class="code-block"><span class="code-label">text</span><pre>idempotency
state machine
outbox
saga
reservation
</pre></div>
<p>Do not wrap arbitrary distributed workflows in a generic optimistic retry annotation.</p>
<h3>57. Example failure</h3>
<p>Order state:</p>
<div class="code-block"><span class="code-label">text</span><pre>PENDING
version 5
</pre></div>
<p>Thread A:</p>
<div class="code-block"><span class="code-label">text</span><pre>calls payment provider
payment succeeds
</pre></div>
<p>Thread B:</p>
<div class="code-block"><span class="code-label">text</span><pre>cancels order
version → 6
</pre></div>
<p>A tries:</p>
<div class="code-block"><span class="code-label">text</span><pre>set PAID WHERE version=5
</pre></div>
<p>Conflict.</p>
<p>Now:</p>
<div class="code-block"><span class="code-label">text</span><pre>payment succeeded externally
order is cancelled internally
</pre></div>
<p>Retrying:</p>
<div class="code-block"><span class="code-label">text</span><pre>charge payment again
</pre></div>
<p>would be disastrous.</p>
<p>You need a workflow/state machine that handles:</p>
<div class="code-block"><span class="code-label">text</span><pre>external payment succeeded after cancellation race
</pre></div>
<p>Optimistic locking detects the race, but business recovery still has to be designed.</p>
<h3>58. Combine reservation with versioning</h3>
<p>For external work:</p>
<div class="code-block"><span class="code-label">text</span><pre>Transaction 1:
    PENDING → PAYMENT_IN_PROGRESS
    version 5 → 6

Commit.

Call provider using idempotency key.

Transaction 2:
    PAYMENT_IN_PROGRESS → PAID
</pre></div>
<p>Other operations now see:</p>
<div class="code-block"><span class="code-label">text</span><pre>PAYMENT_IN_PROGRESS
</pre></div>
<p>and must respect that state.</p>
<p>This reduces ambiguity.</p>
<p>If provider call fails:</p>
<div class="code-block"><span class="code-label">text</span><pre>transition to retry/failed
</pre></div>
<p>The state machine becomes the coordination mechanism.</p>
<h3>59. &#96;SELECT FOR UPDATE&#96; is not optimistic locking</h3>
<p>Developers sometimes combine:</p>
<div class="code-block"><span class="code-label">text</span><pre>@Version
</pre></div>
<p>and:</p>
<div class="code-block"><span class="code-label">sql</span><pre>SELECT ... FOR UPDATE
</pre></div>
<p>Once you lock the row pessimistically, the version is usually a secondary safety mechanism rather than the primary concurrency mechanism for that transaction.</p>
<p>That combination may be appropriate in some systems, but understand what each is doing.</p>
<p>Tomorrow's lesson covers pessimistic locking in detail.</p>`},{title:"15. Complete Spring/JPA and REST examples",diagram:`flowchart LR
  Client[Client with If-Match] --> Service[Transactional service]
  Service --> Entity[Domain state transition]
  Entity --> Hibernate[Hibernate flush]
  Hibernate --> SQL[UPDATE status and version where original version matches]
  SQL --> Result{Rows affected}
  Result -- one --> Response[Success with new ETag]
  Result -- zero --> Precondition[Conflict or 412 response]`,body:`<h3>60. Spring/JPA example</h3>
<p>Entity:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Entity
@Table(name = "order_record")
public class Order {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @Version
    private long version;

    public void markPaid() {
        if (status != OrderStatus.PENDING) {
            throw new InvalidOrderTransitionException(
                    status,
                    OrderStatus.PAID
            );
        }

        status = OrderStatus.PAID;
    }
}
</pre></div>
<p>Service:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Service
public class OrderService {

    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void markPaid(UUID orderId) {
        Order order = repository
                .findById(orderId)
                .orElseThrow();

        order.markPaid();
    }
}
</pre></div>
<p>Conceptual SQL:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE order_record
SET status = 'PAID',
    version = version + 1
WHERE id = ?
  AND version = ?;
</pre></div>
<p>The business transition and optimistic version work together.</p>
<h3>61. REST API example</h3>
<p>GET:</p>
<div class="code-block"><span class="code-label">http</span><pre>GET /orders/8d...
</pre></div>
<p>Response:</p>
<div class="code-block"><span class="code-label">http</span><pre>200 OK
ETag: "41"
</pre></div>
<div class="code-block"><span class="code-label">json</span><pre>{
  "id": "8d...",
  "status": "PENDING"
}
</pre></div>
<p>Update:</p>
<div class="code-block"><span class="code-label">http</span><pre>PATCH /orders/8d...
If-Match: "41"
Content-Type: application/json
</pre></div>
<div class="code-block"><span class="code-label">json</span><pre>{
  "status": "CANCELLED"
}
</pre></div>
<p>If current version remains 41:</p>
<div class="code-block"><span class="code-label">text</span><pre>update succeeds
new ETag = 42
</pre></div>
<p>If another operation changed it:</p>
<div class="code-block"><span class="code-label">http</span><pre>412 Precondition Failed
</pre></div>
<p>Client must re-fetch current state.</p>
<p>This is end-to-end optimistic concurrency rather than protecting only the internal ORM layer.</p>`});})();