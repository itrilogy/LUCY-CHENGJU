import { useEffect, useState } from 'react';
import { getAIStatus, AI_CONFIG_CHANGED_EVENT } from '../services/aiService';

/**
 * 读取当前推理引擎名称，并监听大模型配置中心的热切换事件实时刷新。
 */
export function useAIEngine(fallback = 'DeepSeek'): string {
    const [engineName, setEngineName] = useState(fallback);

    useEffect(() => {
        let alive = true;
        const syncStatus = () => {
            getAIStatus()
                .then(name => {
                    if (alive && name) setEngineName(name);
                })
                .catch(() => {});
        };
        syncStatus();
        window.addEventListener(AI_CONFIG_CHANGED_EVENT, syncStatus);
        return () => {
            alive = false;
            window.removeEventListener(AI_CONFIG_CHANGED_EVENT, syncStatus);
        };
    }, []);

    return engineName;
}

export default useAIEngine;
