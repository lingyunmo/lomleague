# lom 联盟

> **Legacy Of Minecraft League** — 始于 2014 年的 Minecraft 玩家社区
>
> 官网：[www.bzlom.cn](https://www.bzlom.cn) · 十二周年：[anniversary.bzlom.cn](https://anniversary.bzlom.cn)

lom 联盟是一个以 Minecraft 为纽带的青少年创作社群，2014 年由凌云陌创立。从优酷起家，历经 QQ 群 → MC 服务器 → B站视频创作 → 自研 Mod → 官网建设，12 年间产出 300+ 视频、2 个自研 Mod、3 部微电影。

本站为 lom 联盟的社区平台，提供联盟公告、社区论坛、成员展示、历史回顾等功能。

---

## 页面

| 页面 | 说明 |
|------|------|
| 首页 | 微电影、服务器状态、Mod 展示、成员卡片、作品列表 |
| 联盟公告 | 2014 年至今的历史公告存档（29 篇） |
| 社区论坛 | 成员发帖讨论 |
| 曾经的我们 | 联盟十二周年完整历史年表 |

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite 6 + Naive UI + Pinia 3 |
| 后端 | Express 4 + Prisma 6 + MySQL 8 |
| 认证 | JWT（bcryptjs） |
| 校验 | Zod 4 |
| 部署 | Docker Compose / 单进程 |

---

## 启动

```bash
# 后端
cd lomserver && pnpm install && pnpm dev    # :3000

# 前端
cd lom && pnpm install && pnpm dev           # :5173
```

---

## 项目结构

```
lomleague/
├── lom/                    # Vue 3 SPA
│   └── src/
│       ├── api/            # API 封装（user/forum/article/like/notification/file）
│       ├── composables/    # useAuth / usePaginatedFetch / useLike / useDebounce / useTheme
│       ├── components/     # 页面组件 + 通用组件
│       ├── data/           # 静态数据（成员、首页内容）
│       ├── router/         # Vue Router
│       └── stores/         # Pinia（authStore）
├── lomserver/              # Express REST API
│   ├── routes/             # 路由层（薄层）
│   ├── services/           # 业务逻辑层
│   ├── dao/                # 数据访问层（Prisma）
│   ├── middleware/         # auth / asyncHandler / validate / requireOwner / errorHandler
│   └── prisma/             # schema + migrations
├── types/                  # 前后端共享类型
├── docker-compose.yml
└── Dockerfile
```

## 许可

MIT
