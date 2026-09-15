# QTimer frontend guide

## Product and highest-risk invariants

QTimer is an account-free browser workout timer. A workout is represented by
ordered URL parameters, so the URL format is a public compatibility contract.

- Preserve valid MVP v3 URLs and legacy `step=` URLs.
- Keep parsing and serialization round-trippable, including repeated steps and
  URL-encoded labels. Reuse `src/parser.js` and `src/workout.js`; do not create
  a second URL format or parser.
- The runner must work without the AI API. AI generation is an optional builder
  path and generated workouts must be reviewed in the manual builder.
- Treat URL content, form content, API responses, and model output as untrusted.
- Never send prompts, workout titles, labels, notes, serialized workouts,
  complete workout URLs, query strings, hashes, clipboard contents, or raw
  errors to analytics.
- Do not add consent banners, privacy interruptions, accounts, or new data
  collection without an explicit product decision.

## Repository map

- `index.html`: root application document and global metadata/GA bootstrap.
- `hiit-timer/index.html`, `tabata-timer/index.html`,
  `emom-timer/index.html`: static Vite landing entries.
- `privacy/index.html`, `contact/index.html`: static informational entries.
- `src/main.js`: route selection and application mounting.
- `src/parser.js`: MVP v3 and legacy URL parsing.
- `src/workout.js`: validation and URL serialization.
- `src/builder.js`: manual builder, AI builder, editing, sharing, and copy flow.
- `src/ai-generator.js`, `src/api-client.js`, `src/ai-workout.js`: AI request,
  response normalization, and builder hydration.
- `src/timer-engine.js`, `src/ui.js`: timer state and runner UI.
- `src/analytics.js`: the only analytics event/page-view boundary.
- `src/landing-pages.js`, `src/site-footer.js`, `src/styles.css`: landing
  metadata/content, shared footer, and responsive styling.
- `public/robots.txt`, `public/sitemap.xml`: crawl configuration copied to
  `dist/` by Vite.
- `.github/workflows/deploy-pages.yml`: GitHub Pages build/deploy workflow.
- `test/`: Node’s built-in test suite, including URL, AI, analytics, SEO,
  static-page, and timer coverage.

## Tooling and verified commands

Use npm. This repository currently has no lockfile and no configured frontend
lint, formatter, or type-check script.

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run build` is the production check. It must emit the root, landing,
Privacy, Contact, `sitemap.xml`, and `robots.txt` files under `dist/`. Do not
invent `npm run lint`, `npm run typecheck`, or formatting commands; they do not
exist in this manifest.

## Architecture and flow rules

`src/main.js` reads `location.search`, asks `src/parser.js` for a result, and
mounts the landing page, builder, runner, or recoverable error view. Do not make
the runner depend on a network request. Manual creation uses
`modelFromBuilderRows()` and `serializeWorkout()`; AI results must pass through
`normalizeGeneratedWorkout()` before entering the builder.

The Vite base is `/` and the production site is `https://qtimer.app`. Static
page entries are used because GitHub Pages must serve `/privacy/` and
`/contact/` on direct navigation and hard refresh. Keep asset links and
canonical URLs compatible with that base.

## UI, accessibility, and responsive behavior

Reuse the existing dark QTimer visual system in `src/styles.css`. Keep semantic
headings, visible keyboard focus, usable touch targets, readable mobile layouts,
and safe wrapping for long labels and links. The footer is normal document
content on non-running screens; it must not cover or distract from the active
full-screen timer. Avoid layout shifts in the countdown and controls.

## Analytics and privacy

`src/analytics.js` centralizes page-view initialization, event-name allowlisting,
parameter sanitization, and coarse workout metrics. Keep the measurement ID
`G-M496SBC03Q`, disable automatic unsafe page views, and send only a stable
pathname/screen identifier. Do not bypass the helper with direct `gtag` calls.

The app currently uses no localStorage, sessionStorage, IndexedDB, or cookies
for workout data. Sound, narration, and screen-awake controls are session UI
state. Keep metadata, page titles, Open Graph values, and canonical URLs free of
user-created workout content. Do not add provider scripts, fonts, APIs, or
storage casually.

## SEO and sharing

Keep `/`, `/privacy/`, `/contact/`, and the existing public landing pages in the
sitemap using canonical production URLs. Never add parameterized or user-specific
workout URLs. `robots.txt` must continue to reference
`https://qtimer.app/sitemap.xml`. The root application canonical is
`https://qtimer.app/`, including when a workout query is open; informational
pages self-canonicalize.

## Testing and review focus

Run `npm test` and `npm run build` after changes. For URL or builder changes,
cover parsing, serialization, repeated parameters, legacy compatibility,
manual creation, AI-to-builder hydration, edit-without-data-loss, and shared
link opening. For runner changes, cover start, pause/resume, navigation,
completion, audio/wake-lock degradation, and mobile controls. For analytics or
metadata changes, assert that prompts, labels, titles, URLs, query strings, and
hashes cannot reach telemetry.

Review for unnecessary dependencies, duplicated URL logic, exposed user content,
broken direct-loadable pages, mobile overflow, inaccessible controls, sitemap
leaks, and accidental deployment changes. Preserve unrelated working-tree edits.

## Git and deployment boundary

The repository deploys through GitHub Pages when `.github/workflows/deploy-pages.yml`
runs on `main`. Do not commit, push, deploy, or change deployment configuration
unless the user explicitly requests it. The README’s generic GitHub Pages host
example is not the production URL; use the canonical metadata and current Pages
configuration as sources of truth.

## Definition of done

The smallest complete change preserves the URL contract, works without AI,
keeps user content out of analytics and metadata, passes the relevant tests and
production build, remains accessible and responsive, and leaves unrelated user
changes untouched.
