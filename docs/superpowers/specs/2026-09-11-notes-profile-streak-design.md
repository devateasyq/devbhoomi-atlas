# Notes, profile and streak — sub-project 2

**Date:** 2026-09-11
**Status:** approved, ready for planning

## Where this sits

Sub-project 1 delivered optional sign-in and progress sync. It was deliberately
plumbing, and signing in visibly did nothing — a fair criticism, and the gap this
sub-project closes.

It covers what were planned as sub-projects 2 and 3, plus a profile page that was not in
the original decomposition. They belong together: a profile is the natural home for both a
streak and an index of notes.

Public sharing of notes remains sub-project 4, still unbuilt.

## Notes

**One note per record**, not a comment thread. This is annotation of your own revision
material, not a conversation, and a thread is both the wrong shape and far more to build.
Notes attach to any of the 270 records.

**Where:** the foot of the detail panel, below the prose and above "Connected to". The
empty state is a single *Add a note* line that expands into a textarea. Saves on blur and
on an explicit Save. No modal.

**Storage:** a new `hpatlas:notes` key shaped `{recordId: {text, t}}` — deliberately the
same shape as answers, so it merges by the same rule: **most recent wins per record**. It
joins the synced set — `seen`, `quiz`, `pyq`, and now `notes` and `streak`. Device
preferences (`theme`, `mapoff`, `legendopen`) still never sync. Notes work identically
signed out.

### The 1 MB limit, and why notes are capped

A Firestore document has a hard **1 MB** limit, and notes share the user document with
progress. Progress runs to roughly 65 KB, leaving about 900 KB.

**Notes are capped at 1,000 characters each.** 270 records at 1 KB is 270 KB worst case,
comfortably inside. The cap is enforced in the editor with a visible counter, never
silently at save.

The cap is not arbitrary. Without it, someone pasting long passages into dozens of records
would eventually exceed the limit — and Firestore rejects the *whole document write*. Their
quiz progress would silently stop syncing as a result. One oversized field breaks
everything sharing the document.

### Why not a subcollection

`firestore.rules` currently denies everything under `users/{uid}` except the document
itself. A subcollection would need a rules change and a second publish step. Notes stay in
the document, which the cap above makes safe.

## Streak

A day counts when **any one** of these is reached:

- 20 facts seen in Rounds
- 5 quiz questions answered
- 5 past-paper questions answered
- 5 **distinct** records opened — reopening the same record does not count again

Whichever comes first. Each is a couple of minutes, and the multiple routes mean a bus
journey and a sit-down session both count.

**Stored** as `hpatlas:streak`: the current run, the best ever, the last qualifying date,
today's counters, and one grace day.

**Days are local calendar dates.** Crossing local midnight ends a day — not a rolling
24 hours.

### Forgiveness

Miss one day and the grace day absorbs it: the run continues and the grace is spent. It
returns after seven consecutive qualifying days. Miss two days, or miss one with no grace
in hand, and the run resets. The best is always kept.

Without this, one bad day ends a forty-day run, and that is the moment people abandon the
habit altogether. A streak that punishes a single miss drives away exactly the user it is
meant to keep.

### Merging across devices

Two phones both counting today must neither double-count nor reset each other. The rule
takes, in every case, the more generous value:

- the **higher** current run
- the **higher** best
- the **later** last-qualifying date
- today's counters as the **higher** of each

This follows sub-project 1's principle: nobody is punished for owning two devices.

## Profile

A view in the main stage, reachable from the header account button — **not** a tenth entry
in the rail. The nav already carries nine and the phone bar is deliberately four; a profile
belongs in neither. Hash-routable at `#/profile`.

The button always opens it, signed in or out:

- **Signed out:** local streak, notes, progress, and a *Sign in to sync* card.
- **Signed in:** the same, with identity and sign-out in place of that card.

### Contents

- Who you are signed in as
- Current streak and best streak
- Facts seen, quiz accuracy, past papers attempted
- An index of your notes, each linking to its record — without this a note written three
  weeks ago is unfindable unless you remember which record it was on
- Sign out
- **Export your data**, and **delete your account**

### Data controls

**Export** downloads a JSON file of everything — progress, notes, streak.

**Delete** removes the Firestore document, the Firebase Auth account, and all local data.
It asks for typed confirmation rather than a single click; it is the one action here that
genuinely cannot be undone.

**The wrinkle:** Firebase refuses to delete an account on a stale session, raising
`auth/requires-recent-login`. Deletion catches that, re-authenticates, and retries, rather
than surfacing a cryptic error to somebody trying to leave.

This closes an obligation sub-project 1 recorded as deferred. Storing a user's email and
progress carries a duty to let them take it and to let them go.

## Verification

**Node — the pure logic:**
- The note merge rule: most recent wins per record; empty on either side; neither input
  mutated.
- The 1,000-character cap: enforced, and a note at exactly the limit is accepted.
- The streak: each of the four qualifying routes; a second qualification on the same day
  does not increment twice; a missed day with grace continues the run and spends the
  grace; a missed day without grace resets; two missed days reset; grace returns after
  seven consecutive days; best is never reduced.
- The streak merge: higher run, higher best, later date, higher counters, on every
  combination of empty and populated.
- Day boundaries computed from local calendar dates, tested across a month boundary and a
  year boundary.

**Browser harness:**
- A note can be written, saved, reloaded and read back.
- The profile opens from the header button, signed out.
- The notes index lists a written note and links to its record.
- The character counter reflects the cap.

**Not automatable here:** account deletion and the re-authentication path need a live
Firebase project and a human. The plan must say so rather than implying coverage.
