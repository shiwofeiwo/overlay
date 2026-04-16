## ADDED Requirements

### Requirement: RefWrapper uses forwardRef instead of class component
The `RefWrapper` component SHALL use `React.forwardRef` to forward refs to child elements, replacing the legacy class component pattern. It SHALL use `React.cloneElement` to merge the forwarded ref onto the child element.

#### Scenario: RefWrapper forwards ref to native DOM child
- **WHEN** `RefWrapper` wraps a native DOM element (e.g., `<div>`) and a ref callback is provided
- **THEN** the ref callback SHALL receive the underlying DOM node directly (not a component instance)

#### Scenario: RefWrapper forwards ref to forwardRef component
- **WHEN** `RefWrapper` wraps a `forwardRef` component and a ref callback is provided
- **THEN** the ref callback SHALL receive the value forwarded by the child component

### Requirement: Overlay no longer uses findDOMNode
The `Overlay` component SHALL NOT call `findDOMNode` anywhere in its implementation. The `overlayRefCallback` SHALL accept the DOM node directly from the forwarded ref instead of converting it via `findDOMNode`.

#### Scenario: Overlay obtains overlay DOM node via forwarded ref
- **WHEN** `Overlay` renders its child wrapped in `RefWrapper`
- **THEN** the overlay DOM node SHALL be obtained directly through the ref callback parameter without `findDOMNode` conversion

### Requirement: Popup no longer uses findDOMNode
The `Popup` component SHALL NOT call `findDOMNode` anywhere in its implementation. All references to `findDOMNode(triggerRef.current)` SHALL be replaced with direct `triggerRef.current` access, since `triggerRef` now points to a DOM node via the refactored `RefWrapper`.

#### Scenario: Popup safeNodes use triggerRef.current directly
- **WHEN** `Popup` constructs its `safeNodes` array
- **THEN** each safe node SHALL be obtained via `triggerRef.current` directly without `findDOMNode` wrapping

#### Scenario: Popup target resolution uses triggerRef.current directly
- **WHEN** `Popup` resolves the target element for positioning
- **THEN** the target SHALL be obtained via `triggerRef.current` directly without `findDOMNode` wrapping

#### Scenario: Popup container resolution uses triggerRef.current directly
- **WHEN** `Popup` resolves the container element
- **THEN** the container function SHALL receive `triggerRef.current` directly without `findDOMNode` wrapping

#### Scenario: Popup parentNode lookup uses triggerRef.current directly
- **WHEN** `Popup` needs the parent node of the trigger element
- **THEN** it SHALL access `triggerRef.current?.parentNode` directly without `findDOMNode` wrapping

### Requirement: getHTMLElement no longer accepts React component instances
The `getHTMLElement` utility function SHALL only accept DOM nodes or `window` as input. It SHALL NOT attempt to convert React component instances to DOM nodes via `findDOMNode`. If a non-DOM, non-window value is passed, it SHALL return the value as-is without calling `findDOMNode`.

#### Scenario: DOM element input
- **WHEN** `getHTMLElement` receives a DOM element (nodeType === 1)
- **THEN** it SHALL return that element unchanged

#### Scenario: Window input
- **WHEN** `getHTMLElement` receives `window`
- **THEN** it SHALL return `document.body`

#### Scenario: Non-DOM input
- **WHEN** `getHTMLElement` receives a value that is not a DOM node and not `window`
- **THEN** it SHALL return the value as-is without calling `findDOMNode`

### Requirement: element.ref access replaced with element.props.ref
The string ref validation check in `Overlay` SHALL access `child.props.ref` instead of `child.ref`, as React 19 treats `ref` as a regular prop.

#### Scenario: String ref detection uses props.ref
- **WHEN** `Overlay` validates children for string refs
- **THEN** it SHALL check `child.props?.ref` instead of `child.ref`
