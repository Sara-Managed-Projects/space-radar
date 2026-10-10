#!/usr/bin/env bash
# What is waiting on a maintainer, in one screen. Run it at the start of every session.
#
#   scripts/pending_contributions.sh
#
# Lists (1) workflow runs awaiting approval, which is where a first-time contributor's pull request
# sits until someone presses "Approve and run"; (2) open pull requests from forks, with their age
# and whether a maintainer has said anything; (3) open issues written by someone outside that no
# maintainer has answered. One first pull request was closed by its author on 2026-10-09 after
# five hours in (1) with nobody looking; this is the look. docs/REVIEWING.md says what to do with
# each line.
#
# Needs the GitHub CLI, signed in (`gh auth status`). Reads only. The exit status is 1 when
# anything is waiting, so a script can use it as a gate.
set -u
REPO="${REPO:-Sara-Managed-Projects/space-radar}"
# The accounts GOVERNANCE.md names. Override with MAINTAINERS="a b c" for a fork.
MAINTAINERS="${MAINTAINERS:-ionesu Sara-Agent}"
command -v gh >/dev/null 2>&1 || { echo "the GitHub CLI is not on PATH: https://cli.github.com"; exit 2; }
# A jq array literal, built here because `gh --jq` takes no --arg and jq itself may not be installed.
M_JSON="[$(printf '"%s",' $MAINTAINERS | sed 's/,$//')]"
WAITING=0

echo "== Workflow runs awaiting approval (approve after reading the diff)"
# A run for a pull request that has since been closed stays "awaiting approval" for ever, so only
# the runs on an open pull request's head commit are listed.
HEADS="$(gh pr list --repo "$REPO" --state open --limit 100 --json headRefOid --jq '[.[].headRefOid] | join(" ")' 2>/dev/null)"
HEADS_JSON="[$(printf '"%s",' $HEADS | sed 's/,$//')]"
RUNS="$(gh api "repos/$REPO/actions/runs?status=action_required&per_page=100" \
  --jq '.workflow_runs[] | select(.head_sha as $s | '"$HEADS_JSON"' | index($s)) | "  run \(.id)  \(.name)  branch \(.head_branch)  by \(.actor.login)  since \(.created_at[0:16])\n    approve: gh api -X POST repos/'"$REPO"'/actions/runs/\(.id)/approve"' 2>/dev/null)"
if [ -n "$RUNS" ]; then echo "$RUNS"; WAITING=1; else echo "  none"; fi

echo
echo "== Open pull requests from forks"
PRS="$(gh pr list --repo "$REPO" --state open --limit 100 \
  --json number,title,author,createdAt,isCrossRepository,isDraft,comments,reviews,statusCheckRollup \
  --jq "$M_JSON"' as $m | .[] | select(.isCrossRepository) |
    ([.comments[].author.login, .reviews[].author.login] | map(select(. as $a | $m | index($a))) | length) as $answers |
    ([.statusCheckRollup[] | select(.conclusion == "FAILURE")] | length) as $red |
    ([.statusCheckRollup[]] | length) as $checks |
    "  #\(.number)  @\(.author.login)  opened \(.createdAt[0:16])\(if .isDraft then "  draft" else "" end)  \(if $checks == 0 then "NO CHECKS HAVE RUN (approve the run)" elif $red > 0 then "\($red) red check(s)" else "checks ok or running" end)  \(if $answers == 0 then "NOT ANSWERED" else "answered" end)\n    \(.title)"' 2>/dev/null)"
if [ -n "$PRS" ]; then echo "$PRS"; WAITING=1; else echo "  none"; fi

echo
echo "== Open issues from outside that no maintainer has answered"
ISSUES="$(gh issue list --repo "$REPO" --state open --limit 200 --json number,title,author,createdAt,comments \
  --jq "$M_JSON"' as $m | .[] | select(.author.login as $a | ($m | index($a)) | not) |
    select(([.comments[].author.login] | map(select(. as $a | $m | index($a))) | length) == 0) |
    "  #\(.number)  @\(.author.login)  opened \(.createdAt[0:16])\n    \(.title)"' 2>/dev/null)"
if [ -n "$ISSUES" ]; then echo "$ISSUES"; WAITING=1; else echo "  none"; fi

echo
if [ "$WAITING" = 1 ]; then echo "Something is waiting on a maintainer. docs/REVIEWING.md says what to do."; exit 1; fi
echo "Nothing is waiting."
