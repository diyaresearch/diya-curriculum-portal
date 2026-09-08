# Styling

The audit and the migration plan for issue #360, plus the rules a new
component follows. The short version is in CLAUDE.md's "Styling" section;
this file is the reasoning and the remaining work.

## The audit

The app mixed four styling approaches with no rule about which to use:

| Approach | Where it was | Verdict |
| --- | --- | --- |
| Inline `style={{}}` | 843 sites across 40 files | the problem |
| Tailwind utilities | scattered through the same files | the target |
| `src/App.css` | 599 lines, global, imported once by `App.jsx` | mostly dead |
| `src/constants/typography.js` (`TYPO`) | 8 style objects spread into `style={{}}` | a design system that could only be used inline |

Three findings drove the shape of the fix.

**The palette had drifted into near-duplicates.** Counting distinct colour
literals across `src/`: three yellows (`#f9c74f`, `#ffc940`, `#fdcb58`), four
reds (`#e74c3c`, `#dc3545`, `#b91c1c`, `#c00`), and six off-whites (`#f6f8fa`,
`#fafbfc`, `#f8fafc`, `#f9fafb`, `#f8f9fa`, `#f3f3f1`) for what are visually
one colour each. Nothing named them, so each new component picked a fresh one.

**`TYPO` was a design system in the wrong shape.** It held the right tokens,
but as JavaScript objects that could only be applied by spreading them into
`style={{}}` — so using the design system *required* writing an inline style.
Two call sites also did `fontSize: TYPO.body`, assigning an *object* to
`fontSize`, which is not a valid CSS value and silently did nothing.

**Most of `App.css` was unreachable, and the reachable part was load-bearing
in a non-obvious way.** CRA's boilerplate (`.App`, `.App-logo`, `.App-header`,
`.App-link`) had no matching element left. The `.student-signup-page` block
was dead too — but its rules for `.form-left`, `.form-right`, `.confirm` and
`.register-btn` were *not* scoped to it. They were global, declared after the
teacher block, and therefore won the cascade on `/teacher-signup`, which is
the only signup page that renders. Deleting the block wholesale would have
restyled a live page.

## The design system

`src/index.css`'s `@theme` block. Tailwind 4 has no `tailwind.config.js` — the
theme is that block, and each token in it does two things: it is emitted as a
CSS custom property on `:root` (so existing `var(--text-body)` references keep
working) and Tailwind generates utilities from it by namespace.

```
--color-navy: #162040    ->  bg-navy   text-navy   border-navy
--text-body: 1.05rem     ->  text-body
```

Tokens, by role:

- **Brand** — `navy` (the primary; ~100 sites used `#162040` directly),
  `navy-deep`, `navy-soft`
- **Accent** — `accent`, `accent-strong`
- **Feedback** — `success`, `danger`, `link`
- **Text** — `ink-strong` (headings), `ink` (body), `ink-muted` (secondary),
  `ink-faint` (helper)
- **Surface** — `surface`, `surface-subtle`, `surface-sunken`, `rule`,
  `rule-strong`
- **Type scale** — `text-page-title`, `text-page-subtitle`,
  `text-section-title`, `text-body`, `text-meta`, `text-label`, `text-helper`

Add a token here rather than a hex literal at a call site. One name per role is
what stops a fourth yellow appearing.

## Rules

**Tailwind utilities are the default.** A static appearance is a class list.

**Inline `style` is for values computed at runtime only.** A Tailwind class
cannot take a value that is not known until render. `Loading.tsx`'s spinner is
the reference case: its ring width is derived from a `size` prop and its
colour is a prop, so those two stay inline while everything else about it is a
class. This is the whole of the exception — "it was quicker" is not part of it.

**A `style` prop that exists for callers stays.** `SectionCard` and
`MetaChipsRow` take a `style` prop so a caller can pass a runtime override.
The component's *own* appearance is in its class list; the prop is spread on
top.

**Repeated appearance becomes a named constant, not a copied class list.**
`NAV_ITEM`/`NAV_LINK` in `Navbar.jsx`, `FOOTER_LINK` in `Footer.jsx`,
`CHIP` in `MetaChipsRow.jsx`. The navbar is why: its link style was inlined
six times, and the copies had already drifted apart.

**A third-party component's `style` prop is that library's API, not a DOM
inline style.** `Modal.jsx` passes `style={{ overlay, content }}` to
`react-modal`, which is how react-modal is configured. It stays.

**New CSS in `App.css` needs a reason.** Either it styles markup this app does
not render (a library's own class names, like `.react-pdf__*`), or it is a
descendant/state selector over a shared block where utilities would mean
repeating a dozen classes on every child (`.multi-select*`). Otherwise it is a
class list on the component.

**Do not use Tailwind's named palette colours for an existing brand value.**
Tailwind 4 redefined its default palette in OKLCH, so `red-500` is no longer
`#ef4444`. `ToastProvider`'s three tones spell the hexes out for exactly this
reason.

## What this PR migrated

Everything in `src/components/ui/` and `src/components/layout/` — the shared
layer every page renders through:

`Navbar` (23 sites, the file #360 names), `Footer`, `Layout`, `ErrorBoundary`,
`ToastProvider`, `Modal`, `Loading`, `FieldError`, `SectionCard`,
`MetaChipsRow`, `MultiCheckboxDropdown`, `SignUpPrompt`, `SignupSuccess`.

`App.css` went from 599 lines to 331: CRA boilerplate, `.no-scrollbar` and the
`.student-signup-page` block removed, with the `.form-*` cascade described
above folded so `/teacher-signup` computes identically.

Two latent bugs fell out of the migration and are fixed:

- `Navbar` used `bg-opacity-50`, which **Tailwind 4 removed**. The class did
  nothing, so that overlay rendered fully opaque instead of 50%. Now
  `bg-gray-800/50`.
- `ToastProvider` and `Loading` assigned the `TYPO.body` *object* to
  `fontSize`. Now the `text-body` utility.

## What is left

775 inline-style sites across 30 files, all in pages and feature sections:

| Area | Sites | Files |
| --- | --- | --- |
| `pages/` | 530 | 19 |
| `components/home/` | 194 | 6 |
| `components/content/` | 47 | 2 |
| `components/ui/` | 3 | 2 (all intentional — see the rules above) |

The heaviest are `components/home/ExploreModulesSection.jsx` (90),
`pages/teacherplus/teacherplusPage.jsx` (79), `pages/module_detail/index.jsx`
(57) and `pages/upgrade_page/UpgradePage.jsx` (54).

These were left deliberately. They are page-level layout rather than shared
appearance, so converting them is a large visual diff per file with no
component reuse to check it against — and four of them are on live payment and
subscription flows. The design system they need now exists, so each can move
on its own, one page per PR, verified visually. `constants/typography.js` stays
until the last `TYPO` spread is gone; it is unused by the migrated components.
