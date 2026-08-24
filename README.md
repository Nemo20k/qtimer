# qtimer

qtimer is a small local web app for running timer sequences encoded entirely in a URL. It is generic enough for workouts, interval sessions, cooking, study blocks, or any other ordered timed activity.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## URL format: MVP v1

The current URL format is **MVP v1** and may change later:

```text
?title=Optional%20Title&timers=durationInSeconds:label,durationInSeconds:label
```

`title` is optional. `timers` is required. Labels may contain URL-encoded text, including spaces, commas, and colons.

Examples:

```text
http://localhost:5173/?timers=10:Work,5:Rest,10:Work
```

```text
http://localhost:5173/?title=Upper%20Body&timers=60:Push-ups,30:Rest,60:Pull-ups,30:Rest,60:Squats
```

```text
http://localhost:5173/?title=Tabata&timers=20:Work,10:Rest,20:Work,10:Rest,20:Work,10:Rest,20:Work,10:Rest
```

The URL is the source of truth. qtimer does not use accounts, persistence, cookies, backend services, sound, analytics, or external APIs.

## Project structure

- `src/parser.js` parses and validates the MVP v1 URL format.
- `src/timer-engine.js` contains timestamp-based timer state and calculations.
- `src/ui.js` renders the application and handles interactions.
- `src/styles.css` contains the responsive, fullscreen-oriented styling.
- `test/` contains parser and timer-engine tests.

## Development checks

```bash
npm test
npm run build
```
