import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const blueprintFiles = [
  'visuals/bespoke-04-12.js',
  'visuals/bespoke-13-21.js',
  'visuals/bespoke-22-29.js',
  'visuals/bespoke-30-36.js'
];

for (const file of [
  'visuals/bespoke-dsl.js',
  ...blueprintFiles,
  'visuals/bespoke.js',
  'visuals/bespoke.css',
  'visuals/course.js'
]) {
  assert(fs.existsSync(path.join(root, file)), `missing bespoke visual file: ${file}`);
}

const lessonsSource = read('data/lessons.js');
const lessonMatches = [...lessonsSource.matchAll(/\{day:(\d+),title:'([^']+)',slug:'([^']+)'/g)]
  .map((match) => ({ day: Number(match[1]), title: match[2], slug: match[3] }))
  .filter((lesson) => lesson.day >= 4 && lesson.day <= 36);

assert(lessonMatches.length === 33, `expected 33 remaining lessons, found ${lessonMatches.length}`);

const blueprintSource = blueprintFiles.map(read).join('\n');
const slugMatches = [...blueprintSource.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
const dayMatches = [...blueprintSource.matchAll(/day:\s*(\d+)/g)].map((match) => Number(match[1]));
const directiveCount = (blueprintSource.match(/\bx\(/g) || []).length;
const uniqueSlugs = new Set(slugMatches);

assert(slugMatches.length === 33, `expected 33 bespoke blueprints, found ${slugMatches.length}`);
assert(uniqueSlugs.size === 33, 'bespoke blueprint slugs must be unique');
assert(dayMatches.length === 33, `expected 33 blueprint day declarations, found ${dayMatches.length}`);
assert(directiveCount >= 165, `expected at least 165 explicit section visuals, found ${directiveCount}`);

for (const lesson of lessonMatches) {
  assert(uniqueSlugs.has(lesson.slug), `missing bespoke blueprint for ${lesson.slug}`);
  assert(fs.existsSync(path.join(root, 'lessons', `${lesson.slug}.js`)), `missing lesson file for ${lesson.slug}`);
}

const helperTypes = {
  pipeline: /\bp\(/,
  cardGrid: /\bgrid\(/,
  comparison: /\bc\(/,
  timeline: /\bt\(/,
  stateMachine: /\bsm\(/,
  sequence: /\bsq\(/,
  fanout: /\bfo\(/,
  topology: /\btp\(/,
  tradeoff: /\btr\(/,
  decision: /\bd\(/,
  failureCascade: /\bfc\(/,
  metricBoard: /\bmb\(/,
  routeMap: /\brm\(/,
  layerStack: /\bls\(/
};

const usedTypes = Object.entries(helperTypes)
  .filter(([, pattern]) => pattern.test(blueprintSource))
  .map(([name]) => name);
assert(usedTypes.length >= 12, `expected broad diagram variety, found ${usedTypes.length} visual types`);

for (const file of blueprintFiles) {
  const source = read(file);
  assert((source.match(/\bdata\.push\(/g) || []).length === 1, `${file} should register one chapter range`);
  assert((source.match(/\bx\(/g) || []).length >= 35, `${file} does not contain enough explicit section visuals`);
}

const loader = read('visuals/course.js');
for (const file of ['visuals/bespoke-dsl.js', ...blueprintFiles, 'visuals/bespoke.js', 'visuals/bespoke.css']) {
  assert(loader.includes(file), `visual loader does not reference ${file}`);
}

const index = read('index.html');
assert(index.includes('data-protected-src="visuals/course.js"'), 'bespoke loader must remain behind the login gate');

console.log(`Validated 33 bespoke chapter blueprints, ${directiveCount} section-level visuals, and ${usedTypes.length} diagram types.`);
