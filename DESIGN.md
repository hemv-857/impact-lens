---
name: ImpactLens
description: An accession register for field evidence. Every photo numbered, provenanced, verified, citable.
colors:
  ink: "#16201c"
  field-green: "#1f6b4a"
  field-green-deep: "#185a3d"
  field-green-wash: "#eef5f1"
  archive-blue-grey: "#5f7584"
  archive-blue-grey-wash: "#f0f3f5"
  paper: "#f6f7f6"
  sheet: "#ffffff"
  shelf: "#eceeed"
  rule: "#dde1e0"
  rule-strong: "#c4cac9"
  graphite: "#5a6563"
  graphite-soft: "#6c7775"
  destructive: "#b3261e"
  caution: "#b07a2a"
  dark-paper: "#0f1412"
  dark-sheet: "#161d1b"
  dark-ink: "#eef1f0"
  dark-rule: "#2c3533"
  dark-field-green: "#6fbf93"
typography:
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  tally:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\" 1"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
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
  sm: "2px"
  md: "4px"
  lg: "6px"
  full: "9999px"
spacing:
  row-y: "10px"
  row-y-media: "12px"
  gap: "16px"
  section: "40px"
  gutter: "24px"
components:
  button-commit:
    backgroundColor: "{colors.field-green}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-commit-hover:
    backgroundColor: "{colors.field-green-deep}"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-row-action:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "28px"
    padding: "0 10px"
  input-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
  label-tag:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  media-card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.md}"
  view-tab:
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    padding: "4px 10px 10px"
  view-tab-active:
    textColor: "{colors.ink}"
---

# Design System: ImpactLens

## Overview

**Creative North Star: "The Accession Register"**

The signed-in app is a working register, not a dashboard. Every field photo is an accessioned item with a number, a provenance line, a confidence figure and a state mark, and the interface is the ledger that holds them. Density is operational: ruled rows, running totals, tables with ranked numbers, one line of metadata under each title. The page reads top to bottom like a register page, never as a grid of KPI cards.

The material is cool archival paper: a near-white grey-green ground, white sheets only where an item needs a frame (media cards, inputs, menus), and hairline rules doing all structural work. Colour is withheld. Ink and graphite carry text and state; archive-box blue-grey is a quiet secondary neutral; field green is spent only where the user commits (add, verify) and on the verified stamp. The only saturated palette in the product is the UN SDG set, because it is an external standard the evidence is filed against.

Motion is minimal: hairlines darken on hover, views fade in over 200ms, nothing lifts or floats.

**Key Characteristics:**
- Ruled ledger rows (hairline top and bottom rule, 1px dividers) as the primary container.
- Mono accession numbers in the form A·XXXXXX on every item and every missing-image placeholder.
- Tabular figures for every count, percentage and score, right-aligned.
- Evidence state drawn as a mark (filled stamp tick / open ring / dashed ring), never colour alone.
- One commit colour, field green; everything else is ink, graphite and rule.
- Light and dark are both first-class; dark is a deep green-black ground with a lighter field green.

## Colors

Cool archival neutrals with a single committed green; hue is a spend, not a decoration.

### Primary
- **Field Green** (field-green): the one commit colour. The header's Add media button, the empty-state primary action, the verified stamp, the text of the bulk "Verify all" action, the input caret, and the focus ring (at its lighter 500 step). Hover deepens to Field Green Deep. In dark mode it becomes Dark Field Green.
- **Field Green Wash** (field-green-wash): hover wash behind green ghost actions and the text selection background. Never a card fill.

### Secondary
- **Archive-Box Blue-Grey** (archive-blue-grey): the remapped teal scale. A second, cooler neutral for filed-away material: SDG goal labels on project cards (wash background, 800-step text) and the second chart series. Reads as a box label, not an accent.

### Neutral
- **Ink** (ink): all primary text, headings, active nav and view-tab underline, the logo tile, and the default primary button in shadcn surfaces.
- **Paper** (paper): the app ground. Header sits on paper too, separated by a rule, not by a fill.
- **Sheet** (sheet): white, only for framed items: media cards, inputs, outline buttons, menus, label tags on photos.
- **Shelf** (shelf): muted fills, skeletons, row hover wash (at 60% opacity), missing-thumbnail placeholder, the empty track of bar rows.
- **Rule** (rule): every hairline, divider and card border.
- **Rule Strong** (rule-strong): input strokes, table header rule, dashed empty cells, hover state of a hairline.
- **Graphite** (graphite): secondary text, metadata lines, inactive tabs, unverified state marks. Graphite Soft is the lowest-emphasis text still meeting contrast.
- **Caution** (caution): chart series 4 and low-confidence figures (amber 700 in rows under 60%). **Destructive** (destructive): failed calls, destructive actions.

### Named Rules
**The One Commit Colour Rule.** Field green appears only on commit actions and the verified stamp. Categories, statuses, headings, charts of neutral data and decorations stay in ink and graphite. If a screen has more than two green elements that are not verified marks, one of them is wrong.

**The External Hue Rule.** The UN SDG colours (the official 17-goal palette) are the only saturated hues in the product, and they appear only where an SDG goal is being shown as coverage. They are the standard's colours, not ours; never borrow them for anything else.

**The Neutral Label Rule.** Category and project status are labels, not states: ink text on a white tag with a rule border. They never get a hue.

## Typography

**UI Font:** Public Sans (with system-ui, sans-serif)
**Mono Font:** Geist Mono (with ui-monospace, monospace)

**Character:** Public Sans is a civic workhorse built for forms and registers; it sets everything, headings included, with weight and size doing hierarchy. Geist Mono is the catalogue stamp, reserved for identifiers.

### Hierarchy
- **Headline** (600, 1.25rem, tight tracking): the section h1 (Library, Projects, Reports) that sits left of the view tabs. Empty-state titles go one step up (1.5rem).
- **Tally** (600, 1.5rem, tabular, tight tracking): the running totals strip on Home. 1.125rem on mobile.
- **Title** (600, 1rem): section h2s inside a view (Awaiting review, Project health, SDG coverage), with an optional graphite count or note set right or inline.
- **Body** (400 or 500, 0.875rem): row titles (500), table cells, buttons, tabs, paragraphs.
- **Label** (400, 0.75rem): metadata lines under row titles, table header cells (500, graphite), tally labels (11px on mobile).
- **Accession** (Geist Mono 400, 11px): accession numbers, rank numbers (01, 02), AI model identifiers, keyboard hints. Nothing else.

### Named Rules
**The Tabular Figures Rule.** Every number that can be compared (counts, percentages, scores, milliseconds) is set with tabular figures and right-aligned in its column.

**The Mono Is An Identifier Rule.** Geist Mono marks things that are catalogue identifiers: accession numbers, ranks, model names, shortcut keys. Prose, labels and headings never use it.

**The Sentence Case Rule.** Headings, labels and table headers are sentence case at normal tracking. The register does not shout.

## Layout

A single centred column, max 80rem (1280px) with 16px side padding (24px from sm). The sticky 56px header carries the logo, four section links (Home, Library, Projects, Reports), a Jump to command field, the one green Add media button, theme toggle and account menu.

Each non-Home section opens with a heading bar: the section h1 and its underline view tabs on one baseline, sitting on a rule, 24px above the content. Home has no visible h1; it opens with the tally strip.

Home is a 12-column split on large screens: an 8-column review queue of ledger rows and a 4-column aside of Active projects and Latest reports lists. Sections are separated by 40px (48px on Insights). Rows use 10px vertical padding for text-only rows and 12px for rows with a thumbnail. The Library is a 4-column media card grid (fewer at narrow widths) with a toolbar of search, category select and outline actions above it.

Below md the section links collapse into a left sheet; the tally becomes a five-column grid framed by top and bottom rules; secondary columns (project name, per-column counts) hide rather than wrap.

### Named Rules
**The Ruled Row Rule.** Lists are rows between rules, not stacked cards: a top and bottom rule on the list, 1px dividers between rows, a faint shelf wash on hover. Reach for a card only when the item is an image.

## Elevation & Depth

Flat. Depth comes from the paper/sheet step and from hairline rules, not from shadows. Hover darkens a hairline (rule to rule-strong over 150ms) or washes a row with shelf; nothing lifts. The only shadows in the app shell belong to floating layers the platform stacks above the page (command palette, dialogs, popovers from shadcn), and to the drag handle on the before/after slider where a white line has to separate from a photo.

### Named Rules
**The Hairline Not Shadow Rule.** A resting surface never carries a shadow. If something needs to separate, give it a rule; if it needs to respond, darken the rule.

## Shapes

Small, square-shouldered corners: 4px on buttons, inputs, tags and media cards, 6px on generic cards, 2px on SDG tiles and thumbnails. Full rounding only for the state marks, avatars and scrollbar thumbs. Rules are 1px; the active nav and view-tab underline is 2px ink. Dashed strokes mean absence or pending: the pending mark's ring, an uncovered SDG cell, a missing-image placeholder.

## Components

### Buttons
Plain and utilitarian; the colour is the message.
- **Shape:** gently squared (4px).
- **Commit:** field green with white text, 32px tall in the header. One per view at most; in the header it is Add media.
- **Outline:** white sheet, rule border, ink text, 36px. The default for every non-commit action (Generate report, Filters, Select, Export CSV).
- **Row action:** a 28px outline button at the end of a ledger row (Verify, Analyze).
- **Ghost:** transparent; green text only when the action commits (Verify all N analyzed).
- **Focus:** 2px ring in field green (500 step) with 2px offset on every interactive element.

### Evidence Mark (signature)
A 16px state glyph that ends every item row and card footer, always paired with its accessible label.
- **Verified:** filled field-green disc with a white tick (the stamp).
- **Analyzed, not verified:** open graphite ring, 1.6px stroke.
- **Awaiting analysis:** dashed graphite ring.
It sits immediately right of the confidence percentage.

### Ledger Row (signature)
Thumbnail (64x48, 80x56 from sm, 2px radius) · title (500 body, underlines on hover) over a metadata line (accession number in mono, project, relative time) · right-aligned confidence percentage (tabular; caution colour under 60%) · evidence mark · a fixed-width action slot.

### Accession Number
`A·` plus the last six characters of the id, uppercase, in the accession style. Appears in every row, every card footer, and fills the missing-image placeholder (a dashed rule-strong box on shelf) so an item without a photo still has an identity.

### Cards / Containers
- **Media card:** white sheet, 4px corners, rule border, no padding around the photo, no shadow. The photo carries a neutral category tag top-left; the footer holds title, confidence and evidence mark, then accession number and location in one line. Hover darkens the border.
- **Generic card (shadcn):** 6px corners, rule border, 24px padding. Used for forms and panels, not for lists.

### Chips / Tags
- **Label tag:** white at 90%, rule border, ink text, normal weight, capitalised. Category and status both use it.
- **SDG label on project cards:** archive blue-grey wash with 800-step text.

### Inputs / Fields
White sheet, rule-strong stroke, 4px corners, 36px tall, leading icon in graphite. Focus is the field-green ring; the caret is field green.

### Navigation
- **Section links:** body 500, graphite, ink when active, with a 2px ink underline pinned to the header's bottom rule.
- **View tabs:** body size, graphite, active tab ink 500 with a 2px ink bottom border sitting on the heading bar's rule.
- **Mobile:** section links move into a 288px left sheet.

### Data Rows
Tables and bar rows follow the ledger: rule-strong header rule, rule dividers, mono rank numbers, tabular right-aligned figures, score column in 600 ink. Bar rows are a 6px graphite bar on a shelf track; bars stay neutral. SDG coverage is 17 square 2px-cornered tiles in the official goal colours, dashed empty cells for uncovered goals.

## Do's and Don'ts

### Do:
- **Do** give every item its accession number in Geist Mono, including when its image is missing.
- **Do** show evidence state with the three marks (stamp tick, open ring, dashed ring) and a text label for assistive tech.
- **Do** set every comparable number in tabular figures, right-aligned.
- **Do** build lists as ruled rows with a top and bottom rule and 1px dividers.
- **Do** keep field green to commit actions and the verified stamp; one green button per view.
- **Do** open every non-Home section with the h1 plus underline view tabs on a single rule.
- **Do** pair every light value with its dark counterpart (dark paper, dark sheet, dark rule, dark field green).

### Don't:
- **Don't** build KPI cards: no boxed stat tiles, icons over numbers, or trend chips. Totals are a tally strip.
- **Don't** colour categories or statuses; they are neutral ink labels.
- **Don't** use SDG colours outside SDG coverage, or any other saturated hue for decoration.
- **Don't** put shadows on resting surfaces or lift things on hover.
- **Don't** use Geist Mono for prose, labels or headings.
- **Don't** set uppercase tracked micro-labels above headings; headings are sentence case and speak for themselves.
- **Don't** convey state by colour alone.
