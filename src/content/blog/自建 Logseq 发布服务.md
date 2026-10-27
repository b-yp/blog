---
title: '自建 Logseq 发布服务'
description: '使用 Dokploy 在自建服务器上快速部署 Logseq DB 版本的发布服务。'
pubDate: '2026-09-09'
---

本次要自建的 Logseq 发布服务来自 Logseq 官方，具体的代码路径：
- [logseq/deps/publish](https://github.com/logseq/logseq/tree/master/deps/publish)

为了部署方便，我们直接采用社区打包好的镜像：
- [yshalsager/logseq-selfhost/images/publish](https://github.com/yshalsager/logseq-selfhost/tree/master/images/publish)

本次教程基于 Dokploy 部署。如果不知道 Dokploy 是什么以及尚未安装，请参考：
- [Dokploy 官方文档](https://docs.dokploy.com/docs/core)

如果觉得 Dokploy 较占资源，也可以直接使用 Docker Compose 部署，然后用 Caddy 做反向代理和 HTTPS。

---

### 在 Dokploy 新建项目

1. 点击 **Projects** -> **Create Project**，输入名称（例如 `Logseq DB`）。
2. 点击 **Create Service** -> **Compose**，服务名称填 `Publish`。

### 准备 compose.yaml

进入 Publish 服务，点击 **General** -> **Provider** -> **Raw**，粘贴以下内容：

```yaml
services:
  publish:
    image: ghcr.io/${GHCR_OWNER:-yshalsager}/logseq-selfhost-publish:${IMAGE_TAG:-latest}
    env_file:
      - path: .env
    expose:
      - "8787"
    ports:
      - '${PUBLISH_PORT:-8788}:8787'
    networks:
      - dokploy-network
    volumes:
      - publish_data:/data
    read_only: true
    tmpfs:
      - /tmp
      - /app/worker/.wrangler/tmp:uid=1000,gid=1000,mode=1777
      - /app/worker/node_modules/.mf:uid=1000,gid=1000,mode=1777
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped
    pull_policy: always

volumes:
  publish_data:

networks:
  dokploy-network:
    external: true
```

### 配置 .env

点击 **Environment** 标签页，粘贴环境变量配置：

```dotenv
# GHCR namespace, usually your GitHub username or org name
GHCR_OWNER=yshalsager

# Image tag published by GitHub Actions (e.g. latest, 20260413-abc1234)
IMAGE_TAG=latest

# Host port on your VPS
PUBLISH_PORT=8788

# Logseq Cognito values used for JWT validation
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_dtagLnju8
COGNITO_CLIENT_ID=69cs1lgme7p8kbgld8n5kseii6
COGNITO_JWKS_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_dtagLnju8/.well-known/jwks.json

# Local R2 signing placeholders. Rendered public pages and assets are served
# through the worker. The /pages/:graph/:page/transit route still returns a
# Cloudflare-style presigned URL, so these values are intentionally local-only.
R2_ACCOUNT_ID=local
R2_BUCKET=logseq-publish-local
R2_ACCESS_KEY_ID=local
R2_SECRET_ACCESS_KEY=local

# Wrangler local runtime settings
CLOUDFLARE_INCLUDE_PROCESS_ENV=true
WRANGLER_LOG=info
```

### 配置域名

假设你的发布服务地址是：`logseq-publish.example.com`。

1. **DNS 配置**：前往你的 DNS 服务商添加解析记录：
   - **类型**：`A`
   - **名称**：`logseq-publish`
   - **值**：你的 Dokploy 服务器 IP
2. **在 Dokploy 绑定域名**：依次点击 **Domains** -> **Add Domain** 填写：
   - **Service Name**：可自定义（例如 `Publish`）
   - **Host**：`logseq-publish.example.com`
   - **Container Port**：`8787`
   - **HTTPS**：开启
   - **Certificate Provider**：`Let's Encrypt`
3. 填写完毕后点击 **Validate DNS**，如果变绿提示 `DNS Valid` 说明解析已生效。

### 部署

点击 **Deploy**，等待部署状态变为 **Done**。

### 检查是否成功

访问 `https://logseq-publish.example.com`，若看到 LOGSEQ PUBLISH 页面，说明部署成功。

### 客户端配置

1. 打开 Logseq DB 客户端（桌面端、移动端或 Web 端）。
2. 登录 Logseq 官方账号。
3. 点击 **设置** -> **高级** -> **发布服务器URL**，输入 `https://logseq-publish.example.com`。
4. 打开任意页面（Page），右击标题或点击右上角菜单，选择发布页面。
