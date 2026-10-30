import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    resetKey?: string | number;
    fallbackTitle?: string;
}

interface ErrorBoundaryState {
    error: Error | null;
}

/**
 * 图表画布与编辑器工作台容错边界（R33 / AUD-200）
 * 防止单个懒加载图表分包异常或运行期渲染错误导致整个应用白屏。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ error: null });
        }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[IQS ErrorBoundary] Caught component error:', error, info);
    }

    private handleRetry = () => {
        this.setState({ error: null });
    };

    render() {
        if (this.state.error) {
            return (
                <div
                    role="alert"
                    className="w-full h-full min-h-[240px] flex flex-col items-center justify-center p-8 text-center bg-[var(--card-bg)] text-[var(--text-main)]"
                >
                    <div className="w-12 h-12 rounded-md bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 flex items-center justify-center mb-4">
                        <AlertTriangle size={22} className="text-[var(--text-danger)]" />
                    </div>
                    <h3 className="text-sm font-black tracking-widest uppercase mb-2">
                        {this.props.fallbackTitle || '组件加载或渲染异常'}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono max-w-md break-words mb-5">
                        {this.state.error.message || '未知渲染错误'}
                    </p>
                    <button
                        type="button"
                        onClick={this.handleRetry}
                        className="px-4 py-2 rounded-md bg-primary text-white text-[11px] font-black tracking-widest uppercase hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <RotateCcw size={13} />
                        重新加载模块
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
