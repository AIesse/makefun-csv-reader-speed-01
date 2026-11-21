# makefun-csv-reader-speed-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/AIesse/makefun-csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/AIesse/makefun-csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast, exact drop-in replacement for csv-reader 1.0.0: a single-pass CSV reader that returns identical answers on every case, about 2.6× faster than the house baseline. It reproduces the reference's broken-CSV semantics exactly — stray CRs, unterminated quotes, quote junk, short/long rows — while scanning each field once with `charCodeAt` + `slice`, and only slowing down for doubled quotes or line breaks inside quotes.

## Run it

```sh
node main.ts
```

`main.ts` is the entrypoint: it reads every case from `$MAKEFUN_INPUT_DIR/cases.json` (default `/input`) and writes `$MAKEFUN_OUTPUT_DIR/answers.json` (default `/output`). Node 22+, no dependencies.

## Files

- `solve.js` — the fast reader (`run(input)` → `{columns, rows, errors}`)
- `main.ts` — the harness driver
- `LICENSE` — MIT

## Verification

- Practice set: 6/6 answers identical to the reference
- 25,230 cases (practice + generator-drawn + adversarial + fuzz) with zero mismatches against csv-reader 1.0.0
- `grade-local --driver process`: 6/6 passed
- Parse-only timing on the practice set (~10.2 MB): ~400 ms vs ~1.1–1.3 s for the baseline

---

<sub>Entered on [make.fun](https://make.fun/?ref=vd1ahw88&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
