# Posts and confidence — sub-project 3

**Date:** 2026-09-12
**Status:** approved, ready for planning

## Where this sits

Sub-project 1 built accounts and sync. Sub-project 2 built notes, the profile and
the streak. This adds two things to the Rounds feed: a confidence signal on every
card, and cards you write yourself.

Both are private. Posts are shaped so that opening a shared feed later is a new
sub-project rather than a migration — but nothing is shared now, and no moderation
is designed here.

## Confidence

Two taps on a Rounds card: **Got it** and **Again**. Neither is required — scrolling
past without deciding leaves the card in normal rotation, which is how the feed
works today and must keep working.

Tapping the state a card already holds clears it. There is no third button for "I
was wrong about that", because the same button undoing itself is easier to reach
than a third choice on a card you are scrolling past.

**Stored** as `hpatlas:conf`, shaped `{factId: {v, t}}` where `v` is `"got"` or
`"again"` — deliberately the same `{value, timestamp}` shape the quiz and past-paper
answers use, so it merges by the same most-recent-wins rule and needs no new idea.

Bounded by construction: at most one entry per fact, so it is safe in the shared
user document beside progress. 265 facts at roughly 50 bytes is about 15 KB.

### What it changes in the feed

`orderFacts(facts, seen)` today returns unseen facts shuffled, then seen facts
oldest-first. It gains a third input and returns four tiers:

1. facts marked **again**
2. unseen facts, shuffled — unchanged
3. seen facts, oldest first — unchanged
4. facts marked **got**, last

A card marked **again** is also re-queued five positions ahead in the feed you are
currently scrolling, so "again" means *again*, not "next time you open Rounds".
Without that the button is a promise the app does not keep until tomorrow.

## Posts

A post is a **card**, not a note. Notes annotate a record and live at the foot of
its panel; a post joins the Rounds feed beside the built-in facts and takes the
same two taps. Keeping them separate is the point — a post that was just a note
attached to a record would be a second way to do something the app already does.

**Shape:** `{author, visibility: "private", text, tags, t}`. `tags` holds record ids
or section ids, so a post can also surface on the record it belongs to.

**Capped at 400 characters.** Shorter than a note's 1,000 on purpose: this is a card
in a feed you scroll, and a card you cannot read at a glance is not a card. Enforced
with a visible counter, never silently at save.

**At most 500 posts**, which is well past a year of daily use and keeps the feed and
the sync bounded.

### Where posts live, and why not in the user document

Progress, notes and the streak share one Firestore document with a hard 1 MB limit.
Notes already reach roughly 875 KB in the worst case, which is what their character
cap exists to defend. Posts are unbounded user text and cannot go in there.

Posts live in their own top-level `posts/{postId}` collection, one document each.
That also happens to be the shape a shared feed would need, which is what "built to
share later" means in practice: opening one up becomes a rules change and a
visibility flag, not a data migration.

Locally they are mirrored in `hpatlas:posts` so the app keeps working offline and
signed out, exactly as progress does. Signed out, posts are yours on that device;
signing in uploads them.

### Firestore rules — you must publish these

Posts do not work until these are published in the console. The current rules deny
everything outside `users/{uid}`.

```
match /posts/{postId} {
  allow read:   if request.auth != null && resource.data.author == request.auth.uid;
  allow create: if request.auth != null
                && request.resource.data.author == request.auth.uid
                && request.resource.data.visibility == "private";
  allow update, delete: if request.auth != null && resource.data.author == request.auth.uid;
}
```

A shared feed later would add one clause to `read`. Nothing else changes.

## The fact id change

`buildFacts` builds ids as `recordId + "#" + n`, where `n` is the atom's index inside
that record. Edit a record's exam-hook text — add a line, remove one, reorder two —
and every id after the edit shifts onto a different fact.

Today that only mis-attributes `seen`, which is cosmetic. A confidence rating
attaching to the wrong fact is not: a **Got it** would bury a fact the student does
not know, and the app would be actively hiding the thing they need.

Ids become `recordId + "#" + hash(text)` — a short deterministic hash of the fact's
own text, base36. Reordering a record's atoms no longer moves anybody's ratings, and
genuinely editing a fact's wording correctly makes it a new card, because it is one.

**The cost, stated plainly:** every existing `seen` entry stops matching, so the
facts-seen count resets to zero once and previously-seen cards look fresh again.
That is a real loss and it is accepted deliberately: it happens once, and the
alternative is ratings that silently drift onto the wrong facts every time the
content is edited.

Stale ids are pruned from `seen` on load rather than left to accumulate, which also
cleans up drift from past content edits.

## Verification

**Node — the pure logic:**
- Fact ids: the same text yields the same id; reordering atoms within a record leaves
  every unmoved fact's id unchanged; editing a fact's text changes its id and nothing
  else's; two records with identical text keep distinct ids.
- `orderFacts` returns the four tiers in order, and an unmarked feed is byte-identical
  to today's output for the same input.
- Confidence merges most-recent-wins, neither input mutated, and an unknown `v` is
  ignored rather than stored.
- Tapping a state a card already holds clears it.
- Post validation: the 400-character cap, the 500-post ceiling, whitespace-only
  rejected, and tags filtered to ids that actually exist.
- Pruning `seen` drops ids no current fact claims and keeps every id that still does.

**Browser harness:**
- Both buttons appear on a card and record a state that survives a reload.
- Marking a card **again** re-queues it ahead in the live feed.
- A post can be written, appears in the feed marked as yours, and takes the same taps.
- The character counter reflects the cap.

**Not automatable here:** the Firestore rules for `posts` need a live project, and
cross-device post sync needs two signed-in devices. Both are for the repo owner.

## Explicitly not in this sub-project

- Any sharing, public feed, or moderation. Posts carry a `visibility` field and it is
  always `"private"`.
- Editing the built-in facts. Posts sit beside them; they do not replace or amend them.
- Spaced-repetition intervals beyond the four tiers. Three-level grading was
  considered and rejected: three choices per card is too much thinking for a feed you
  scroll.
