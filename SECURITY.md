# Security

Space Radar is a static website: no accounts, no server-side code, no database, no cookies of its
own. The things that can still go wrong are worth reporting all the same, for example:

- script injection through data the page displays (a satellite's name, a launch description, a
  crafted share link);
- anything that would send a visitor's location or other personal data somewhere it should not go;
- a flaw in the deploy or harvest scripts (`scripts/`, `harvest/`, `notify/`) that could expose a
  bucket or a secret;
- a vulnerable version of a vendored library in `site/vendor/`.

## Reporting

**Please do not open a public issue for a security problem.** Use GitHub's private reporting form:

**[Report a vulnerability](https://github.com/Sara-Managed-Projects/space-radar/security/advisories/new)**
(the repository's *Security* tab → *Report a vulnerability*).

Say what you found, how to reproduce it, and what you think the impact is. You will get an answer
there within a week. Once a fix is released we credit the reporter in the advisory and the
changelog, unless you would rather not be named.

## What the repository's automation may do

Workflows use no secret besides `GITHUB_TOKEN` on pull requests. A pull request from a fork runs
CI with a read-only token, and a first-time contributor's run waits for a maintainer's approval.
The one workflow that runs with a writing token on a fork's pull request
(`.github/workflows/community.yml`, which labels and welcomes) checks out nothing and runs no
shell. If you find a way round any of that, it is a security report.

## Supported versions

The live site and the latest release are supported. Older release zips are not patched; download
the newest one.
