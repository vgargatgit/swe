window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS['day-34-cap-theorem'] = {
  day: 34,
  title: 'CAP Theorem',
  subtitle: 'Reason about consistency, availability, and partitions from the actual failure policy, not from a slogan.',
  tags: ['CAP', 'CP vs AP', 'Network partitions', 'PACELC', 'Quorum', 'Consistency models'],
  core: 'In a distributed system, when a network partition prevents some nodes from communicating, you cannot simultaneously guarantee both strong consistency and availability for every request. During that partition, you must choose which property to sacrifice.',
  sections: [
    {
      title: '1. What CAP really says',
      diagram: `flowchart TD
        P[Network partition occurs] --> Choice{During the partition, what do we preserve?}
        Choice -- Consistency --> CP[CP: reject or delay unsafe work]
        Choice -- Availability --> AP[AP: continue locally and reconcile]
        CP --> Safe[Single truth preserved]
        CP --> Unavailable[Some requests unavailable]
        AP --> Available[Requests continue]
        AP --> Divergent[Temporary divergent truths]`,
      body: `<p>The classic shorthand is <strong>C = Consistency, A = Availability, P = Partition tolerance</strong>. But the common phrase "choose any two of three" is misleading.</p>
      <p>A more accurate interpretation is: <strong>when a network partition occurs, a distributed system must choose between preserving consistency and preserving availability.</strong></p>
      <div class="code-block"><span class="code-label">better framing</span><pre>During partition:

CP
  preserve consistency
  reject or delay some requests

or

AP
  preserve availability
  allow temporary inconsistency</pre></div>
      <p>Partition tolerance is usually not optional in a real distributed system because networks can fail. You cannot configure network partitions to be disabled.</p>`
    },
    {
      title: '2. Consistency, availability, and partition tolerance',
      body: `<h3>Consistency in CAP</h3><p>CAP consistency does not mean database constraints, foreign keys, or the C in ACID. In CAP, consistency means something much closer to <strong>linearizability</strong>: every successful read behaves as though there is one single, up-to-date copy of the data.</p>
      <div class="code-block"><span class="code-label">linearizable intuition</span><pre>Initial value:
balance = 100

Client A writes:
balance = 50

After the write completes, every later successful read should return:
50

not:
100</pre></div>
      <p>A linearizable system behaves as though operations happened one at a time in a single global order consistent with real time.</p>
      <h3>Availability in CAP</h3><p>CAP availability has a strong meaning. Every request sent to a non-failed node must eventually receive a response that services the operation. Returning an HTTP 503 may be a response at the HTTP layer, but in CAP terminology the operation was not available.</p>
      <h3>Partition tolerance</h3><p>A network partition happens when nodes that are otherwise alive cannot communicate reliably. This is different from a crash. A node can be fully alive and reachable by clients on its side of the partition while unable to reach other nodes.</p>`
    },
    {
      title: '3. The simplest CAP example',
      diagram: `flowchart LR
        C1[Client 1] --> A[Node A\nx = 10]
        C2[Client 2] --> B[Node B\nx = 10]
        A -. network partition .- B
        A --> Write[Client 1 writes x = 20]
        B --> Read[Client 2 reads or writes locally]`,
      body: `<p>Suppose two database nodes both contain <code>x = 10</code>. The network splits, so A cannot reach B and B cannot reach A. Client 1 can reach A. Client 2 can reach B. Client 1 writes <code>x = 20</code>.</p>
      <p>Now what should B do if Client 2 asks to read or write <code>x</code>?</p>
      <h3>CP choice</h3><p>B says: "I cannot know whether my value is current. Therefore I will refuse the read or write." This preserves consistency but some users cannot use the system.</p>
      <div class="code-block"><span class="code-label">CP</span><pre>Consistency      yes
Partition tolerant yes
Availability     sacrificed for unsafe operations</pre></div>
      <h3>AP choice</h3><p>B says: "I cannot contact A, but I will continue serving requests." Client 2 may read stale <code>x = 10</code> or write <code>x = 30</code>. Both sides remained available, but state diverged.</p>
      <div class="code-block"><span class="code-label">AP</span><pre>Availability      yes
Partition tolerant yes
Consistency       temporarily sacrificed</pre></div>`
    },
    {
      title: '4. Why choose-two is misleading',
      body: `<p>People often draw a triangle and say choose CA, CP, or AP. But a truly distributed system cannot generally choose CA without P because network partitions can happen whether you want them or not.</p>
      <p>When there is no partition, many systems can provide both consistency and availability. CAP primarily constrains behavior during communication failure.</p>
      <p>A single-node database is effectively consistent and available while the node is alive. There is no distributed partition between nodes because there is only one node. But once you replicate across machines, partition behavior becomes relevant.</p>`
    },
    {
      title: '5. Leader-based database example',
      diagram: `flowchart TD
        A[Primary A] --> B[Replica B]
        A --> C[Replica C]
        Split{Network split}
        Split --> Majority[A + B majority side]
        Split --> Minority[C minority side]
        Majority --> Continue[Writes continue]
        Minority --> Refuse[Refuse unsafe writes]`,
      body: `<p>Suppose a database cluster has Primary A and replicas B and C. A owns writes. If the partition is <code>A B | C</code>, then A and B form a majority and writes can continue on that side. C should refuse writes.</p>
      <p>If the leader is isolated as <code>A | B C</code>, then A loses quorum and should stop accepting writes. B or C may become the new leader. This is CP behavior because the isolated side sacrifices availability to prevent split brain.</p>
      <p>The minority must stop because if both sides continue accepting writes, histories diverge. For a wallet, one side might debit 70 while the other debits 60 from the same balance. After the partition heals there may be no safe automatic merge.</p>`
    },
    {
      title: '6. AP intuition and business semantics',
      diagram: `flowchart LR
        India[India replica\ncart: Book] -. partition .- Europe[Europe replica\ncart: Headphones]
        India --> Merge[After healing: merge]
        Europe --> Merge
        Merge --> Cart[cart: Book + Headphones]`,
      body: `<p>A shopping cart is a classic AP-friendly example. During a partition, India can accept "add Book" and Europe can accept "add Headphones." Later the system can merge the cart as Book plus Headphones.</p>
      <p>This works because the conflict semantics are manageable. Shopping carts tolerate temporary divergence much better than bank balances.</p>
      <p>Business semantics determine the CAP choice. Product descriptions, recommendations, likes, presence, and analytics can often tolerate AP-style behavior. Inventory reservation, payment authorization, account disablement, one-time coupon redemption, and wallet debits usually need CP-style behavior around the authoritative invariant.</p>`
    },
    {
      title: '7. Wallet example',
      diagram: `flowchart TD
        Balance[Wallet balance = 1000] --> Partition[Network partition]
        Partition --> Mumbai[Mumbai approves debit 800]
        Partition --> Delhi[Delhi approves debit 700]
        Mumbai --> Combined[Combined spend = 1500]
        Delhi --> Combined
        Combined --> Broken[Invariant broken: spend exceeds balance]`,
      body: `<p>Suppose a wallet balance is 1000. A partition separates two regions. The user attempts an 800 debit in Mumbai and a 700 debit in Delhi.</p>
      <p>If both sides remain independently available, Mumbai believes the balance is 200 and Delhi believes the balance is 300. Combined spending is 1500 against only 1000 available.</p>
      <p>For balance-spending authority, CP behavior is generally safer: only one quorum or leader may approve debits. The other region may temporarily reject wallet mutations.</p>
      <p>But a different endpoint, such as transaction history, may tolerate a slightly stale replica. Within the same wallet system, balance mutation is CP-style, historical reads may be eventual, and analytics can be AP-friendly.</p>`
    },
    {
      title: '8. Quorum reasoning',
      diagram: `flowchart LR
        W[Write quorum W=2] --> A[Replica A]
        W --> B[Replica B]
        R[Read quorum R=2] --> B
        R --> C[Replica C]
        B --> Intersection[Read and write intersect]`,
      body: `<p>Suppose a distributed database stores three copies, so <code>N = 3</code>. A write requires <code>W = 2</code> replicas. A read queries <code>R = 2</code> replicas. Since <code>R + W > N</code>, any read quorum intersects any successful write quorum.</p>
      <p>That intersection is the theoretical basis of quorum consistency.</p>
      <div class="callout warn"><strong>Trap:</strong> quorum arithmetic alone does not prove strong consistency. You also need to reason about concurrent writes, version ordering, conflict resolution, sloppy quorums, hinted handoff, node replacement, clock assumptions, read repair, and whether the read actually selects the newest version.</div>
      <p>Consensus systems such as Raft combine quorum voting with an ordered committed log. That is stronger than simply saying <code>R + W > N</code>.</p>`
    },
    {
      title: '9. Strong consistency, eventual consistency, and weaker guarantees',
      body: `<p>Strong consistency wants that after a write succeeds, all later reads behave as if the write happened atomically. Eventual consistency allows one replica to be stale temporarily, as long as replicas converge when writes stop and communication continues.</p>
      <p>There are useful intermediate guarantees. <strong>Read-your-writes</strong> means you see your own latest changes, though another user may temporarily see old data. <strong>Monotonic reads</strong> means once you see version 10, you should not later see version 9. These are weaker than global linearizability but often good enough for user experience.</p>
      <h3>Linearizability example</h3><div class="code-block"><span class="code-label">timeline</span><pre>Initial:
x = 0

T1 Client A: WRITE x = 1
T2 write returns SUCCESS
T3 Client B: READ x

A linearizable system must return 1.</pre></div>
      <p>If a read overlaps a write, the system may legally order the read before or after the write. But non-overlapping operations must respect real-world ordering.</p>`
    },
    {
      title: '10. PACELC',
      diagram: `flowchart TD
        System[Distributed system] --> P{Partition?}
        P -- yes --> PAC[Choose Availability or Consistency]
        P -- no --> ELC[Choose lower Latency or stronger Consistency]`,
      body: `<p>CAP does not describe normal latency trade-offs when there is no partition. PACELC expands the idea:</p>
      <div class="code-block"><span class="code-label">PACELC</span><pre>If Partition:
  choose Availability or Consistency
Else:
  choose Latency or Consistency</pre></div>
      <p>For example, a Mumbai write that waits for a Virginia acknowledgement may improve consistency or durability, but every write pays cross-region round-trip latency. If the system writes locally and replicates asynchronously, it gets lower latency but weaker immediate consistency.</p>
      <p>No partition exists in that example. CAP alone does not explain the trade-off. PACELC does.</p>`
    },
    {
      title: '11. CP and AP misconceptions',
      body: `<h3>CP does not mean the whole system goes down</h3><p>A five-node cluster that loses one node still has four nodes and can likely continue. A CP system becomes unavailable only when the failure topology prevents the required quorum. A minority side may stop, but the majority side can continue.</p>
      <h3>AP does not mean random incorrectness</h3><p>When the network is healthy, AP systems may converge within milliseconds. AP means the system chooses to continue operating during partition even if divergence is temporarily possible. Good AP systems provide versioning, conflict resolution, convergence, causal metadata, read repair, and anti-entropy.</p>
      <h3>CAP is about operations, not brands</h3><p>Do not label an entire product or database too casually. Behavior depends on topology, read/write concern, quorum settings, consistency level, replication mode, and routing.</p>`
    },
    {
      title: '12. Conflict resolution in AP systems',
      body: `<p>If two partitions update the same state independently, the system must reconcile later. Possible policies include last-write-wins, highest version, deterministic node priority, application merge, user conflict resolution, CRDTs, or manual repair.</p>
      <p>Last-write-wins can silently lose valid data. Suppose one region updates language and another updates notification settings. If the whole object is replaced and LWW picks one version, the other field change may disappear.</p>
      <p>Clock skew makes timestamp-based last-write-wins even more dangerous. A later real-world update may carry an earlier clock timestamp and be discarded incorrectly.</p>
      <p>Conflict-free replicated data types work well for some counters, sets, maps, and collaborative data structures. They do not magically solve every business invariant, such as never allowing a wallet balance below zero.</p>`
    },
    {
      title: '13. Escrow and partitioned authority',
      body: `<p>Sometimes you can preserve useful invariants without global coordination by preallocating rights.</p>
      <div class="code-block"><span class="code-label">inventory escrow</span><pre>Total inventory = 100

Mumbai rights = 60
Delhi rights  = 40

During a partition:
Mumbai can sell up to 60.
Delhi can sell up to 40.

Global invariant total sold <= 100 still holds.</pre></div>
      <p>You traded dynamic flexibility for preallocated local authority. The same idea can theoretically apply to wallet spending rights, but it complicates transfers, replenishment, fraud controls, reservations, and UX. For many financial systems, central or quorum ownership is simpler and safer.</p>
      <p>Another pattern is to partition authority by key: India users owned by Mumbai, US users owned by Virginia. During a regional partition, each region continues for the keys it owns. This avoids conflict by changing data ownership.</p>`
    },
    {
      title: '14. CAP in caches, events, and microservices',
      body: `<p>A strongly consistent database does not guarantee strong application behavior if stale layers sit in front of it. Redis cache, CDN, browser state, read replicas, and asynchronous projections all affect the user-visible consistency model.</p>
      <p>Asynchronous events create application-level eventual consistency even without a network partition. Order Service may commit ORDER_CREATED, while Inventory Service learns about it 500 ms later. During that interval the system contains order-created but inventory-not-yet-updated.</p>
      <p>Microservices with separate databases also create consistency questions. Create order, reserve inventory, and charge payment cannot generally be globally linearizable without distributed coordination. That is a saga/distributed transaction issue as much as a CAP issue.</p>
      <div class="callout"><strong>Use CAP carefully:</strong> Statements like "we use eventual consistency because CAP" are weak unless you can say which nodes cannot communicate, which operations continue, which fail, what state may diverge, how it reconciles, and what invariant is protected.</div>`
    },
    {
      title: '15. Multi-region patterns',
      diagram: `flowchart LR
        Mumbai[Mumbai region] -. WAN partition .- Virginia[Virginia region]
        Mumbai --> ActivePassive[Active-passive: one writer]
        Virginia --> ActivePassive
        Mumbai --> ActiveActive[Active-active: both write]
        Virginia --> ActiveActive
        ActivePassive --> CP[CP-style for writes]
        ActiveActive --> AP[AP-style unless ownership is partitioned]`,
      body: `<p>Multi-region makes CAP trade-offs more visible because distance increases latency and partitions become more likely.</p>
      <h3>Active-passive</h3><p>One region is the active writer. The other is a passive replica. If the regions cannot communicate but the primary remains healthy, the passive side should not promote itself. This preserves single-writer consistency but users near the passive region may lose write availability.</p>
      <h3>Active-active</h3><p>Both regions accept writes. During partition both continue. This improves local write availability but requires conflict handling, key ownership, CRDTs, deterministic merges, or business reconciliation.</p>
      <p>Active-active is not simply twice the availability. It changes the consistency model.</p>`
    },
    {
      title: '16. Interview-style reasoning',
      body: `<h3>Explain CAP without saying choose two</h3><p>CAP says that when a distributed system experiences a network partition, it cannot guarantee both linearizable consistency and availability for every request. If it preserves consistency, some nodes must reject or delay operations because they cannot prove they have current authority. If it preserves availability, isolated nodes may continue serving operations and therefore temporarily diverge. Partition tolerance is not normally optional, so the useful design question is how each operation behaves during partition.</p>
      <h3>What does consistency mean in CAP?</h3><p>CAP consistency is generally interpreted as linearizability: successful operations appear to occur atomically in one global order that respects real-time ordering. If a write completes before a later read begins, that read must observe the write. It is not the same as ACID consistency.</p>
      <h3>Is PostgreSQL CP or AP?</h3><p>It depends on deployment. A single PostgreSQL instance does not meaningfully face distributed CAP trade-offs. In a replicated HA cluster, if only the quorum-authorized primary accepts writes and a minority side refuses them during partition, the write path behaves CP. Asynchronous read replicas may still expose stale reads, so application routing matters.</p>
      <h3>Would you choose CP or AP for payments?</h3><p>For authoritative payment state, idempotency records, balances, and ledger invariants, prefer CP behavior. If the system cannot establish a single authoritative writer or sufficiently current quorum, reject or defer the operation rather than risk duplicate or inconsistent financial state. Transaction history, analytics, and notifications can often be eventual.</p>
      <h3>Give an AP use case</h3><p>A shopping cart is a classic example. Two disconnected regions can both accept additions, then merge the cart later. Social likes, presence, recommendations, and analytics counters can also fit when exact instantaneous values are not business-critical.</p>
      <h3>What is PACELC?</h3><p>PACELC extends CAP by noting that even when there is no partition, systems often trade latency for stronger consistency. During partition choose availability or consistency; otherwise choose lower latency or stronger consistency.</p>`
    },
    {
      title: '17. Production incidents',
      body: `<div class="mini-card"><h4>Dual-region oversell</h4><p>Stock has one item. Mumbai and Singapore cannot communicate. Both remain active and both sell the last item. After reconciliation there are two orders and one item. Fix with single-region ownership, quorum, preallocated inventory, reservation tokens, or escrow allocation.</p></div>
      <div class="mini-card"><h4>CP outage mistaken for failure</h4><p>A three-node database partitions as A | B C. A was primary, but it loses quorum and stops accepting writes. Operators see that A is healthy but writes are rejected. The system is not broken; it is preserving safety.</p></div>
      <div class="mini-card"><h4>AP conflict hidden by last-write-wins</h4><p>Mumbai changes language while Singapore changes notification settings. Whole-object LWW chooses one version and loses the other update. Fix with field-level updates, version vectors, mergeable data structures, or explicit conflict resolution.</p></div>`
    },
    {
      title: '18. Decision framework',
      body: `<p>For any distributed operation, ask:</p>
      <ul class="checklist"><li>What invariant could be violated if two partitions act independently?</li><li>Can that invariant be repaired after the fact?</li><li>How expensive is temporary unavailability?</li><li>Can authority be partitioned so each side owns different keys?</li><li>Can resources be preallocated to avoid coordination?</li><li>Does the user require read-your-writes or full linearizability?</li><li>How stale may reads be?</li><li>Can conflicts be merged deterministically?</li><li>What happens when the partition heals?</li><li>How will reconciliation be audited?</li><li>What is the latency cost of strong coordination?</li><li>Is consistency required globally or only per key/tenant?</li><li>Can cache or replica layers weaken the storage guarantee?</li><li>What is the system's actual behavior during loss of quorum?</li><li>Is the CAP choice documented per operation?</li></ul>`
    }
  ],
  keyTakeaways: [
    'CAP describes distributed-system behavior during network partitions.',
    'CAP consistency usually means linearizability, not ACID consistency.',
    'CAP availability means a non-failed node can service the operation, not merely return 503.',
    'Partition tolerance is not usually optional once you have multiple nodes.',
    'During partition, CP systems refuse unsafe operations; AP systems continue and reconcile.',
    'CP does not mean the whole system is always unavailable, and AP does not mean random incorrectness.',
    'PACELC adds the normal-time latency versus consistency trade-off.',
    'The right choice is determined by the business invariant, not by a database brand label.',
    'A single product can contain both CP and AP operations.',
    'For money, uniqueness, permissions, and scarce inventory, refusing uncertain operations is often safer.',
    'For feeds, carts, analytics, counters, and mergeable state, continuing and reconciling can be better.'
  ]
};