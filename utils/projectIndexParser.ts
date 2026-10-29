/**
 * 项目版本与工程历程解析器 · 单一真源（SSOT = `docs/PROJECT_INDEX.md`）
 *
 * 设计目的：
 * 1. `DashboardView.tsx` 版权弹窗原先硬编码了版本发布记录，与 `docs/PROJECT_INDEX.md` 长期脱节；
 * 2. 本模块直接解析 `docs/PROJECT_INDEX.md` 顶部的「软件版本」元数据及 `## 1. 工程历程时间线` 表格，
 *    将其转换为版权页既有的「阶段分组 + 版本号 + 发布说明 + 标志性文档」结构，
 *    实现一处维护 `docs/PROJECT_INDEX.md`、版权弹窗自动同步展现。
 */
import projectIndexRaw from '../docs/PROJECT_INDEX.md?raw';

export interface ReleaseEntry {
    stage: string;
    version: string;
    date: string;
    summary: string;
    docs: string[];
    isLatestPhase: boolean;
}

export interface ReleaseStageGroup {
    id: string;
    title: string;
    isHighlight: boolean;
    entries: ReleaseEntry[];
}

export interface ProjectReleaseMeta {
    softwareVersion: string;
    commitSpan: string;
    groups: ReleaseStageGroup[];
    totalMilestones: number;
}

/** 清理 Markdown 粗体/行内代码标记，保留可读纯文本 */
function cleanMdText(raw: string): string {
    return raw
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .trim();
}

/** 提取单元格中的文档路径列表 */
function extractDocPaths(raw: string): string[] {
    const matches = raw.match(/`([^`]+)`/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/`/g, '').trim()).filter(Boolean);
}

/**
 * 解析 `docs/PROJECT_INDEX.md` 原文，产出结构化版本发行记录
 */
export function parseProjectIndexReleases(markdown: string = projectIndexRaw): ProjectReleaseMeta {
    const lines = String(markdown ?? '').split(/\r?\n/);

    let softwareVersion = 'V3.6.0-ildr';
    let commitSpan = '2026-02-05 → 2026-10-28';

    for (const line of lines) {
        if (line.includes('**软件版本**')) {
            const m = line.match(/`([^`]+)`/);
            if (m) softwareVersion = m[1];
        } else if (line.includes('**提交跨度**')) {
            const parts = line.split('|').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                commitSpan = cleanMdText(parts[1]);
            }
        }
    }

    // 定位 "## 1. 工程历程时间线" 下的 Markdown 表格
    let inSection1 = false;
    const rawEntries: ReleaseEntry[] = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith('## 1.')) {
            inSection1 = true;
            continue;
        }
        if (inSection1 && (line.startsWith('### ') || (line.startsWith('## ') && !line.startsWith('## 1.')))) {
            break;
        }
        if (!inSection1 || !line.startsWith('|')) continue;

        const cells = line
            .split('|')
            .slice(1, -1)
            .map(c => c.trim());

        if (cells.length < 4) continue;
        // 跳过表头与分隔行
        if (cells[0].includes('阶段') || /^[:-\s]+$/.test(cells[0])) continue;

        const stage = cleanMdText(cells[0]);
        let version = '';
        let date = '';
        let summary = '';
        let docsCell = '';

        if (cells.length >= 5) {
            version = cleanMdText(cells[1]);
            date = cleanMdText(cells[2]);
            summary = cleanMdText(cells[3]);
            docsCell = cells[4];
        } else {
            date = cleanMdText(cells[1]);
            summary = cleanMdText(cells[2]);
            docsCell = cells[3];
        }

        rawEntries.push({
            stage,
            version: version || stage,
            date,
            summary,
            docs: extractDocPaths(docsCell),
            isLatestPhase: stage === 'P7' || stage === 'P6',
        });
    }

    // 按阶段聚合为 4 个大组（倒序：最新阶段置顶，组内里程碑按时间倒序排列）
    const groupDefs: Array<{ id: string; title: string; matchStages: string[]; isHighlight: boolean }> = [
        {
            id: 'P7',
            title: 'P7 · 全量自研 SVG 化、G6 归零与大模型管理中心 · 现行发行 (v3.5.5 – v3.6.0)',
            matchStages: ['P7'],
            isHighlight: true,
        },
        {
            id: 'P6',
            title: 'P6 · 卡片单一真源（SSOT）、双模分层渲染引擎与确定性数学布局 (v3.3.0 – v3.5.4)',
            matchStages: ['P6'],
            isHighlight: true,
        },
        {
            id: 'P5',
            title: 'P5 · 品牌化全域升级、软著发行体系与深色模式 (v3.0.0 – v3.2.0)',
            matchStages: ['P5'],
            isHighlight: false,
        },
        {
            id: 'P2-P4',
            title: 'P2–P4 · MCP 协议化 / ILDR 4.0 / IQS-DSL v1 / FLOW 泳道引擎 (v2.0.0 – v3.5.0)',
            matchStages: ['P4', 'P3', 'P2'],
            isHighlight: false,
        },
        {
            id: 'P1',
            title: 'P1 · 项目起步（14 类 QC 图表组件底座 + AI 推理服务）(v1.0.0 – v1.8.0)',
            matchStages: ['P1'],
            isHighlight: false,
        },
    ];

    const groups: ReleaseStageGroup[] = groupDefs
        .map(def => {
            const matched = rawEntries
                .filter(e => def.matchStages.includes(e.stage))
                .slice()
                .reverse();
            return {
                id: def.id,
                title: def.title,
                isHighlight: def.isHighlight,
                entries: matched,
            };
        })
        .filter(g => g.entries.length > 0);

    return {
        softwareVersion,
        commitSpan,
        groups,
        totalMilestones: rawEntries.length,
    };
}
