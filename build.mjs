/**
 * 组装脚本:生成单文件 userscript
 *
 * 结构:
 *   1. 元数据头(含来源署名、远程安装/自动更新地址)
 *   2. i18n-core.mjs 翻译核心(内联时去掉 export)
 *   3. 词库 sources/hf-dict.json(内联为常量)
 *   4. engine.js 翻译引擎(原创)
 *
 * 版本号规则:`<ourBase>.<buildNumber>`
 *   - ourBase:我们自己的功能版本,人工改动功能后手动递增
 *     (唯一权威来源是下方 OUR_BASE 常量)
 *   - buildNumber:upstream.state.json 中的构建号,上游词库每次实际更新时由
 *     scripts/check-upstream.mjs 自动 +1,保证脚本管理器能识别到新版本
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateDict } from './i18n-core.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(root, name), 'utf8');

/* ====== 发布配置 ====== */
const REPO_OWNER = '3304711297';
const REPO_NAME = 'huggingface-chinese-plus';
const OUR_BASE = '1.3'; // 我们自己的功能版本号,有功能性改动(含引擎修复/兼容性调整)时手动递增(本次:开发者模式)

/**
 * 校验状态文件中的 buildNumber(纯函数,供单元测试)。
 * buildNumber 是产物版本号的组成部分,非法时必须中止构建、绝不回退默认值 1——
 * 否则本地直接构建会静默产出降版本号的脚本(如 1.3.2 → 1.3.1),
 * 脚本管理器会把降版视为"已是最新",用户从此收不到更新。
 * @returns {{ok: true, buildNumber: number} | {ok: false, reason: string}}
 */
function validateBuildNumber(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        return { ok: false, reason: '状态文件顶层必须是对象' };
    }
    if (!Number.isInteger(state.buildNumber) || state.buildNumber < 1) {
        return {
            ok: false,
            reason: `buildNumber 非法(${JSON.stringify(state.buildNumber) ?? '缺失'}),必须是 >=1 的整数`,
        };
    }
    return { ok: true, buildNumber: state.buildNumber };
}

/** 内联 i18n-core:去掉 export 关键字(浏览器端不需要模块导出) */
function inlineCore(source) {
    const stripped = source.replace(/^export\s+/gm, '');
    if (/^\s*export\b/m.test(stripped)) throw new Error('i18n-core.mjs 存在无法内联的 export 形式');
    return stripped.trimEnd();
}

function main() {
    const state = JSON.parse(readFileSync(join(root, 'upstream.state.json'), 'utf8'));
    const validated = validateBuildNumber(state);
    if (!validated.ok) {
        throw new Error(
            `状态文件 upstream.state.json 非法(${validated.reason}),中止构建。` +
            '请先运行 check-upstream 或修复 upstream.state.json,' +
            '拒绝以默认 buildNumber 构建以免版本倒退。'
        );
    }
    const BUILD_NUMBER = validated.buildNumber;
    const VERSION = `${OUR_BASE}.${BUILD_NUMBER}`;
    const UPSTREAM_DICT_VERSION =
        (state.sources && state.sources.izhadu && state.sources.izhadu.versions?.dict) || '未知';
    const RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/huggingface-chinese-plus.user.js`;

    const HEADER = `// ==UserScript==
// @name         Hugging Face 中文化增强版
// @namespace    huggingface-chinese-plus
// @description  中文化 Hugging Face(huggingface.co / hf-mirror.com)全站界面:导航、筛选器、按钮、动态时间等。词库基于 izhadu/GreasyFork HuggingFace-Chinese (GPL-3.0);翻译引擎为原创实现
// @version      ${VERSION}
// @author       huggingface-chinese-plus
// @license      GPL-3.0
// @icon         https://huggingface.co/front/assets/huggingface_logo-noborder.svg
// @match        https://huggingface.co/*
// @match        https://*.huggingface.co/*
// @match        https://hf-mirror.com/*
// @noframes     页面内嵌 iframe 不注入,避免重复翻译与重复菜单命令
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  https://github.com/${REPO_OWNER}/${REPO_NAME}
// @supportURL   https://github.com/${REPO_OWNER}/${REPO_NAME}/issues
// @downloadURL  ${RAW_URL}
// @updateURL    ${RAW_URL}
// ==/UserScript==

/**
 * 来源与取舍说明:
 *
 * 1. 词库 —— 取自 izhadu/GreasyFork 的 HuggingFace-Chinese/dict.json (GPL-3.0)
 *    https://github.com/izhadu/GreasyFork/tree/main/HuggingFace-Chinese
 *    选择理由:两个主要同类项目中词库最新最全(1800+ 静态词条 + 130+ 正则规则,
 *    持续维护),且 GPL-3.0 允许衍生。当前内联词库版本:v${UPSTREAM_DICT_VERSION}
 *
 * 2. 翻译引擎 —— 本文件原创实现,设计思路参考:
 *    - izhadu/GreasyFork (GPL-3.0):TreeWalker + 空闲调度 + 正则预剪枝的性能路线
 *    - 1cyberlangke1/huggingface-zh (MIT):静态词/正则/选择器三类规则的词库组织
 *      与 unsafe 区(代码块、编辑器、模型卡正文)豁免思路
 *
 * 3. 本仓库通过 GitHub Actions 定时检测上游词库更新并自动重组,
 *    上游快照已完整保存在 sources/ 目录,上游项目消失也不影响使用与维护。
 *
 * 本作品按 GPL-3.0 许可证发布;上游词库内容版权归原作者所有。
 */

`;

    const dict = JSON.parse(read('sources/hf-dict.json'));
    const dictError = validateDict(dict);
    if (dictError) throw new Error(`词库文件不合法: ${dictError}`);

    // 合并自有补充词库(sources/hf-supplement.json):
    //   翻译键直接覆盖上游同键词条;正则规则追加到上游规则之后。
    //   补充词库与上游快照分离,check-upstream 只覆盖 hf-dict.json,不会被同步冲掉
    const supplement = JSON.parse(read('sources/hf-supplement.json'));
    const supplementError = validateDict(supplement);
    if (supplementError) throw new Error(`补充词库不合法: ${supplementError}`);
    for (const [en, zh] of Object.entries(supplement.translations)) {
        dict.translations[en] = zh;
    }
    dict.regexRules.push(...supplement.regexRules);

    const core = inlineCore(read('i18n-core.mjs'));
    const engine = read('engine.js').trimEnd();

    const output = HEADER +
        `(function () {\n'use strict';\n\n` +
        `/* ==== 翻译核心(原创,与 tests/ 共用同一实现)==== */\n` + core + '\n\n' +
        `/* ==== 词库(内联自 izhadu/GreasyFork dict.json v${UPSTREAM_DICT_VERSION})==== */\n` +
        `const __HF_DICT = ${JSON.stringify(dict)};\n` +
        `const __HF_DICT_VERSION = ${JSON.stringify(dict.version)};\n` +
        `const __VERSION = ${JSON.stringify(VERSION)};\n\n` +
        `/* ==== 翻译引擎(原创)==== */\n` + engine + '\n' +
        `})();\n`;

    const outPath = join(root, 'huggingface-chinese-plus.user.js');
    writeFileSync(outPath, output, 'utf8');
    console.log(`已生成: ${outPath} (${output.length} 字节,版本 ${VERSION},上游词库 v${UPSTREAM_DICT_VERSION})`);
}

/**
 * 仅在直接执行本脚本时运行 main(node build.mjs)。
 * 被测试文件 import 时绝不触发真实构建——与 scripts/check-upstream.mjs 的守卫模式一致。
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}

export { validateBuildNumber };
