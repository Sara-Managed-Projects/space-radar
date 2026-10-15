<!-- Thank you! The title becomes the changelog line: say what changed for a visitor. -->

## What changed

<!-- One or two sentences. Link the issue: "Closes #123". -->

## How I checked it

<!-- The tests you ran and what you looked at in the browser.
     A CHANGE TO WHAT IS DRAWN (a model, a map, a world, a shader) NEEDS A PICTURE HERE: drag a
     screenshot from the app into this box. A before and an after is best. The `pictures` check is
     red without one once the pull request is ready (CONTRIBUTING.md, "Pull requests", says why and
     how to get a picture without a fast machine). -->

## Checklist

- [ ] `scripts/check.sh` passes (or I say below which check is red and why)
- [ ] If I edited `registry/*.yaml`, I ran its generator and committed the generated file too
- [ ] New words a visitor reads are in `site/js/copy/en.js`
- [ ] New facts carry a source; new assets carry a licence and a line in `CREDITS.md`
- [ ] Adds, moves or removes a main feature (a rail button, a sidebar tab, a mode, a big control)?
      Then the tour is updated: `registry/onboarding.yaml` (CONTRIBUTING.md, "keep the tour")
- [ ] For a visible change: I read `docs/DESIGN_PRINCIPLES.md` and put a picture from the app above
      (required when a model, a map or anything under `site/js/scene/` changed; a maintainer may
      set the label `no-visual-change` when nothing a visitor sees can have changed)

<!-- First pull request here? Your CI run waits for a maintainer to approve it. That is normal:
     please do not close the pull request while it waits. docs/FIRST_PR.md has the details.
     A green pull request that is not a draft is merged automatically. Keep it a draft until it is
     ready to ship. A new trip may leave the picture and narration checks red: say so here. -->
