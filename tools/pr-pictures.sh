#!/usr/bin/env bash
# Put pictures into a pull request's description from the command line.
#
#   tools/pr-pictures.sh <PR number> [--title "Before and after"] picture.png[="caption"] ...
#
# WHY. A pull request that changes what is drawn owes a picture (scripts/pr_pictures.py). A person
# drags a screenshot into the description on GitHub; a script or an agent cannot. This shrinks each
# picture to 1400 px (a JPEG of a few hundred kB), keeps it on the branch `screens` of this
# repository under pr/<number>/, and adds a "## Pictures" section to the description with each one
# shown and captioned. Run it again with the whole list: the pictures and the section are replaced.
#
# The branch `screens` holds pictures and nothing else, is never merged, and has no history worth
# keeping; raw.githubusercontent.com serves it. Needs: git, gh (signed in, able to push), and
# `sips` (macOS) or ImageMagick's `magick`/`convert`.
set -euo pipefail
[ $# -ge 2 ] || { sed -n '2,15p' "$0"; exit 2; }
PR="$1"; shift
TITLE="Pictures"
if [ "${1:-}" = "--title" ]; then TITLE="$2"; shift 2; fi
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
ROOT=$(git rev-parse --show-toplevel)
WORK=$(mktemp -d)
trap 'git -C "$ROOT" worktree remove --force "$WORK/tree" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

if git -C "$ROOT" ls-remote --exit-code --heads origin screens >/dev/null 2>&1; then
  git -C "$ROOT" fetch -q origin screens
  git -C "$ROOT" worktree add -q --detach "$WORK/tree" FETCH_HEAD
else
  git -C "$ROOT" worktree add -q --detach "$WORK/tree"
  git -C "$WORK/tree" checkout -q --orphan screens-new
  git -C "$WORK/tree" rm -rfq . >/dev/null 2>&1 || true
  printf 'Pictures for pull requests (tools/pr-pictures.sh). Never merged.\n' > "$WORK/tree/README.md"
  git -C "$WORK/tree" add README.md
fi
rm -rf "$WORK/tree/pr/$PR"   # run again, the pull request's pictures are replaced
mkdir -p "$WORK/tree/pr/$PR"

shrink() {  # in, out
  if command -v sips >/dev/null 2>&1; then
    sips -s format jpeg -s formatOptions 82 -Z 1400 "$1" --out "$2" >/dev/null
  elif command -v magick >/dev/null 2>&1; then
    magick "$1" -resize '1400x1400>' -quality 82 "$2"
  else
    convert "$1" -resize '1400x1400>' -quality 82 "$2"
  fi
}

SECTION="$WORK/section.md"
printf '## %s\n\n' "$TITLE" > "$SECTION"
n=0
for arg in "$@"; do
  n=$((n + 1))
  file="${arg%%=*}"; caption=""
  [ "$arg" != "$file" ] && caption="${arg#*=}"
  [ -f "$file" ] || { echo "no such picture: $file" >&2; exit 2; }
  # Numbered: a before and an after are usually the same file name from two runs.
  name=$(printf '%02d' "$n")-$(basename "${file%.*}" | tr -c 'A-Za-z0-9._-' '-' | sed 's/-*$//').jpg
  shrink "$file" "$WORK/tree/pr/$PR/$name"
  url="https://raw.githubusercontent.com/$REPO/screens/pr/$PR/$name"
  [ -n "$caption" ] || caption="${name%.jpg}"
  printf '**%s**\n\n![%s](%s)\n\n' "$caption" "$caption" "$url" >> "$SECTION"
done

git -C "$WORK/tree" add "pr/$PR"
if ! git -C "$WORK/tree" diff --cached --quiet; then
  git -C "$WORK/tree" -c user.name="${GIT_AUTHOR_NAME:-$(git -C "$ROOT" config user.name)}" \
      -c user.email="${GIT_AUTHOR_EMAIL:-$(git -C "$ROOT" config user.email)}" \
      commit -q -m "Pictures for #$PR"
  # Two runs a few seconds apart: the second may have fetched the branch before the first's push
  # was served. Put our commit on top of what is there now and try again.
  for attempt in 1 2 3 4; do
    # A larger post buffer: a dozen pictures are about 5 MB, and the default answers HTTP 400.
    if git -C "$WORK/tree" -c http.postBuffer=157286400 push -q origin HEAD:screens 2>/dev/null; then break; fi
    [ "$attempt" = 4 ] && { echo "could not push the pictures to the branch screens" >&2; exit 1; }
    sleep 3
    git -C "$WORK/tree" fetch -q origin screens
    git -C "$WORK/tree" rebase -q FETCH_HEAD
  done
fi

# The description: everything before an earlier "## Pictures"-style section of ours, then the new one.
gh pr view "$PR" --json body --jq '.body // ""' > "$WORK/body.md"
python3 - "$WORK/body.md" "$SECTION" <<'PY'
import re, sys
body = open(sys.argv[1]).read()
section = open(sys.argv[2]).read().rstrip() + "\n"
mark = "<!-- pr-pictures -->"
block = "%s\n%s%s" % (mark, section, mark)
if mark in body:
    body = re.sub(re.escape(mark) + r".*?" + re.escape(mark), lambda m: block, body, count=1, flags=re.S)
else:
    # Above the closing attribution line when there is one, else at the end.
    m = re.search(r"\n\s*🤖 Generated with", body)
    body = (body[:m.start()].rstrip() + "\n\n" + block + "\n" + body[m.start():]) if m else (body.rstrip() + "\n\n" + block + "\n")
open(sys.argv[1], "w").write(body)
PY
gh pr edit "$PR" --body-file "$WORK/body.md" >/dev/null
echo "pictures in #$PR: $(grep -c '^!\[' "$SECTION")"
