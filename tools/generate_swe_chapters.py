from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Iterable

import mistune
from bs4 import BeautifulSoup

SOURCE = Path('/mnt/data/Pasted text.txt')
OUT = Path('/mnt/data/swe-ch2-ch32-integration')

META = {
    2: ('Caching', 'day-02-caching', 'Store expensive results closer to callers while trading freshness for speed.'),
    3: ('Load Balancing', 'day-03-load-balancing', 'Distribute traffic across healthy backends while controlling routing, health, and draining.'),
    4: ('Reverse Proxies', 'day-04-reverse-proxies', 'The backend front door: TLS, buffering, headers, static files, routing, and trust boundaries.'),
    5: ('API Gateways', 'day-05-api-gateways', 'Centralized API policy for authentication, quotas, validation, versioning, and routing.'),
    6: ('CI/CD', 'day-06-cicd', 'A controlled path from code to production through verification, immutable artifacts, deployment, and recovery.'),
    7: ('Docker', 'day-07-docker', 'Package applications and runtime dependencies into immutable images and disposable containers.'),
    8: ('Kubernetes', 'day-08-kubernetes', 'Desired-state orchestration for containers, services, rollout, scaling, and health.'),
    9: ('Service Discovery', 'day-09-service-discovery', 'Map logical service names to changing instances without hardcoded IP addresses.'),
    10: ('Circuit Breakers', 'day-10-circuit-breakers', 'Stop calling a dependency that is already unhealthy so failure does not cascade.'),
    11: ('Timeouts', 'day-11-timeouts', 'Bound every remote, database, queue, and lock wait so resources are not held indefinitely.'),
    12: ('Retries', 'day-12-retries', 'Retry only transient, safe operations within a deadline and with idempotency where needed.'),
    13: ('Exponential Backoff', 'day-13-exponential-backoff', 'Spread retries over time using capped exponential delays and jitter to avoid retry storms.'),
    14: ('Idempotency', 'day-14-idempotency', 'Make repeated execution of the same logical operation safe after retries, timeouts, and duplicate delivery.'),
    15: ('Message Queues', 'day-15-message-queues', 'Temporal decoupling, buffering, retries, visibility timeouts, and at-least-once processing.'),
    16: ('Pub/Sub', 'day-16-pubsub', 'Publish one event to many independent subscribers with their own delivery state.'),
    17: ('Event-Driven Architecture', 'day-17-event-driven-architecture', 'Organize services around durable facts and asynchronous reactions.'),
    18: ('Distributed Transactions', 'day-18-distributed-transactions', 'Coordinate one logical business operation across multiple independent services or resources.'),
    19: ('Saga Pattern', 'day-19-saga-pattern', 'Run a sequence of local transactions with durable state, retries, and compensating actions.'),
    20: ('Dead Letter Queues', 'day-20-dead-letter-queues', 'Quarantine messages after bounded retry exhaustion so poison events do not block normal flow.'),
    21: ('Cron Jobs', 'day-21-cron-jobs', 'Design scheduled workflows for clustered execution, recovery, idempotency, and operational control.'),
    22: ('WebSockets', 'day-22-websockets', 'Operate long-lived bidirectional connections for chat, notifications, dashboards, games, and presence.'),
    23: ('Long Polling', 'day-23-long-polling', 'Hold an HTTP request until an event or timeout, then reconnect safely with a cursor.'),
    24: ('Server-Sent Events', 'day-24-server-sent-events', 'Stream one-way server-to-browser events over HTTP with replay, reconnect, and backpressure controls.'),
    25: ('Database Indexing', 'day-25-database-indexing', 'Use extra data structures to reduce lookup work while paying storage and write cost.'),
    26: ('Query Optimization', 'day-26-query-optimization', 'Reduce total database work using execution plans, predicates, joins, pagination, statistics, and shape-aware SQL.'),
    27: ('N+1 Queries', 'day-27-n-plus-one-queries', 'Avoid one parent query followed by one lazy relationship query per parent.'),
    28: ('Connection Pooling', 'day-28-connection-pooling', 'Reuse database sessions and impose a concurrency boundary between the application and database.'),
    29: ('Read Replicas', 'day-29-read-replicas', 'Scale stale-tolerant reads from copies while protecting current and invariant reads on the primary.'),
    30: ('Sharding', 'day-30-sharding', 'Split one logical dataset across independent database nodes using a shard key and routing layer.'),
    31: ('Partitioning', 'day-31-partitioning', 'Divide one logical table into physical pieces inside one database authority.'),
    32: ('Replication', 'day-32-replication', 'Maintain multiple copies of data while trading durability, latency, availability, and consistency.'),
}

CORES = {
    2: 'A cache trades freshness and complexity for lower latency, lower backend load, and higher throughput.',
    3: 'A load balancer distributes both load and failure; routing, health checks, capacity headroom, and connection lifecycle determine whether it improves or accelerates an outage.',
    4: 'A reverse proxy creates another network hop with its own connections, headers, timeouts, retries, buffering, trust boundary, and failure modes.',
    5: 'An API Gateway is the policy-enforcement point for APIs: authenticate, authorize, limit, validate, transform, version, observe, and route without absorbing domain business logic.',
    6: 'A good CI/CD system creates a controlled, repeatable path by which every production change can be built, verified, traced, released, and reversed when safe.',
    7: 'A container packages the application and user-space dependencies; the host kernel runs it.',
    8: 'Kubernetes continuously reconciles declared desired state with the actual state of workloads, networking, resources, and failures.',
    9: 'Service discovery maps a stable logical service identity to dynamic healthy instances; load balancing then chooses which instance receives a request.',
    10: 'A circuit breaker does not heal a dependency; it stops wasting resources on a dependency already known to be unhealthy.',
    11: 'Every wait in a distributed system must be bounded, and a timeout means the caller stopped waiting—not necessarily that the remote operation failed.',
    12: 'Retry only when the failure is transient, the operation is safe to repeat, the deadline allows it, and the extra load remains within budget.',
    13: 'Exponential backoff reduces retry frequency during sustained failure, while jitter prevents synchronized retry spikes.',
    14: 'Idempotency makes repeated execution of the same logical operation safe after timeouts, retries, concurrency, and duplicate delivery.',
    15: 'A message queue provides temporal decoupling and load buffering, but normally requires at-least-once, idempotent, observable consumer processing.',
    16: 'Pub/Sub announces a fact once and gives independent subscriber groups their own delivery and recovery state.',
    17: 'Event-driven architecture represents important state changes as durable facts and lets independently owned components react asynchronously.',
    18: 'Across independent resources, one logical transaction creates partial-success and unknown-outcome states that local ACID transactions cannot hide.',
    19: 'A saga coordinates local transactions and business compensations so a multi-service workflow reaches an acceptable terminal state.',
    20: 'A Dead Letter Queue quarantines messages only after automated recovery is exhausted; it is an operational repair workflow, not permanent storage.',
    21: 'A distributed cron job must run the correct business execution—not merely fire a timer—despite replicas, crashes, overlap, clock issues, and retries.',
    22: 'WebSockets are long-lived full-duplex transports; scaling them is a connection, routing, backpressure, recovery, and identity problem.',
    23: 'Long polling holds one HTTP request until data or timeout, then resumes from a durable cursor without losing or duplicating effects.',
    24: 'SSE is a long-lived one-way HTTP stream whose correctness depends on replay identifiers, flushing, proxy behavior, authentication, and backpressure.',
    25: 'An index is a query-shaped data structure that exchanges storage and write cost for less read work.',
    26: 'Optimize the amount of work the database performs, guided by actual execution plans and representative data—not by SQL aesthetics.',
    27: 'N+1 is an access-pattern problem: one parent query triggers one additional relationship query per parent, multiplying round trips and work.',
    28: 'A connection pool reuses database sessions and serves as admission control; making it larger can move the queue into the database and reduce throughput.',
    29: 'Read replicas add read capacity by serving copies that may lag; every read path must state how much staleness and failover ambiguity it can tolerate.',
    30: 'Sharding scales beyond one database by dividing ownership across nodes, but introduces routing, skew, cross-shard operations, and resharding complexity.',
    31: 'Partitioning divides one logical table into smaller physical pieces for pruning, retention, and safer maintenance.',
    32: 'Replication is a choice about when writes complete, which copies may serve reads, how lag is detected, and what happens during failover.',
}

TAGS = {
    2: ['Caching', 'Redis', 'Cache-aside', 'TTL', 'Stampede', 'Invalidation'],
    3: ['Load balancing', 'L4/L7', 'Health checks', 'Connection draining', 'WebSockets', 'Capacity'],
    4: ['Reverse proxy', 'NGINX', 'Forwarded headers', 'Timeouts', 'Buffering', 'TLS'],
    5: ['API gateway', 'Authentication', 'Rate limits', 'BFF', 'Versioning', 'Routing'],
    6: ['CI/CD', 'Immutable artifacts', 'Canary', 'Database migrations', 'OIDC', 'Rollback'],
    7: ['Docker', 'Containers', 'Images', 'Multi-stage build', 'Security', 'JVM'],
    8: ['Kubernetes', 'Pods', 'Deployments', 'Services', 'Probes', 'Autoscaling'],
    9: ['Service discovery', 'DNS', 'Registry', 'Kubernetes Service', 'Health', 'Locality'],
    10: ['Circuit breaker', 'Resilience4j', 'Fallback', 'Bulkhead', 'Slow calls', 'Failure isolation'],
    11: ['Timeouts', 'Deadlines', 'Connection pools', 'Database locks', 'Ambiguous outcomes', 'Observability'],
    12: ['Retries', 'Retry budget', 'Idempotency', 'Transient failures', 'Circuit breaker', 'Deadline'],
    13: ['Exponential backoff', 'Jitter', 'Retry-After', 'Reconnects', 'Recovery storm', 'Retry budget'],
    14: ['Idempotency', 'Payments', 'Deduplication', 'Unique constraint', 'Request fingerprint', 'Reconciliation'],
    15: ['Message queues', 'At-least-once', 'Visibility timeout', 'Backpressure', 'Outbox', 'Consumers'],
    16: ['Pub/Sub', 'Topics', 'Subscriptions', 'Kafka', 'Consumer groups', 'Replay'],
    17: ['EDA', 'Domain events', 'Outbox', 'Eventual consistency', 'Choreography', 'Observability'],
    18: ['Distributed transactions', '2PC', 'XA', 'Compensation', 'Outbox', 'Unknown outcomes'],
    19: ['Saga', 'Orchestration', 'Choreography', 'Compensation', 'Durable workflow', 'Idempotency'],
    20: ['DLQ', 'Poison messages', 'Retry policy', 'Replay', 'Operations', 'Schema failures'],
    21: ['Cron', 'Scheduling', 'Singleton execution', 'Checkpointing', 'Time zones', 'Kubernetes CronJob'],
    22: ['WebSockets', 'Presence', 'Heartbeats', 'Reconnect', 'Backpressure', 'Fan-out'],
    23: ['Long polling', 'Cursor', 'DeferredResult', 'Replay', 'Timeouts', 'Horizontal scaling'],
    24: ['SSE', 'EventSource', 'Last-Event-ID', 'Proxy buffering', 'Backpressure', 'Authentication'],
    25: ['Database indexing', 'B-tree', 'Composite index', 'Selectivity', 'Sargability', 'Pagination'],
    26: ['Query optimization', 'EXPLAIN', 'Join algorithms', 'Cardinality', 'Sorting', 'Pagination'],
    27: ['N+1', 'Hibernate', 'JPA', 'Fetch join', 'Batch fetching', 'DTO projection'],
    28: ['Connection pooling', 'HikariCP', 'Pool sizing', 'Leaks', 'Admission control', 'Transactions'],
    29: ['Read replicas', 'Replica lag', 'Read-your-writes', 'Failover', 'Routing', 'Consistency'],
    30: ['Sharding', 'Shard key', 'Routing', 'Hot shards', 'Resharding', 'Global operations'],
    31: ['Partitioning', 'Partition pruning', 'Range partitions', 'Hash partitions', 'Retention', 'PostgreSQL'],
    32: ['Replication', 'WAL', 'Replica lag', 'Failover', 'Split brain', 'Read consistency'],
}

DIAGRAMS = {
    2: 'flowchart LR\n  Client --> App[Application]\n  App --> L1[Local L1 cache]\n  L1 -- miss --> L2[(Distributed cache)]\n  L2 -- miss --> DB[(Source of truth)]\n  DB --> L2\n  L2 --> L1\n  L1 --> App',
    3: 'flowchart LR\n  Users --> LB[Load Balancer]\n  LB --> A[Instance A]\n  LB --> B[Instance B]\n  LB --> C[Instance C]\n  LB -. health / draining .-> A\n  LB -. health / draining .-> B\n  LB -. health / draining .-> C',
    4: 'flowchart LR\n  Client --> Edge[CDN / WAF]\n  Edge --> LB[Load balancer]\n  LB --> Proxy[NGINX / Envoy]\n  Proxy --> App[Spring service]\n  Client -. connection 1 .-> Proxy\n  Proxy -. connection 2 .-> App',
    5: 'flowchart LR\n  Client --> GW[API Gateway]\n  GW --> Policy[Auth / limits / validation]\n  GW --> User[User Service]\n  GW --> Order[Order Service]\n  GW --> Payment[Payment Service]',
    6: 'flowchart LR\n  PR[Pull request] --> Verify[Build / test / scan]\n  Verify --> Artifact[Immutable artifact]\n  Artifact --> Stage[Staging]\n  Stage --> Prod[Canary / blue-green]\n  Prod --> Observe[Technical + business verification]\n  Observe -- abort / rollback --> Prod',
    7: 'flowchart TD\n  Dockerfile --> Image[Immutable image layers]\n  Image --> C1[Container 1]\n  Image --> C2[Container 2]\n  C1 --> Kernel[Host kernel]\n  C2 --> Kernel\n  C1 --> External[External config / secrets / storage]',
    8: 'flowchart TD\n  Desired[Declared desired state] --> API[API Server]\n  API --> etcd[(etcd)]\n  API --> Controllers[Controllers]\n  Controllers --> Scheduler[Scheduler]\n  Scheduler --> N1[Node 1 / Pods]\n  Scheduler --> N2[Node 2 / Pods]\n  N1 -. observed state .-> API\n  N2 -. observed state .-> API',
    9: 'flowchart LR\n  Caller --> Name[Logical service name]\n  Name --> Discovery[DNS / Registry / Service]\n  Discovery --> A[Healthy instance A]\n  Discovery --> B[Healthy instance B]\n  Discovery --> C[Healthy instance C]\n  Discovery -. updates .-> Name',
    10: 'stateDiagram-v2\n  [*] --> Closed\n  Closed --> Open: failure or slow-call threshold\n  Open --> HalfOpen: wait duration expires\n  HalfOpen --> Closed: trial calls succeed\n  HalfOpen --> Open: trial calls fail',
    11: 'flowchart LR\n  Deadline[End-to-end deadline] --> Pool[Pool acquisition]\n  Pool --> Connect[Connect / TLS]\n  Connect --> Work[Remote processing]\n  Work --> Read[Response / read]\n  Deadline -. remaining budget .-> Pool\n  Deadline -. remaining budget .-> Connect\n  Deadline -. remaining budget .-> Work',
    12: 'flowchart TD\n  Call --> Failed{Failure?}\n  Failed -- no --> Done\n  Failed -- yes --> Transient{Transient?}\n  Transient -- no --> Stop\n  Transient -- yes --> Safe{Idempotent / protected?}\n  Safe -- no --> Stop\n  Safe -- yes --> Budget{Deadline and retry budget?}\n  Budget -- yes --> Backoff[Backoff + jitter]\n  Backoff --> Call\n  Budget -- no --> Stop',
    13: 'flowchart LR\n  F1[Attempt 1 fails] --> J1[Random delay within cap 1]\n  J1 --> F2[Attempt 2 fails]\n  F2 --> J2[Random delay within larger cap]\n  J2 --> F3[Attempt 3]\n  J2 -. capped .-> Max[Maximum delay]',
    14: 'flowchart LR\n  Client -- stable idempotency key --> API\n  API --> Record[(PENDING / COMPLETED record)]\n  Record -- new --> Effect[Perform domain effect]\n  Effect --> Complete[Store final result]\n  Record -- duplicate completed --> Replay[Replay original result]\n  Record -- duplicate pending --> InProgress[Return processing / reconcile]',
    15: 'flowchart LR\n  Producer --> Queue[(Queue)]\n  Queue --> C1[Consumer 1]\n  Queue --> C2[Consumer 2]\n  C1 -- ACK --> Done\n  C2 -- failure / visibility expiry --> Queue\n  Queue -- retry exhausted --> DLQ[(DLQ)]',
    16: 'flowchart LR\n  Producer --> Topic[(Topic)]\n  Topic --> Email[Email subscription]\n  Topic --> Analytics[Analytics subscription]\n  Topic --> Audit[Audit subscription]\n  Email --> EW[Competing email workers]\n  Analytics --> AW[Competing analytics workers]',
    17: 'flowchart LR\n  Owner[Domain owner] -- durable fact --> Bus[(Event bus)]\n  Bus --> A[Projection]\n  Bus --> B[Notification]\n  Bus --> C[Analytics]\n  Owner --> Outbox[(Transactional outbox)]\n  Outbox --> Bus',
    18: 'flowchart LR\n  Business[Logical operation] --> A[Service A / DB A]\n  Business --> B[Service B / DB B]\n  Business --> C[Broker / external system]\n  A -. partial success .-> Repair[Retry / reconcile / compensate]\n  B -. unknown outcome .-> Repair\n  C -. duplicate .-> Repair',
    19: 'stateDiagram-v2\n  [*] --> Started\n  Started --> InventoryReserved\n  InventoryReserved --> WalletDebited\n  WalletDebited --> Completed\n  WalletDebited --> Compensating: later step fails\n  Compensating --> Refunded\n  Refunded --> InventoryReleased\n  InventoryReleased --> Failed',
    20: 'flowchart LR\n  Queue --> Consumer\n  Consumer -- transient --> Retry[Bounded retry + backoff]\n  Retry --> Consumer\n  Consumer -- permanent / exhausted --> DLQ[(Dead Letter Queue)]\n  DLQ --> Inspect[Inspect / repair]\n  Inspect --> Replay[Rate-limited replay]\n  Replay --> Queue',
    21: 'flowchart LR\n  Scheduler --> Claim[(Durable execution claim)]\n  Claim -- winner --> Fanout[Create partition jobs]\n  Claim -- duplicate --> Skip\n  Fanout --> Queue[(Work queue)]\n  Queue --> Workers[Idempotent workers]\n  Workers --> Checkpoint[(Progress / checkpoint)]',
    22: 'flowchart LR\n  Clients --> LB[Connection-aware LB]\n  LB --> W1[WebSocket node A]\n  LB --> W2[WebSocket node B]\n  W1 <--> Broker[(Pub/Sub broker)]\n  W2 <--> Broker\n  W1 --> Store[(Durable message store)]\n  W2 --> Store',
    23: 'sequenceDiagram\n  participant Client\n  participant API\n  participant Store\n  Client->>API: GET /events?after=105\n  API->>Store: check backlog\n  alt backlog exists\n    Store-->>API: events 106..n\n    API-->>Client: batch + next cursor\n  else caught up\n    API-->>Client: wait until event or timeout\n  end\n  Client->>API: reconnect with next cursor',
    24: 'sequenceDiagram\n  participant Browser\n  participant SSE\n  participant Broker\n  Browser->>SSE: GET text/event-stream + Last-Event-ID\n  Broker-->>SSE: domain event\n  SSE-->>Browser: id / event / data\n  SSE-->>Browser: heartbeat comment\n  Browser->>SSE: automatic reconnect after disconnect',
    25: 'flowchart LR\n  Query --> Index[(B-tree / specialized index)]\n  Index --> Candidate[Matching row locations]\n  Candidate --> Table[(Table pages)]\n  Write[INSERT / UPDATE / DELETE] --> Index\n  Write --> Table',
    26: 'flowchart TD\n  SQL --> Plan[EXPLAIN ANALYZE]\n  Plan --> Estimate{Estimate vs actual}\n  Estimate --> Scan[Scans / filters]\n  Estimate --> Join[Join order / algorithm]\n  Estimate --> Sort[Sort / aggregate / spill]\n  Scan --> Change[Change one thing]\n  Join --> Change\n  Sort --> Change\n  Change --> Measure[Measure again]',
    27: 'flowchart TD\n  API --> Parents[1 parent query]\n  Parents --> Q1[relationship query 1]\n  Parents --> Q2[relationship query 2]\n  Parents --> QN[relationship query N]\n  Parents -. replace with .-> Fix[Fetch join / batch / projection / bounded queries]',
    28: 'flowchart LR\n  Requests[Application work] --> Pool[Connection pool]\n  Pool --> C1[Connection 1]\n  Pool --> C2[Connection 2]\n  Pool --> C3[Connection 3]\n  C1 --> DB[(Database)]\n  C2 --> DB\n  C3 --> DB\n  Requests -. pending / timeout .-> Pool',
    29: 'flowchart LR\n  App -- writes and current reads --> Primary[(Primary)]\n  Primary -- replication stream --> R1[(Replica A)]\n  Primary -- replication stream --> R2[(Replica B)]\n  App -- stale-tolerant reads --> R1\n  App -- reporting --> R2\n  R1 -. lag / failover .-> App',
    30: 'flowchart LR\n  App --> Router[Shard router]\n  Router -- shard key --> S1[(Shard 1)]\n  Router -- shard key --> S2[(Shard 2)]\n  Router -- shard key --> S3[(Shard 3)]\n  Router -. scatter / gather .-> S1\n  Router -. scatter / gather .-> S2\n  Router -. scatter / gather .-> S3',
}

TAKEAWAYS = {
    2: ['Cache only workloads with reuse and a meaningful hit ratio.', 'Define freshness, key scope, invalidation, TTL jitter, and miss behavior before choosing a product.', 'Protect the origin from stampedes, penetration, hot keys, cache outages, and mass expiry.', 'Treat authorization-sensitive cache keys as a security boundary.', 'Measure origin work avoided, not only the cache hit ratio.'],
    3: ['Choose L4 or L7 routing from protocol and policy needs.', 'Health checks should decide whether new traffic is safe, not merely whether the process exists.', 'Drain in-flight work during deployments and scale-in.', 'Preserve capacity headroom so one failure does not overload survivors.', 'Audit retries, client-IP trust, TLS termination, and long-lived connection behavior.'],
    4: ['Every proxy introduces a separate connection and timeout boundary.', 'Trust forwarded identity only when a trusted network hop establishes or sanitizes it.', 'Align timeouts and retries across the entire path.', 'Configure buffering deliberately for uploads, SSE, streaming, and WebSockets.', 'Attribute 502/503/504 responses to the hop that actually generated them.'],
    5: ['Keep the gateway focused on cross-cutting API policy, not domain business logic.', 'Backends may trust gateway-established identity only when they cannot be reached around the gateway.', 'Make rate limits, quotas, validation, versioning, and route configuration reviewable as code.', 'Avoid retrying non-idempotent operations without end-to-end protection.', 'Scale and observe the gateway as critical shared infrastructure.'],
    6: ['Build once and promote the exact immutable artifact through every environment.', 'Treat the delivery system and its credentials as privileged production infrastructure.', 'Use backward-compatible database changes during rolling deployment.', 'A deployment is complete only after technical and business verification.', 'Plan rollback, forward-fix, cancellation, and partial-deployment recovery before release.'],
    7: ['An image is an immutable blueprint; a container is a disposable running process.', 'Build with heavy tools, but ship only the minimal runtime.', 'Keep secrets, durable state, and environment configuration outside the image.', 'Run with least privilege and explicit CPU/memory limits.', 'Fix production by building a new image, not by editing a running container.'],
    8: ['Declare desired state and let controllers reconcile reality.', 'Treat Pods as disposable and Services as stable discovery endpoints.', 'Use readiness, liveness, and startup probes for different decisions.', 'Requests, limits, topology, storage, and rollout settings are part of application correctness.', 'Avoid operating stateful systems like ordinary stateless Deployments.'],
    9: ['Discovery answers where a service exists; load balancing chooses an instance.', 'Prefer stable logical names over hardcoded IP addresses.', 'Health, deregistration, DNS caching, and locality determine whether discovery stays accurate.', 'Cache known instances carefully so a registry outage does not instantly stop traffic.', 'Use the platform-native mechanism unless a separate registry solves a real requirement.'],
    10: ['Use timeouts so calls finish and can be recorded by the breaker.', 'Count infrastructure and slow-call failures, not ordinary business rejections.', 'Combine breakers with bulkheads, rate limits, and bounded retries deliberately.', 'Fallbacks must preserve business correctness rather than hide failure.', 'Tune minimum samples, windows, half-open probes, granularity, and metrics to actual traffic.'],
    11: ['Configure each waiting phase, not only a generic request timeout.', 'Propagate an end-to-end deadline and keep inner timeouts within the remaining budget.', 'A timeout can leave a side-effecting operation in an unknown state.', 'Bound pool acquisition, database queries, locks, transactions, queues, proxies, and jobs.', 'Classify timeout phases in metrics so local saturation is not mistaken for network failure.'],
    12: ['Retry only classified transient failures.', 'The operation must be naturally idempotent or protected by a stable operation key.', 'Choose one retry owner and audit hidden retries in SDKs, proxies, meshes, and clients.', 'Cap retry volume and total elapsed time within the original deadline.', 'Measure first-attempt health separately from final success after retries.'],
    13: ['Exponential growth reduces probe frequency during longer outages.', 'Jitter is essential because deterministic schedules synchronize clients.', 'Cap delays and elapsed time, and respect Retry-After.', 'Do not sleep while holding scarce transactions, connections, or permits.', 'Use very different schedules for synchronous calls, background jobs, webhooks, and reconnects.'],
    14: ['One logical operation must reuse the same idempotency key across every retry.', 'Enforce uniqueness before the side effect and make concurrent duplicates observe one state machine.', 'Reject the same key with a different normalized request fingerprint.', 'Persist durable results long enough for the maximum duplicate-arrival window.', 'For external effects, propagate a stable reference and reconcile crash-window ambiguity.'],
    15: ['A queue decouples producer and consumer availability but converts overload into backlog.', 'Acknowledge only after durable processing and assume duplicate delivery.', 'Set and extend visibility timeouts from real processing distributions.', 'Scale from arrival rate and oldest-message age, not queue depth alone.', 'Use outbox/inbox, bounded retries, idempotency, and a DLQ for reliable workflows.'],
    16: ['Fan out across subscriber groups and compete within each group.', 'Events describe facts owned by the service that owns the state transition.', 'Choose notification versus event-carried state intentionally.', 'Ordering, retention, replay, partitioning, and schema governance are subscriber contracts.', 'Keep each subscriber independently idempotent and observable.'],
    17: ['EDA reduces runtime coupling but increases event-contract coupling.', 'Strong invariants remain inside the authoritative owning service.', 'Use local transactions plus outbox publication and idempotent inbox consumption.', 'Make workflows, causation, replay behavior, and consumer ownership visible.', 'Use synchronous APIs and events together based on when an immediate answer is required.'],
    18: ['@Transactional does not span remote services.', '2PC/XA trades availability, latency, and lock duration for coordinated atomicity.', 'Unknown and partial outcomes are normal across a network.', 'Modern services often compose local ACID, outbox, inbox, idempotency, retries, reconciliation, and compensation.', 'Choose eventual consistency only when the business invariant permits it.'],
    19: ['Persist saga state and timers durably.', 'Every forward and compensation command needs a stable idempotent operation ID.', 'Retry transient failure, compensate business-final failure, and reconcile unknown outcomes.', 'Order compensatable, pivot, retryable, and irreversible steps deliberately.', 'Expose stuck and compensation-pending workflows for operational repair.'],
    20: ['Classify transient and permanent failures before deciding whether to retry.', 'Preserve the original payload and enough metadata for forensic analysis.', 'Alert on DLQ arrival rate, depth, and oldest age.', 'Replay only with idempotent consumers, controlled rate, and downstream capacity protection.', 'Every dead letter needs an owned repair, replay, manual decision, or intentional discard.'],
    21: ['An embedded scheduler runs once per replica unless coordination exists.', 'Locks and leader election reduce duplicates; idempotency remains the final protection.', 'Define missed-run, overlap, catch-up, time-zone, and DST semantics explicitly.', 'Checkpoint large jobs and fan work out to queues rather than one giant transaction.', 'Persist execution state and alert on business deadlines, not only process errors.'],
    22: ['Model user, device, session, and connection separately.', 'Use heartbeats, bounded buffers, reconnect backoff, and graceful draining.', 'Each node owns local sockets; a broker or routing layer connects users across nodes.', 'WebSocket transport does not provide durability, replay, acknowledgements, or exactly-once effects.', 'Differentiate ephemeral updates from durable messages that must be stored and replayed.'],
    23: ['Use an asynchronous waiting model, not one blocked thread per client.', 'Register and recheck to close the lost-wakeup race.', 'Resume with a durable cursor and assume at-least-once delivery.', 'Treat normal empty timeouts differently from failures.', 'Use shared notification infrastructure so any server can wake its local waiters.'],
    24: ['SSE is one-way; commands remain ordinary HTTP requests.', 'Use durable event IDs and Last-Event-ID only when replay is actually supported.', 'Disable buffering/caching and heartbeat below the smallest infrastructure idle timeout.', 'Bound per-client queues and choose drop, coalesce, disconnect, or replay by event semantics.', 'Plan authentication refresh, authorization changes, reconnect storms, and horizontal fan-out.'],
    25: ['Design indexes from real predicates, ordering, projections, and pagination.', 'Composite-index order determines which prefixes and ranges are efficient.', 'Low-cardinality values can still be useful when skew or partial indexes make them selective.', 'Indexes enforce domain uniqueness as well as performance.', 'Validate choices with statistics and execution plans, and include write/maintenance cost.'],
    26: ['Read actual execution plans and compare estimates with actual rows.', 'Look for repeated loops, discarded rows, spills, and oversized intermediate results.', 'Choose join, sort, aggregation, projection, and pagination strategies from data shape.', 'Remove accidental N+1, unnecessary DISTINCT, SELECT *, and deep OFFSET work.', 'Change one thing at a time and measure again on representative data.'],
    27: ['Keep mappings lazy and define an explicit fetch plan per use case.', 'A small fixed number of bounded queries can be better than one Cartesian join.', 'Use fetch joins, batch/subselect fetching, entity graphs, or DTO projections deliberately.', 'Do not serialize JPA entities directly or rely on Open Session in View to hide access patterns.', 'Test query count and production-scale result sizes, especially with pagination.'],
    28: ['Size pools from concurrent connection-hold time and total cluster budget.', 'Pool exhaustion usually indicates slow work, long transactions, or leaks—not simply a small maximum.', 'Keep acquisition timeout within the request deadline and expose active, idle, pending, and hold-time metrics.', 'Never hold a connection across slow external work.', 'Reserve database capacity for jobs, migrations, administration, failover, and autoscaling.'],
    29: ['Route only reads whose staleness tolerance is explicit.', 'Protect read-your-writes and invariant checks on the primary or with a monotonic strategy.', 'Measure replay position, time lag, apply delay, and replica query pressure.', 'A replica outage must not silently redirect unlimited load to the primary.', 'Failover, promotion, DNS, connection pools, and data-loss objectives form one design.'],
    30: ['Choose a stable high-cardinality shard key aligned with dominant access and isolation needs.', 'Keep invariant-enforcing transactions inside one shard whenever possible.', 'Design routing, topology versioning, scatter-gather limits, and global-data strategy explicitly.', 'Plan for hot tenants and online resharding before the first shard fills.', 'Sharding solves one-node limits by accepting substantial operational and query complexity.'],
}

SPECIAL_SECTION_TITLES = {
    'key takeaways', 'key takeaway', 'production mental model', "today's design exercise",
    'the architectural connection', "today's key takeaway", 'a useful architecture principle',
    'practical exercise', 'practical case study', 'design exercise',
}

markdown = mistune.create_markdown(escape=True, hard_wrap=True, plugins=['table', 'strikethrough'])


def clean_artifacts(text: str) -> str:
    # Render entity artifacts as their human-readable name, and remove stale citation tokens.
    text = re.sub(
        r'entity\[\s*"[^"]+"\s*,\s*"([^"]+)"[^\]]*\]',
        lambda m: m.group(1),
        text,
    )
    text = re.sub(r'cite[^]+', '', text)
    text = re.sub(r'\n(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+[^\n]+\sat\s+[^\n]+\n?', '\n', text)
    text = re.sub(r'^6\s*$', '', text, flags=re.M)  # stray extraction marker in CH2
    return text


def strip_markdown_inline(value: str) -> str:
    html = markdown(value)
    soup = BeautifulSoup(html, 'html.parser')
    return ' '.join(soup.get_text(' ', strip=True).split())


def extract_core(lines: list[str], fallback: str) -> tuple[list[str], str]:
    pattern = re.compile(r'^>\s*\*\*Core\s+Principle:\*\*\s*(.*)$', re.I)
    for idx, line in enumerate(lines):
        match = pattern.match(line.strip())
        if match:
            core = strip_markdown_inline(match.group(1))
            return lines[:idx] + lines[idx + 1 :], core
    return lines, fallback


def is_fence(line: str) -> bool:
    return line.lstrip().startswith('```')


def split_plain_numbered(lines: list[str]) -> list[tuple[str, str]]:
    sections: list[tuple[str, list[str]]] = [('Overview', [])]
    expected = 1
    in_fence = False
    for line in lines:
        if is_fence(line):
            in_fence = not in_fence
        stripped = line.strip()
        match = re.match(r'^(\d+)\.\s+(.+)$', stripped) if not in_fence else None
        special = stripped.lower() in SPECIAL_SECTION_TITLES
        if match and int(match.group(1)) == expected:
            sections.append((f'{match.group(1)}. {match.group(2)}', []))
            expected += 1
        elif special and sections[-1][1]:
            sections.append((stripped, []))
        else:
            sections[-1][1].append(line)
    return [(title, '\n'.join(body).strip()) for title, body in sections if '\n'.join(body).strip()]


def is_main_heading(level: int, title: str) -> bool:
    normalized = re.sub(r'\s+', ' ', title.strip()).lower()
    if level <= 2 and re.match(r'^\d+\.\s+', title.strip()):
        return True
    if level <= 2 and (
        normalized in SPECIAL_SECTION_TITLES
        or normalized.startswith('production case study')
        or normalized.startswith('case study')
        or normalized.startswith('practical exercise')
        or normalized.startswith('practical case study')
    ):
        return True
    return False


def split_markdown_headings(lines: list[str]) -> list[tuple[str, str]]:
    sections: list[tuple[str, list[str]]] = [('Overview', [])]
    in_fence = False
    for line in lines:
        if is_fence(line):
            in_fence = not in_fence
            sections[-1][1].append(line)
            continue
        match = re.match(r'^(#{1,6})\s+(.+?)\s*$', line)
        if match and not in_fence and is_main_heading(len(match.group(1)), match.group(2)):
            sections.append((match.group(2).strip(), []))
        else:
            sections[-1][1].append(line)
    return [(title, '\n'.join(body).strip()) for title, body in sections if '\n'.join(body).strip()]




def convert_tab_tables(md: str) -> str:
    """Convert reader-exported tabular rows into standard Markdown tables."""
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    in_fence = False
    while i < len(lines):
        line = lines[i]
        if is_fence(line):
            in_fence = not in_fence
            out.append(line)
            i += 1
            continue
        if not in_fence and '\t' in line:
            rows: list[list[str]] = []
            j = i
            width = None
            while j < len(lines) and '\t' in lines[j]:
                cells = [cell.strip() for cell in lines[j].split('\t')]
                if width is None:
                    width = len(cells)
                if len(cells) != width:
                    break
                rows.append(cells)
                j += 1
            if len(rows) >= 2 and width and width >= 2:
                out.append('| ' + ' | '.join(rows[0]) + ' |')
                out.append('| ' + ' | '.join(['---'] * width) + ' |')
                out.extend('| ' + ' | '.join(row) + ' |' for row in rows[1:])
                i = j
                continue
        out.append(line)
        i += 1
    return '\n'.join(out)

def fence_known_early_code(md: str, day: int) -> str:
    """Restore code fences lost by the reader export for the three raw-text chapters."""
    patterns: list[tuple[str, str]] = []
    if day == 2:
        patterns = [
            (r'(?ms)^public Product getProduct\(long productId\) \{.*?^\}\n(?=\nThe sequence is:)', 'java'),
            (r'(?ms)^@Transactional\npublic void updateProduct\(Product product\) \{.*?^\}\n(?=\nThis is:)', 'java'),
            (r'(?ms)^long ttlSeconds =\n.*?^redis\.expire\(key, Duration\.ofSeconds\(ttlSeconds\)\);', 'java'),
            (r'(?ms)^Product cached = cache\.get\(key\);.*?^return waitAndRetry\(key\);', 'java'),
            (r'(?ms)^try \{\n\s*return redis\.get\(key\);\n\} catch \(Exception e\) \{\n\s*return database\.findById\(id\);\n\}', 'java'),
        ]
    elif day == 3:
        patterns = [
            (r'(?ms)^<dependency>.*?</dependency>', 'xml'),
            (r'(?ms)^server:\n\s+shutdown: graceful\n\nspring:\n\s+lifecycle:\n\s+timeout-per-shutdown-phase: 30s', 'yaml'),
        ]
    elif day == 4:
        patterns = [
            (r'(?ms)^server \{\n.*?^\}\n\nupstream spring_backend \{\n.*?^\}', 'nginx'),
            (r'(?m)^proxy_request_buffering off;$', 'nginx'),
            (r'(?m)^client_max_body_size 10m;$', 'nginx'),
            (r'(?ms)^proxy_http_version 1\.1;\nproxy_set_header Upgrade \$http_upgrade;\nproxy_set_header Connection "upgrade";', 'nginx'),
            (r'(?m)^proxy_pass http://localhost:8080;$', 'nginx'),
            (r'(?m)^proxy_read_timeout 60s;$', 'nginx'),
        ]

    for pattern, language in patterns:
        def wrap(match: re.Match[str]) -> str:
            block = match.group(0).strip('\n')
            if block.startswith('```'):
                return block
            return f'```{language}\n{block}\n```'
        md = re.sub(pattern, wrap, md)
    return md

def looks_codeish(block: str) -> tuple[bool, str]:
    lines = block.splitlines()
    if len(lines) < 2:
        return False, ''
    if re.match(r'^\s*(?:\d+\.|[-*+])\s+', lines[0]):
        return False, ''
    joined = '\n'.join(lines)
    if re.search(r'[│▼▲┌┐└┘├┤┬┴┼✓✗]|──|→|↓|↑|←', joined):
        return True, 'flow / sequence'
    if re.search(r'\b(public|private|protected|return|try|catch|finally|class|server|location|upstream)\b', joined) and re.search(r'[{};]', joined):
        return True, 'code'
    if sum('=' in line for line in lines) >= 2:
        return True, 'example'
    if any(re.match(r'^\s{2,}\S', line) for line in lines) and any(re.search(r'[-+*/=<>]|\bif\b|\belse\b', line) for line in lines):
        return True, 'example'
    return False, ''


def fence_codeish_blocks(md: str) -> str:
    # CH2-CH4 were extracted from prose where diagrams/code were not fenced.
    pieces = re.split(r'(\n\s*\n)', md)
    out: list[str] = []
    already = False
    for piece in pieces:
        fence_count = piece.count('```')
        if already:
            out.append(piece)
            if fence_count % 2 == 1:
                already = False
            continue
        if fence_count:
            out.append(piece)
            if fence_count % 2 == 1:
                already = True
            continue
        if not piece.strip() or re.fullmatch(r'\n\s*\n', piece):
            out.append(piece)
            continue
        codeish, label = looks_codeish(piece.strip('\n'))
        if codeish:
            out.append(f'```text\n{piece.strip()}\n```')
        else:
            out.append(piece)
    return ''.join(out)


def extract_mermaid(md: str) -> tuple[str, str | None]:
    match = re.search(r'```mermaid\s*\n(.*?)\n```', md, re.S | re.I)
    if not match:
        return md, None
    diagram = match.group(1).strip()
    return (md[: match.start()] + md[match.end() :]).strip(), diagram


def html_body(md: str, day: int) -> str:
    md = convert_tab_tables(md)
    if day <= 4:
        md = fence_known_early_code(md, day)
        md = fence_codeish_blocks(md)
    html = markdown(md)
    soup = BeautifulSoup(html, 'html.parser')

    for hr in soup.find_all('hr'):
        hr.decompose()

    # Section titles are H2 in the page renderer; demote nested markdown headings.
    for tag in list(soup.find_all(re.compile(r'^h[1-6]$'))):
        level = int(tag.name[1])
        tag.name = f'h{min(6, max(3, level + 2))}'

    for quote in list(soup.find_all('blockquote')):
        text = quote.get_text(' ', strip=True)
        replacement = soup.new_tag('div')
        replacement['class'] = ['callout', 'warn'] if text.lower().startswith('extraction note:') else ['callout']
        for child in list(quote.contents):
            replacement.append(child.extract())
        quote.replace_with(replacement)

    for pre in list(soup.find_all('pre')):
        code = pre.find('code')
        language = 'example'
        if code:
            for cls in code.get('class', []):
                if cls.startswith('language-'):
                    language = cls[len('language-'):] or 'example'
            code.attrs.pop('class', None)
        wrapper = soup.new_tag('div')
        wrapper['class'] = ['code-block']
        label = soup.new_tag('span')
        label['class'] = ['code-label']
        label.string = language
        pre.wrap(wrapper)
        wrapper.insert(0, label)

    for code in soup.find_all('code'):
        if code.find_parent('pre') is None:
            classes = list(code.get('class', []))
            if 'inline-code' not in classes:
                classes.append('inline-code')
            code['class'] = classes

    # Recover simple lists and endpoint groups lost by the raw reader export.
    if day <= 4:
        for p in list(soup.find_all('p')):
            if not p.find('br'):
                continue
            lines = [line.strip() for line in p.get_text('\n').splitlines() if line.strip()]
            if len(lines) < 3:
                continue
            if all(re.match(r'^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/', line) for line in lines):
                wrapper = soup.new_tag('div')
                wrapper['class'] = ['code-block']
                label = soup.new_tag('span')
                label['class'] = ['code-label']
                label.string = 'HTTP endpoints'
                pre = soup.new_tag('pre')
                code = soup.new_tag('code')
                code.string = '\n'.join(lines)
                pre.append(code)
                wrapper.append(label)
                wrapper.append(pre)
                p.replace_with(wrapper)
                continue
            if (len(lines) >= 3
                    and all(len(line) <= 110 for line in lines)
                    and not any(re.search(r'[│▼▲┌┐└┘├┤┬┴┼]|──|→|↓|↑|←', line) for line in lines)):
                ul = soup.new_tag('ul')
                for line in lines:
                    li = soup.new_tag('li')
                    li.string = line
                    ul.append(li)
                p.replace_with(ul)

    # Make compact, title-like standalone paragraphs into internal subheadings for early raw transcripts.
    if day <= 4:
        for p in list(soup.find_all('p')):
            text = p.get_text(' ', strip=True)
            words = text.split()
            if 1 < len(words) <= 7 and not re.search(r'[.!?:;]$', text) and all(w[:1].isupper() or w.lower() in {'vs', 'and', 'or', 'the', 'of'} for w in words):
                p.name = 'h3'

    return ''.join(str(node) for node in soup.contents).strip()


def build_chapter(day: int, raw: str) -> dict:
    title, slug, subtitle = META[day]
    raw = clean_artifacts(raw).strip()
    lines = raw.splitlines()
    if lines and re.match(r'^#\s+Day\s+\d+', lines[0]):
        lines = lines[1:]
    lines, core = extract_core(lines, CORES[day])

    pairs = split_plain_numbered(lines) if day <= 4 else split_markdown_headings(lines)
    sections = []
    for idx, (section_title, body_md) in enumerate(pairs):
        body_md, embedded_diagram = extract_mermaid(body_md)
        body_html = html_body(body_md, day)
        if not body_html:
            continue
        sections.append({
            'title': section_title,
            'diagram': embedded_diagram or (DIAGRAMS.get(day) if idx == 0 else None),
            'body': body_html,
        })

    return {
        'day': day,
        'title': title,
        'subtitle': subtitle,
        'tags': TAGS[day],
        'core': core,
        'sections': sections,
        'keyTakeaways': TAKEAWAYS.get(day, []),
    }


def original_index() -> str:
    return '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="A practical backend and system-design course, one production topic per day." />
  <title>SWE Field Guide</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css" />
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      themeVariables: {
        primaryColor: '#edf2ff',
        primaryTextColor: '#172033',
        primaryBorderColor: '#2f5bea',
        lineColor: '#70809a',
        secondaryColor: '#f4f7fb',
        tertiaryColor: '#ffffff',
        fontFamily: 'Inter, sans-serif'
      }
    });
  </script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="#/"><img src="favicon.svg" alt="" /> SWE Field Guide</a>
    <nav aria-label="Primary navigation">
      <a href="#/">Course</a>
      <a href="#/roadmap">Roadmap</a>
      <a href="#/about">How to use</a>
    </nav>
  </header>

  <main id="app" tabindex="-1"></main>

  <footer class="site-footer">
    <p>Practical backend/system-design lessons. Built from the day-by-day course notes.</p>
  </footer>

  <script src="data/roadmap.js"></script>
  <script src="data/lessons.js"></script>
  <script src="lessons/day-01-rate-limiting.js"></script>
  <script src="lessons/day-01-rate-limiting-part-2.js"></script>
  <script src="lessons/day-01-rate-limiting-part-3.js"></script>
  <script src="lessons/day-01-rate-limiting-part-4.js"></script>
  <script src="lessons/day-31-partitioning.js"></script>
  <script src="lessons/day-32-replication.js"></script>
  <script src="lessons/day-33-leader-election-part-1.js"></script>
  <script src="lessons/day-33-leader-election-part-2.js"></script>
  <script src="lessons/day-33-leader-election-part-3.js"></script>
  <script src="lessons/day-33-leader-election-part-4.js"></script>
  <script src="lessons/day-33-leader-election-part-5.js"></script>
  <script src="lessons/day-33-leader-election.js"></script>
  <script src="lessons/day-34-cap-theorem.js"></script>
  <script src="lessons/day-34-cap-theorem-part-2.js"></script>
  <script src="lessons/day-34-cap-theorem-part-3.js"></script>
  <script src="lessons/day-34-cap-theorem-part-4.js"></script>
  <script src="lessons/day-35-eventual-consistency.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-2.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-3.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-4.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-5.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-6.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-7.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-8.js"></script>
  <script src="lessons/day-35-eventual-consistency-part-9.js"></script>
  <script src="lessons/day-36-optimistic-locking.js"></script>
  <script src="lessons/day-36-optimistic-locking-part-2.js"></script>
  <script src="lessons/day-36-optimistic-locking-part-3.js"></script>
  <script src="lessons/day-36-optimistic-locking-part-4.js"></script>
  <script src="lessons/day-36-optimistic-locking-part-5.js"></script>
  <script src="app.js"></script>
</body>
</html>'''


def modified_index() -> str:
    original = original_index()
    marker = '  <script src="lessons/day-31-partitioning.js"></script>'
    scripts = '\n'.join(
        f'  <script src="lessons/{META[day][1]}.js"></script>'
        for day in range(2, 31)
    )
    return original.replace(marker, scripts + '\n' + marker)


def main() -> None:
    text = SOURCE.read_text(encoding='utf-8')
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'lessons').mkdir(parents=True)

    report = []
    for day in range(2, 31):
        match = re.search(rf'<!-- BEGIN CH{day}\.md -->(.*?)<!-- END CH{day}\.md -->', text, re.S)
        if not match:
            raise RuntimeError(f'Missing CH{day}')
        chapter = build_chapter(day, match.group(1))
        path = OUT / 'lessons' / f'{META[day][1]}.js'
        payload = json.dumps(chapter, ensure_ascii=False, indent=2)
        path.write_text(
            'window.FULL_LESSONS = window.FULL_LESSONS || {};\n'
            f'window.FULL_LESSONS[{json.dumps(META[day][1])}] = {payload};\n',
            encoding='utf-8',
        )
        report.append({
            'day': day,
            'title': META[day][0],
            'sourceCharacters': len(match.group(1)),
            'sections': len(chapter['sections']),
            'outputBytes': path.stat().st_size,
            'hasExtractionNote': 'Extraction note:' in match.group(1),
        })

    (OUT / 'index.html').write_text(modified_index(), encoding='utf-8')
    (OUT / 'ORIGINAL-index.html').write_text(original_index(), encoding='utf-8')
    (OUT / 'VALIDATION.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    (OUT / 'README-INTEGRATION.md').write_text(
        '''# SWE CH2–CH32 integration\n\nThis package adds full lesson files for Days 2–30 and updates `index.html` to load them.\n\nDays 31 and 32 were already present as full, individual lesson files in the repository and are intentionally left unchanged. The uploaded CH31/CH32 source aligns with those existing pages.\n\nScope exclusions are preserved: no Day 37 and no pessimistic-locking lesson.\n\n## Apply\n\nCopy `index.html` and the `lessons/` files into the root of `vgargatgit/swe`, or apply the companion `swe-ch2-ch32.patch` from the repository root.\n''',
        encoding='utf-8',
    )

if __name__ == '__main__':
    main()
