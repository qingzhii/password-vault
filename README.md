# 密码保险库（Password Vault）

离线、本地加密的办公密码管理工具。**全程无任何网络请求**，数据不出本机。

本仓库包含两个版本：

| 版本 | 位置 | 适用场景 |
|---|---|---|
| **桌面版（推荐）** | [desktop/](desktop/) | Tauri 打包的 Windows 单文件 exe，约 4.1MB，含系统托盘、全局快捷键 |
| 网页版 | [办公密码保险库.html](办公密码保险库.html) | 零安装单文件 HTML，双击即用，适合受限环境 |

两版数据格式相同，加密方案一致（AES-256-GCM + PBKDF2-SHA256 六十万次迭代）。

## 功能一览

- 条目：名称、用户名、密码/密钥、网址、**分组**、标签、备注、收藏、**自定义字段**（可标记敏感）
- **密码历史**：修改密码自动保留旧值（最近 10 条）
- **回收站**：删除先进回收站，30 天后自动彻底清除，可随时恢复
- **批量管理**：多选 + 搜索/分组/标签筛选，批量移入回收站/恢复
- **条目模板**：服务器 SSH、银行卡、Wi-Fi、软件许可
- 密码生成器：混合字符集 / 十六进制 / Base64URL
- **浏览器密码互导**：导入/导出 Chrome、Edge 的密码 CSV，自动去重
- 安全：无操作自动锁定、窗口失焦立即锁定（可关）、剪贴板定时自动清空
- 桌面版专属：**系统托盘常驻**（托盘点击收藏条目直接复制密码）、全局快捷键 Ctrl+Alt+V、关闭最小化到托盘、数据文件原子写入

详细使用说明见 [desktop/README.md](desktop/README.md)。

## 安全模型

- 主密码经 PBKDF2（600,000 次迭代）派生密钥，整库 AES-256-GCM 加密；**主密码没有任何找回手段**
- 数据文件默认在 `文档\密码保险库.vault`，建议定期导出备份到异地
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
