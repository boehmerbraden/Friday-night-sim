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

## Season Mode

Open **Season Mode**, add saved schools (all or selected), create individual schools with logos, or generate fictional schools with a manual rating. **Auto Setup Everything** chooses game counts, weeks and a playoff size; **Start Season** validates the schedule. Ratings and logos are snapshotted for the season and never change automatically.

- Optional divisions and classifications are independent. Neither changes a school's strength. Group names can be renamed; assignments are editable or automatic.
- Even-team schedules select rounds from a round robin, prioritizing groups if requested. Odd-team schedules use an exact-degree cyclic graph and conflict-free week assignment. Home/away totals differ by at most one. Repeats occur only when the requested game count requires another cycle. The generator may require extra weeks for an odd league; **Auto adjust** applies its feasible schedule. This is a heuristic schedule optimizer, not a proof that fewer weeks are impossible.
- Every matchup/week is editable before launch; a completely custom schedule uses the same validation. Multiple games per week require the explicit alternate-rule checkbox. Games per team must match the requested count.
- Sim Current Week animates all games together, with paginated grid or compact scoreboards. Watching one Gamecast does not pause the others. Global speeds are 1/5/10/25/instant; pause and finish-batch controls work while watching. Sim Next Week completes the displayed week and advances the week selector. The regular-season, playoffs, and entire-season shortcuts calculate and persist games without play-by-play animation.
- The existing seeded football engine supplies every score, play, and statistic. Games are computed independently from a hash of season seed and fixture ID, so completion order cannot change outcomes.
- Official standings use win percentage, head-to-head within a fully connected tied group, division percentage when every tied team shares a division, configurable point differential / opponent winning percentage, and a deterministic seeded draw. An optional power-index sort is clearly unofficial.
- Best overall records, group winners plus at-large spots, or a manual field feed **one unified bracket**. After a regular-season-only simulation, seeds can be edited before locking. Sim Entire Season automatically locks an automatic field; manual qualification pauses for selection. Non-power-of-two fields give higher seeds byes. The higher seed hosts, and the championship is neutral.
- Team History derives cumulative records from completed seasons only, deduplicating season and game IDs. Exhibition games remain separate. Byes count as bracket appearances, not victories. Division titles mean the highest official regular-season finisher in each named division. Undefeated seasons include playoffs. Career records include the requested records, playoff appearances, championships, scoring highs, streaks and rating upsets.
- Season Archive opens stored schedules, results and brackets. Run It Back reuses teams, ratings and configuration with a fresh seed and schedule. Templates also retain a custom schedule for repeated setup. New seasons never erase earlier records.
- The championship graphic reuses the Canvas renderer with the actual final game's logos and score, a league title and champion label. Other season games retain the ordinary final-score graphic.

### Storage and performance

The original `friday-night-v1` IndexedDB is unchanged. Season metadata, per-game full event logs, templates and preferences live in `friday-night-seasons`; old exhibition data does not migrate or reset. Each computed result and metadata update is one transaction. Live progress checkpoints every second and on pause. A refresh restores the active season; resume with the relevant week/round control. Another tab cannot concurrently simulate while the Web Locks API is available.

Only active live games and the opened Gamecast keep full histories in memory. Instant simulations yield between games and avoid per-play rendering. Archive metadata is loaded separately from play histories. Browser storage capacity, device speed, logos and league size impose practical limits; this is not a claim of unlimited scale. Saved results stay on this browser/device. Clearing browser data removes them. Standalone game export continues to work, but a season game cannot be reimported as an exhibition.

`node season-tests.mjs` runs complete seasons with 8, 16, 24, 32, 64, 101, 128 and 202 teams, plus 3/5/6/7/12/24/31/63-team playoff fields. It checks exact schedule degree, home/away balance, conflicts, byes, advancement, one champion, point totals, career deduplication, fresh-season isolation and order-independent seeded results. `season-browser.mjs` exercises setup, concurrent live scoreboards, Gamecast switching, refresh recovery, seed review, championship download, career persistence, Run It Back and a 101-team full season in Chromium. CI also retains the original 4,400-game engine suite and original browser tests.
