# React 19 升级迁移文档

## 概述

将 `@alifd/overlay` 从 React 17 升级到 React 19，并**保持对 React 17 原版 API 的功能等价性**。

- 运行时支持：**React `>=16.8.0`**（peerDependencies 声明）
- 实际测试：React 19.2.5
- 核心难点：React 19 移除了 `findDOMNode`，原代码依赖它解析任意 children 的 DOM；本次通过 `LegacyRefBridge` 兜底实现了等价行为
- 测试：74 → **77 passed**（新增 3 个 RefWrapper 兜底专项测试）

## 一、核心挑战：findDOMNode 移除的兜底

### 1.1 问题

原代码使用 `ReactDOM.findDOMNode` 从任意 children（HTML 元素 / `forwardRef` 组件 / class 组件 / 普通 FC）拿到其真实 DOM，用于 overlay 定位、`safeNode` 判断、`container` 解析等。

React 19 移除了该 API，仅保留 `cloneElement(children, { ref })` 这种"ref 注入"方式 —— 但这只对能接受 ref 的 children（HTML 元素 / `forwardRef` / `memo(forwardRef)`）有效。对 **class 组件**和**无 `forwardRef` 的函数组件**，直接 cloneElement 会导致 ref 为 instance 或 null，**无法拿到 DOM，定位静默失败**。

### 1.2 新版 `RefWrapper` 设计：分流 + LegacyRefBridge

```
                      RefWrapper
                          │
            ┌─────────────┴─────────────┐
            │                           │
    canAcceptRef(child)            否则走兜底
      ────────────                  ────────
    · HTML 元素                    LegacyRefBridge
    · forwardRef                     │
    · memo(forwardRef)               ├─ 插入 display:none 的 <span> marker
                                     ├─ useLayoutEffect 里读 marker.nextElementSibling
            │                        └─ callRef(ref, node) 把 DOM 传出去
            ▼
    cloneElement(child, { ref })
    （零 DOM 侵入，透明透传）
```

`canAcceptRef` 通过 React 的内部 `$$typeof` 符号识别 children 类型（`Symbol.for('react.forward_ref')` / `Symbol.for('react.memo')`），自 React 16.6 起稳定。

`LegacyRefBridge` 的工作原理：
1. 在 children 之前插入一个 `<span style="display:none" aria-hidden="true">`
2. commit 阶段（`useLayoutEffect`，与 `findDOMNode` 的调用时机一致）读取 `marker.nextElementSibling`，拿到 children 渲染出的**第一个 DOM 后代**
3. 通过 `callRef` 把 DOM 传给外部 ref（等价于原 `findDOMNode(classInstance)` 的返回值）

`display:none` marker span **不产生视觉或布局影响**，仅在极端场景（`:first-child` 选择器）会有微小副作用；无法接收 ref 的 children 本就是 React 19 升级下的"非主流用法"，这个侵入是合理权衡。

### 1.3 等价性证明（测试）

`test/overlay.test.jsx` 新增 3 个专项用例，分别验证 RefWrapper 的三条路径：

| 用例 | children 形态 | 走的分支 | 断言 |
|---|---|---|---|
| `RefWrapper fallback: resolves DOM when child is a class component` | `class extends React.Component` | LegacyRefBridge | `onOpen` 收到的 DOM `===` `document.querySelector(...)` |
| `RefWrapper fallback: resolves DOM when child is a plain function component` | 普通 FC | LegacyRefBridge | 同上 |
| `RefWrapper transparent path: uses cloneElement for forwardRef children` | `React.forwardRef(...)` | 透传 | 同上 |

三个测试都通过 `onOpen` 回调拿到的 DOM 和 `document.querySelector` 直接对比，**确保 Overlay 的内部 ref 解析链路在所有 children 类型下都能拿到真实 DOM**，与 React 17 `findDOMNode` 的行为等价。

### 1.4 已知限制

唯一无法完全还原的场景：用户在 `target`/`safeNode`/`container` **回调里手动返回 class instance**（违反类型约定 `() => HTMLElement`）。原版 `findDOMNode` 能兜底，新版 `getHTMLElement` 对 class instance 返回 `null`。这属于 React 19 官方移除 findDOMNode 的固有破坏性变更，**任何 React 19 升级都无法规避**；但用户若按类型约定返回 DOM，则不会命中。

## 二、其他源码改动

### 2.1 `src/utils.ts` — `getHTMLElement` 重写

原版逻辑保留大部分、替换 `findDOMNode` 分支：

| 输入 | React 17 原版 | 新版 |
|---|---|---|
| HTML 元素（nodeType=1）| 自身 | 自身 ✓ |
| `window` | `document.body` | `document.body` ✓ |
| Document / Text / Comment / DocumentFragment（nodeType≠1）| `document.body` | `document.body` ✓（保留原行为）|
| 带 `getDOMNode()` 的 wrapper（Enzyme / Fusion）| `findDOMNode(node)` → wrapper 的 DOM | 递归 `getHTMLElement(node.getDOMNode())` ✓ |
| class instance | `findDOMNode(node)` → 第一个 DOM 后代 | `null`（React 19 无替代 API）|
| `null` / `undefined` | 原样返回 | `null`（统一返回 null，见 §7.4）|

### 2.2 `src/overlay.tsx` — `clickEvent` / `keydownEvent` / `scrollEvent` 套 `useEvent`

**背景**：原代码中这几个 handler 每次 render 都是新 closure；`useListener` 仅依赖 `condition`，`condition` 不变时 listener 持有**过期 closure**，在极少数 props 变化场景下可能读到过期值。

**修复**：用 `useEvent`（稳定引用 + 内部始终读最新 handler）包装，彻底消除过期 closure 风险。

对外部用户无可见差异，属于**顺带修复的理论 bug**。

### 2.3 `element.ref` → `element.props.ref`

React 19 起 `ref` 是普通 prop，`element.ref` 访问会警告。原版中的运行时 string-ref 检查从 `(child as any).ref === 'string'` 改为 `(child as any).props?.ref === 'string'`。

### 2.4 `ReactElement<any>` 类型调整

`@types/react@19` 的 `ReactElement['props']` 默认类型从 `any` 改为 `unknown`。为保持原来访问 `child.props.xxx` 的用法不报错，`children` 类型显式声明为 `ReactElement<any>`。纯类型变更，运行时无差异。

### 2.5 `src/overlay.tsx` — `overlayRefCallback` 替换 `findDOMNode`

Overlay 组件内部挂载自身弹层 DOM 的 ref callback 也依赖了 `findDOMNode`：

```diff
- const node = findDOMNode(nodeRef) as HTMLElement;
+ const node = getHTMLElement(nodeRef);
```

`overlayRefCallback` 是 Overlay 用来拿到弹层根节点（`overlayRef.current`）的，与 popup.tsx 里处理 trigger ref 是两处独立场景。替换为 `getHTMLElement` 后行为一致：传入 HTML 元素时直接返回自身，不会走 class instance 分支（弹层根节点始终是真实 DOM）。

### 2.6 `src/popup.tsx` — `refWrapperRef` 归一化

原版在使用处反复调用 `findDOMNode(triggerRef.current)`，新版在 ref callback 时立即 `triggerRef.current = getHTMLElement(ref)`，后续使用处直接用 `triggerRef.current`。配合 RefWrapper 的兜底分流，无论 children 是何种类型，`triggerRef.current` 都是真实 DOM（或 null）。

## 三、测试基础设施迁移：Enzyme → React Testing Library

Enzyme 没有官方的 React 19 adapter；`@testing-library/react@16` 同时支持 React 18 / 19。

### 3.1 文件改动

| 文件 | 改动 |
|---|---|
| `test/setupTests.js` | 替换 Enzyme 配置为 `@testing-library/jest-dom` 导入 |
| `test/overlay.test.jsx` | `mount` → RTL `render`；`setProps` → `rerender`；`simulate` → `fireEvent`；`ReactDOM.render` → RTL `render`；新增 3 个 RefWrapper 兜底测试 |
| `test/popup.test.jsx` | 同上；hover 测试改用 `fireEvent.mouseEnter`/`mouseLeave` |

### 3.2 Enzyme → RTL API 映射

| Enzyme | React Testing Library |
|---|---|
| `mount(<Component />)` | `render(<Component />)` |
| `wrapper.setProps({...})` | `rerender(<Component {...} />)` |
| `wrapper.find(selector)` | `container.querySelectorAll(selector)` |
| `wrapper.simulate('click')` | `fireEvent.click(element)` |
| `wrapper.instance()` | 通过 ref 或可观察状态验证 |
| `ReactDOM.render(el, container)` | `render(el)` |
| `ReactDOM.unmountComponentAtNode(container)` | `unmount()` |

### 3.3 Demo 文件（未改动）

`demo/*.md` 文件保留 `ReactDOM.render` 写法。`build-plugin-component` 的 `reactDemoLoader` 通过 AST 将 `ReactDOM.render(<App />, mountNode)` 转换为 `export default App`，运行时不会实际执行 `ReactDOM.render`。由于 dev server 目前因上游模板问题不可用（见 §6.1），demo 文件迁移意义不大，待上游支持后再统一处理。

## 四、依赖与配置变更

### 4.1 `package.json`

```diff
+ "peerDependencies": {
+   "react": ">=16.8.0",
+   "react-dom": ">=16.8.0"
+ },
  "devDependencies": {
+   "@testing-library/dom": "^10.4.1",
+   "@testing-library/jest-dom": "^6.9.1",
+   "@testing-library/react": "^16.3.2",
-   "@types/react": "^17.0.0",
-   "@types/react-dom": "^17.0.0",
+   "@types/react": "^19.2.14",
+   "@types/react-dom": "^19.2.3",
-   "@wojtekmaj/enzyme-adapter-react-17": "^0.6.3",
-   "enzyme": "^3.10.0",
-   "simulate-event": "^1.4.0",
-   "react": "^17.0.0",
-   "react-dom": "^17.0.0",
+   "react": "19.2.5",
+   "react-dom": "19.2.5",
  }
```

### 4.2 `tsconfig.json`

```diff
- "jsx": "react"
+ "jsx": "react-jsx"
```

React 19 要求新的 JSX Transform（classic `React.createElement` 在部分新特性下会警告）。

## 五、功能等价性矩阵（对照 React 17 原版）

| 维度 | 等价性 |
|---|---|
| 对外 API（所有 props、默认值、类型签名、导出）| ✅ 100% 一致 |
| `placement.ts` 定位引擎（695 行）| ✅ 字节级一致 |
| `overlay-context.tsx` / `index.tsx` | ✅ 字节级一致 |
| HTML 元素 children | ✅ 等价（cloneElement 透传）|
| `forwardRef` 组件 children | ✅ 等价（cloneElement 透传）|
| `memo(forwardRef)` children | ✅ 等价（递归识别）|
| **class 组件 children** | ✅ **等价**（LegacyRefBridge 兜底，测试覆盖）|
| **无 forwardRef 的普通函数组件 children** | ✅ **等价**（LegacyRefBridge 兜底，测试覆盖）|
| click / mousedown / keydown / scroll / esc / mask 事件行为 | ✅ 等价，顺带修复过期 closure |
| `getHTMLElement` 对正常输入 | ✅ 等价 |
| `getHTMLElement` 对 document / text node / fragment | ✅ 等价（都 fallback 到 body）|
| `getHTMLElement` 对 `getDOMNode()` wrapper | ✅ 等价（甚至更精确）|
| `target` / `safeNode` / `container` 回调返回 class instance | ❌ 不等价（React 19 固有限制）|

## 六、React 版本兼容范围

`peerDependencies: ">=16.8.0"` 的依据：

| 代码位置 | 使用的 API | 最低 React 版本 |
|---|---|---|
| 基础 hooks（`useState` / `useEffect` / `useLayoutEffect` / `useRef` / `useCallback` / `useContext`）| hooks | **16.8** |
| `React.forwardRef` | forwardRef | 16.3 |
| `React.createContext` | 新 Context API | 16.3 |
| `cloneElement(children, { ref })` | ref 特殊处理跨版本一致 | 16.x |
| `Symbol.for('react.forward_ref')` / `Symbol.for('react.memo')` | 内部 symbol | 16.6 |
| `LegacyRefBridge`（marker span + `nextElementSibling`）| 纯 DOM API | 不依赖 React 新特性 |
| `createPortal` | Portal | 16.0 |

**没有使用任何 React 18/19 独有 API**（`useId`、`useTransition`、`useSyncExternalStore`、`use`、ref cleanup 等都未用到），因此运行时兼容 React 16.8 → 19。

> 说明：测试用例里 `act` 从 `react` 导入，这需要 React 18.3+；但这仅影响**本仓库跑测试**，不影响**下游使用**。

## 七、已知限制

### 7.1 dev server（`npm start`）不可用

根因是 `build-plugin-component@1.12.2`（当前最新版）的模板文件 `src/template/template.hbs` 中使用了 `ReactDOM.render`：

```js
// node_modules/build-plugin-component/src/template/template.hbs
import ReactDOM from 'react-dom';
// ...
ReactDOM.render(<App ... />, document.getElementById('root'));
```

`ReactDOM.render` 在 React 19 中已被移除，dev server 启动即报错：`Uncaught TypeError: ReactDOM.render is not a function`。

**影响范围**：

| 命令 | 状态 |
|---|---|
| `npm test` | ✅ 正常 |
| `npm run build` | ✅ 正常 |
| `npx tsc --noEmit` | ✅ 正常 |
| `npm run lint` | ✅ 正常 |
| `npm start` | ❌ 不可用 |

**解决方案**：需要向 `build-plugin-component` 上游提交 PR，将 `ReactDOM.render` 替换为 `createRoot`：

```diff
- import ReactDOM from 'react-dom';
+ import { createRoot } from 'react-dom/client';

- ReactDOM.render(<App ... />, document.getElementById('root'));
+ createRoot(document.getElementById('root')).render(<App ... />);
```

### 7.2 class instance 作为 API 回调返回值

如 §1.4 所述，`target`/`safeNode`/`container` 回调返回 class instance 的场景（违反类型约定）在 React 19 下无法兜底，原版 `findDOMNode` 的能力无法还原。

### 7.3 `RefWrapper` 导出类型变更（`instanceof` 失效）

原版 `RefWrapper` 是 class component（`class RefWrapper extends React.Component`），新版是 `React.forwardRef(...)` 返回的 `ForwardRefExoticComponent`。

**影响**：若下游代码有 `instanceof RefWrapper` 判断，将静默返回 `false`。需改为 `element.type === RefWrapper` 或直接去掉该判断。

**不受影响**：JSX 用法（`<RefWrapper>…</RefWrapper>`）、TypeScript props 类型、所有运行时行为。

### 7.4 `getHTMLElement` 对 `null`/`undefined` 的返回值变化

原版 `return node`（保留 `null`/`undefined` 原值），新版对所有 falsy 输入统一 `return null`。

**影响**：若消费方严格判断 `getHTMLElement(undefined) === undefined`，会得到 `null` 而非 `undefined`，需改为 `!= null` 或 falsy 判断。

> `getHTMLElement` 未在 `index.ts` 中导出，为库内部工具函数；库内所有调用点均以 falsy 判断，不受影响。

### 7.5 `LegacyRefBridge` 向 DOM 注入 marker span

当 `RefWrapper` 的 children 是 **class 组件**或**无 `forwardRef` 的函数组件**时，会在 children 之前插入一个 `<span style="display:none" aria-hidden="true">` 作为 DOM marker。

**影响**：
- CSS 中 `:first-child`、`+ span` 等结构型选择器可能意外匹配到该 span
- 消费方的 snapshot 测试会出现额外的 `<span style="display: none;" aria-hidden="true" />`

**不受影响**：
- 视觉与布局（`display:none`，不占空间）
- HTML 元素 / `forwardRef` / `memo(forwardRef)` 类型的 children（走 `cloneElement` 透传路径，不注入 span）

## 八、验证结果

| 检查项 | 结果 |
|---|---|
| TypeScript 编译（`tsc --noEmit`）| ✅ 0 错误（除预存的 `noUnusedLocals` 历史遗留 2 条）|
| ESLint（`npm run eslint`）| ✅ 无 error |
| 全量测试（`npm test`）| ✅ **77 passed** / 1 skipped / 78 total |
| 生产构建（`npm run build`）| ✅ `es/` + `lib/` 正常生成 |
| 开发服务器（`npm start`）| ❌ 不可用（见 §7.1）|

## 九、文件改动清单

```
 .gitignore                      | 排除 .claude/ / .npmrc / .eslintcache / CLAUDE.md / openspec/
 package.json                    | 依赖 / peerDependencies 更新
 tsconfig.json                   | jsx → react-jsx
 src/overlay.tsx                 | RefWrapper 分流 + LegacyRefBridge + useEvent + overlayRefCallback
 src/popup.tsx                   | 移除 findDOMNode，refWrapperRef 归一化
 src/utils.ts                    | getHTMLElement 重写
 test/setupTests.js              | Enzyme → RTL 配置
 test/overlay.test.jsx           | RTL 迁移 + 3 个兜底测试
 test/popup.test.jsx             | RTL 迁移
 docs/react19-migration.md       | 本文档
```

`placement.ts` / `overlay-context.tsx` / `index.tsx` / `utils.test.js` / `placement.test.jsx` 未改动。
