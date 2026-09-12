#!/usr/bin/env python3
"""FLOW 几何门禁的**注入回归**（门禁自证）—— R22 落库版。

用途：证明 `scripts/assert_flow_geometry.ts` 的 G1–G5 **真的能拦住**对应缺陷，
而不是「恰好通过」。做法：故意注入能复现历史缺陷的改动 → 跑门禁 → 确认报红 → **还原并校验哈希**。

运行：`python3 scripts/_flow_gate_injection.py`（需 python3；不进 build 护栏）

三例（均对应 R22 报告 §5.1）：
  A 碰撞检测失效      → 期望 G1 报红（穿越任意盒，含自身盒）
  B 回退 R21 旧配置    → 期望 G1/G3 报红（自身盒豁免 + 无背向罚 + 无网关白名单）
  C 子流程 √N 方阵     → 期望 G4 报红（布局层与渲染层数学重新分叉）
"""
import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = 'scripts/assert_flow_geometry.ts'

AFR = 'components/flow/AlgebraicFlowRouter.ts'
VGR = 'components/flow/VisibleGraphRouter.ts'
POPT = 'components/flow/PortOptimizer.ts'
FSVG = 'components/flow/flowToSVG.ts'
XL = 'components/flow/ExcelLayout.ts'

CASE_A = [
    (AFR, '      const a = path[i], b = path[i + 1];',
          '      const a = path[i], b = path[i + 1];\n      if (true) return false; // 注入：碰撞检测失效'),
]
CASE_B = [
    (AFR, 'if (self && !selfBoxStrict) continue;', 'if (self) continue;'),
    (VGR, 'if (self && !selfBoxStrict) continue;', 'if (self) continue;'),
    (POPT, 'return BACK_FACING_PENALTY * backFacing(e, sp, tp) + BEND_WEIGHT * countBends(pts) + LEN_WEIGHT * len + detour;',
           'return BEND_WEIGHT * countBends(pts) + LEN_WEIGHT * len;'),
    (POPT, 'if (!legalSp(e.from, sp)) continue;', 'if (false && !legalSp(e.from, sp)) continue;'),
    (POPT, 'if (!legalTp(e.to, tp)) continue;', 'if (false && !legalTp(e.to, tp)) continue;'),
    (POPT, 'if (inAtFrom?.has(sp)) continue;', 'if (false && inAtFrom?.has(sp)) continue;'),
    (POPT, 'if (outAtTo?.has(tp)) continue;', 'if (false && outAtTo?.has(tp)) continue;'),
]
CASE_C = [
    (XL, 'nx = Math.min(nx, SUBPROCESS_INNER.maxCols);',
         'nx = Math.max(1, Math.ceil(Math.sqrt(items.length || 1))); ny = Math.max(1, Math.ceil((items.length || 1) / nx));'),
]

CASES = [('A · 碰撞检测失效', CASE_A), ('B · 回退 R21 旧配置', CASE_B), ('C · 子流程 √N 方阵', CASE_C)]


def sha(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12]


def run_gate():
    r = subprocess.run(['node', '--experimental-strip-types', SCRIPT],
                       cwd=ROOT, capture_output=True, text=True)
    out = (r.stdout + r.stderr).splitlines()
    return [ln for ln in out if ln.startswith('✗')], (out[-1] if out else '')


def main() -> int:
    problems = 0
    for name, files in CASES:
        originals, hashes = {}, {}
        ok = True
        for rel, old, new in files:
            p = ROOT / rel
            originals[rel] = p.read_text()
            hashes[rel] = sha(p)
            if old not in originals[rel]:
                print(f'[{name}] 注入锚点未找到：{rel}（源码已演进？请同步本脚本）')
                ok = False
                break
            p.write_text(originals[rel].replace(old, new, 1))
        if not ok:
            for rel, text in originals.items():
                (ROOT / rel).write_text(text)
            problems += 1
            continue
        reds, tail = run_gate()
        for rel, text in originals.items():
            (ROOT / rel).write_text(text)
        restored = all(sha(ROOT / rel) == hashes[rel] for rel in originals)
        verdict = 'OK' if reds and restored else 'PROBLEM'
        if verdict == 'PROBLEM':
            problems += 1
        print(f'[{verdict}] {name}')
        print(f'   报红: {reds if reds else "（无报红 —— 门禁未能拦住！）"}')
        print(f'   末行: {tail}')
        print(f'   全部还原: {restored}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
