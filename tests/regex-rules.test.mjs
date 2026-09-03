/**
 * 正则规则回归测试(规则身份绑定 + 全规则数组稳定指纹)
 *
 * 两层保护:
 *   1. 规则身份绑定:每条规则按其在合并规则数组中的序号 #N 绑定
 *      至少 1 个正例 + 1 个反例;动态文本类关键规则追加真实样本。
 *      任何一条规则被删改,对应用例立即变红。
 *   2. 指纹兜底:对整个规则数组(上游 hf-dict.json + 补充 hf-supplement.json
 *      按 build.mjs 同序合并)做稳定哈希——规则数量 + 每条 pattern/replacement
 *      的规范化指纹。基线哈希存在本文件,任何新增/删除/修改都会使哈希失配而变红;
 *      变红时须人工确认变更意图后更新基线。
 *
 * 运行:node --test tests/regex-rules.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileRules, lookupRegex } from '../i18n-core.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const dict = JSON.parse(readFileSync(join(root, '../sources/hf-dict.json'), 'utf8'));
const supplement = JSON.parse(readFileSync(join(root, '../sources/hf-supplement.json'), 'utf8'));

// 与 build.mjs 的合并顺序一致:上游规则在前,补充规则追加在后
const rules = [...dict.regexRules, ...supplement.regexRules];

/* ---- 全规则数组稳定指纹 ---- */
const normalize = (s) => String(s).replace(/\s+/g, ' ').trim();
const fingerprint = (ruleList) =>
    createHash('sha256')
        .update(
            `count=${ruleList.length}\n` +
                ruleList.map((r) => `${normalize(r[0])} => ${normalize(r[1])}`).join('\n')
        )
        .digest('hex');

// 基线指纹:确认变更意图后,用 node -e 重算并更新此常量(重算命令见 README「开发」)
const BASELINE_HASH = '1a1b0e9a785fb3fe022c95b33790b6f694e3b7a9bb09b3de6c8702c73212709c';

describe('正则规则数组稳定指纹(兜底层)', () => {
    test('规则数量与内容与基线一致', () => {
        assert.strictEqual(
            fingerprint(rules),
            BASELINE_HASH,
            '正则规则数组发生变化(新增/删除/修改)。确认变更意图后,重算指纹并更新 BASELINE_HASH'
        );
    });
});

/* ---- 规则身份绑定样本(#N → 正例/反例) ---- */
// 正例:该规则应命中并产出中文译文;反例:该规则不得命中。
// 反例同时是相邻易混规则的"错位输入"(如单复数、有无锚定词),用于防规则间串扰回归。
const SAMPLES = {
    0: { pos: "Updated just now", neg: "Updated 1 minute ago" },
    1: { pos: "Updated about 3 hours ago", neg: "Updated 3 hours ago", extra: ["Updated about 1 hour ago","Updated about 12 hours ago"] },
    2: { pos: "Updated about 5 minutes ago", neg: "Updated 5 minutes ago", extra: ["Updated about 1 minute ago"] },
    3: { pos: "Updated 2 years ago", neg: "Updated last year" },
    4: { pos: "Updated 5 months ago", neg: "Updated months ago" },
    5: { pos: "Updated 3 weeks ago", neg: "Updated weeks ago" },
    6: { pos: "Updated 4 days ago", neg: "Updated days ago", extra: ["Updated 1 day ago"] },
    7: { pos: "Updated 2 hours ago", neg: "2 hours ago", extra: ["Updated 1 hour ago"] },
    8: { pos: "Updated 30 minutes ago", neg: "minutes ago", extra: ["Updated 1 minute ago"] },
    9: { pos: "Updated 45 seconds ago", neg: "45 seconds ago" },
    10: { pos: "about 2 years ago", neg: "years ago" },
    11: { pos: "about 6 months ago", neg: "months ago" },
    12: { pos: "about 10 days ago", neg: "days ago" },
    13: { pos: "about 1 hour ago", neg: "hour ago" },
    14: { pos: "about 5 minutes ago", neg: "minutes ago" },
    15: { pos: "#12 opened about 3 hours ago by", neg: "closed about 3 hours ago by" },
    16: { pos: "#8 opened about 2 days ago by", neg: "#8 opened about 2 days ago" },
    17: { pos: "#3 opened about 4 months ago by", neg: "#3 opened about by" },
    18: { pos: "#7 opened about 3 years ago by", neg: "#7 opened years ago by" },
    19: { pos: "#9 opened over 6 years ago by", neg: "#9 opened 6 years ago by" },
    20: { pos: "#21 opened 3 hours ago by", neg: "#21 opened hours ago by" },
    21: { pos: "#14 opened 2 days ago by", neg: "#14 opened days ago by" },
    22: { pos: "#30 opened 8 months ago by", neg: "#30 opened months ago by" },
    23: { pos: "#55 opened 2 years ago by", neg: "#55 opened years ago by" },
    24: { pos: "5 years ago", neg: "years ago" },
    25: { pos: "7 months ago", neg: "months ago" },
    26: { pos: "3 days ago", neg: "days ago" },
    27: { pos: "10 hours ago", neg: "hours ago" },
    28: { pos: "15 minutes ago", neg: "minutes ago" },
    29: { pos: "30 seconds ago", neg: "seconds ago" },
    30: { pos: "Just now", neg: "Right now" },
    31: { pos: "last 7 days", neg: "last week" },
    32: { pos: "last 5 years", neg: "past 5 years" },
    33: { pos: "last 12 months", neg: "past 12 months" },
    34: { pos: "last 2 weeks", neg: "past 2 weeks" },
    35: { pos: "last 30 days", neg: "past 30 days" },
    36: { pos: "last 24 hours", neg: "past 24 hours" },
    37: { pos: "last 60 minutes", neg: "past 60 minutes" },
    38: { pos: "last 90 seconds", neg: "past 90 seconds" },
    39: { pos: "1,234,567 downloads", neg: "1,234,567 likes", extra: ["45 downloads"] },
    40: { pos: "256 likes", neg: "256 followers" },
    41: { pos: "View closed (128)", neg: "View closed" },
    42: { pos: "312 spaces", neg: "312 models" },
    43: { pos: "87 contributors", neg: "87 downloads", extra: ["1,048 contributors"] },
    44: { pos: "Cite arxiv.org/abs/2401.01234 in a Space README.md to link it from this page.", neg: "Cite arxiv.org/abs/ in a Space README.md to link it from this page." },
    45: { pos: "Access to model meta-llama/Llama-3 is restricted and you are not in the authorized list. Visit", neg: "Access to model meta-llama/Llama-3 is restricted. Visit" },
    46: { pos: "updated", neg: "Updated" },
    47: { pos: "about", neg: "About" },
    48: { pos: "1,204 models", neg: "1,204 datasets" },
    49: { pos: "87,405 datasets", neg: "87,405 models" },
    50: { pos: "2,893 commits", neg: "2,893 downloads" },
    51: { pos: "14 collections", neg: "14 items" },
    52: { pos: "5 repositories", neg: "5 repos" },
    53: { pos: "12 applications", neg: "12 apps" },
    54: { pos: "512 items", neg: "512 spaces" },
    55: { pos: "36 templates", neg: "36 spaces" },
    56: { pos: "128 following", neg: "128 followers" },
    57: { pos: "1043 followers", neg: "1043 following" },
    58: { pos: "updated 3 models", neg: "updated models" },
    59: { pos: "updated 5 collections", neg: "updated collections" },
    60: { pos: "Inbox (12)", neg: "Inbox 12" },
    61: { pos: "Unread (3)", neg: "Unread 3" },
    62: { pos: "Remove selected (4)", neg: "Remove selected 4" },
    63: { pos: "Split (2)", neg: "Split 2" },
    64: { pos: "Subset (9)", neg: "Subset 9" },
    65: { pos: "+ 6 more", neg: "+ more" },
    66: { pos: "View +3 variants", neg: "View +3", extra: ["View +1 variant"] },
    67: { pos: "+ 2 Spaces", neg: "2 Spaces" },
    68: { pos: "Browse 12 collections that include this paper", neg: "Browse 12 collections" },
    69: { pos: "Published on Jan 5", neg: "Published on January 5" },
    70: { pos: "Published on Feb 12", neg: "Published on Feb" },
    71: { pos: "Published on Mar 1", neg: "Published on March 1" },
    72: { pos: "Published on Apr 20", neg: "Published on April 20" },
    73: { pos: "Published on May 8", neg: "Published on May" },
    74: { pos: "Published on Jun 30", neg: "Published on June 30" },
    75: { pos: "Published on Jul 4", neg: "Published on July 4" },
    76: { pos: "Published on Aug 15", neg: "Published on August 15" },
    77: { pos: "Published on Sep 9", neg: "Published on September 9" },
    78: { pos: "Published on Oct 31", neg: "Published on October 31" },
    79: { pos: "Published on Nov 2", neg: "Published on November 2" },
    80: { pos: "Published on Dec 25", neg: "Published on December 25" },
    81: { pos: "Jan 5", neg: "January 5" },
    82: { pos: "Feb 12", neg: "February 12" },
    83: { pos: "Mar 1", neg: "March 1" },
    84: { pos: "Apr 20", neg: "April 20" },
    85: { pos: "May 8", neg: "May" },
    86: { pos: "Jun 30", neg: "June 30" },
    87: { pos: "Jul 4", neg: "July 4" },
    88: { pos: "Aug 15", neg: "August 15" },
    89: { pos: "Sep 9", neg: "September 9" },
    90: { pos: "Oct 31", neg: "October 31" },
    91: { pos: "Nov 2", neg: "November 2" },
    92: { pos: "Dec 25", neg: "December 25" },
    93: { pos: "5 Jan 2024", neg: "January 2024" },
    94: { pos: "12 Feb 2024", neg: "February 2024" },
    95: { pos: "1 Mar 2025", neg: "March 2025" },
    96: { pos: "20 Apr 2025", neg: "April 2025" },
    97: { pos: "8 May 2025", neg: "May 2025" },
    98: { pos: "30 Jun 2025", neg: "June 2025" },
    99: { pos: "4 Jul 2026", neg: "July 2026" },
    100: { pos: "15 Aug 2026", neg: "August 2026" },
    101: { pos: "9 Sep 2026", neg: "September 2026" },
    102: { pos: "31 Oct 2026", neg: "October 2026" },
    103: { pos: "2 Nov 2026", neg: "November 2026" },
    104: { pos: "25 Dec 2026", neg: "December 2026" },
    105: { pos: "January 2026", neg: "Jan 2026" },
    106: { pos: "February 2026", neg: "Feb 2026" },
    107: { pos: "March 2026", neg: "Mar 2026" },
    108: { pos: "April 2026", neg: "Apr 2026" },
    109: { pos: "May 2026", neg: "May" },
    110: { pos: "June 2026", neg: "Jun 2026" },
    111: { pos: "July 2026", neg: "Jul 2026" },
    112: { pos: "August 2026", neg: "Aug 2026" },
    113: { pos: "September 2026", neg: "Sep 2026" },
    114: { pos: "October 2026", neg: "Oct 2026" },
    115: { pos: "November 2026", neg: "Nov 2026" },
    116: { pos: "December 2026", neg: "Dec 2026" },
    117: { pos: "Used storage: 1.2 GB", neg: "Used storage" },
    118: { pos: "< 80% used", neg: "80 percent used", extra: ["80% used"] },
    119: { pos: "Models — 45%", neg: "Datasets — 45%" },
    120: { pos: "Datasets — 30%", neg: "Models — 30%" },
    121: { pos: "Models · 25.3 GB", neg: "Models 25.3 GB" },
    122: { pos: "Datasets · 8.1 GB", neg: "Datasets 8.1 GB" },
    123: { pos: "Spaces · 3.5 GB", neg: "Spaces 3.5 GB" },
    124: { pos: "Buckets · 102.4 GB", neg: "Buckets 102.4 GB" },
    125: { pos: "12 repos · 1.5 GB", neg: "repos · 1.5 GB" },
    126: { pos: "of 2.5 TB", neg: "of TB" },
    127: { pos: "7B params", neg: "params", extra: ["1.5B params"] },
    128: { pos: "You have consumed $0.42 out of your $10.00 included credits.", neg: "You have consumed $0.42 of your credits." },
    129: { pos: "You have a total of 1.5 TFLOPS of computing power.", neg: "You have a total of 1.5 TFLOPS." },
    130: { pos: "The task_categories \"text-classification\" is not in the official list: foo,bar", neg: "The task_categories is not in the official list" },
    131: { pos: "Run 12 Models Instantly", neg: "Run 12 Models" },
    132: { pos: "+3 others", neg: "3 others" },
};

describe('规则身份绑定(每条规则 ≥1 正例 + ≥1 反例)', () => {
    test('样本覆盖全部规则(删除任意一条规则必有测试变红)', () => {
        assert.strictEqual(SAMPLES[rules.length - 1] !== undefined, true, '规则数变化,样本索引需人工复核');
        for (let i = 0; i < rules.length; i++) {
            assert.ok(
                SAMPLES[i] && SAMPLES[i].pos && SAMPLES[i].neg,
                `规则 #${i} 缺少正例/反例样本`
            );
        }
    });

    for (const [idx, s] of Object.entries(SAMPLES)) {
        test(`rule #${idx}: 正例命中,反例不命中`, () => {
            const compiled = compileRules([rules[Number(idx)]]);
            assert.strictEqual(compiled.length, 1, `规则 #${idx} 无法编译`);
            const hit = lookupRegex(compiled, s.pos);
            assert.ok(hit !== null, `规则 #${idx} 未命中正例 "${s.pos}"`);
            // 产出与原文不同即视为命中生效(个别规则的替换文本为符号形式,如 "of 2.5 TB" → "/ 2.5 TB",
            // 不强制产出含中文;替换文本本身的变更由稳定指纹兜底)
            assert.notStrictEqual(hit, s.pos);
            assert.strictEqual(lookupRegex(compiled, s.neg), null, `规则 #${idx} 误命中反例 "${s.neg}"`);
            for (const p of s.extra ?? []) {
                const hit2 = lookupRegex(compiled, p);
                assert.ok(hit2 !== null, `规则 #${idx} 未命中追加样本 "${p}"`);
                assert.notStrictEqual(hit2, p);
            }
        });
    }
});
