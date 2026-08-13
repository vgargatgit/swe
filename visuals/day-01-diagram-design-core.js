(function (global) {
  'use strict';

  const escapeHtml = global.SWEVisualsCore?.escapeHtml || ((value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;'));

  const SVG_STYLES = `<style>
    .dd-paper{fill:#fbfcff}.dd-node{fill:#fff;stroke:#aebacc;stroke-width:1.2}.dd-node-soft{fill:#fff;stroke:#aebacc}.dd-node-input{fill:#f4f7fb;stroke:#9aa8bc}.dd-node-store{fill:#f3f5f8;stroke:#77869b}.dd-node-focal{fill:#edf2ff;stroke:#2f5bea;stroke-width:1.6}.dd-node-good{fill:#eefaf5;stroke:#147d64}.dd-node-danger{fill:#fff3f1;stroke:#b42318}.dd-node-passive{fill:#f7f8fb;stroke:#9aa8bc;stroke-dasharray:5 4}
    .dd-tag-bg{fill:#f4f6f9;stroke:#bcc6d4}.dd-tag-bg-focal{fill:#fff;stroke:#8fa8f8}.dd-tag,.dd-zone-label,.dd-axis-label,.dd-panel-kicker{fill:#7b8799;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:800;letter-spacing:1.1px}.dd-tag-focal,.dd-node-action-focal,.dd-stage-number-focal{fill:#2f5bea}.dd-tag-good{fill:#147d64}.dd-tag-danger{fill:#b42318}
    .dd-node-title,.dd-decision-title,.dd-bucket-title,.dd-address-value{fill:#172033;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:700}.dd-node-title-large{font-size:24px}.dd-node-title-compact{font-size:13px}.dd-node-copy,.dd-decision-copy,.dd-bucket-value,.dd-bucket-note,.dd-slot-value{fill:#5f6b7d;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:500}.dd-node-action{fill:#172033;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:800;letter-spacing:.6px}.dd-node-note{fill:#7b8799;font-family:Inter,Arial,sans-serif;font-size:10px;font-style:italic}.dd-stage-number{fill:#c7cfda;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:22px;font-weight:800}
    .dd-connector,.dd-stack-connector,.dd-axis-line,.dd-chain-arrow{fill:none;stroke:#78879a;stroke-width:1.6}.dd-axis-line{stroke:#aebacc;stroke-width:1.2}.dd-axis-line-right{stroke-dasharray:5 4}.dd-connector-link{stroke:#2563a8;stroke-width:2}.dd-connector-good{stroke:#147d64}.dd-connector-danger{stroke:#b42318}.dd-connector-bucket{stroke-dasharray:5 4}.dd-passive-path{fill:none;stroke:#8c99aa;stroke-width:1.2;stroke-dasharray:5 4}.dd-arrow-head{fill:#78879a}.dd-arrow-head-link{fill:#2563a8}.dd-arrow-head-good{fill:#147d64}.dd-arrow-head-danger{fill:#b42318}
    .dd-label-mask{fill:#fbfcff}.dd-label-mask-danger{fill:#fff7f5}.dd-arrow-label{fill:#7b8799;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;font-weight:800;letter-spacing:.7px}.dd-arrow-label-link{fill:#2563a8}.dd-arrow-label-good{fill:#147d64}.dd-arrow-label-danger{fill:#b42318}
    .dd-decision{fill:#fff;stroke:#7e8da1;stroke-width:1.5}.dd-bucket-shape{fill:#eef3ff;stroke:#2f5bea;stroke-width:2}.dd-bucket-rim{fill:#fff;stroke:#2f5bea;stroke-width:2}.dd-token-coins circle{fill:#fff2c8;stroke:#c47a0a;stroke-width:1.4}.dd-redis-stack{fill:none;stroke:#2f5bea;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .dd-zone{fill:#f7f8fb;fill-opacity:.8;stroke:#aebacc;stroke-width:1;stroke-dasharray:5 4}.dd-zone-untrusted{fill:#fff8f7;stroke:#d4a29d}.dd-zone-trusted{fill:#f5f7ff;stroke:#9db2ed}.dd-zone-app{fill:#f7f8fb;stroke:#aebacc}.dd-zone-label-mask{fill:#fbfcff}.dd-forbidden-path{fill:none;stroke:#b42318;stroke-width:1.5;stroke-dasharray:7 5}.dd-stop{fill:#fff;stroke:#b42318;stroke-width:2}.dd-stop-mark{fill:none;stroke:#b42318;stroke-width:2;stroke-linecap:round}.dd-chain-panel{fill:#fff;stroke:#d8e0ec;stroke-width:1}.dd-address{fill:#fff;stroke:#aebacc}.dd-address-client{fill:#fff3f1;stroke:#cf827b}.dd-address-trusted{fill:#eefaf5;stroke:#76aa9b}
  </style>`;

  function figure({ type, pattern, title, caption, className = '', svg }) {
    const label = pattern ? `${type} · ${pattern}` : type;
    return `<figure class="dd-figure ${className}" data-diagram-type="${escapeHtml(type)}">
      <figcaption class="dd-heading">
        <span class="dd-kicker">${escapeHtml(label)}</span>
        <strong>${escapeHtml(title)}</strong>
      </figcaption>
      <div class="dd-canvas">${svg}</div>
      <p class="dd-caption">${escapeHtml(caption)}</p>
    </figure>`;
  }


  global.SWEDay1DiagramDesign = global.SWEDay1DiagramDesign || {};
  global.SWEDay1DiagramDesignCore = Object.freeze({ escapeHtml, SVG_STYLES, figure });
}(window));
