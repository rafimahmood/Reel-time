# Tests

Browser tests for Reel Time. They load `index.html` from disk in headless Chromium (Playwright) and drive the game through its test hooks: `window.__reel`, `window.__TS` (speeds up the clock) and the `BALL` / `DANCES` / `DANCE_ORDER` globals.

## Running

```sh
npm install      # once: Playwright, and three.js r128 for the first-person test
npm test         # everything, about 1½ minutes
npm test -- ball # only tests whose file or name contains "ball"
```

If Playwright has no Chromium yet, run `npx playwright install chromium` once.

No network is used. Google Fonts requests get an empty stylesheet. The three.js request to cdnjs is served from `node_modules/three/build/three.min.js`, or from the file named in `REEL_THREE_JS`. Without either, three.js is blocked and the first-person test is skipped. Any other outside request fails the test.

## What's covered

| File | Checks |
|---|---|
| `smoke.test.js` | The page loads with only the menu showing, every dance listed and no errors. Each dance in `DANCE_ORDER` is well formed (name, bpm, tune, view and so on), its choreography builds as a man and as a lady, and every dancer has a position for every bar. Save data survives a reload through `localStorage`, and a corrupt save falls back to the defaults. |
| `dances.test.js` | The demo bot dances all seven reels in the view from above at 16× speed. Each one must reach the results with 3 stars and at least 90% for pattern, hands and setting (it scores 100%). A demo must not pay shillings or change stars. |
| `ball.test.js` | A demo ball, clicked through: ask a partner, take the floor for the Dashing White Sergeant, sit out the rest, then check the results and go back to the menu. This uses the menu version of the ball, with three.js blocked. |
| `first-person.test.js` | The first-person 3D ballroom builds and renders a few frames (software WebGL manages about 1 fps), then V switches to the view from above mid-dance. |

Every test fails on any uncaught page error, any `console.error` (the game loop catches its own exceptions and logs them this way) and any local file that fails to load.

## Adding a test

Each `*.test.js` exports an array of `{ name, timeout?, skip?, fn: async ({ browser, log }) => {} }`. `tests/run.js` runs them in order against one browser. Use `withGame(browser, opts, async ({ page, errors }) => …)` from `helpers.js` to get a fresh page, and end with `assertNoErrors(errors, …)`.
