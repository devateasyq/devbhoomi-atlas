# Accounts and sign-in — sub-project 1 of 4

**Date:** 2026-09-11
**Status:** approved, ready for planning

## Where this sits

The request was three things: sign-in, notes on records with a public/private
choice, and a streak to bring people back. They do not share a foundation, so they are
four sub-projects, each with its own spec:

1. **Accounts and sign-in** — this document.
2. **Private notes** — attach a note to any record, synced to the account.
3. **Streaks and targets** — small; better once there is an account to hang them on.
4. **Public notes** — sharing and discovery. Last, because it is the only one needing
   moderation.

## Problem

The app makes no network calls. Every piece of state lives in `localStorage`, so it is
lost when a browser is cleared and never follows the user to a second device. Nothing
can be shared, because there is no identity to share from.

## Decisions taken, and why

### Firebase, not Supabase

Cost is the binding constraint. Supabase's free tier is the better data model —
Postgres, with row-level security expressing "mine versus public" declaratively — but a
free Supabase project **pauses after about a week without traffic**, which is precisely
what happens pre-launch, and would need manual restoring constantly. Firebase's Spark
tier has no such pause, and its offline persistence suits an app built to work without a
signal.

Accepted costs: a NoSQL data model, and security rules fiddlier than SQL RLS.

**Free-tier terms were not verified from inside this project and change often. Confirm
current limits before committing.** "Free" also holds only at small scale; at thousands
of students, reads and storage become a real bill.

### Hosting does not move

The app stays a static site on GitHub Pages. The browser talks to Firebase directly, so
there is no migration and no server to run.

### Sign-in is optional

Everything works signed-out exactly as it does today. Signing in adds sync and, later,
sharing. Nothing blocks on it.

A sign-up wall would cost every visitor unwilling to hand over an email to try a revision
app — the wrong trade for a tool people open in spare minutes.

**Anonymous Firebase accounts were considered and rejected.** They would give one
storage path and no wall, which is the cleanest architecture of the three, but every
casual visitor would become a stored user, which works against the free tier that drove
the platform choice in the first place.

Accepted cost: two storage paths — `localStorage` for guests, Firestore for members —
which must stay coherent.

### Google and email link, no passwords

- **Google sign-in** for the majority; nearly all HPAS aspirants have a Gmail account.
- **Passwordless email link** for anyone who will not use Google.

No password is ever stored, so there is no reset flow, no strength rule and no
credential liability.

**Phone/OTP was excluded because Firebase bills per verification.** It is the method
Indian students are most used to, and this is a real cost of choosing free.

Email links on the free tier come from Firebase's default sender and land in spam for
some recipients. Pointing them at a custom domain is later configuration, not a rewrite —
and `parikramapath.com` is not bought yet.

## What syncs

| Syncs to the account | Stays on the device |
|---|---|
| Notes (sub-project 2) | Theme (`hpatlas:theme`) |
| Facts seen in Rounds (`hpatlas:seen`) | Hidden map layers (`hpatlas:mapoff`) |
| Quiz progress (`hpatlas:quiz`) | Legend open/closed (`hpatlas:legendopen`) |
| Past-paper progress (`hpatlas:pyq`) | |
| Streak (sub-project 3) | |

Progress belongs to the person and must follow them; losing quiz history by switching to
a laptop is the exact failure sync exists to prevent. Preferences belong to the *device* —
dark on a phone at night and light on a laptop is legitimate, and syncing it makes two
devices fight.

### Merge rules

Two devices can diverge, so every rule is "never punish someone for having two devices":

- **Facts seen** — union. Progress is never lost.
- **Quiz and past-paper answers** — merge per question; the most recent answer wins.
- **Streak** — the higher count wins.

## Scope of this sub-project

**In:**
- Firebase project setup and config, with the SDK vendored into the repo rather than
  loaded from a CDN, so the app keeps working offline.
- Sign in with Google; sign in with an email link.
- Sign out.
- Session restored on load; the UI reflects signed-in or signed-out state.
- A first-sign-in migration that pushes existing `localStorage` progress to the account,
  applying the merge rules where the account already holds data.
- Sync of the three progress keys listed above.
- Firestore security rules restricting a user's documents to that user.

**Out, and deliberately:**
- Notes of any kind (sub-project 2).
- Public sharing and moderation (sub-project 4).
- Streaks (sub-project 3).
- Profiles, avatars, display names beyond what Google returns.
- Account deletion UI — but see the obligation below.

## Obligations this creates

Storing user data is not a neutral act:

- **Account deletion and data export** are expected, and in some jurisdictions required.
  Not building the UI in this sub-project is a deliberate deferral, not an oversight, and
  it must not stay deferred past launch.
- A **privacy note** saying what is stored and why is needed before this is public.
- The offline single-file build (`hp-revision.html`) cannot authenticate. It stays a
  read-only offline copy with no account features, and should say so.

## Verification

- **Node:** the merge rules are pure functions over two state objects and are unit
  tested — union for seen facts, most-recent-wins per quiz question, higher streak wins,
  and each rule tested with the account empty, the device empty, and both populated.
- **Browser harness:** the app loads and works fully signed-out; the sign-in control is
  present; signing out restores guest behaviour without losing local progress.
- **Not automatable here:** the real Google and email-link round trips need a live
  Firebase project and a human. The plan must say so rather than pretending otherwise.
