window.FULL_LESSONS = window.FULL_LESSONS || {};
(function () {
  const notes = {
    34: {
      subtitle: 'Reason about what a distributed system sacrifices when nodes cannot communicate.',
      tags: ['CAP', 'Network partitions', 'CP vs AP', 'Quorum', 'PACELC'],
      focus: ['CAP is not a menu where you freely choose two letters. In a real distributed system, partitions can happen, so the design question is what each operation does during that partition.', 'Consistency in CAP is closer to linearizability: after a successful write, later reads behave as though there is one current copy of the value.', 'Availability means the operation can still be serviced by a non-failed node, not merely that the API returns a quick error.'],
      implementation: ['Classify operations by business invariant: payments, balances, inventory, revocation and uniqueness are usually CP-style; feeds, recommendations, analytics and many carts can often be AP-style.', 'Use quorum or single-writer authority where conflicting writes would be hard or impossible to merge. Use preallocation or ownership partitioning when you can localize authority.', 'Apply PACELC thinking in normal operation: even without a partition, stronger cross-node coordination usually costs latency.'],
      traps: ['Saying “choose two of three” without describing the partition scenario.', 'Calling a whole product CP or AP when different operations have different consistency needs.', 'Assuming a stale cache or read replica is safe because the primary database is strongly consistent.', 'Using last-write-wins for fields where losing an update is not acceptable.'],
      incident: 'A dual-region inventory service allowed both regions to sell the last item during a WAN partition. The system stayed available, but the global invariant was violated. The fix was single-region ownership for scarce inventory plus optional regional preallocation for high-volume items.',
      interview: 'I would explain CAP as a failure-policy constraint: during a partition, either reject unsafe work to preserve one truth, or continue locally and reconcile later. The right answer depends on the operation’s invariant, not on a database brand label.',
      checklist: ['What invariant can be violated if two sides act independently?', 'Can conflicts be merged automatically?', 'Is consistency required globally or only per key/tenant?', 'What does the minority side do?', 'Can stale cache/replica layers weaken the guarantee?', 'What is the latency cost of stronger coordination?'],
      keyTakeaways: ['CAP mainly constrains behavior during partitions.', 'CP refuses unsafe work; AP accepts divergence and reconciles.', 'The right choice is operation-specific.', 'PACELC explains latency-vs-consistency trade-offs when there is no partition.']
    },
    33: {
      subtitle: 'Elect exactly one authoritative owner, and make stale owners harmless.',
      tags: ['Leadership', 'Quorum', 'Leases', 'Fencing', 'Split brain'],
      focus: ['Leader election is not just picking a node. It is proving which node currently has authority and ensuring old leaders cannot continue damaging work.', 'Heartbeats are failure-suspicion signals, not proof of death. A node may be alive, paused, partitioned, or unable to reach only part of the system.', 'Epochs, terms, generations and fencing tokens give resources a way to reject stale leaders.'],
      implementation: ['Use a strongly consistent coordination system or a database atomic lease when the job already depends on that database.', 'Represent leadership with a monotonic term or fencing token. Pass that token to the protected resource when correctness matters.', 'Chunk long leader-only work so the process can notice lost leadership before starting more side effects.'],
      traps: ['Relying on TTL locks without fencing.', 'Assuming loss of the lock service means loss of access to the database or payment provider.', 'Running one global scheduler when a queue or unique job claim would be simpler.', 'Putting leader metadata in an eventually consistent cache.'],
      incident: 'A leader paused during GC, its lease expired, and a new leader started. The old process woke up and continued sending settlement commands. Fencing tokens and payment idempotency keys are the safety net that prevent duplicate settlement.',
      interview: 'A strong answer emphasizes safety first: use quorum/lease/term to establish authority, and fencing or conditional writes so stale leaders cannot mutate protected state.',
      checklist: ['Is singleton authority truly needed?', 'Can work claiming replace leadership?', 'Where is the authoritative election state stored?', 'What is the fencing mechanism?', 'What happens on renewal ambiguity?', 'How are leader changes monitored?'],
      keyTakeaways: ['Heartbeats alone are not enough.', 'Terms make old leadership recognizable.', 'Fencing makes stale ownership harmless.', 'Leader election and idempotency solve different problems.']
    },
    32: {
      subtitle: 'Keep multiple copies of data while trading durability, latency and availability.',
      tags: ['Replication', 'WAL', 'Synchronous', 'Asynchronous', 'Failover'],
      focus: ['Replication ships an ordered change stream from one database copy to another. It is not the same as sharding or partitioning.', 'The central question is when a write is considered complete: local commit, replica receive, replica flush, or replica replay.', 'Asynchronous replication gives low write latency but creates an acknowledged-data-loss window during failover.'],
      implementation: ['Use synchronous or quorum-style acknowledgement only where the durability improvement justifies latency and failure coupling.', 'Separate HA replicas from reporting replicas; a heavily loaded reporting replica may be a poor failover candidate.', 'Monitor generation rate versus replay rate. If the primary generates log faster than the replica replays it, lag will grow without bound.'],
      traps: ['Treating replicas as backups; deletes and corruption replicate too.', 'Ignoring retained WAL/binlog growth when a replica or CDC consumer is down.', 'Promoting a replica without fencing the old primary.', 'Blindly retrying ambiguous commits after a failover.'],
      incident: 'A large migration generated far more WAL than replicas could replay. Read replicas became stale, failover RPO worsened, and log retention threatened primary disk. The migration needed batching, lag monitoring and a backout plan.',
      interview: 'I would distinguish async from sync by the acknowledgement point, then discuss RPO, RTO, split-brain prevention, replica lag, and application handling of ambiguous commit outcomes.',
      checklist: ['What acknowledgement stage is required?', 'What RPO is acceptable?', 'Which replica is failover-eligible?', 'Can read workload delay replay?', 'How is split brain prevented?', 'How long does replica rebuild take?'],
      keyTakeaways: ['Replication copies data; sharding divides data.', 'Async is fast but can lose acknowledged writes.', 'Sync improves durability but adds latency/coupling.', 'Replication does not replace backups.']
    },
    31: {
      subtitle: 'Divide one logical table into bounded physical pieces inside one database.',
      tags: ['Partitioning', 'Pruning', 'Retention', 'Indexes', 'Hot partitions'],
      focus: ['Partitioning works when physical boundaries match query predicates or lifecycle boundaries. It does not automatically make a large table fast.', 'Partition pruning eliminates irrelevant partitions before scanning or indexing. Indexes still matter inside the remaining partitions.', 'Time partitioning is common because data naturally ages and retention can become a metadata operation instead of billions of row deletes.'],
      implementation: ['Choose a stable partition key that appears in common predicates. Use half-open time intervals and automate future partition creation.', 'Keep indexes local and intentional. Count physical indexes: 120 partitions times 8 indexes is 960 real indexes.', 'Use detach/archive/drop workflows for retention and monitor default partitions so bad data does not accumulate silently.'],
      traps: ['Wrapping the partition key in functions so pruning fails.', 'Partitioning by time when most point lookups only have ID.', 'Creating too many tiny partitions and hurting planning/catalog operations.', 'Assuming local unique indexes enforce global uniqueness.'],
      incident: 'On the first day of a new month, inserts failed because the next monthly partition did not exist. The fix was future-partition automation, alerts, and optionally a monitored default partition.',
      interview: 'I would choose partitioning before sharding when the problem is pruning, retention or maintenance inside one database authority. I would verify pruning with EXPLAIN and review uniqueness constraints before rollout.',
      checklist: ['Do common queries include the partition key?', 'How many partitions will exist in two years?', 'Does pruning work with ORM SQL?', 'Are uniqueness constraints still valid?', 'Who creates future partitions?', 'What is the retention/drop workflow?'],
      keyTakeaways: ['Partitioning preserves one database authority.', 'Pruning is the main performance win.', 'Retention by partition drop is a major operational win.', 'Partition keys must match query and lifecycle shape.']
    },
    30: {
      subtitle: 'Place different rows on independent database nodes using a shard key.',
      tags: ['Sharding', 'Shard key', 'Hotspots', 'Routing', 'Resharding'],
      focus: ['Sharding turns one database problem into a data-placement problem. It only works well when most operations can route to one shard.', 'The shard key decides locality, load distribution, transaction scope and future rebalancing pain.', 'Logical buckets or directory-based routing give more flexibility than hash(key) modulo shard count.'],
      implementation: ['Design the API so common requests include the shard key, such as tenantId or walletId. Co-locate related tables by carrying the shard key onto child rows.', 'Use a shard directory or stable logical buckets so physical databases can change without changing the key-to-bucket function.', 'Move global search, reports and analytics to derived stores instead of scatter-gathering every request across shards.'],
      traps: ['Modulo resharding without data migration.', 'Balancing row count but ignoring whale tenants and traffic skew.', 'Trusting client-supplied shard IDs.', 'Opening a full connection pool from every pod to every shard.'],
      incident: 'A system used customer_id % 4 and later changed to % 8. Many keys routed to empty/new shards while old data remained elsewhere. Stable logical buckets would have prevented route corruption.',
      interview: 'I would shard only after simpler options fail, then choose a key that keeps most transactions local, distributes real load, and supports operational movement through logical buckets or a directory.',
      checklist: ['What capacity limit requires sharding?', 'Is the shard key present in requests?', 'What percentage of operations are single-shard?', 'How are global IDs generated?', 'How are whales handled?', 'How are shards moved and fenced?'],
      keyTakeaways: ['Shard key is an architectural commitment.', 'Most work should remain local to one shard.', 'Scatter-gather amplifies tail latency.', 'Resharding needs copy, catch-up, fencing and validation.']
    },
    29: {
      subtitle: 'Serve stale-tolerant reads from copies while protecting current reads on the primary.',
      tags: ['Read replicas', 'Replica lag', 'Read-your-writes', 'Routing', 'Failover'],
      focus: ['Read replicas scale reads, not writes. They copy primary changes and may lag behind the latest committed state.', 'The key question is not whether a query is SELECT. It is what happens if the result is stale.', 'Read-your-writes, monotonic reads and security-sensitive reads require explicit routing or consistency tokens.'],
      implementation: ['Classify reads into strong/current, read-your-writes, bounded stale and eventually consistent. Route accordingly.', 'Use primary pinning after writes or a minimum replication-position token for stronger read-after-write behavior.', 'Make replica routing lag-aware and cap fallback to primary so replica failure does not overload writes.'],
      traps: ['Routing authorization, revocation, balance checks or idempotency lookups to stale replicas.', 'Round-robin across replicas with different lag and showing data moving backward.', 'Letting reports overload a failover replica.', 'Treating replicas as backups.'],
      incident: 'After checkout, an order page read from a lagging replica and still showed PENDING. Users retried payment. The fix was returning updated write state, primary pinning, and idempotent payment operations.',
      interview: 'I would route only stale-tolerant reads to replicas, monitor lag, and keep business-invariant reads on the primary or a strongly consistent store.',
      checklist: ['What staleness is acceptable?', 'Does the user need read-your-writes?', 'Can stale data affect money or permission?', 'What is the lag threshold?', 'What happens if all replicas fail?', 'Can caching amplify replica staleness?'],
      keyTakeaways: ['Replicas improve read capacity, not write capacity.', 'Lag is a correctness variable.', 'Critical reads stay primary/current.', 'Fallback policy must protect the primary.']
    },
    28: {
      subtitle: 'Reuse database sessions and impose a concurrency boundary around the database.',
      tags: ['HikariCP', 'Database capacity', 'Connection leaks', 'Pool sizing', 'Backpressure'],
      focus: ['A connection pool is reuse plus admission control. It prevents every request from creating a physical database connection and bounds concurrent database work.', 'More connections do not automatically mean more throughput. Too many connections can move the queue from the app into the database.', 'Connection-hold time matters more than query count. External calls inside transactions are a classic pool killer.'],
      implementation: ['Size from cluster-wide database budget, not Tomcat thread count. Pool size times max pod count is the real connection demand.', 'Use short acquisition timeouts aligned with request deadlines. Monitor active, idle, pending, acquisition time and hold time.', 'Keep transactions narrow. Avoid remote calls, long streams and expensive CPU work while holding a connection.'],
      traps: ['Thirty-second pool wait inside a two-second API.', 'Autoscaling pods without recalculating database connection budget.', 'Nested REQUIRES_NEW usage requiring a second connection per request.', 'One pool shared by OLTP and long reporting queries.'],
      incident: 'Pool active reached max and pending requests climbed, but DB CPU was low. Tracing revealed HTTP fraud calls inside @Transactional methods. Connections were held while no SQL was running.',
      interview: 'I would size from database safe concurrency, reserve headroom, divide by max replicas, validate with connection-hold time, and diagnose exhaustion through pending, hold-time and database activity together.',
      checklist: ['What is DB safe concurrent work?', 'What is max pod count?', 'What is P99 connection hold time?', 'Are external calls inside transactions?', 'Are batch and API workloads separated?', 'What is acquisition timeout?'],
      keyTakeaways: ['Pool size is admission control.', 'Cluster-wide budget matters.', 'Long transactions consume capacity.', 'Pool wait is latency and overload signal.']
    },
    27: {
      subtitle: 'Avoid one parent query followed by one relationship query per parent.',
      tags: ['N+1', 'JPA', 'Fetch joins', 'Batch fetching', 'DTO projections'],
      focus: ['N+1 is a request-shape bug: one query loads parents, then each parent triggers another query lazily.', 'Lazy loading is not bad by itself. Undefined fetch plans are the problem.', 'Fix strategy depends on relationship cardinality and response shape.'],
      implementation: ['Use fetch joins for bounded relationships, batch fetching for many-to-one or collections, DTO projections for read APIs, and separate bulk queries for multiple collections.', 'Disable or discipline Open Session in View so controllers and serializers do not accidentally hit the database.', 'Add query-count tests and metrics for SQL count per request.'],
      traps: ['Switching everything to EAGER and creating over-fetch or secondary selects.', 'Collection fetch join with pagination producing wrong/expensive results.', 'Jackson serialization triggering lazy loads.', 'Mapper/toString/equals touching lazy fields.'],
      incident: 'An endpoint worked in dev with five orders but issued 501 SQL statements in production for 500 orders. Batch fetching or DTO projection reduced it to a few bounded queries.',
      interview: 'I would identify it through SQL count per request, then choose fetch join, batch fetch, projection or explicit bulk queries depending on cardinality and pagination requirements.',
      checklist: ['How many SQL statements does one request execute?', 'Are serializers touching entities?', 'Is pagination combined with collection fetch?', 'Is DTO projection enough?', 'Can multiple collections be fetched separately?', 'Do tests catch growth with dataset size?'],
      keyTakeaways: ['N+1 is a hidden latency multiplier.', 'Fetch plan is part of API design.', 'EAGER is not a universal fix.', 'Measure SQL count, not only slow individual queries.']
    },
    26: {
      subtitle: 'Reduce total database work by reading the plan, not by guessing.',
      tags: ['EXPLAIN', 'Joins', 'Sargability', 'Pagination', 'Statistics'],
      focus: ['Query optimization is about total work: rows touched, joins performed, sorts, spills, locks and round trips.', 'SQL is declarative. The execution plan is the implementation.', 'Start by comparing estimated rows versus actual rows and identifying where work explodes.'],
      implementation: ['Use EXPLAIN/ANALYZE, slow-query logs and query fingerprints. Check scans, join algorithm, sort, aggregate, loops and rows removed by filter.', 'Keep predicates sargable, avoid SELECT *, use keyset pagination for deep pages, and use EXISTS for existence checks.', 'Design indexes from access patterns and keep statistics healthy.'],
      traps: ['Forcing an index without understanding row count/selectivity.', 'Using functions or casts on indexed columns.', 'OFFSET pagination for deep pages.', 'DISTINCT as a symptom-hiding fix for bad joins.'],
      incident: 'A dashboard query used OFFSET 500000 and sorted a huge joined result. Keyset pagination plus a covering index changed the problem from scanning history to continuing from a known cursor.',
      interview: 'I would look at the actual plan, not just the SQL. I would reduce rows early, verify estimates, fix sargability, choose indexes, and watch memory spills and lock waits.',
      checklist: ['What plan node dominates time?', 'Where do estimates diverge?', 'Are predicates sargable?', 'Can the query avoid sorting?', 'Is pagination keyset-based?', 'Are joins multiplying rows unexpectedly?'],
      keyTakeaways: ['Plans beat intuition.', 'Sargability matters.', 'Join shape matters as much as indexes.', 'Pagination and result size are part of optimization.']
    },
    25: {
      subtitle: 'Trade storage and write cost for faster lookup and ordered access.',
      tags: ['Indexes', 'B-tree', 'Composite index', 'Selectivity', 'Write amplification'],
      focus: ['An index is another data structure maintained alongside the table. It helps only when it matches the query shape.', 'Composite indexes are ordered. Equality, range and order-by interactions determine whether later columns are useful.', 'Every index speeds some reads and slows writes/storage. Indexes are not free.'],
      implementation: ['Design indexes from real WHERE, JOIN, ORDER BY and LIMIT patterns. Prefer route-pattern-like thinking: operation first, index second.', 'Use covering/INCLUDE indexes when they reduce table lookups, and partial/functional indexes when the predicate is stable and important.', 'Monitor unused, duplicate and bloated indexes.'],
      traps: ['Indexing every column.', 'Ignoring low selectivity or data skew.', 'Expecting separate single-column indexes to equal one useful composite index.', 'Using DATE(column) or casts that prevent index use.'],
      incident: 'A soft-delete table enforced username uniqueness globally, blocking reuse after delete. A partial unique index on active rows aligned the constraint with business semantics.',
      interview: 'I would ask for the query first. Then I would choose composite index column order based on equality, range and ordering, while accounting for selectivity, write cost and maintenance.',
      checklist: ['What exact query is being optimized?', 'Does column order match equality/range/order?', 'Can the index satisfy LIMIT order?', 'What write cost is added?', 'Are uniqueness constraints business-correct?', 'Is the index still used in production?'],
      keyTakeaways: ['Indexes implement access patterns.', 'Composite order matters.', 'Indexes enforce correctness too.', 'Every index has write and storage cost.']
    },
    24: {
      subtitle: 'Stream one-way server updates over HTTP with reconnect and event IDs.',
      tags: ['SSE', 'EventSource', 'Last-Event-ID', 'Streaming', 'Replay'],
      focus: ['Server-Sent Events are one-way server-to-client streams over normal HTTP. Clients send commands through separate HTTP calls.', 'Event IDs and replay determine whether reconnect is reliable or merely best effort.', 'SSE is simpler than WebSockets when the server pushes updates and the client rarely needs full-duplex messaging.'],
      implementation: ['Use text/event-stream, periodic heartbeats, disabled proxy buffering, and Last-Event-ID replay from a durable source when events matter.', 'Keep per-connection buffers bounded and drop or coalesce slow clients.', 'In horizontal deployments, route events from a broker to whichever pod owns the open connection.'],
      traps: ['Proxy buffering hides events until the buffer fills.', 'Native EventSource cannot set arbitrary auth headers.', 'No replay source means reconnect misses important events.', 'Unbounded emitter queues cause memory pressure.'],
      incident: 'A status stream appeared frozen because NGINX buffered the SSE response. Disabling buffering and sending heartbeat comments made the stream visibly live.',
      interview: 'I would use SSE for one-way notifications/status streams, with event IDs, heartbeat, replay strategy, proxy settings, bounded buffers and reconnect behavior.',
      checklist: ['Is one-way push enough?', 'Are events durable or ephemeral?', 'Is proxy buffering disabled?', 'How is auth handled?', 'What is replay source?', 'How are slow clients handled?'],
      keyTakeaways: ['SSE is HTTP-based server push.', 'Replay requires event IDs plus storage.', 'Proxy configuration is critical.', 'Use WebSockets only when full duplex is needed.']
    },
    23: {
      subtitle: 'Hold HTTP requests until an event is available or a timeout expires.',
      tags: ['Long polling', 'Cursors', 'DeferredResult', 'Async HTTP', 'Lost wakeups'],
      focus: ['Long polling is a compatibility pattern: client asks for new events, server waits briefly, then returns event or timeout.', 'Cursors/sequence numbers prevent missed data; timestamps alone are often unsafe.', 'The server must not hold servlet threads, DB connections or transactions while waiting.'],
      implementation: ['Use async request handling, register waiter then re-check backlog to avoid lost wakeups, and clean up on timeout/disconnect.', 'Use sequence cursors, batching and idempotent client processing.', 'Apply active-poll limits per user/session to avoid multiple tabs multiplying held requests.'],
      traps: ['Blocking one servlet thread per poll.', 'Holding a DB transaction while waiting.', 'Registering waiter after checking backlog and missing an event between steps.', 'Treating normal timeout as an error.'],
      incident: 'A long-poll endpoint leaked waiters after client disconnects, slowly growing memory and duplicate notifications. Cleanup hooks and complete-once logic fixed it.',
      interview: 'I would describe long polling as HTTP-compatible event delivery with cursor, async waiting, timeout, cleanup, and careful lost-wakeup prevention.',
      checklist: ['What cursor defines progress?', 'Can the server re-check after registering?', 'What is max wait timeout?', 'Are waiters cleaned up?', 'How many active polls per user?', 'What happens after cursor expiry?'],
      keyTakeaways: ['Long polling is simple but stateful.', 'Cursor design prevents missed events.', 'Async handling is required at scale.', 'Timeout responses are normal.']
    },
    22: {
      subtitle: 'Maintain long-lived full-duplex connections for real-time interaction.',
      tags: ['WebSockets', 'Presence', 'Backpressure', 'Fanout', 'Reconnect'],
      focus: ['WebSockets are persistent bidirectional channels. They are not durable message storage by themselves.', 'One user can have many connections across devices and tabs. Presence is an aggregate of connection state.', 'Horizontal scaling requires a broker or shared routing layer for cross-node fanout.'],
      implementation: ['Authenticate at handshake, define token expiry behavior, send ping/pong heartbeats, use reconnect backoff with jitter, and drain on deploy.', 'Bound per-connection output queues and close or degrade slow clients.', 'Store durable chat/history in a database or messaging service, not in the WebSocket connection.'],
      traps: ['Assuming sticky sessions solve cross-node messaging.', 'Unbounded buffers for slow clients.', 'No sequence/ACK for reconnect recovery.', 'All clients reconnecting immediately after deploy.'],
      incident: 'After a server restart, every client reconnected immediately, causing a storm. Jittered reconnect, connection draining and rate limits reduced recovery pressure.',
      interview: 'I would cover handshake auth, connection registry, heartbeat, broker fanout, backpressure, reconnect strategy, durability separation and deployment draining.',
      checklist: ['What is connection identity?', 'How is auth renewed?', 'What is heartbeat interval?', 'How is fanout routed?', 'What is slow-client policy?', 'What data must survive reconnect?'],
      keyTakeaways: ['WebSockets are transport, not storage.', 'Backpressure is essential.', 'Reconnect storms must be designed for.', 'Horizontal fanout needs shared infrastructure.']
    },
    21: {
      subtitle: 'Run scheduled work exactly as often as intended despite replicas and failures.',
      tags: ['Cron', 'Scheduling', 'Idempotency', 'Locks', 'Batch jobs'],
      focus: ['A cron job in one process becomes many jobs when the service is scaled. Scheduling is distributed coordination.', 'Most jobs need idempotency and checkpointing even if a leader or lock is used.', 'Define catch-up, overlap and missed-run semantics explicitly.'],
      implementation: ['Use a unique job-run claim, leader election, external scheduler, or queue fanout depending on the job. For large work, schedule chunks rather than one huge transaction.', 'Store job state, checkpoints and per-unit idempotency keys.', 'Handle time zones, DST and business dates deliberately.'],
      traps: ['@Scheduled on every pod.', 'Lock TTL shorter than job duration with no heartbeat.', 'Overlapping runs corrupting data.', 'One giant batch transaction holding locks and connections.'],
      incident: 'A service scaled from one pod to eight and sent eight settlement files. A unique settlement_date claim plus idempotent payout keys made duplicate scheduling harmless.',
      interview: 'I would separate trigger from work, use an idempotent claim for each scheduled occurrence, chunk processing, checkpoint progress, and avoid relying only on one pod.',
      checklist: ['Can multiple replicas run this?', 'What is the job identity key?', 'Are runs allowed to overlap?', 'What if a run is missed?', 'Can work resume from checkpoint?', 'How are partial failures handled?'],
      keyTakeaways: ['Cron is distributed coordination.', 'Idempotency beats hope.', 'Chunk large jobs.', 'Business time must be explicit.']
    },
    20: {
      subtitle: 'Quarantine poison messages after bounded retries, then repair or replay deliberately.',
      tags: ['DLQ', 'Retries', 'Poison messages', 'Replay', 'Operations'],
      focus: ['A DLQ is not a retry mechanism. It is a quarantine after normal automated recovery is exhausted.', 'Messages in DLQ represent failed convergence or failed workflow progress and should alert humans/systems.', 'Replay must be controlled, rate-limited and safe.'],
      implementation: ['Classify failures: transient, poison/schema, dependency outage, business/manual-review. Retry transient with backoff and jitter; DLQ poison or exhausted messages with rich metadata.', 'Store event id, attempts, exception type, stack summary, consumer, schema version and correlation IDs.', 'Build replay tooling with filtering, dry-run and rate limits.'],
      traps: ['Retrying forever and blocking partitions.', 'Treating DLQ as a graveyard no one watches.', 'Bulk-replaying bad messages and recreating the incident.', 'Losing original metadata needed for repair.'],
      incident: 'A schema bug sent thousands of events to DLQ while primary consumer lag stayed zero. Projection data was stale for days because nobody alerted on DLQ age/depth.',
      interview: 'I would explain DLQ as bounded-failure quarantine with alerting, diagnosis, repair and safe replay, not as normal flow.',
      checklist: ['What max attempts?', 'What metadata is preserved?', 'Who owns DLQ triage?', 'Can replay be filtered and throttled?', 'Does DLQ break ordering?', 'How is business impact measured?'],
      keyTakeaways: ['DLQ means normal convergence failed.', 'Replay is dangerous without controls.', 'DLQ needs alerting and ownership.', 'Poison messages require classification.']
    },
    19: {
      subtitle: 'Coordinate long-running business transactions through local commits and compensations.',
      tags: ['Saga', 'Compensation', 'Orchestration', 'Choreography', 'State machines'],
      focus: ['A saga is a sequence of local transactions with compensating actions. Compensation is business correction, not SQL rollback.', 'Saga state must be durable, observable and retryable. Intermediate states are part of the domain.', 'Every command and compensation needs idempotency.'],
      implementation: ['Use orchestration when workflow visibility and control matter; choreography when loose coupling is genuinely simple.', 'Classify steps as compensatable, pivot and retryable. Put irreversible actions late or make them forward-recoverable.', 'Model timeouts and stuck compensations as first-class states.'],
      traps: ['Assuming compensation can undo emails, shipments or external payments perfectly.', 'Hidden choreography cycles with no owner.', 'Retrying a command after timeout without knowing outcome.', 'Manual repair paths not modeled.'],
      incident: 'A checkout saga reserved funds, then shipping failed. The refund compensation also failed. The orchestrator needed a durable COMPENSATION_FAILED state and operator workflow, not infinite blind retry.',
      interview: 'I would describe local ACID steps, durable saga state, idempotent commands, compensations, timeouts, retries, and manual repair for non-compensatable failures.',
      checklist: ['What is the saga state machine?', 'Which step is the pivot?', 'Are commands idempotent?', 'What compensation can fail?', 'What timeout means unknown outcome?', 'How are stuck sagas surfaced?'],
      keyTakeaways: ['Saga is business workflow, not database magic.', 'Compensation is not rollback.', 'State must be durable.', 'Manual repair is part of design.']
    },
    18: {
      subtitle: 'Understand why atomic work across independent resources is hard.',
      tags: ['Distributed transactions', '2PC', 'XA', 'Outbox', 'Sagas'],
      focus: ['A local database transaction does not cover remote services. @Transactional stops at the database boundary.', 'Two-phase commit coordinates prepare/commit but introduces blocking, locks and coordinator failure complexity.', 'Modern service designs often prefer local ACID plus outbox/inbox, idempotency, sagas and reconciliation.'],
      implementation: ['Keep strong invariants within one database authority where possible. Use distributed transactions only when the operational cost is justified.', 'Use the outbox pattern to avoid DB/event dual writes.', 'Model partial failure states explicitly rather than pretending the whole workflow is one local transaction.'],
      traps: ['Calling a remote service inside a local DB transaction and assuming rollback will undo it.', 'Holding locks during long business workflows.', 'Using XA everywhere without understanding availability and operations.', 'Ignoring timeout ambiguous outcomes.'],
      incident: 'An order transaction updated local DB, then called payment provider, then failed. The local rollback did not undo the external charge. A saga/state-machine design was required.',
      interview: 'I would explain 2PC and why it is often avoided in microservices, then propose local transactions with outbox, idempotent participants and compensation where appropriate.',
      checklist: ['Which resources must be atomic?', 'Can invariant be moved into one owner?', 'What happens if remote call times out?', 'Is 2PC operationally acceptable?', 'Is outbox needed?', 'How will reconciliation work?'],
      keyTakeaways: ['@Transactional is local.', '2PC trades availability and simplicity for atomicity.', 'Outbox closes DB/event dual-write gap.', 'Distributed workflows need explicit state.']
    },
    17: {
      subtitle: 'Organize systems around durable facts and asynchronous reactions.',
      tags: ['EDA', 'Events', 'Outbox', 'Choreography', 'Read models'],
      focus: ['Events are facts that already happened. Commands ask someone to do something.', 'EDA reduces synchronous coupling but introduces eventual consistency, ordering, duplicates and observability challenges.', 'Event ownership belongs to the service that owns the state change.'],
      implementation: ['Use domain events internally and integration events externally. Include event id, type, schema version, occurredAt, aggregate id, correlation id and causation id.', 'Publish through outbox/CDC, make consumers idempotent, and maintain projections deliberately.', 'Use choreography for simple independent reactions; use orchestration when workflow needs explicit control.'],
      traps: ['Events that are actually commands.', 'Exposing internal database tables as event contracts.', 'No schema evolution plan.', 'Event loops caused by services reacting to each other blindly.'],
      incident: 'A new event field broke an old consumer with a large backlog. Backward-compatible event evolution and schema tests would have prevented projection staleness.',
      interview: 'I would discuss ownership, facts versus commands, outbox, idempotent consumers, ordering per aggregate, versioned schemas, and when async is worse than sync.',
      checklist: ['Who owns the event?', 'Is it a fact or command?', 'How is it durably published?', 'Can consumers handle duplicates?', 'What ordering is required?', 'How is schema compatibility tested?'],
      keyTakeaways: ['EDA is architecture, not just Kafka.', 'Events need ownership and schemas.', 'Async creates eventual consistency.', 'Outbox and idempotency are core.']
    },
    16: {
      subtitle: 'Fan out one fact to many independent subscribers.',
      tags: ['Pub/Sub', 'Topics', 'Consumer groups', 'Ordering', 'Replay'],
      focus: ['Pub/sub delivers one published event to multiple independent subscribers. Each subscriber has its own delivery state.', 'A topic carries facts; subscriptions represent independent reactions.', 'Ordering and parallelism depend on partition keys and consumer-group semantics.'],
      implementation: ['Choose topic boundaries from domain ownership and subscriber needs. Use filtering when it prevents irrelevant delivery without creating topic explosion.', 'Make every subscriber idempotent with subscriber/event dedupe.', 'Plan for replay, retention, slow subscribers and schema evolution.'],
      traps: ['Using pub/sub for direct commands that require one worker.', 'Assuming every subscriber keeps up.', 'Replay triggering external side effects again.', 'One hot partition limiting parallelism.'],
      incident: 'A slow analytics subscriber built a huge backlog but producers and other subscriptions looked healthy. Per-subscription lag and oldest-event age exposed the real issue.',
      interview: 'I would contrast queues and pub/sub, explain subscriber independence, delivery semantics, idempotency, ordering keys, replay and slow-subscriber isolation.',
      checklist: ['Is this a command or fact?', 'Who needs independent delivery?', 'What is retention?', 'Can subscribers replay safely?', 'What partition key preserves needed order?', 'How are slow subscribers alerted?'],
      keyTakeaways: ['Pub/sub fans out facts.', 'Each subscriber owns its backlog.', 'At-least-once delivery needs idempotency.', 'Replay is powerful and dangerous.']
    },
    15: {
      subtitle: 'Decouple producers and consumers through durable buffered work.',
      tags: ['Queues', 'ACK', 'Visibility timeout', 'Backpressure', 'DLQ'],
      focus: ['A queue provides temporal decoupling: producer can hand off work even when consumer processing happens later.', 'Most queues are at-least-once. Duplicate processing is normal and consumers must be idempotent.', 'Visibility timeout controls how long a message is hidden after a consumer receives it.'],
      implementation: ['ACK only after durable processing. Set visibility timeout above normal processing time and extend it for long jobs.', 'Use DLQ after bounded retry exhaustion. Track queue depth, oldest message age, retry count and consumer error rate.', 'Partition ordering by entity only where required; global ordering destroys scalability.'],
      traps: ['Visibility timeout too short causing concurrent duplicate processing.', 'Visibility timeout too long causing slow recovery.', 'Putting huge payloads directly in messages instead of claim-check pattern.', 'Using queue backlog as infinite capacity.'],
      incident: 'A consumer took 90 seconds but visibility timeout was 30 seconds. Three workers processed the same message concurrently. Idempotency and heartbeat/extend fixed the duplicate effect.',
      interview: 'I would describe producer, queue, consumer, ACK, visibility timeout, retries, DLQ, idempotent consumers and queue metrics as backpressure signals.',
      checklist: ['When is ACK sent?', 'What is visibility timeout?', 'Can processing be duplicated?', 'What is idempotency key?', 'When does DLQ happen?', 'What is oldest message age alert?'],
      keyTakeaways: ['Queues buffer work over time.', 'At-least-once means duplicates.', 'Visibility timeout is critical.', 'Backlog is deferred load, not solved load.']
    },
    14: {
      subtitle: 'Make repeated execution of one logical operation safe.',
      tags: ['Idempotency', 'Retries', 'Payments', 'Operation IDs', 'Duplicate delivery'],
      focus: ['Idempotency means the same logical operation can be repeated without additional unintended side effects.', 'HTTP method idempotency is not enough; business operations like payments need idempotency keys.', 'The server must store request fingerprint, status and response/outcome for the key.'],
      implementation: ['Insert a PENDING idempotency record before performing the side effect, using a unique constraint scoped by tenant/user/operation.', 'Reject same key with different payload fingerprint. Return stored result for duplicates after completion.', 'For external side effects, pass stable provider idempotency keys and reconcile ambiguous outcomes.'],
      traps: ['Checking for an existing key and then inserting without a unique constraint.', 'Using Redis-only storage for financial idempotency without durable recovery.', 'Letting a retry overwrite a manual review decision.', 'Caching transient 503 as final result.'],
      incident: 'A client retried payment after timeout. Without idempotency, two charges were possible. With operation_id unique constraint, the second request returns the original outcome.',
      interview: 'I would define a logical operation key, store it durably with request hash and response state, handle concurrent duplicates, and design recovery for unknown external outcomes.',
      checklist: ['What is the operation scope?', 'Where is the key stored?', 'Is there a unique constraint?', 'Is payload fingerprint checked?', 'What is PENDING behavior?', 'How are external ambiguous outcomes reconciled?'],
      keyTakeaways: ['Retries require idempotency.', 'Unique constraints enforce concurrency safety.', 'Same key with different payload is a conflict.', 'Idempotency and reconciliation belong together.']
    },
    13: {
      subtitle: 'Retry later, not all at once, using capped exponential delay and jitter.',
      tags: ['Backoff', 'Jitter', 'Retry storms', 'Deadlines', 'Retry-After'],
      focus: ['Immediate retries can worsen overload. Backoff gives the dependency time to recover and spreads caller pressure.', 'Jitter is essential; fixed exponential delays still synchronize a herd.', 'Backoff must fit the caller deadline and should not sleep while holding locks, transactions or scarce permits.'],
      implementation: ['Use capped exponential backoff with full or decorrelated jitter. Respect Retry-After where applicable.', 'Use different policies for synchronous user APIs, background jobs, webhooks and WebSocket reconnects.', 'Reset backoff only after stable success for long-lived connections.'],
      traps: ['Sleeping inside a DB transaction.', 'Backoff schedule exceeding request deadline.', 'All clients retrying at exactly 1s/2s/4s.', 'Multiple layers each doing retries and backoff.'],
      incident: 'After outage recovery, every client retried at the same fixed intervals and knocked the service back down. Full jitter spread recovery load.',
      interview: 'I would describe capped exponential backoff plus jitter, deadline awareness, Retry-After, and making one layer own retry policy to avoid amplification.',
      checklist: ['What failures are retryable?', 'What is total deadline?', 'What is max delay?', 'Is jitter applied?', 'Are locks held during sleep?', 'Which layer owns retries?'],
      keyTakeaways: ['Backoff reduces retry pressure.', 'Jitter prevents herds.', 'Deadlines bound retries.', 'Do not sleep while holding scarce resources.']
    },
    12: {
      subtitle: 'Repeat only safe transient work within a bounded retry budget.',
      tags: ['Retries', 'Transient failures', 'Idempotency', 'Timeouts', 'Retry budgets'],
      focus: ['Retries are useful only when the next attempt has a meaningful chance of success.', 'Timeout outcome may be unknown; retrying non-idempotent operations can duplicate side effects.', 'Retry amplification happens when clients, gateways, services and SDKs all retry independently.'],
      implementation: ['Classify failures: connect failure, read timeout, 429, 503, 4xx validation, business rejection and DB deadlock all need different behavior.', 'Set per-attempt timeout and total deadline. Use idempotency keys for POST-like business operations.', 'Keep retry budgets and expose attempt metrics.'],
      traps: ['Retrying card declined or validation failures.', 'Retrying read timeout on payment without idempotency.', 'Layered retries multiplying traffic.', 'Ignoring Retry-After on 429/503.'],
      incident: 'A payment service timed out after sending charge, then retried without idempotency. The provider processed both. Idempotency keys and reconciliation made retries safe.',
      interview: 'I would retry only transient safe operations, with bounded attempts, backoff/jitter, total deadline, idempotency for side effects, and one layer owning policy.',
      checklist: ['Is failure transient?', 'Is operation idempotent?', 'What is total timeout?', 'Who else retries?', 'Is Retry-After respected?', 'What metrics show attempts?'],
      keyTakeaways: ['Retries are not free.', 'Idempotency is required for side effects.', 'Total deadline matters.', 'Retry storms are self-DDoS.']
    },
    11: {
      subtitle: 'Bound every wait so resources are not held indefinitely.',
      tags: ['Timeouts', 'Deadlines', 'Database', 'HTTP clients', 'Cancellation'],
      focus: ['A timeout is a resource budget and a correctness boundary. After a timeout, the remote operation may still complete.', 'Different waits need different timeouts: pool acquisition, connect, TLS, write, response header, read, query, lock and total deadline.', 'Timeout hierarchy should align from client through gateway, service, database and downstream calls.'],
      implementation: ['Use request deadlines and propagate remaining budget where possible. Set pool/query/downstream timeouts shorter than the caller deadline.', 'Classify timeout errors by stage so incidents are diagnosable.', 'Do not wrap remote calls inside DB transactions while waiting.'],
      traps: ['Only setting connect timeout but no read timeout.', 'Client times out before service does, leaving useless work running.', 'Long DB lock waits hidden as query slowness.', 'Timeout retries without idempotency.'],
      incident: 'API gateway timed out at 3s, but service held DB transaction for 30s and kept working after client disconnect. Deadline propagation and cancellation reduced wasted work.',
      interview: 'I would define a request budget, assign stage-specific timeouts, classify timeout source, coordinate with retries and idempotency, and monitor P95/P99 duration by stage.',
      checklist: ['What is end-to-end deadline?', 'What are connect/read/query/lock/pool timeouts?', 'Can operation complete after timeout?', 'Is retry safe?', 'Are timeouts observable by stage?', 'Are long waits holding transactions?'],
      keyTakeaways: ['Timeouts bound resource use.', 'Timeout outcome can be unknown.', 'Stage-specific timeouts matter.', 'Deadlines coordinate layers.']
    },
    10: {
      subtitle: 'Stop spending resources on a dependency that is already failing.',
      tags: ['Circuit breaker', 'Resilience4j', 'Fallbacks', 'Bulkheads', 'Cascading failure'],
      focus: ['A circuit breaker prevents repeated calls to an unhealthy dependency so failure does not cascade.', 'States are closed, open and half-open. Thresholds can consider failure rate and slow-call rate.', 'Fallback must be safe; it should degrade behavior, not hide critical correctness failures.'],
      implementation: ['Use per-dependency/per-operation breakers, not one global breaker. Classify errors: business rejection is not infrastructure failure.', 'Combine with timeouts, bulkheads and retry ordering carefully. Usually timeout around call, breaker observes outcomes, retries are bounded.', 'Emit breaker state, not-permitted calls, failure rate and slow-call rate.'],
      traps: ['Fallback performing another expensive failing call.', 'Counting 400 validation or card decline as dependency failure.', 'Half-open letting a thundering herd through.', 'Making readiness fail for optional dependencies.'],
      incident: 'A slow payment provider saturated app threads. Circuit breaker opened and served “payment temporarily unavailable” while preserving the rest of checkout.',
      interview: 'I would explain states, sliding window thresholds, slow-call detection, fallback design, half-open trial limits, and interaction with timeouts/retries/bulkheads.',
      checklist: ['What dependency and operation?', 'Which errors count?', 'What slow threshold?', 'What fallback is safe?', 'How many half-open trials?', 'What metrics and alerts?'],
      keyTakeaways: ['Breakers contain failure.', 'Fallbacks are business decisions.', 'Slow calls are failures too.', 'Classify errors carefully.']
    },
    9: {
      subtitle: 'Find changing service instances through stable logical names.',
      tags: ['Service discovery', 'DNS', 'Kubernetes Service', 'Eureka', 'Health'],
      focus: ['Service discovery maps a logical service identity to current healthy endpoints. Hardcoded IPs fail with autoscaling and pod churn.', 'Kubernetes service discovery uses stable service names and dynamic endpoint sets.', 'DNS is a mechanism, not the whole concept; caching and health semantics matter.'],
      implementation: ['Prefer platform-native discovery in Kubernetes through Services and DNS. For non-K8s, use registry plus health checks or server-side load balancing.', 'Understand client-side versus server-side discovery and how health state is updated.', 'Set JVM DNS cache behavior deliberately if relying on DNS changes.'],
      traps: ['Hardcoding pod IPs.', 'Over-caching DNS and ignoring endpoint changes.', 'Registry split brain or stale health state.', 'Service discovery used as authorization boundary.'],
      incident: 'A JVM cached a DNS answer too long after failover, continuing to call dead endpoints. DNS TTL and connection recycling needed review.',
      interview: 'I would explain logical names, registration, health, endpoints, DNS caching, client/server-side discovery, and the difference from load balancing.',
      checklist: ['How are instances registered?', 'What health makes endpoint eligible?', 'How fast is removal?', 'What caches discovery results?', 'Does routing prefer zone/locality?', 'What happens if registry fails?'],
      keyTakeaways: ['Discovery decouples clients from instance IPs.', 'Health and cache behavior matter.', 'K8s Services are discovery plus stable routing.', 'Discovery is not authorization.']
    },
    8: {
      subtitle: 'Let a control plane continuously reconcile desired container state.',
      tags: ['Kubernetes', 'Pods', 'Services', 'Deployments', 'Probes'],
      focus: ['Kubernetes is a desired-state reconciliation system. Controllers compare declared state with actual state and act to reduce drift.', 'Pods are disposable units. Services provide stable virtual access to changing Pods.', 'Requests, limits, readiness and liveness determine scheduling, rollout and traffic behavior.'],
      implementation: ['Use Deployments for stateless apps, Services for stable access, Ingress/Gateway for external routing, ConfigMaps/Secrets for config, and HPA for scaling when metrics justify it.', 'Use readiness for traffic eligibility and liveness for process deadlock recovery. Startup probes protect slow-start apps.', 'Set resource requests/limits and graceful shutdown hooks.'],
      traps: ['Treating Pods like VMs.', 'No resource requests leading to poor scheduling.', 'Liveness probe depending on database and restarting every pod during DB outage.', 'Storing uploads in container filesystem.'],
      incident: 'A DB outage caused liveness checks to fail, restarting every app pod and creating reconnect storms. DB dependency belongs in readiness/degraded checks, not liveness.',
      interview: 'I would describe API server, etcd, scheduler, kubelet, Pods, Deployments, Services, probes, rolling updates, resource management and failure behavior.',
      checklist: ['What is desired state?', 'What owns Pods?', 'How is traffic routed?', 'Are probes correct?', 'Are resources set?', 'Can the pod shut down gracefully?'],
      keyTakeaways: ['Kubernetes reconciles desired state.', 'Pods are disposable.', 'Readiness and liveness differ.', 'Resource settings are production behavior.']
    },
    7: {
      subtitle: 'Package application code and runtime dependencies into repeatable containers.',
      tags: ['Docker', 'Images', 'Containers', 'Layers', 'Security'],
      focus: ['An image is an immutable filesystem plus metadata. A container is a running process created from that image.', 'Docker uses the host kernel; it is not a full VM.', 'Layering, build context and multi-stage builds shape image size, security and cache efficiency.'],
      implementation: ['Use multi-stage builds, .dockerignore, non-root users, small base images, explicit versions, stdout/stderr logs and health checks.', 'Do not bake secrets into images. Inject config at runtime through environment/secrets systems.', 'Set JVM/container memory behavior and resource limits.'],
      traps: ['Using latest tags in production.', 'Storing persistent data inside containers.', 'Running as root unnecessarily.', 'Huge images due to untrimmed build context.', 'Ignoring PID 1 signal handling.'],
      incident: 'A container ignored SIGTERM during deployment and was killed mid-request. Proper signal handling and graceful shutdown fixed rolling deploy correctness.',
      interview: 'I would explain image versus container, layers, multi-stage builds, immutable artifacts, runtime config, logs, health checks, security and resource limits.',
      checklist: ['Is build reproducible?', 'Are secrets excluded?', 'Is the image small enough?', 'Does it run non-root?', 'How are logs emitted?', 'How does it handle SIGTERM?'],
      keyTakeaways: ['Images are artifacts; containers are processes.', 'Containers should be disposable.', 'Runtime config stays outside image.', 'Security starts at the Dockerfile.']
    },
    6: {
      subtitle: 'Move code to production through repeatable verification and controlled release.',
      tags: ['CI/CD', 'Artifacts', 'Deployment', 'Rollback', 'Migrations'],
      focus: ['CI verifies changes continuously. CD promotes an immutable artifact through environments with controlled gates.', 'Build once, promote the same artifact. Rebuilding per environment breaks traceability.', 'Database migrations must tolerate old and new app versions during rolling deployments.'],
      implementation: ['Use PR checks, unit/integration/contract tests, scanning, artifact signing/SBOM where relevant, and environment-specific config outside the artifact.', 'Deploy with rolling, canary or blue-green depending on risk. Monitor business and technical smoke signals after rollout.', 'Use OIDC/short-lived credentials and least privilege for pipelines.'],
      traps: ['Deploying latest instead of immutable digests.', 'Long-lived cloud keys in CI secrets.', 'Breaking migrations that require old and new code simultaneously.', 'Rollback that cannot handle database shape.'],
      incident: 'A new app version expected a non-null column before the backfill completed. Expand-and-contract migration would have preserved compatibility.',
      interview: 'I would cover build once/promote, test pyramid, artifact immutability, secrets, deployment strategies, DB migrations, rollback and post-deploy observability.',
      checklist: ['What artifact is promoted?', 'What checks gate merge?', 'How are secrets provided?', 'Is migration backward-compatible?', 'What is rollback plan?', 'What metrics trigger abort?'],
      keyTakeaways: ['CI/CD is a safety system.', 'Artifacts should be immutable.', 'Migrations need compatibility windows.', 'Deployment strategy is risk management.']
    },
    5: {
      subtitle: 'Centralize API-facing policy without stealing domain logic from services.',
      tags: ['API Gateway', 'Auth', 'Rate limits', 'Quotas', 'Versioning'],
      focus: ['An API gateway is the north-south API policy boundary: authentication, quotas, validation, routing and API analytics.', 'It is different from a load balancer because it understands API identity and policy.', 'It should not become a domain monolith. Business invariants belong in services.'],
      implementation: ['Use gateway for JWT/API key validation, coarse authorization, rate limits, request size limits, API version routing, header normalization and observability.', 'Keep service-to-service trust explicit; services should verify identity/authorization or trust only headers inserted by a protected gateway path.', 'Use BFF patterns when client-specific aggregation is beneficial.'],
      traps: ['Putting pricing, wallet debit or inventory allocation in the gateway.', 'Trusting gateway headers while direct service access remains open.', 'Gateway retries on non-idempotent POSTs.', 'Too many transformations hiding API contracts.'],
      incident: 'A backend trusted X-User-Id because the gateway set it, but direct origin access let clients spoof it. Network policy and header stripping fixed the trust boundary.',
      interview: 'I would contrast LB/proxy/gateway, then describe auth, quotas, validation, routing, observability and why domain logic stays in services.',
      checklist: ['What policy belongs at API edge?', 'Can origin bypass gateway?', 'Are inserted headers sanitized?', 'What retries are safe?', 'How is API version routed?', 'What gateway metrics matter?'],
      keyTakeaways: ['Gateway enforces API policy.', 'Business logic stays downstream.', 'Trust boundary must be closed.', 'Retries and transformations need care.']
    },
    4: {
      subtitle: 'Use an internal front door for TLS, routing, buffering, headers and static delivery.',
      tags: ['Reverse proxy', 'NGINX', 'Headers', 'TLS', 'WebSockets'],
      focus: ['A reverse proxy sits in front of backend services and mediates requests on their behalf.', 'It can terminate TLS, rewrite paths, forward trusted headers, compress responses, buffer slow clients and route WebSockets/SSE.', 'It is part of the trust boundary; header handling is security-sensitive.'],
      implementation: ['Normalize and overwrite forwarding headers at the last trusted proxy. Configure request/body limits, timeout hierarchy, compression and static file serving deliberately.', 'Disable buffering for streaming endpoints like SSE. Set WebSocket upgrade headers correctly.', 'Implement CORS allowlists rather than reflecting arbitrary origins.'],
      traps: ['Blindly trusting X-Forwarded-For from clients.', 'Leaving public origin bypass open while relying on proxy-added headers.', 'Proxy timeouts shorter or longer than app deadlines without design.', 'Buffering large uploads in memory/disk unexpectedly.'],
      incident: 'A service used leftmost XFF for rate limiting while clients could hit origin directly and spoof it. Closing bypass and sanitizing headers fixed the client-IP model.',
      interview: 'I would explain forward versus reverse proxy, TLS termination, headers, buffering, routing, static files, CORS, WebSockets and trust boundaries.',
      checklist: ['Who can reach origin?', 'Which headers are overwritten?', 'Are timeouts aligned?', 'Is streaming buffered?', 'What size limits exist?', 'Is CORS allowlisted?'],
      keyTakeaways: ['Reverse proxy is backend front door.', 'Headers are trust-sensitive.', 'Timeout/buffering affect correctness.', 'Origin bypass can break security assumptions.']
    },
    3: {
      subtitle: 'Distribute traffic across healthy targets while managing health, draining and retries.',
      tags: ['Load balancing', 'L4/L7', 'Health checks', 'Draining', 'Stickiness'],
      focus: ['A load balancer is a traffic policy engine, not just a random distributor.', 'Layer 4 balances connections; Layer 7 understands HTTP host/path/header/cookie routing.', 'Health checks decide target eligibility, and draining protects in-flight work during deployments.'],
      implementation: ['Choose algorithm from workload: round-robin, weighted, least-connections, latency-aware or consistent hashing.', 'Use shallow readiness for target eligibility; avoid deep checks that remove every target because a shared dependency failed.', 'Configure connection draining, slow start and retry behavior carefully.'],
      traps: ['Sticky sessions hiding stateful app design.', 'LB retrying non-idempotent POSTs.', 'Health check path doing expensive dependency calls.', 'Cross-zone routing cost or uneven capacity surprises.'],
      incident: 'A deep health check depended on the database. DB slowdown made every app target unhealthy, amplifying outage. A separate readiness/dependency-status design reduced blast radius.',
      interview: 'I would discuss L4 vs L7, algorithms, health checks, draining, TLS termination, sticky sessions, retries and observability metrics such as target errors and latency.',
      checklist: ['What layer is needed?', 'What algorithm fits?', 'What does health check prove?', 'How are deployments drained?', 'Are retries safe?', 'How is target imbalance monitored?'],
      keyTakeaways: ['LB controls traffic eligibility.', 'Health checks can cause outages.', 'Draining matters for deploys.', 'Retries must be idempotency-aware.']
    },
    2: {
      subtitle: 'Store expensive results close to callers while making freshness a deliberate trade-off.',
      tags: ['Caching', 'TTL', 'Invalidation', 'Redis', 'Stampede'],
      focus: ['A cache improves latency and reduces source load, but the cached value may be stale.', 'The database or authoritative service remains source of truth unless you intentionally design otherwise.', 'The hardest part of caching is not storing data; it is invalidation, stampede control and failure behavior.'],
      implementation: ['Use cache-aside for many backend reads: check cache, load source on miss, populate with TTL and jitter.', 'Use local Caffeine for tiny hot data and Redis/Memcached for shared distributed cache. Use CDN/browser caches for public/static content.', 'Protect hot keys with request coalescing, stale-while-revalidate or locks.'],
      traps: ['Caching authorization decisions without safe TTL/revocation.', 'Cache avalanche from synchronized TTLs.', 'Penetration from repeated missing keys without negative caching.', 'Stale value resurrected after invalidation due to race.'],
      incident: 'A popular product key expired on every node at once and thousands of requests hit the database. TTL jitter plus single-flight refill fixed the stampede.',
      interview: 'I would start with staleness tolerance, then choose cache layer, key design, TTL, invalidation, stampede prevention, failure mode and metrics.',
      checklist: ['What is source of truth?', 'How stale may data be?', 'What is cache key?', 'How is invalidation triggered?', 'What happens on cache outage?', 'How are hot keys protected?'],
      keyTakeaways: ['Caching trades freshness for speed.', 'Invalidation is the hard part.', 'Stampede must be controlled.', 'Cache failures need explicit behavior.']
    },
    1: {
      subtitle: 'Limit admitted work by operation and caller signal so overload and abuse stay bounded.',
      tags: ['Rate limiting', 'Token bucket', 'Redis', '429', 'Abuse protection'],
      focus: ['Rate limiting is admission control: decide who is calling, what they are calling, how costly it is, and how much is allowed.', 'Authenticated requests should usually limit by user, tenant, API key or app identity; unauthenticated requests need layered weaker signals.', 'IP is a coarse abuse signal, not a reliable identity behind NAT, proxies or botnets.'],
      implementation: ['Apply coarse volumetric protection at CDN/WAF/edge and business-aware limits in the app. Use Redis/Lua or a mature limiter for distributed counters.', 'Use endpoint-level, identity-level, global and sometimes cost-weighted buckets. Return 429 with Retry-After where safe.', 'For unauthenticated endpoints combine IP, endpoint, submitted identifier hash, signed session/device cookies and global limits.'],
      traps: ['Blindly trusting X-Forwarded-For.', 'Per-IP limits blocking shared NAT users.', 'No limits on expensive endpoints.', 'Retries turning 429 into more traffic.', 'Fail-open/fail-closed not defined for limiter outage.'],
      incident: 'A login endpoint limited only by IP. Corporate NAT users blocked each other while attackers rotated IPs. Adding account/submitted-identifier and session/device signals improved fairness and abuse resistance.',
      interview: 'I would explain algorithms such as token bucket and sliding window, key choice, edge/app layering, trusted proxy handling, Redis atomicity, 429 responses and observability.',
      checklist: ['What identity or signal is used?', 'Is endpoint cost considered?', 'What layer enforces the limit?', 'Is XFF trusted?', 'What happens on Redis failure?', 'What metrics reveal throttling impact?'],
      keyTakeaways: ['Limit work before overload.', 'Identity choice matters more than algorithm.', 'IP is weak alone.', 'Rate limiter failure policy must be explicit.']
    }
  };

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function p(text) { return `<p>${esc(text)}</p>`; }
  function list(items, className = '') {
    return `<ul${className ? ` class="${className}"` : ''}>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
  }
  function mini(title, body) {
    return `<div class="mini-card"><h4>${esc(title)}</h4><p>${esc(body)}</p></div>`;
  }
  function code(label, text) {
    return `<div class="code-block"><span class="code-label">${esc(label)}</span><pre>${esc(text)}</pre></div>`;
  }

  Object.keys(notes).map(Number).sort((a, b) => b - a).forEach((day) => {
    const meta = (window.LESSONS || []).find((lesson) => lesson.day === day);
    const n = notes[day];
    if (!meta || !n) return;
    meta.status = 'expanded';
    window.FULL_LESSONS[meta.slug] = {
      day,
      title: meta.title,
      subtitle: n.subtitle,
      tags: n.tags,
      core: n.focus[0],
      sections: [
        {
          title: '1. Core mental model',
          diagram: meta.diagram,
          body: n.focus.map(p).join('') + code('decision frame', `${meta.title}\n  ↓\nWhat problem does it solve?\n  ↓\nWhat trade-off does it introduce?\n  ↓\nWhat production signal tells us it is failing?`)
        },
        {
          title: '2. Production implementation pattern',
          body: n.implementation.map(p).join('') + `<div class="callout good"><strong>Practical angle:</strong> Treat this as an operational design decision, not a library checkbox. The implementation must define ownership, failure behavior, observability and rollback/repair path.</div>`
        },
        {
          title: '3. Edge cases and traps',
          body: list(n.traps, 'checklist') + `<div class="callout warn"><strong>Review habit:</strong> For this topic, ask what happens under retries, timeouts, deployment, partial failure and high concurrency. Most production bugs hide there.</div>`
        },
        {
          title: '4. Production incident pattern',
          diagram: `flowchart LR\nNormal[Normal traffic] --> Trigger[Trigger: scale/failure/deploy]\nTrigger --> Hidden[Hidden assumption breaks]\nHidden --> Symptom[Latency/errors/stale state]\nSymptom --> Fix[Bounded fix + metric + test]`,
          body: mini('Incident shape', n.incident) + p('The useful lesson is not only the fix. It is the hidden assumption that made the incident possible and the metric or test that would have exposed it earlier.')
        },
        {
          title: '5. Interview-style reasoning',
          body: p(n.interview) + `<div class="callout"><strong>Stronger answer:</strong> Give the mechanism, the trade-off, the failure mode, and one concrete production example. Avoid naming a technology before explaining the invariant or bottleneck.</div>`
        },
        {
          title: '6. Design checklist',
          body: list(n.checklist, 'checklist')
        }
      ],
      keyTakeaways: n.keyTakeaways
    };
  });
})();
