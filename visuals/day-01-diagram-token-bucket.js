(function (global) {
  'use strict';

  const { figure, SVG_STYLES } = global.SWEDay1DiagramDesignCore;

  function tokenBucketProcess() {
    return figure({
      type: 'Process',
      pattern: 'Burst + sustained-rate control',
      title: 'The bucket separates immediate burst capacity from long-run request rate',
      caption: 'Capacity answers “how large a burst may pass now?” Refill rate answers “how quickly may the caller continue over time?”',
      className: 'dd-token-bucket',
      svg: `<svg class="dd-svg dd-svg-token" viewBox="0 0 960 520" role="img" aria-labelledby="dd-rl-token-title dd-rl-token-desc" xmlns="http://www.w3.org/2000/svg">
        <title id="dd-rl-token-title">Token bucket process</title>
        <desc id="dd-rl-token-desc">Time refills a bucket up to ten tokens at one token per second. Requests check whether a token exists. Available tokens are consumed and the request is allowed; empty buckets cause rejection or delay.</desc>
        ${SVG_STYLES}
        <defs>
          <marker id="dd-rl-token-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 8 4 0 8Z" class="dd-arrow-head"/>
          </marker>
          <marker id="dd-rl-token-arrow-good" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 8 4 0 8Z" class="dd-arrow-head-good"/>
          </marker>
          <marker id="dd-rl-token-arrow-danger" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 8 4 0 8Z" class="dd-arrow-head-danger"/>
          </marker>
        </defs>
        <rect class="dd-paper" width="960" height="520" rx="8"/>

        <g transform="translate(72 82)">
          <rect class="dd-node dd-node-soft" width="168" height="72" rx="8"/>
          <text class="dd-tag" x="18" y="24">TIME</text>
          <text class="dd-node-title" x="18" y="48">1 second passes</text>
          <text class="dd-node-copy" x="18" y="65">shared time source</text>
        </g>

        <path class="dd-connector" d="M240 118 H312" marker-end="url(#dd-rl-token-arrow)"/>
        <rect class="dd-label-mask" x="258" y="91" width="52" height="16" rx="2"/>
        <text class="dd-arrow-label" x="284" y="103" text-anchor="middle">REFILL</text>

        <g transform="translate(320 72)">
          <rect class="dd-node dd-node-soft" width="184" height="92" rx="8"/>
          <text class="dd-tag" x="18" y="24">RATE</text>
          <text class="dd-node-title" x="18" y="52">Add 1 token</text>
          <text class="dd-node-copy" x="18" y="73">never exceed capacity</text>
        </g>

        <path class="dd-connector" d="M504 118 H608" marker-end="url(#dd-rl-token-arrow)"/>

        <g class="dd-bucket-hub" transform="translate(580 50)">
          <path class="dd-bucket-shape" d="M28 34 H188 L168 198 Q108 228 48 198Z"/>
          <path class="dd-bucket-rim" d="M28 34 Q108 10 188 34 Q108 58 28 34Z"/>
          <g class="dd-token-coins">
            <circle cx="72" cy="174" r="13"/><circle cx="104" cy="174" r="13"/><circle cx="136" cy="174" r="13"/>
            <circle cx="88" cy="142" r="13"/><circle cx="120" cy="142" r="13"/><circle cx="152" cy="142" r="13"/>
            <circle cx="104" cy="110" r="13"/><circle cx="136" cy="110" r="13"/>
          </g>
          <text class="dd-bucket-title" x="108" y="74" text-anchor="middle">TOKEN BUCKET</text>
          <text class="dd-bucket-value" x="108" y="96" text-anchor="middle">capacity 10</text>
          <text class="dd-bucket-note" x="108" y="232" text-anchor="middle">refill: 1 token / second</text>
        </g>

        <g transform="translate(72 310)">
          <rect class="dd-node dd-node-input" width="168" height="72" rx="8"/>
          <text class="dd-tag" x="18" y="24">INPUT</text>
          <text class="dd-node-title" x="18" y="48">Request arrives</text>
          <text class="dd-node-copy" x="18" y="65">cost = 1 token</text>
        </g>

        <path class="dd-connector" d="M240 346 H344" marker-end="url(#dd-rl-token-arrow)"/>
        <rect class="dd-label-mask" x="266" y="319" width="54" height="16" rx="2"/>
        <text class="dd-arrow-label" x="293" y="331" text-anchor="middle">CHECK</text>

        <g transform="translate(352 292)">
          <path class="dd-decision" d="M112 0 224 54 112 108 0 54Z"/>
          <text class="dd-decision-title" x="112" y="50" text-anchor="middle">TOKEN</text>
          <text class="dd-decision-title" x="112" y="70" text-anchor="middle">AVAILABLE?</text>
        </g>

        <path class="dd-connector dd-connector-bucket" d="M688 252 V276 H464 V292" marker-end="url(#dd-rl-token-arrow)"/>
        <rect class="dd-label-mask" x="535" y="249" width="82" height="16" rx="2"/>
        <text class="dd-arrow-label" x="576" y="261" text-anchor="middle">READ STATE</text>

        <path class="dd-connector dd-connector-good" d="M576 346 H654" marker-end="url(#dd-rl-token-arrow-good)"/>
        <rect class="dd-label-mask" x="590" y="319" width="42" height="16" rx="2"/>
        <text class="dd-arrow-label dd-arrow-label-good" x="611" y="331" text-anchor="middle">YES</text>

        <g transform="translate(664 292)">
          <rect class="dd-node dd-node-good" width="220" height="108" rx="8"/>
          <text class="dd-tag dd-tag-good" x="18" y="26">ALLOW</text>
          <text class="dd-node-title" x="18" y="56">Consume one token</text>
          <text class="dd-node-copy" x="18" y="79">continue to the endpoint</text>
          <text class="dd-node-note" x="18" y="97">small bursts pass</text>
        </g>

        <path class="dd-connector dd-connector-danger" d="M464 400 V440 H654" marker-end="url(#dd-rl-token-arrow-danger)"/>
        <rect class="dd-label-mask" x="502" y="413" width="36" height="16" rx="2"/>
        <text class="dd-arrow-label dd-arrow-label-danger" x="520" y="425" text-anchor="middle">NO</text>

        <g transform="translate(664 420)">
          <rect class="dd-node dd-node-danger" width="220" height="72" rx="8"/>
          <text class="dd-tag dd-tag-danger" x="18" y="24">EMPTY</text>
          <text class="dd-node-title" x="18" y="48">Reject or delay</text>
          <text class="dd-node-copy" x="18" y="65">sustained abuse is bounded</text>
        </g>
      </svg>`
    });
  }


  global.SWEDay1DiagramDesign.tokenBucketProcess = tokenBucketProcess;
}(window));
