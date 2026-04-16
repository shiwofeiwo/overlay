## Context

`@alifd/overlay` 是 Alibaba Fusion Design 生态的弹层基础组件，当前运行在 React 17 上。代码库中存在以下与 React 19 不兼容的 API 使用：

- **生产源码**：`findDOMNode` 7 处调用（`overlay.tsx`、`popup.tsx`、`utils.ts`）、`element.ref` 直接访问 1 处
- **测试代码**：Enzyme `mount()`/`wrapper.setProps()`/`wrapper.find()` 13+ 处、`ReactDOM.render` 4 处、`ReactDOM.unmountComponentAtNode` 4 处、`react-dom/test-utils` 的 `act` 2 处
- **构建配置**：使用旧 JSX Transform（`jsx: "react"`）

升级必须分三个阶段进行，每个阶段独立可验证，确保功能不退化。

## Goals / Non-Goals

**Goals:**
- 移除所有 React 19 中已删除的 API 使用，保证组件功能完全不变
- 将测试基础设施迁移到 React Testing Library，保持原有测试覆盖
- 升级到 React 19 并修复所有 TypeScript 类型问题
- 每个阶段独立可提交，支持增量验证

**Non-Goals:**
- 不重构组件的公共 API 或行为逻辑
- 不升级 `@alifd/next` 或其他 Fusion Design 依赖
- 不替换构建工具链（`build-plugin-component`），除非构建失败
- 不处理 SSR 相关的 API 变更（`renderToPipeableStream` 等），本组件不涉及服务端渲染

## Decisions

### Decision 1: `RefWrapper` 从 class 改为 `forwardRef`

**选择**：将 `RefWrapper`（`overlay.tsx:141-145`）从 class 组件改为 `React.forwardRef` 函数组件，内部用 `cloneElement(children, { ref })` 转发 ref。

**替代方案**：
- 保留 class 但用 `React.createRef()`：仍然需要 `findDOMNode` 获取 DOM，不可行
- 完全移除 `RefWrapper`：会破坏 popup.tsx 中通过 triggerRef 引用 RefWrapper 实例的模式

**理由**：`forwardRef` 是 React 19 官方推荐的 ref 转发方式。`cloneElement` 会将 ref 传给 children，如果 children 是原生 DOM 元素则 ref 直接获得 DOM 节点。当前代码中 children 都是原生元素（`<div>`、`<button>` 等），因此此方案可行。

### Decision 2: `getHTMLElement` 移除 `findDOMNode` fallback

**选择**：从 `getHTMLElement`（`utils.ts:519-534`）中移除 `findDOMNode(node)` 分支，只保留 DOM 节点和 `window` 的处理。

**理由**：审查所有调用方（`overlay.tsx:274,283,331,359`），传入的值都已经是 DOM 节点（来自 `container` state、`getTargetNode()` 返回值、`overlayRef.current`）。`findDOMNode` 分支是冗余安全网，移除不影响功能。

### Decision 3: 测试从 Enzyme 迁移到 React Testing Library

**选择**：使用 `@testing-library/react@^16` + `@testing-library/jest-dom@^6` + `@testing-library/user-event@^14`。

**替代方案**：
- 继续用 Enzyme + `enzyme-adapter-react-18`：不存在官方 React 19 adapter，社区维护的 adapter 也不可靠
- 使用 `@testing-library/react@^15`（React 18 专用）：`@16` 向后兼容 React 18 且支持 React 19

**理由**：RTL 是 React 官方推荐的测试库，React 19 升级指南明确推荐。`@testing-library/react@16` 同时支持 React 18 和 19，方便分阶段升级。

### Decision 4: 分三阶段执行

**阶段一**：生产源码中移除 `findDOMNode` 和 `element.ref`（Tasks 1-5）
**阶段二**：测试基础设施从 Enzyme 迁移到 RTL（Tasks 6-10）
**阶段三**：React 版本升级和 TypeScript 修复（Tasks 11-14）

**理由**：每阶段完成后可在当前 React 17 下运行测试验证功能不变。如果某个阶段出问题，可以独立回滚，不影响其他阶段。

### Decision 5: JSX Transform 升级

**选择**：在 `tsconfig.json` 中将 `jsx` 从 `"react"` 改为 `"react-jsx"`。

**理由**：React 19 强制要求新的 JSX Transform。旧 transform 不再受支持，会在控制台产生警告且无法使用 `ref` 作为 prop 等 React 19 新特性。

## Risks / Trade-offs

- **`RefWrapper` 的 `forwardRef` 无法获取没有 `forwardRef` 的函数组件的 DOM** → 当前代码中 children 都是原生 DOM 元素，不受影响。如果未来需要支持函数组件 children，需另外处理。

- **`@alifd/next` peerDependency 为 `1.x`（React 17）** → 升级后会产生 `npm warn` 但不影响 overlay 本身功能。后续需跟进 `@alifd/next` 的 React 19 支持。

- **`build-plugin-component` 可能不兼容 React 19** → 如果构建失败，考虑升级到 `@ice/pkg` 或其他现代构建工具。但此为低概率风险，构建工具通常不直接依赖 React 运行时。

- **hover 测试在 RTL 中行为不同** → RTL 的 `fireEvent.mouseEnter` 不像 Enzyme 的 `simulate` 直接触发 React 合成事件。可能需要改用 `fireEvent.mouseOver` 或在组件外包一层 DOM 容器。已在 Tasks 中预留了调整策略。

- **Enzyme 测试迁移可能遗漏行为细节** → 每个 Enzyme 测试用例都需要逐一对应到 RTL 写法，`setProps` → `rerender` 的模式需要传递完整的 props，容易遗漏。缓解：迁移后运行完整测试套件验证。
