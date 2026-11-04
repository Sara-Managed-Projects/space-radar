# 0036 — The README's no-build launch, in a clean browser — design

## What is wrong

```
README command  ->  tests/test_nobuild_launch.mjs   every module 200 as JS     no browser
README command  ->  screens.yml shots               screenshots, bytes, drawn   no card, no trip
tools/serve.py  ->  screens.yml ui / trips          cards and trips walked      not the README's server
```

The README's server and the app being used never meet in one run. A file a card or a trip loads
lazily, a JSON the deploy writes, or a read from the live storage that fails silently, all pass
every check above.

## The shape

One script, `scripts/check-nobuild-boot.mjs`, in the house style of `check-ui.mjs`: header says
how to run it, Playwright when present, `--base` optional.

```
read README "Run it in 30 seconds" block  ->  the command (R9)
spawn it from the repo root, port from the command or --port   (R1)
chromium.launch(); browser.newContext()   no storageState      (R2)
record: pageerror, console error, every response, every request host
1. goto /            wait __srLayersReady, drawn check          (R3)
2. search "ISS"      pick row, wait card with the name          (R4)
3. search a trip     press play, wait trip phase != idle + stop title  (R5)
compare records with registry/nobuild-boot.yaml                 (R6, R7)
print phases, times, hosts; exit 1 on any finding
```

When `--base` is given the script does not spawn a server. That is for running it by hand against a
server already up; CI never passes it.

The selectors for search, row, card title and trip state come from the existing UI probe
(`tests/probes/ui_probe.js`) and `site/js/ui/searchrows.js`. Where a stable hook is missing, T3 adds
a `data-` attribute in the UI, not a test-only global.

## The list

`registry/nobuild-boot.yaml`:

```yaml
# Hosts a local copy may reach, and console lines that are known. Each row: why, and an issue.
hosts:
  - host: celestrak.org
    why: satellites; blocked in every CI browser job so a run never spends a visitor's budget
    issue: "#..."
    block: true
console: []
```

`block: true` rows are refused by route, as `check-ui.mjs` does for CelesTrak and Launch Library,
and still count as seen. T1 fills the list from one measured boot, and only with hosts the page
needs for a first visit; each new host is a reviewed row.

## Where it runs

`screens.yml`, job `shots`, after "Serve site/". That job already serves with the README's
command, but the check starts its own server (R1, R9) on a free port so the two never share one.
Same image as the other steps:

```
docker run --rm --network host ... mcr.microsoft.com/playwright:v1.49.1-jammy \
  bash -c 'npm install --no-save --no-audit --no-fund playwright@1.49.1
           node scripts/check-nobuild-boot.mjs'
```

`scripts/check-nobuild-boot.mjs` and `registry/nobuild-boot.yaml` join the job's `paths:` filter, so
a change to the check runs the check (the comment at the top of `screens.yml` says why).

The checkout must be unmodified: the step runs `git status --porcelain` first and refuses if any
earlier step wrote into the tree. The minified tree the byte gate uses is written to
`$RUNNER_TEMP`, so this holds today; the check makes it a rule.

## Rules tested without a browser

The parts that are not the browser are pure functions, tested in `tests/test_nobuild_boot.mjs`
on fixtures and run in `ci.yml`: reading the command from README text, matching records against
the list, and the stale-row rule.

## What it costs

One boot, one card, one trip start: about a minute of software GL on the runner, inside the
`shots` job's existing timeout. No new job, no new image.
