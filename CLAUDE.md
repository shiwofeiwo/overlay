# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@alifd/overlay` is a React overlay/popup base component from the Alibaba Fusion Design ecosystem. It provides positioned floating layers (dropdowns, tooltips, dialogs, popups) with auto-positioning, viewport overflow adjustment, and RTL support. The only runtime dependency is `resize-observer-polyfill`.

**React 17 project** — uses legacy APIs (`findDOMNode`, `ReactDOM.render`). Source is TypeScript; tests are JavaScript/JSX.

## Commands

```bash
npm start              # Dev server
npm run build          # Production build (es/ + lib/ + build/)
npm test               # Run all tests (Jest + Enzyme)
npm run lint           # ESLint + Stylelint
npm run eslint         # ESLint only
npm run eslint:fix     # Auto-fix ESLint issues
npm run stylelint      # Stylelint only
```

**Run a single test file:**
```bash
npx jest test/overlay.test.jsx
```

**Install dependencies** (requires `--legacy-peer-deps` due to eslint peer dependency conflict):
```bash
npm install --legacy-peer-deps
```

## Architecture

### Component Hierarchy

- **`Overlay`** (`src/overlay.tsx`, ~550 lines) — Core `forwardRef` component. Renders children into a portal, handles positioning via `placement.ts`, viewport overflow auto-adjustment, scroll-aware hiding, safe-node click handling, ESC/mask/outside-click closing, resize observation, and autoFocus.
- **`Overlay.Popup`** (`src/popup.tsx`, ~280 lines) — Higher-level wrapper managing visibility state (controlled + uncontrolled) based on trigger types (`click`, `hover`, `focus`). Handles mouse enter/leave delay timers.
- **`Overlay.OverlayContext`** (`src/overlay-context.tsx`) — React context for parent-child overlay awareness (prevents parent closing when child overlay is open).

### Position Engine

`src/placement.ts` (~695 lines) — Pure position calculation engine supporting 12 placements: `tl t tr rt r rb bl b br lt l lb`. Auto-flips when overflow detected. Supports RTL.

### DOM Utilities

`src/utils.ts` (~577 lines) — DOM helpers (`getStyle`, `setStyle`, `getViewPort`, `getRelativeContainer`, `getOverflowNodes`, `getScrollbarWidth`) plus React hooks (`useListener`, `useEvent`).

### Internal Pattern: RefWrapper

A class component in `overlay.tsx` used to obtain refs from functional components that may not forward refs.

## Build System

Uses `@alib/build-scripts` with `build-plugin-component` and `build-plugin-fusion`. Config in `build.json`. Outputs dual modules: CommonJS (`lib/`) and ESM (`es/`).

## Conventions

- **Language**: Code comments and README are in Chinese
- **Commit format**: Conventional commits enforced via commitlint + husky. Allowed types include a non-standard `typescript` type
- **Linting**: ESLint (`@iceworks/spec/react-ts`), Stylelint, Prettier — all run on pre-commit via lint-staged
- **Tests**: Jest + Enzyme with `@wojtekmaj/enzyme-adapter-react-17`. Custom `render()` helper using `ReactDOM.render` + `simulate-event` for DOM simulation
