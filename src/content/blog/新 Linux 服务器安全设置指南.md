---
title: '新 Linux 服务器安全设置指南'
description: '新 Linux / Debian 服务器初始化安全设置指南，涵盖创建普通用户、SSH 密钥认证加固、UFW 防火墙配置及 Fail2Ban 防爆破。'
pubDate: '2025-12-08'
---

> 家里的 NAS 感染病毒后重装系统解决；VPS 被挖矿病毒感染两次后，决心写此服务器设置指南。以后新装的 Linux 服务器，建议按照以下步骤进行初始化安全设置，确保服务器安全。
>
> 参考: https://blog.dejavu.moe/posts/new-linux-server-setup-guide/

---

## 1. 重装系统 & 升级软件

- 重装系统一般优先选择 Debian 的最新稳定版系统，直接在 VPS 控制面板重装即可。
- 升级软件源与系统软件包：

```bash
sudo apt update && sudo apt upgrade -y
```

- `apt update`：更新软件源列表信息。
- `apt upgrade -y`：安装所有可用的最新安全补丁和软件版本（`-y` 表示自动确认）。

---

## 2. 创建普通用户 & SSH 安全加固

### 2.1 创建普通用户并赋予 sudo 权限

直接使用 root 用户进行日常操作存在较大安全隐患，建议首先创建普通用户：

```bash
# 创建普通用户（按提示设置密码等信息）
adduser yourname

# 将用户加入 sudo 组，赋予管理员权限
usermod -aG sudo yourname
```

- `usermod`：修改用户信息
- `-a`（append）：追加用户组，不覆盖现有组
- `-G`（groups）：指定要加入的附加用户组

### 2.2 配置 SSH 密钥登录

在禁用密码登录前，**必须先确保新用户已配置 SSH 公钥，否则一旦关闭密码认证将导致无法登录！**

如果你在本地电脑上已有公钥（如 `~/.ssh/id_ed25519.pub`），可以通过本地命令上传：

```bash
# 在本地电脑上执行（将公钥拷贝到服务器新用户下）
ssh-copy-id -i ~/.ssh/id_ed25519.pub yourname@your_server_ip
```

或者直接在服务器上将 root 已有的公钥授权给新用户：

```bash
# 在服务器上执行（从 root 复制已有公钥给新用户）
sudo -u yourname mkdir -p /home/yourname/.ssh
sudo cp /root/.ssh/authorized_keys /home/yourname/.ssh/
sudo chown -R yourname:yourname /home/yourname/.ssh
sudo chmod 700 /home/yourname/.ssh
sudo chmod 600 /home/yourname/.ssh/authorized_keys
```

### 2.3 修改 SSH 配置（禁用 root 登录 & 更改默认端口）

编辑 SSH 服务配置文件：

```bash
sudo vi /etc/ssh/sshd_config
```

找到并修改以下关键项：

```ini
# 禁止 root 通过 SSH 远程登录
PermitRootLogin no

# 关闭密码登录（强制只允许密钥登录）
PasswordAuthentication no

# 默认端口 22，建议修改为自定义端口（例如 2222），减少端口扫描与恶意尝试
#Port 22
Port 2222
```

重启 SSH 服务使配置生效：

```bash
sudo systemctl restart ssh
```

> [!CAUTION]
> **切勿立即断开当前会话！**
> 重启 SSH 后，**请务必新开一个终端窗口**，测试能否通过新端口和新用户密钥成功登录：
> `ssh -p 2222 yourname@your_server_ip`
> 确认新窗口登录成功后，再关闭当前的 root/旧会话，防止因配置失误把自己锁在服务器外。

---

## 3. 配置 UFW 防火墙

UFW（Uncomplicated Firewall）是 Debian/Ubuntu 上极简且强大的防火墙工具。

### 3.1 安装与设置默认策略

```bash
# 安装 UFW
sudo apt install ufw -y

# 默认拒绝所有外部访问（入站）
sudo ufw default deny incoming

# 默认允许服务器主动访问外部（出站）
sudo ufw default allow outgoing

# 若服务器支持 IPv6，开启 IPv6 支持
sudo sed -i 's/IPV6=no/IPV6=yes/' /etc/default/ufw
```

### 3.2 开放常用端口

> [!WARNING]
> **千万不要忘记放行 SSH 端口，且端口号必须与前面修改的端口保持一致！**

```bash
# 放行 SSH 端口（必须与前面配置的 Port 一致，如果改成了 2222 则放行 2222）
sudo ufw allow 2222/tcp comment 'SSH'

# 开放 Web 服务端口（若需要搭建网站）
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
```

### 3.3 启用防火墙

```bash
sudo ufw enable

# 查看防火墙状态与生效规则
sudo ufw status verbose
```

---

## 4. Fail2Ban 防暴力破解

Fail2Ban 会持续监控系统登录失败日志，对短时间内多次尝试密码暴力破解的恶意 IP 自动进行临时或永久封禁。

### 4.1 安装与启动

```bash
sudo apt install fail2ban -y

# 启动并设置开机自启
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4.2 配置自定义端口与服务

如果前面修改了 SSH 默认端口（如 `2222`），需要创建本地配置覆盖默认规则：

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo vi /etc/fail2ban/jail.local
```

找到 `[sshd]` 区域，指定 SSH 端口（Debian 12 默认采用 systemd 日志，建议同时指定 `backend = systemd`）：

```ini
[sshd]
enabled = true
port = 2222
backend = systemd
```

重启 Fail2Ban 生效：

```bash
sudo systemctl restart fail2ban
```

### 4.3 查看防爆破状态

```bash
# 查看 Fail2Ban 整体运行状态
sudo fail2ban-client status

# 查看 sshd 防护与当前封禁 IP 列表
sudo fail2ban-client status sshd
```

---

## 5. 检查对外暴露的端口

配置好防火墙和基础服务后，检查系统当前真正监听在网络上的端口：

```bash
sudo ss -tulnp
```

- `-t`：TCP
- `-u`：UDP
- `-l`：仅显示处于监听（Listen）状态的端口
- `-n`：以数字形式显示地址和端口（不反查域名和服务名，速度更快）
- `-p`：显示监听端口对应的进程与 PID

正常情况下，对外开放的应仅有你指定的 SSH 端口（如 2222）、80 和 443。若发现有其它未知端口暴露在外网（`0.0.0.0:*` 或 `[::]:*`），应及时查明进程或通过防火墙予以拦截。

---

## 6. 反向代理与隐藏源站真实 IP

若服务器主要用于托管 Web 服务，将域名接入 Cloudflare CDN 等代理服务能有效防御 DDoS 攻击并隐藏服务器真实 IP。

### 6.1 Cloudflare SSL/TLS 设置

- 接入 Cloudflare CDN 代理（点亮橙色小云朵 ☁️）。
- SSL/TLS 加密模式选择 **Full (Strict)**（严格模式），确保浏览器到 Cloudflare 以及 Cloudflare 到源站的全链路 HTTPS 加密。

### 6.2 源站防火墙仅允许 Cloudflare IP 访问

为了防止攻击者绕过 Cloudflare 直接扫描你的源站 IP 攻击 80/443 端口，应当限制 Web 端口仅对 Cloudflare 官方 IP 段开放：

1. 删除之前在 UFW 中全局开放的 80/443 规则：
   ```bash
   sudo ufw delete allow 80/tcp
   sudo ufw delete allow 443/tcp
   ```

2. 批量允许 Cloudflare 官方 IP 段访问 80 与 443 端口（参考 [Cloudflare 官方 IP 列表](https://www.cloudflare.com/ips/)）：
   ```bash
   for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
     sudo ufw allow proto tcp from "$ip" to any port 80,443 comment 'Cloudflare IPv4'
   done
   for ip in $(curl -s https://www.cloudflare.com/ips-v6); do
     sudo ufw allow proto tcp from "$ip" to any port 80,443 comment 'Cloudflare IPv6'
   done
   ```

---

## 7. 资源监控 & 异常报警

服务器被植入挖矿病毒等恶意软件时，通常会出现 CPU 满载、出网流量异常激增等特征。建立基础监控能第一时间发现异常：

- **轻量监控面板**：推荐使用 [Beszel](https://github.com/henrygd/beszel) 或 [Netdata](https://github.com/netdata/netdata)，几分钟内即可搭建轻量、美观的服务器状态监控。
- **告警通知**：配置资源告警阈值（例如 CPU 连续 5 分钟高于 90%、内存耗尽等），通过 Telegram Bot 或邮件推送告警。
- **实时排查**：遇到卡顿或高负载时，使用 `htop`、`glances` 或 `btop` 快速定位高占用进程。

---

## 8. 定期备份

安全防护再严密，也需要兜底方案。做好异地定期备份是遭遇勒索软件或系统损毁时的最后防线：

- **3-2-1 备份原则**：至少保留 3 份数据，使用 2 种不同介质，至少 1 份存放在异地。
- **自动化备份工具**：
  - 推荐使用 [Restic](https://restic.net/) 或 [BorgBackup](https://www.borgbackup.org/) 进行增量加密备份。
  - 数据可定期自动同步至 S3 兼容对象存储（如 Cloudflare R2、Backblaze B2）或自建异地 NAS。
  - 定期演练数据恢复，确保备份文件真实可用。
