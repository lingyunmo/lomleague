# lom 联盟 · 多阶段 Docker 构建
# 阶段 1: 编译 Vue 前端
# 阶段 2: Express 后端 + 前端静态文件

# ---- 阶段 1: 前端构建 ----
FROM node:22-alpine AS frontend-builder
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
WORKDIR /app/lom
COPY lom/package.json lom/pnpm-lock.yaml lom/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY lom/ ./
RUN pnpm build

# ---- 阶段 2: 后端运行 ----
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
WORKDIR /app/lomserver

COPY lomserver/package.json lomserver/pnpm-lock.yaml lomserver/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY lomserver/ ./
RUN npx prisma generate

# 前端构建产物
COPY --from=frontend-builder /app/lom/dist ./public

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
