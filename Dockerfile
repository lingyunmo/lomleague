# One workspace lockfile for local builds, CI and production.
FROM node:24-alpine AS builder
RUN apk add --no-cache openssl
RUN npm install --global pnpm@11.1.3
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY lom/package.json ./lom/package.json
COPY lomserver/package.json ./lomserver/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY lom/ ./lom/
COPY lomserver/ ./lomserver/
RUN pnpm --filter lomserver exec prisma generate && pnpm build

FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl
RUN npm install --global pnpm@11.1.3
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lom/package.json ./lom/package.json
COPY --from=builder /app/lom/node_modules ./lom/node_modules
COPY --from=builder /app/lomserver ./lomserver
COPY --from=builder /app/lom/dist ./lomserver/public
WORKDIR /app/lomserver
ARG APP_REVISION=local
ENV NODE_ENV=production APP_REVISION=$APP_REVISION
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
# Schema changes require a separate, backup-first operator action; app startup is read-only.
CMD ["node", "index.js"]
