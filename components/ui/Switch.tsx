import React from 'react';

/**
 * Switch · 开关键控件（全项目唯一真源）
 *
 * 范式来源：**排列图 ParetoEditor** 的开关（用户指定为基准）——
 *   外观  w-14 h-7 圆角胶囊 · 圆点 w-5 h-5 · 开 left-8 / 关 left-1 · transition-all
 *
 * 在此基础上升级三项（符合 R-UI-17 / R-UI-16）：
 *   1. 关闭态改用 `--input-bg` + `--input-border`（原 `--sidebar-muted` 是文字色令牌，作背景语义错位且无边界）
 *   2. 补 `role="switch"` / `aria-checked` / `aria-label` —— 屏幕阅读器可识别
 *   3. 补 `focus-visible` 焦点环（R-UI-09 键盘可达）
 *
 * 几何自洽：h-7(28) = top-1(4) + 圆点 20 + 4 ；w-14(56) = left-8(32) + 20 + 4
 */
export interface SwitchProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    /** 无障碍名称；若外部已有可见 label，可只传 ariaLabel */
    ariaLabel?: string;
    disabled?: boolean;
    className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
    checked,
    onChange,
    ariaLabel,
    disabled = false,
    className = '',
}) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-14 h-7 shrink-0 rounded-full relative border transition-all duration-300
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-[var(--luxi-cyan)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${checked
                        ? 'bg-primary border-primary'
                        : 'bg-[var(--input-bg)] border-[var(--input-border)]'}
                    ${className}`}
    >
        <span
            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300
                        ${checked ? 'left-8' : 'left-1'}`}
            aria-hidden="true"
        />
    </button>
);

export default Switch;
