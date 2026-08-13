(function (global) {
  'use strict';

  const { figure, SVG_STYLES } = global.SWEDay1DiagramDesignCore;

  function distributedLimiter() {
    return figure({
      type: 'Architecture',
      pattern: 'Shared-state enforcement',
      title: 'All application instances converge on one atomic rate-limit decision',
      caption: 'Per-instance memory sees only partial traffic. Redis plus an atomic Lua check creates one coherent counter and one outcome across the fleet.',
      className: 'dd-distributed-limiter',
      svg: `<svg class="dd-svg dd-svg-distributed" viewBox="0 0 960 500" role="img" aria-labelledby="dd-rl-redis-title dd-rl-redis-desc" xmlns="http://www.w3.org/2000/svg">
        <title id="dd-rl-redis-title">Distributed Redis rate limiter architecture</title>
        <desc id="dd-rl-redis-desc">Three application instances send rate-limit checks to shared Redis state. An atomic Lua operation increments the counter and sets expiry before returning an allow or block decision.</desc>
        ${SVG_STYLES}
        <defs>
          <marker id="dd-rl-redis-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head"/></marker>
          <marker id="dd-rl-redis-arrow-good" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head-good"/></marker>
          <marker id="dd-rl-redis-arrow-danger" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head-danger"/></marker>
        </defs>
        <rect class="dd-paper" width="960" height="500" rx="8"/>

        <rect class="dd-zone" x="44" y="64" width="264" height="352" rx="8"/>
        <rect class="dd-zone-label-mask" x="64" y="56" width="122" height="20" rx="2"/>
        <text class="dd-zone-label" x="125" y="70" text-anchor="middle">APPLICATION FLEET</text>

        <g transform="translate(76 108)">
          <rect class="dd-node dd-node-soft" width="200" height="72" rx="8"/>
          <text class="dd-tag" x="18" y="24">APP 1</text>
          <text class="dd-node-title" x="18" y="50">Spring instance</text>
          <text class="dd-node-copy" x="18" y="66">handles partial traffic</text>
        </g>
        <g transform="translate(76 208)">
          <rect class="dd-node dd-node-soft" width="200" height="72" rx="8"/>
          <text class="dd-tag" x="18" y="24">APP 2</text>
          <text class="dd-node-title" x="18" y="50">Spring instance</text>
          <text class="dd-node-copy" x="18" y="66">handles partial traffic</text>
        </g>
        <g transform="translate(76 308)">
          <rect class="dd-node dd-node-soft" width="200" height="72" rx="8"/>
          <text class="dd-tag" x="18" y="24">APP 3</text>
          <text class="dd-node-title" x="18" y="50">Spring instance</text>
          <text class="dd-node-copy" x="18" y="66">handles partial traffic</text>
        </g>

        <path class="dd-connector" d="M276 144 H348 V244 H396" marker-end="url(#dd-rl-redis-arrow)"/>
        <path class="dd-connector" d="M276 244 H396" marker-end="url(#dd-rl-redis-arrow)"/>
        <path class="dd-connector" d="M276 344 H348 V244 H396" marker-end="url(#dd-rl-redis-arrow)"/>
        <rect class="dd-label-mask" x="304" y="216" width="82" height="16" rx="2"/>
        <text class="dd-arrow-label" x="345" y="228" text-anchor="middle">CHECK KEY</text>

        <g transform="translate(408 160)">
          <rect class="dd-node dd-node-focal" width="196" height="168" rx="8"/>
          <text class="dd-tag dd-tag-focal" x="18" y="26">SHARED STATE</text>
          <text class="dd-node-title dd-node-title-large" x="98" y="70" text-anchor="middle">Redis</text>
          <text class="dd-node-copy" x="98" y="96" text-anchor="middle">one counter per policy key</text>
          <path class="dd-redis-stack" d="M54 118 98 98 142 118 98 138Z M54 132 98 152 142 132 M54 146 98 166 142 146"/>
        </g>

        <path class="dd-connector" d="M604 244 H662" marker-end="url(#dd-rl-redis-arrow)"/>
        <rect class="dd-label-mask" x="614" y="217" width="42" height="16" rx="2"/>
        <text class="dd-arrow-label" x="635" y="229" text-anchor="middle">EVAL</text>

        <g transform="translate(672 176)">
          <rect class="dd-node dd-node-store" width="164" height="136" rx="8"/>
          <text class="dd-tag" x="18" y="26">ATOMIC LUA</text>
          <text class="dd-node-title" x="18" y="62">INCR counter</text>
          <text class="dd-node-copy" x="18" y="84">set EXPIRE on first write</text>
          <text class="dd-node-copy" x="18" y="104">compare with limit</text>
          <text class="dd-node-note" x="18" y="124">one indivisible operation</text>
        </g>

        <path class="dd-connector dd-connector-good" d="M836 220 H880 V150" marker-end="url(#dd-rl-redis-arrow-good)"/>
        <path class="dd-connector dd-connector-danger" d="M836 268 H880 V338" marker-end="url(#dd-rl-redis-arrow-danger)"/>

        <g transform="translate(814 82)">
          <rect class="dd-node dd-node-good" width="116" height="68" rx="8"/>
          <text class="dd-tag dd-tag-good" x="16" y="24">ALLOW</text>
          <text class="dd-node-copy" x="16" y="48">continue request</text>
        </g>
        <g transform="translate(814 338)">
          <rect class="dd-node dd-node-danger" width="116" height="68" rx="8"/>
          <text class="dd-tag dd-tag-danger" x="16" y="24">BLOCK</text>
          <text class="dd-node-copy" x="16" y="48">return HTTP 429</text>
        </g>

        <path class="dd-passive-path" d="M506 328 V414 H754"/>
        <rect class="dd-label-mask" x="536" y="387" width="190" height="18" rx="2"/>
        <text class="dd-arrow-label" x="631" y="400" text-anchor="middle">SHARED COUNTER · SHARED CLOCK</text>
      </svg>`
    });
  }


  global.SWEDay1DiagramDesign.distributedLimiter = distributedLimiter;
}(window));
