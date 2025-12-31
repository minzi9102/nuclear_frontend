# Dev Context Snapshot [2025/12/30 23:55]

## 1. 核心任务与状态

**当前目标**: 在 Infortrend NAS 部署 MinIO 私有对象存储，并完成 Strapi 后端对接。

**当前状态**: 已完成 (Docker 部署成功，后端上传/读取链路已打通)。

**关键文件**:
- `config/plugins.ts`: 修正 module.exports 语法，配置 aws-s3 provider，强制指定 baseUrl。
- `config/middlewares.ts`: 更新 CSP 策略 (img-src, media-src) 允许 NAS IP。
- `.env`: 配置 NAS MinIO 凭证、Endpoint 及 Bucket。

## 2. 本次会话变动 (Changelog)

### [Infra] 部署 MinIO 容器
- **镜像**: minio/minio (离线加载)
- **端口映射**: Host 9090 -> Container 9000 (API); Host 9091 -> Container 9001 (Console)
- **存储卷**: NAS 共享文件夹 cms (SMB) -> 容器 /data
- **修复**: NAS 系统时间与客户端偏差导致的 RequestTimeTooSkewed 错误

### [Config] 修复 config/plugins.ts 语法错误
- 从 `module.exports = (env) => ...` (错误) 修正为 `module.exports = ({ env }) => ...` (解构赋值)
- 解决 Missing credentials 问题

### [Fix] 修复前端图片 URL 生成问题
- **问题 1**: 生成的 URL 缺少端口号 (:9090)
- **问题 2**: 指定 baseUrl 为 Endpoint 后缺少 Bucket 路径
- **解决**: 在 providerOptions 中显式拼接 `baseUrl: ${env('NAS_ENDPOINT')}/${env('NAS_BUCKET')}`

### [Security] 设置 MinIO Bucket 权限
- 将 hospital-cms-storage Bucket 权限设置为 Public，解决 AccessDenied

## 3. 挂起的任务与已知问题 (CRITICAL)

**TODO**: 清理脏数据。数据库中残留了调试期间产生的错误图片记录（缺少端口或路径重复），需在 Strapi Admin 中手动删除，否则前端会显示裂图。

**Note**: 只有新上传的图片才会应用最新的 baseUrl 规则。

## 4. 环境与依赖上下文

**Tech Stack**: Strapi v5.32.0, Node.js v22, Docker (on Infortrend NAS)

**Dependency**: @strapi/provider-upload-aws-s3 installed

**Key Config Snapshot**:

````typescript
// .env
NAS_ENDPOINT=http://192.168.1.215:9090  # 必须带端口，无 Bucket 后缀
NAS_BUCKET=hospital-cms-storage
NAS_REGION=us-east-1

// config/plugins.ts
s3Options: {
  endpoint: env('NAS_ENDPOINT'),
  forcePathStyle: true,
},
baseUrl: `${env('NAS_ENDPOINT')}/${env('NAS_BUCKET')}` // 强制修正 URL

````

# Phase 5: 后端 (Strapi) 连接 NAS 并搭建 MinIO 对象存储 [2025/12/31]

## 概述

这是一份后端 (Strapi) 连接 NAS 并搭建 MinIO 对象存储的全流程记录。这是一个典型的"私有云存储"架构搭建过程。

---

## 1. 架构总览

### 目标
将医院 CMS 系统中的图片数据，从应用服务器（本地/云端）剥离，存储到医院内部的私有 NAS 上。

### 方案
使用 Docker 在 NAS 上部署 MinIO（兼容 AWS S3 协议的对象存储服务），后端 Strapi 通过 S3 插件连接 MinIO。

---

## 2. 核心步骤总结

### 第一阶段：NAS 环境准备 (Docker & MinIO)

在 Infortrend NAS 上搭建服务端环境。

#### 准备镜像 (Offline Transfer)

由于 NAS 网络受限，采取"离线搬运"策略。

- 在 Windows 电脑上拉取镜像：
  ```bash
  docker pull minio/minio
  ```

- 打包：
  ```bash
  docker save -o minio_offline.tar minio/minio
  ```

- 上传至 NAS 并导入：
  ```bash
  docker load -i minio_offline.tar
  ```

#### 创建数据共享文件夹

在 NAS 普通卷中创建共享文件夹 `cms`（用于存放真实图片）。

**关键点**：协议仅勾选 SMB/CIFS，取消勾选 Object（避免 NAS 系统接管导致冲突）。

#### 配置并启动容器

**端口映射**：
- API 端口（代码用）：Host 9090 -> Container 9000
- 控制台端口（管理用）：Host 9091 -> Container 9001

**挂载卷 (Volume)**：将 NAS 的 cms 文件夹绝对路径挂载到容器的 `/data`

**环境变量 (Env)**：设置 `MINIO_ROOT_USER` 和 `MINIO_ROOT_PASSWORD`

**启动命令**：
```bash
server /data --console-address ":9001"
```

---

### 第二阶段：MinIO 内部配置

登录 MinIO 控制台 `http://NAS_IP:9091` 进行初始化。

#### 创建存储桶 (Bucket)

命名为 `hospital-cms-storage`

#### 开放权限 (关键)

将 Bucket 的 Access Policy 设置为 Public（或自定义策略 `* -> readonly`），确保前端能直接访问图片。

#### 获取凭证

在 Identity/Users 中创建 Access Key 和 Secret Key。

---

### 第三阶段：后端 Strapi 对接

配置 Strapi 项目使其能够"对话" NAS。

#### 安装插件

```bash
npm install @strapi/provider-upload-aws-s3
```

#### 配置环境变量 (.env)

```env
NAS_ACCESS_KEY=您的Key
NAS_SECRET_KEY=您的Secret
NAS_ENDPOINT=http://192.168.1.215:9090  # 必须带端口，无桶名后缀
NAS_BUCKET=hospital-cms-storage
NAS_REGION=us-east-1
```

#### 配置插件逻辑 (config/plugins.ts)

使用 `({ env }) => ({ ... })` 解构语法读取环境变量。

设置 `forcePathStyle: true`（适配 MinIO）。

**核心修正**：配置 `baseUrl` 为 ``${env('NAS_ENDPOINT')}/${env('NAS_BUCKET')}``，确保生成的图片 URL 完整包含端口和桶名。

```typescript
module.exports = ({ env }) => ({
  upload: {
    provider: 'aws-s3',
    providerOptions: {
      accessKeyId: env('NAS_ACCESS_KEY'),
      secretAccessKey: env('NAS_SECRET_KEY'),
      endpoint: env('NAS_ENDPOINT'),
      s3Options: {
        endpoint: env('NAS_ENDPOINT'),
        forcePathStyle: true,
      },
      baseUrl: `${env('NAS_ENDPOINT')}/${env('NAS_BUCKET')}`,
    },
  },
});
```

#### 配置安全策略 (config/middlewares.ts)

在 `img-src` 和 `media-src` 中添加 NAS 的 API 地址 `http://192.168.1.215:9090`，防止浏览器 CSP 拦截。

```typescript
{
  name: 'strapi::security',
  config: {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', 'http://192.168.1.215:9090'],
        'media-src': ["'self'", 'data:', 'blob:', 'http://192.168.1.215:9090'],
      },
    },
  },
}
```

---

### 第四阶段：故障排查与优化

解决过程中遇到的"坑"。

#### 时间同步故障

**现象**：报错 `RequestTimeTooSkewed`

**解决**：在 NAS 系统设置中校准时间，开启 NTP 同步。

#### URL 生成错误

**现象**：生成的链接是 `http://IP/...`（缺端口）或 `http://IP:9090/...`（缺桶名）

**解决**：通过 `baseUrl` 强制拼接完整路径。

#### 脏数据清理

删除调试期间上传的 URL 错误的旧图片，重新上传以生成正确链接。

> **重要提示**：只有新上传的图片才会应用最新的 baseUrl 规则。

---

## 3. 最终成果

现在，当你在 CMS 后台上传一张 X 光片时：

1. **Strapi** 通过 9090 端口将文件传给 NAS 里的 MinIO
2. **MinIO** 将文件物理存储在 NAS 的 cms 共享文件夹中
3. **Strapi** 生成一个类似 `http://192.168.1.215:9090/hospital-cms-storage/img.jpg` 的链接
4. **前端 Vue 应用** 通过这个链接直接从 NAS 读取并显示图片

---

## 关键配置速查表

| 配置项 | 值 | 用途 |
|--------|-----|------|
| NAS_ENDPOINT | `http://192.168.1.215:9090` | MinIO API 地址（必须带端口） |
| NAS_BUCKET | `hospital-cms-storage` | 存储桶名称 |
| NAS_REGION | `us-east-1` | AWS S3 兼容区域 |
| Host API Port | 9090 | 宿主机访问 MinIO 的端口 |
| Container API Port | 9000 | 容器内 MinIO 的端口 |
| Host Console Port | 9091 | 宿主机访问控制台的端口 |
| Container Console Port | 9001 | 容器内控制台的端口 |

---

## 检查清单 (Post-Deployment)

- [ ] Docker 容器正常运行：`docker ps` 显示 minio 容器
- [ ] MinIO 控制台可访问：`http://NAS_IP:9091`
- [ ] Bucket 权限设置为 Public
- [ ] Strapi 环境变量已配置
- [ ] `@strapi/provider-upload-aws-s3` 插件已安装
- [ ] `config/plugins.ts` 中 baseUrl 包含完整路径
- [ ] `config/middlewares.ts` 的 CSP 策略已更新
- [ ] 前端 CSP 规则已同步更新（如果有单独的前端 CSP）
- [ ] 测试上传新文件，验证链接正确性
- [ ] 删除调试期间的脏数据

---

## 参考资源

- MinIO 官方文档：https://docs.min.io/
- Strapi 文件上传插件：https://market.strapi.io/providers/@strapi/provider-upload-aws-s3
- AWS S3 兼容性指南：https://docs.aws.amazon.com/AmazonS3/latest/userguide/

---

**状态**：✅ 已完成（Docker 部署成功，后端上传/读取链路已打通）

**最后更新**：2025-12-31 23:55
