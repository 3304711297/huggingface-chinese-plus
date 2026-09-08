# Hugging Face 中文化增强版 🤗

<p align="center">
  <strong>现代化 Hugging Face 全站中文化油猴脚本：全站界面汉化 + 动态时间/正则解析 + 官方站与镜像站无缝支持 + 词库自动同步</strong>
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/3304711297/huggingface-chinese-plus/main/huggingface-chinese-plus.user.js"><img src="https://img.shields.io/badge/Install-Userscript-brightgreen?style=flat-square&logo=tampermonkey" alt="Install"></a>
  <a href="https://github.com/3304711297/huggingface-chinese-plus/releases"><img src="https://img.shields.io/badge/Release-Stable%20Track-blue?style=flat-square&logo=github" alt="Release Track"></a>
  <a href="https://github.com/3304711297/huggingface-chinese-plus/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/3304711297/huggingface-chinese-plus/ci.yml?branch=main&label=CI%20Build&style=flat-square" alt="CI Status"></a>
  <a href="https://github.com/3304711297/huggingface-chinese-plus/actions/workflows/upstream-sync.yml"><img src="https://img.shields.io/github/actions/workflow/status/3304711297/huggingface-chinese-plus/upstream-sync.yml?branch=main&label=Sync%20Upstream%20(6h)&style=flat-square" alt="Sync Upstream"></a>
  <img src="https://img.shields.io/badge/Supports-huggingface.co%20%7C%20hf--mirror.com-yellow?style=flat-square&logo=huggingface" alt="Targets">
  <a href="https://www.gnu.org/licenses/gpl-3.0"><img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square" alt="License"></a>
</p>

> **English Summary**: A modern, high-performance userscript for complete Chinese localization of Hugging Face (`huggingface.co` & `hf-mirror.com`). Features dynamic text translation, zero interference with code blocks/model cards, and automated upstream dictionary synchronization every 6 hours.

---

## 📸 实机效果预览

| 首页导航 (HF Home) | 模型详情页 (Models) | 数据集详情页 (Datasets) |
| :---: | :---: | :---: |
| ![HF Home](screenshots/home.png) | ![模型页](screenshots/model-page.png) | ![数据集页](screenshots/dataset-page.png) |

> 经真实环境验证：全站导航栏、筛选器、状态标签、按钮与元数据面板 100% 汉化；**代码块、终端指令、Monaco 编辑器与 Model Card 正文严格处于安全区，绝不误伤**。

---

## 🚀 一键安装

1. 浏览器需已安装用户脚本管理器（[ScriptCat 脚本猫](https://scriptcat.org/) / Tampermonkey / Violentmonkey 均可）；
2. 根据稳定性需求选择对应通道安装：

### 📦 安装通道矩阵

| 通道类型 | 安装通道 | 链接 | 说明 |
| :--- | :--- | :--- | :--- |
| ⚡ **滚动通道 (Rolling)** | GitHub 直连 | [一键安装 (main 滚动分支)](https://raw.githubusercontent.com/3304711297/huggingface-chinese-plus/main/huggingface-chinese-plus.user.js) | **默认推荐**。跟随 main 分支，上游词库同步与代码更新即刻生效 |
| ⚡ **滚动通道 (Rolling)** | jsDelivr CDN 镜像 | [一键安装 (jsDelivr 加速镜像)](https://cdn.jsdelivr.net/gh/3304711297/huggingface-chinese-plus@main/huggingface-chinese-plus.user.js) | 国内加速镜像（约有 12 小时 CDN 缓存延迟） |
| 🛡️ **稳定通道 (Stable)** | GitHub Releases 永久直链 | [一键安装 (最新稳定 Release 资产)](https://github.com/3304711297/huggingface-chinese-plus/releases/latest/download/huggingface-chinese-plus.user.js) | 指向 GitHub Releases 永久最新资产直链，充分验证，稳定性优先 |
| 🛡️ **稳定通道 (Stable)** | GitHub Releases 归档 | [浏览 Releases 版本归档页面](https://github.com/3304711297/huggingface-chinese-plus/releases) | 查看各版本发布说明与历史稳定版本归档 |

> **通道选择指南**：
> - **滚动通道 (Rolling Track)**：默认跟随 `main` 分支。定时任务每 6 小时自动同步上游词库，有更新则即刻打包发布至 `main`。适合希望第一时间获得最新词库覆盖与体验新特性的用户。
> - **稳定通道 (Stable Track)**：基于 GitHub Releases 正式发布。不会随日常定时词库同步或试验性改动频繁变更，仅在关键里程碑经过多环境严格验证后发布，适合追求极致稳定、不希望脚本频繁静默变动的生产/研发环境。

---

## ✨ 核心特性

- **1800+ 静态词条 + 130+ 动态正则**：静态词典秒级查表匹配，动态时效文本（如 `Updated 3 hours ago`、`1.2k downloads`）走高性能正则清洗替换。
- **极致性能与流畅度**：`TreeWalker` 高效 DOM 遍历 + `MutationObserver` 增量收集 + `requestIdleCallback` 空闲批处理调度，保证页面滚动与点击 0 掉帧。
- **严格的代码安全区保护**：代码高亮区、复制块、Monaco / CodeMirror 编辑器、Markdown 结构体绝不翻译，保证代码原样复制。
- **全属性中文化**：深度覆盖 `placeholder`、`title`、`aria-label` 等 HTML 属性，鼠标悬停与无障碍提示全汉化。
- **开发者攒词模式**：菜单支持一键开启「收集未命中词条」，自动去重并格式化导出 JSON，方便提交 Issue 持续补充词库。
- **上游词库自动跟进**：GitHub Actions 每 6 小时检测上游词库更新，多源 CDN 容灾自动发版，上游失效亦不影响正常使用。

---

## 🌐 站点与域名匹配范围

- **完整支持**：`huggingface.co`（含子域名）以及国内镜像站 `hf-mirror.com`。
- **排除 `*.hf.space`**：第三方用户自主托管的 Gradio / Streamlit Space 属于独立 Web 应用，故意予以排除以防止破坏用户应用的自定义文本。

---

## 🛠️ 本地开发与测试

```bash
# 1. 运行全量单测套件 (核心引擎 + 130+ 正则规则 + 上游同步状态 + 构建防倒退校验)
node --test tests/i18n-core.test.mjs tests/regex-rules.test.mjs tests/check-upstream.test.mjs tests/build.test.mjs

# 2. 手动执行上游词库同步检测
node scripts/check-upstream.mjs

# 3. 构建并输出单文件产物
node build.mjs
node --check huggingface-chinese-plus.user.js
```

### 🏷️ 版本号与发布规范

脚本版本号与发布体系采用 **双轨并行** 机制：

#### 1. 产物版本号语义：`ourBase.buildNumber`
单文件脚本元数据中的 `@version` 格式严格遵循 `<ourBase>.<buildNumber>`（例如 `1.3.3`）：
- **`ourBase`（自主功能版本号，如 `1.3`）**：
  - 记录于 `build.mjs` 中的 `OUR_BASE` 常量，是维护者人工维护的唯一权威版本基线；
  - 仅在核心引擎重构、算法优化、新特性（如开发者攒词模式）或兼容性修复等人工改动时手动递增。
- **`buildNumber`（上游同步构建号，如 `3`）**：
  - 记录于 `upstream.state.json` 中的 `buildNumber` 字段；
  - 由 GitHub Actions 定时工作流（每 6 小时）执行 `scripts/check-upstream.mjs` 自动维护。仅在上游词库发生**实质性内容更新**时自动递增（`+1`）并触发构建与推送；
  - 该机制确保油猴脚本管理器能够精确识别词库更新并自动拉取，杜绝无实质变更的空构建污染版本历史。

#### 2. 双发布通道与稳定基线对齐
- **滚动通道 (Rolling Track)**：
  - 默认以 `main` 分支为主干，自动集成日常代码提交与每 6 小时词库同步产物，版本号跟随 `buildNumber` 动态递增。
- **稳定通道 (Stable Track)**：
  - 严格采用 Git Tag（语义化标签）与 GitHub Releases 正式发布；
  - **首个正式稳定版本基线从 `v1.3.3` 起步（明确对齐当前产物真实版本基线）**；
  - 正式发布后，稳定通道资产（`huggingface-chinese-plus.user.js`）永久固化于 Releases 归档，并通过 `releases/latest/download` 直链对外提供高可用安装。

---

## 📄 致谢与开源协议

- 词库源自 [izhadu/GreasyFork · HuggingFace-Chinese](https://github.com/izhadu/GreasyFork/tree/main/HuggingFace-Chinese)（GPL-3.0）；
- 翻译引擎为原创独立实现，参考了 [1cyberlangke1/huggingface-zh](https://github.com/1cyberlangke1/huggingface-zh)（MIT）。

本项目依据 **GNU General Public License v3.0 (GPL-3.0)** 开源。
