# React 19 升级迁移文档

## 概述

将 `@alifd/overlay` 从 React 17 升级到 React 19。为降低风险，升级分三个阶段渐进实施：先移除生产源码中的废弃 API、再迁移测试基础设施、最后升级 React 版本。

## 改动总览

### 1. 生产源码：移除 findDOMNode 与 ref 修复

| 文件 | 改动 |
|------|------|
| `src/overlay.tsx` | `RefWrapper` 从 class 组件改为 `React.forwardRef`；移除 `findDOMNode`；ref callback 参数类型改为 `HTMLElement`；`child.ref` 检查改为 `child.props?.ref`；`ReactElement` → `ReactElement<any>`；清理未使用的 `getWidthHeight` import |
| `src/popup.tsx` | 移除 `findDOMNode`，所有 `findDOMNode(triggerRef.current)` 替换为 `triggerRef.current`（4 处）；`ReactElement` → `ReactElement<any>`；清理未使用的 `useMemo` import |
| `src/utils.ts` | 移除 `findDOMNode`；`getHTMLElement` 删除 `findDOMNode` fallback 分支；添加返回类型注解（`getHTMLElement`、`getViewPortExcludeSelf`、`useEvent`） |

**背景**：`findDOMNode` 在 React 19 中已被完全移除，Strict Mode 下也会报错。`element.ref` 直接访问在 React 19 中行为变更，需通过 `element.props.ref` 访问。

### 2. 测试基础设施：Enzyme → React Testing Library

| 文件 | 改动 |
|------|------|
| `test/setupTests.js` | 替换 Enzyme 配置为 `@testing-library/jest-dom` |
| `test/overlay.test.jsx` | 全部迁移：`mount` → RTL `render`、`setProps` → `rerender`、`simulate` → `fireEvent`、`ReactDOM.render` → RTL `render` |
| `test/popup.test.jsx` | 同上，hover 测试使用 `fireEvent.mouseEnter`/`mouseLeave` |

**迁移映射**：

| Enzyme | React Testing Library |
|--------|----------------------|
| `mount(<Component />)` | `render(<Component />)` |
| `wrapper.setProps({...})` | `rerender(<Component {...} />)` |
| `wrapper.find(selector)` | `container.querySelectorAll(selector)` |
| `wrapper.simulate('click')` | `fireEvent.click(element)` |
| `wrapper.instance()` | 通过 ref 或状态测试 |
| `ReactDOM.render(el, container)` | `render(el)` |
| `ReactDOM.unmountComponentAtNode(container)` | `unmount()` |

**背景**：Enzyme 没有官方的 React 19 adapter，`@testing-library/react@16` 同时支持 React 18 和 19。

### 3. React 版本升级与 TypeScript 修复

| 文件 | 改动 |
|------|------|
| `package.json` | `react`/`react-dom` 升级到 `19.2.5`，`@types/react`/`@types/react-dom` 升级到 `^19.0.0`；移除 `enzyme`、`enzyme-adapter-react-17`、`simulate-event`；新增 RTL 相关依赖 |
| `tsconfig.json` | `jsx` 从 `"react"` 改为 `"react-jsx"`（React 19 要求新 JSX Transform） |

**TypeScript 修复要点**：
- `ReactElement.props` 在 `@types/react@19` 中默认为 `unknown`，需添加泛型参数 `ReactElement<any>`
- `useEvent` 的 `useCallback` 回调参数添加 `any[]` 类型注解
- `getHTMLElement`、`getViewPortExcludeSelf` 等函数添加显式返回类型注解

### 4. Demo 文件（未改动）

`demo/*.md` 文件保持原样，未做修改。

**原因**：`build-plugin-component` 的 `reactDemoLoader` 通过 AST 将 `ReactDOM.render(<App />, mountNode)` 自动转换为 `export default App`，运行时不会实际执行 `ReactDOM.render`。由于 dev server 本身因模板问题不可用（见下方已知限制），demo 文件的改动暂无实际意义，等 `build-plugin-component` 支持 React 19 后再统一处理。

## 已知限制：dev server 不兼容

### 问题描述

`npm start`（开发服务器）在 React 19 下**无法正常工作**，错误信息：

```
Uncaught TypeError: ReactDOM.render is not a function
```

### 根因

`build-plugin-component@1.12.2`（当前最新版）的模板文件 `src/template/template.hbs` 中使用了 `ReactDOM.render()` 来渲染 demo 页面的外壳：

```js
// node_modules/build-plugin-component/src/template/template.hbs
import ReactDOM from 'react-dom';
// ...
ReactDOM.render(<App ... />, document.getElementById('root'));
```

`ReactDOM.render` 在 React 19 中已被移除。

### 影响

- `npm test` — 正常
- `npm run build` — 正常
- `npx tsc --noEmit` — 正常
- `npm run lint` — 正常
- **`npm start` — 不可用**

### 解决方案

需要在 `build-plugin-component` 中将 `ReactDOM.render` 替换为 `createRoot`：

```diff
-import ReactDOM from 'react-dom';
+import { createRoot } from 'react-dom/client';

-ReactDOM.render(<App ... />, document.getElementById('root'));
+createRoot(document.getElementById('root')).render(<App ... />);
```

建议向 `build-plugin-component` 提交 PR 或 Issue。

## 依赖变更

### 新增

| 包 | 版本 | 用途 |
|----|------|------|
| `@testing-library/react` | `^16.3.2` | React 组件测试 |
| `@testing-library/jest-dom` | `^6.9.1` | DOM 断言匹配器 |

### 移除

| 包 | 用途 |
|----|------|
| `enzyme` | 不再支持 React 19 |
| `@wojtekmaj/enzyme-adapter-react-17` | 随 Enzyme 一起移除 |
| `simulate-event` | 被 RTL fireEvent 替代 |

### 升级

| 包 | 旧版本 | 新版本 |
|----|--------|--------|
| `react` | `^17.0.0` | `19.2.5` |
| `react-dom` | `^17.0.0` | `19.2.5` |
| `@types/react` | `^17.0.0` | `^19.2.14` |
| `@types/react-dom` | `^17.0.0` | `^19.2.3` |

## 验证结果

| 检查项 | 结果 |
|--------|------|
| TypeScript 编译 (`tsc --noEmit`) | 0 错误 |
| 全量测试 (`npm test`) | 74 passed, 1 skipped |
| ESLint (`npm run eslint`) | 通过 |
| 生产构建 (`npm run build`) | `es/` + `lib/` 正常生成 |
| 开发服务器 (`npm start`) | **不可用**（见已知限制） |
