(function (global) {
  'use strict';

  const { figure, SVG_STYLES } = global.SWEDay1DiagramDesignCore;

  function trustedProxyRoad() {
    return figure({
      type: 'Architecture',
      pattern: 'Secure paved road',
      title: 'Only the trusted proxy path may establish the client identity',
      caption: 'Walk the forwarded chain from right to left. Skip addresses in trusted proxy ranges; the first untrusted address is the client identity. A caller-supplied header never bypasses that trust boundary.',
      className: 'dd-trusted-proxy',
      svg: `<svg class="dd-svg dd-svg-trust" viewBox="0 0 1040 600" role="img" aria-labelledby="dd-rl-trust-title dd-rl-trust-desc" xmlns="http://www.w3.org/2000/svg">
        <title id="dd-rl-trust-title">Trusted proxy path and client IP resolution</title>
        <desc id="dd-rl-trust-desc">A supported route runs from the client through CloudFront, an application load balancer, and NGINX to Tomcat. A spoofed direct forwarded header is blocked at the application boundary. Tomcat walks the forwarded-for chain from right to left and chooses the first address outside trusted proxy ranges.</desc>
        ${SVG_STYLES}
        <defs>
          <marker id="dd-rl-trust-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head"/></marker>
          <marker id="dd-rl-trust-arrow-link" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" class="dd-arrow-head-link"/></marker>
        </defs>
        <rect class="dd-paper" width="1040" height="600" rx="8"/>

        <rect class="dd-zone dd-zone-untrusted" x="28" y="70" width="176" height="234" rx="8"/>
        <rect class="dd-zone-label-mask" x="48" y="62" width="118" height="20" rx="2"/>
        <text class="dd-zone-label" x="107" y="76" text-anchor="middle">UNTRUSTED INTERNET</text>

        <rect class="dd-zone dd-zone-trusted" x="228" y="70" width="552" height="234" rx="8"/>
        <rect class="dd-zone-label-mask" x="252" y="62" width="150" height="20" rx="2"/>
        <text class="dd-zone-label" x="327" y="76" text-anchor="middle">TRUSTED INFRASTRUCTURE</text>

        <rect class="dd-zone dd-zone-app" x="804" y="70" width="208" height="234" rx="8"/>
        <rect class="dd-zone-label-mask" x="828" y="62" width="112" height="20" rx="2"/>
        <text class="dd-zone-label" x="884" y="76" text-anchor="middle">APPLICATION</text>

        <path class="dd-connector dd-connector-link" d="M164 184 H274" marker-end="url(#dd-rl-trust-arrow-link)"/>
        <path class="dd-connector dd-connector-link" d="M394 184 H452" marker-end="url(#dd-rl-trust-arrow-link)"/>
        <path class="dd-connector dd-connector-link" d="M572 184 H630" marker-end="url(#dd-rl-trust-arrow-link)"/>
        <path class="dd-connector dd-connector-link" d="M750 184 H842" marker-end="url(#dd-rl-trust-arrow-link)"/>

        <rect class="dd-label-mask" x="170" y="151" width="92" height="18" rx="2"/>
        <text class="dd-arrow-label dd-arrow-label-link" x="216" y="164" text-anchor="middle">HTTPS</text>
        <rect class="dd-label-mask" x="760" y="151" width="72" height="18" rx="2"/>
        <text class="dd-arrow-label dd-arrow-label-link" x="796" y="164" text-anchor="middle">SANITIZED</text>

        <g transform="translate(64 140)">
          <rect class="dd-node dd-node-input" width="100" height="88" rx="8"/>
          <text class="dd-tag" x="16" y="24">CLIENT</text>
          <text class="dd-node-title" x="16" y="52">Browser</text>
          <text class="dd-node-copy" x="16" y="72">203.0.113.42</text>
        </g>
        <g transform="translate(274 140)">
          <rect class="dd-node dd-node-soft" width="120" height="88" rx="8"/>
          <text class="dd-tag" x="16" y="24">EDGE</text>
          <text class="dd-node-title" x="16" y="52">CloudFront</text>
          <text class="dd-node-copy" x="16" y="72">trusted hop</text>
        </g>
        <g transform="translate(452 140)">
          <rect class="dd-node dd-node-soft" width="120" height="88" rx="8"/>
          <text class="dd-tag" x="16" y="24">ALB</text>
          <text class="dd-node-title" x="16" y="52">Load balancer</text>
          <text class="dd-node-copy" x="16" y="72">trusted hop</text>
        </g>
        <g transform="translate(630 140)">
          <rect class="dd-node dd-node-focal" width="120" height="88" rx="8"/>
          <text class="dd-tag dd-tag-focal" x="16" y="24">PROXY</text>
          <text class="dd-node-title" x="16" y="52">NGINX</text>
          <text class="dd-node-copy" x="16" y="72">sanitize headers</text>
        </g>
        <g transform="translate(842 140)">
          <rect class="dd-node dd-node-store" width="136" height="88" rx="8"/>
          <text class="dd-tag" x="16" y="24">RUNTIME</text>
          <text class="dd-node-title" x="16" y="52">Tomcat</text>
          <text class="dd-node-copy" x="16" y="72">resolve identity</text>
        </g>

        <path class="dd-forbidden-path" d="M114 246 V330 H792"/>
        <circle class="dd-stop" cx="792" cy="330" r="13"/>
        <path class="dd-stop-mark" d="M784 322 800 338 M800 322 784 338"/>
        <rect class="dd-label-mask dd-label-mask-danger" x="350" y="302" width="238" height="20" rx="2"/>
        <text class="dd-arrow-label dd-arrow-label-danger" x="469" y="316" text-anchor="middle">SPOOFED X-FORWARDED-FOR STOPS HERE</text>

        <path class="dd-connector" d="M910 228 V352 H816 V384" marker-end="url(#dd-rl-trust-arrow)"/>
        <rect class="dd-label-mask" x="828" y="337" width="76" height="18" rx="2"/>
        <text class="dd-arrow-label" x="866" y="350" text-anchor="middle">RESOLVE</text>

        <rect class="dd-chain-panel" x="96" y="384" width="848" height="156" rx="8"/>
        <text class="dd-panel-kicker" x="124" y="414">X-FORWARDED-FOR CHAIN · INSPECT RIGHT TO LEFT</text>

        <g transform="translate(130 438)">
          <rect class="dd-address dd-address-client" width="214" height="70" rx="8"/>
          <text class="dd-tag dd-tag-danger" x="16" y="24">FIRST UNTRUSTED</text>
          <text class="dd-address-value" x="16" y="50">203.0.113.42</text>
        </g>
        <path class="dd-chain-arrow" d="M376 474 H344" marker-end="url(#dd-rl-trust-arrow)"/>
        <g transform="translate(376 438)">
          <rect class="dd-address dd-address-trusted" width="214" height="70" rx="8"/>
          <text class="dd-tag dd-tag-good" x="16" y="24">TRUSTED PROXY</text>
          <text class="dd-address-value" x="16" y="50">10.0.14.8</text>
        </g>
        <path class="dd-chain-arrow" d="M622 474 H590" marker-end="url(#dd-rl-trust-arrow)"/>
        <g transform="translate(622 438)">
          <rect class="dd-address dd-address-trusted" width="214" height="70" rx="8"/>
          <text class="dd-tag dd-tag-good" x="16" y="24">IMMEDIATE SENDER</text>
          <text class="dd-address-value" x="16" y="50">10.0.2.19</text>
        </g>
      </svg>`
    });
  }


  global.SWEDay1DiagramDesign.trustedProxyRoad = trustedProxyRoad;
}(window));
