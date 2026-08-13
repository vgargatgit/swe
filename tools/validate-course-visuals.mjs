import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const scriptFiles = [
  'visuals/course-profiles-04-12.js',
  'visuals/course-profiles-13-21.js',
  'visuals/course-profiles-22-29.js',
  'visuals/course-profiles-30-36.js',
  'visuals/course-profiles.js',
  'visuals/course-components.js',
  'visuals/course-rules.js',
  'visuals/course.js'
];

for (const file of scriptFiles) {
  new vm.Script(read(file), { filename: file });
}

const css = read('visuals/course.css');
assert(css.split('{').length === css.split('}').length, 'course.css has unbalanced braces');

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
  escapeHtml: (value) => String(value),
  icon: (name) => `<icon name="${name}"></icon>`,
  shell: ({ title, body = '' }) => `<figure><h3>${title}</h3>${body}</figure>`,
  pipeline: ({ title, stages }) => `<pipeline title="${title}" stages="${stages.length}"></pipeline>`,
  layerStack: ({ title, layers }) => `<layers title="${title}" count="${layers.length}"></layers>`,
  cardGrid: ({ title, items }) => `<cards title="${title}" count="${items.length}"></cards>`,
  comparison: ({ title, items }) => `<comparison title="${title}" count="${items.length}"></comparison>`,
  timeline: ({ title, items }) => `<timeline title="${title}" count="${items.length}"></timeline>`,
  steps: ({ title, items }) => `<steps title="${title}" count="${items.length}"></steps>`,
  policyBoard: ({ title, groups }) => `<policy title="${title}" count="${groups.length}"></policy>`,
  normalize: (value) => String(value).trim()
};
vm.createContext(context);

vm.runInContext(read('data/lessons.js'), context, { filename: 'data/lessons.js' });
for (const file of ['visuals/course-profiles-04-12.js','visuals/course-profiles-13-21.js','visuals/course-profiles-22-29.js','visuals/course-profiles-30-36.js','visuals/course-profiles.js']) {
  vm.runInContext(read(file), context, { filename: file });
}
vm.runInContext(read('visuals/course-components.js'), context, { filename: 'visuals/course-components.js' });
vm.runInContext(read('visuals/course-rules.js'), context, { filename: 'visuals/course-rules.js' });

const lessons = context.window.LESSONS.filter((lesson) => lesson.day >= 4 && lesson.day <= 36);
const profiles = context.window.SWECourseProfiles.bySlug;
assert(lessons.length === 33, `expected 33 remaining chapters, found ${lessons.length}`);
assert(Object.keys(profiles).length === 33, `expected 33 visual profiles, found ${Object.keys(profiles).length}`);

const requiredByMode = {
  flow: ['stages'],
  layers: ['layers'],
  fanout: ['source', 'hub', 'targets'],
  state: ['states', 'transitions'],
  sequence: ['actors', 'sequence'],
  topology: ['center', 'nodes'],
  tradeoff: ['left', 'right', 'axis'],
  decision: ['question', 'options']
};

for (const lesson of lessons) {
  const profile = profiles[lesson.slug];
  assert(profile, `missing visual profile for ${lesson.slug}`);
  assert(profile.day === lesson.day, `profile day mismatch for ${lesson.slug}`);
  assert(profile.title === lesson.title, `profile title mismatch for ${lesson.slug}`);
  assert(Array.isArray(profile.dimensions) && profile.dimensions.length >= 4, `profile needs four dimensions: ${lesson.slug}`);
  for (const field of requiredByMode[profile.mode] || []) {
    assert(profile[field], `profile ${lesson.slug} is missing ${field}`);
  }

  const hero = context.window.SWECourseVisuals.profileHero(profile);
  const lens = context.window.SWECourseVisuals.questionLens(profile);
  assert(typeof hero === 'string' && hero.length > 20, `profile hero failed for ${lesson.slug}`);
  assert(typeof lens === 'string' && lens.length > 20, `question lens failed for ${lesson.slug}`);

  const expectedFile = path.join(root, 'lessons', `${lesson.slug}.js`);
  assert(fs.existsSync(expectedFile), `lesson file not found: lessons/${lesson.slug}.js`);
}

const ruleSamples = [
  'Client\n↓\nGateway\n↓\nService',
  'CLOSED → OPEN → HALF_OPEN → CLOSED',
  'failure\n↓\nretry storm\n↓\noverload\n↓\ncascading failure',
  'A weight = 1\nB weight = 1\nC weight = 4',
  'Topic → Search\nTopic → Analytics\nTopic → Email',
  'Client ↔ Server',
  'Attempt 1\n↓\n1 second delay\n↓\nAttempt 2\n↓\n2 second delay'
];

for (const sample of ruleSamples) {
  const rendered = context.window.SWECourseRules.renderText(sample, {
    profile: profiles['day-12-retries'],
    sectionTitle: 'Validation sample'
  });
  assert(typeof rendered === 'string' && rendered.length > 10, `rule did not render sample: ${sample}`);
}

const index = read('index.html');
for (const required of [
  'visuals/course.css',
  'visuals/course-profiles-04-12.js',
  'visuals/course-profiles-13-21.js',
  'visuals/course-profiles-22-29.js',
  'visuals/course-profiles-30-36.js',
  'visuals/course-profiles.js',
  'visuals/course-components.js',
  'visuals/course-rules.js',
  'visuals/course.js'
]) {
  assert(index.includes(required), `index.html does not load ${required}`);
}

const order = [
  'visuals/course-profiles-04-12.js',
  'visuals/course-profiles-13-21.js',
  'visuals/course-profiles-22-29.js',
  'visuals/course-profiles-30-36.js',
  'visuals/course-profiles.js',
  'visuals/course-components.js',
  'visuals/course-rules.js',
  'visuals/course.js'
].map((entry) => index.indexOf(entry));
assert(order.every((position) => position >= 0), 'course scripts missing from index');
assert(order.every((position, indexValue) => indexValue === 0 || position > order[indexValue - 1]), 'course scripts are in the wrong order');

console.log(`Validated ${lessons.length} chapter profiles, ${ruleSamples.length} rule families, shared CSS, and protected load order.`);
