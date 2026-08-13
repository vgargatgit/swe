(function (global) {
  'use strict';
  const { n, x, p, grid, c, t, sm, sq, fo, tp, tr, d, fc, mb, rm, ls } = global.SWEBespokeDSL;
  const data = global.SWEBespokeBlueprintData = global.SWEBespokeBlueprintData || [];

  data.push(
    {
      day: 30,
      slug: 'day-30-sharding',
      sections: [
        x('router|routing|basic|how sharding works', 1, fo(
          'A shard router maps one logical operation to one database authority',
          n('Application', 'operation includes stable shard key', 'api', 'blue'),
          n('Shard router', 'derive virtual bucket and current placement', 'route', 'violet'),
          [
            n('Shard 1', 'bucket range 0–255', 'database', 'cyan'),
            n('Shard 2', 'bucket range 256–511', 'database', 'amber'),
            n('Shard 3', 'bucket range 512–767', 'database', 'green')
          ]
        )),
        x('shard key|choose.*key|good shard key', 3, d(
          'The shard key fixes locality, skew, and future movement cost',
          n('Does the candidate key distribute load and match dominant access paths?', 'A stable high-cardinality key is useful only when queries can route with it.', 'key', 'violet'),
          [
            n('Balanced + routable', 'Good candidate for direct single-shard operations.', 'check', 'green'),
            n('Low cardinality', 'Creates hot shards and uneven capacity.', 'alert', 'danger'),
            n('Missing from queries', 'Forces scatter-gather across every shard.', 'route', 'amber')
          ]
        )),
        x('hot shard|skew|celebrity|large tenant', 5, tp(
          'One dominant key can overload a shard while the cluster appears underused',
          n('Shard 2', 'contains one high-volume tenant', 'database', 'danger'),
          [
            n('Tenant ACME', '70% of total writes', 'users', 'danger'),
            n('Shard 1', '35% idle headroom', 'database', 'green'),
            n('Shard 3', '40% idle headroom', 'database', 'green'),
            n('Router metrics', 'cluster average hides per-shard saturation', 'chart', 'amber')
          ]
        )),
        x('cross.shard|scatter|join|transaction|aggregation', 7, tr(
          'Cross-shard work trades global semantics for distributed coordination',
          n('Single-shard operation', 'One route, one transaction boundary, predictable latency.', 'database', 'green'),
          n('Scatter-gather', 'Fan out, coordinate partial failures, merge results, and bound stragglers.', 'layers', 'danger'),
          'Locality versus global query freedom'
        )),
        x('rebalance|reshard|move|virtual bucket', 9, sq(
          'Safe rebalancing moves ownership through an observable dual-routing window',
          ['Control plane', 'Old shard', 'New shard', 'Router'],
          [
            ['Control plane', 'New shard', 'provision target capacity'],
            ['Old shard', 'New shard', 'copy virtual bucket history'],
            ['Router', 'Old shard', 'continue authoritative reads and writes'],
            ['Control plane', 'Router', 'enable dual-write or change capture catch-up'],
            ['Control plane', 'Router', 'switch bucket ownership after verification'],
            ['Router', 'Old shard', 'stop routing and retire safely']
          ]
        ))
      ]
    },
    {
      day: 31,
      slug: 'day-31-partitioning',
      sections: [
        x('pruning|partition key|query routing', 1, d(
          'Partition pruning works only when the optimizer can constrain the partition key',
          n('Does the predicate identify a bounded partition set?', 'A partitioned table remains one logical table, but unnecessary pieces should be skipped.', 'filter', 'violet'),
          [
            n('Yes', 'Scan only matching partitions and their local indexes.', 'check', 'green'),
            n('No', 'Plan and scan many or all partitions.', 'layers', 'danger'),
            n('Expression hides key', 'Rewrite predicate or add an appropriate generated key.', 'api', 'amber')
          ]
        )),
        x('range|list|hash|types of partition', 3, grid(
          'Partition strategies encode different placement rules',
          [
            n('Range', 'Time or numeric intervals; excellent for archival and pruning.', 'clock', 'blue'),
            n('List', 'Explicit business categories or regions.', 'layers', 'violet'),
            n('Hash', 'Evenly spread keys when natural ranges are skewed.', 'key', 'green'),
            n('Composite', 'Combine range and hash for lifecycle plus distribution.', 'route', 'amber')
          ]
        )),
        x('maintenance|archive|detach|drop|vacuum', 5, t(
          'Partitions create independent lifecycle boundaries for large tables',
          [
            n('Active partition', 'receives current writes and queries', 'database', 'blue'),
            n('Close interval', 'future writes move to the next partition', 'clock', 'violet'),
            n('Validate and index', 'finish maintenance outside hot path', 'check', 'green'),
            n('Detach / archive', 'move old data without row-by-row delete', 'layers', 'amber'),
            n('Drop when policy allows', 'reclaim metadata and storage quickly', 'x', 'danger')
          ]
        )),
        x('partitioning.*sharding|sharding.*partitioning', 7, tr(
          'Partitioning and sharding split data at different authority boundaries',
          n('Partitioning', 'Physical pieces inside one database authority and transaction system.', 'database', 'blue'),
          n('Sharding', 'Independent database authorities selected by an application routing layer.', 'route', 'violet'),
          'One authority versus many authorities'
        )),
        x('too many partitions|planning overhead|metadata', 9, mb(
          'Partition count has an operational cost',
          [
            { label: 'Partitions', value: 'growing count', note: 'planning and catalog work', icon: 'layers', tone: 'blue' },
            { label: 'Indexes', value: 'per partition', note: 'maintenance multiplication', icon: 'database', tone: 'violet' },
            { label: 'Planning time', value: 'before execution', note: 'can dominate tiny queries', icon: 'clock', tone: 'amber' },
            { label: 'Pruning benefit', value: 'partitions skipped', note: 'must exceed overhead', icon: 'filter', tone: 'green' }
          ]
        ))
      ]
    },
    {
      day: 32,
      slug: 'day-32-replication',
      sections: [
        x('synchronous|asynchronous', 2, tr(
          'Acknowledgement policy trades write latency for durability and freshness',
          n('Synchronous replication', 'Wait for another copy before acknowledging the write.', 'check', 'blue'),
          n('Asynchronous replication', 'Acknowledge on primary and ship the log later.', 'route', 'amber'),
          'Commit latency versus acknowledged-copy count'
        )),
        x('quorum|acknowledg|write concern', 4, d(
          'A write is durable only according to the acknowledgements required before success',
          n('How many replicas must confirm this write?', 'The answer defines latency, availability, and tolerated copy loss.', 'scale', 'violet'),
          [
            n('Primary only', 'Lowest latency; recent acknowledged writes may be lost on failover.', 'database', 'danger'),
            n('One additional copy', 'Stronger durability with extra network latency.', 'check', 'green'),
            n('Majority', 'Quorum safety at the cost of refusing writes without enough replicas.', 'users', 'blue')
          ]
        )),
        x('lag|apply|wal|binlog', 6, t(
          'Replication lag is the distance between primary commit and replica apply',
          [
            n('Primary commits', 'ordered log position advances', 'database', 'blue'),
            n('Log ships', 'network and queue delay', 'route', 'violet'),
            n('Replica receives', 'bytes are durable but not yet visible', 'queue', 'amber'),
            n('Replica applies', 'replay competes for CPU, I/O, and locks', 'retry', 'danger'),
            n('Read becomes current', 'replica reaches the commit position', 'check', 'green')
          ]
        )),
        x('failover|promotion|fencing', 8, sq(
          'Failover must promote one copy and fence every stale writer',
          ['Monitor', 'Primary', 'Replica', 'Clients'],
          [
            ['Monitor', 'Primary', 'detect unavailable or unsafe leader'],
            ['Monitor', 'Replica', 'select most advanced eligible copy'],
            ['Replica', 'Replica', 'enter a new writable epoch'],
            ['Clients', 'Replica', 'refresh endpoints and retry safely'],
            ['Monitor', 'Primary', 'fence before rejoin to prevent split brain']
          ]
        )),
        x('split brain|two primaries|dual leader', 10, fc(
          'Two writable primaries create divergent histories that cannot be merged mechanically',
          [
            n('Network partitions leaders', 'each side loses visibility of the other', 'route', 'amber'),
            n('Both accept writes', 'same keys change independently', 'database', 'danger'),
            n('Clients observe conflicting state', 'invariants diverge', 'alert', 'danger'),
            n('Connectivity returns', 'logs contain incompatible histories', 'retry', 'violet'),
            n('Manual or business merge required', 'data loss or correction is unavoidable', 'user', 'danger')
          ]
        ))
      ]
    },
    {
      day: 33,
      slug: 'day-33-leader-election',
      sections: [
        x('election|heartbeat timeout|candidate|vote', 1, sq(
          'An election advances the term and grants authority only after majority votes',
          ['Node A', 'Node B', 'Node C'],
          [
            ['Node A', 'Node A', 'leader heartbeat timeout; become candidate'],
            ['Node A', 'Node B', 'request vote for new term'],
            ['Node A', 'Node C', 'request vote for new term'],
            ['Node B', 'Node A', 'grant one vote in the term'],
            ['Node C', 'Node A', 'grant majority vote'],
            ['Node A', 'Node B', 'announce leadership and send heartbeats']
          ]
        )),
        x('quorum|majority|split vote', 3, tp(
          'A majority intersection prevents two isolated minorities from both electing leaders',
          n('Quorum rule', '3 of 5 votes required', 'users', 'violet'),
          [
            n('Partition A: 3 nodes', 'can form a majority and make progress', 'check', 'green'),
            n('Partition B: 2 nodes', 'cannot elect a safe leader', 'x', 'danger'),
            n('Term log', 'each node votes once per term', 'database', 'blue'),
            n('Heartbeat timers', 'randomization reduces repeated split votes', 'clock', 'amber')
          ]
        )),
        x('lease|fencing', 5, tr(
          'A lease limits belief; a fencing token limits damage',
          n('Lease', 'Leader believes it owns authority until a time boundary under clock assumptions.', 'clock', 'amber'),
          n('Fencing token', 'Downstream rejects commands from every older leadership epoch.', 'lock', 'green'),
          'Assumed ownership versus enforceable ownership'
        )),
        x('stale leader|old leader|fence', 7, sq(
          'Fencing prevents a paused former leader from writing after a new leader is elected',
          ['Old leader', 'Election', 'New leader', 'Resource'],
          [
            ['Old leader', 'Old leader', 'pause prevents heartbeat renewal'],
            ['Election', 'New leader', 'elect term 48 and issue fencing token 48'],
            ['New leader', 'Resource', 'write with token 48 succeeds'],
            ['Old leader', 'Resource', 'resume and write with token 47'],
            ['Resource', 'Old leader', 'reject stale token']
          ]
        )),
        x('term|epoch|generation|monotonic', 9, mb(
          'Leadership evidence must move monotonically forward',
          [
            { label: 'Current term', value: '48', note: 'orders elections and votes', icon: 'clock', tone: 'blue' },
            { label: 'Leader token', value: '48', note: 'attached to downstream commands', icon: 'key', tone: 'green' },
            { label: 'Stale token', value: '< 48', note: 'must be rejected', icon: 'x', tone: 'danger' },
            { label: 'Quorum', value: 'majority', note: 'authority intersection', icon: 'users', tone: 'violet' }
          ]
        ))
      ]
    },
    {
      day: 34,
      slug: 'day-34-cap-theorem',
      sections: [
        x('network partition|partition happens|during partition', 1, t(
          'CAP constrains behavior after replicas can no longer communicate',
          [
            n('Normal operation', 'replicas exchange writes and acknowledgements', 'check', 'green'),
            n('Network partition', 'messages between replica groups are lost or delayed indefinitely', 'route', 'danger'),
            n('Concurrent client requests', 'both sides receive operations', 'users', 'amber'),
            n('System chooses behavior', 'reject unsafe work or allow divergent progress', 'scale', 'violet'),
            n('Partition heals', 'reconcile or resume one authoritative history', 'retry', 'blue')
          ]
        )),
        x('cp|consistency.*availability|availability.*consistency', 3, tr(
          'During a partition, CP and AP preserve different contracts',
          n('CP behavior', 'Only the quorum or authoritative side serves operations; unsafe requests fail.', 'lock', 'blue'),
          n('AP behavior', 'Both reachable sides respond and accept temporary divergence.', 'route', 'amber'),
          'One-copy consistency versus every-side response'
        )),
        x('example|bank|cart|operation', 5, rm(
          'Different operations in one product may choose different partition behavior',
          [
            { from: 'Debit available balance', fromNote: 'must preserve spend invariant', to: 'CP path', toNote: 'reject without authoritative quorum', tone: 'danger' },
            { from: 'Add item to cart', fromNote: 'mergeable user preference', to: 'AP path', toNote: 'accept locally and reconcile', tone: 'green' },
            { from: 'Read product description', fromNote: 'stale value acceptable', to: 'AP read', toNote: 'serve last known copy', tone: 'blue' }
          ]
        )),
        x('operation specific|not database label|choose per operation', 7, d(
          'CAP is an operation-level contract, not a permanent label for an entire product',
          n('What invariant does this operation need during replica separation?', 'The same system can reject some writes while serving stale reads.', 'filter', 'violet'),
          [
            n('Non-mergeable invariant', 'Require quorum and reject unsafe progress.', 'lock', 'danger'),
            n('Mergeable state', 'Accept local progress with conflict resolution.', 'retry', 'green'),
            n('Read-only stale tolerance', 'Serve the last known value with freshness metadata.', 'clock', 'blue')
          ]
        )),
        x('pacelc|else latency|normal operation', 9, tr(
          'Outside partitions, replicated systems still trade consistency against latency',
          n('Synchronous coordination', 'Wait for replicas or quorum on the normal path.', 'check', 'blue'),
          n('Low-latency local response', 'Reply before every copy converges.', 'pulse', 'green'),
          'Else: consistency versus latency'
        ))
      ]
    },
    {
      day: 35,
      slug: 'day-35-eventual-consistency',
      sections: [
        x('propagation|source.*projection|basic', 1, p(
          'Derived copies converge through durable propagation and repair',
          [
            n('Authoritative write', 'commit source-of-truth state', 'database', 'blue'),
            n('Outbox', 'record publication intent atomically', 'queue', 'violet'),
            n('Event bus', 'deliver with retry, retention, and ordering scope', 'route', 'cyan'),
            n('Projection', 'apply idempotently to cache, search, or read model', 'layers', 'amber'),
            n('Reconciler', 'detect and repair missed divergence', 'retry', 'green')
          ]
        )),
        x('staleness|visibility delay|convergence window', 3, t(
          'A successful write and a converged read are separated by a visibility window',
          [
            n('T0: source commits', 'write is authoritative', 'database', 'blue'),
            n('T1: event publishes', 'delivery may be delayed or duplicated', 'queue', 'violet'),
            n('T2: projection applies', 'derived copy advances', 'layers', 'amber'),
            n('T3: client reads', 'new value becomes visible on that path', 'check', 'green'),
            n('SLO', 'define a bounded expected convergence time', 'clock', 'danger')
          ]
        )),
        x('outbox|dual write|publication', 5, sq(
          'The outbox makes source-state commit and publication intent one local transaction',
          ['Service', 'Database', 'Outbox relay', 'Event bus'],
          [
            ['Service', 'Database', 'commit business row plus outbox row'],
            ['Outbox relay', 'Database', 'read unpublished rows'],
            ['Outbox relay', 'Event bus', 'publish with stable event identity'],
            ['Event bus', 'Outbox relay', 'ack durable receipt'],
            ['Outbox relay', 'Database', 'mark published; safe to repeat']
          ]
        )),
        x('idempotent projection|duplicate|version guard', 7, sm(
          'A projection should converge under duplicates and out-of-order delivery',
          [
            n('RECEIVED', 'event carries aggregate ID and version', 'api', 'blue'),
            n('OLDER', 'version is behind current projection', 'x', 'amber'),
            n('NEXT', 'version advances current state', 'check', 'green'),
            n('GAP', 'a required earlier version is missing', 'alert', 'danger')
          ],
          [
            ['RECEIVED', 'OLDER', 'ignore duplicate or stale event'],
            ['RECEIVED', 'NEXT', 'apply atomically and checkpoint'],
            ['RECEIVED', 'GAP', 'pause, fetch snapshot, or replay missing range'],
            ['GAP', 'NEXT', 'repair completes']
          ]
        )),
        x('reconciliation|repair|anti.entropy', 9, p(
          'Reconciliation is the independent correctness path when event delivery is imperfect',
          [
            n('Scan authoritative versions', 'source defines expected state', 'database', 'blue'),
            n('Compare derived versions', 'find missing or divergent records', 'chart', 'violet'),
            n('Classify drift', 'delivery gap, bug, or manual change', 'filter', 'amber'),
            n('Repair idempotently', 'replay event or rebuild projection', 'retry', 'green'),
            n('Verify convergence', 'record evidence and remaining exceptions', 'check', 'cyan')
          ]
        ))
      ]
    },
    {
      day: 36,
      slug: 'day-36-optimistic-locking',
      sections: [
        x('lost update|two writers|concurrent update', 1, sq(
          'A version check turns a silent lost update into an explicit conflict',
          ['Writer A', 'Database', 'Writer B'],
          [
            ['Writer A', 'Database', 'read value with version 17'],
            ['Writer B', 'Database', 'read same value with version 17'],
            ['Writer A', 'Database', 'UPDATE ... WHERE version=17 → version 18'],
            ['Writer B', 'Database', 'UPDATE ... WHERE version=17 affects zero rows'],
            ['Database', 'Writer B', 'report stale-write conflict instead of overwriting A']
          ]
        )),
        x('compare.and.swap|where version|update count', 3, d(
          'The affected-row count is the compare-and-swap decision',
          n('Did UPDATE ... WHERE version = expected modify one row?', 'The predicate proves whether the state is still the state the business decision used.', 'lock', 'violet'),
          [
            n('One row', 'Commit new state and increment version.', 'check', 'green'),
            n('Zero rows', 'Reload and apply conflict policy.', 'x', 'danger'),
            n('Unexpected multiple rows', 'Treat as invariant or query-shape defect.', 'alert', 'amber')
          ]
        )),
        x('etag|if-match|http', 5, sq(
          'HTTP preconditions expose optimistic locking without leaking database internals',
          ['Client', 'API', 'Database'],
          [
            ['Client', 'API', 'GET resource'],
            ['API', 'Client', '200 with ETag "v17"'],
            ['Client', 'API', 'PUT with If-Match: "v17"'],
            ['API', 'Database', 'compare-and-swap update'],
            ['API', 'Client', '200 with v18 or 412 Precondition Failed']
          ]
        )),
        x('automatic retry|retry conflict|business decision', 7, tr(
          'Automatically rerunning code can repeat a business decision made from stale facts',
          n('Mechanical retry', 'Reload and re-execute without asking whether intent still applies.', 'retry', 'danger'),
          n('Business-aware conflict handling', 'Merge safe fields, ask the user, reject, or recompute intent.', 'scale', 'green'),
          'Technical convergence versus semantic correctness'
        )),
        x('merge|conflict policy|field level|resolution', 9, grid(
          'Conflict policy should follow the meaning of the operation',
          [
            n('Last writer wins', 'Simple but may discard valid concurrent intent.', 'clock', 'danger'),
            n('Field merge', 'Safe only for independently editable fields.', 'layers', 'blue'),
            n('Recompute command', 'Re-evaluate invariant from current state.', 'brain', 'green'),
            n('User-visible conflict', 'Return both versions and require a decision.', 'user', 'amber')
          ]
        ))
      ]
    }
  );
}(window));
