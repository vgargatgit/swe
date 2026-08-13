(function (global) {
  'use strict';
  const { n, x, p, grid, c, t, sm, sq, fo, tp, tr, d, fc, mb, rm, ls, pb } = global.SWEBespokeDSL;
  const data = global.SWEBespokeBlueprintData = global.SWEBespokeBlueprintData || [];

  data.push(
    {
      day: 13,
      slug: 'day-13-exponential-backoff',
      sections: [
        x('formula|exponential|delay calculation', 1, t(
          'Backoff grows quickly so repeated failure consumes progressively less capacity',
          [
            n('Attempt 1', 'normal request fails', 'api', 'blue'),
            n('Base delay', 'short first pause', 'clock', 'cyan'),
            n('Attempt 2', 'retry only if budget remains', 'retry', 'violet'),
            n('Longer delay', 'multiplier increases recovery space', 'clock', 'amber'),
            n('Capped attempt', 'delay stops growing beyond configured maximum', 'shield', 'green')
          ]
        )),
        x('jitter', 3, grid(
          'Jitter strategies trade randomness, convergence speed, and herd reduction',
          [
            n('No jitter', 'All clients retry at the same deterministic times.', 'alert', 'danger'),
            n('Full jitter', 'Choose uniformly between zero and the exponential cap.', 'pulse', 'green'),
            n('Equal jitter', 'Keep half the delay and randomize the remainder.', 'scale', 'blue'),
            n('Decorrelated jitter', 'Derive the next delay from the previous randomized delay.', 'retry', 'violet')
          ]
        )),
        x('cap|maximum delay', 5, d(
          'A maximum delay prevents recovery from becoming indefinitely slow',
          n('Has the exponential delay reached the cap?', 'The cap bounds user-visible latency and operational recovery time.', 'clock', 'violet'),
          [
            n('Below cap', 'Continue exponential growth plus jitter.', 'chart', 'blue'),
            n('At cap', 'Randomize around the bounded maximum.', 'shield', 'green'),
            n('Deadline exhausted', 'Stop retrying and return or reconcile.', 'x', 'danger')
          ]
        )),
        x('thundering herd|retry storm|synchron', 7, fc(
          'Deterministic retry timing recreates the overload in synchronized waves',
          [
            n('Dependency fails', 'many clients observe the same failure', 'alert', 'danger'),
            n('Equal delay expires', 'clients wake together', 'clock', 'amber'),
            n('Retry wave arrives', 'recovery capacity is instantly consumed', 'retry', 'violet'),
            n('Dependency fails again', 'another larger synchronized wave is scheduled', 'chart', 'danger')
          ]
        )),
        x('deadline|budget|elapsed time', 9, mb(
          'Backoff is useful only inside a bounded retry budget',
          [
            { label: 'Caller deadline', value: '5 s', note: 'total useful time', icon: 'clock', tone: 'blue' },
            { label: 'Max attempts', value: '4', note: 'hard amplification bound', icon: 'scale', tone: 'violet' },
            { label: 'Delay cap', value: '1 s', note: 'bounded recovery pause', icon: 'shield', tone: 'green' },
            { label: 'Jitter', value: 'full', note: 'break fleet synchronization', icon: 'pulse', tone: 'amber' },
            { label: 'Stop condition', value: 'budget exhausted', note: 'return, queue, or reconcile', icon: 'x', tone: 'danger' }
          ]
        ))
      ]
    },
    {
      day: 14,
      slug: 'day-14-idempotency',
      sections: [
        x('state|lifecycle|new key|completed key|in.progress', 1, sm(
          'An idempotency record is a durable state machine for one logical operation',
          [
            n('ABSENT', 'no operation owns this key', 'key', 'blue'),
            n('IN_PROGRESS', 'one executor reserved the key', 'clock', 'amber'),
            n('COMPLETED', 'stored response can be replayed', 'check', 'green'),
            n('FAILED_RECONCILABLE', 'outcome needs status lookup or repair', 'alert', 'danger')
          ],
          [
            ['ABSENT', 'IN_PROGRESS', 'atomic reservation'],
            ['IN_PROGRESS', 'COMPLETED', 'side effect and response persist'],
            ['IN_PROGRESS', 'FAILED_RECONCILABLE', 'ambiguous failure'],
            ['FAILED_RECONCILABLE', 'COMPLETED', 'reconciliation proves outcome']
          ]
        )),
        x('fingerprint|request hash|same key.*different', 3, grid(
          'The key must be bound to the logical request it represents',
          [
            n('Caller scope', 'Prevent one tenant from replaying another tenant’s key.', 'fingerprint', 'blue'),
            n('Operation', 'Bind the key to endpoint and business action.', 'route', 'violet'),
            n('Payload fingerprint', 'Reject reuse with materially different input.', 'api', 'amber'),
            n('Version / contract', 'Avoid replaying a response under incompatible semantics.', 'layers', 'green')
          ]
        )),
        x('atomic|race|reservation|concurrent', 5, sq(
          'Atomic reservation permits exactly one executor for a new key',
          ['Caller A', 'Idempotency store', 'Caller B', 'Business service'],
          [
            ['Caller A', 'Idempotency store', 'reserve key if absent'],
            ['Caller B', 'Idempotency store', 'same reservation loses'],
            ['Idempotency store', 'Caller B', 'report in-progress or wait policy'],
            ['Caller A', 'Business service', 'perform side effect once'],
            ['Business service', 'Idempotency store', 'store final outcome atomically enough for replay']
          ]
        )),
        x('in.progress|concurrent duplicate|what should duplicate', 7, d(
          'A duplicate arriving during execution needs an explicit concurrency policy',
          n('The key exists but has no final response yet', 'The first call may still be running or may have failed ambiguously.', 'clock', 'violet'),
          [
            n('Wait briefly', 'Useful for fast bounded operations.', 'clock', 'blue'),
            n('Return 409 / 202', 'Expose current operation state to the caller.', 'api', 'amber'),
            n('Status lookup', 'Let the caller poll a durable operation resource.', 'route', 'green'),
            n('Reconcile', 'Investigate ambiguous external side effects.', 'alert', 'danger')
          ]
        )),
        x('ttl|retention|expiry', 9, t(
          'Idempotency retention must outlive realistic retries and reconciliation',
          [
            n('Initial request', 'reserve key and begin work', 'api', 'blue'),
            n('Client timeout', 'caller may not know whether work completed', 'clock', 'amber'),
            n('Delayed retry', 'same key should still replay or expose status', 'retry', 'violet'),
            n('Business settlement window', 'external systems may confirm later', 'coins', 'green'),
            n('Safe expiry', 'remove only after duplicate and reconciliation risk is bounded', 'x', 'danger')
          ]
        ))
      ]
    },
    {
      day: 15,
      slug: 'day-15-message-queues',
      sections: [
        x('producer|consumer|basic|queue flow', 1, p(
          'A queue turns synchronous pressure into durable buffered work',
          [
            n('Producer', 'publish a durable work item', 'api', 'blue'),
            n('Queue', 'buffer according to retention and capacity', 'queue', 'violet'),
            n('Consumer receives', 'gain temporary ownership through visibility', 'server', 'cyan'),
            n('Process', 'perform idempotent business work', 'brain', 'amber'),
            n('ACK or redelivery', 'delete on success or retry after ownership expires', 'retry', 'green')
          ]
        )),
        x('visibility timeout|lease', 3, sq(
          'Visibility timeout is a lease on one delivery attempt',
          ['Queue', 'Consumer A', 'Consumer B'],
          [
            ['Queue', 'Consumer A', 'deliver message and hide it'],
            ['Consumer A', 'Consumer A', 'process within visibility window'],
            ['Consumer A', 'Queue', 'ACK deletes message on success'],
            ['Queue', 'Consumer B', 'redeliver if visibility expires without ACK'],
            ['Consumer B', 'Consumer B', 'must tolerate duplicate execution']
          ]
        )),
        x('ack|nack|delete|failure classification', 5, d(
          'Delivery outcome determines whether the message disappears, retries, or quarantines',
          n('How did processing end?', 'Classify the business and infrastructure result, not merely the exception type.', 'filter', 'violet'),
          [
            n('Success', 'ACK and remove from the main queue.', 'check', 'green'),
            n('Transient failure', 'Release or wait for redelivery with backoff.', 'retry', 'amber'),
            n('Permanent poison', 'Send to DLQ with diagnostic context.', 'alert', 'danger')
          ]
        )),
        x('ordering|partition|message group', 7, fo(
          'Ordering is usually preserved only inside an explicit partition or group',
          n('Producer', 'choose ordering key', 'api', 'blue'),
          n('Partition router', 'hash account, order, or aggregate identity', 'route', 'violet'),
          [
            n('Partition A', 'ordered stream for key family A', 'queue', 'cyan'),
            n('Partition B', 'independent ordered stream', 'queue', 'amber'),
            n('Partition C', 'parallelism across unrelated keys', 'queue', 'green')
          ]
        )),
        x('consumer scaling|backlog|throughput|concurrency', 9, tp(
          'Consumer concurrency is bounded by partitions, downstream capacity, and processing time',
          n('Queue backlog', 'durable work waiting for capacity', 'queue', 'violet'),
          [
            n('Consumer 1', 'bounded worker pool', 'server', 'blue'),
            n('Consumer 2', 'independent delivery attempts', 'server', 'cyan'),
            n('Database', 'finite write and lock capacity', 'database', 'amber'),
            n('Autoscaler', 'uses age and backlog, not CPU alone', 'chart', 'green')
          ]
        ))
      ]
    },
    {
      day: 16,
      slug: 'day-16-pubsub',
      sections: [
        x('topic|publisher|subscriber|basic', 1, fo(
          'One event becomes independent delivery streams',
          n('Publisher', 'emit one durable fact', 'api', 'blue'),
          n('Topic', 'retain and fan out by subscription', 'queue', 'violet'),
          [
            n('Search', 'index on its own schedule', 'filter', 'cyan'),
            n('Analytics', 'aggregate independently', 'chart', 'amber'),
            n('Notification', 'send user communication', 'user', 'green')
          ]
        )),
        x('subscription isolation|independent subscription|consumer failure', 3, c(
          'Subscriptions share the event but not their delivery state',
          [
            n('Search subscription', 'May lag or retry without blocking analytics.', 'filter', 'blue'),
            n('Analytics subscription', 'Owns its backlog, retention, and scale.', 'chart', 'violet'),
            n('Notification subscription', 'Can quarantine email failures independently.', 'user', 'amber')
          ]
        )),
        x('ordering|partition key', 5, rm(
          'A stable partition key defines the scope of ordering',
          [
            { from: 'orderId=101', fromNote: 'events for one order', to: 'Partition 2', toNote: 'ordered relative to order 101', tone: 'blue' },
            { from: 'orderId=202', fromNote: 'different aggregate', to: 'Partition 5', toNote: 'processed in parallel', tone: 'violet' },
            { from: 'tenantId=acme', fromNote: 'coarser key', to: 'Hot partition risk', toNote: 'all tenant traffic serialized', tone: 'danger' }
          ]
        )),
        x('retention|replay|offset|cursor', 7, t(
          'Retention turns pub/sub into a recoverable history rather than a transient signal',
          [
            n('Event published', 'stored with sequence or offset', 'api', 'blue'),
            n('Consumer advances', 'checkpoint records applied progress', 'check', 'green'),
            n('Consumer fails', 'subscription lag grows while events remain retained', 'alert', 'amber'),
            n('Restart / replay', 'resume from last committed offset', 'retry', 'violet'),
            n('Retention expires', 'older history now needs another rebuild source', 'clock', 'danger')
          ]
        )),
        x('schema|version|evolution', 9, d(
          'Event evolution must preserve compatibility across independently deployed consumers',
          n('Can old and new consumers interpret this event?', 'The producer cannot assume every subscriber deploys simultaneously.', 'api', 'violet'),
          [
            n('Additive change', 'Add optional fields with safe defaults.', 'check', 'green'),
            n('Semantic change', 'Publish a new event version or type.', 'layers', 'amber'),
            n('Breaking removal', 'Migrate consumers before retiring old fields.', 'alert', 'danger')
          ]
        ))
      ]
    },
    {
      day: 17,
      slug: 'day-17-event-driven-architecture',
      sections: [
        x('event.*command|command.*event', 1, tr(
          'Commands request an action; events record a fact that already happened',
          n('Command', 'Directed intent with an expected owner and outcome.', 'route', 'blue'),
          n('Event', 'Past-tense fact available to many independent reactors.', 'queue', 'violet'),
          'Intent versus fact'
        )),
        x('outbox|atomic publication|dual write', 3, p(
          'The transactional outbox closes the database-plus-broker dual-write gap',
          [
            n('Business transaction', 'write authoritative domain state', 'database', 'blue'),
            n('Outbox row', 'record event intent in the same commit', 'queue', 'violet'),
            n('Relay', 'publish unpublished rows with retry', 'retry', 'amber'),
            n('Event bus', 'retain and deliver to subscriptions', 'route', 'cyan'),
            n('Consumers', 'apply idempotently and checkpoint', 'check', 'green')
          ]
        )),
        x('choreography|orchestration', 5, tr(
          'Coordination can emerge from events or be directed by an explicit orchestrator',
          n('Choreography', 'Services react to facts; coupling is distributed through event contracts.', 'queue', 'blue'),
          n('Orchestration', 'A durable coordinator directs steps and owns workflow state.', 'brain', 'violet'),
          'Distributed autonomy versus explicit control'
        )),
        x('idempotent consumer|duplicate|dedup', 7, sm(
          'A consumer must converge when the same event is delivered repeatedly',
          [
            n('RECEIVED', 'event arrives with stable identity', 'api', 'blue'),
            n('CHECKED', 'dedup or version guard evaluated', 'key', 'violet'),
            n('APPLIED', 'local transaction commits projection and checkpoint', 'check', 'green'),
            n('DUPLICATE', 'no repeated business side effect', 'retry', 'amber')
          ],
          [
            ['RECEIVED', 'CHECKED', 'begin local transaction'],
            ['CHECKED', 'APPLIED', 'event is new'],
            ['CHECKED', 'DUPLICATE', 'event already applied'],
            ['APPLIED', 'RECEIVED', 'next delivery']
          ]
        )),
        x('reconciliation|repair|rebuild|replay', 10, p(
          'Event-driven correctness includes an independent repair path',
          [
            n('Authoritative state', 'source database owns truth', 'database', 'blue'),
            n('Derived state', 'search, cache, and read models may drift', 'layers', 'amber'),
            n('Reconciler', 'compare versions, counts, or checksums', 'chart', 'violet'),
            n('Repair command', 'replay or rebuild only the missing range', 'retry', 'green'),
            n('Verification', 'prove convergence after repair', 'check', 'cyan')
          ]
        ))
      ]
    },
    {
      day: 18,
      slug: 'day-18-distributed-transactions',
      sections: [
        x('local.*distributed|distributed.*local', 1, tr(
          'A local transaction controls one authority; a distributed operation spans independent failure domains',
          n('Local transaction', 'One database can atomically commit or roll back all changes.', 'database', 'green'),
          n('Distributed operation', 'Services commit, time out, and recover independently.', 'layers', 'danger'),
          'Single authority versus coordinated authorities'
        )),
        x('two.phase|2pc|prepare.*commit', 3, sq(
          'Two-phase commit separates readiness from the final commit decision',
          ['Coordinator', 'Participant A', 'Participant B'],
          [
            ['Coordinator', 'Participant A', 'PREPARE and lock resources'],
            ['Coordinator', 'Participant B', 'PREPARE and lock resources'],
            ['Participant A', 'Coordinator', 'vote YES / NO'],
            ['Participant B', 'Coordinator', 'vote YES / NO'],
            ['Coordinator', 'Participant A', 'COMMIT or ABORT decision'],
            ['Coordinator', 'Participant B', 'same durable decision']
          ],
          'Prepared participants may block while the coordinator or network is unavailable.'
        )),
        x('uncertain|ambiguous|timeout after commit', 5, d(
          'A timeout cannot tell the caller whether a remote commit happened',
          n('The response was lost after the request crossed an authority boundary', 'Failure timing creates an unknown outcome rather than a clean rollback.', 'alert', 'violet'),
          [
            n('Known not committed', 'Retry or return the real failure.', 'x', 'danger'),
            n('Known committed', 'Return or reconstruct the committed result.', 'check', 'green'),
            n('Unknown', 'Use status lookup, idempotency, and reconciliation.', 'route', 'amber')
          ]
        )),
        x('coordinator failure|blocking|availability cost', 7, fc(
          'Coordination can preserve atomicity by sacrificing progress during uncertainty',
          [
            n('Participants prepare', 'resources become locked or reserved', 'lock', 'amber'),
            n('Coordinator fails', 'final decision is temporarily unavailable', 'alert', 'danger'),
            n('Participants cannot decide independently', 'atomicity forbids unilateral commit', 'scale', 'violet'),
            n('Work blocks', 'availability and lock duration degrade', 'clock', 'danger')
          ]
        )),
        x('reservation|escrow|pending state', 9, p(
          'Reservation converts an all-or-nothing write into explicit business states',
          [
            n('Check capacity', 'available funds or inventory', 'database', 'blue'),
            n('Reserve', 'move quantity into a pending protected state', 'lock', 'violet'),
            n('Perform remote step', 'payment, shipment, or external approval', 'route', 'amber'),
            n('Confirm', 'convert reservation into final effect', 'check', 'green'),
            n('Release', 'return capacity when later work fails', 'retry', 'danger')
          ]
        ))
      ]
    },
    {
      day: 19,
      slug: 'day-19-saga-pattern',
      sections: [
        x('orchestration|choreography', 2, tr(
          'Saga coordination can be centralized or distributed through events',
          n('Orchestration', 'One durable coordinator records state and directs each step.', 'brain', 'violet'),
          n('Choreography', 'Services react to events and publish the next fact.', 'queue', 'blue'),
          'Explicit workflow ownership versus emergent event flow'
        )),
        x('compensation|forward action|rollback', 4, t(
          'A saga moves forward with local commits and later neutralizes earlier effects',
          [
            n('Create order', 'local commit', 'api', 'blue'),
            n('Reserve inventory', 'local commit', 'layers', 'violet'),
            n('Capture payment fails', 'later step cannot complete', 'coins', 'danger'),
            n('Release inventory', 'business compensation', 'retry', 'amber'),
            n('Cancel order', 'durable terminal outcome', 'x', 'green')
          ]
        )),
        x('compensation is not|business compensation|cannot undo', 6, tr(
          'Compensation is a new business action, not a time-travel rollback',
          n('Database rollback', 'Erases uncommitted work inside one local transaction.', 'database', 'blue'),
          n('Saga compensation', 'Adds a new committed action that offsets or explains the earlier effect.', 'retry', 'amber'),
          'Local atomicity versus business correction'
        )),
        x('stuck|manual intervention|failed compensation', 8, d(
          'A stuck saga needs a durable operational state and an owner',
          n('A forward or compensating step exhausted automatic retries', 'The workflow must remain explainable and recoverable.', 'alert', 'violet'),
          [
            n('Retry later', 'Use bounded scheduled recovery for transient failure.', 'retry', 'blue'),
            n('Manual decision', 'Expose context and safe operator actions.', 'user', 'amber'),
            n('Reconcile external state', 'Prove what actually happened before compensating.', 'chart', 'danger')
          ]
        )),
        x('monitor|observability|audit|state store', 10, mb(
          'Operate sagas from durable workflow evidence',
          [
            { label: 'Saga age', value: 'time since start', note: 'detect stuck workflows', icon: 'clock', tone: 'amber' },
            { label: 'Current step', value: 'forward / compensate', note: 'explain active intent', icon: 'route', tone: 'blue' },
            { label: 'Attempt count', value: 'per action', note: 'bound retry loops', icon: 'retry', tone: 'violet' },
            { label: 'Terminal outcome', value: 'completed / cancelled', note: 'user-visible truth', icon: 'check', tone: 'green' },
            { label: 'Manual queue', value: 'unresolved cases', note: 'explicit operational ownership', icon: 'alert', tone: 'danger' }
          ]
        ))
      ]
    },
    {
      day: 20,
      slug: 'day-20-dead-letter-queues',
      sections: [
        x('retry.*dlq|main queue|maximum attempts', 1, p(
          'A DLQ is the terminal branch of a bounded delivery policy',
          [
            n('Main queue', 'normal messages and retries', 'queue', 'blue'),
            n('Consumer attempt', 'process with visibility lease', 'server', 'violet'),
            n('Retry counter', 'classify and bound repeated failure', 'retry', 'amber'),
            n('DLQ', 'quarantine after policy exhaustion', 'alert', 'danger'),
            n('Repair and replay', 'restore correctness deliberately', 'check', 'green')
          ]
        )),
        x('poison|retryable|non.retryable|classification', 3, d(
          'Not every failed message deserves another automatic attempt',
          n('Why did processing fail?', 'Classification determines delay, quarantine, or immediate operator action.', 'filter', 'violet'),
          [
            n('Transient dependency', 'Retry with backoff while age and attempts remain bounded.', 'retry', 'green'),
            n('Malformed / unsupported', 'Quarantine immediately with validation evidence.', 'x', 'danger'),
            n('Business conflict', 'Route to domain-specific resolution rather than blind replay.', 'scale', 'amber')
          ]
        )),
        x('inspect|repair|replay|redrive', 5, sq(
          'Replay is a controlled deployment, not a button that empties the DLQ',
          ['Operator', 'DLQ', 'Repair tool', 'Main queue'],
          [
            ['Operator', 'DLQ', 'inspect payload, metadata, and failure history'],
            ['Operator', 'Repair tool', 'fix code, configuration, schema, or data'],
            ['Repair tool', 'DLQ', 'select bounded replay cohort'],
            ['Repair tool', 'Main queue', 'redrive with original identity and trace context'],
            ['Main queue', 'Operator', 'observe success, recurrence, and side effects']
          ]
        )),
        x('idempotent|duplicate|replay safety', 7, tr(
          'DLQ replay can repeat work that partially succeeded before failing',
          n('Idempotent consumer', 'Duplicate delivery converges to the same final state.', 'key', 'green'),
          n('Non-idempotent consumer', 'Replay may send duplicate emails, payments, or mutations.', 'alert', 'danger'),
          'Safe redrive'
        )),
        x('metric|alert|monitor', 9, mb(
          'A DLQ needs active operational ownership',
          [
            { label: 'Visible messages', value: 'current backlog', note: 'size of unresolved work', icon: 'queue', tone: 'blue' },
            { label: 'Oldest age', value: 'time since first failure', note: 'customer impact clock', icon: 'clock', tone: 'danger' },
            { label: 'Arrival rate', value: 'messages / minute', note: 'detect new poison patterns', icon: 'chart', tone: 'amber' },
            { label: 'Replay success', value: 'resolved cohort %', note: 'prove repair quality', icon: 'check', tone: 'green' },
            { label: 'Recurrence', value: 'same reason / key', note: 'avoid endless redrive loops', icon: 'retry', tone: 'violet' }
          ]
        ))
      ]
    },
    {
      day: 21,
      slug: 'day-21-cron-jobs',
      sections: [
        x('singleton|distributed lock|claim|multiple instances', 1, d(
          'Every trigger must compete for one durable execution claim',
          n('Did this scheduler acquire the job lease?', 'A cron expression does not guarantee singleton execution in a fleet.', 'lock', 'violet'),
          [
            n('Winner', 'Create execution record and run idempotent chunks.', 'check', 'green'),
            n('Duplicate trigger', 'Skip and link to the current owner.', 'x', 'amber'),
            n('Lease expired', 'Fence the stale owner before takeover.', 'alert', 'danger')
          ]
        )),
        x('overlap|previous run|concurrent run', 3, grid(
          'Overlap policy is a business decision',
          [
            n('Skip', 'Do not start while the previous run is active.', 'x', 'blue'),
            n('Queue', 'Start later in order after the current run finishes.', 'queue', 'violet'),
            n('Replace', 'Cancel or fence the old run and start the newest.', 'retry', 'amber'),
            n('Allow concurrency', 'Safe only when work partitions and invariants permit.', 'users', 'green')
          ]
        )),
        x('lease|heartbeat|lock expiry|fencing', 5, t(
          'A distributed job lease requires renewal and fencing',
          [
            n('Acquire lease', 'record owner and fencing token', 'lock', 'blue'),
            n('Run chunk', 'perform bounded idempotent work', 'server', 'violet'),
            n('Renew heartbeat', 'prove the owner is still alive', 'pulse', 'green'),
            n('Lease expires', 'new owner may claim a higher fencing token', 'clock', 'amber'),
            n('Stale owner rejected', 'downstream checks token before writes', 'shield', 'danger')
          ]
        )),
        x('checkpoint|chunk|resume|batch', 7, p(
          'Checkpointed chunks make long jobs restartable and observable',
          [
            n('Select bounded range', 'deterministic cursor or partition', 'filter', 'blue'),
            n('Process idempotently', 'safe if retried after crash', 'server', 'violet'),
            n('Commit results', 'local durable transaction', 'database', 'green'),
            n('Store checkpoint', 'advance only after results commit', 'check', 'cyan'),
            n('Resume next range', 'restart from durable progress', 'retry', 'amber')
          ]
        )),
        x('time zone|dst|daylight|missed schedule|clock', 9, t(
          'Wall-clock schedules have discontinuities and duplicate local times',
          [
            n('Scheduled local time', 'for example 02:30 in a business timezone', 'clock', 'blue'),
            n('DST spring forward', 'the local time may not exist', 'alert', 'danger'),
            n('DST fall back', 'the local time may occur twice', 'retry', 'amber'),
            n('Execution policy', 'run once, catch up, or skip by explicit rule', 'filter', 'violet'),
            n('Audit record', 'store intended schedule and actual execution instant', 'database', 'green')
          ]
        ))
      ]
    }
  );
}(window));
