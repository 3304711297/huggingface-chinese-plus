# Hugging Face 中文化增强版

[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![CI](https://github.com/3304711297/huggingface-chinese-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/3304711297/huggingface-chinese-plus/actions/workflows/ci.yml)

中文化 [Hugging Face](https://huggingface.co/) 全站界面的油猴用户脚本:导航、筛选器、按钮、模型/数据集页、动态时间("3 days ago")等一网打尽。同时兼容国内镜像 [hf-mirror.com](https://hf-mirror.com/)。

## 安装

1. 浏览器安装用户脚本管理器([ScriptCat 脚本猫](https://scriptcat.org/) / Tampermonkey / Violentmonkey 均可)
2. 点击安装:[huggingface-chinese-plus.user.js](https://raw.githubusercontent.com/3304711297/huggingface-chinese-plus/main/huggingface-chinese-plus.user.js)

脚本管理器会通过 `@updateURL` 自动检查更新。

## 特性

- **1800+ 静态词条 + 130+ 正则规则**:静态词直接查表,动态文本("Updated 3 hours ago"、"1.2k downloads")走正则替换
- **性能优先**:TreeWalker 遍历 + MutationObserver 增量收集 + `requestIdleCallback` 空闲批处理,滚动与点击永远优先
- **安全区豁免**:代码块、Monaco/CodeMirror 编辑器、模型卡正文、Markdown 文档绝不翻译,不污染你要复制的内容
- **属性翻译**:placeholder、title、aria-label 一并处理,按钮悬停提示也是中文
- **正则翻译开关**:脚本管理器菜单一键开关动态文本翻译
- **上游词库自动跟进**:GitHub Actions 每 6 小时检测词库上游更新,有更新自动重组并发新版本;上游快照完整保存在本仓库,上游消失不影响使用

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
