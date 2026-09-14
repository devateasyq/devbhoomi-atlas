# Promotion kit — design

**Date:** 2026-09-14
**Status:** approved, not yet built

## Problem

`https://www.parikramapath.com/` is built, indexable and live. Nobody arrives at it.
SEO is already in place (~100 pre-rendered `/r/` pages, sitemap, robots, share card) but
search is a slow burn. This spec covers the other half: putting the site directly in front
of HP competitive-exam aspirants where they already are, this month.

## Decisions taken

| Question | Decision |
|---|---|
| Goal | Real users now — direct distribution, not SEO, not a launch moment, not institute sales |
| Channels | Telegram, WhatsApp groups, Reddit / Quora / Facebook. **No Instagram** — no account, and reels are a different production job |
| Hook | The clickable district map. Visual, and unlike anything else circulating in those groups (PDFs) |
| Voice | Both, per channel — Hinglish for WhatsApp/Telegram/Facebook, English for Reddit/Quora |
| Framing | First person, fellow aspirant who built his own revision tool. True, and the only framing that survives a group admin's spam filter |

## Location

`~/Downloads/prep/promo/` — deliberately **outside** `hp-atlas/`, which deploys wholesale
to Vercel. Nothing promotional should reach the live site.

```
promo/
  README.md        entry point: what to post where, in what order
  copy/
    whatsapp.md    Hinglish — one-line forward, group post, long "what is it"
    telegram.md    Hinglish — group post, channel post
    facebook.md    Hinglish — HP exam group post
    reddit.md      English — self-post, plus a comment-reply template
    quora.md       English — answer template for HP GK preparation questions
    admin-dm.md    English + Hinglish — asking permission to post
  assets/
    map-tap.gif    hero: map at rest -> Kangra tapped -> panel opens
    map-tap.mp4    same, smaller; Telegram and Facebook
    still-map.png      16:9
    still-square.png   1080x1080, WhatsApp-safe
    still-pyq.png      past-paper bank
    still-timeline.png
  links.md         UTM-tagged URLs, one per channel
  targets.md       communities + promo rules + confidence marks
  schedule.md      two-week sequence
```

## Components

### Assets

Recorded from the **live site** through Chrome automation at a **phone viewport**. The
audience opens WhatsApp on a phone; a phone-shaped screenshot reads as a usable thing,
a desktop one reads as a website someone made.

`map-tap.gif` is the asset that does the selling — WhatsApp and Telegram autoplay it
inline, so the hook lands before anyone decides whether to click. Hard constraint:
**under 5 MB**, or WhatsApp re-encodes it into mush. MP4 exported alongside for the
channels that prefer video.

Sequence recorded: map at rest, Kangra tapped, detail panel opens, one beat on the
panel's contents. Extra frames captured before and after each action so playback is smooth.

### Copy

Every channel file carries three lengths — a one-line forward, a group post, and a longer
explanation for when someone replies asking what it is. Each post ends with its own
UTM-tagged link from `links.md`.

`admin-dm.md` matters more than the rest combined. In most HP exam Telegram channels and
Facebook groups, posting unasked gets you removed; asking first gets you a pinned message.

### Targets

Live-searched list of HP-exam Telegram channels, Facebook groups and subreddits. Every
entry marked **verified** (link opened and checked), **name-only** (exists, details
unconfirmed) or **uncertain** (search result, may be dead). A tidy-looking list that is
secretly half-dead is worse than a short honest one.

Where a community publishes promo rules, they are quoted in the entry.

### Schedule

Two weeks, staggered so GA4 can attribute channels separately:

- Warm groups first (ones Avinash is already in — highest trust, no gatekeeper)
- Admin DMs next
- Reddit and Quora later and slower

### Tracking

UTM-tagged links into the existing GA4 property `G-BLQR6P5KCJ`, already installed in
`index.html`. Query parameters sit before the hash route, so `?utm_source=...` does not
disturb `#/map/d-kangra` deep links.

Without UTMs, every WhatsApp and Telegram click lands in GA4 as "direct" and the campaign
teaches nothing about which group delivered.

## Risks, accepted knowingly

**Reddit needs account history.** A new account posting a link is auto-removed by most
subreddit filters regardless of post quality. If the account is new, Reddit realistically
starts in week 2 after ordinary commenting. The schedule reflects this.

**The name risk is still open.** Two live Indian education bodies use "Parikrama"
(Parikrama Group of Institutions, Parikrma Humanity Foundation) and class 41 was never
cleared. Promotion is what makes a later rename expensive: today a rename costs one string,
after a thousand shared links it costs the distribution. Flagged to the user before build;
decision was to proceed.

**Self-promotion bans.** Reddit and Facebook groups remove promotional posts. Mitigated by
the admin-DM path and by writing posts that are useful standing alone, with the link last.

## Out of scope

Instagram reels, YouTube, paid ads, coaching-institute pitch decks, a dedicated landing
page, and any change to the app itself.

## Done means

The `promo/` folder exists with every file above populated; `map-tap.gif` is under 5 MB and
actually shows the panel opening; every link in `copy/` is UTM-tagged and resolves; every
entry in `targets.md` carries a confidence mark; `README.md` tells a reader what to do first.
