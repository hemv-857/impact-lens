---
name: ImpactLens
description: A dark field register. The org's own verified photos lead, and the next item to review gets the most space.
colors:
  ember: "#ef8a4a"
  ember-hover: "#f79b5f"
  ember-ink: "#1c0f06"
  ember-text: "#f5a771"
  ember-glow: "#f39d66"
  ember-wash: "#2a1a10"
  ember-rule: "#5a3620"
  ground: "#14110e"
  rail: "#110e0c"
  panel: "#1b1714"
  raised: "#231e1a"
  rule: "#2a241f"
  rule-strong: "#3a322b"
  bone: "#f5eee6"
  bone-soft: "#cfc3b4"
  ash: "#b3a697"
  ash-soft: "#9c8f80"
  ash-faint: "#8a7e70"
  bar-neutral: "#6b6055"
  slate-tag: "#22252a"
  slate-tag-text: "#c6cbd0"
  caution: "#e3b85c"
  destructive: "#f08a7a"
  light-ground: "#f6f3ef"
  light-sheet: "#ffffff"
  light-raised: "#ede8e2"
  light-rule: "#e2dbd3"
  light-ink: "#1a1510"
  light-ash: "#62574d"
  light-ember: "#b9541b"
  light-ember-hover: "#9a4413"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  section:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  tally:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\" 1"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  accession:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  control: "8px"
  tag: "6px"
  media: "12px"
  panel: "16px"
  full: "9999px"
spacing:
  row-y: "12px"
  panel-pad: "24px"
  panel-pad-sm: "20px"
  gap: "32px"
  gutter: "40px"
  rail: "240px"
components:
  button-commit:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.ember-ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-commit-hover:
    backgroundColor: "{colors.ember-hover}"
  button-outline:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.bone}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  button-ghost-accent:
    backgroundColor: "transparent"
    textColor: "{colors.ember-text}"
    rounded: "{rounded.control}"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.bone}"
    rounded: "{rounded.panel}"
    padding: "24px"
  media-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.media}"
  nav-item:
    textColor: "{colors.ash-soft}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
  nav-item-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.bone}"
  count-badge:
    backgroundColor: "{colors.ember-wash}"
    textColor: "{colors.ember-text}"
    rounded: "{rounded.tag}"
    padding: "0 6px"
  tag:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ash}"
    rounded: "{rounded.tag}"
    padding: "2px 8px"
  sdg-tag:
    backgroundColor: "{colors.slate-tag}"
    textColor: "{colors.slate-tag-text}"
    rounded: "{rounded.tag}"
  search-field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ash-faint}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
---

# Design System: ImpactLens

## Overview

**Creative North Star: "The Field Register"**

ImpactLens is a register of field evidence set on a warm near-black ground. The org's own photographs are the brightest things on the screen; everything else is tonal: panels one step lighter than the ground, hairline edges, bone text in five steps of warmth. One ember accent is spent where something is committed or selected, and nowhere else.

Evidence leads. Home opens on a photo hero carrying one sentence of state ("1 asset is waiting for review.") and four running totals, then gives the widest column to the next item to review, drawn large enough to check the photo against the AI's reading of it. Every asset carries an accession number in mono and one of three evidence marks. Numbers are tabular so columns of confidence and counts line up like a ledger.

Dark is the default theme (`next-themes`, `defaultTheme="dark"`). A light theme is derived from the same roles: warm paper ground, white sheets, a deeper ember that holds contrast on white. The system refuses the icon-KPI-card dashboard: totals are set as plain type over the evidence, not as tiles with icons.

**Key Characteristics:**
- Warm near-black ground with tonal panels a step up; depth from tone and hairlines, not shadow.
- One ember accent, rationed to commit actions, selection, focus, and the verified stamp.
- Real field photographs as the hero material; no illustration, no stock gradients standing in for evidence.
- Accession numbers (`A·XXXXXX`) in Geist Mono; everything else in Public Sans.
- Tabular figures on every count, percentage, and score.
- Generous rounding on containers (16px panels, 12px media) over square controls-sized corners (8px).

## Colors

A warm-neutral register with a single ember accent; hue beyond that appears only as external data (UN SDG identity colours).

### Primary
- **Ember** (`ember`): the one accent. Fills the commit button (Add media, Verify, Get started), the active tab underline, the active nav icon, the focus ring, the Mark tile, and the verified evidence stamp. Text on it is **Ember Ink** (`ember-ink`) because white on ember fails AA.
- **Ember Hover** (`ember-hover`): the commit button's hover fill.
- **Ember Text** (`ember-text`): ember when it has to be read as text on dark: count badges, the "Verify all analyzed" ghost action, in-text links.
- **Ember Glow** (`ember-glow`): the single highlighted figure or phrase in a hero headline (the waiting count, "evidence of impact."). Only over the photo hero.
- **Ember Wash / Ember Rule** (`ember-wash`, `ember-rule`): the tinted ground and edge of count badges and selected choices.
- **Light Ember** (`light-ember`, hover `light-ember-hover`): the same role in the light theme, deepened to hold contrast on white.

### Neutral
- **Ground** (`ground`): the page and the photo hero's base; the photo fades into it.
- **Rail** (`rail`): the left navigation rail, a half-step darker than the ground so the rail recedes.
- **Panel** (`panel`): cards, panels, media cards, the search field.
- **Raised** (`raised`): active nav item, tags, hover rows, thumbnail placeholders, skeletons.
- **Rule / Rule Strong** (`rule`, `rule-strong`): hairline edges and row dividers; strong rules for table heads and input borders.
- **Bone** (`bone`): primary text and headings. **Bone Soft** (`bone-soft`) for secondary body copy; **Ash** (`ash`) for captions and meta; **Ash Soft** (`ash-soft`) for inactive nav and quiet meta; **Ash Faint** (`ash-faint`) for placeholders and chevrons.
- **Bar Neutral** (`bar-neutral`): project verified-share bars and category bars. Progress is neutral, not ember.
- **Slate Tag** (`slate-tag`, text `slate-tag-text`): the quiet slate used for SDG and archive labels, the one cool note in a warm system.
- **Caution** (`caution`): AI confidence below 60%. **Destructive** (`destructive`): errors and destructive actions.
- **Light theme**: `light-ground` page, `light-sheet` panels, `light-raised` tags and hovers, `light-rule` hairlines, `light-ink` text, `light-ash` muted text.

### Named Rules
**The Ember Budget Rule.** Ember is spent on exactly four things: commit actions, selection (active nav icon, active tab underline, review count badge), the focus ring, and the verified stamp. Progress bars, charts of volume, decorative icons and headings stay neutral. If a screen has two ember buttons, one of them is wrong.

**The Evidence Is The Colour Rule.** The only saturated hues on screen besides ember are the org's photographs and the fixed UN SDG identity colours in SDG coverage. No other hue is introduced as decoration.

**The Dark Ink On Ember Rule.** Text and glyphs on an ember fill use Ember Ink, never white.

## Typography

**Display Font:** Public Sans (with system-ui, sans-serif)
**Body Font:** Public Sans
**Label/Mono Font:** Geist Mono, for accession numbers and keyboard hints only

**Character:** Public Sans is a civic workhorse built for forms and registers; set semibold with tight tracking it carries headlines without a second display face. Mono is reserved for identifiers, so an accession number is recognisable at a glance.

### Hierarchy
- **Display** (600, 48px to 72px, line-height 1.02, tracking -0.025em): the landing claim only.
- **Headline** (600, 30px to 36px, tight tracking, balanced wrap): the Home state sentence over the photo hero.
- **Section** (600, 24px, tight tracking): the section h1 (Library, Projects, Reports) sitting on the tab rule; landing section heads at 24px to 30px.
- **Tally** (600, 30px, tabular figures): the four hero totals and similar standalone counts. Confidence beside a featured asset uses the same treatment at 24px.
- **Title** (600, 18px): panel headings (Awaiting review, Active projects); 20px for the featured asset's title.
- **Body** (400, 14px, line-height 1.43; relaxed 1.625 for AI readings and prose): rows, descriptions, form copy. Landing lede at 18px, max 44ch.
- **Label** (400, 12px): meta lines, table heads, tag text, "confidence" captions.
- **Accession** (Geist Mono 400, 11px): `A·` plus the last six id characters, uppercase. Next to titles, in rows, on hero captions and thumbnail placeholders.

### Named Rules
**The Mono Means Identifier Rule.** Geist Mono is only for accession numbers and key hints. Never for headings, labels, or numbers that are measurements.

**The Ledger Figures Rule.** Every count, percentage, score and rank is set with tabular figures so stacked values align.

**The Sentence Case Rule.** Headings, labels and buttons are sentence case at their natural tracking. Hierarchy comes from size and weight, not from uppercase tracked micro-labels.

## Layout

A fixed 240px left rail (from `lg`) holds the brand, four section links (Home, Library, Projects, Reports) and the account menu. A sticky 64px top bar carries the command-palette search field (max 448px) and, at the far right, the one ember button. Content sits in a centred column capped at 1440px with 16px / 24px / 40px gutters across breakpoints.

Sections with more than one view open with the section h1 and an underline tab row sharing one hairline rule. Home runs a 12-column grid: the review panel takes 8 columns and the aside of projects and latest reports takes 4; panels stack with a 32px gap. Below `lg` the rail moves into a left sheet opened from the top bar and the grid collapses to one column. The featured review item switches from stacked to side-by-side at a container width (container query), not a viewport breakpoint.

Rows are generous: 12px vertical padding, 48px to 64px tall thumbnails at 3:2-ish crops, hairline dividers between rows. Panels pad 20px on small screens and 24px up.

## Elevation & Depth

Flat and tonal. Depth is conveyed by stepping surfaces up in lightness (ground, panel, raised) and by 1px hairline edges; resting surfaces carry no shadow, and hover on a card darkens its hairline instead of lifting it. Shadows exist only on true overlays that sit above the page (command palette, shortcut help, comparison dialog, the floating bulk-action bar).

### Shadow Vocabulary
- **Overlay** (Tailwind `shadow-2xl`, `0 25px 50px -12px rgb(0 0 0 / 0.25)`): modal-like overlays only.

### Named Rules
**The Nothing Floats Rule.** At rest, nothing on the page casts a shadow. Hover changes an edge or a tone, never elevation.

**The Photo Carries Light Rule.** The brightest pixels on a screen belong to field photographs; the hero fades its photo into the ground with gradients so text always sits on the dark side, never over the image's detail.

## Shapes

Soft containers, crisp contents. Panels and cards round at 16px, media frames and media cards at 12px, controls (buttons, nav items, inputs, thumbnails in rows) at 8px, tags and badges at 6px. Avatars and the scroll thumb are fully round. The Mark is an ember tile rounded to about a quarter of its size, with an aperture ring and a focal point. Borders are 1px hairlines everywhere; the only heavier strokes are the 2px active tab underline and the 2px focus outline.

## Components

### Buttons
- **Shape:** control corners (8px), 40px tall in the top bar and hero, 28px inline in rows.
- **Commit:** ember fill, ember-ink text, semibold, 16px horizontal padding. Used for Add media, Verify on the featured item, Get started, Generate. At most one per view.
- **Hover / Focus:** hover lightens to ember-hover; focus is a 2px ember outline offset 2px on every interactive element.
- **Outline:** hairline border on ground, bone text; the row-level Verify and Analyze actions.
- **Ghost accent:** transparent with ember-text, ember-wash on hover; secondary bulk actions ("Verify all 3 analyzed").
- **On-photo:** over the hero, a translucent white fill (10%) with a 25% white edge, so the action reads without competing with ember.

### Chips
- **Tags:** raised fill, ash text, 6px corners, 12px type. AI tags on assets.
- **SDG tags:** slate-tag fill and edge with slate text, reading as archive labels.
- **Count badge:** ember-wash with ember-text, tabular semibold; beside "Awaiting review" and on the Home nav item.

### Cards / Containers
- **Corner Style:** panels 16px, media cards 12px.
- **Background:** panel on ground.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px rule; hover strengthens it to rule-strong.
- **Internal Padding:** 20px to 24px; media cards are full-bleed image with a padded caption.

### Inputs / Fields
- **Style:** 1px rule-strong border, panel or translucent fill, 8px corners, 36px to 40px tall. Caret is ember.
- **Focus:** ember border with an ember ring.
- **Search field:** in the top bar, panel fill, ash-faint placeholder, a mono `⌘K` key hint at the right.

### Navigation
- **Left rail:** rail fill, 40px items with 18px line icons at 1.75 stroke. Inactive items are ash-soft; hover takes a panel tone; the active item takes the raised tone with bone text and an ember icon. Home carries the review count badge.
- **View tabs:** text tabs on the section's hairline rule; the active tab gets a 2px ember underline and medium weight, inactive tabs are ash and turn bone on hover.
- **Mobile:** the same nav in a left sheet from a menu button; the brand moves into the top bar.

### Evidence Mark (signature)
A 16px to 20px SVG mark that carries evidence state by shape, never by colour alone, each with an accessible label: **Verified** is a filled ember disc with a tick; **Analyzed, not verified** is an open ring in ash; **Awaiting analysis** is a dashed ring in ash. It sits beside confidence figures in rows, on media cards and in the featured review.

### Photo Hero (signature)
A 16px-rounded panel on the ground with a verified landscape photo occupying the right 62% on desktop, masked to fade leftward into the ground. The left column holds the state sentence (ember-glow on the count), a one-line age note, and four tallies in 65% white labels over bone figures. A caption with the photo's title and accession number sits bottom right beside the on-photo action.

### Review Row
Thumbnail (8px corners), title (medium, underlines on hover), a meta line of accession number, project and age; then a right-aligned tabular confidence (caution below 60%), the evidence mark, and an outline Verify or Analyze action while unverified.

## Do's and Don'ts

### Do:
- **Do** keep ember to commit actions, selection, the focus ring and the verified stamp; one ember button per view.
- **Do** put text on ember in ember-ink (`#1c0f06`), never white.
- **Do** build depth from ground, panel and raised tones with 1px hairlines; strengthen the hairline on hover.
- **Do** show an accession number (`A·XXXXXX`, Geist Mono 11px) wherever an asset is named.
- **Do** mark evidence state with the three Evidence Marks, each with its text label for assistive tech.
- **Do** set every count, percentage and score in tabular figures.
- **Do** lead with the org's own verified photographs; fade them into the ground so text sits on dark.
- **Do** round panels 16px, media 12px, controls 8px, tags 6px.

### Don't:
- **Don't** fill progress bars, volume charts or decorative icons with ember; they use bar-neutral.
- **Don't** set totals as icon-topped KPI cards; set them as plain type in a row.
- **Don't** introduce hues other than ember, caution, destructive and the fixed UN SDG colours.
- **Don't** use mono for headings, labels or measurements.
- **Don't** add shadows to resting panels or cards, or lift on hover.
- **Don't** put uppercase tracked micro-labels or eyebrows above headings.
