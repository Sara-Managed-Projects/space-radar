# Your first pull request, in ten minutes

This page takes you from a fork to an open pull request. It assumes nothing about three.js or
about this codebase. If a step here is wrong or unclear, that is a bug: open an issue or fix the
page.

## Pick a task (2 minutes)

There are a few hundred open starter issues, which is more than anyone should read. Do not scroll
the whole label: choose by what you like doing. Each link below lists only the issues nobody has
started (open, nobody assigned, no pull request linked, not reserved for a maintainers' batch with
the `sara:doing` label), so whatever it shows is free to take.

| If you like | Track | A typical task | You need |
|---|---|---|---|
| Checking a number against its source | [data](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Adata) | Name the page and the day a figure was read, in one YAML comment. | A browser. The pencil on GitHub is enough. |
| Tidying words and comments | [docs](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Adocs) | Fix a comment that points at a file which has moved. | A browser. |
| Writing a test | [tests](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Atests) | Pin what one small function returns, in a new test file. | Node 22 or a Codespace. |
| Small code changes | [code](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Acode) | Make a script answer `--help` instead of printing a traceback. | Python 3 or Node 22. |
| CSS and how things look | [ui](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Aui) | Put one spacing value on the 4 px grid. | A browser to look at it. |
| Keyboard and screen-reader use | [accessibility](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Aaccessibility) | Give one control a visible focus mark. | A browser and a keyboard. |
| Making something you can see | [lab](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Alab) | Build one small simulator in one HTML file. | A browser. No libraries. |
| Wording for translators | [translation](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Atranslation) | Move a sentence out of code into the copy file. | Node 22 or a Codespace. |
| Astronomy and teaching | [teaching](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Ateaching), [astronomers](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Aastronomers), [trips](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing+label%3Atrack%3Atrips) | Add a glossary word, or correct a fact on a trip card. | A source you have read. |

Every one of them names the file, the change, the check to run and a "Done when" line.
[All of them, every track](https://github.com/Sara-Managed-Projects/space-radar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee+-linked%3Apr+-label%3Asara%3Adoing), if you do want the whole list.

**You do not need to ask before you start.** Whoever opens the pull request first has the issue.
So, to save yourself and the next person from doing the same work twice:

- **Reserved means taken.** An issue that carries `sara:doing` is already being built by the
  maintainers: pick another. A comment saying which issue you are starting is welcome, and the
  maintainers' own batches leave alone any issue with an outside comment or an assignee.
- **Look before you start.** On the issue page, the right-hand column has a "Development" box. If
  a pull request is linked there, somebody is on it: go back and pick another. The links above
  already leave those out.
- **Say it is taken by opening your pull request early**, as a draft, with `Closes #<the issue's
  number>` in the description. GitHub then shows it on the issue, and the links above stop listing
  it. A comment on the issue is welcome too, and is not needed.
- **One issue per pull request, and one or two open at a time.** Many of these come in families
  (the same change for each planet, say). Take one, see it merged, then take the next: that leaves
  a first task for the next newcomer, and each of yours gets a proper review.
- **If the issue turns out to be wrong or already fixed**, say so in a comment on it. That is a
  contribution too: a starter issue that is no longer true wastes the next person's evening.

## 1. Get a copy (2 minutes)

**In the browser, nothing installed:** press **Code > Codespaces > Create codespace** on the
repository page. The container in `.devcontainer/devcontainer.json` has Python, PyYAML and Node,
and prints the two commands below when it is ready.

**On your own machine:** fork the repository on GitHub, then

```bash
git clone https://github.com/<you>/space-radar.git && cd space-radar
git checkout -b my-change
python3 -m pip install pyyaml        # the only dependency of the checks
```

You need Python 3.9 or newer. Node 22 or newer is optional: three of the checks use it, and CI
runs them for you if you do not have it. There is no `npm install` and no build step.

## 2. Run it (1 minute)

```bash
python3 -m http.server 8177 --directory site     # open http://localhost:8177
```

`python3 tools/serve.py site 8177` does the same with a threaded server, which loads faster. The
page you see is the files in `site/` as they are. Edit a file, reload, and the change is there.
If a page ever looks stale, open it once with `?sw=0` to remove the service worker.

## 3. Make the change (5 minutes)

Most first changes are one row in a YAML file under `registry/`. The browser does not read YAML,
so each registry has a generated copy under `site/js/data/`, written by a script:

```
registry/aliases.yaml  ->  python3 scripts/gen_aliases_js.py  ->  site/js/data/aliases.js
```

The rule:

> Edit the YAML, run its generator, commit both files. Never edit a file that says GENERATED.

The generator for `registry/<name>.yaml` is usually `scripts/gen_<name>_js.py`. If you are not sure
which one to run, `scripts/check.sh --fix` runs them all, and a failed check prints the exact command.

[docs/ARCHITECTURE.md](ARCHITECTURE.md) is a one-page map: where a trip, a card, a world, a model
and a data source live, and which file to edit for the twelve commonest changes.

## 4. Check it (under a minute)

```bash
scripts/check.sh
```

It runs the checks a first pull request meets, in parallel: the registry validator, the
copy check, every generator's `--check`, and a few fast tests. It prints `ok` or `FAIL` per item,
and for each failure the last lines of its output and what to do. On Windows, run it from Git
Bash, or use the Codespace.

`scripts/test.sh` runs everything CI runs and takes several minutes. You do not need it for a
first pull request; CI is the gate.

## 5. The CI failures newcomers meet, and their fixes

These come from the first outside pull requests and from the project's own history.

| CI says | Why | Fix |
|---|---|---|
| `... mirror matches the registry` is red, with `... is STALE` | You edited `registry/*.yaml` and did not regenerate. | `scripts/check.sh --fix`, then commit the generated file too. |
| `Registries validate` is red | A row breaks a rule. The commonest: a fact with no source. | Read the message: it names the file, the row and the rule. Add the source (a URL and the date you read it) to the row. |
| `A line of chrome is one line ...` is red | A string in `site/js/copy/en.js` is longer than 60 characters where it is drawn (90 for a tooltip). | Shorten the string the message names. |
| `No user-visible string outside copy/en.js` is red | A sentence a visitor reads was written inside UI code. | Move it to `site/js/copy/en.js` and read it from `COPY`. |
| `tests/test_<name>.mjs is run by no step of .github/workflows/ci.yml` | You added a test file. CI lists its steps by hand. | Add a step to `.github/workflows/ci.yml`: a `name:` saying why the test exists, and `run: node tests/test_<name>.mjs`. |
| `Every trip stop has its narration ...` is red | You changed a trip card's words. The voice is made from them with a speech model. | Nothing. Say so in the pull request; a maintainer renders the voice onto your branch. |

The last row is the only red check you may leave red.

## 6. Open the pull request

```bash
git add -A && git commit -m "Search finds Polaris when you type north star"
git push -u origin my-change
```

Open the pull request on GitHub. The title becomes the changelog line, so say what changed for a
visitor. Write `Closes #123` in the description if it fixes an issue.

## 7. What happens next

1. **Your first CI run waits for a maintainer.** GitHub does not run workflows from a first-time
   contributor's fork until a maintainer presses "Approve and run". You will see "workflows
   awaiting approval". This is normal. It is not a problem with your change, and you do not need
   to do anything. **Please do not close the pull request while it waits.** We aim to approve
   within a day. After your first merged pull request, CI runs on its own.
2. A bot adds labels by the paths you touched and posts a short welcome.
3. A maintainer replies within 48 hours.
4. When every check is green and the pull request is not a draft, it is squash-merged
   automatically. If you want a person to look before it merges, open it as a draft and say so.
5. You are named in the release notes for the release that carries your change, and in
   [CONTRIBUTORS.md](../CONTRIBUTORS.md).

If a day passes and nothing has happened, comment on the pull request. That notifies us, and it
is welcome.

## More

- [CONTRIBUTING.md](../CONTRIBUTING.md): recipes for a trip, an object and a data layer, the style
  and the honesty rules.
- [docs/CONTRIBUTE_WITHOUT_CODE.md](CONTRIBUTE_WITHOUT_CODE.md): fix a fact, translate, add a sky
  culture, a trip stop or a model credit.
- [GOVERNANCE.md](../GOVERNANCE.md): who decides, and how a contributor becomes a reviewer.
