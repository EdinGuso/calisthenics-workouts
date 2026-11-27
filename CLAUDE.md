# calisthenics-workouts

Offline training log as a progressive web app. Plain HTML, CSS and JavaScript served by GitHub
Pages from `main`. All data lives in the browser's `localStorage`; there is no backend.

## Files

- `index.html`: markup; `css/app.css`: styles; `js/`: ES modules, entry point `js/main.js`.
  `weeks`, `targets`, `milestones`, `chart` and `config` hold the logic and never touch the DOM.
- `sw.js`: service worker, stale-while-revalidate cache of every served file (`FILES`).
- `manifest.webmanifest`, `icon-*.png`: home-screen install.
- `test/`: `node --test "test/*.test.js"` (or `npm test`), synthetic fixtures only. CI runs it on
  every push and pull request.

## Workflow

- Never commit or push to `main`. It deploys straight to users' devices.
- One branch per change. Push the branch and open a pull request; `main` changes only by merge.
- Commit messages and PR titles follow Conventional Commits 1.0.0.

## Constraints

- No build step, framework, package dependencies or backend. Keep it that way.
- Backward compatibility: existing users' progress must never break or look discontinuous after
  an update. Do not add code for hypothetical legacy data; any change to the stored format needs
  an explicit, agreed migration.
- Bump `CACHE` in `sw.js` whenever the cached file list changes. Because the cache is
  stale-while-revalidate, a reload can serve the previous version: hard-reload or unregister the
  service worker when previewing.

## Privacy

- Never commit personal, health or preference data about any user: no body measurements, health
  conditions, routines, locations, training numbers or exported data files.
- Test fixtures and screenshots use synthetic data only.
- Personal context for agents lives only in the git-excluded `CLAUDE.local.md`.
