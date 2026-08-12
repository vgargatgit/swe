window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS['day-32-replication'] = {
  day: 32,
  title: 'Replication',
  subtitle: 'Maintain multiple copies of data while trading durability, latency, availability, and consistency.',
  tags: ['Replication', 'Primary/replica', 'WAL and binlog', 'Failover', 'RPO/RTO', 'Consistency'],
  core: 'Replication is not just copying data. It is a design choice about when a write is considered complete, which copies are allowed to serve reads, how lag is detected, and how the system survives failover without corrupting business state.',
  sections: [
    {
      title: '1. The mental model',
      diagram: `flowchart LR
        App[Application] -- writes --> Primary[(Primary database)]
        Primary -- replication log --> R1[(Replica A)]
        Primary -- replication log --> R2[(Replica B)]
        App -- stale-tolerant reads --> R1
        App -- reporting reads --> R2
        R1 -. promotion candidate .-> NewPrimary[(New primary)]`,
      body: `<p>Replication means keeping multiple copies of the same logical data. The copies may exist for high availability, read scale, local latency, durability, migration, CDC, analytics, or disaster recovery.</p>
      <p>The central production question is not simply, <em>do we have replicas?</em> The central question is:</p>
      <div class="callout"><strong>When is a write considered complete, and what can each replica safely be used for?</strong></div>
      <p>Once you answer that, the rest of the design becomes clearer: whether replicas may be stale, whether they can be promoted, whether read-your-writes is required, and what loss is acceptable during failover.</p>`
    },
    {
      title: '2. What actually gets replicated',
      diagram: `flowchart TD
        Tx[Transaction commits on primary] --> Log[WAL / binlog / transaction log]
        Log --> Ship[Ship log records]
        Ship --> Receive[Replica receives]
        Receive --> Flush[Replica flushes]
        Flush --> Replay[Replica replays]
        Replay --> Visible[Change visible to reads]`,
      body: `<p>Databases usually do not replicate by periodically copying whole tables. They replicate ordered changes from a log.</p>
      <ul>
        <li><strong>PostgreSQL</strong> commonly uses WAL records.</li>
        <li><strong>MySQL</strong> commonly uses binlog events.</li>
        <li>Other systems use transaction logs, change streams, or consensus logs.</li>
      </ul>
      <p>A transaction commits on the primary, the change is written to a durable log, and replicas consume that log in order.</p>
      <p>There are several stages in this path: generated, sent, received, flushed, replayed, and visible. A monitoring system that says a replica has <em>received</em> data is not necessarily saying that the data is already visible to application reads.</p>`
    },
    {
      title: '3. Physical versus logical replication',
      body: `<p>Two broad replication styles are common.</p>
      <table><thead><tr><th>Type</th><th>What moves</th><th>Good for</th><th>Trade-off</th></tr></thead><tbody><tr><td>Physical replication</td><td>Low-level storage/log changes.</td><td>High-fidelity replicas, HA, same database engine/version family.</td><td>Less flexible; usually replicates the database at a lower storage level.</td></tr><tr><td>Logical replication</td><td>Logical row/table changes or events.</td><td>Selective tables, migrations, CDC, integration, versioned consumers.</td><td>More flexible but more schema/version compatibility concerns.</td></tr></tbody></table>
      <p>Physical replication is often used for hot standbys and read replicas. Logical replication is often used when the consumer is not just another identical database copy: a search index, data warehouse, migration target, or downstream service.</p>
      <div class="callout warn"><strong>Trap:</strong> Logical replication and CDC are production systems. If a consumer falls behind, the primary may have to retain logs for it. That can become an operational risk.</div>`
    },
    {
      title: '4. Asynchronous replication',
      diagram: `sequenceDiagram
        participant App
        participant Primary
        participant Replica
        App->>Primary: write transaction
        Primary-->>App: commit acknowledged
        Primary-->>Replica: ship log later
        Replica-->>Replica: replay later`,
      body: `<p>In asynchronous replication, the primary can acknowledge the write before replicas have received or replayed it.</p>
      <p>This has a major benefit:</p>
      <ul><li>Write latency stays low because the client is not waiting for a remote replica.</li></ul>
      <p>It also has a major risk:</p>
      <ul><li>If the primary dies before the change reaches a replica, an acknowledged write may be lost during failover.</li></ul>
      <p>This is why replication mode connects directly to <strong>RPO</strong>, the recovery point objective. If the business cannot tolerate acknowledged data loss, plain async replication may not be enough for the authoritative write path.</p>`
    },
    {
      title: '5. Synchronous replication',
      diagram: `sequenceDiagram
        participant App
        participant Primary
        participant Replica
        App->>Primary: write transaction
        Primary->>Replica: send commit/log record
        Replica-->>Primary: acknowledge receive/flush/replay
        Primary-->>App: commit acknowledged`,
      body: `<p>In synchronous replication, the primary waits for at least one replica acknowledgement before confirming the write to the client.</p>
      <p>But be precise: different systems and settings may wait for different acknowledgement stages:</p>
      <ul>
        <li><strong>Received:</strong> the replica got the bytes.</li>
        <li><strong>Flushed:</strong> the replica wrote them durably.</li>
        <li><strong>Replayed:</strong> the replica applied them.</li>
        <li><strong>Visible:</strong> a query on the replica can see the data.</li>
      </ul>
      <p>Durability and read visibility are not the same guarantee. This distinction matters when an application tries to use a replica immediately after a write.</p>
      <div class="callout"><strong>Latency trade-off:</strong> synchronous replication protects against some data-loss scenarios but adds network and replica latency to the write path, especially across regions.</div>`
    },
    {
      title: '6. Quorum replication',
      diagram: `flowchart TD
        Write[Write request] --> N1[(Node 1)]
        Write --> N2[(Node 2)]
        Write --> N3[(Node 3)]
        N1 --> Ack{Need W acknowledgements}
        N2 --> Ack
        N3 --> Ack
        Read[Read request] --> R{Need R responses}
        R --> Merge[Choose latest/versioned value]`,
      body: `<p>Some distributed databases use quorum-style replication. A write may need acknowledgements from W nodes out of N; a read may need responses from R nodes out of N.</p>
      <p>A common intuition is:</p>
      <div class="code-block"><span class="code-label">quorum intuition</span><pre>if R + W > N,
then reads and writes overlap on at least one node.</pre></div>
      <p>That overlap helps, but it is not by itself a full consistency guarantee. You also need versioning, conflict resolution, read repair, ordering rules, and sometimes consensus depending on the system's promise.</p>
      <p>When answering interviews, avoid saying quorum automatically equals strong consistency. Explain the required version/order semantics.</p>`
    },
    {
      title: '7. Replication lag',
      diagram: `flowchart LR
        Generate[Primary generates log] --> Ship[Network shipping]
        Ship --> Receive[Replica receives]
        Receive --> Flush[Replica flushes]
        Flush --> Replay[Replica replays]
        Replay --> Read[Replica can serve fresh read]`,
      body: `<p>Replication lag is the delay between a change being committed on the primary and that change becoming available on a replica.</p>
      <p>Lag can come from many places:</p>
      <ul>
        <li>Network delay or packet loss.</li>
        <li>Replica CPU saturation.</li>
        <li>Replica disk or I/O bottleneck.</li>
        <li>Long-running queries on the replica.</li>
        <li>Huge transactions or bulk updates.</li>
        <li>DDL or schema changes.</li>
        <li>Replication errors or conflicts.</li>
      </ul>
      <p>Lag should be measured both as bytes/positions behind and time behind. More importantly, measure the rate: if the primary generates changes faster than the replica can replay them, the system will never converge until load falls or capacity increases.</p>`
    },
    {
      title: '8. Read consistency problems',
      diagram: `sequenceDiagram
        participant User
        participant App
        participant Primary
        participant Replica
        User->>App: update profile
        App->>Primary: write v42
        Primary-->>App: success
        User->>App: refresh page
        App->>Replica: read profile
        Replica-->>App: old v41
        App-->>User: stale result`,
      body: `<p>Read replicas scale reads, but they may violate user expectations if the application routes the wrong read to the wrong copy.</p>
      <table><thead><tr><th>Consistency expectation</th><th>Failure mode with replicas</th><th>Typical mitigation</th></tr></thead><tbody><tr><td>Read your writes</td><td>User saves, refreshes, and sees old data.</td><td>Return written state, primary pinning, or consistency token.</td></tr><tr><td>Monotonic reads</td><td>User sees version 42, then later version 41 from another replica.</td><td>Sticky replica, minimum version, or session-level routing.</td></tr><tr><td>Causal reads</td><td>A dependent read observes data before its cause.</td><td>Track causation/version and wait or route to authoritative copy.</td></tr><tr><td>Bounded staleness</td><td>Replica is older than acceptable business window.</td><td>Reject/fallback when lag exceeds threshold.</td></tr></tbody></table>
      <p>Security-sensitive reads deserve special care. Token revocation, disabled accounts, permission changes, and compliance controls should not casually read from stale replicas.</p>`
    },
    {
      title: '9. Read replica routing policy',
      body: `<p>A production service should classify reads rather than blindly route all reads to replicas.</p>
      <table><thead><tr><th>Read type</th><th>Example</th><th>Preferred source</th></tr></thead><tbody><tr><td>Strong/current</td><td>Check funds, authorization, uniqueness, idempotency decision.</td><td>Primary or strongly consistent store.</td></tr><tr><td>Read-your-writes</td><td>User sees their just-saved profile or order.</td><td>Primary pinning, returned state, or min-version replica.</td></tr><tr><td>Bounded-stale</td><td>Dashboard that can tolerate 5 seconds of lag.</td><td>Replica only if lag is within threshold.</td></tr><tr><td>Eventual/reporting</td><td>Analytics, exports, historical browsing.</td><td>Replica/reporting database.</td></tr></tbody></table>
      <p>In Spring applications, be careful with transaction routing. A <span class="inline-code">readOnly=true</span> annotation does not automatically mean the read is safe for a stale replica. It only describes transaction intent unless you wire routing behavior yourself.</p>`
    },
    {
      title: '10. Failover and promotion',
      diagram: `flowchart TD
        Detect[Detect primary failure] --> Choose[Choose promotion candidate]
        Choose --> Fence[Fence old primary]
        Fence --> Promote[Promote replica]
        Promote --> Route[Move app traffic]
        Route --> Repair[Rebuild old primary / repair replicas]
        Fence -. if missing .-> SplitBrain[Split brain risk]`,
      body: `<p>Failover is not just changing DNS. A safe failover needs to decide which replica is eligible to become primary, fence the old primary, promote the new primary, and ensure clients stop writing to the old one.</p>
      <p>Promotion criteria often include:</p>
      <ul>
        <li>How fresh the replica is.</li>
        <li>Whether it has replayed required logs.</li>
        <li>Whether it is healthy enough to serve writes.</li>
        <li>Whether other nodes agree it is eligible.</li>
      </ul>
      <p>The dangerous case is split brain: the old primary and the new primary both accept writes. Fencing is what prevents stale or isolated authorities from continuing to mutate protected state.</p>`
    },
    {
      title: '11. Fencing and epochs',
      body: `<p>Failover creates a leadership problem. A node that used to be primary may not immediately know it has lost authority. Network partitions, pauses, delayed packets, and stale clients can all keep the old path alive.</p>
      <p>Use epochs, terms, or fencing tokens so protected resources can reject stale writers.</p>
      <div class="code-block"><span class="code-label">concept</span><pre>primary_epoch = 17
old primary writes with epoch 17
new primary is promoted with epoch 18
storage / router / clients reject writes from epoch 17</pre></div>
      <p>Without fencing, failover may improve availability while quietly corrupting data. This is why replication and leader election are closely related topics.</p>`
    },
    {
      title: '12. Log retention and replication slots',
      diagram: `flowchart LR
        Primary[(Primary)] --> WAL[Retained WAL/binlog]
        WAL --> Fast[Fast replica]
        WAL --> Slow[Slow replica / CDC]
        Slow -. falls behind .-> Retain[Primary retains old logs]
        Retain --> Disk[Disk pressure]`,
      body: `<p>Replicas and CDC consumers need old log records to catch up. If a consumer falls behind and the primary must retain logs for it, the primary can run out of disk.</p>
      <p>This is a common operational incident:</p>
      <ul>
        <li>A logical replication slot or CDC connector stops.</li>
        <li>The primary keeps generating WAL/binlog files.</li>
        <li>Old logs cannot be removed because the consumer has not acknowledged them.</li>
        <li>Primary disk fills, threatening write availability.</li>
      </ul>
      <div class="callout warn"><strong>Operational rule:</strong> monitor retained log bytes, replication slot lag, oldest unconsumed position, and disk pressure. A dead replication consumer can become a primary database incident.</div>`
    },
    {
      title: '13. Schema changes and replication',
      body: `<p>Schema changes are not isolated from replication. DDL can lag, block replay, or break logical subscribers that expect a previous schema.</p>
      <p>Safe schema migration across replicated systems often needs compatibility windows:</p>
      <ul>
        <li>Expand schema first: add nullable columns or additive structures.</li>
        <li>Deploy code that can read old and new shapes.</li>
        <li>Backfill gradually without overwhelming replicas.</li>
        <li>Wait for replication and consumers to catch up.</li>
        <li>Contract later: remove old columns/fields only after all readers are safe.</li>
      </ul>
      <p>Logical replication makes this even more important because the downstream consumer may not be upgraded at the same time as the primary database.</p>`
    },
    {
      title: '14. Replication is not backup',
      diagram: `flowchart LR
        User[Accidental delete] --> Primary[(Primary)]
        Primary -- replicate delete --> Replica[(Replica)]
        Replica --> Oops[Same bad state]
        Backup[(Point-in-time backup)] -. restore .-> Recovery[Recover before delete]`,
      body: `<p>A replica is another live copy of current state. If you accidentally delete rows, corrupt data, or run a bad migration, the bad change may replicate perfectly.</p>
      <p>Backups solve a different problem:</p>
      <ul>
        <li>Recovering from human mistakes.</li>
        <li>Recovering from logical corruption.</li>
        <li>Point-in-time restore.</li>
        <li>Longer retention than live replication logs.</li>
      </ul>
      <div class="callout danger"><strong>Never say:</strong> We have replicas, so we have backups. Replicas improve availability and read capacity. Backups provide historical recovery.</div>`
    },
    {
      title: '15. Application behavior during failover',
      body: `<p>When the primary fails over, applications may see:</p>
      <ul>
        <li>Broken pooled connections.</li>
        <li>Timeouts during DNS or endpoint switch.</li>
        <li>Ambiguous commits: the client timed out but the database may have committed.</li>
        <li>Stale reads during promotion.</li>
        <li>Temporary read-only errors.</li>
        <li>Connection storms as every pod reconnects at once.</li>
      </ul>
      <p>Design the application with bounded retries, jitter, connection pool recovery, idempotency keys for ambiguous writes, and health checks that do not create cascading failure.</p>
      <div class="callout"><strong>Ambiguous commit:</strong> if a client times out after sending a write, it cannot assume the write failed. It must reconcile using idempotency or a stable operation identifier.</div>`
    },
    {
      title: '16. Wallet example: acknowledged debit and async loss',
      diagram: `sequenceDiagram
        participant App
        participant Primary
        participant Replica
        App->>Primary: debit wallet operation X
        Primary-->>App: committed success
        Primary--xReplica: replication delayed
        Primary--xPrimary: primary crashes
        Replica-->>App: promoted without operation X`,
      body: `<p>Imagine a wallet debit is acknowledged by the primary, but the primary crashes before the debit reaches the async replica that gets promoted.</p>
      <p>After failover, the system may appear to have lost an acknowledged debit. That is not just a database detail; it is a business correctness issue.</p>
      <p>Possible approaches include:</p>
      <ul>
        <li>Use synchronous or quorum replication for the authoritative ledger path.</li>
        <li>Use an external durable ledger or settlement system as source of truth.</li>
        <li>Reconcile after failover using operation IDs and audit logs.</li>
        <li>Define RPO explicitly and make the business accept or reject that risk.</li>
      </ul>
      <p>The key is to connect replication mode to business promises. A wallet, order, or entitlement service cannot treat acknowledged data loss as a minor operational detail.</p>`
    },
    {
      title: '17. Monitoring checklist',
      body: `<p>Replication needs dedicated observability. Basic health checks such as <span class="inline-code">SELECT 1</span> do not prove a replica is current or promotable.</p>
      <ul class="checklist">
        <li>Primary log generation rate.</li>
        <li>Replica receive/flush/replay positions.</li>
        <li>Time lag and byte lag.</li>
        <li>Replay rate versus generation rate.</li>
        <li>Replication slot or CDC lag.</li>
        <li>Retained log bytes and disk pressure.</li>
        <li>Replica query load and long-running queries.</li>
        <li>Replication errors and conflicts.</li>
        <li>Replica promotion eligibility.</li>
        <li>Read routing decisions by source.</li>
        <li>Failover duration and application reconnect behavior.</li>
        <li>Post-failover reconciliation mismatches.</li>
      </ul>`
    },
    {
      title: '18. Replication versus consensus',
      body: `<p>Replication and consensus are related but not identical.</p>
      <p>Replication copies changes. Consensus helps a set of nodes agree on an ordered sequence of changes and leadership despite failures.</p>
      <p>A primary/replica database may replicate changes without every write being decided by a majority consensus protocol. That can be perfectly appropriate, but you must understand its failover and data-loss behavior.</p>
      <p>This bridges naturally to leader election: when a primary fails, the system must choose a new authority safely, fence old authority, and prevent split brain.</p>`
    },
    {
      title: '19. Interview-style answer',
      body: `<p>A strong interview answer:</p>
      <div class="code-block"><span class="code-label">answer</span><pre>Replication keeps multiple copies of data for availability, read scale, durability, migration, or geographic locality. The key design choice is when a write is considered committed relative to the replicas.

Async replication gives low write latency but can lose acknowledged writes during failover. Synchronous or quorum replication reduces that risk but increases latency and may reduce availability. Replicas can serve reads only when the business can tolerate their freshness level.

I would classify reads by consistency requirement, monitor lag and replay position, use idempotency for ambiguous writes, and design failover with promotion rules and fencing so stale primaries cannot continue accepting writes.</pre></div>`
    }
  ],
  keyTakeaways: [
    'Replication keeps copies, but the semantics depend on when writes are acknowledged.',
    'Physical and logical replication solve different problems.',
    'Async replication is fast but can lose acknowledged writes during failover.',
    'Synchronous replication improves durability but adds latency and availability trade-offs.',
    'Received, flushed, replayed, and visible are different stages.',
    'Read replicas can violate read-your-writes, monotonic reads, and security expectations.',
    'Failover needs promotion rules and fencing, not just DNS changes.',
    'Replication slots and CDC lag can fill primary disk.',
    'Replicas are not backups; bad changes replicate too.',
    'Ambiguous commits require idempotency or reconciliation.',
    'Wallet and ledger systems must align replication mode with business RPO.',
    'Replication is connected to leader election and consensus but is not the same thing.'
  ]
};
