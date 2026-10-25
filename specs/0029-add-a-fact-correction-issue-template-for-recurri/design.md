# 0029 — The fact-correction form is already in the chooser — design

## What is wrong

The card asks for a form. The form landed in #463 on 5 Oct, five days before the card.
#565, which the round cited, added `classroom.yml` and `translation.yml`. The correction form
was already in the directory.

```
New issue
    data-accuracy.yml
        name: A number, name or position is wrong
        labels: bug, area:space-accuracy
        object, says, truth     required
        when                     optional
        paragraph from #598      registry row, check.sh, a report is enough

#553 moon-landings trip
#547 ten exoplanet rows
#542 Chang'e 4 coordinates
    Why / Where / What to change / How to check / Done when
```

`tests/test_community_files.py` counts the yml files in the directory, skips `config.yml`, and
requires 7. One more file makes 8, and that test fails.

## What the next turn does

Read the file, count the forms, then close or restore. No new template.

1. On current `main`, read `.github/ISSUE_TEMPLATE/data-accuracy.yml`. Check the name, the
   labels, and the four ids.
2. Count the yml files besides `config.yml`. Expect 7, including `data-accuracy.yml`.
3. Confirm the five files still contain `template=data-accuracy.yml`.
4. If steps 1–3 hold: change no template and no test. Close #577. The comment states the name,
   the file, #463's date, and whether the chooser page was opened. On 25 Oct it was not.
5. If the file is missing, or the name or the ids differ: restore the file from `f2065e01`.
   Do not add another yml. Repeat steps 1 and 2. Then close #577.
6. Open the chooser in a signed-in session if one exists. If the name is absent while the file
   matches R1, leave #577 open and paste what the page showed. The close in step 4 does not
   wait on that session: this host received only the sign-in page.

## Risks

- **The close has not seen the chooser.** GitHub builds that page from the default branch.
  This file is on it, and the test parses it as a form. The page itself was the sign-in screen.
  Step 6 is the look that would change the conclusion.
- **An eighth form fails the count.** The exit criterion is met by this file. A second
  correction form splits the address the README already publishes.
- **The review issues are a different job.** They ask someone to compare a set of rows. Folding
  one into `object` / `says` / `truth` drops the file paths and the commands. Leave them.
- **Pillow.** On this host the community test exits 1 on the preview import. The form checks
  had already added no line. Leave Pillow and `build_social_preview.py` alone for this card.
