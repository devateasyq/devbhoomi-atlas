# Liquid glass dock — phone footer

**Date:** 2026-09-12
**Branch:** `feat/liquid-glass-footer`

## Problem

The phone footer (`#mtabs`) is an opaque five-tab strip welded to the bottom of
the flex column. It reads as chrome bolted on beneath the app rather than as
something floating over it, and five labels at 9.5px are cramped. Search lives
only in the header, at the far end of the screen from the thumb.

## Shape

A floating dock, phone-only, modelled on the iOS 26 Telegram tab bar: a
translucent rounded pill carrying four tabs, and beside it a separate circular
glass button for search.

```
╭───────────────────────────────────────╮   ╭──────╮
│   ⌂        ◈        ◐        ▤        │   │  🔍  │
│ Overview  Map    Rounds   Revise      │   ╰──────╯
╰───────────────────────────────────────╯
```

## Decisions

### The four tabs

Overview, Map, Rounds, Revise. **Profile leaves the bar.** The header account
button already carries the user's own name and already opens the profile view
(`mountAccount`), so the name at the top of the screen is the door to it. This
resolves the tension the old `mobOnly` comment in `NAV` describes, rather than
keeping a fifth tab to paper over it.

### How the glass is made

`backdrop-filter: blur() saturate()` over a semi-transparent tint, with a
specular rim drawn as an inset gradient ring and a soft drop shadow.

Rejected alternatives:

- **SVG `feDisplacementMap` refraction** (`backdrop-filter: url(#f)`) gives a
  genuinely refracting edge but is Chromium-only. On iOS Safari — the device
  this PWA is actually installed on — it degrades to flat grey with no warning.
- **WebGL/canvas refraction** means a nav bar that runs a render loop and
  drains battery. Not worth it for chrome.

Fallback: where `backdrop-filter` is unsupported, or under
`prefers-reduced-transparency`, the dock keeps its geometry and falls back to
opaque `--surface`.

### Active tab

A filled lozenge sits behind the current tab and slides between positions with
a transform transition, so the animation stays on the compositor. Under
`prefers-reduced-motion` it jumps instead (the global rule in `tokens.css`
already collapses transition durations).

### Search

Tapping the circle expands it leftward into a full-width glass field that
covers the pill; a `✕` collapses it.

This **reuses the single existing `#search` input**. `.searchwrap` is relocated
into the dock by a `matchMedia` listener on the phone breakpoint and returned to
`.bartools` above it, so `runSearch`, the keydown handling and `#results` keep
working untouched. No second input and no duplicated search state.

`#results` is already `position:absolute` against `#main`, so it needs only a
mobile override to open *upward* from above the dock.

A `visualViewport` listener publishes a `--kb` offset so the dock rides above
the iOS keyboard instead of hiding behind it.

## Consequences

- The dock no longer occupies flex space, so `#stage` and the record sheet's
  `.pb` gain `--dock-h` of bottom padding; content otherwise ends underneath it.
- Glass tint, rim and shadow are tokens, with dark values in `tokens.css`.
- The dock stays visible at all times. Hide-on-scroll is deliberately out of
  scope.

## Testing

The glass itself is visual and is verified by running the app and screenshotting
at phone width. The testable invariant — the phone bar carries exactly four
tabs, and Profile is not among them — goes in `test/nav.test.js` under
`node:test`, matching the existing runner.
