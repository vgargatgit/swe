(function (global) {
  'use strict';

  const { figure, SVG_STYLES } = global.SWEDay1DiagramDesignCore;

  function requestEvaluation() {
    return figure({
      type: 'Process',
      pattern: 'Stage framework with semantic slots',
      title: 'Resolve context before making one observable allow-or-reject decision',
      caption: 'The filter coordinates the flow; route, identity, policy, and distributed state remain separate concerns. Both outcomes emit metrics and structured logs.',
      className: 'dd-request-evaluation',
      svg: `<svg class="dd-svg dd-svg-request" viewBox="0 0 1040 500" role="img" aria-labelledby="dd-rl-request-title dd-rl-request-desc" xmlns="http://www.w3.org/2000/svg">
        <title id="dd-rl-request-title">Spring rate-limit request evaluation process</title>
        <desc id="dd-rl-request-desc">A request enters the rate-limit filter. The application identifies the route and caller, loads the matching policy, performs an atomic Redis check, and then either invokes the endpoint or returns HTTP 429. Both outcomes emit metrics and logs.</desc>
        ${SVG_STYLES}
        <defs>
          <marker id="dd-rl-request-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head"/></marker>
          <marker id="dd-rl-request-arrow-good" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head-good"/></marker>
          <marker id="dd-rl-request-arrow-danger" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head-danger"/></marker>
        </defs>
        <rect class="dd-paper" width="1040" height="500" rx="8"/>

        <path class="dd-connector" d="M174 176 H222" marker-end="url(#dd-rl-request-arrow)"/>
        <path class="dd-connector" d="M402 176 H450" marker-end="url(#dd-rl-request-arrow)"/>
        <path class="dd-connector" d="M630 176 H678" marker-end="url(#dd-rl-request-arrow)"/>
        <path class="dd-connector" d="M858 176 H886 V268 H820" marker-end="url(#dd-rl-request-arrow)"/>

        <g transform="translate(42 132)">
          <rect class="dd-node dd-node-input" width="132" height="88" rx="8"/>
          <text class="dd-tag" x="16" y="24">FILTER</text>
          <text class="dd-node-title dd-node-title-compact" x="16" y="52">RateLimitFilter</text>
          <text class="dd-node-copy" x="16" y="72">intercept once</text>
        </g>
        <g transform="translate(222 112)">
          <rect class="dd-node dd-node-soft" width="180" height="128" rx="8"/>
          <text class="dd-stage-number" x="160" y="28" text-anchor="end">01</text>
          <text class="dd-tag" x="16" y="24">CONTEXT</text>
          <text class="dd-node-title" x="16" y="56">Route + caller</text>
          <text class="dd-node-copy" x="16" y="80">method · path · user · tenant</text>
          <text class="dd-node-note" x="16" y="108">output: policy key</text>
        </g>
        <g transform="translate(450 112)">
          <rect class="dd-node dd-node-soft" width="180" height="128" rx="8"/>
          <text class="dd-stage-number" x="160" y="28" text-anchor="end">02</text>
          <text class="dd-tag" x="16" y="24">POLICY</text>
          <text class="dd-node-title" x="16" y="56">Load rule</text>
          <text class="dd-node-copy" x="16" y="80">limit · window · token cost</text>
          <text class="dd-node-note" x="16" y="108">output: allowance</text>
        </g>
        <g transform="translate(678 112)">
          <rect class="dd-node dd-node-focal" width="180" height="128" rx="8"/>
          <text class="dd-stage-number dd-stage-number-focal" x="160" y="28" text-anchor="end">03</text>
          <text class="dd-tag dd-tag-focal" x="16" y="24">REDIS</text>
          <text class="dd-node-title" x="16" y="56">Atomic check</text>
          <text class="dd-node-copy" x="16" y="80">Lua · shared counter · time</text>
          <text class="dd-node-note" x="16" y="108">output: decision</text>
        </g>

        <g transform="translate(604 260)">
          <path class="dd-decision" d="M108 0 216 52 108 104 0 52Z"/>
          <text class="dd-decision-title" x="108" y="48" text-anchor="middle">ALLOWED?</text>
          <text class="dd-decision-copy" x="108" y="70" text-anchor="middle">remaining · retry-after</text>
        </g>

        <path class="dd-connector dd-connector-good" d="M604 312 H374" marker-end="url(#dd-rl-request-arrow-good)"/>
        <rect class="dd-label-mask" x="476" y="284" width="42" height="16" rx="2"/>
        <text class="dd-arrow-label dd-arrow-label-good" x="497" y="296" text-anchor="middle">YES</text>
        <g transform="translate(154 264)">
          <rect class="dd-node dd-node-good" width="220" height="96" rx="8"/>
          <text class="dd-tag dd-tag-good" x="16" y="24">CONTINUE</text>
          <text class="dd-node-title" x="16" y="54">Invoke endpoint</text>
          <text class="dd-node-copy" x="16" y="76">attach RateLimit headers</text>
        </g>

        <path class="dd-connector dd-connector-danger" d="M712 364 V404 H844" marker-end="url(#dd-rl-request-arrow-danger)"/>
        <rect class="dd-label-mask" x="744" y="377" width="36" height="16" rx="2"/>
        <text class="dd-arrow-label dd-arrow-label-danger" x="762" y="389" text-anchor="middle">NO</text>
        <g transform="translate(844 356)">
          <rect class="dd-node dd-node-danger" width="166" height="96" rx="8"/>
          <text class="dd-tag dd-tag-danger" x="16" y="24">HTTP 429</text>
          <text class="dd-node-title" x="16" y="54">Reject request</text>
          <text class="dd-node-copy" x="16" y="76">safe Retry-After</text>
        </g>

        <path class="dd-passive-path" d="M264 360 V430 H654"/>
        <path class="dd-passive-path" d="M927 452 V470 H654 V430"/>
        <g transform="translate(526 396)">
          <rect class="dd-node dd-node-passive" width="128" height="72" rx="8"/>
          <text class="dd-tag" x="16" y="24">OBSERVE</text>
          <text class="dd-node-title" x="16" y="50">Metrics + logs</text>
          <text class="dd-node-copy" x="16" y="66">allowed or blocked</text>
        </g>
      </svg>`
    });
  }

  global.SWEDay1DiagramDesign.requestEvaluation = requestEvaluation;
}(window));
