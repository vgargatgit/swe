(function (global) {
  'use strict';

  const STYLE = 'visuals/bespoke.css';
  const SOURCES = [
    'visuals/bespoke-dsl.js',
    'visuals/bespoke-04-12.js',
    'visuals/bespoke-13-21.js',
    'visuals/bespoke-22-29.js',
    'visuals/bespoke-30-36.js',
    'visuals/bespoke.js'
  ];

  function ensureStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.bespokeLoaded = 'true';
    document.head.appendChild(link);
  }

  function loadScript(source) {
    if (document.querySelector(`script[src="${source}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.dataset.bespokeLoaded = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`Unable to load ${source}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  async function initialize() {
    ensureStylesheet(STYLE);
    for (const source of SOURCES) {
      await loadScript(source);
    }
  }

  initialize().catch((error) => {
    console.error('Bespoke chapter visual system failed to initialize', error);
  });

  global.SWECourseVisualLoader = Object.freeze({ sources: SOURCES, stylesheet: STYLE });
}(window));
