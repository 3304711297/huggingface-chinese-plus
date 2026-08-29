/* ======================================================================
 * 翻译引擎(原创实现)
 *
 * 设计思路参考 1cyberlangke1/huggingface-zh(MIT)与 izhadu/GreasyFork
 * HuggingFace-Chinese(GPL-3.0),未复制两者代码。
 *
 * 目标:huggingface.co 是 SvelteKit SPA,DOM 刷新极频繁。
 * 策略:
 *   1. 全量扫描用 TreeWalker(浏览器 C++ 级遍历)而不是 JS 递归
 *   2. 增量变更用 MutationObserver 收集、requestIdleCallback 空闲批处理,
 *      滚动/点击永远优先于翻译
 *   3. 三重剪枝:超长文本、无字母文本、已处理节点(WeakSet)不重复进入查找
 *   4. 安全区:代码块/编辑器/正文 Markdown 等绝不动
 * ====================================================================== */

const DICT_INDEX = buildIndex(__HF_DICT.translations);
const REGEX_RULES = compileRules(__HF_DICT.regexRules);

/* ---- 正则翻译开关(脚本管理器菜单里切换,重启页面生效) ---- */
function loadRegexToggle() {
    try {
        if (typeof GM_getValue === 'function') return GM_getValue('enable_regex', true);
    } catch { /* 无存储环境时按默认开启 */ }
    return true;
}
let enableRegex = loadRegexToggle();

function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    GM_registerMenuCommand(
        (enableRegex ? '🔴 关闭' : '🟢 开启') + '正则翻译("3 days ago"等动态文本,当前' +
        (enableRegex ? '开' : '关') + ')',
        () => {
            enableRegex = !enableRegex;
            try {
                if (typeof GM_setValue === 'function') GM_setValue('enable_regex', enableRegex);
            } catch { /* 忽略存储失败,本次会话仍然生效 */ }
            location.reload();
        }
    );
}

/* ---- 安全区:这些元素及后代绝不翻译 ---- */
const UNSAFE_SELECTOR = [
    'script', 'style', 'noscript', 'textarea', 'code', 'pre', 'kbd', 'samp',
    'svg', 'math', 'iframe', 'canvas',
    '[contenteditable="true"]', '[contenteditable=""]',
    '.cm-editor', '.monaco-editor', '.ace_editor', // 代码编辑器
    '.markdown-body', '.model-card-content', '.hf-sanitized', // 模型卡/文档正文
    '.prose', '[class*="language-"]', // 语法高亮块
].join(',');

const ATTR_SELECTOR = '[placeholder],[title],[aria-label]';

// HAS_LETTER 由 i18n-core 提供(同一作用域内联),这里不重复声明
const translatedNodes = new WeakSet();
const pendingRoots = [];
let scheduled = false;

function isUnsafe(textNode) {
    const el = textNode.parentElement;
    // 父元素脱离文档(框架正在重建)时不处理,等它挂回去由 observer 再触发
    if (!el) return true;
    return el.closest(UNSAFE_SELECTOR) !== null;
}

/** 翻译单个文本节点;不可翻译的也记入 WeakSet,避免同一节点被反复检查 */
function applyTranslation(textNode) {
    if (translatedNodes.has(textNode)) return;
    translatedNodes.add(textNode);
    const text = textNode.nodeValue;
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_TEXT_LENGTH || !HAS_LETTER.test(trimmed)) return;
    const zh = translateText(DICT_INDEX, REGEX_RULES, text, enableRegex);
    if (zh === null) return;
    // 只替换首个命中段,保留节点原文的前导/尾随空白,避免破坏布局
    textNode.nodeValue = text.replace(trimmed, zh);
}

function collectTextNodes(root) {
    if (root.nodeType === Node.TEXT_NODE) {
        if (!isUnsafe(root)) applyTranslation(root);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.closest && root.closest(UNSAFE_SELECTOR)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) { return isUnsafe(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
    });
    let node;
    while ((node = walker.nextNode())) applyTranslation(node);
}

/** 翻译 root 范围内可翻译属性(placeholder/title/aria-label) */
function collectAttributes(root) {
    const targets = [];
    if (root.nodeType === Node.ELEMENT_NODE) {
        if (root.matches && root.matches(ATTR_SELECTOR)) targets.push(root);
        targets.push(...root.querySelectorAll(ATTR_SELECTOR));
    }
    for (const el of targets) {
        for (const attr of ['placeholder', 'title', 'aria-label']) {
            const value = el.getAttribute(attr);
            if (!value) continue;
            const trimmed = value.trim();
            if (!trimmed || trimmed.length > MAX_TEXT_LENGTH || !HAS_LETTER.test(trimmed)) continue;
            const zh = translateText(DICT_INDEX, REGEX_RULES, value, enableRegex);
            if (zh !== null) el.setAttribute(attr, value.replace(trimmed, zh));
        }
    }
}

/** 页面标题(如 "Models - Hugging Face") */
function translateTitle() {
    const zh = translateText(DICT_INDEX, REGEX_RULES, document.title || '', enableRegex);
    if (zh !== null) document.title = zh;
}

/* ---- 空闲批处理调度 ---- */
function schedule() {
    if (scheduled) return;
    scheduled = true;
    const run = () => { scheduled = false; flushPending(); };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1000 });
    else setTimeout(run, 150);
}

function flushPending() {
    if (!pendingRoots.length) return;
    const roots = pendingRoots.splice(0);
    for (const root of roots) {
        try {
            collectTextNodes(root);
            collectAttributes(root);
        } catch (e) {
            // 单个节点异常不能中断整批翻译
            console.warn('[HF中文] 处理节点失败:', e);
        }
    }
    translateTitle();
}

function processAll() {
    if (!document.body) return;
    pendingRoots.push(document.body);
    schedule();
}

/* ---- SPA 生命周期 ---- */
const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
        for (const node of m.addedNodes) {
            if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
                pendingRoots.push(node);
            }
        }
        // 框架就地改文本(Svelte 常见):文本节点本身不换新,解除已处理标记后补查。
        // 自己写入译文也会触发一次 characterData:重评时文本已无字母,只会空跑一次,不会死循环
        if (m.type === 'characterData' && m.target && m.target.nodeType === Node.TEXT_NODE) {
            translatedNodes.delete(m.target);
            pendingRoots.push(m.target);
        }
    }
    schedule();
});

let lastHref = location.href;
setInterval(() => {
    if (location.href !== lastHref) {
        lastHref = location.href;
        processAll(); // 路由切换:兜底全量扫描(新内容通常已由 observer 覆盖,此处是保险)
    }
}, 1500);

function start() {
    if (!document.body) return;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    registerMenu();
    processAll();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}

console.info(
    '[HF中文] v' + __VERSION + ' 已加载,词库 v' + __HF_DICT_VERSION +
    '(' + DICT_INDEX.size + ' 静态词条, ' + REGEX_RULES.length + ' 正则规则)'
);
