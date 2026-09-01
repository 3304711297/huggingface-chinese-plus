/**
 * i18n-core.mjs 纯函数单元测试(node:test 内置运行器,零依赖)
 *
 * 运行:node --test tests/i18n-core.test.mjs
 *
 * build.mjs 把本模块内联进 userscript(去掉 export),测试通过 import 保证
 * 浏览器端跑的翻译逻辑与这里的断言完全同源。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_TEXT_LENGTH,
    normalizeKey,
    buildIndex,
    compileRules,
    lookupStatic,
    lookupRegex,
    translateText,
    validateDict,
    DEV_EXPORT_LIMIT,
    createUnmatchedCollector,
    buildDevExport,
} from '../i18n-core.mjs';

describe('normalizeKey', () => {
    test('折叠空白并去首尾空格', () => {
        assert.strictEqual(normalizeKey('  Models  '), 'Models');
        assert.strictEqual(normalizeKey('Text\n Generation'), 'Text Generation');
        assert.strictEqual(normalizeKey('a\t\tb'), 'a b');
    });
});

describe('buildIndex', () => {
    test('@ 开头的注释键不入索引', () => {
        const idx = buildIndex({
            '@comment_nav': '===== 分节注释 =====',
            Models: '模型',
        });
        assert.strictEqual(idx.size, 1);
        assert.strictEqual(idx.get('Models'), '模型');
    });

    test('空键/空值/非字符串值被跳过', () => {
        const idx = buildIndex({
            '': '空键',
            X: '',
            Y: 42,
            Z: '中文',
        });
        assert.strictEqual(idx.size, 1);
        assert.strictEqual(idx.get('Z'), '中文');
    });
});

describe('lookupStatic', () => {
    const idx = buildIndex({ Models: '模型', 'Sort by': '排序方式' });

    test('命中静态词', () => {
        assert.strictEqual(lookupStatic(idx, 'Models'), '模型');
        assert.strictEqual(lookupStatic(idx, '  Models  '), '模型');
    });

    test('无字母文本(纯数字/符号)直接不查', () => {
        assert.strictEqual(lookupStatic(idx, '123'), null);
        assert.strictEqual(lookupStatic(idx, '···'), null);
    });

    test('未命中返回 null', () => {
        assert.strictEqual(lookupStatic(idx, 'NoSuchKey'), null);
    });
});

describe('compileRules', () => {
    test('正常编译并保留替换文本', () => {
        const rules = compileRules([
            ['^Updated just now$', '刚刚更新'],
        ]);
        assert.strictEqual(rules.length, 1);
        assert.strictEqual('Updated just now'.replace(rules[0].re, rules[0].to), '刚刚更新');
    });

    test('单条非法正则只丢弃该条,不影响其他规则', () => {
        const rules = compileRules([
            ['([unclosed', '坏规则'],
            ['^Updated about (\\d+) hours? ago$', '更新于约 $1 小时前'],
            ['not-an-array'],
            [42, '非字符串模式'],
        ]);
        assert.strictEqual(rules.length, 1);
    });
});

describe('lookupRegex', () => {
    const rules = compileRules([
        ['^Updated about (\\d+) hours? ago$', '更新于约 $1 小时前'],
        ['^(\\d+(?:\\.\\d+)?[kM]?) downloads$', '$1 次下载'],
    ]);

    test('捕获组替换', () => {
        assert.strictEqual(lookupRegex(rules, 'Updated about 3 hours ago'), '更新于约 3 小时前');
        assert.strictEqual(lookupRegex(rules, '1.2k downloads'), '1.2k 次下载');
    });

    test('替换结果与原文相同时返回 null(避免无意义 DOM 写入)', () => {
        const same = compileRules([['^foo$', 'foo']]);
        assert.strictEqual(lookupRegex(same, 'foo'), null);
    });

    test('超长文本不参与正则(性能防御)', () => {
        const long = 'a'.repeat(MAX_TEXT_LENGTH + 1);
        assert.strictEqual(lookupRegex(rules, long), null);
    });
});

describe('translateText(完整入口:静态优先,正则兜底)', () => {
    const index = buildIndex({ Models: '模型' });
    const rules = compileRules([['^(\\d+) hours ago$', '$1 小时前']]);

    test('静态词命中时不走正则', () => {
        assert.strictEqual(translateText(index, rules, 'Models', true), '模型');
    });

    test('静态未命中且开关开启时走正则', () => {
        assert.strictEqual(translateText(index, rules, '3 hours ago', true), '3 小时前');
    });

    test('正则开关关闭时未命中直接返回 null', () => {
        assert.strictEqual(translateText(index, rules, '3 hours ago', false), null);
    });
});

describe('validateDict(词库整体合法性——防上游格式变更悄悄产出空词库)', () => {
    test('合法词库返回 null', () => {
        assert.strictEqual(
            validateDict({ version: '1', translations: { A: 'a' }, regexRules: [] }),
            null
        );
    });

    test('各类缺失被识别', () => {
        assert.match(validateDict(null), /顶层/);
        assert.match(validateDict({ translations: {}, regexRules: [] }), /version/);
        assert.match(validateDict({ version: '1', regexRules: [] }), /translations/);
        assert.match(validateDict({ version: '1', translations: {} }), /regexRules/);
        assert.match(
            validateDict({ version: '1', translations: { '@c': 'x' }, regexRules: [] }),
            /有效词条为 0/
        );
    });
});

describe('开发者模式纯函数(去重/上限/固定导出格式)', () => {
    test('收集器去重、计数与清空', () => {
        const c = createUnmatchedCollector();
        assert.strictEqual(c.add('  Deploy   this model '), true); // 键规范化后收录
        assert.strictEqual(c.add('Deploy this model'), false); // 同键(规范化后)不重复收录
        assert.strictEqual(c.size(), 1);
        c.clear();
        assert.strictEqual(c.size(), 0);
    });

    test('收集器到达上限后不再收录', () => {
        const c = createUnmatchedCollector(3);
        for (const k of ['a', 'b', 'c', 'd']) c.add(k);
        assert.strictEqual(c.size(), 3);
        assert.deepStrictEqual(c.items(), ['a', 'b', 'c']);
    });

    test('导出 JSON 固定格式:domain / generatedAt / items,键序固定', () => {
        const json = buildDevExport(
            ['Deploy', 'Deploy', ' Upload dataset '],
            'huggingface.co',
            new Date('2026-09-01T00:00:00.000Z')
        );
        const parsed = JSON.parse(json);
        assert.deepStrictEqual(Object.keys(parsed), ['domain', 'generatedAt', 'items']);
        assert.strictEqual(parsed.domain, 'huggingface.co');
        assert.strictEqual(parsed.generatedAt, '2026-09-01T00:00:00.000Z');
        assert.deepStrictEqual(parsed.items, ['Deploy', 'Upload dataset']); // 去重 + 规范化
        // 整体是可直接贴 Issue 的单行 JSON
        assert.ok(!json.includes('\n'));
    });

    test('导出条数截断到上限,镜像站 domain 透传', () => {
        const many = Array.from({ length: DEV_EXPORT_LIMIT + 10 }, (_, i) => 'w' + i);
        const parsed = JSON.parse(buildDevExport(many, 'hf-mirror.com', new Date()));
        assert.strictEqual(parsed.items.length, DEV_EXPORT_LIMIT);
        assert.strictEqual(parsed.domain, 'hf-mirror.com');
    });

    test('空收集/非字符串输入防御', () => {
        const parsed = JSON.parse(buildDevExport([], 'huggingface.co', new Date()));
        assert.deepStrictEqual(parsed.items, []);
        assert.strictEqual(createUnmatchedCollector().add(null), false);
        assert.strictEqual(createUnmatchedCollector().add('   '), false);
    });
});
