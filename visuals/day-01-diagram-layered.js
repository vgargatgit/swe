(function (global) {
  'use strict';

  const { figure, SVG_STYLES } = global.SWEDay1DiagramDesignCore;

  function layeredEnforcement() {
    return figure({
      type: 'Layer stack',
      pattern: 'Governance / control catalog',
      title: 'Four enforcement surfaces protect progressively more expensive work',
      caption: 'Broad, cheap controls act early. Precise, identity-aware controls act close to the business operation. A request must satisfy every applicable layer.',
      className: 'dd-layered-enforcement',
      svg: `<svg class="dd-svg dd-svg-layered" viewBox="0 0 960 520" role="img" aria-labelledby="dd-rl-layers-title dd-rl-layers-desc" xmlns="http://www.w3.org/2000/svg">
        <title id="dd-rl-layers-title">Layered rate-limit enforcement</title>
        <desc id="dd-rl-layers-desc">A four-level stack showing WAF and CDN controls, gateway controls, application-aware limits, and database or job protections. Identity context increases as requests move toward more expensive resources.</desc>
        ${SVG_STYLES}
        <defs>
          <marker id="dd-rl-layers-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 8 4 0 8Z" class="dd-arrow-head"/>
          </marker>
        </defs>
        <rect class="dd-paper" x="0" y="0" width="960" height="520" rx="8"/>

        <text class="dd-axis-label" x="46" y="48">REQUEST ENTERS</text>
        <path class="dd-axis-line" d="M64 64 V452" marker-end="url(#dd-rl-layers-arrow)"/>
        <text class="dd-axis-label" x="46" y="486">EXPENSIVE WORK</text>

        <text class="dd-axis-label dd-axis-label-right" x="914" y="48" text-anchor="end">IDENTITY + BUSINESS CONTEXT</text>
        <path class="dd-axis-line dd-axis-line-right" d="M896 64 V452" marker-end="url(#dd-rl-layers-arrow)"/>

        <g class="dd-layer" transform="translate(104 72)">
          <rect class="dd-node dd-node-soft" width="752" height="76" rx="8"/>
          <rect class="dd-tag-bg" x="20" y="18" width="62" height="22" rx="3"/>
          <text class="dd-tag" x="51" y="33" text-anchor="middle">EDGE</text>
          <text class="dd-node-title" x="104" y="34">WAF / CDN</text>
          <text class="dd-node-copy" x="104" y="56">IP reputation · bot signals · geo and volumetric controls</text>
          <text class="dd-node-action" x="718" y="35" text-anchor="end">BLOCK OBVIOUS ABUSE</text>
          <text class="dd-node-note" x="718" y="57" text-anchor="end">cheap and broad</text>
        </g>

        <path class="dd-stack-connector" d="M480 148 V164" marker-end="url(#dd-rl-layers-arrow)"/>

        <g class="dd-layer" transform="translate(132 172)">
          <rect class="dd-node dd-node-soft" width="696" height="76" rx="8"/>
          <rect class="dd-tag-bg" x="20" y="18" width="86" height="22" rx="3"/>
          <text class="dd-tag" x="63" y="33" text-anchor="middle">GATEWAY</text>
          <text class="dd-node-title" x="128" y="34">NGINX / API Gateway</text>
          <text class="dd-node-copy" x="128" y="56">route · client IP · API key · coarse endpoint rules</text>
          <text class="dd-node-action" x="662" y="35" text-anchor="end">THROTTLE BURSTS</text>
          <text class="dd-node-note" x="662" y="57" text-anchor="end">service-aware</text>
        </g>

        <path class="dd-stack-connector" d="M480 248 V264" marker-end="url(#dd-rl-layers-arrow)"/>

        <g class="dd-layer dd-layer-focal" transform="translate(160 272)">
          <rect class="dd-node dd-node-focal" width="640" height="76" rx="8"/>
          <rect class="dd-tag-bg dd-tag-bg-focal" x="20" y="18" width="64" height="22" rx="3"/>
          <text class="dd-tag dd-tag-focal" x="52" y="33" text-anchor="middle">APP</text>
          <text class="dd-node-title" x="106" y="34">Spring service</text>
          <text class="dd-node-copy" x="106" y="56">user · tenant · plan · business operation · request cost</text>
          <text class="dd-node-action dd-node-action-focal" x="606" y="35" text-anchor="end">APPLY PRECISE POLICY</text>
          <text class="dd-node-note" x="606" y="57" text-anchor="end">context-aware</text>
        </g>

        <path class="dd-stack-connector" d="M480 348 V364" marker-end="url(#dd-rl-layers-arrow)"/>

        <g class="dd-layer" transform="translate(188 372)">
          <rect class="dd-node dd-node-store" width="584" height="76" rx="8"/>
          <rect class="dd-tag-bg" x="20" y="18" width="64" height="22" rx="3"/>
          <text class="dd-tag" x="52" y="33" text-anchor="middle">CORE</text>
          <text class="dd-node-title" x="106" y="34">Database / export / job</text>
          <text class="dd-node-copy" x="106" y="56">concurrency · queue depth · workload budget</text>
          <text class="dd-node-action" x="550" y="35" text-anchor="end">QUEUE · DEFER · REJECT</text>
          <text class="dd-node-note" x="550" y="57" text-anchor="end">protect scarce capacity</text>
        </g>
      </svg>`
    });
  }


  global.SWEDay1DiagramDesign.layeredEnforcement = layeredEnforcement;
}(window));
