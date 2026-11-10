# Phase 3 manual test — exercise library

A full click-through of [PR #52](https://github.com/BobbyJoeCool/FitIQ/pull/52) before you merge it. It covers 3.2 (#18), 3.4 (#20), 3.5 (#21) and 3.6 (#22), plus a regression pass on the earlier phases.

**How it works.** The live site only gets Phase 3 when the PR merges, so parts A to M run the `phase-3` branch **locally against the hosted Supabase project**. Part N is a short re-check on the live site after the merge. The migration only adds a table, so pushing it before the merge doesn't affect the live site.

Tick each box as you go. If a step fails, write what you saw under it, stop, and don't merge.

**Time:** about 60 to 90 minutes.

## What you need

- The two **test** accounts from the RLS test (A and B), with their passwords. Don't use family accounts.
- Desktop Chrome or Edge (DevTools steps below use Chrome's names), plus a second browser or a private window for account B.
- Your phone, on the same Wi-Fi as your Mac.
- A YouTube video URL you like for exercise demos (any public video works).

## Part A — Database and RLS

1. Switch to the branch and install:

   ```sh
   git switch phase-3 && git pull
   npm install
   ```

2. Push the migration to the hosted project:

   ```sh
   npm run db:push
   ```

   - [x] It lists `20261109000000_custom_exercises.sql` and applies it with no error (answer `Y` when it asks).

3. In the Supabase dashboard:

   - [x] **Table Editor** shows a `custom_exercises` table.
   - [x] **Authentication → Policies**, on `custom_exercises`: RLS is **enabled**, with three policies (select, insert, update) and **no delete** policy.

4. Run the RLS test:

   ```sh
   npm run test:rls
   ```

   - [x] It prints a `profiles` section and a `custom_exercises` section, every line `PASS`, and ends with `All checks passed.`
   - [x] **34** checks in total (there were 17 before Phase 3).

   The test creates one archived exercise, "RLS test exercise", for each test account. You'll see it later as "Show archived (1)". That's expected.

5. Make sure `.env` points at the **hosted** project (not `127.0.0.1`), then start the app:

   ```sh
   npm run dev -- --host
   ```

   `--host` also serves the app on your Wi-Fi address for the phone test in Part M. Vite prints both URLs.

   - [x] <http://localhost:5173> shows the sign-in screen.

## Part B — Regression: earlier phases still work

Sign in as **account A**.

- [x] Sign-in works, and the dashboard shows **Database: connected** and **Units: lb, in**.
- [x] Every link in the top navigation opens its page. Pages from later phases still show their placeholder.
- [x] A made-up address such as <http://localhost:5173/nope> shows the "not found" page, with a way back.
- [x] DevTools **Console** (Cmd+Option+J) shows no red errors.

## Part C — The library loads (3.2, #18)

1. Open DevTools → **Network**, with **Disable cache** unticked. Type `exercises` in the filter box.
2. Click **Exercises** in the navigation.

- [x] You see "Loading exercises…" briefly, then a list.
- [x] The count line reads **876 of 876 exercises**, and **Show archived (1)** appears next to it.
- [x] Network shows **one** request for `exercises.json` from `cdn.jsdelivr.net`, with `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5` in its URL, status 200.
- [x] Thumbnails load as you scroll, not all at once. Clear the Network filter and scroll: image requests appear as cards come into view.
- [x] Each card shows a name, primary muscles · equipment, and a difficulty badge.

**Caching:**

- [x] Go to Dashboard, then back to Exercises. The list appears at once, and **no** new `exercises.json` request shows (it's kept in memory).
- [x] Reload the page (Cmd+R) and go to Exercises. `exercises.json` shows **(disk cache)** or **(memory cache)** in the Size column, not a full download.

## Part D — Search (3.4, #20)

Type in **Search**:

| Type this | Expect | OK |
| --- | --- | --- |
| `squat` | **56 of 876 exercises**, with a **Show more (16 left)** button under the first 40 | [ ] |
| `SQUAT` | Same 56 (case doesn't matter) | [ ] |
| `squat barbell` | Includes **Barbell Squat** (words match in any order) | [ ] |
| `  squat  ` (spaces around it) | Same 56 | [ ] |
| `zzzz` | "No exercises match", with a **Clear filters** button | [ ] |

- [x] With `squat` searched, **Show more (16 left)** shows the last 16, and the button disappears.
- [x] While you type, the URL changes to `?q=...`.
- [x] Changing the search after **Show more** resets the list to 40 again.
- [x] **Clear filters** empties the search box, and the count goes back to 876.

## Part E — Filters (3.4, #20)

Start from a cleared search.

- [x] **Muscle**, **Equipment**, **Movement type** and **Difficulty** each have **Any** first, then a capitalized list (for example "Lower back", "E-z curl bar").
- [x] Each filter on its own narrows the count, and its value appears in the URL (`muscle=`, `equipment=`, `type=`, `difficulty=`).
- [x] **Equipment: Kettlebells** plus **Difficulty: Expert** gives **9** exercises.
- [x] Add Search `swing` on top of that: still only kettlebell and expert results, so the filters combine.
- [x] **Muscle** also matches secondary muscles. Pick **Muscle: Glutes**, open a result whose card doesn't list Glutes, and check that the detail page lists Glutes under **Secondary muscles**.
- [x] Copy the URL with filters set, open it in a new tab, and the same filters and results come back.
- [x] The **Clear filters** link under the filters resets every filter and the search at once.
- [x] **Show archived (1)** shows "RLS test exercise" with **Custom** and **Archived** badges. Untick it to hide it again.

## Part F — Catalog exercise detail (3.5, #21)

1. Set **Equipment: Barbell** and search `squat`. Scroll down a little.
2. Click **Barbell Squat**.

- [x] The URL is `/exercises/Barbell_Squat`.
- [x] Name heading with a difficulty badge.
- [x] Facts: Primary muscles, Secondary muscles, Equipment, Movement type, Force, Mechanic. A fact with no value is left out, not shown blank.
- [x] Two images, starting and ending position, which scale to the width of the window.
- [x] **How to do it** with numbered steps.
- [x] No **Video** section (the catalog has no videos).
- [x] At the bottom: "Exercise data and images from Free Exercise DB, The Unlicense." The link opens the GitHub repo in a **new tab**.
- [x] **← Exercises** takes you back with **Equipment: Barbell** and `squat` still set.
- [x] Browser Back (Cmd+[) does the same.

**Exercise with no images:**

- [x] Search `halo`. **Kettlebell Halo** shows a grey "No images" box in place of a thumbnail and a **No demo** badge.
- [x] Its detail page says "This exercise has no images or video." and still shows the facts and steps.

**Direct links and bad IDs:**

- [x] On `/exercises/Barbell_Squat`, reload the page. It loads straight onto the exercise.
- [x] Open `/exercises/Barbell_Squat` in a **new tab**. **← Exercises** goes to the library (with no filters, since there's no history to return to).
- [x] `/exercises/Not_A_Real_Exercise` shows "Exercise not found", with a **Search the library** link that works.

## Part G — Create a custom exercise (3.6, #22)

1. On **Exercises**, click **New exercise**.

- [x] Heading **New exercise**, with "Only you can see the exercises you create." The browser tab says "New exercise · FitIQ".
- [x] **Cancel** returns to the library, and nothing was created.

**Validation.** Open **New exercise** again:

- [x] Click **Create exercise** with everything empty. You see "Give the exercise a name." and "Pick at least one primary muscle.", and nothing is saved.
- [ ] Type only spaces in **Name** and submit. You still see "Give the exercise a name."
- [ ] Try to type more than 80 characters in **Name**. It stops at 80.
- [ ] Tick **Chest** under **Primary muscles**. **Chest** under **Secondary muscles** turns grey and can't be ticked.
- [ ] **Video source name** is hidden until you type something in **Video link**.
- [ ] Put `javascript:alert(1)` in **Video link** and submit. You see "Use a full link starting with https://", and no alert box pops up.
- [ ] Put `youtube.com/watch?v=abc` (no `https://`) and submit. You get the same message.

**A valid exercise.** Fill in:

| Field | Value |
| --- | --- |
| Name | `Test Landmine Press` |
| Primary muscles | Shoulders |
| Secondary muscles | Triceps, Chest |
| Equipment | Barbell |
| Movement type | Strength |
| Difficulty | Intermediate |
| Notes | Two lines of text, with a line break between them |
| Video link | Your YouTube URL |
| Video source name | `Coach's channel` |

- [x] **Create exercise** shows "Saving…", then opens the new exercise at `/exercises/custom/<long id>`.
- [x] It shows a **Custom** badge and an **Intermediate** badge, plus **Edit** and **Archive** buttons.
- [x] The facts match what you entered. **Notes** keeps your line break. There's no "Free Exercise DB" credit line.
- [ ] Browser Back from the detail page goes to the library, **not** back to the form (the form was replaced).

**It shows up in search:**

- [x] Search `landmine`. **Test Landmine Press** appears with a **Custom** badge, and its thumbnail box says "Video".
- [x] It matches **Muscle: Triceps** (secondary), **Equipment: Barbell**, **Movement type: Strength** and **Difficulty: Intermediate**. It disappears with **Difficulty: Beginner**.
- [x] The count went up by one (877 with filters cleared).

**A minimal exercise.** Create `Test Wall Sit` with only **Primary muscles: Quadriceps**:

- [x] It saves. Its detail page shows only Primary muscles, a **No demo** badge, and "This exercise has no images or video."

> [!bug] The back button takes you to the form when you are on the detail page and not the library.  THis happened after I archived the exercise.



## Part H — Video on tap (3.5, #21)

Open **Test Landmine Press**, with DevTools → **Network** open. Type `youtube` in the filter box, then reload.

- [x] Under **Video**: a **Play video** button and an "Open the video on Coach's channel" link.
- [x] **No** requests to `youtube` or `youtube-nocookie` before you tap.
- [x] Tap **Play video**. A player appears in place of the button, loaded from `www.youtube-nocookie.com/embed/...`, and the video plays.
- [x] The player fits the page width and keeps a video shape.
- [x] "Open the video on Coach's channel" opens your YouTube URL in a **new tab**.

**Other link formats.** Use **Edit** to change the video link each time, and check the result:

| Video link | Expect | OK |
| --- | --- | --- |
| `https://youtu.be/<id>` (the share link) | **Play video** works | [ ] |
| `https://www.youtube.com/shorts/<id>` (any Short) | **Play video** works | [ ] |
| `https://vimeo.com/76979871` | **No** Play button, just a link "Open the video on vimeo.com" (or your source name) | [ ] |
| Any link, with **Video source name** cleared | Link text uses the site name, for example "Open the video on youtube.com" | [ ] |

## Part I — Edit (3.6, #22)

On **Test Landmine Press**, click **Edit**.

- [x] Heading **Edit exercise**. Every field is filled with the saved values, and the browser tab says "Edit Test Landmine Press · FitIQ".
- [x] Change the name to `Test Landmine Press Edited` and click **Save changes**. The detail page shows the new name, and so does the library.
- [x] **Edit**, change something, then **Cancel**. You're back on the detail page, and the change was not saved.
- [x] **Edit**, clear **Video link**, and save. The **Video** section is gone, and the source name is cleared too (re-open Edit to confirm).
- [x] **Edit**, then move **Triceps** from secondary to primary by ticking it under **Primary muscles**, and save. It shows only under Primary muscles, not both.
- [x] Reload the page while on `/exercises/custom/<id>/edit`. The form loads again with the saved values.

## Part J — Archive and restore (3.6, #22)

On **Test Landmine Press Edited**:

- [x] **Archive** adds an **Archived** badge and the note "Archived exercises are hidden from search but stay on past workouts." The button now says **Restore**.
- [x] Back in the library, `landmine` finds nothing, and the archived count went up to **Show archived (2)**.
- [x] Tick **Show archived (2)**, and the exercise comes back with an **Archived** badge.
- [x] Open it and click **Restore**. The badge and note disappear, and it shows in normal search again.
- [x] There's no **Delete** button anywhere. That's by design: archive is the only way to remove one in v1.

## Part K — Privacy between accounts (3.6, #22)

Keep account A signed in. In a **private window** (or another browser), sign in as **account B**.

1. In A's window, copy the URL of **Test Landmine Press Edited** (`/exercises/custom/<id>`).

- [x] In B's window, Exercises shows **876 of 876** plus B's own "Show archived (1)". None of A's exercises appear, even with **Show archived** ticked.
- [x] Paste A's exercise URL into B's window. It shows "Exercise not found".
- [x] Add `/edit` to the end of that URL in B's window. It shows "Exercise not found", not a form.
- [x] Try `/exercises/custom/not-a-real-id`. It shows "Exercise not found", not an error.
- [x] As B, create `Test B Exercise` with any muscle, then reload the library as A. A can't see it.
- [x] Sign out of B from **Settings** and close the private window.

## Part L — Errors and slow connections

Signed in as A, with DevTools open.

**The catalog can't load:**

1. In DevTools, open the Command Menu (Cmd+Shift+P), run **Show Network request blocking**, turn it on, and add the pattern `cdn.jsdelivr.net`. Tick **Disable cache** on the Network tab.
2. Reload and go to Exercises.

- [x] It shows "Couldn't load the exercise library" with a message and a **Try again** button. The page doesn't go blank.
- [x] Remove the blocking pattern and click **Try again**. The library loads.

**Slow 3G:**

- [x] Set Network throttling to **Slow 3G**, reload, and open Exercises. "Loading exercises…" shows until the list arrives, with no blank flash or error.
- [x] Open an exercise. The text appears before the images do, and the images fill in without the page jumping around.
- [x] Set throttling back to **No throttling** and untick **Disable cache**.

**Saving while offline:**

1. Open **New exercise** and fill in a name and a muscle.
2. Set throttling to **Offline**, then click **Create exercise**.

- [x] A red error message appears under the form, the button goes back to **Create exercise**, and what you typed is still there.
- [x] Set it back to **No throttling** and click **Create exercise** again. It saves.

## Part M — Phone

On your phone, open the **Network** URL that Vite printed (like `http://192.168.x.x:5173`) and sign in as A.

- [x] Nothing scrolls sideways on the library, a detail page or the form.
- [x] The search box and all four filters are easy to tap, and the phone's picker opens for each filter.
- [x] Cards are easy to tap, and thumbnails look right.
- [x] Detail images fill the width without stretching.
- [x] **Play video** plays in the page, and full screen works.
- [x] The **New exercise** form: muscle checkboxes are easy to hit, and the video field brings up a keyboard with `.com` or `/`.
- [x] The phone's Back gesture from a detail page keeps your filters.
- [x] Rotate to landscape and back. Nothing breaks.

Optional, if you use VoiceOver (Cmd+F5 on the Mac): on **New exercise**, submit empty and move to **Name**. It should read "Name", then the error "Give the exercise a name." as a separate description, not as part of the label.

## Part N — Merge, then check the live site

When A to M all pass:

1. Merge the PR and watch the deploy:

   ```sh
   gh pr merge 52 --merge --delete-branch
   gh run watch
   ```

2. On <https://fitiq.bobbyjoecool.dev>, signed in as a test account:

- [x] Exercises loads, with the right count and your test exercises.
- [x] Open `/exercises/Barbell_Squat` directly in a new tab, then reload it. The exercise loads. One 404 in the console on a direct load is expected: that's GitHub Pages serving its `404.html` fallback.
- [x] One custom exercise opens, and its video plays.
- [x] It works on your phone over cellular (Wi-Fi off).
- [x] Run `npm run test:rls` once more. You should get 34 checks and `All checks passed.`

## Sign-off

Once everything above passes:

```sh
gh issue close 17 18 20 21 22 --comment "Verified by manual test of PR #52 on the live site."
```

Then close the **Phase 3** milestone on GitHub (Issues → Milestones).

**Test data.** The `Test ...` exercises can't be deleted from the app. Archive them. They belong to test accounts only, so they never show to family members.

| Part | Passed | Notes |
| --- | --- | --- |
| A — Database and RLS | | |
| B — Regression | | |
| C — Library loads | | |
| D — Search | | |
| E — Filters | | |
| F — Catalog detail | | |
| G — Create | | |
| H — Video | | |
| I — Edit | | |
| J — Archive | | |
| K — Privacy | | |
| L — Errors | | |
| M — Phone | | |
| N — Live site | | |
