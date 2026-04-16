## ADDED Requirements

### Requirement: React and ReactDOM are upgraded to version 19
The `react` and `react-dom` dependencies SHALL be upgraded to `^19.0.0`. The `@types/react` and `@types/react-dom` devDependencies SHALL be upgraded to `^19.0.0`.

#### Scenario: Package versions
- **WHEN** `package.json` is read after upgrade
- **THEN** `react` SHALL be `^19.0.0`, `react-dom` SHALL be `^19.0.0`, `@types/react` SHALL be `^19.0.0`, `@types/react-dom` SHALL be `^19.0.0`

### Requirement: JSX transform uses the new react-jsx mode
The `tsconfig.json` SHALL use `"jsx": "react-jsx"` (or `"react-jsxdev"` for development). The legacy `"jsx": "react"` mode SHALL NOT be used, as React 19 requires the new JSX Transform.

#### Scenario: tsconfig jsx setting
- **WHEN** `tsconfig.json` is read after upgrade
- **THEN** the `jsx` compiler option SHALL be `"react-jsx"` (not `"react"`)

### Requirement: TypeScript compiles without errors under React 19 types
All source files SHALL compile without errors when using `@types/react@^19.0.0`. This includes handling:
- `useRef` requiring an argument
- `ref` callback not returning implicit values
- `ReactElement.props` defaulting to `unknown` instead of `any`
- `MutableRefObject` deprecation in favor of unified `RefObject`
- JSX namespace moving from global to `React.JSX`

#### Scenario: TypeScript compilation succeeds
- **WHEN** `npx tsc --noEmit` is run after all type fixes
- **THEN** there SHALL be zero TypeScript errors

#### Scenario: useRef requires argument
- **WHEN** a source file calls `useRef()`
- **THEN** it SHALL pass an argument (e.g., `useRef(null)`, `useRef(undefined)`, `useRef(initialValue)`)

#### Scenario: ref callback returns void
- **WHEN** a ref callback is defined with an implicit return (arrow function without braces)
- **THEN** it SHALL be converted to explicit block form (arrow function with braces) to avoid returning a value that could be mistaken for a cleanup function

### Requirement: Demo files use createRoot instead of ReactDOM.render
All demo markdown files (in `demo/` directory) SHALL use `createRoot` from `react-dom/client` instead of `ReactDOM.render`. This is a documentation-only change that does not affect runtime behavior.

#### Scenario: Demo imports
- **WHEN** a demo file renders a React component
- **THEN** it SHALL import `createRoot` from `'react-dom/client'` and use `createRoot(mountNode).render(<App />)` instead of `ReactDOM.render(<App />, mountNode)`

### Requirement: Full test suite passes after upgrade
After all changes are applied, `npm test` SHALL pass with zero failures. `npm run build` SHALL succeed and produce `es/` and `lib/` output directories.

#### Scenario: Test suite passes
- **WHEN** `npm test` is run
- **THEN** all tests SHALL pass

#### Scenario: Build succeeds
- **WHEN** `npm run build` is run
- **THEN** the build SHALL complete without errors and produce `es/index.js` and `lib/index.js`
