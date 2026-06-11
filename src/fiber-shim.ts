/**
 * ⚠️ 依赖 React 私有 API（_reactInternals / fiber.tag / fiber.flags 常量）。
 *
 * 用途：React 19 移除 ReactDOM.findDOMNode 后，为 Overlay/Balloon/Tooltip/Form 等组件
 * 提供"用户自定义 class 组件"场景的 DOM 反查兜底。
 *
 * 实现目标：与 React 的 `findDOMNode`（内部 `findCurrentHostFiber`）语义对齐——
 *   1. `findCurrentFiber`：把 fiber 归一化到「已提交的 current 树」（双 fiber 回溯 +
 *      未挂载判定），等价 React 的 `findCurrentFiberUsingSlowPath` + `getNearestMountedFiber`；
 *   2. `findHostFiberStateNode`：DFS（child 优先、再 sibling）找第一个 host fiber 的 stateNode，
 *      host tag 覆盖 HostComponent / HostText / HostHoistable / HostSingleton（含 React 19 新增）。
 *
 * 与 findDOMNode 的有意偏离（均为兜底场景下的合理取舍）：
 *   - 用 `nodeType`（1=Element / 3=Text）判定而非 `instanceof Element/Text`：跨 realm 安全
 *     （simulator 画布在 iframe，其 DOM 属于 iframe 的 realm，instanceof 会判否）。
 *   - 未挂载 / 结构异常时「返回 null」而非「抛错」：shim 是兜底，退化行为等同于不装 shim。
 *   - 省略 `getNearestMountedFiber` 里的 `Hydrating` flag 检测：该 flag 位值跨 React 版本不稳定，
 *     且仅在 SSR 水合进行中触发（Overlay target 几乎不涉及），仅保留稳定的 `Placement`。
 *
 * 维护约束：React 主版本升级时必须人工核验 fiber 结构 / tag / flags 是否变化。
 */

// React WorkTag 常量（react-reconciler ReactWorkTags；3/5/6 自 React 16 稳定，26/27 为 React 19 新增）
const HostRoot = 3;
const HostComponent = 5;
const HostText = 6;
const HostHoistable = 26;
const HostSingleton = 27;

// React Fiber flag（ReactFiberFlags）：Placement 自 React 16 起恒为 0b10，稳定
const Placement = 0b0000000000000000000000000010;

interface FiberLike {
  tag: number;
  stateNode: unknown;
  child: FiberLike | null;
  sibling: FiberLike | null;
  return: FiberLike | null;
  alternate: FiberLike | null;
  flags?: number;
}

function getFiberFromInstance(instance: unknown): FiberLike | null {
  if (!instance || typeof instance !== 'object') return null;
  const holder = instance as {
    _reactInternals?: FiberLike; // React 17+
    _reactInternalFiber?: FiberLike; // React 16 legacy
  };
  return holder._reactInternals ?? holder._reactInternalFiber ?? null;
}

/**
 * 等价 React `getNearestMountedFiber`：找到最近的已挂载 fiber。
 * 未挂载（脱离 HostRoot 的断开子树）返回 null。省略 Hydrating flag（见文件头说明）。
 */
function getNearestMountedFiber(fiber: FiberLike): FiberLike | null {
  let node: FiberLike = fiber;
  let nearestMounted: FiberLike | null = fiber;
  if (!fiber.alternate) {
    // 无 alternate：可能是尚未插入的新树，沿 return 向上，遇到 Placement 则最近已挂载为其 parent
    let nextNode: FiberLike | null = node;
    do {
      node = nextNode;
      if (((node.flags ?? 0) & Placement) !== 0) {
        nearestMounted = node.return;
      }
      nextNode = node.return;
    } while (nextNode);
  } else {
    while (node.return) {
      node = node.return;
    }
  }
  if (node.tag === HostRoot) {
    return nearestMounted;
  }
  // 没走到 HostRoot：处于已卸载的断开子树
  return null;
}

/**
 * 等价 React `findCurrentFiberUsingSlowPath`：在 current / alternate 双缓冲中，
 * 回溯到 root 判定哪一棵是「已提交的 current 分支」，返回对应 fiber。
 * 原版在未挂载 / 不变量被破坏时抛错，这里一律返回 null（兜底语义）。
 */
function findCurrentFiber(fiber: FiberLike): FiberLike | null {
  const alternate = fiber.alternate;
  if (!alternate) {
    const nearestMounted = getNearestMountedFiber(fiber);
    if (nearestMounted === null) return null; // 未挂载
    if (nearestMounted !== fiber) return null; // 自身未挂载（最近挂载的是祖先）
    return fiber;
  }

  let a: FiberLike = fiber;
  let b: FiberLike = alternate;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const parentA = a.return;
    if (parentA === null) {
      // 到达 root
      break;
    }
    const parentB = parentA.alternate;
    if (parentB === null) {
      // parent 无 alternate（异常少见，如 Suspense 隐藏时插入的额外 fragment），跳过该层
      const nextParent = parentA.return;
      if (nextParent !== null) {
        a = nextParent;
        b = nextParent;
        continue;
      }
      break;
    }

    if (parentA.child === parentB.child) {
      // 两个 parent 指向同一 child 集合：在该集合里找 a / b，确定 current 分支
      let child: FiberLike | null = parentA.child;
      while (child) {
        if (child === a) return fiber; // A 是 current
        if (child === b) return alternate; // B 是 current
        child = child.sibling;
      }
      return null; // child 集合里都没找到：异常
    }

    if (a.return !== b.return) {
      // return 指针不交叉：a 属于 parentA 子集，b 属于 parentB 子集
      a = parentA;
      b = parentB;
    } else {
      // return 指针指向同一 fiber：扫描两个 parent 的 child 集合确定归属
      let didFindChild = false;
      let child: FiberLike | null = parentA.child;
      while (child) {
        if (child === a) {
          didFindChild = true;
          a = parentA;
          b = parentB;
          break;
        }
        if (child === b) {
          didFindChild = true;
          b = parentA;
          a = parentB;
          break;
        }
        child = child.sibling;
      }
      if (!didFindChild) {
        child = parentB.child;
        while (child) {
          if (child === a) {
            didFindChild = true;
            a = parentB;
            b = parentA;
            break;
          }
          if (child === b) {
            didFindChild = true;
            b = parentB;
            a = parentA;
            break;
          }
          child = child.sibling;
        }
        if (!didFindChild) return null; // 两边都没找到：异常
      }
    }
  }

  // root 必须是 HostRoot，否则是断开（未挂载）子树
  if (a.tag !== HostRoot) return null;
  // root.stateNode 是 FiberRoot，其 current 指向已提交分支
  const root = a.stateNode as { current?: FiberLike } | null;
  if (root && root.current === a) {
    return fiber; // A 是 current
  }
  return alternate; // 否则 B 是 current
}

/**
 * 等价 React `findCurrentHostFiberImpl`：DFS 找第一个 host fiber 的 stateNode。
 */
function findHostFiberStateNode(fiber: FiberLike | null): Element | Text | null {
  if (!fiber) return null;
  const tag = fiber.tag;
  if (tag === HostComponent || tag === HostText || tag === HostHoistable || tag === HostSingleton) {
    const node = fiber.stateNode as { nodeType?: number } | null;
    // 跨 realm 安全：用 nodeType（1=Element / 3=Text）而非 instanceof（见文件头说明）
    return node && (node.nodeType === 1 || node.nodeType === 3)
      ? (node as unknown as Element | Text)
      : null;
  }
  let child = fiber.child;
  while (child) {
    const found = findHostFiberStateNode(child);
    if (found) return found;
    child = child.sibling;
  }
  return null;
}

export function fiberShim(instance: unknown): Element | Text | null {
  try {
    const fiber = getFiberFromInstance(instance);
    if (!fiber) return null;
    // 先归一化到 current 树（对齐 findDOMNode），再 DFS 取第一个 host DOM
    const current = findCurrentFiber(fiber);
    return current ? findHostFiberStateNode(current) : null;
  } catch {
    return null;
  }
}
