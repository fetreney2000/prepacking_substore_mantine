# UI Guidelines — Sistem Inventori Prabungkus

Researched and written for this codebase. The purpose is a single definition of
"commercial grade" for this app: what is *mandatory* (accessibility compliance),
what is *expected* (interaction quality), and what makes it look and feel like a
finished product (theme, typography, density).

**How to use it:** section 11 is the actionable backlog; sections 3–9 are the
rationale and the rules to check against before a release.

---

## 1. Sources

| Source | Status | Used for |
|---|---|---|
| [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) (W3C) | ✅ read in full | The compliance floor — every threshold below is quoted from it |
| [Mantine theming docs](https://mantine.dev/theming/theme-object/) | ✅ read | Theme tokens; **each token listed below was verified as present in the installed `@mantine/core@7.17.8`** |
| [GOV.UK Design System](https://design-system.service.gov.uk/) + [Colour](https://design-system.service.gov.uk/styles/colour/) | ✅ read | The best-documented public-sector system: semantic colour roles, evidence-based components |
| [NN/g — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) (Nielsen, 1994/2024) | ✅ read | Interaction-quality principles |
| [Material 3](https://m3.material.io/foundations), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) | ⚠️ not read (JS-only pages returned no content) | Listed as further reading — do not treat anything below as summarising them |

All contrast numbers in this document were **computed from this app's own build
output** (`.next/static/css/*.css`), not taken from documentation.

---

## 2. Four layers

1. **Compliance** — WCAG 2.2 AA. Non-negotiable: it is a legal/procurement
   expectation for public-sector health systems and it is what auditors check.
2. **Interaction** — NN/g heuristics: the app must predict, explain and recover.
3. **System** — one theme object, semantic tokens, consistent components.
4. **Polish** — density, typography, motion, states: what makes it feel finished.

A product that skips 1–2 looks broken; a product that skips 3–4 looks like a
prototype. Commercial grade needs all four.

---

## 3. Compliance floor — WCAG 2.2 (Level AA)

Thresholds quoted from the W3C quick reference:

| Criterion | Requirement | Applies here as |
|---|---|---|
| **1.4.3** Contrast (Minimum) | text ≥ **4.5:1**; large text (≥24px, or 18.66px bold) ≥ **3:1** | body text, table cells, badge labels, links |
| **1.4.11** Non-text Contrast | ≥ **3:1** against adjacent colour | icons, input borders, focus indicators |
| **2.5.8** Target Size (Minimum) *(new in 2.2)* | pointer targets ≥ **24×24 CSS px** (spacing exception applies) | every `ActionIcon`, every table row button |
| **1.4.1** Use of Color | colour must not be the only cue | status badges (text label + colour ✅ already correct) |
| **1.4.4 / 1.4.10** | text resizable to 200%; usable at 320px wide | responsive layout, no fixed heights on text |
| **2.4.7 / 2.4.11** | focus visible and not obscured | navbar links, modal focus (Mantine traps focus ✅) |
| **3.3.1 / 3.3.2** | errors identified; inputs labelled | every field has a label ✅ |
| **4.1.3** | status messages announced | toast notifications need `role="status"` |
| **3.1.1** | language of page declared | `<html lang="ms">` ✅ |
| **3.3.4** | confirm before consequential actions | delete confirmations ✅, import confirmation ✅ |

### Measured: status badge contrast — found failing, fixed in both schemes

Computed from this app's own build (`Badge variant="light"`). Mantine's tint
is the status colour at **10% alpha in light mode, 15% in dark**; surfaces are
white / a striped row `#f8f9fa` in light mode, `dark-7` (`#242424`) in dark:

**Light scheme** (before = Mantine's own full-colour text; after =
`--mantine-color-text` = `#000`):

| Status | Before | After |
|---|---|---|
| OK (green) | 2.17 / 2.07 | **19.31 / 18.39** |
| Rendah (yellow) | 1.75 / 1.66 | **19.69 / 18.76** |
| Kritikal (red) | 2.92 / 2.78 | **18.66 / 17.75** |
| Kehabisan (gray) | 3.01 / 2.86 | **19.02 / 18.11** |

**Dark scheme** (badge text candidates on the 15% tint over `#242424`):

| Status | fixed dark ink `#1f1f1f` | `--mantine-color-text` (`#c9c9c9`) |
|---|---|---|
| OK (green) | 1.38 ❌ | **7.20** ✅ |
| Rendah (yellow) | 1.45 ❌ | **6.85** ✅ |
| Kritikal (red) | 1.28 ❌ | **7.80** ✅ |
| Kehabisan (gray) | 1.32 ❌ | **7.55** ✅ |

Every "before" value fails 4.5:1. The fix is one inline rule in
`components/StatusBadge.tsx`: keep Mantine's tint (it carries the hue and
still separates the five statuses) and set the text to `--mantine-color-text`,
the scheme-aware token (black in light, `#c9c9c9` in dark) — it clears 4.5:1
in **both** schemes. Because the ink is a token rather than a literal, dark
mode does not re-break the badge. Covered by `components/StatusBadge.test.ts`.

Notes from the investigation, kept so nobody repeats them:

- **The tint alpha differs by scheme** (10% light / 15% dark). The first
  numbers published here used the dark alpha on light surfaces; the table above
  is corrected to each scheme's real values — conclusions unchanged (all
  "before" values fail), numbers replaced.
- **A fixed dark ink passes light mode and fails dark mode** (1.28–1.45:1 —
  near-black on a dark tint). Never hardcode an ink where a scheme-aware token
  already exists.
- **"Just use shade 9 text on shade 0"** only cures red (**5.10**) and gray
  (**14.63**); green **4.07** and yellow **2.83** still fail — hence an
  ink-on-tint rule rather than a shade swap.
- **`variant="filled"` + `autoContrast`** is not a free pass either: measure
  rather than assume.
- **Printed reports** had a separate palette with the same defect
  (2.74–3.95:1); `app/sku-report` now prints every status with one dark ink
  (`PRINT_STATUS_INK = #111827`, measured 14.5–16.5:1). Paper is always the
  light scheme, so dark mode never touches print output.
- **Plain `c="…"` status words** (the old help page) resolve to the `-text`
  variants — `yellow-4` = **1.43:1**, `gray-4` = **1.49:1**, all four failing.
  The help page now renders the same `StatusBadge` as the app, so its labels
  match both the UI and the contrast rule.

### How to verify (do this before every release)

1. **Contrast:** DevTools colour picker on a text/background pair, or
   [WebAIM's checker](https://webaim.org/resources/contrastchecker/).
2. **Keyboard only:** Tab through the page — every action reachable, focus ring
   visible, focus never hidden behind the sticky header (2.4.11).
3. **Targets:** hover the small icon buttons and confirm ≥24×24 (2.5.8).
4. **200% zoom** (1.4.4) and **320px wide** (1.4.10) — no clipped tables, no
   horizontal page scroll (table-level scroll is acceptable).
5. **axe DevTools** (or Lighthouse accessibility) on every page template.

---

## 4. Interaction quality — NN/g's 10 heuristics, applied here

| # | Heuristic | What it means in this app | Status |
|---|---|---|---|
| 1 | Visibility of system status | loading states, `Button loading=`, inline error alerts with retry | ✅ error alerts added; skeleton loaders replace bare spinners on every loading page |
| 2 | Match the real world | Malay pharmacy vocabulary, no internal jargon | ✅ (help page now matches the app) |
| 3 | User control & freedom | every destructive action has an escape: cancel, confirm dialog, pre-import backup | ✅ |
| 4 | Consistency & standards | one theme, consistent labels, platform conventions | ⚠️ see §9 terminology |
| 5 | Error prevention | confirm before delete/import; block invalid settings before saving | ✅ |
| 6 | Recognition over recall | filters, search, visible column toggles rather than hidden state | ✅ |
| 7 | Flexibility & efficiency | accelerators for repeated use (search-as-you-type, remembered inputs) | ✅ `/` focuses search (implemented, then documented on the help page) |
| 8 | Aesthetic & minimalist design | remove anything not serving the data; `ColumnToggle` instead of more chrome | ✅ |
| 9 | Recognise/diagnose/recover from errors | plain language, no error codes, say what to do; request-id correlates to server logs | ✅ |
| 10 | Help in context | the Help page exists and is now accurate | ✅ |

Note on #7: the app now has exactly one accelerator — `/` focuses the page's
search field (`lib/useSlashToFocus.ts`, opt-in via `data-search-input` on the
input) — and the help page documents exactly that one, nothing more. Any new
shortcut follows the same order: implement, test, *then* document (candidates
if ever needed: `Ctrl+K` spotlight via `@mantine/spotlight`).

---

## 5. Theming — one place decides the appearance

Mantine centralises appearance in `createTheme()` passed to `MantineProvider`.
Tokens verified as available in the installed **7.17.8**:

`colors` (10-shade palettes) · `primaryColor` / `primaryShade` · `autoContrast`
· `luminanceThreshold` · `fontSizes` · `lineHeights` · `fontWeights` ·
`spacing` · `radius` / `defaultRadius` · `shadows` · `breakpoints` · `headings`
· `focusRing` · `respectReducedMotion` · `components` (global defaults)

Current state (`app/providers.tsx`) uses roughly: `primaryColor: 'blue'`,
`defaultRadius: 'md'`, and `defaultProps` for Button/Table/Card/Modal. That is
the main lever left unused.

### Semantic colour roles (GOV.UK's rule)

GOV.UK's colour guidance: *"Do not copy the specific hexadecimal colour
values… use the semantic token instead"*, with named functional roles —
`text`, `secondary-text`, `link`, `border`, `input-border`, `focus`, `error`,
`success`, `brand`, `surface-*`. Their published values (for reference only —
do not copy): text `#0b0c0c`, secondary `#484949`, border `#cecece`,
focus `#ffdd00`, error `#ca3535`, success `#0f7a52`.

Done (item 8): the five stock statuses have exactly one definition —
`STOCK_STATUS` in `lib/calculations.ts`, a table of `{ label, color, printBg }`
per status. `statusColor()`/`statusLabel()` read from it, `StatusBadge` is the
only place that renders a status, and the printed reports take their
background from the same row, so screen and paper cannot drift apart. It lives
in `lib/` rather than `theme.other` on purpose: the print popups are plain
HTML strings in a separate document and never see the theme object — a module
both contexts can import is the single source of truth that actually holds.

### Recommended `createTheme` additions

```ts
const theme = createTheme({
  primaryColor: 'blue',            // already set — pick the brand blue deliberately
  defaultRadius: 'md',             // already set
  autoContrast: true,              // fixes text on filled variants automatically
  respectReducedMotion: true,      // one line: accessibility + taste
  headings: { fontFamily: 'inherit', sizes: { h1: {...}, h2: {...} } },
  fontSizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 },
  components: {
    Table: { defaultProps: { striped: true, highlightOnHover: true, withTableBorder: true } },
    Modal: { defaultProps: { size: 'lg', centered: true } },
    // Badge: status colour pairs go here once measured
  },
});
```

Dark mode (item 10) is implemented: `MantineProvider defaultColorScheme="auto"`
in `app/providers.tsx` plus `<ColorSchemeScript defaultColorScheme="auto" />`
in `app/layout.tsx`, so the scheme follows the OS and is applied before first
paint (no white flash on a dark-mode machine). Every pair this document
measures was re-checked per scheme — the badge numbers are in §3, and the two
light-only rules found in `globals.css` (solid `gray-1` code chips, `gray-0`
scrollbar track) now use translucent/body tokens. A manual toggle now ships:
`components/ColorSchemeToggle.tsx`, the right-most control in the header,
calls `useMantineColorScheme().toggleColorScheme()` — which flips the
*computed* scheme (the OS value while on auto) and persists it through
Mantine's localStorage scheme manager, the same key `ColorSchemeScript` reads
before paint, so a chosen scheme survives reloads with no flash. Returning to
OS-following means clearing that key (Mantine's `clearColorScheme()`); there
is no UI for it unless staff ask. Print popups stay light-on-paper by design.

Do **not** hardcode hex in components (including the print popups, which should
keep using their own checked palette for paper output).

---

## 6. Typography, spacing and density

- **One type scale.** Use `fontSizes` tokens; body text ≥16px; captions
  (`c="dimmed"`) ≥12px only for secondary information.
- **Tabular numerals for inventory data:** `font-variant-numeric: tabular-nums`
  on table cells containing quantities. Without it, columns of numbers shimmer
  as digits change — this is the single cheapest "looks professional" win for a
  stock system.
- **Heading hierarchy.** *Found during review (item 2, now fixed):* pages used
  `Title order={2}` (12×) and `order={4}` (20×) but `order={3}` only 2× —
  `create-order`, `dashboard`, `help` and `sync` skipped h2 → h4, which breaks
  screen-reader heading navigation (1.3.1) and reads as unfinished. Rule: page
  title `order={2}`, section title `order={3}`, never skip a level. Source now
  holds `order={2}` ×17 (each loading state carries its own page title so the
  skeleton screen keeps the heading — only one branch ever renders),
  `order={3}` ×23, `order={4}` ×0.
- **Spacing:** use `spacing` tokens (`xs 4 / sm 8 / md 16 / lg 24 / xl 32`)
  rather than magic numbers; one vertical rhythm per page (`Stack gap="lg"`).
- **Table density:** one `verticalSpacing` for data tables; numbers right-
  aligned, names left-aligned; column headers must match cell content.

---

## 7. Component rules

- **Buttons:** exactly one primary button per area; `loading` state on every
  network action; destructive buttons `color="red"` + confirmation.
- **Icon buttons:** must satisfy 24×24 target size — a 16px icon needs ≥24px
  (prefer 32px) of hit area. Always give `aria-label` (icons alone fail 4.1.2).

  *Target-size audit (item 5, done):* ActionIcon resolves to
  `--ai-size: var(--ai-size-md)` = 1.75rem = **28px** ✅; text inputs at
  `size="xs"` are 1.875rem = **30px** ✅; the ColumnToggle `Switch size="xs"`
  is **32×16px** — under 24px tall, but it passes through the 2.5.8 spacing
  exception (16px gaps keep the notional 24px circle clear of its neighbours)
  and its label is clickable, which enlarges the effective target. **Never pass
  `size="xs"`/`sm` to an ActionIcon: those are 18px and 22px — both fail.**
- **Inputs:** visible label for every field; `description` for help text;
  errors next to the field, not only in a toast (3.3.1/3.3.2).
- **Toasts vs alerts:** transient success/failure → toast; a persistent state
  the user must act on (load failure, validation summary) → inline Alert with a
  retry. Never report a failure as an empty result.
- **Tables:** striped + hover + border (already the theme default), empty state
  with a next action, skeleton loading rows (`components/Skeletons.tsx`:
  `TableSkeleton` for pages that return early while loading, `SkeletonRows`
  inside an existing `<Table.Tbody>`). Sticky headers: every data table sits in
  a `.table-scroll` box, which caps it at 70vh so `thead th` can stick — the
  cap never binds on short tables, so nothing there changes, and print CSS
  drops the cap and unpins the header.
- **Modals:** Mantine traps focus ✅ — keep dialogs ≤`size="lg"` for forms,
  `centered`, and never put a whole page in a modal.

---

## 8. Rules for data tables and print output

- Column visibility persists per user (already implemented via
  `usePersistedState`) — new tables must register the same way, keyed
  `col:<page>:<name>`.
- Every table lives inside `<Box className="table-scroll">`, never a bare
  `style={{ overflowX: 'auto' }}`: the class is what gives the sticky header
  (§7) its scrollport and the print rules something to target. New tables must
  use it.
- Search filters *rendering*, never data: rows outside the filter keep their
  values and are still saved (already the contract on Cipta Pesanan — keep it).
- Print output is raw HTML written into a popup: **every string interpolated
  into it must go through `escapeHtml`** (`lib/print.ts`) and shared CSS/markup
  belongs in `lib/print.ts`, not copy-pasted per page.
- Print pages must include every column and hide with CSS, so `colspan` stays
  correct regardless of toggle state.

---

## 9. Content and language

- **Plain language** (heuristic #9): no codes, no jargon, say what to do next.
  Server errors return a message + request id; the id is for operators, never
  raw exception text.
- **Terminology consistency:** pick one Malay term per action and use it
  everywhere (`Kemas kini` / `Padam` / `Batal` / `Simpan`) — check against the
  help page, which is the de-facto glossary.
- **The help page must describe the app as built** — it is user documentation;
  any UI change updates it in the same commit.
- `<html lang="ms">` ✅ — keep it; it drives screen-reader pronunciation.

---

## 10. Pre-ship checklist

- [ ] `npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build` all green
- [ ] Contrast: status badges, links, dimmed text, focus ring ≥4.5:1 / 3:1
      — in **both** colour schemes (toggle the OS setting or the header
      switch; §3 has the numbers)
- [ ] Keyboard-only pass on every page (login → dashboard → form → save),
      including `/` focusing search on the three pages that have it
- [ ] Header theme toggle: switches scheme, `aria-label` names the target
      scheme, choice persists across reload
- [ ] Icon-button targets ≥24×24
- [ ] Loading / empty / error states all reachable and distinguishable
- [ ] Destructive actions confirm; import takes a pre-import backup
- [ ] 200% zoom and 320px width: no clipped content
- [ ] Print preview: toggles work, no unescaped data, `colspan` correct
- [ ] Help page matches the UI
- [ ] axe DevTools / Lighthouse on each page template

---

## 11. Measured backlog (priority order)

**Done — items 1–5:**

| # | Item | Evidence |
|---|---|---|
| ✅ 1 | Status badge contrast: 1.75–3.01:1 (Mantine default) → **18.7–19.7:1 light / 6.9–7.8:1 dark** | `components/StatusBadge.tsx` (single rule, used by dashboard, skus, sku-report and help) + `StatusBadge.test.ts`; print ink fixed in `app/sku-report` — both schemes measured in §3 (earlier light-only numbers were corrected there when the tint alpha was re-derived) |
| ✅ 2 | Heading skips (h2 → h4) | now `order={2}` ×17 (loading-state titles included; one branch renders at a time), `order={3}` ×23, `order={4}` ×0 — no page skips a level; verified in rendered HTML |
| ✅ 3 | `font-variant-numeric: tabular-nums` on `.mantine-Table-table td` | present in the built CSS |
| ✅ 4 | `autoContrast: true` + `respectReducedMotion: true` in `createTheme` | both present in the client bundle |
| ✅ 5 | Icon-button target-size audit | §7 — ActionIcon 28px, inputs 30px, Switch 32×16 via the spacing exception |

**Done — items 6–10:**

| # | Item | Evidence |
|---|---|---|
| ✅ 6 | Skeleton loaders instead of bare spinners | `components/Skeletons.tsx` (`TableSkeleton` + `SkeletonRows`, 5 tests) used by dashboard, skus, groups, create-order, edit-order, order-report, sku-report — no page returns a bare `Loader` any more; the shimmer honours `prefers-reduced-motion` (`globals.css`) |
| ✅ 7 | Sticky table headers | `.table-scroll` on all 8 table wrappers: 70vh cap + sticky opaque `thead th` (border redrawn as an inset shadow, since a collapsed border does not travel with a sticky cell), all dropped for print — §7, §8 |
| ✅ 8 | Semantic status palette | `STOCK_STATUS` in `lib/calculations.ts`: one row per status (`label`, `color`, `printBg`) feeding `statusColor()`/`statusLabel()`, `StatusBadge` and the print background (+3 tests) — §5 |
| ✅ 9 | Keyboard accelerator, implemented *then* documented | `lib/useSlashToFocus.ts` (`/` → focus search, ignores fields already focused, `preventDefault` vs Firefox quick-find) on skus / create-order / edit-order via `data-search-input`; the help page documents exactly this one shortcut |
| ✅ 10 | Dark mode with per-scheme re-measurement | `ColorSchemeScript` + `defaultColorScheme="auto"` (follows the OS, no flash); badge ink re-measured per scheme and switched to `--mantine-color-text` (§3: 18.7–19.7:1 light, 6.9–7.8:1 dark); two light-only CSS rules fixed (code chip, scrollbar track); manual header toggle (`components/ColorSchemeToggle.tsx`) persists via Mantine's scheme manager — §5 |

**Remaining:** none open. The one optional extra from item 10 — a manual
scheme toggle instead of OS-following — is written up in §5 if staff ask for
it. Note that `useSlashToFocus` has no unit test: vitest runs without a DOM,
so its keydown behaviour needs either a DOM environment or a manual check
before release (§3 "how to verify" step 2 covers it — press `/` on the Item
page).

---

## 12. Further reading

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Understanding docs](https://www.w3.org/WAI/WCAG22/Understanding/)
- [Mantine theming](https://mantine.dev/theming/theme-object/) · [default props](https://mantine.dev/theming/default-props/)
- [GOV.UK Design System](https://design-system.service.gov.uk/) · [Accessibility strategy](https://design-system.service.gov.uk/accessibility/accessibility-strategy/)
- [NN/g heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) · [Error message guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
- [Material 3](https://m3.material.io/foundations) and [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) — not yet reviewed here (JS-only pages); worth a pass when search access is restored.
- [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/) · [axe DevTools](https://www.deque.com/axe/devtools/)
