// ==UserScript==
// @name         网页自动滚动助手
// @namespace    https://github.com/kwangwah/userscripts
// @version      1.0.0
// @description  任意网页自动滚动：支持匀速/逐行两种模式、速度调节、快捷键控制、设置持久化
// @author       kwangwah
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ========== 默认配置 ==========
    const DEFAULTS = {
        speed: 30,        // 滚动速度（px/帧 @60fps 约等于 px/秒 * 60 的 1/60，实际为每帧像素数）
        mode: 'smooth',   // 'smooth' 平滑滚动 | 'step' 逐行滚动（按行高）
        linesPerStep: 2,  // mode='step' 时每次滚动的行数
    };

    const store = {
        get(key) {
            if (typeof GM_getValue === 'function') {
                return GM_getValue(key, DEFAULTS[key]);
            }
            try {
                const v = localStorage.getItem('autoScroll:' + key);
                return v === null ? DEFAULTS[key] : JSON.parse(v);
            } catch (e) {
                return DEFAULTS[key];
            }
        },
        set(key, value) {
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
            } else {
                try {
                    localStorage.setItem('autoScroll:' + key, JSON.stringify(value));
                } catch (e) { /* ignore */ }
            }
        }
    };

    // ========== 状态 ==========
    const state = {
        running: false,
        speed: store.get('speed'),
        mode: store.get('mode'),
        linesPerStep: store.get('linesPerStep'),
        rafId: null,
    };

    const KEY = {
        toggle: 'Alt+Down',   // 开始/暂停
        stop: 'Alt+Up',       // 停止并回到顶部
        speedUp: 'Alt+Right', // 加速
        speedDown: 'Alt+Left' // 减速
    };

    // ========== 滚动实现 ==========
    function scrollStep() {
        const el = getScrollElement();
        if (!el) return;

        if (state.mode === 'step') {
            const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 16;
            el.scrollBy({ top: lineHeight * state.linesPerStep, behavior: 'auto' });
        } else {
            el.scrollBy({ top: state.speed, behavior: 'auto' });
        }
    }

    // 找到实际可滚动的元素（页面根或第一个出现滚动条的容器）
    function getScrollElement() {
        if (document.scrollingElement && document.scrollingElement.scrollHeight > document.scrollingElement.clientHeight) {
            return document.scrollingElement;
        }
        const candidates = document.querySelectorAll('body, html, main, article, #app, .app, [data-scroll]');
        for (const el of candidates) {
            if (el.scrollHeight > el.clientHeight + 2) return el;
        }
        return document.scrollingElement;
    }

    function loop() {
        if (!state.running) return;
        scrollStep();
        state.rafId = requestAnimationFrame(loop);
    }

    function start() {
        if (state.running) return;
        state.running = true;
        updatePanel();
        state.rafId = requestAnimationFrame(loop);
    }

    function stop() {
        state.running = false;
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = null;
        updatePanel();
    }

    function toggle() {
        state.running ? stop() : start();
    }

    function speedUp() {
        state.speed = Math.min(200, state.speed + 5);
        store.set('speed', state.speed);
        updatePanel();
    }

    function speedDown() {
        state.speed = Math.max(1, state.speed - 5);
        store.set('speed', state.speed);
        updatePanel();
    }

    // ========== 快捷键 ==========
    document.addEventListener('keydown', (e) => {
        const combo = (e.altKey ? 'Alt+' : '') + (e.ctrlKey ? 'Ctrl+' : '') + (e.metaKey ? 'Meta+' : '') + (e.shiftKey ? 'Shift+' : '') + e.key;
        switch (combo) {
            case KEY.toggle: e.preventDefault(); toggle(); break;
            case KEY.stop:   e.preventDefault(); stop(); getScrollElement().scrollTo({ top: 0, behavior: 'smooth' }); break;
            case KEY.speedUp:   e.preventDefault(); speedUp(); break;
            case KEY.speedDown: e.preventDefault(); speedDown(); break;
        }
    }, true);

    // ========== 浮动控制面板 ==========
    function updatePanel() {
        if (!panel) return;
        statusDot.className = 'asc-dot ' + (state.running ? 'asc-on' : 'asc-off');
        statusText.textContent = state.running ? '滚动中' : '已暂停';
        speedText.textContent = state.speed;
        modeText.textContent = state.mode === 'step' ? `逐行 ×${state.linesPerStep}` : '平滑';
    }

    let panel = null, statusDot = null, statusText = null, speedText = null, modeText = null;

    function buildPanel() {
        panel = document.createElement('div');
        panel.id = 'auto-scroll-panel';
        panel.innerHTML = `
            <div class="asc-row">
                <span class="asc-dot asc-off" id="asc-dot"></span>
                <span id="asc-status">已暂停</span>
            </div>
            <div class="asc-row asc-small">
                速度 <span id="asc-speed"></span>
                <button data-act="down">−</button><button data-act="up">＋</button>
            </div>
            <div class="asc-row asc-small">
                模式 <span id="asc-mode"></span>
                <button data-act="mode">切换</button>
            </div>
            <div class="asc-row asc-small asc-hint">${KEY.toggle} 开始/暂停 · ${KEY.stop} 回顶</div>
        `;
        const css = document.createElement('style');
        css.textContent = `
            #auto-scroll-panel {
                position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
                background: rgba(20, 22, 28, 0.92); color: #eee;
                border: 1px solid rgba(255,255,255,.15); border-radius: 10px;
                padding: 8px 12px; font: 12px/1.6 -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
                box-shadow: 0 4px 16px rgba(0,0,0,.35); user-select: none; min-width: 168px;
            }
            #auto-scroll-panel .asc-row { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
            #auto-scroll-panel .asc-small { margin-top: 4px; font-size: 11px; color: #aaa; }
            #auto-scroll-panel .asc-hint { color: #777; font-size: 10px; }
            #auto-scroll-panel .asc-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
            #auto-scroll-panel .asc-on  { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
            #auto-scroll-panel .asc-off { background: #94a3b8; }
            #auto-scroll-panel button {
                background: #334155; color: #eee; border: none; border-radius: 4px;
                padding: 1px 8px; cursor: pointer; font-size: 11px; line-height: 1.6;
            }
            #auto-scroll-panel button:hover { background: #475569; }
        `;
        document.head.appendChild(css);

        statusDot = panel.querySelector('#asc-dot');
        statusText = panel.querySelector('#asc-status');
        speedText = panel.querySelector('#asc-speed');
        modeText = panel.querySelector('#asc-mode');

        panel.addEventListener('click', (e) => {
            const act = e.target.dataset && e.target.dataset.act;
            if (act === 'up') speedUp();
            else if (act === 'down') speedDown();
            else if (act === 'mode') {
                state.mode = state.mode === 'smooth' ? 'step' : 'smooth';
                store.set('mode', state.mode);
                updatePanel();
            } else {
                toggle();
            }
        });

        document.body.appendChild(panel);
        // 可拖拽（简单实现：按住面板空白处移动）
        let dragging = false, dx = 0, dy = 0;
        panel.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            dragging = true; dx = e.clientX - panel.offsetLeft; dy = e.clientY - panel.offsetTop;
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            panel.style.left = (e.clientX - dx) + 'px';
            panel.style.right = 'auto';
            panel.style.top = (e.clientY - dy) + 'px';
            panel.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => { dragging = false; });

        updatePanel();
    }

    // 油猴菜单命令（可在扩展菜单中操作）
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('开始/暂停自动滚动', toggle);
        GM_registerMenuCommand('停止并回到顶部', () => {
            stop();
            getScrollElement().scrollTo({ top: 0, behavior: 'smooth' });
        });
        GM_registerMenuCommand('加速 (+5)', speedUp);
        GM_registerMenuCommand('减速 (−5)', speedDown);
    }

    // 页面就绪后挂载面板
    if (document.body) {
        buildPanel();
    } else {
        document.addEventListener('DOMContentLoaded', buildPanel);
    }
})();
