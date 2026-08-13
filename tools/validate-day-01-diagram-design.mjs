import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const diagramFiles = [
  'visuals/day-01-diagram-design-core.js',
  'visuals/day-01-diagram-layered.js',
  'visuals/day-01-diagram-token-bucket.js',
  'visuals/day-01-diagram-distributed.js',
  'visuals/day-01-diagram-trusted-proxy.js',
  'visuals/day-01-diagram-request.js'
];
const enhancerSource = read('visuals/day-01.js');
const css = read('visuals/day-01-diagram-design.css');

for (const file of diagramFiles) {
  new vm.Script(read(file), { filename: file });
}
new vm.Script(enhancerSource, { filename: 'visuals/day-01.js' });
assert(css.split('{').length === css.split('}').length, 'day-01-diagram-design.css has unbalanced braces');

const context = {
  window: {},
  console,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Map,
  Set,
  RegExp,
  Math
};
context.window.window = context.window;
context.window.SWEVisualsCore = {
  escapeHtml: (value) => String(value)
};
vm.createContext(context);
for (const file of diagramFiles) {
  vm.runInContext(read(file), context, { filename: file });
}

const diagrams = context.window.SWEDay1DiagramDesign;
const expected = [
  'layeredEnforcement',
  'tokenBucketProcess',
  'distributedLimiter',
  'trustedProxyRoad',
  'requestEvaluation'
];

assert(diagrams, 'SWEDay1DiagramDesign was not registered');
assert(Object.keys(diagrams).length === expected.length, `expected ${expected.length} diagram renderers`);

const allIds = new Set();
for (const name of expected) {
  const render = diagrams[name];
  assert(typeof render === 'function', `missing diagram renderer: ${name}`);
  const markup = render();

  assert(markup.includes('<figure class="dd-figure'), `${name} is missing the figure shell`);
  assert(markup.includes('<svg class="dd-svg'), `${name} is missing an SVG`);
  assert(markup.includes('role="img"'), `${name} SVG is missing role=img`);
  assert(markup.includes('<title id="'), `${name} SVG is missing an accessible title`);
  assert(markup.includes('<desc id="'), `${name} SVG is missing an accessible description`);
  assert(!markup.includes('<foreignObject'), `${name} must remain portable SVG`);
  assert(!/<script\b/i.test(markup), `${name} contains executable script markup`);
  assert(!/\son[a-z]+\s*=/i.test(markup), `${name} contains an executable HTML/SVG handler`);
  assert(!/<line\b/i.test(markup), `${name} uses raw line elements instead of the shared path grammar`);

  const labelledBy = markup.match(/aria-labelledby="([^"]+)"/);
  assert(labelledBy, `${name} is missing aria-labelledby`);
  for (const id of labelledBy[1].split(/\s+/)) {
    assert(markup.includes(`id="${id}"`), `${name} aria-labelledby does not resolve ${id}`);
  }

  for (const match of markup.matchAll(/\sid="([^"]+)"/g)) {
    assert(!allIds.has(match[1]), `duplicate diagram ID across Day 1: ${match[1]}`);
    allIds.add(match[1]);
  }

  for (const match of markup.matchAll(/class="dd-(?:connector[^" ]*|stack-connector|axis-line[^" ]*|chain-arrow|passive-path|forbidden-path)"\s+d="([^"]+)"/g)) {
    assert(!/[lL]/.test(match[1]), `${name} has a diagonal-capable connector path: ${match[1]}`);
  }
}

for (const section of [
  'Where rate limiting can be applied',
  'Token bucket example',
  'Practical Redis implementation',
  'Choosing the rate limit key',
  'A practical Spring Boot design'
]) {
  assert(enhancerSource.includes(section), `Day 1 enhancer does not target section: ${section}`);
}

for (const asset of [
  ...diagramFiles,
  'visuals/day-01-diagram-design.css'
]) {
  assert(enhancerSource.includes(asset), `Day 1 enhancer does not load ${asset}`);
}

console.log(`Validated ${expected.length} accessible Day 1 editorial diagrams, connector grammar, CSS, and enhancer wiring.`);
