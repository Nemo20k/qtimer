# qtimer

qtimer is a small local web app for running timer sequences encoded entirely in a URL. It is generic enough for workouts, interval sessions, cooking, study blocks, or any other ordered timed activity.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## URL format: MVP v2

The current URL format is **MVP v2**. It replaces the old `timers=` format with repeated `step=` parameters:

```text
?title=Optional%20Title&step=time:seconds:label&step=reps:count:label
```

`title` is optional. At least one `step` is required. Step types are `time` and `reps`. Labels may contain URL-encoded text, including spaces and colons.

Examples:

```text
http://localhost:5173/?step=time:10:Work&step=time:5:Rest&step=time:10:Work
```

```text
http://localhost:5173/?title=Push+Workout&step=reps:6:Push-ups&step=time:50:Rest&step=reps:6:Push-ups&step=time:50:Rest
```

```text
http://localhost:5173/?title=Tabata&step=time:20:Work&step=time:10:Rest&step=time:20:Work&step=time:10:Rest
```

The URL is the source of truth. qtimer does not use accounts, persistence, cookies, backend services, analytics, or external APIs. Sound cues use the browser's native Web Audio API and are enabled by default on the ready screen; sound is not stored.

## Project structure

- `src/parser.js` parses and validates the MVP v2 URL format.
- `src/timer-engine.js` contains timestamp-based timer state and calculations.
- `src/audio.js` generates optional start, transition, and completion beeps.
- `src/ui.js` renders the application and handles interactions.
- `src/styles.css` contains the responsive, fullscreen-oriented styling.
- `test/` contains parser and timer-engine tests.

## Development checks

```bash
npm test
npm run build
```

## Publish on GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.
It builds and publishes qtimer automatically whenever changes are pushed to `main`.

After enabling GitHub Pages with **Settings → Pages → Build and deployment → Source: GitHub Actions**, the app will be available at:

```text
https://YOUR_USERNAME.github.io/qtimer/
```

Timer URLs work by adding query parameters, for example:

```text
https://YOUR_USERNAME.github.io/qtimer/?step=time:20:Work&step=time:10:Rest
```
