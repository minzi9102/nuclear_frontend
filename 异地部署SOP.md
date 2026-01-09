🏥 治疗效果记录管理系统 (Hospital-CMS) 部署标准作业程序 (SOP)

文档版本：1.0

适用环境：Windows 局域网离线环境 (Windows Host + NAS)

最后更新：2026-01-07

## 1. 部署前准备 (Pre-deployment)

### A. 部署NAS MinIO

**镜像名**：docker.m.daocloud.io/minio/minio:RELEASE.2025-04-22T22-12-26Z
**端口映射 (Port Mapping)**：

    Host 9090 -> Container 9000 (API 通信端口)

    Host 9091 -> Container 9001 (Web 控制台端口)

**卷挂载 (Volume)**：

    宿主机路径：选择刚才创建的 cms 共享文件夹。

    容器路径：/data

**环境变量 (Environment Variables)**：

    MINIO_ROOT_USER: (设置您的管理员账号，如 admin)

    MINIO_ROOT_PASSWORD: (设置您的管理员密码，如 Hospital2025!)
### B. MinIO 内部初始化
**储存桶名**：hospital-cms-storage
**配置访问策略 (Access Policy)**

⚠️ 关键步骤：解决前端图片 403 Access Denied 问题。

    进入刚才创建的 Bucket。

    点击 Anonymous (或 Access Policy)。

    添加规则：

        Prefix: / (或 *)

        Access: readonly (只读) 或 public。

    保存。

**获取访问密钥 (Keys)**

    点击侧边栏 Identity -> Users。

    选择管理员用户（或新建用户）。

    点击 Service Accounts -> Create Service Account。

    复制生成的 Access Key 和 Secret Key，妥善保存。

### C. 后端 Strapi 配置修改

主要需要修改 环境变量文件 (.env) 和 安全策略配置 (config/middlewares.ts)

1. 修改 .env 文件 (核心连接信息)

这是最关键的一步。生产环境的 NAS IP 地址、端口或密钥通常与开发/实验室环境不同。您需要在生产服务器的 backend 目录下创建或修改 .env 文件。

    NAS_ENDPOINT: 必须修改为生产环境 NAS 的真实 IP 地址和 API 端口。

        注意：是 MinIO 的 API 端口（通常映射为 9090 或 9000），而不是控制台端口。

    NAS_ACCESS_KEY / NAS_SECRET_KEY: 如果生产环境的 MinIO 重新生成了密钥，请更新此处。

```
# Production .env
HOST=0.0.0.0
PORT=1337
# ... 其他配置 ...

# 👇 重点修改这里
NAS_ENDPOINT=http://192.168.10.100:9090  <-- 修改为医院内网真实的 NAS IP
NAS_BUCKET=hospital-cms-storage
NAS_ACCESS_KEY=Prod_Admin_Key            <-- 生产环境密钥
NAS_SECRET_KEY=Prod_Secret_Key           <-- 生产环境密钥
NAS_REGION=us-east-1
```
2. 修改 config/middlewares.ts (CSP 安全策略)

在 Phase 5 的开发记录中，为了防止浏览器拦截图片加载，我们在 Content Security Policy (CSP) 中添加了 NAS 的 IP 白名单。如果代码中是硬编码的 IP，生产环境必须修改。

    检查位置：config/middlewares.ts

    修改内容：将 img-src 和 media-src 数组中的 IP 地址替换为生产环境 NAS 的 IP。

3. 确认 config/plugins.ts (通常无需修改)

如果在开发阶段您已经按照标准配置编写了 config/plugins.ts，并使用了 baseUrl 强制拼接逻辑，那么这个文件通常不需要修改，因为它会自动读取 .env 中的 NAS_ENDPOINT。

### 1.1 硬件与系统要求

- **宿主主机**：Windows 10 或 Windows 11 (64位) 专业版/企业版。

- **网络环境**：
  - 必须连接医院局域网。
  - 必须能 Ping 通 NAS 存储服务器 (IP: 192.168.1.xxx，具体视现场配置而定)。
  - 建议：在路由器端为本机分配静态 IP，避免重启后 IP 变动导致移动端无法连接。

- **端口要求**：本机 80 (Web服务) 和 1337 (API服务) 端口未被占用。

### 1.2 交付物清单 (Deployment Kit)

请确保 U 盘或共享盘中包含名为 Hospital-CMS-Prod 的文件夹，结构如下：

```
Hospital-CMS-Prod/
├── 📂 frontend/        (前端静态资源)
├── 📂 backend/         (后端服务与数据库)
├── 📂 nginx/           (Web服务器)
├── 📂 tools/           (环境安装包)
│   └── node-v20-x64.msi
└── 📜 start.bat        (一键启动脚本)
```

## 2. 安装部署流程 (Installation Steps)

### 第一步：基础环境安装

1. 打开 Hospital-CMS-Prod/tools 文件夹。
2. 双击运行 node-v20-x64.msi。
3. 保持默认设置，点击 Next 直至安装完成（Finish）。
   - 验证：打开 CMD 输入 `node -v`，显示版本号即为成功。

### 第二步：文件迁移

1. 将 Hospital-CMS-Prod 整个文件夹复制到电脑磁盘根目录（推荐 D盘）。
   - ❌ 禁止放在中文路径下（如 桌面\新建文件夹）。
   - ✅ 推荐路径：`D:\Hospital-CMS-Prod`。

### 第三步：网络连通性检查 (关键)

在启动系统前，必须确认本机与 NAS 存储服务器的连接。

1. 按 Win + R，输入 cmd 回车。
2. 输入命令：`ping [NAS_IP_ADDRESS]` (例如 `ping 192.168.1.215`)。
3. 判定：
   - 若显示 TTL=xx，则网络正常，可继续。
   - 若显示"请求超时"或"无法访问"，请立刻停止部署，联系网络管理员排查网线或 VLAN 设置。

### 第四步：配置防火墙 (开放移动端访问)

为了让医生使用 iPad/平板访问系统，必须配置 Windows 防火墙。

1. 搜索并打开 "高级安全 Windows Defender 防火墙"。
2. 点击左侧 "入站规则" -> 右侧 "新建规则"。
3. 选择 "端口" -> 下一步。
4. 选择 "TCP"，特定本地端口填 80 -> 下一步。
5. 选择 "允许连接" -> 下一步。
6. 配置文件（域/专用/公用）全部勾选 -> 下一步。
7. 名称填入：CMS-Web-Service -> 完成。

## 3. 系统启动与验证 (Startup & Verification)

### 3.1 启动服务

1. 进入 `D:\Hospital-CMS-Prod` 文件夹。
2. 双击运行 start.bat。
3. 等待黑底白字的命令行窗口出现，并提示：

```
[3/3] System Ready!
Backend: http://localhost:1337
Frontend: http://localhost
```

注意：不要关闭这个黑色窗口，最小化即可。关闭窗口会导致服务停止。

### 3.2 本机验证

1. 打开浏览器（Chrome/Edge）。
2. 访问 http://localhost。
3. 检查点：
   - 能否看到登录页？
   - 登录后能否查看"历史图片"（本地存储）？
   - 登录后能否查看"新图片"（NAS 存储）？

### 3.3 移动端接入验证

1. 在本机 CMD 中输入 `ipconfig`，获取 IPv4 地址 (例如 192.168.1.50)。
2. 使用处于同一 WiFi 下的 iPad 或手机。
3. 浏览器访问 http://192.168.1.50。
4. 确认页面加载正常且无红色报错。

## 4. 常见问题排查 (Troubleshooting)

| 现象 | 可能原因 | 解决方法 |
|------|--------|--------|
| 双击 start.bat 闪退 | Node.js 未安装或路径含中文 | 1. 确认已安装 Node.js。<br>2. 移动文件夹到纯英文路径 (如 D:\CMS)。 |
| 手机无法访问网页 | 防火墙拦截 或 IP 错误 | 1. 检查防火墙是否已开放 80 端口。<br>2. 确认手机和电脑在同一 WiFi 下。<br>3. 尝试暂时关闭电脑防火墙测试。 |
| 旧图片无法显示 (404) | 本地文件缺失 | 检查 backend/public/uploads 文件夹是否为空。需从原开发机手动拷贝图片文件过来。 |
| 新图片无法显示 | NAS 连接中断 | 1. 在本机 ping NAS IP。<br>2. 检查 backend/.env 文件中的 NAS 配置是否正确。 |
| 报错 SQLITE_CANTOPEN | 文件夹权限不足 | 右键 start.bat，选择"以管理员身份运行"。 |

## 5. 数据备份与维护 (Maintenance)

本系统数据存储在本地文件与 NAS 中，建议定期备份。

### 核心数据位置

- **数据库文件**：backend/data/data.db (存储所有病人、治疗记录文本信息)。
- **本地影像文件**：backend/public/uploads (存储早期导入的图片)。
- **NAS 影像文件**：存储在 NAS 服务器上，由 NAS 管理员负责备份。

### 备份操作

1. 关闭 start.bat 运行窗口（停止服务）。
2. 将 backend/data 和 backend/public/uploads 文件夹复制到移动硬盘或备份服务器。
3. 重新运行 start.bat。

---

**技术支持联系人**：[陈敏杰]
