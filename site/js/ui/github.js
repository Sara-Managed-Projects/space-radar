// ui/github.js -- the GitHub mark in the top corner.
//
// Contract export: createGitHubMark(): void
//
// One quiet link to the repository, and nothing else. The owner looked at an elaborate drawing
// and asked for "just a github logo and link on the repo", so this is deliberately small: the
// mark GitHub itself publishes, at 22 px, inside a 44 px tap target, in the app's dim text
// colour until you point at it.
//
// THE GLYPH IS NOT OURS AND IS NOT REDRAWN. The path below is `icons/mark-github-24.svg` from
// GitHub's own primer/octicons, copied byte for byte -- the file at `primer/octicons@main` whose
// git blob sha is 81949e7b460a7bbf1cb2431462f6bd947e32f0ce, measured on 2026-09-07, not recalled.
// GitHub's brand guidelines permit using the mark unmodified to link to GitHub; they do not
// permit altering it. Recolouring via `fill: currentColor` is what the published file already
// asks for (it carries no fill of its own) and is not an alteration of the shape. Do not edit
// this path, do not add anything beside it, and keep CREDITS.md section 4.6 saying so.
//
// The href and both strings come from copy/en.js, like every other user-visible thing here.

import { COPY } from '../copy/en.js';

const HOST_ID = 'sr-mark';
const SVG_NS = 'http://www.w3.org/2000/svg';

// GitHub's mark-github-24, verbatim. See the note above before touching it.
const INVERTOCAT_24 =
  'M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943';

export function createGitHubMark() {
  if (document.getElementById(HOST_ID)) return;

  const a = document.createElement('a');
  a.id = HOST_ID;
  a.className = 'sr-mark';
  a.href = COPY.mark.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = COPY.mark.title;
  // The glyph carries no text, so the link needs a name of its own. `title` is a description and
  // is not reliably the name; aria-label is.
  a.setAttribute('aria-label', COPY.mark.label);

  // createElementNS and not innerHTML, which nothing in site/js/ui/ uses.
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', INVERTOCAT_24);
  p.setAttribute('fill', 'currentColor');
  svg.appendChild(p);
  a.appendChild(svg);

  document.body.appendChild(a);
}
