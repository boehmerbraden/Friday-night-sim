# Friday Night

A standalone high school football simulation app. No server account, API key, npm dependencies, or paid service is required.

## Play

Open `index.html` in a modern desktop browser. If your browser restricts local-file storage, serve the directory:

```sh
npm start
```

Then open http://localhost:8080. Python 3 is required for this convenience command. Any static web server works.

On iPhone/iPad, use a hosted HTTPS version in Safari; the Files app's HTML preview is not a reliable application runtime.

1. Open **Matchup studio**. Enter names, mascots, manual ratings, colors and logos.
2. Save teams for later reuse. Blank offense/defense values inherit overall. Uploaded logos automatically suggest team colors; use Get colors from logo to repeat extraction, or adjust colors manually. Clear fields starts a new independent team. Delete team removes a saved team after confirmation while retaining historical games as archived records.
3. Choose weather, strategies, home advantage, and overtime settings.
4. Click **Simulate game**. Default speed is 10×. Pause/resume, change speeds, or skip to final.
5. Open the full play log or statistics. Generate a score graphic and download PNG.
6. In Saved games, select a team to view its win–loss record and only its past scores. Results are paginated in groups of ten. Saved games reopen with the original events. Rematches use a fresh seed.

## GitHub Pages

This project lives in `boehmerbraden/Friday-night-sim`. GitHub Pages must be enabled in the repository settings to provide a playable website.

The built `index.html` is included at the repository root. In the repository's **Settings → Pages**, select deployment from a branch, `main`, `/(root)`. GitHub will display the published URL. The application requires no build step on the hosting server. Do not overwrite an unrelated game's root files.

## Development

Requires Node.js 22+ for build/test, not for playing the built app.

```sh
npm test
npm run build
```

- `engine.js`: deterministic seeded engine, event records, stat reducer and recap.
- `app.js`: live playback, team forms, filters, IndexedDB persistence, export/import.
- `graphics.js`: browser Canvas rendering and logo rasterization.
- `style.css`, `index.template.html`: responsive visual presentation.
- `index.html`: generated, self-contained distributable.
- `tests.mjs`: 4,400 games with score/state/stat/replay/OT assertions.
- `graphics-tests.mjs`: nine graphics contract tests using a mock Canvas context.
- `test-report.json`: reproducible simulation distribution and test results.
- `browser-smoke.mjs`: Chromium controls, logo uploads, storage, mobile overflow and all nine PNG download checks.
- `.github/workflows/test.yml`: engine, graphic contracts and browser smoke tests on pushes/PRs. Browser screenshots and PNGs are uploaded as the `browser-results` artifact.

After editing sources, rebuild and commit `index.html` with them. The CI workflow checks that it matches the sources.

## Engine model

Possession, field position, line to gain, down, quarter, clock, score, timeouts and pending kick/try are explicit state. Each event stores before and after snapshots, elapsed time, yardage, scoring attribution and relevant player facts. The scoreboard and statistics are reduced from these events. Play-by-play is generated from the calculated result, never used to decide the result. The UI displays progressively revealed stored events; it does not invent intermediate outcomes.

A Mulberry32 seed reproduces the full game exactly. Team offense versus opposing defense, game-day performance variance, weather, schemes, fatigue, home advantage and late-game pressure influence outcomes. Strategies consider down/distance, field position, time, score, kicking range and clock management. There is no close-game or upset override. No empirical predictive-accuracy claim is made.

Default regulation is four 12-minute quarters with three timeouts per half and 20-yard-line touchbacks. A regulation tie goes to paired, untimed overtime possessions from the opponent's 10. Defensive possession ends an overtime series immediately. First offense alternates each round. Winning touchdowns in the second series omit an unnecessary try. Custom 20/25-yard starts allow ordinary first downs; users may require two-point tries from a chosen OT round. These are custom rule parameters, not a complete catalog of state-certified rulesets.

Sacks count as quarterback rushing losses. Kneels count as rushing attempts. Turnovers on downs are possession losses, not statistical giveaways. Extra-point and two-point plays do not inflate offensive yardage or pass/rush totals. Half-distance penalties can produce fractional yard positions and yardage. Possession time excludes kickoff flight/returns. Red-zone scoring efficiency counts field goals or touchdowns per trip. The win-probability line is a heuristic estimate, not a trained prediction.

### Deliberate simplifications

This is a football model, not an exhaustive officiating engine. Penalties are false starts, offside, and accepted holding with replayed downs. It does not model offsetting fouls, declined penalties, all live-ball enforcement combinations, injuries, blocked kicks, fair-catch kicks, or state mercy/running-clock rules. Missed field goals are modeled as unreturned end-zone kicks. Kickoff/free-kick returns are simplified. First-down clock stoppages and runoff are approximations. Fictional rosters have a QB, RB, two receivers, a featured defender and kicker rather than a full depth chart. Logos are preserved visually by local PNG rasterization; SVG vectors are not retained as vectors in the exported PNG. Player-of-the-game and biggest-play selections are transparent heuristic rankings, not human awards.

### Rule references

- https://www.iahsaa.org/wp-content/uploads/2026/08/IHSAA-Overtime-Procedures8.13.26.pdf
- https://playfootball.nfl.com/tackle/youth-and-high-school-tackle-football-glossary

## Persistence and backups

IndexedDB stores teams, complete games, and generated graphic variants in the current browser. Clearing site data removes them. Generated graphics use the original saved game, so they can be recreated without resimulation. Use **Export game JSON** for a portable backup. Imports verify exact seeded replay before being accepted. Saving failures are surfaced, not silently treated as successful saves. There is no cloud synchronization.

## Validation status

The included test suite passed 4,400 games and over 9.9 million assertions. Equal 75-rated teams on a neutral field yielded 51.2% home-designated wins. A 95-rated home team versus a 60-rated visitor won 94.3%; the reverse strong-away matchup won 92.8%. Tests cover varied weather, strategies, 10/20/25-yard overtime starts and forced-two settings. Extreme 1-vs-99 tests can produce exceptional blowouts (maximum 117 in this run); there is no artificial score cap or mercy clock.

The nine graphic contracts verify exact dimensions, scores, team names, logo inputs and winner label. GitHub Actions also passed real Chromium smoke testing: SVG logo upload/rasterization, manual ratings, pause/resume, score agreement, play-log filters, statistics, saved-game reloads, nine actual PNG downloads and 390px mobile overflow checks. Desktop, mobile and sample graphic screenshots were inspected. The tested game used seed 166 and finished 7–10. The `browser-results` workflow artifact contains screenshots, generated graphics and the report. This is automated Chromium coverage, not exhaustive cross-browser or iOS-device certification.

The workflow is pinned to Ubuntu 22.04 for compatibility with its Playwright version.

The app uses Google Fonts when reachable and system fallbacks otherwise. All game logic, logo processing and score rendering run locally.
