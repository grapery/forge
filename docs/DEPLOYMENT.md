# Forge Admin 部署说明

## 访问入口

| 环境 | URL | 说明 |
|------|-----|------|
| 经 ngx 反代 | `https://<域名>/forge/` | 推荐；与 `next.config.ts` 的 `basePath: "/forge"` 一致 |
| 直连容器 | `http://<主机>:9010/` | 调试；生产请仅走 ngx |

ngx 将 `/forge/` 转发到 Docker 网络内的 `forge-admin:9010`，并去掉路径前缀（容器内路由为 `/`、`/api/admin/*`）。

首次部署或修改 ngx 路由后，在 **grapery/ngx** 仓库手动触发 `ngx-ci.yml`（workflow_dispatch）。

## GitHub Actions 变量（grapery/forge）

与 **grapery/grapery** 共用基础设施类变量，并增加 Forge 专用项。在  
https://github.com/grapery/forge/settings/variables/actions 配置（非 Secrets 页）。

### 从 grapery 同步的变量

| 变量 | 用途 |
|------|------|
| `ACR_REGISTRY` / `ACR_USERNAME` / `ACR_PASSWORD` | 阿里云 ACR 拉推镜像 |
| `DB_ADDRESS` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | MySQL（与主站同实例） |
| `DEV_DEPLOY_HOST` / `PROD_DEPLOY_HOST` | ECS 主机 |
| `SSH_USER` / `SSH_KEY` | 部署 SSH（`SSH_KEY` 须保留 PEM 换行） |

### Forge 专用变量

| 变量 | 说明 | 建议值 |
|------|------|--------|
| `FORGE_JWT_SECRET` | 管理端 JWT 密钥 | 独立随机串；勿与 `JWT_SECRET` 混用 |
| `FORGE_JWT_ACCESS_EXPIRY` | Access token 有效期 | `24h`（dev）/ `8h`（prod） |
| `FORGE_JWT_REFRESH_EXPIRY` | Refresh token 有效期 | `168h` / `72h` |
| `FORGE_ALLOW_ORIGINS` | 生产 CORS | 如 `https://rankquantity.xyz` |
| `ENABLE_FORGE_PROD_DEPLOY` | 是否启用 main 生产部署 | 默认 `false`，就绪后改为 `true` |

## CI/CD

- 工作流：`.github/workflows/admin-ci.yml`
- **develop** 推送 → 构建镜像 `grapery-dev/forge-admin:dev` → 部署到 `DEV_DEPLOY_HOST` 的 `/home/ubuntu/grapery/forge`
- **main** 生产部署需 `ENABLE_FORGE_PROD_DEPLOY=true`

远程目录需存在 `docker-compose.yml` 与 CI 生成的 `.env`；容器加入外部网络 `grapery-network`（与 ngx、server 相同）。

## 本地

```bash
cp .env.example .env
# 编辑 DB_*、FORGE_JWT_SECRET
docker network create grapery-network 2>/dev/null || true
docker compose up -d
```

健康检查：`GET http://localhost:9010/health` → `{"status":"ok"}`。
