---
title: '自建 Logseq 同步服务'
description: '使用 Dokploy 在自建服务器上快速部署 Logseq DB 版本的同步服务。'
pubDate: '2026-09-02'
---

本教程基于 Dokploy 部署。如果不想使用 Dokploy，也可以参考这篇文章：[logseq-selfhost-sync](https://zak.ee/writing/2026/logseq-selfhost-sync)。

该文章核心包含两步：**部署 caddy-docker-proxy** 与 **部署 Logseq-db-sync**。如果使用 Dokploy，则无需手动使用 Caddy 处理 HTTPS 和反向代理，只需部署 Logseq-db-sync 即可。

---

### 安装 Dokploy

**Dokploy 是什么？**

[Dokploy](https://dokploy.com/) 是一个免费、开源的应用部署平台，类似于自建版 Vercel / Coolify，可以部署在自己的 VPS 上。

**安装**

- 官方文档：https://docs.dokploy.com/docs/core/installation
- 直接在服务器上执行一键脚本：
  ```bash
  curl -sSL https://dokploy.com/install.sh | sh
  ```
- 安装完成后，通过浏览器访问 `http://你的服务器IP:3000` 即可进入管理控制台。

### 在 Dokploy 新建项目

1. 点击 **Projects** -> **Create Project**，输入名称（例如 `Logseq DB`）。
2. 然后点击 **Create Service** -> **Compose**，服务名称可填 `Sync`。

### 准备 compose.yaml

点击 **General** -> **Provider** -> **Raw**，粘贴以下内容：

```yaml
services:
  sync:
    image: ghcr.io/yshalsager/logseq-selfhost-sync:latest
    restart: unless-stopped
    env_file:
      - .env
    expose:
      - "8787"
    networks:
      - dokploy-network
    volumes:
      - sync_data:/app/data
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true

volumes:
  sync_data:

networks:
  dokploy-network:
    external: true
```

### 配置 .env

点击 **Environment** 标签页，粘贴环境变量配置：

```dotenv
DB_SYNC_PORT=8787
DB_SYNC_BASE_URL=https://logseq-sync.example.com # 这里使用你自己的域名
DB_SYNC_DATA_DIR=/app/data
DB_SYNC_STORAGE_DRIVER=sqlite
DB_SYNC_ASSETS_DRIVER=filesystem
DB_SYNC_LOG_LEVEL=info

COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_dtagLnju8
COGNITO_CLIENT_ID=69cs1lgme7p8kbgld8n5kseii6
COGNITO_JWKS_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_dtagLnju8/.well-known/jwks.json

DB_SYNC_ADMIN_TOKEN=<一串随机字符>
```

### 配置域名

假设你的同步服务地址是：`logseq-sync.example.com`。

1. **DNS 配置**：前往你的 DNS 服务商添加解析记录：
   - **类型**：`A`
   - **名称**：`logseq-sync`
   - **值**：你的 Dokploy 服务器 IP
2. **在 Dokploy 绑定域名**：依次点击 **Domains** -> **Add Domain** 填写：
   - **Service Name**：可自定义（例如 `Sync`）
   - **Host**：`logseq-sync.example.com`
   - **Container Port**：`8787`
   - **HTTPS**：开启
   - **Certificate Provider**：`Let's Encrypt`
3. 填写完毕后点击 **Validate DNS**，如果变绿提示 `DNS Valid` 说明解析已生效。

### 部署

点击 **Deploy**，等待部署状态变为 **Done**。

### 检查是否成功

访问 `https://logseq-sync.example.com/health`，若返回如下内容，说明部署成功：

```json
{"ok":true}
```

### 客户端配置

服务器部署成功后：

1. 打开 Logseq DB 版客户端，或访问 Web 版：https://app.logseq.com/
2. 登录 Logseq 官方账号。
3. 点击 **设置** -> **高级** -> **同步服务器URL**，输入 `https://logseq-sync.example.com` 即可。
