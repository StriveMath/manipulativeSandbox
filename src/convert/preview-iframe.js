/**
 * Build the HTML document that previews a converted manipulative.
 *
 * This deliberately mirrors Strive's `buildReactAppHtml`
 * (packages/manipulatives/src/react-app/iframe-bootstrap.ts): same CDN
 * runtime, same Babel presets, same `require` shim, same
 * `{ props, state, setState, readOnly }` contract. The point of the preview
 * is to answer "will this work once imported", and it can only answer that
 * if it compiles and mounts the code the same way Strive will.
 *
 * An iframe rather than an in-page render, for one concrete reason beyond
 * isolation: the sandbox compiles Tailwind from source files at build time,
 * so utility classes that exist only inside a generated code string would
 * get no CSS and the preview would appear unstyled. The Play CDN generates
 * them at runtime from the rendered DOM.
 */

const REACT_VERSION = '18.3.1'
const BABEL_VERSION = '7.24.7'

export const CANVAS_WIDTH = 800
export const DEFAULT_CANVAS_HEIGHT = 500

/**
 * Short: this drives a live state inspector, so it should feel immediate.
 * Strive uses a longer delay because each message is a database write.
 */
const STATE_DEBOUNCE_MS = 120

const bootScriptBody = `
(function () {
  var INITIAL_PROPS = __PROPS__;
  var INITIAL_STATE = __STATE__;
  var USER_CODE = __USER_CODE__;
  var CANVAS_W = __CANVAS_W__;
  var DEBOUNCE = __DEBOUNCE__;

  function report(type, payload) {
    try { parent.postMessage(Object.assign({ type: type }, payload), '*') } catch (e) {}
  }

  function fail(message) {
    report('error', { message: message });
    var pre = document.createElement('pre');
    pre.style.cssText = 'color:#b91c1c;padding:1rem;font:12px ui-monospace,Menlo,monospace;white-space:pre-wrap;line-height:1.5';
    pre.textContent = message;
    (document.body || document.documentElement).appendChild(pre);
  }

  window.addEventListener('error', function (e) { fail('Error: ' + (e.message || e)) });
  window.addEventListener('unhandledrejection', function (e) {
    fail('Unhandled rejection: ' + ((e.reason && e.reason.message) || e.reason || e));
  });

  if (typeof window.React === 'undefined') return fail('React UMD failed to load.');
  if (typeof window.ReactDOM === 'undefined') return fail('ReactDOM UMD failed to load.');
  if (typeof window.Babel === 'undefined') return fail('Babel Standalone failed to load.');

  var compiled;
  try {
    compiled = window.Babel.transform(USER_CODE, {
      filename: 'converted.tsx',
      presets: [
        ['typescript', { allExtensions: true, isTSX: true, onlyRemoveTypeImports: false }],
        ['react', { runtime: 'classic' }],
        ['env', { modules: 'commonjs', targets: { esmodules: true } }]
      ]
    }).code;
  } catch (err) {
    return fail('Compile error: ' + ((err && err.message) || err));
  }

  var exports = {};
  var moduleObj = { exports: exports };
  function require(name) {
    if (name === 'react') return window.React;
    if (name === 'react-dom') return window.ReactDOM;
    if (name === 'react-dom/client') return { createRoot: window.ReactDOM.createRoot };
    throw new Error('Cannot require module: ' + name);
  }

  var UserApp;
  try {
    var factory = new Function('exports', 'require', 'module', 'React', 'ReactDOM', compiled);
    factory(exports, require, moduleObj, window.React, window.ReactDOM);
    UserApp = exports.default || moduleObj.exports.default || moduleObj.exports;
  } catch (err) {
    return fail('Runtime error: ' + ((err && err.message) || err) + ((err && err.stack) ? '\\n' + err.stack : ''));
  }

  if (typeof UserApp !== 'function') {
    return fail('The code must default-export a React component.');
  }

  var React = window.React;

  function Wrapper() {
    var hook = React.useState(INITIAL_STATE);
    var state = hook[0];

    // Reported on every change including the first. Unlike Strive, nothing
    // here is persisted; the inspector wants the seed as its starting value.
    React.useEffect(function () {
      var timer = setTimeout(function () {
        try {
          report('state', { state: state });
        } catch (err) {
          // postMessage structured-clones, so a state holding a function,
          // ref or DOM node throws here. That is exactly the serialisability
          // failure the data contract forbids, so surface it rather than
          // letting the preview look healthy.
          report('unserialisable', { message: String((err && err.message) || err) });
        }
      }, DEBOUNCE);
      return function () { clearTimeout(timer) };
    }, [state]);

    return React.createElement(UserApp, {
      props: INITIAL_PROPS,
      state: state,
      setState: hook[1],
      readOnly: false
    });
  }

  var rootEl = document.getElementById('root');

  function applyScale() {
    rootEl.style.transform = 'scale(' + (window.innerWidth / CANVAS_W) + ')';
  }

  try {
    applyScale();
    window.addEventListener('resize', applyScale);
    window.ReactDOM.createRoot(rootEl).render(React.createElement(Wrapper));
    report('ready', {});
  } catch (err) {
    fail('Mount error: ' + ((err && err.message) || err));
  }
})();
`

export function buildPreviewHtml({
  code,
  props,
  state,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
}) {
  // JSON.stringify yields a valid JS string literal for any input; escaping
  // the closing tag keeps an embedded "</script>" from ending the block.
  const userCodeJson = JSON.stringify(code).replace(/<\/script/gi, '<\\/script')

  // Replacement via a function so `$&` and `$$` in the substituted text stay
  // literal. A plain string replacement silently corrupts any component that
  // formats currency.
  const inject = (haystack, token, value) => haystack.replace(token, () => value)

  let boot = bootScriptBody
  boot = inject(boot, '__PROPS__', JSON.stringify(props ?? {}))
  boot = inject(boot, '__STATE__', JSON.stringify(state ?? {}))
  boot = inject(boot, '__USER_CODE__', userCodeJson)
  boot = inject(boot, '__CANVAS_W__', String(CANVAS_WIDTH))
  boot = inject(boot, '__DEBOUNCE__', String(STATE_DEBOUNCE_MS))

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; width: 100%; height: 100%; overflow: hidden; }
  #root { width: ${CANVAS_WIDTH}px; height: ${canvasHeight}px; overflow: hidden; transform-origin: top left; }
</style>
<script src="https://cdn.tailwindcss.com" onerror="parent.postMessage({type:'error',message:'Failed to load Tailwind Play CDN'},'*')"></script>
<script crossorigin src="https://cdn.jsdelivr.net/npm/react@${REACT_VERSION}/umd/react.production.min.js" onerror="parent.postMessage({type:'error',message:'Failed to load React UMD'},'*')"></script>
<script crossorigin src="https://cdn.jsdelivr.net/npm/react-dom@${REACT_VERSION}/umd/react-dom.production.min.js" onerror="parent.postMessage({type:'error',message:'Failed to load ReactDOM UMD'},'*')"></script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@${BABEL_VERSION}/babel.min.js" onerror="parent.postMessage({type:'error',message:'Failed to load Babel Standalone'},'*')"></script>
</head>
<body>
<div id="root"></div>
<script>
${boot}
</script>
</body>
</html>`
}
