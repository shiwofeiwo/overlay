## Why

`@alifd/overlay` 当前运行在 React 17 上，依赖了多个已被 React 19 完全移除的废弃 API（`findDOMNode`、`ReactDOM.render`、`unmountComponentAtNode`、`react-dom/test-utils`），且测试基础设施基于已停止维护的 Enzyme。为了让组件库保持可用并兼容 React 19 生态，必须升级。

## What Changes

- **BREAKING**: 移除生产源码中所有 `findDOMNode` 调用，改用 `forwardRef` + ref 转发模式
- **BREAKING**: 移除 `element.ref` 直接访问，改用 `element.props.ref`
- 将 `RefWrapper` 从 class 组件重构为 `forwardRef` 函数组件
- 移除 `getHTMLElement()` 中的 `findDOMNode` fallback 分支
- 将测试基础设施从 Enzyme 完全迁移到 React Testing Library
- 将 `act` 的导入源从 `react-dom/test-utils` 迁移到 `react`
- 升级 `react` / `react-dom` 从 `^17.0.0` 到 `^19.0.0`
- 升级 `@types/react` / `@types/react-dom` 从 `^17.0.0` 到 `^19.0.0`
- 修复 React 19 TypeScript 类型变更导致的编译错误（`useRef` 参数要求、`ReactElement.props` 默认 `unknown`、JSX namespace 等）
- 启用新的 JSX Transform（`jsx: "react-jsx"`）
- 更新 demo 文件中的 `ReactDOM.render` 为 `createRoot`

## Capabilities

### New Capabilities

- `ref-forwarding`: 用 `forwardRef` + ref 转发替代 `findDOMNode`，覆盖 `RefWrapper` 重构、`getHTMLElement` 清理、`popup.tsx` 中所有 `findDOMNode` 调用点的替换
- `rtl-testing`: 测试基础设施从 Enzyme 迁移到 React Testing Library，覆盖 `setupTests.js`、`overlay.test.jsx`、`popup.test.jsx` 的完整重写
- `react19-types`: React 19 版本升级及 TypeScript 类型兼容修复，覆盖依赖升级、`tsconfig.json` JSX transform、类型错误修复

### Modified Capabilities


## Impact

- **源码**: `src/overlay.tsx`（RefWrapper 重构 + findDOMNode 移除 + element.ref 修复）、`src/popup.tsx`（findDOMNode 移除）、`src/utils.ts`（getHTMLElement 清理）
- **测试**: `test/setupTests.js`、`test/overlay.test.jsx`、`test/popup.test.jsx` — 全部重写
- **依赖**: 移除 `enzyme`、`@wojtekmaj/enzyme-adapter-react-17`、`simulate-event`；新增 `@testing-library/react`、`@testing-library/jest-dom`、`@testing-library/user-event`；升级 `react`、`react-dom` 到 `^19.0.0`
- **配置**: `tsconfig.json` 的 `jsx` 选项需从 `"react"` 改为 `"react-jsx"`
- **文档**: 15 个 demo `.md` 文件中的 `ReactDOM.render` 示例需更新为 `createRoot`
- **构建**: `build-plugin-component` 可能需要验证与 React 19 的兼容性
- **下游**: `@alifd/next` peerDependency 为 `1.x`（React 17），升级后可能出现兼容警告，但不影响 overlay 本身功能
