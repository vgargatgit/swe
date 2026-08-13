(function (global) {
  'use strict';
  const { n, x, p, grid, c, t, sm, sq, fo, tp, tr, d, fc, mb, rm, bi, ls, pb } = global.SWEBespokeDSL;
  const data = global.SWEBespokeBlueprintData = global.SWEBespokeBlueprintData || [];

  data.push(
    {
      day: 4,
      slug: 'day-04-reverse-proxies',
      sections: [
        x('forward proxy|reverse proxy', 1, tr(
          'Forward and reverse proxies represent opposite sides of a connection',
          n('Forward proxy', 'Acts for clients; destinations see the proxy.', 'user', 'blue'),
          n('Reverse proxy', 'Acts for servers; clients see one public backend identity.', 'server', 'violet'),
          'Who is being represented?'
        )),
        x('two connections|independent connections', 4, sq(
          'A reverse proxy terminates one connection and creates another',
          ['Client', 'NGINX / Envoy', 'Spring'],
          [
            ['Client', 'NGINX / Envoy', 'HTTPS request on connection 1'],
            ['NGINX / Envoy', 'Spring', 'independent upstream request on connection 2'],
            ['Spring', 'NGINX / Envoy', 'application response'],
            ['NGINX / Envoy', 'Client', 'buffer, transform, or stream response']
          ],
          'HTTP version, TLS, pooling, buffering, and timeouts may differ on the two legs.'
        )),
        x('forwarded|client ip|header trust|trust boundary', 8, ls(
          'Forwarded identity becomes trustworthy only inside an explicit boundary',
          [
            n('Client-supplied headers', 'Untrusted and overwriteable by the caller.', 'alert', 'danger'),
            n('Trusted edge', 'Sanitize or replace forwarding information.', 'shield', 'blue'),
            n('Internal proxy chain', 'Append only from known infrastructure hops.', 'route', 'violet'),
            n('Application resolver', 'Walk the trusted chain and select the first untrusted address.', 'fingerprint', 'green')
          ]
        )),
        x('buffer|streaming', 6, tr(
          'Buffering protects upstreams but changes latency and streaming behavior',
          n('Buffered', 'Absorb slow clients, inspect size, and reuse upstream connections.', 'layers', 'blue'),
          n('Streaming', 'Deliver early bytes and preserve SSE or large-response flow.', 'pulse', 'green'),
          'Protection versus immediacy'
        )),
        x('timeout', 7, ls(
          'Every proxy hop consumes the same end-to-end deadline',
          [
            n('Client deadline', 'Total time the caller will tolerate.', 'clock', 'danger'),
            n('Edge / load balancer idle timeout', 'Must allow useful proxy work to finish.', 'shield', 'amber'),
            n('Proxy connect and read timeouts', 'Bound upstream acquisition and response waits.', 'gate', 'violet'),
            n('Application and downstream timeouts', 'Expire early enough to return a controlled response.', 'server', 'green')
          ]
        ))
      ]
    },
    {
      day: 5,
      slug: 'day-05-api-gateways',
      sections: [
        x('gateway.*reverse proxy|reverse proxy.*gateway|what is an api gateway', 1, tr(
          'A gateway centralizes API policy without owning every business rule',
          n('Gateway responsibility', 'Authentication, quotas, validation, versions, and routing.', 'gate', 'violet'),
          n('Service responsibility', 'Domain invariants, authorization context, and durable side effects.', 'brain', 'green'),
          'Cross-cutting policy versus domain ownership'
        )),
        x('authentication|authorization|identity', 2, sq(
          'Verify once, then propagate a constrained identity context',
          ['Client', 'Gateway', 'Identity provider', 'Service'],
          [
            ['Client', 'Gateway', 'request with token or API key'],
            ['Gateway', 'Identity provider', 'validate signature, issuer, audience, and status'],
            ['Identity provider', 'Gateway', 'trusted claims and scopes'],
            ['Gateway', 'Service', 'forward normalized identity plus request context'],
            ['Service', 'Service', 'enforce domain authorization']
          ]
        )),
        x('routing|path|host|version', 3, rm(
          'Route by stable API contract rather than internal hostnames',
          [
            { from: '/users/*', fromNote: 'public user API', to: 'User Service', toNote: 'profile ownership', tone: 'blue' },
            { from: '/orders/*', fromNote: 'order workflow', to: 'Order Service', toNote: 'business state machine', tone: 'violet' },
            { from: '/payments/*', fromNote: 'high-risk writes', to: 'Payment Service', toNote: 'strict policy and idempotency', tone: 'danger' },
            { from: '/v2/*', fromNote: 'new contract', to: 'Versioned backend', toNote: 'controlled migration', tone: 'green' }
          ]
        )),
        x('aggregation|fan.out|backend for frontend|bff', 5, fo(
          'Aggregation can reduce client chatter while preserving service isolation',
          n('Mobile client', 'needs one screen-shaped response', 'user', 'blue'),
          n('Gateway / BFF', 'parallelize bounded read calls and compose response', 'gate', 'violet'),
          [
            n('Profile', 'user details', 'user', 'cyan'),
            n('Orders', 'recent activity', 'queue', 'amber'),
            n('Recommendations', 'personalized suggestions', 'brain', 'green')
          ],
          'Aggregation must have timeouts, partial-failure policy, and a bounded fan-out budget.'
        )),
        x('failure|bottleneck|single point|availability', 8, tp(
          'A gateway is a shared failure boundary and must be operated as a distributed service',
          n('Gateway fleet', 'stateless policy layer across zones', 'gate', 'violet'),
          [
            n('Edge / DNS', 'route around failed gateway nodes', 'shield', 'blue'),
            n('Policy store', 'highly available configuration and keys', 'database', 'amber'),
            n('Backend services', 'independent health and bulkheads', 'server', 'green'),
            n('Observability', 'per-route latency, rejection, and dependency evidence', 'chart', 'cyan')
          ]
        ))
      ]
    },
    {
      day: 6,
      slug: 'day-06-cicd',
      sections: [
        x('build once|immutable artifact|artifact promotion', 1, p(
          'Build once and promote the same immutable artifact',
          [
            n('Commit', 'source plus dependency lock state', 'api', 'blue'),
            n('Build and verify', 'compile, test, scan, and sign', 'check', 'cyan'),
            n('Immutable artifact', 'content-addressed image or package', 'layers', 'violet'),
            n('Staging', 'production-like configuration', 'server', 'amber'),
            n('Production', 'promote the identical artifact', 'shield', 'green')
          ]
        )),
        x('pipeline|quality gate|verification', 2, sm(
          'A delivery pipeline advances only when evidence satisfies the next gate',
          [
            n('PROPOSED', 'pull request and review', 'api', 'blue'),
            n('VERIFIED', 'tests and security policy pass', 'check', 'green'),
            n('DEPLOYABLE', 'artifact and configuration are identified', 'layers', 'violet'),
            n('OBSERVED', 'production health proves the change', 'chart', 'amber')
          ],
          [
            ['PROPOSED', 'VERIFIED', 'CI evidence'],
            ['VERIFIED', 'DEPLOYABLE', 'promotion approval'],
            ['DEPLOYABLE', 'OBSERVED', 'controlled rollout'],
            ['OBSERVED', 'DEPLOYABLE', 'rollback or redeploy']
          ]
        )),
        x('rolling|canary|blue.green|deployment strateg', 5, grid(
          'Deployment strategies trade speed, capacity, and blast radius',
          [
            n('Rolling', 'Replace instances gradually; requires compatibility during overlap.', 'retry', 'blue'),
            n('Canary', 'Expose a small traffic slice and expand only with healthy evidence.', 'chart', 'green'),
            n('Blue-green', 'Run old and new environments, then switch traffic atomically.', 'layers', 'violet'),
            n('Feature flag', 'Decouple code deployment from user-visible activation.', 'filter', 'amber')
          ]
        )),
        x('database migration|schema|expand.*contract', 7, sq(
          'Safe schema change is a multi-release compatibility sequence',
          ['Release N', 'Database', 'Release N+1'],
          [
            ['Release N', 'Database', 'expand schema without breaking old code'],
            ['Release N+1', 'Database', 'write both old and new representations if needed'],
            ['Release N+1', 'Database', 'backfill and verify data'],
            ['Release N+1', 'Database', 'switch reads to new representation'],
            ['Release N+1', 'Database', 'contract old schema only after compatibility window']
          ]
        )),
        x('rollback|recovery', 9, d(
          'Rollback is a decision about code, configuration, and data compatibility',
          n('Can the old version safely read current state?', 'A binary rollback is safe only when contracts still overlap.', 'retry', 'violet'),
          [
            n('Yes', 'Route traffic back and continue observing.', 'check', 'green'),
            n('No', 'Roll forward with a corrective change.', 'route', 'amber'),
            n('State is ambiguous', 'Freeze risky writes and reconcile before resuming.', 'alert', 'danger')
          ]
        ))
      ]
    },
    {
      day: 7,
      slug: 'day-07-docker',
      sections: [
        x('image.*container|container.*image', 1, c(
          'An image is a template; a container is a running process instance',
          [
            n('Image', 'Immutable filesystem layers and runtime metadata.', 'layers', 'violet'),
            n('Container', 'Writable runtime layer, namespaces, limits, and process lifecycle.', 'server', 'green')
          ]
        )),
        x('layer|build cache|dockerfile order', 3, p(
          'Layer ordering decides rebuild cost and image reuse',
          [
            n('Base image', 'Pin a trusted digest.', 'shield', 'blue'),
            n('Dependency metadata', 'Copy lock files before application source.', 'api', 'cyan'),
            n('Install dependencies', 'Reuse this expensive layer when locks are unchanged.', 'layers', 'violet'),
            n('Application source', 'Frequently changing content belongs later.', 'server', 'amber'),
            n('Runtime metadata', 'Entrypoint, user, health, and ports.', 'check', 'green')
          ]
        )),
        x('pid 1|signal|graceful shutdown|entrypoint', 6, sq(
          'Container shutdown succeeds only when signals reach the real application process',
          ['Orchestrator', 'PID 1', 'Application'],
          [
            ['Orchestrator', 'PID 1', 'send SIGTERM'],
            ['PID 1', 'Application', 'forward or directly receive signal'],
            ['Application', 'Application', 'stop accepting work and drain'],
            ['Application', 'Orchestrator', 'exit before grace period expires'],
            ['Orchestrator', 'PID 1', 'SIGKILL only after timeout']
          ]
        )),
        x('namespace|cgroup|resource limit|isolation', 7, grid(
          'Container isolation is a set of kernel mechanisms, not a virtual machine',
          [
            n('Namespaces', 'Separate process, network, mount, user, and hostname views.', 'layers', 'blue'),
            n('cgroups', 'Bound CPU, memory, I/O, and process count.', 'scale', 'amber'),
            n('Capabilities', 'Remove unnecessary privileged kernel operations.', 'shield', 'danger'),
            n('Seccomp / LSM', 'Constrain system calls and mandatory access policy.', 'lock', 'violet')
          ]
        )),
        x('security|non.root|vulnerability|secret', 9, pb(
          'A production container should minimize both content and privilege',
          [
            { title: 'Identity', icon: 'fingerprint', tone: 'blue', rows: [{ label: 'Run as', value: 'non-root user' }] },
            { title: 'Filesystem', icon: 'layers', tone: 'violet', rows: [{ label: 'Prefer', value: 'read-only root where possible' }] },
            { title: 'Supply chain', icon: 'shield', tone: 'green', rows: [{ label: 'Require', value: 'pinned, scanned, signed inputs' }] },
            { title: 'Secrets', icon: 'key', tone: 'danger', rows: [{ label: 'Never bake', value: 'credentials into image layers' }] }
          ]
        ))
      ]
    },
    {
      day: 8,
      slug: 'day-08-kubernetes',
      sections: [
        x('desired state|reconciliation|control loop', 1, sm(
          'Kubernetes continuously reconciles desired and observed state',
          [
            n('DECLARED', 'manifest records desired state', 'api', 'blue'),
            n('OBSERVED', 'controllers watch current cluster state', 'chart', 'amber'),
            n('DIFF DETECTED', 'desired and observed state disagree', 'alert', 'danger'),
            n('RECONCILED', 'controller creates, updates, or deletes resources', 'retry', 'green')
          ],
          [
            ['DECLARED', 'OBSERVED', 'persist through API server'],
            ['OBSERVED', 'DIFF DETECTED', 'watch reports change'],
            ['DIFF DETECTED', 'RECONCILED', 'controller action'],
            ['RECONCILED', 'OBSERVED', 'measure again']
          ]
        )),
        x('deployment|statefulset|daemonset|job|workload', 3, grid(
          'Choose the controller that matches the workload lifecycle',
          [
            n('Deployment', 'Replaceable stateless replicas and rolling updates.', 'server', 'blue'),
            n('StatefulSet', 'Stable identity, ordering, and persistent volume association.', 'database', 'violet'),
            n('DaemonSet', 'One pod per eligible node for node-scoped agents.', 'layers', 'amber'),
            n('Job / CronJob', 'Finite or scheduled work with completion semantics.', 'clock', 'green')
          ]
        )),
        x('service|ingress|traffic|network', 5, ls(
          'Traffic crosses several stable abstractions before reaching a pod',
          [
            n('External load balancer', 'Internet-to-cluster entry point.', 'shield', 'blue'),
            n('Ingress / Gateway', 'Host, path, TLS, and policy routing.', 'gate', 'violet'),
            n('Kubernetes Service', 'Stable virtual identity over changing endpoints.', 'route', 'cyan'),
            n('Ready pod', 'Receives traffic only while readiness permits.', 'server', 'green')
          ]
        )),
        x('liveness|readiness|startup probe|probe', 7, grid(
          'Probes answer different operational questions',
          [
            n('Startup', 'Has the application completed initialization?', 'clock', 'blue'),
            n('Liveness', 'Should this container be restarted?', 'pulse', 'danger'),
            n('Readiness', 'Should new traffic be routed here?', 'route', 'green'),
            n('Dependency signal', 'Is a downstream degraded without necessarily restarting?', 'alert', 'amber')
          ]
        )),
        x('rollout|rolling update|termination|drain', 9, p(
          'A safe rollout coordinates readiness, traffic removal, and termination',
          [
            n('Create new pod', 'start with no traffic', 'server', 'blue'),
            n('Pass startup and readiness', 'prove ability to serve', 'check', 'green'),
            n('Add endpoint', 'begin controlled traffic', 'route', 'cyan'),
            n('Mark old pod unready', 'stop new requests', 'x', 'amber'),
            n('Drain and terminate', 'complete in-flight work before exit', 'clock', 'violet')
          ]
        ))
      ]
    },
    {
      day: 9,
      slug: 'day-09-service-discovery',
      sections: [
        x('client.side|server.side', 2, tr(
          'Discovery can happen in the caller or in a routing layer',
          n('Client-side discovery', 'Caller resolves instances and chooses a target.', 'api', 'blue'),
          n('Server-side discovery', 'Caller uses a stable endpoint; proxy chooses the target.', 'gate', 'violet'),
          'Who owns endpoint selection?'
        )),
        x('registration|deregister|heartbeat', 3, sq(
          'Instance registration is a lifecycle, not a one-time DNS write',
          ['Instance', 'Registry', 'Caller'],
          [
            ['Instance', 'Registry', 'register identity and metadata'],
            ['Instance', 'Registry', 'renew lease or heartbeat'],
            ['Caller', 'Registry', 'resolve current healthy endpoints'],
            ['Instance', 'Registry', 'deregister during graceful shutdown'],
            ['Registry', 'Caller', 'expire stale instance after lease timeout']
          ]
        )),
        x('dns|ttl|cache', 5, t(
          'Discovery freshness is bounded by every cache in the resolution path',
          [
            n('Topology changes', 'instance is added or removed', 'server', 'blue'),
            n('Registry updates', 'authoritative mapping changes', 'database', 'violet'),
            n('DNS TTL remains', 'recursive and client caches may still hold old data', 'clock', 'amber'),
            n('Callers refresh', 'new endpoint set becomes visible', 'retry', 'green')
          ]
        )),
        x('stale|failure|unhealthy endpoint', 7, fc(
          'Stale discovery information can turn one failure into repeated wasted calls',
          [
            n('Instance fails', 'endpoint remains in a cache', 'alert', 'danger'),
            n('Caller selects stale address', 'connection or request waits', 'route', 'amber'),
            n('Retry repeats stale choice', 'latency and load multiply', 'retry', 'violet'),
            n('Pools and threads saturate', 'caller becomes unhealthy too', 'queue', 'danger')
          ]
        )),
        x('kubernetes service|service discovery in kubernetes|endpoints', 9, tp(
          'A Kubernetes Service separates stable identity from changing pods',
          n('Service DNS + virtual IP', 'stable name and routing abstraction', 'route', 'violet'),
          [
            n('Pod A', 'ready endpoint', 'server', 'green'),
            n('Pod B', 'ready endpoint', 'server', 'green'),
            n('Pod C', 'removed while unready', 'x', 'danger'),
            n('EndpointSlice controller', 'publishes current endpoint set', 'layers', 'blue')
          ]
        ))
      ]
    },
    {
      day: 10,
      slug: 'day-10-circuit-breakers',
      sections: [
        x('failure it prevents|cascading failure', 1, fc(
          'A slow dependency consumes the caller until both services fail',
          [
            n('Dependency latency rises', 'calls wait for 30-second timeouts', 'clock', 'amber'),
            n('Caller threads block', 'worker capacity disappears', 'queue', 'danger'),
            n('Connection pools exhaust', 'new work cannot progress', 'database', 'danger'),
            n('Upstream clients retry', 'load grows while capacity shrinks', 'retry', 'violet'),
            n('Caller becomes unavailable', 'failure crosses the service boundary', 'alert', 'danger')
          ]
        )),
        x('configuration|sliding window|failure threshold|minimum calls', 3, mb(
          'Breaker behavior is defined by a measurement contract',
          [
            { label: 'Window', value: '20 calls', note: 'recent outcome sample', icon: 'chart', tone: 'blue' },
            { label: 'Minimum sample', value: '10 calls', note: 'avoid tiny-sample decisions', icon: 'scale', tone: 'violet' },
            { label: 'Failure threshold', value: '50%', note: 'open when exceeded', icon: 'alert', tone: 'danger' },
            { label: 'Open duration', value: '30 s', note: 'recovery pause', icon: 'clock', tone: 'amber' },
            { label: 'Half-open trials', value: '5 calls', note: 'bounded recovery test', icon: 'pulse', tone: 'green' }
          ]
        )),
        x('slow call|gray failure|latency threshold', 4, d(
          'A dependency can be functionally successful and operationally unusable',
          n('Did the call exceed the useful latency threshold?', 'Slow-call rate may open the breaker even when responses are 200 OK.', 'clock', 'violet'),
          [
            n('Fast success', 'Record success and continue normal traffic.', 'check', 'green'),
            n('Slow success', 'Record a slow call and protect latency budget.', 'pulse', 'amber'),
            n('Failure', 'Record failure and contribute to opening threshold.', 'x', 'danger')
          ]
        )),
        x('fallback', 6, tr(
          'A fallback is safe only when it preserves an explicit business contract',
          n('Useful degraded response', 'Cached catalog, queued work, or read-only mode.', 'shield', 'green'),
          n('Misleading success', 'Invented balance, hidden payment failure, or stale authorization.', 'alert', 'danger'),
          'Availability versus correctness'
        )),
        x('bulkhead|isolation', 8, tp(
          'Bulkheads stop one dependency from consuming every caller resource',
          n('Order Service', 'shared application process', 'server', 'violet'),
          [
            n('Payment pool', 'bounded threads and connections', 'coins', 'danger'),
            n('Inventory pool', 'independent capacity boundary', 'layers', 'blue'),
            n('Notification pool', 'best-effort asynchronous work', 'queue', 'green'),
            n('Circuit breakers', 'separate health memory per dependency', 'shield', 'amber')
          ]
        ))
      ]
    },
    {
      day: 11,
      slug: 'day-11-timeouts',
      sections: [
        x('deadline|budget', 1, ls(
          'Nested waits must fit inside one caller-visible deadline',
          [
            n('Caller deadline', 'Total useful response budget.', 'clock', 'danger'),
            n('Gateway / proxy timeout', 'Expires before the caller abandons the request.', 'gate', 'amber'),
            n('Service deadline', 'Reserves time for error mapping and cleanup.', 'server', 'violet'),
            n('Database / downstream timeout', 'Stops the deepest operation first.', 'database', 'green')
          ]
        )),
        x('connect timeout|read timeout|pool acquisition|types of timeout', 3, grid(
          'Different timeout phases protect different scarce resources',
          [
            n('Pool acquisition', 'Wait for a reusable client or DB connection.', 'queue', 'amber'),
            n('Connect', 'Establish TCP or TLS to the remote endpoint.', 'route', 'blue'),
            n('Write', 'Send request bytes without blocking indefinitely.', 'api', 'violet'),
            n('Read / response', 'Receive a result within useful latency.', 'clock', 'danger')
          ]
        )),
        x('cancellation|timed out work|orphan', 5, tr(
          'A timeout ends waiting; cancellation ends the underlying work',
          n('Timeout only', 'Caller stops waiting while remote work may continue consuming capacity.', 'clock', 'amber'),
          n('Timeout + cancellation', 'Propagate deadline and stop work where protocols allow.', 'x', 'green'),
          'Release resources after the deadline'
        )),
        x('retry|multiple attempts', 7, mb(
          'Retries spend the same end-to-end deadline',
          [
            { label: 'Caller budget', value: '2,000 ms', note: 'total wall-clock allowance', icon: 'clock', tone: 'blue' },
            { label: 'Attempt 1', value: '700 ms', note: 'including connect and read', icon: 'route', tone: 'violet' },
            { label: 'Backoff', value: '200 ms', note: 'jittered delay', icon: 'retry', tone: 'amber' },
            { label: 'Attempt 2', value: '700 ms', note: 'last useful attempt', icon: 'pulse', tone: 'green' },
            { label: 'Cleanup reserve', value: '400 ms', note: 'map error and release resources', icon: 'shield', tone: 'danger' }
          ]
        )),
        x('no timeout|failure|resource exhaustion', 9, fc(
          'An unbounded wait converts a remote slowdown into local resource exhaustion',
          [
            n('Remote call stalls', 'no deadline releases the wait', 'clock', 'amber'),
            n('Workers accumulate', 'threads and event-loop tasks remain occupied', 'users', 'danger'),
            n('Pools saturate', 'connections and memory become unavailable', 'queue', 'danger'),
            n('Queues grow', 'latency spreads to healthy operations', 'chart', 'violet'),
            n('Service outage', 'local service fails without crashing', 'alert', 'danger')
          ]
        ))
      ]
    },
    {
      day: 12,
      slug: 'day-12-retries',
      sections: [
        x('what should be retried|classif|transient|permanent', 1, d(
          'Classify the failure before creating more load',
          n('What kind of failure occurred?', 'The same exception category should not be retried blindly across operations.', 'filter', 'violet'),
          [
            n('Permanent', 'Validation, authorization, and deterministic business rejection: stop.', 'x', 'danger'),
            n('Transient + safe', 'Retry within budget using backoff and jitter.', 'retry', 'green'),
            n('Transient + unsafe', 'Require idempotency, status lookup, or reconciliation.', 'lock', 'amber')
          ]
        )),
        x('retry storm|amplification|cascading', 3, fc(
          'Retries multiply traffic precisely when the dependency has least capacity',
          [
            n('Dependency slows', 'original calls begin timing out', 'clock', 'amber'),
            n('Clients retry', 'one logical request becomes several attempts', 'retry', 'violet'),
            n('Queue depth rises', 'new and retry traffic compete', 'queue', 'danger'),
            n('Latency increases again', 'more callers cross timeout thresholds', 'chart', 'danger'),
            n('Fleet-wide retry storm', 'recovery becomes impossible without shedding load', 'alert', 'danger')
          ]
        )),
        x('retry budget|maximum attempts|deadline', 5, t(
          'A retry policy is bounded by attempts and elapsed time',
          [
            n('Attempt 1', 'use the normal fast path', 'api', 'blue'),
            n('Backoff + jitter', 'wait before consuming more capacity', 'clock', 'violet'),
            n('Attempt 2', 'only while deadline remains', 'retry', 'amber'),
            n('Final decision', 'return error, queue, or reconcile instead of retrying forever', 'shield', 'green')
          ]
        )),
        x('idempotent|safe.*unsafe|post|get', 7, tr(
          'Operation semantics decide whether an automatic retry is safe',
          n('Read or idempotent write', 'Repeated execution produces the same logical outcome.', 'check', 'green'),
          n('Non-idempotent side effect', 'Payment, message, or mutation may execute twice after an ambiguous timeout.', 'coins', 'danger'),
          'Replay safety'
        )),
        x('layers|where to retry|client.*gateway.*service', 9, ls(
          'Only one layer should usually own retries for a call path',
          [
            n('Client', 'User-visible retry and reconnect policy.', 'user', 'blue'),
            n('Gateway / proxy', 'Restrict retries to clearly safe transport cases.', 'gate', 'amber'),
            n('Service client', 'Classify domain-specific dependency failures.', 'server', 'violet'),
            n('Queue consumer', 'Use delivery attempts and DLQ policy, not synchronous retry loops.', 'queue', 'green')
          ]
        ))
      ]
    }
  );
}(window));
