## 1. 生产源码：移除 findDOMNode（ref-forwarding spec）

- [ ] 1.1 将 `RefWrapper` 从 class 组件重构为 `React.forwardRef` 函数组件（`src/overlay.tsx:141-145`），使用 `cloneElement(children, { ref })` 转发 ref
- [ ] 1.2 移除 `overlay.tsx` 中的 `findDOMNode` 导入，修改 `overlayRefCallback` 参数类型为 `HTMLElement`，直接使用 ref 参数代替 `findDOMNode` 转换
- [ ] 1.3 移除 `utils.ts` 中的 `findDOMNode` 导入，从 `getHTMLElement` 函数中删除 `findDOMNode` fallback 分支
- [ ] 1.4 移除 `popup.tsx` 中的 `findDOMNode` 导入，将所有 `findDOMNode(triggerRef.current)` 替换为 `triggerRef.current` 直接访问（safeNodes、target、container、parentNode 共 4 处）
- [ ] 1.5 将 `overlay.tsx:231` 中的 `child.ref` 字符串 ref 检查改为 `child.props?.ref`
- [ ] 1.6 运行 `npx tsc --noEmit` 验证编译通过

## 2. 测试基础设施：迁移到 React Testing Library（rtl-testing spec）

- [ ] 2.1 安装 `@testing-library/react@^16`、`@testing-library/jest-dom@^6`、`@testing-library/user-event@^14`
- [ ] 2.2 重写 `test/setupTests.js`，替换 Enzyme 配置为 `import '@testing-library/jest-dom'`
- [ ] 2.3 重写 `test/overlay.test.jsx`：替换导入（`act` from `react`、RTL `render`/`fireEvent`/`screen`），将所有 Enzyme `mount` → RTL `render`、`setProps` → `rerender`、`find` → `querySelectorAll`、`simulate` → `fireEvent.*`、`ReactDOM.render` → RTL `render`、`unmountComponentAtNode` → RTL `unmount`
- [ ] 2.4 重写 `test/popup.test.jsx`：同 2.3 模式迁移，额外注意 hover 测试用 `fireEvent.mouseEnter`/`fireEvent.mouseLeave` 替代 Enzyme `simulate`
- [ ] 2.5 运行 `npx jest test/overlay.test.jsx test/popup.test.jsx --no-coverage` 验证所有测试通过
- [ ] 2.6 卸载 `enzyme`、`@wojtekmaj/enzyme-adapter-react-17`、`simulate-event` 依赖
- [ ] 2.7 运行 `npm test` 验证全量测试通过（包括 `placement.test.jsx` 和 `utils.test.js`）

## 3. React 版本升级与 TypeScript 修复（react19-types spec）

- [ ] 3.1 升级 `react` 和 `react-dom` 到 `^19.0.0`（`npm install --save-exact react@^19.0.0 react-dom@^19.0.0 --legacy-peer-deps`）
- [ ] 3.2 升级 `@types/react` 和 `@types/react-dom` 到 `^19.0.0`（`npm install --save-dev @types/react@^19.0.0 @types/react-dom@^19.0.0 --legacy-peer-deps`）
- [ ] 3.3 修改 `tsconfig.json` 中 `jsx` 从 `"react"` 改为 `"react-jsx"`
- [ ] 3.4 运行 `npx tsc --noEmit` 收集所有类型错误，逐个修复（`useRef` 参数、ref callback 返回值、`ReactElement.props` 默认 `unknown`、JSX namespace 等）
- [ ] 3.5 批量替换所有 `demo/*.md` 文件中的 `ReactDOM.render` 为 `createRoot`

## 4. 全量验证

- [ ] 4.1 运行 `npm test` 确认全部测试通过
- [ ] 4.2 运行 `npx tsc --noEmit` 确认零 TypeScript 错误
- [ ] 4.3 运行 `npm run eslint` 确认无新增 lint 错误
- [ ] 4.4 运行 `npm run build` 确认构建成功，`es/` 和 `lib/` 目录正常生成
- [ ] 4.5 运行 `npm start` 启动开发服务器，在浏览器中验证 demo 页面弹窗交互功能正常
