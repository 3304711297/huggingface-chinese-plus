# Hugging Face 中文化增强版

[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![CI](https://github.com/3304711297/huggingface-chinese-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/3304711297/huggingface-chinese-plus/actions/workflows/ci.yml)

中文化 [Hugging Face](https://huggingface.co/) 全站界面的油猴用户脚本:导航、筛选器、按钮、模型/数据集页、动态时间("3 days ago")等一网打尽。同时兼容国内镜像 [hf-mirror.com](https://hf-mirror.com/)。

## 真机截图

| HF Home | 模型页 | 数据集页 |
|---|---|---|
| ![HF Home](screenshots/home.png) | ![模型页](screenshots/model-page.png) | ![数据集页](screenshots/dataset-page.png) |

以上截图为真机实测（Edge Dev 注入 `huggingface-chinese-plus.user.js` v1.3.1，官方站）：导航、筛选器、按钮与右侧元数据栏全部中文化，模型卡正文/代码块安全区保持原文不翻译。

## 安装

1. 浏览器安装用户脚本管理器([ScriptCat 脚本猫](https://scriptcat.org/) / Tampermonkey / Violentmonkey 均可)
2. 点击安装,直连 / 镜像双入口任选其一:

   - 直连:[huggingface-chinese-plus.user.js](https://raw.githubusercontent.com/3304711297/huggingface-chinese-plus/main/huggingface-chinese-plus.user.js)
   - 镜像(国内建议用镜像):[huggingface-chinese-plus.user.js](https://cdn.jsdelivr.net/gh/3304711297/huggingface-chinese-plus@main/huggingface-chinese-plus.user.js)

> - 分支文件在 jsDelivr 有约 12 小时 CDN 缓存,新版本可能延迟生效;急着更新可走直连
> - 使用脚本猫的用户同样支持上述直连/镜像两种安装方式,更新检测逻辑一致
> - 脚本管理器会通过 `@updateURL`(指向 raw 直连地址)自动检查更新

更新检测说明:`@version` 递增是脚本管理器判断"是否为更新版本"的核心版本依据,实际更新检测还涉及 `@updateURL`、安装源与管理器策略。

## 特性

- **1800+ 静态词条 + 130+ 正则规则**:静态词直接查表,动态文本("Updated 3 hours ago"、"1.2k downloads")走正则替换
- **性能优先**:TreeWalker 遍历 + MutationObserver 增量收集 + `requestIdleCallback` 空闲批处理,滚动与点击永远优先
- **安全区豁免**:代码块、Monaco/CodeMirror 编辑器、模型卡正文、Markdown 文档绝不翻译,不污染你要复制的内容
- **属性翻译**:placeholder、title、aria-label 一并处理,按钮悬停提示也是中文
- **正则翻译开关**:脚本管理器菜单一键开关动态文本翻译
- **开发者模式**:菜单一键开关"收集未命中词条",词条唯一化、上限 500 条;菜单一键导出固定格式 JSON(`{"domain": ..., "generatedAt": ..., "items": [...]}`,`domain` 动态取当前页面 hostname,官方站为 `huggingface.co`、镜像站为 `hf-mirror.com`),复制到剪贴板/控制台后可直接贴 Issue,用于给补充词库攒词
- **上游词库自动跟进**:GitHub Actions 每 6 小时检测词库上游更新,有更新自动重组并发新版本;raw 不可达时自动走 jsDelivr CDN 兜底;上游快照完整保存在本仓库,上游消失不影响使用

## 站点匹配范围

匹配 `huggingface.co`(含子域)与 `hf-mirror.com`。**有意不匹配 `hf.space` / `*.hf.space`**:这些域名是用户自建的 Gradio/Streamlit Space 应用界面,不是 Hugging Face 官方 UI——词库翻译会污染应用本身的交互文本,且这些应用的内容不属于"HF 站点汉化"的范畴。

## 镜像站词条说明

镜像站([hf-mirror.com](https://hf-mirror.com/))的词条**以官方站为准**:两个站点的界面文本一致,漏翻时请优先在官方站核对原文,并在 Issue 中**标注来源域名**(官方站报告的词条直接对镜像站同样生效;若只在镜像站出现漏翻,也请明确标注,便于甄别是站点差异还是词库缺口)。

## 版本号语义

格式 `<功能版本>.<同步构建号>`,如 `1.2.5`:

- **前两段(功能版本)**:引擎功能、修复、兼容性调整,人工递增——发布说明里能对应到具体功能变更
- **末段(同步构建号)**:上游词库每次实际同步 +1,纯词库更新。看到只有末段变化,即"只是词库跟进,引擎没动"

脚本管理器只关心版本号单调递增,两段分离是为了让用户从版本号直接判断更新内容的大小。

## 词库来源与致谢

- 词库取自 [izhadu/GreasyFork · HuggingFace-Chinese](https://github.com/izhadu/GreasyFork/tree/main/HuggingFace-Chinese)(GPL-3.0),快照保存在 `sources/hf-dict.json`
- 引擎为原创实现,设计思路参考 [izhadu/GreasyFork](https://github.com/izhadu/GreasyFork) 与 [1cyberlangke1/huggingface-zh](https://github.com/1cyberlangke1/huggingface-zh)(MIT)

本项目按 **GPL-3.0** 发布;上游词库内容版权归原作者所有。

## 开发

```bash
node build.mjs        # 组装生成 huggingface-chinese-plus.user.js(勿手改)
node --check huggingface-chinese-plus.user.js
node --test tests/i18n-core.test.mjs tests/check-upstream.test.mjs
node scripts/check-upstream.mjs   # 手动检查上游词库更新(退出码 10=有更新)
```

目录结构:

```
sources/hf-dict.json        上游词库快照(vendored,自动同步)
i18n-core.mjs               纯函数翻译核心(引擎与单测共用)
engine.js                   翻译引擎(原创,无词库)
build.mjs                   组装:头部 + 核心 + 词库 + 引擎 → 单文件产物
scripts/check-upstream.mjs  上游词库检查与同步
upstream.config.json        上游仓库与镜像配置
upstream.state.json         同步状态(哈希/词库版本/buildNumber)
```

版本号规则:`<功能版本>.<构建号>`,构建号随上游词库每次实际更新自动 +1,保证脚本管理器能识别自动更新。
