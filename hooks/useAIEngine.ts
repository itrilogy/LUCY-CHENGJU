import { useEffect, useState } from 'react';
import { getAIStatus } from '../services/aiService';

/**
 * 读取当前推理引擎名称。
 *
 * 原实现在 **15 个组件**里各写一遍：
 * ```tsx
 * useEffect(() => { getAIStatus().then(setEngineName); }, []);
 * ```
 * 三处问题：
 *   ① 组件卸载后仍会 `setState`（React 警告 / 潜在泄漏）；
 *   ② promise 无 `catch` —— 服务不可用时产生**静默 unhandled rejection**；
 *   ③ 返回值未校验，`null` 会把引擎名覆盖成空。
 *
 * 统一收口于此，各组件只调 `useAIEngine()`。
 */
export function useAIEngine(fallback = 'DeepSeek'): string {
    const [engineName, setEngineName] = useState(fallback);

    useEffect(() => {
        let alive = true;
        getAIStatus()
            .then(name => {
                if (alive && name) setEngineName(name);
            })
            .catch(() => {
                // 引擎名属装饰性信息；取不到就沿用 fallback，不打扰用户
            });
        return () => {
            alive = false;
        };
    }, []);

    return engineName;
}

export default useAIEngine;
