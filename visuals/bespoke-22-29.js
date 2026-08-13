(function (global) {
  'use strict';
  const { n, x, p, grid, c, t, sm, sq, fo, tp, tr, d, fc, mb, rm, bi, ls } = global.SWEBespokeDSL;
  const data = global.SWEBespokeBlueprintData = global.SWEBespokeBlueprintData || [];

  data.push(
    {
      day: 22,
      slug: 'day-22-websockets',
      sections: [
        x('http vs websocket|http.*websocket', 1, c(
          'HTTP exchanges requests; WebSockets maintain a long-lived full-duplex channel',
          [
            n('HTTP', 'Client initiates each request and receives a bounded response.', 'api', 'blue'),
            n('WebSocket', 'Either side can send frames throughout one persistent connection.', 'pulse', 'violet')
          ]
        )),
        x('handshake|upgrade|101', 3, sq(
          'The WebSocket lifecycle begins as an authenticated HTTP upgrade',
          ['Browser', 'Load balancer', 'WebSocket node'],
          [
            ['Browser', 'Load balancer', 'GET with Upgrade: websocket'],
            ['Load balancer', 'WebSocket node', 'route upgrade to a healthy connection-capable target'],
            ['WebSocket node', 'Browser', '101 Switching Protocols'],
            ['Browser', 'WebSocket node', 'persistent frames, pings, and pongs'],
            ['WebSocket node', 'Browser', 'close frame or disconnect on failure']
          ]
        )),
        x('scaling|multiple nodes|pub.sub|fan.out|broker', 6, tp(
          'A broker connects users whose sockets terminate on different nodes',
          n('Pub/Sub broker', 'routes ephemeral fan-out across the fleet', 'queue', 'violet'),
          [
            n('Node A', 'holds Alice and Bob connections', 'server', 'blue'),
            n('Node B', 'holds Carol connection', 'server', 'cyan'),
            n('Durable store', 'persists messages and replay cursor', 'database', 'amber'),
            n('Presence store', 'tracks connection ownership and expiry', 'users', 'green')
          ]
        )),
        x('heartbeat|ping|pong|idle|dead connection', 8, sm(
          'Heartbeats turn silent transport failure into a detectable connection state',
          [
            n('ACTIVE', 'recent frames or pong received', 'pulse', 'green'),
            n('SUSPECT', 'heartbeat deadline missed', 'clock', 'amber'),
            n('CLOSED', 'socket removed and presence expired', 'x', 'danger'),
            n('RECONNECTING', 'client restores a new connection', 'retry', 'blue')
          ],
          [
            ['ACTIVE', 'SUSPECT', 'no pong within interval'],
            ['SUSPECT', 'ACTIVE', 'late pong or traffic arrives'],
            ['SUSPECT', 'CLOSED', 'failure threshold exceeded'],
            ['CLOSED', 'RECONNECTING', 'client backoff expires'],
            ['RECONNECTING', 'ACTIVE', 'new handshake succeeds']
          ]
        )),
        x('backpressure|slow consumer|outbound queue', 10, d(
          'A slow client must not grow an unbounded per-connection queue',
          n('Has the outbound queue crossed its safe limit?', 'Backpressure policy protects memory and message freshness.', 'scale', 'violet'),
          [
            n('Below limit', 'Continue sending and measuring lag.', 'check', 'green'),
            n('Coalescible updates', 'Drop or replace stale intermediate state.', 'filter', 'blue'),
            n('Durable messages', 'Persist and disconnect with a replay cursor.', 'database', 'amber'),
            n('Unrecoverable lag', 'Close the connection before memory exhaustion.', 'x', 'danger')
          ]
        ))
      ]
    },
    {
      day: 23,
      slug: 'day-23-long-polling',
      sections: [
        x('request.*wait|basic|how long polling works', 1, sq(
          'Long polling repeats a hold–respond–reconnect sequence',
          ['Client', 'API', 'Event source'],
          [
            ['Client', 'API', 'GET /events?cursor=10'],
            ['API', 'Event source', 'wait for event 11 or timeout'],
            ['API', 'Client', 'return event 11 or empty timeout'],
            ['Client', 'API', 'immediately reconnect with cursor=11']
          ]
        )),
        x('cursor|last event|gap|duplicate', 3, d(
          'The cursor bridges the gap between one HTTP request and the next',
          n('What was the last durably observed event?', 'Reconnect from that cursor rather than from wall-clock time.', 'key', 'violet'),
          [
            n('Next event exists', 'Return it and advance the cursor.', 'check', 'green'),
            n('No event yet', 'Hold until timeout or a new event arrives.', 'clock', 'blue'),
            n('Cursor expired', 'Force a snapshot refresh before resuming.', 'retry', 'amber')
          ]
        )),
        x('capacity|held requests|thread|async', 5, tp(
          'Held requests consume connection and proxy capacity even while no event exists',
          n('Long-poll endpoint', 'many waiting HTTP requests', 'gate', 'violet'),
          [
            n('Async server I/O', 'avoid one blocked thread per poll', 'server', 'green'),
            n('Load balancer', 'idle timeout must exceed poll duration', 'scale', 'amber'),
            n('Connection limits', 'bound file descriptors and memory', 'layers', 'danger'),
            n('Event source', 'wake only relevant waiters', 'queue', 'blue')
          ]
        )),
        x('timeout alignment|proxy timeout|client timeout', 7, ls(
          'Long-poll timeout values must nest cleanly across every hop',
          [
            n('Client request timeout', 'longest total wait before reconnect', 'clock', 'danger'),
            n('CDN / proxy idle timeout', 'must not terminate the poll unexpectedly', 'shield', 'amber'),
            n('Application hold timeout', 'return slightly before outer timeouts', 'server', 'violet'),
            n('Event-source wait', 'leave time to serialize and return a response', 'queue', 'green')
          ]
        )),
        x('poll storm|reconnect|backoff', 9, fc(
          'Synchronized reconnects can turn a harmless timeout into a polling storm',
          [
            n('Many polls time out together', 'fleet shares the same timeout boundary', 'clock', 'amber'),
            n('Clients reconnect immediately', 'new request wave arrives at once', 'retry', 'violet'),
            n('Connection setup spikes', 'load balancer and API churn', 'route', 'danger'),
            n('Event source is rechecked', 'work repeats even without new events', 'queue', 'danger')
          ]
        ))
      ]
    },
    {
      day: 24,
      slug: 'day-24-server-sent-events',
      sections: [
        x('event stream|basic|how sse works', 1, sq(
          'SSE keeps one HTTP response open and emits framed events over time',
          ['Browser', 'SSE endpoint', 'Event source'],
          [
            ['Browser', 'SSE endpoint', 'GET with Accept: text/event-stream'],
            ['SSE endpoint', 'Browser', 'send headers and keep response open'],
            ['Event source', 'SSE endpoint', 'publish new event'],
            ['SSE endpoint', 'Browser', 'write id, event, and data fields'],
            ['SSE endpoint', 'Browser', 'heartbeat comment during idle periods']
          ]
        )),
        x('event format|id:|data:|event:', 3, grid(
          'An SSE frame carries replay identity, event type, and payload',
          [
            n('id', 'Stable cursor used by Last-Event-ID on reconnect.', 'key', 'blue'),
            n('event', 'Optional application event type.', 'api', 'violet'),
            n('data', 'One or more payload lines delivered to the browser.', 'layers', 'green'),
            n('retry', 'Optional server hint for reconnect delay.', 'clock', 'amber')
          ]
        )),
        x('buffer|proxy|nginx|flush', 5, tr(
          'Proxy buffering can silently turn a live stream into delayed batches',
          n('Buffered response', 'Proxy waits for enough bytes before forwarding.', 'layers', 'danger'),
          n('Streaming response', 'Frames flush promptly while connection stays open.', 'pulse', 'green'),
          'Batch efficiency versus real-time delivery'
        )),
        x('last-event-id|reconnect|replay', 7, sq(
          'Last-Event-ID resumes the stream after a broken connection',
          ['Browser', 'SSE endpoint', 'Event store'],
          [
            ['Browser', 'SSE endpoint', 'connection drops after event 101'],
            ['Browser', 'SSE endpoint', 'reconnect with Last-Event-ID: 101'],
            ['SSE endpoint', 'Event store', 'load retained events after 101'],
            ['Event store', 'SSE endpoint', 'events 102…N'],
            ['SSE endpoint', 'Browser', 'replay then continue live stream']
          ]
        )),
        x('slow consumer|backpressure|queue', 9, d(
          'A slow browser needs a bounded buffering and recovery policy',
          n('Can the browser keep up with the event stream?', 'The server cannot retain an unlimited per-client backlog in memory.', 'scale', 'violet'),
          [
            n('Yes', 'Continue streaming and update the last delivered ID.', 'check', 'green'),
            n('Temporary lag', 'Buffer only a bounded replayable window.', 'queue', 'amber'),
            n('Too far behind', 'Disconnect and require replay or full snapshot.', 'x', 'danger')
          ]
        ))
      ]
    },
    {
      day: 25,
      slug: 'day-25-database-indexing',
      sections: [
        x('b.tree|how an index|lookup path', 1, p(
          'A B-tree reduces pages examined by navigating ordered key ranges',
          [
            n('Query predicate', 'for example tenant_id and created_at', 'filter', 'blue'),
            n('Root page', 'choose a key interval', 'layers', 'violet'),
            n('Branch pages', 'narrow the interval logarithmically', 'route', 'cyan'),
            n('Leaf page', 'find row pointer or covering columns', 'database', 'amber'),
            n('Table row', 'fetch remaining data only when required', 'check', 'green')
          ]
        )),
        x('composite|column order|leftmost|prefix', 3, d(
          'Composite-index column order decides which query prefixes are searchable',
          n('Does the query constrain the leading index columns?', 'An index on (tenant_id, status, created_at) is ordered first by tenant.', 'filter', 'violet'),
          [
            n('Leading prefix present', 'Seek a narrow range efficiently.', 'check', 'green'),
            n('Only later column present', 'The engine may scan much of the index.', 'route', 'amber'),
            n('Different sort requirement', 'Another index or explicit sort may be needed.', 'layers', 'blue')
          ]
        )),
        x('covering|index only|table lookup|bookmark', 5, tr(
          'Covering indexes trade larger write cost for fewer table-page reads',
          n('Index-only path', 'All predicates and selected columns are available in the index.', 'layers', 'green'),
          n('Index + table lookup', 'Each matching key fetches additional table pages.', 'database', 'amber'),
          'Read locality versus index size'
        )),
        x('write cost|insert|update|delete|maintenance', 7, fc(
          'Every extra index amplifies write and maintenance work',
          [
            n('Row changes', 'insert, update, or delete begins', 'api', 'blue'),
            n('Table page updates', 'base record is modified', 'database', 'violet'),
            n('Each index updates', 'keys may move or split pages', 'layers', 'amber'),
            n('WAL and replication grow', 'more bytes must be logged and copied', 'route', 'danger'),
            n('Vacuum / rebuild cost rises', 'operational maintenance expands', 'retry', 'danger')
          ]
        )),
        x('selectivity|cardinality|statistics', 9, mb(
          'Index usefulness depends on how much work the predicate eliminates',
          [
            { label: 'Rows in table', value: '10,000,000', note: 'total candidate space', icon: 'database', tone: 'blue' },
            { label: 'Rows matched', value: '100', note: 'highly selective predicate', icon: 'filter', tone: 'green' },
            { label: 'Pages read', value: 'small range', note: 'expected index benefit', icon: 'layers', tone: 'violet' },
            { label: 'Write overhead', value: 'per index', note: 'must justify the read saving', icon: 'coins', tone: 'amber' }
          ]
        ))
      ]
    },
    {
      day: 26,
      slug: 'day-26-query-optimization',
      sections: [
        x('execution plan|optimizer|planner', 1, p(
          'The optimizer converts logical SQL into a physical work plan',
          [
            n('SQL + parameters', 'requested relational result', 'api', 'blue'),
            n('Statistics', 'estimated cardinality and distribution', 'chart', 'violet'),
            n('Plan alternatives', 'scan, seek, join, sort, and aggregate choices', 'brain', 'cyan'),
            n('Chosen plan', 'estimated cheapest physical operators', 'layers', 'amber'),
            n('Runtime evidence', 'actual rows, pages, waits, spills, and time', 'pulse', 'green')
          ]
        )),
        x('cardinality|estimate|statistics', 3, fc(
          'A cardinality error propagates into multiple bad physical choices',
          [
            n('Rows underestimated', 'optimizer expects a tiny intermediate result', 'chart', 'amber'),
            n('Nested-loop join selected', 'repeated inner work appears cheap', 'layers', 'violet'),
            n('Actual rows explode', 'inner scan repeats thousands of times', 'database', 'danger'),
            n('Memory grant is too small', 'sort or hash spills to disk', 'queue', 'danger'),
            n('Latency spikes', 'plan is logically correct but operationally expensive', 'alert', 'danger')
          ]
        )),
        x('join|nested loop|hash join|merge join', 5, grid(
          'Join algorithms fit different row counts and ordering conditions',
          [
            n('Nested loop', 'Good when outer input is small and inner lookup is indexed.', 'route', 'blue'),
            n('Hash join', 'Good for larger unsorted equality joins with enough memory.', 'layers', 'violet'),
            n('Merge join', 'Good when both inputs are already ordered on the join key.', 'chart', 'green'),
            n('Bad estimate', 'Can make the optimizer choose the wrong algorithm.', 'alert', 'danger')
          ]
        )),
        x('sargable|function on column|predicate', 7, tr(
          'Sargable predicates preserve an index-searchable range',
          n('Sargable', 'created_at >= ? AND created_at < ? allows an index range seek.', 'filter', 'green'),
          n('Non-sargable', 'DATE(created_at) = ? may force evaluation for many rows.', 'api', 'danger'),
          'Searchable range versus per-row expression'
        )),
        x('pagination|offset|keyset|cursor', 9, tr(
          'Pagination strategy determines how much discarded work grows with page depth',
          n('OFFSET pagination', 'Simple, but deep pages scan and discard increasing rows.', 'queue', 'amber'),
          n('Keyset pagination', 'Continue after a stable ordered key with bounded work.', 'key', 'green'),
          'Random page access versus scalable continuation'
        ))
      ]
    },
    {
      day: 27,
      slug: 'day-27-n-plus-one-queries',
      sections: [
        x('what is|one plus n|n\+1', 1, sq(
          'One API request can silently expand into one parent query plus N child queries',
          ['API', 'ORM', 'Database'],
          [
            ['API', 'ORM', 'load 50 orders'],
            ['ORM', 'Database', 'SELECT orders'],
            ['ORM', 'Database', 'SELECT items for order 1'],
            ['ORM', 'Database', 'SELECT items for order 2 … order 50'],
            ['Database', 'API', '51 round trips worth of results']
          ]
        )),
        x('solution|fetch join|batch|projection', 3, grid(
          'Choose a fetch shape that matches the use case',
          [
            n('Fetch join', 'Load parent and relationship in one SQL result.', 'layers', 'blue'),
            n('Batch fetching', 'Load child rows for a bounded set of parent IDs.', 'queue', 'violet'),
            n('DTO projection', 'Select only fields required by the API contract.', 'api', 'green'),
            n('Explicit second query', 'One parent query plus one set-oriented child query.', 'database', 'amber')
          ]
        )),
        x('row explosion|cartesian|pagination', 5, tr(
          'Eliminating N+1 can create a different problem: duplicated result rows',
          n('Large fetch join', 'Parent columns repeat for every child; pagination may become incorrect.', 'layers', 'danger'),
          n('Two bounded queries', 'Keep parent page stable, then fetch children by parent IDs.', 'database', 'green'),
          'Round trips versus row multiplication'
        )),
        x('detect|logging|metric|query count', 7, mb(
          'Detect N+1 at the request boundary',
          [
            { label: 'SQL count', value: 'per request', note: 'look for 1 + collection size', icon: 'chart', tone: 'blue' },
            { label: 'DB round trips', value: 'rapid growth', note: 'network and planning cost', icon: 'route', tone: 'danger' },
            { label: 'Repeated statement', value: 'same shape, new ID', note: 'classic lazy-load signal', icon: 'retry', tone: 'amber' },
            { label: 'Endpoint latency', value: 'scales with N', note: 'production symptom', icon: 'clock', tone: 'violet' }
          ]
        )),
        x('lazy|eager|fetch type', 9, d(
          'Global eager loading is not a substitute for use-case-specific query design',
          n('What data does this endpoint need now?', 'Fetch policy should follow the application contract, not entity defaults alone.', 'filter', 'violet'),
          [
            n('Small bounded relationship', 'Fetch explicitly with the parent.', 'check', 'green'),
            n('Large collection', 'Page or query independently.', 'queue', 'amber'),
            n('Not required', 'Do not load it at all.', 'x', 'blue')
          ]
        ))
      ]
    },
    {
      day: 28,
      slug: 'day-28-connection-pooling',
      sections: [
        x('why pool|connection creation|basic', 1, p(
          'A pool reuses expensive sessions and caps database concurrency',
          [
            n('HTTP request', 'many application workers arrive', 'users', 'blue'),
            n('Acquire', 'wait for a bounded reusable connection', 'queue', 'amber'),
            n('Execute transaction', 'use one database session briefly', 'database', 'violet'),
            n('Commit / rollback', 'complete local work', 'check', 'green'),
            n('Return to pool', 'connection becomes reusable', 'retry', 'cyan')
          ]
        )),
        x('pool size|sizing|max pool', 3, mb(
          'Pool size follows database throughput, not HTTP thread count',
          [
            { label: 'DB useful concurrency', value: 'finite', note: 'CPU, I/O, locks, and workload shape', icon: 'database', tone: 'blue' },
            { label: 'Pool maximum', value: 'bounded', note: 'admission control for DB work', icon: 'scale', tone: 'violet' },
            { label: 'Acquire waiters', value: 'early warning', note: 'requests competing for capacity', icon: 'queue', tone: 'amber' },
            { label: 'Query duration', value: 'drives occupancy', note: 'slow transactions shrink throughput', icon: 'clock', tone: 'danger' }
          ]
        )),
        x('saturation|exhaust|timeout', 5, fc(
          'Pool saturation propagates from slow queries to request failure',
          [
            n('Queries slow', 'connections remain checked out longer', 'clock', 'amber'),
            n('Pool reaches maximum', 'no idle connections remain', 'database', 'danger'),
            n('Acquisition queue grows', 'HTTP workers wait', 'queue', 'violet'),
            n('Acquisition timeouts fire', 'requests fail before reaching DB', 'x', 'danger'),
            n('Retries amplify pressure', 'more requests compete for the same pool', 'retry', 'danger')
          ]
        )),
        x('transaction scope|hold connection|remote call', 7, tr(
          'Holding a connection across remote work wastes scarce database capacity',
          n('Short DB scope', 'Acquire late, commit promptly, release before remote calls.', 'check', 'green'),
          n('Long mixed scope', 'Hold connection while waiting on HTTP, queue, or user work.', 'clock', 'danger'),
          'Useful database work versus idle occupancy'
        )),
        x('leak|active|idle|pending|metric', 9, mb(
          'Pool health is visible through occupancy and wait signals',
          [
            { label: 'Active', value: 'checked out', note: 'current DB concurrency', icon: 'pulse', tone: 'blue' },
            { label: 'Idle', value: 'ready to borrow', note: 'immediate headroom', icon: 'check', tone: 'green' },
            { label: 'Pending', value: 'waiting callers', note: 'saturation pressure', icon: 'queue', tone: 'amber' },
            { label: 'Acquire timeout', value: 'failed admission', note: 'user-visible impact', icon: 'x', tone: 'danger' },
            { label: 'Leak detection', value: 'long checkout', note: 'missing release or oversized transaction', icon: 'alert', tone: 'violet' }
          ]
        ))
      ]
    },
    {
      day: 29,
      slug: 'day-29-read-replicas',
      sections: [
        x('replication|primary|replica|basic', 1, tp(
          'The primary owns the write timeline; replicas apply it later',
          n('Primary', 'accept writes and current invariant-sensitive reads', 'database', 'blue'),
          [
            n('Replica A', 'user-facing stale-tolerant reads', 'database', 'green'),
            n('Replica B', 'reports and historical queries', 'chart', 'violet'),
            n('Replication stream', 'ordered WAL or binlog propagation', 'route', 'amber'),
            n('Lag monitor', 'measures apply delay and replay position', 'clock', 'danger')
          ]
        )),
        x('lag|asynchronous|stale', 3, t(
          'Replication lag creates a window where acknowledged writes are not yet readable on replicas',
          [
            n('Write commits on primary', 'client receives success', 'check', 'blue'),
            n('Log is shipped', 'network and queue delay begin', 'route', 'violet'),
            n('Replica applies change', 'CPU, locks, and I/O determine pace', 'database', 'amber'),
            n('Replica read becomes fresh', 'new value is finally visible', 'clock', 'green')
          ]
        )),
        x('read after write|own write|consistency', 5, d(
          'A client that just wrote may require a stronger read path',
          n('Must this read observe the caller’s latest committed write?', 'Freshness requirement should drive routing.', 'filter', 'violet'),
          [
            n('Yes', 'Read primary or wait for a known replica position.', 'database', 'green'),
            n('Bounded staleness acceptable', 'Use a replica within lag threshold.', 'clock', 'blue'),
            n('Historical / analytical', 'Route to isolated reporting replica.', 'chart', 'amber')
          ]
        )),
        x('routing|which reads|current state', 7, rm(
          'Route reads according to the invariant they support',
          [
            { from: 'Available balance', fromNote: 'authorization decision', to: 'Primary', toNote: 'current state required', tone: 'danger' },
            { from: 'Product catalog', fromNote: 'seconds of staleness acceptable', to: 'Replica A', toNote: 'scale user reads', tone: 'green' },
            { from: 'Monthly report', fromNote: 'large historical query', to: 'Replica B', toNote: 'isolate reporting load', tone: 'violet' }
          ]
        )),
        x('failover|promotion', 9, sq(
          'Replica promotion changes both topology and the acknowledged-write timeline',
          ['Monitor', 'Old primary', 'Replica', 'Applications'],
          [
            ['Monitor', 'Old primary', 'detect loss of authority'],
            ['Monitor', 'Replica', 'choose promotion candidate by log position'],
            ['Replica', 'Replica', 'promote and establish new writable epoch'],
            ['Applications', 'Replica', 'refresh routing and connection pools'],
            ['Monitor', 'Old primary', 'fence before any rejoin']
          ]
        ))
      ]
    }
  );
}(window));
