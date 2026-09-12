import React from 'react';

export interface ConfirmInlineProps {
    /** 提示文案，例如「恢复示例？当前修改将丢失」 */
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    className?: string;
}

/**
 * 内联二次确认条 —— 用于替代 `window.confirm()`。
 *
 * 项目**禁用浏览器原生弹窗**：它是阻塞式的，会冻结渲染与动画；样式不受主题
 * 控制（在深色皮肤下尤其突兀）；且在 iframe / 沙箱环境下可能被直接屏蔽，
 * 导致「点了没反应」。
 *
 * 用法：
 * ```tsx
 * {confirmReset
 *   ? <ConfirmInline message="恢复示例？当前修改将丢失"
 *                    onConfirm={doReset} onCancel={() => setConfirmReset(false)} />
 *   : <button onClick={() => setConfirmReset(true)} … />}
 * ```
 */
export const ConfirmInline: React.FC<ConfirmInlineProps> = ({
    message,
    onConfirm,
    onCancel,
    className = '',
}) => (
    <div
        role="alertdialog"
        aria-live="assertive"
        className={`flex items-center gap-2 px-3 h-11 shrink-0
                    bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 rounded-md ${className}`}
    >
        <span className="text-[11px] font-bold text-[var(--text-danger)] whitespace-nowrap">{message}</span>
        <button
            type="button"
            onClick={onConfirm}
            className="px-2.5 py-1 text-[11px] font-black uppercase rounded text-white bg-[var(--alert-red)] hover:opacity-90 transition-opacity"
        >
            确认
        </button>
        <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 text-[11px] font-black uppercase rounded text-[var(--text-secondary)] hover:text-[var(--sidebar-text)] transition-colors"
        >
            取消
        </button>
    </div>
);

export default ConfirmInline;
