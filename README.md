# qtimer

qtimer is a small local web app for running timer sequences encoded entirely in a URL. It is generic enough for workouts, interval sessions, cooking, study blocks, or any other ordered timed activity.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## URL format: MVP v3

The current canonical URL format is **MVP v3**. Each workout step is a query parameter whose key contains its amount and unit:

```text
?title=Optional%20Title&30s=Work&2m=Rest&8x=Push-ups
```

Supported units are `s` for seconds, `m` for minutes, and `x` for repetitions. `title` is optional, and repeated keys remain ordered. Labels should be URL-encoded when necessary.

Examples:

```text
http://localhost:5173/?30s=Work&10s=Rest&30s=Work&10s=Rest
```

```text
http://localhost:5173/?title=Quick%20Workout&6x=Push-ups&50s=Rest&10x=Squats&1m=Rest
```

```text
http://localhost:5173/?title=Tabata&20s=Work&10s=Rest&20s=Work&10s=Rest
```

The URL is the source of truth. qtimer does not use accounts, persistence, cookies, backend services, analytics, or external APIs. Sound cues use the browser's native Web Audio API and are enabled by default on the ready screen; sound is not stored.

When voice cues are enabled, pressing `START` announces the first step and shows a three-second get-ready countdown before the workout clock begins.

While running or paused, `← Previous` and `Next →` move between steps. Navigation resets the selected step to its beginning; navigating beyond the final step completes the workout.

## Project structure

- `src/parser.js` parses and validates the canonical MVP v3 URL format and legacy `step=` URLs.
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
https://YOUR_USERNAME.github.io/qtimer/?title=Quick%20Workout&6x=Push-ups&30s=Rest&10x=Squats
```
