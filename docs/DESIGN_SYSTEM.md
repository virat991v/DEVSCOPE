# DevAtlas — Design System

**Version:** 0.1

---

## Design token palette

| Token | Value | Use |
|-------|-------|-----|
| Canvas | `#0B1020` | Main background |
| Surface | `#111827` | Navigation and panels |
| Raised surface | `#172033` | Menus and selected panels |
| Border | `#243044` | Dividers and input boundaries |
| Primary | `#6366F1` | Primary actions and selection |
| Secondary | `#22D3EE` | Sparse supporting accent |
| Success | `#22C55E` | Successful states |
| Warning | `#F59E0B` | Attention and major milestones |
| Danger | `#EF4444` | Errors and destructive actions |
| Text Primary | `#F8FAFC` | Headings and body |
| Text Secondary | `#CBD5E1` | Supporting text |
| Text Muted | `#94A3B8` | Metadata |

Tokens are defined as CSS custom properties in `src/styles/index.css` and as Tailwind theme extensions via `@theme`. Use Tailwind utility classes (`bg-canvas`, `text-text-muted`, etc.) — never scatter hex values in components.

## Typography

| Scale | Size | Use |
|-------|------|-----|
| Metadata | 12px | Timestamps, roll numbers, badges |
| Controls/tables | 14px | Table rows, buttons, inputs |
| Body | 16px | Paragraphs, descriptions |
| Section titles | 20px | Card headers |
| Page titles | 28–32px | H1 per page |

Font: Inter (locally served in production). Monospace (JetBrains Mono / Fira Code) only for repository paths, SHAs, and technical identifiers. Tabular numerals (`font-variant-numeric: tabular-nums`) for metric columns.

## Spacing

Base unit: 4px. Primary increments: 8, 12, 16, 24, 32px.

## Border radii

| Token | Value | Use |
|-------|-------|-----|
| `--radius-control` | 6px | Buttons, inputs, badges |
| `--radius-panel` | 10px | Cards, major panels |
| `--radius-large` | 12px | Overlays, modals |

## Component primitives

All in `src/components/ui/`:

- **Button** — variants: primary, secondary, ghost, danger, outline; sizes: sm, md, lg; loading state
- **Avatar** — initials-based, no external photo fetches; sizes: sm, md, lg
- **Badge** — variants: default, success, warning, danger, secondary, info
- **Card / CardHeader / CardContent** — surface or raised-surface backgrounds
- **Skeleton / SkeletonText** — matches final layout shape
- **Tooltip** — Radix-based, 400ms delay
- **Tabs / TabsList / TabsTrigger / TabsContent** — Radix-based, border-bottom active indicator

## Signature product patterns

### Evidence Rail
Compact clickable sequence: Assignment → Repository → Submission → Evaluation. Each stage shows real state; opens relevant record. Stacks on narrow screens.

### Faculty Attention Queue
Actionable items with transparent reasons. Distinguishes academic problems (overdue submission, revision pending) from data availability problems (GitHub broken, stale sync). Never labels a student "at risk" from commits alone.

### Academic Activity Explorer (Heatmap)
Contribution calendar with intensity based on approved-repository commit count. Day detail panel shows events, repos, evidence status. Keyboard-accessible; days expose date/count/coverage to screen readers. Accessibility list view toggle included. Legend explains stale/outside-scope states.

### Development Tower
Floor-based consistency progression. Labels: Getting Started, Building Rhythm, Consistent Practice, Sustained Practice, Long-Term Commitment. Has textual equivalent. Never claims expertise from commit frequency.

## Layout shell

- Desktop: 232px sidebar + 56px topbar + content region with 24–32px gutters
- Sidebar collapses to icon rail
- Content max-width: 1400px (overview), 1200px (profiles)
- Skip link present for keyboard users
- Focus ring: 2px solid primary, 2px offset

## Interaction principles

- 120–160ms hover/focus transitions
- 160–220ms dropdown/tab feedback
- 200–260ms drawers
- Prefer opacity + transform; avoid large layout animations
- Respect `prefers-reduced-motion`; all non-essential motion disabled
- Never animate large layouts, count-up metrics, or long row staggers

## Avoiding generic dashboard patterns

- No oversized welcome banner
- No repeated grid of unrelated stat cards on every page
- No gradient text, animated blobs, glowing borders on ordinary controls
- No glassmorphism on tables
- No charts to fill empty space
- No marketing copy inside work screens
