## ADDED Requirements

### Requirement: Test setup uses React Testing Library instead of Enzyme
The test setup file (`test/setupTests.js`) SHALL import `@testing-library/jest-dom` and SHALL NOT import or configure Enzyme. It SHALL NOT reference `Enzyme.configure`, `@wojtekmaj/enzyme-adapter-react-17`, or any Enzyme API.

#### Scenario: setupTests initializes RTL matchers
- **WHEN** tests are executed
- **THEN** `test/setupTests.js` SHALL only contain `import '@testing-library/jest-dom'` and SHALL NOT import Enzyme

### Requirement: Overlay tests use React Testing Library
All test cases in `test/overlay.test.jsx` SHALL use `@testing-library/react` APIs (`render`, `screen`, `fireEvent`, `waitFor`) instead of Enzyme APIs (`mount`, `wrapper.find`, `wrapper.setProps`, `wrapper.simulate`, `wrapper.unmount`).

#### Scenario: Overlay component rendering
- **WHEN** an Overlay test renders a component
- **THEN** it SHALL use `render()` from `@testing-library/react` instead of `mount()` from Enzyme

#### Scenario: Overlay prop updates
- **WHEN** an Overlay test needs to update component props
- **THEN** it SHALL use `rerender(<Component {...allProps} />)` from the render result instead of `wrapper.setProps()`

#### Scenario: Overlay DOM queries
- **WHEN** an Overlay test needs to find DOM elements
- **THEN** it SHALL use `container.querySelectorAll()` or `document.querySelectorAll()` (for portal content) instead of `wrapper.find()`

#### Scenario: Overlay event simulation
- **WHEN** an Overlay test needs to trigger user events
- **THEN** it SHALL use `fireEvent.mouseDown()`, `fireEvent.keyDown()`, `fireEvent.click()` from RTL instead of `simulateEvent.simulate()` or `wrapper.simulate()`

#### Scenario: Overlay unmount
- **WHEN** an Overlay test needs to unmount the component
- **THEN** it SHALL use `unmount()` from the RTL render result instead of `ReactDOM.unmountComponentAtNode()`

### Requirement: Popup tests use React Testing Library
All test cases in `test/popup.test.jsx` SHALL use `@testing-library/react` APIs instead of Enzyme APIs, following the same patterns as Overlay tests.

#### Scenario: Popup trigger click
- **WHEN** a Popup test simulates a click trigger
- **THEN** it SHALL use `fireEvent.click()` on the button element instead of `wrapper.find('button').simulate('click')`

#### Scenario: Popup trigger hover
- **WHEN** a Popup test simulates a hover trigger
- **THEN** it SHALL use `fireEvent.mouseEnter()` and `fireEvent.mouseLeave()` (or `fireEvent.mouseOver()`) instead of `wrapper.simulate('mouseenter')` / `wrapper.simulate('mouseleave')`

#### Scenario: Popup trigger focus
- **WHEN** a Popup test simulates a focus trigger
- **THEN** it SHALL use `fireEvent.focus()` and `fireEvent.blur()` instead of `wrapper.simulate('focus')` / `wrapper.simulate('blur')`

#### Scenario: Popup outside click
- **WHEN** a Popup test simulates clicking outside the popup
- **THEN** it SHALL use `fireEvent.mouseDown(document.body)` instead of `simulateEvent.simulate(document.body, 'mousedown')`

### Requirement: act is imported from react, not react-dom/test-utils
All test files SHALL import `act` from `'react'` instead of `'react-dom/test-utils'`, as `react-dom/test-utils` has been removed in React 19.

#### Scenario: act import source
- **WHEN** a test file uses the `act` utility
- **THEN** it SHALL import `act` from `'react'` and SHALL NOT import from `'react-dom/test-utils'`

### Requirement: Tests no longer use ReactDOM.render or unmountComponentAtNode
Test files SHALL NOT call `ReactDOM.render()` or `ReactDOM.unmountComponentAtNode()`. Rendering SHALL be handled by RTL's `render()`, and unmounting by RTL's `unmount()`.

#### Scenario: No ReactDOM.render in tests
- **WHEN** a test needs to render a component into the DOM
- **THEN** it SHALL use RTL `render()` and SHALL NOT call `ReactDOM.render()`

#### Scenario: No unmountComponentAtNode in tests
- **WHEN** a test needs to clean up a rendered component
- **THEN** it SHALL use RTL `unmount()` or automatic cleanup, and SHALL NOT call `ReactDOM.unmountComponentAtNode()`

### Requirement: Enzyme and simulate-event dependencies are removed
After test migration, `enzyme`, `@wojtekmaj/enzyme-adapter-react-17`, and `simulate-event` SHALL be removed from `devDependencies` in `package.json`.

#### Scenario: Package.json cleanup
- **WHEN** all tests have been migrated to RTL
- **THEN** `package.json` SHALL NOT list `enzyme`, `@wojtekmaj/enzyme-adapter-react-17`, or `simulate-event` in dependencies
