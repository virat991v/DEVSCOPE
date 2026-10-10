# DevAtlas — UI References

**Version:** 0.1

---

## Component sources

All UI components in this project are original implementations built from the design specification, using the following as primitives and design references.

### Radix UI primitives (MIT License)

Used as accessible, unstyled behavior primitives. Styled entirely to DevAtlas tokens.

| Package | Version | Use |
|---------|---------|-----|
| `@radix-ui/react-dialog` | ^1.2.0 | Modals and drawers |
| `@radix-ui/react-dropdown-menu` | ^2.1.25 | Dropdown menus |
| `@radix-ui/react-tooltip` | ^1.3.0 | Tooltips (Tooltip.tsx) |
| `@radix-ui/react-avatar` | ^1.2.7 | Avatar primitive (Avatar.tsx) |
| `@radix-ui/react-select` | ^2.3.8 | Select controls |
| `@radix-ui/react-tabs` | ^1.1.22 | Tab navigation (Tabs.tsx) |
| `@radix-ui/react-separator` | ^1.1.16 | Dividers |
| `@radix-ui/react-slot` | ^1.4.0 | Polymorphic `asChild` pattern |
| `@radix-ui/react-label` | ^2.1.16 | Form labels |
| `@radix-ui/react-progress` | ^1.1.17 | Progress bars |
| `@radix-ui/react-scroll-area` | ^1.3.0 | Scrollable regions |
| `@radix-ui/react-popover` | ^1.2.0 | Popovers |

### Icons

**lucide-react** (ISC License) — version ^1.52.0. Used as the single icon family at 14–18px.  
No random emoji used as product icons.

### Fonts

**Inter** — Variable font from Google Fonts CDN (SIL Open Font License).  
For production, replace CDN link with locally served Inter to avoid external dependency.  
Monospace: JetBrains Mono / Fira Code (system fallback in Phase 1).

---

## 21st.dev reference

The specification notes 21st.dev as an optional source for selective component ideas (navigation, tabs, menus). No component code was copied from 21st.dev in Phase 1. All implementations are original. If components are adopted in later phases, they will be documented here with source URL, license, and modifications.

## MotionSite.ai reference

The specification references MotionSite.ai for restrained transition ideas. No animated backgrounds or motion patterns were adopted from this source. All transitions are original CSS/Tailwind implementations meeting the specified timing targets (120–260ms).

---

## Attribution requirements

- Radix UI: MIT License — no attribution required in product UI
- lucide-react: ISC License — no attribution required in product UI
- Inter: SIL Open Font License — attribution in documentation is sufficient

## To do (Phase 1+)

If shadcn/ui component source is adopted in a later phase, record here:
- Component name
- Source URL (exact 21st.dev registry URL if applicable)
- License
- Modifications made to match DevAtlas tokens
