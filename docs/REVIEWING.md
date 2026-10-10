# Reviewing: a checklist for maintainers and agents

A stranger's first pull request is the most fragile thing in this repository. One was closed by
its author on 2026-10-09 because its CI run sat unapproved for five hours
([#561](https://github.com/Sara-Managed-Projects/space-radar/pull/561)). This page exists so that
does not happen again.

## Start of every session

```bash
scripts/pending_contributions.sh
```

It lists workflow runs awaiting approval, open pull requests from forks, and issues from outside
people that no maintainer has answered. Clear that list before any other work.

## A pull request from a fork

1. **Read the diff first.** Approving a run executes the fork's code on our runners. Look for
   changes under `.github/workflows/`, `scripts/` and `tests/` that do something other than what
   the description says. CI has `contents: read` and no secrets, so the risk is small, but read.
2. **Approve the run.** On the pull request, press "Approve and run", or
   `gh run list --status action_required` then `gh api -X POST repos/Sara-Managed-Projects/space-radar/actions/runs/<id>/approve`.
   Within a day of the pull request opening. Sooner is better.
3. **Reply within a day**, by name, even if only to say when you will look properly.
4. **If a check is red, say which and why**, in words the author can act on. Link the row of the
   table in [docs/FIRST_PR.md](FIRST_PR.md) if it is one of those.
5. **If the red check is the narration** (`scripts/narrate.py --check`), the author cannot fix it.
   Render the voice onto their branch yourself (forks allow maintainer pushes by default), or
   merge their words in a pull request of your own that credits them with `Co-authored-by`.
6. **Merge small pull requests fast.** A green, non-draft pull request merges on its own. Do not
   ask for a rewrite of something correct. If you want a change of taste, merge and follow up.
7. **Thank the author by name** when it merges, and say when it will be on the live site.
8. **Close the issue it fixes** if `Closes #n` did not, and check whether the next
   [good first issue](https://github.com/Sara-Managed-Projects/space-radar/labels/good%20first%20issue)
   is still true.

## What to check in the change itself

- A new fact has a source and a date in its row. Open the source and read the number.
- A new asset has a licence that is not non-commercial, and a line in `CREDITS.md`.
- New words a visitor reads are in `site/js/copy/en.js`, in plain words and sentence case.
- A registry change comes with its generated file.
- A new test file has a step in `.github/workflows/ci.yml`.
- Nothing grows the first visit: new code for an optional layer loads with a dynamic `import()`.

## An issue from outside

- Reply within 48 hours. Thank them, and say what happens next.
- If it is a wrong fact with a source, fix it or label it `good first issue` with the file, the
  change, the check and a "Done when" line.
- If someone says they would like to take an issue, say yes at once. Do not assign and wait:
  whoever opens the pull request first has it.

## Keeping the newcomer queue honest

- Every `good first issue` is true of `main` today, names exact files, has a "Done when" line and
  names the check to run. When a pull request merges, re-read the others that touch the same file.
- Keep between 20 and 30 open. When the count drops, read the code and the tests for real small
  work. Do not invent tasks.

## Releases

`scripts/release_thanks.py` writes the "Thanks" section of the release notes from the pull
requests merged since the last tag; the release workflow calls it. `CONTRIBUTORS.md` is rewritten
weekly by `.github/workflows/contributors.yml`.
