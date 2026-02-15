# KRATOS v2 — Phase 3 Frontend Design

**Date**: 2026-02-15
**Status**: Approved
**Author**: Felipe + Kai (Claude Code)

## Overview

Phase 3 delivers the KRATOS v2 frontend — a React SPA for document management, AI analysis review, and human-in-the-loop approval workflow. Builds on Phases 0-2 (API, LangGraph pipeline, RAG).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delivery | Incremental | Dashboard → HITL → DOCX, each independently testable |
| Architecture | SPA (Vite) | Internal app, no SEO needed, backend already separate |
| UI Library | shadcn/ui + Radix UI | Full code ownership, Tailwind 4 native |
| State | Zustand + React Query | Zustand for UI, React Query for server state + polling |
| Routing | React Router v7 | Industry standard for Vite + React SPAs |
| Auth | Email + Senha (Supabase) | Simple, functional for MVP |
| Theme | Dark-first + light toggle | Black bg + orange gradient (#FF6B00→#FF9500) |
| DOCX | Backend (docxtpl) | Python worker generates, Storage delivers signed URL |
| Pkg Manager | pnpm | Consistency with monorepo (Turborepo) |

## Theme & Design System

### Color Palette (Dark-first)

```css
@theme {
  --color-bg: #000000;
  --color-bg-alt: #0A0A0A;
  --color-surface: #111111;
  --color-surface-hover: #1A1A1A;
  --color-border: #2A2A2A;
  --color-primary: #FF6B00;
  --color-primary-light: #FF9500;
  --color-text: #FAFAFA;
  --color-text-secondary: #A0A0A0;
  --color-success: #22C55E;
  --color-warning: #FACC15;
  --color-error: #EF4444;
}
```

- Orange gradient on CTAs, active badges, progress bars, links
- Theme toggle button (dark/light) using `next-themes`
- shadcn/ui components customized with dark + orange theme

## Pages & Routing

```
/login                  → Login screen (email + password)
/                       → Redirect to /dashboard
/dashboard              → Document list + upload
/documents/:id          → Document detail (status, extraction, analysis)
/documents/:id/review   → HITL interface (diff, reasoning, approve/reject)
```

### Layout Hierarchy

```
RootLayout (QueryClient + Zustand + ThemeProvider)
  └─ AuthLayout (Supabase session check, redirect if unauthenticated)
      └─ AppLayout (Sidebar + Header + main content)
          └─ Pages (lazy loaded with Suspense)
```

## Delivery 1 — Dashboard + Upload

### Dashboard Page (`/dashboard`)

- **Header**: Title "Documentos", "Novo Upload" button
- **Stats bar**: Counter cards (Total, Processing, Completed, Pending Review)
- **Document list**: Table/grid — Name, Domain, Status, Date, Actions
- **Status badges**: `pending` (yellow), `processing` (blue/spinner), `completed` (green), `reviewed` (purple), `error` (red)
- **Filters**: By status, by legal domain, search by name

### Upload Component

- Drag-and-drop zone (`.pdf` only, max 50MB)
- Progress bar during upload
- Flow: Upload → Supabase Storage → Create document via API → Enqueue extraction
- Immediate visual feedback after upload

### Status Polling

- React Query `refetchInterval: 5000` while documents are `processing`
- Optimistic update after upload
- Stop polling when all documents reach final state

## Delivery 2 — HITL Interface

### Review Page (`/documents/:id/review`)

3-panel layout:

```
┌──────────────────────────────────────────────────┐
│  Header: Document name | Status | Domain         │
├──────────┬───────────────────┬───────────────────┤
│ Reasoning│   Diff Viewer     │   Minuta Draft    │
│  Panel   │  (Original text   │   (AI-generated)  │
│          │   vs. FIRAC)      │                   │
│ Chain-of │                   │   Editable text   │
│ Thought  │                   │   area            │
├──────────┴───────────────────┴───────────────────┤
│  Action Bar: [Approve] [Request Revision] [Reject] │
└──────────────────────────────────────────────────┘
```

**Reasoning Panel** (left, collapsible):
- Agent chain visualization
- FIRAC+ reasoning trace formatted
- Model used, complexity score, confidence

**Diff Viewer** (center):
- Original extracted text vs. FIRAC analysis
- Library: `react-diff-viewer-continued`

**Minuta Draft** (right):
- AI-generated text, editable
- Markdown rendering with preview
- "Reset to original" button

**Action Bar**:
- **Approve**: Save as `reviewed`, mark approved
- **Request Revision**: Resubmit to pipeline with reviewer notes
- **Reject**: Mark rejected, mandatory reason field

## Delivery 3 — DOCX Export

- Button appears after approval in HITL interface
- Backend generates `.docx` with `docxtpl` (Python worker)
- Domain-specific templates: `minuta_generica.docx`, `minuta_bancaria.docx`, `minuta_consumidor.docx`
- Extensible via `DOMAIN_MAP` (same pattern as drafter)
- API: `POST /v2/documents/:id/export` → `{ url: "signed-url", expiresAt: "..." }`
- File saved in Supabase Storage, downloaded via signed URL

## Dependencies

| Category | Package | Purpose |
|----------|---------|---------|
| Routing | `react-router-dom@^7` | SPA routing + lazy loading |
| State | `zustand@^5` | UI state |
| API | `@tanstack/react-query@^5` | Server state, caching, polling |
| Forms | `react-hook-form@^7` + `@hookform/resolvers` | Login, review notes |
| Validation | `zod@^3` | Schema validation |
| UI | shadcn/ui (copy-paste) + `@radix-ui/*` | Base components |
| Icons | `lucide-react` | Consistent iconography |
| Theme | `next-themes` | Dark/light toggle |
| Diff | `react-diff-viewer-continued` | HITL diff viewer |
| Dates | `date-fns` | Date formatting |
| Test | `vitest` + `@testing-library/react` | Unit tests |

## Folder Structure

```
apps/web/src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard/          # Upload, DocumentCard, StatusBadge, StatsBar
│   ├── hitl/               # DiffViewer, ReasoningPanel, ApprovalBar, MinutaEditor
│   └── layout/             # Sidebar, Header, AuthGuard, ThemeToggle
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── DocumentDetail.tsx
│   └── Review.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useDocuments.ts
│   └── useAnalysis.ts
├── lib/
│   ├── api.ts              # API client (React Query config)
│   ├── auth.ts             # Supabase auth helpers
│   ├── store.ts            # Zustand store
│   └── utils.ts            # cn(), formatDate(), etc.
├── styles/
│   └── globals.css         # Theme tokens + Tailwind imports
├── App.tsx                 # Router setup
└── main.tsx                # Entry point
```

## API Integration

### Existing Endpoints (Phase 1-2)
- `GET /v2/health` — Health check
- `GET /v2/documents` — List documents (paginated)
- `POST /v2/documents` — Upload PDF
- `GET /v2/documents/:id` — Document detail with analysis

### New Endpoints Needed (Phase 3)
- `PUT /v2/documents/:id/review` — Submit HITL review (approve/reject/revise)
- `POST /v2/documents/:id/export` — Generate DOCX export
- `POST /v2/auth/login` — Login (or use Supabase client directly)
- `POST /v2/auth/logout` — Logout

## Accessibility

- Lighthouse score target: >90
- ARIA labels on all interactive elements
- Keyboard navigation support
- Color contrast ratio ≥ 4.5:1 (especially orange on dark)
- Focus indicators visible
