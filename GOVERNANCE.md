# Governance

Space Radar is a small project. This page says who decides, how you gain a say, and which rules
are not up for a vote.

## Who decides

- **Maintainers** have write access. Today they are [@ionesu](https://github.com/ionesu) (Ivan
  Sushkov, who started the project and has the final word) and
  [@Sara-Agent](https://github.com/Sara-Agent), an account operated by AI coding agents under
  Ivan's direction. Most commits come from that account, and it is held to the same tests and
  sources as everyone else.
- **Reviewers** are contributors who are asked to look at pull requests in an area they know.
  Their approval counts; a maintainer still merges. There are none yet. You could be the first.
- **Contributors** are everyone who has had a pull request merged, a fact corrected, or a report
  acted on. They are listed in [CONTRIBUTORS.md](CONTRIBUTORS.md).

## How a decision is made

- A small change is decided in its pull request. If the checks are green and it is not a draft,
  it is merged automatically.
- A change to what the product does, a new dependency, a new data publisher or a new licence is
  discussed in an issue first. Anyone may argue a case there. Where people disagree, Ivan decides
  and writes the reason in the issue.
- The direction is in [ROADMAP.md](ROADMAP.md), with a "Not doing" list. To change it, open an
  issue.

## How a contributor becomes a reviewer

1. Have three pull requests merged in one area (for example landing sites, accessibility, trips,
   a language).
2. Ask, in an issue or in Discussions, or be asked.
3. A maintainer adds you to the labels for that area, so pull requests there request your review.

A reviewer who has been active for three months and wants write access can ask for it. Reviewers
and maintainers who go quiet for six months are moved back, with thanks, and can return by asking.

## The honesty rules

These are the project's purpose, so they are not decided case by case. A pull request that breaks
one is not merged, whoever sends it.

1. **Every number has a source.** A fact on a card names where it came from and the day it was
   read, in its registry row. `scripts/check_registry.py` refuses a row without one.
2. **No asset under a non-commercial licence.** No NC-licensed model, picture, map, sound or
   sky culture. Schools, museums and anyone else must be free to run and reuse the whole thing.
   Every asset has its licence and credit line in [CREDITS.md](CREDITS.md).
3. **An artist's impression is labelled as one.** Everything drawn is measured, modelled or
   illustrative, and the card says which. That line is never removed to make a screen prettier.
4. **A missing answer is shown as missing.** The app may say it could not look. It may not show
   an empty sky as the real one.
5. **No personal data.** No accounts and no tracking.

The longer form is in [CONTRIBUTING.md](CONTRIBUTING.md#the-honesty-rules).

## Conduct, security, credit

Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports go through
[SECURITY.md](SECURITY.md). The code is [MIT](LICENSE); by contributing you agree your work is
released under it.
