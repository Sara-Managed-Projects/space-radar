# Tasks

1. [ ] Progress while paused: stop hiding `.sr-trip__progress` on `phase === 'paused'`; keep the
       pause chip; adjust bottom-bar CSS so count + chip fit at 390 px and 1280 px without
       burying the Pause/Back/Next row.
2. [ ] Copy: `stopOf` → `stop {n} of {count}`; keep `liveLabel` / `docTitle` consistent; confirm
       `scripts/check_copy.py` stays clean.
3. [ ] Regression tests for pause (including clock-owning trips), back, next, and the paused
       counter text / visibility.
4. [ ] Headless Chrome acceptance on desktop and phone: pause, step back/forward, read
       `stop N of M` while paused, resume; Escape leave unchanged.
5. [ ] Implement PR notes that the daily round filed this with nobody clicking, and that Pause /
       Back / Next were already on `main` — this card only closes the paused-counter and wording
       gaps (plus tests). Do not touch `README.md`.
