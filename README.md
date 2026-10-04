# lom 联盟

> **Legacy Of Minecraft League** — 始于 2014 年的 Minecraft 玩家社区
>
> 官网：[www.bzlom.cn](https://www.bzlom.cn) · 十二周年：[anniversary.bzlom.cn](https://anniversary.bzlom.cn)

lom 联盟是一个以 Minecraft 为纽带的青少年创作社群，2014 年由凌云陌创立。从优酷起家，历经 QQ 群 → MC 服务器 → B站视频创作 → 自研 Mod → 官网建设，12 年间产出 300+ 视频、2 个自研 Mod、3 部微电影。

本站为 lom 联盟的社区平台，提供联盟公告、社区论坛、成员展示、历史回顾等功能。

---

## 页面

| 页面       | 说明                                             |
| ---------- | ------------------------------------------------ |
| 首页       | 微电影、服务器状态、Mod 展示、成员卡片、作品列表 |
| 联盟公告   | 2014 年至今的历史公告存档（29 篇）               |
| 社区论坛   | 成员发帖讨论                                     |
| 曾经的我们 | 联盟十二周年完整历史年表                         |

---

## 技术栈

| 层   | 技术                                          |
| ---- | --------------------------------------------- |
| 前端 | Vue 3 + Vite 8 + Naive UI + Pinia 3           |
| 后端 | Express 4 + Prisma 6 + MySQL 8                |
| 认证 | JWT（bcryptjs）                               |
| 校验 | Zod 4                                         |
| 测试 | Vitest 5 + jsdom + 实际 HTTP / MySQL 集成测试 |
| 部署 | Docker Compose / 单进程                       |

---

## 启动

需要 Node.js 24.15+ 和 pnpm 11.1.3。在仓库根目录操作；根目录的工作区和锁文件是唯一依赖来源，不再在子目录单独安装。

```bash
pnpm install --frozen-lockfile
pnpm --filter lomserver exec prisma generate
pnpm dev             # 后端 :3000，前端 :5173
pnpm lint
pnpm test
pnpm build
```

后端配置通过环境变量或现有本地 `.env` 配置提供，不要提交真实密钥。默认测试跳过依赖数据库的集成用例；完整集成测试需要 `LOM_TEST_DATABASE_URL` 指向单独的本地临时数据库。禁止使用生产数据库运行测试或 `prisma db push`。

## 发布安全

推送 main 后，Actions 执行检查、测试、构建，并在独立 CI 数据库中验收实际容器。服务器先启动候选容器进行只读预检，再替换应用；失败时回滚应用镜像。部署不重建 MySQL、不清除卷或上传目录，也不自动执行数据库迁移。数据库变更必须另行备份、核对迁移并由操作者执行。

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
