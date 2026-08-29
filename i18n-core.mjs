/**
 * i18n-core —— 纯函数翻译核心(无 DOM 依赖)
 *
 * 既是构建产物的一部分(build.mjs 内联进 userscript,此时去掉 export),
 * 也是单元测试的直接被测对象(node:test 导入)。因此本文件:
 *   - 不得引用 document/window/GM_* 等浏览器 API
 *   - 不得有模块顶层副作用
 *
 * 词库格式(来自 izhadu/GreasyFork HuggingFace-Chinese dict.json,GPL-3.0):
 *   {
 *     version: "2026.08.20 12:00:00",
 *     translations: { "英文原文": "中文", "@comment_xxx": "注释行", ... },
 *     regexRules: [ [ "正则字符串", "替换文本(支持 $1)" ], ... ]
 *   }
 */

/** 文本节点参与翻译的最大长度:词库键都很短,长文本只可能是正文/代码,直接跳过 */
export const MAX_TEXT_LENGTH = 120;

/** 纯符号/无字母文本(如 "···"、纯数字、标点)不可能命中词库,提前剪枝 */
const HAS_LETTER = /[a-zA-Z]/;

/**
 * 规范化查找键:折叠所有空白为单个空格。
 * 页面里的 "Models " 与 "Models  \n" 应命中同一条词库。
 */
export function normalizeKey(text) {
    return text.trim().replace(/\s+/g, ' ');
}

/**
 * 构建查找索引:
 *   - 跳过 @ 开头的注释键(词库作者用 "@comment_xxx" 写分节注释)
 *   - 跳过空键/空值与非字符串值,防御词库格式脏数据
 *   - 键经 normalizeKey 规范化
 * @returns {Map<string, string>}
 */
export function buildIndex(translations) {
    const index = new Map();
    if (!translations || typeof translations !== 'object') return index;
    for (const [en, zh] of Object.entries(translations)) {
        if (en.startsWith('@')) continue;
        if (typeof zh !== 'string' || !zh) continue;
        const key = normalizeKey(en);
        if (!key) continue;
        index.set(key, zh);
    }
    return index;
}

/**
 * 编译正则规则:
 *   - 词库里的正则是字符串,逐条 new RegExp 编译;单条非法只丢弃该条,绝不整体失败
 *     (上游一条手误不能让整个脚本罢工)
 *   - 以 ^ 或 \b 等锚点开头才算"锚定规则"?不区分——直接按词库原样使用,
 *     这里只做编译安全性和长度上限防御
 * @returns {Array<{re: RegExp, to: string}>}
 */
export function compileRules(rules) {
    const compiled = [];
    if (!Array.isArray(rules)) return compiled;
    for (const rule of rules) {
        if (!Array.isArray(rule) || rule.length < 2) continue;
        const [pattern, to] = rule;
        if (typeof pattern !== 'string' || typeof to !== 'string') continue;
        try {
            compiled.push({ re: new RegExp(pattern), to });
        } catch {
            /* 非法正则:丢弃该条 */
        }
    }
    return compiled;
}

/**
 * 查静态词。命中返回译文,未命中返回 null。
 */
export function lookupStatic(index, text) {
    if (typeof text !== 'string') return null;
    const key = normalizeKey(text);
    if (!key || !HAS_LETTER.test(key)) return null;
    return index.get(key) ?? null;
}

/**
 * 静态词未命中后尝试正则规则。
 * 只有当替换结果与原文不同才返回,否则返回 null(避免无意义写入触发 DOM 变更风暴)。
 */
export function lookupRegex(compiled, text) {
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed || !HAS_LETTER.test(trimmed)) return null;
    if (trimmed.length > MAX_TEXT_LENGTH) return null;
    for (const { re, to } of compiled) {
        if (re.test(trimmed)) {
            const replaced = trimmed.replace(re, to);
            if (replaced !== trimmed) return replaced;
        }
    }
    return null;
}

/**
 * 单条文本的完整翻译入口:静态词优先,正则兜底。
 * 传入 { index, compiled } 与 enableRegex 开关。
 * @returns {string | null} 译文;无需翻译返回 null
 */
export function translateText(index, compiled, text, enableRegex) {
    const staticHit = lookupStatic(index, text);
    if (staticHit !== null) return staticHit;
    if (enableRegex) return lookupRegex(compiled, text);
    return null;
}

/** 词库文件整体合法性校验(build 时兜底,防止上游格式变更悄悄产出空词库) */
export function validateDict(dict) {
    if (!dict || typeof dict !== 'object') return '顶层不是对象';
    if (typeof dict.version !== 'string' || !dict.version) return 'version 缺失';
    if (!dict.translations || typeof dict.translations !== 'object') return 'translations 缺失';
    if (!Array.isArray(dict.regexRules)) return 'regexRules 不是数组';
    if (buildIndex(dict.translations).size === 0) return 'translations 有效词条为 0';
    return null;
}
