# 办公保险库（OfficeVault）

离线、本地加密的办公资料管理工具。**全程无任何网络请求**，数据不出本机。密码与书签，一个保险库全装下。

本仓库包含两个版本：

| 版本 | 位置 | 适用场景 |
|---|---|---|
| **桌面版（推荐）** | [desktop/](desktop/) | Tauri 打包的 Windows 单文件 exe，约 4.4MB，含系统托盘、全局快捷键 |
| 网页版 | [办公密码保险库.html](办公密码保险库.html) | 零安装单文件 HTML，双击即用，适合受限环境 |

两版数据格式相同（vault v2：密码条目 + 书签树同一加密库），主密码一致。

## 功能一览

**密码区**
- 条目：名称、用户名、密码/密钥、网址、分组、标签、备注、收藏、自定义字段（可标记敏感）
- 密码历史（最近 10 条）、条目模板（服务器 SSH / 银行卡 / Wi-Fi / 软件许可）
- 密码生成器：混合字符集 / 十六进制 / Base64URL
- Chrome / Edge 密码 CSV 导入导出

**书签区**
- 文件夹树（多级）、标签、搜索；Netscape HTML 导入导出（Chrome/Edge/Firefox 通用）
- 打开链接、移动、收藏；支持从旧「书签管理器」的 .json 书签库一键迁移

**通用**
- 回收站（密码 30 天自动彻底清除，书签可随时恢复）、批量管理（多选 + 筛选 + 批量删除/移动/设置分组标签）
- 安全：无操作自动锁定、窗口失焦立即锁定（可关）、剪贴板定时自动清空
- 桌面版专属：**系统托盘常驻**（托盘点击收藏条目直接复制密码）、全局快捷键 Ctrl+Alt+V、关闭最小化到托盘、数据文件原子写入

详细使用说明见 [desktop/README.md](desktop/README.md)。

## 安全模型

- 主密码经 PBKDF2（600,000 次迭代）派生密钥，整库 AES-256-GCM 加密；**主密码没有任何找回手段**
- 数据文件默认在 `文档\密码保险库.vault`（历史文件名，沿用即可），建议定期导出备份到异地
- 网页版数据在浏览器 localStorage，强烈建议在设置中绑定本地 .vault 文件双写
- 仓库**永远不会**包含 .vault 数据文件（见 .gitignore），请勿手动提交

## 构建桌面版

环境要求：Node 18+、Rust stable-msvc、MSVC Build Tools、WebView2（Win10/11 自带）。

```bash
cd desktop
npm install
node node_modules/@tauri-apps/cli/tauri.js build --no-bundle
# 产物：desktop/src-tauri/target/release/office-vault.exe
```

推送到 main 分支后，GitHub Actions 会自动构建 exe 并上传为 Artifact（见 `.github/workflows/build-windows.yml`）。
