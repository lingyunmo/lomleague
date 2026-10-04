# lom 数据与上传维护

## 实际位置与权限

仅管理 `/root/minecraft/lomleague`、Compose 项目 `lomleague` 和 `lom-app` / `lom-mysql`。其他生产服务不在操作范围内。

- `mysql_data` → 数据库容器 `/var/lib/mysql`；这是数据库存储，不能直接当作运行中一致性备份复制。
- `upload` → 应用容器 `/app/lomserver/upload`；前后端仍在同一应用容器内。
- MySQL 不发布公网端口。应用在 `common-net` 内访问 `mysql:3306/lom`；维护通过 SSH，不开放 3306。
- `.ops-secrets` 与 `backups` 为 root 专用目录。应用的 `runtime.env` 使用 `lom_runtime`，仅对 `lom.*` 授予 SELECT/INSERT/UPDATE/DELETE，没有建表/删表/授权权限。
- `.env` 中旧 root 连接不再作为应用运行连接。备份管理连接在受保护的 `mysql-admin.cnf` 中。旧 root 密码仍需另批协调轮换，不能声称已解决。

## IP 来源与地区定位（2.0.22）

实际入口为 Cloudflare → Nginx Proxy Manager → lom-app。应用只读取经过 Express 可信代理链解析的请求 IP，登录记录与各接口限流使用同一来源；不使用客户端请求体的 ip/region，也不直接信任 CF-Connecting-IP 或 X-Real-IP。TRUSTED_PROXY_CIDRS 留空时不信任任何代理；配置格式仅为逗号分隔的明确 IP/CIDR，不接受 true、代理跳数或 /0。

服务器在 lom 的 .env 配置此键：当前入口代理是 common-net 上 nginx_proxy_manager 的172.29.0.12/32，另加入2026-10-05核对过的 Cloudflare 官方 IPv4/IPv6 网段（https://www.cloudflare.com/ips-v4 、https://www.cloudflare.com/ips-v6）。不得把整个172.29.0.0/16、全部私网、其他容器或任意 CDN 设为可信。代理重建/IP或 CDN 网段变化时必须重新核对配置，不能靠增加跳数解决；旧配置变化时会保守退回较近的地址，不盲信更远的头。只调整 lom 配置，不修改或重启共享 Nginx 服务。修改前在 .ops-secrets 留下明确命名的原配置副本，持有与备份/部署共用的维护锁；不改只有运行数据库连接的 runtime.env。

保留原 HTTP ip-api 免费接口。已从实际 lom-app 测试：HTTP200/success，HTTPS403/SSL unavailable；不能直接替换成 HTTPS，也未改用其他供应商。只查询显式、合法、可公网路由的 IP，不发送内网/回环/保留地址，不用服务器出口 IP 兜底。每次查询总截止1.8秒、响应最多16KiB、不跟随重定向、最多4个不同 IP 并发、滚动60秒内最多40次外部查询，并遵守 X-Rl/X-Ttl/429。成功缓存6小时，失败缓存1分钟并短暂全局退避，最多1024个条目；公开 /api/get-ip 按真实来源60次/15分钟限流，HTTP响应 no-store。

定位不可用时登录仍可成功，保存检测到的 IP 和“未知地区”；前端不再先请求定位再登录。帖子、回复和文章仍采用成员最后登录地区，但由服务端读取，不接受提交者任意覆盖；编辑内容不改变历史地区。旧登录/地区数据不批量回填或重写，新规则从下次登录/创建开始生效。

此地区是公网出口的大致归属地，不是 GPS、身份或 VPN 检测结果。按用户要求保留的免费 HTTP 链路是明文，地区返回不具备密码学真实性；地区不能用于权限判断。查询预算、缓存和限流为当前单进程内存状态，重启会重置；多实例/大规模场景需另批替换共享限流和离线定位库。检测到的用户公网出口 IP 会发送给现有第三方 ip-api 以查询归属地，不记录查询响应原文或新增长期 IP 历史表。

## 一致备份与恢复

`bash /root/minecraft/lomleague/ops/backup.sh` 获取与部署共用的锁，短暂停止**仅 lom-app**，生成 lom 的事务 SQL 备份以及上传目录/配置同一检查点，然后立即恢复应用。数据库容器不会重建。大文件备份会延长短暂停写窗口；请按业务量重新评估维护时间。

备份必须在全新内部网络、无公网端口的限额临时容器中实际恢复通过，才生成 `backups/*.lom`。验证涵盖全量数据/结构摘要、上传 SHA256、原始 HTTP URL 和字节。摘要仅忽略 MySQL SHOW CREATE 中冗余的相同 utf8mb4 列声明，不忽略数据、字段长度或不同排序规则。

归档使用 AES-256-GCM，随机密钥由 RSA-OAEP-SHA256 包装；服务器仅有公钥。**保留原始 `D:\Seoul.pem` 的受控离线副本，即使以后更换 SSH 密钥也不能丢失旧备份解密密钥。** 只有加密归档而没有对应私钥无法恢复。

每日 systemd `lomleague-backup.timer` 在服务器本地时间 04:10 后随机十分钟内触发，错过运行会补做。每次都执行恢复演练。用 `systemctl status lomleague-backup.timer lomleague-backup.service` 和 `journalctl -u lomleague-backup.service` 检查是否成功；不能只看 timer 已启用。

归档当前**不自动删除**，失败的 `.pending-*` 留在 root 专用目录以便调查。应监控磁盘和失败日志；按每日约 11 MiB 的当前数据量估算容量并随着业务增长调整。至少保留最近 7 个成功检查点、最近 4 个周检查点和月检查点，先确认异机副本能解密/恢复后再人工删除明确选中的旧归档。不要使用无范围的清理命令。

当前异机副本位于本机任务输出目录 `lomleague-backups`（仅当前 Windows 用户有权读取）。服务器定时备份不等于异机备份：尚未配置远程对象存储/跨机自动传输，需定期通过 SCP 复制 `.lom` 并比对 SHA256。

### 灾难恢复操作顺序（禁止覆盖现有业务数据）

1. 先校验加密归档 SHA256。在可信机器运行 `node ops/backup-envelope.mjs open <归档.lom> <全新输出.tar> <私钥.pem>`。输出必须不存在；认证失败不保留新明文。
2. 在全新私有工作目录展开 tar，执行 `sha256sum -c SHA256SUMS`。配置归档含凭据，不得公开或提交 Git。
3. 在新机器/全新**空** MySQL 数据目录中建立 lom，确认业务表数量为零，再导入 `database.sql.gz`。不导入当前生产库，不 reset，不覆盖旧 mysql_data。
4. 将 `uploads.tar.gz` 恢复到该新环境的 upload，保留全部原文件名/字节，验证 `uploads.sha256`。禁止为“修复编码”重命名旧文件。
5. 管理账号不属于 lom 的 SQL dump；使用新环境管理凭据，按 `provision-runtime.mjs` 的受限权限重建运行账号，不要把旧 runtime.env 当作已创建账号。配置 APP_REVISION 和归档 manifest 对应的应用镜像，先在隔离网络运行只读 smoke/上传 URL 验证。
6. 确认新环境数据与文件配对、应用通过验收后，才协调流量切换；保留旧环境用于回退。恢复期间不得让两个实例向同一份上传目录并发写入。

`ops/verify-restore.sh` 只会导入自己创建的空临时库，完成后删除自己的带令牌容器/网络/临时目录，绝不删除现有数据库或上传。正式灾难切换不是该脚本的自动动作。

## 小步数据库维护

本批唯一 DDL：`User.avatar` 从 varchar(191) 扩到 varchar(2048)，保持 utf8mb4、默认头像和已有值。目标迁移为 `20261005000000_widen_avatar_url`，INPLACE/LOCK=NONE；不支持在线执行时直接失败，不降级锁表。旧 16 条迁移记录（8 个重复名称）保留，不清理、不重放。

`apply-avatar-maintenance.sh <24小时内已验收归档> <SHA256> <ops下已审阅Prisma目录>` 需要当前应用仍使用管理连接，获取锁并停写，核对只有这一条审阅过的语句，验证前后六张业务表全量摘要和旧迁移记录相同。它不是通用迁移器；运行账号切换后不可再次拿运行连接执行 DDL。以后新迁移需要新的逐项审阅和隔离演练。

回退应用镜像不需要缩回 avatar 字段。缩短字段可能截断合法长 URL，不能当作回滚；只有确认必要并另行备份/评审才修改数据库。保留当前账号删除的级联业务规则，不顺手改为软删除。

## 上传约束与边界

文件命名仍为时间戳加清洗后的原始可读名称。Multipart 参数按 UTF-8 直接读取，字面百分号不转码；URL 仅在传输层进行标准编码。磁盘、返回字段、保存 URL、展示、下载对应同一个文件名。新文件碰撞只重新选择时间戳，已有文件不覆盖。

默认 10 MiB/文件、1 GiB/成员、滚动 24 小时 100 MiB、每成员 15 分钟 20 次、每成员同时 2 个/全局 4 个、至少 256 MiB 空闲保留。容量按文件实际大小/mtime 统计；备份恢复必须保留时间信息。可配置 `UPLOAD_USER_QUOTA_BYTES`、`UPLOAD_DAY_QUOTA_BYTES`、`UPLOAD_MIN_FREE_BYTES`、`UPLOAD_RATE_LIMIT`。此实现面向当前单写入进程；水平扩展前必须替换内存锁/限流与目录扫描方案。

支持原有图片、音视频、PDF、ZIP/RAR 格式，检查扩展名、客户端 MIME 和实际签名。签名检测在 2 秒/32 MiB 限额 worker 中执行，**不等于完整文件解析、杀毒或压缩包内容审计**。PDF/压缩包仍是非可信下载。遗留文件不删除、不批量转换，保持现有公开附件语义和 CSP/nosniff；这不是私有文件授权系统。

临时上传放在不公开的 `.pending` 目录，成功/拒绝/正常中断后清理自己的临时目录。硬崩溃可能遗留临时文件；只在停止 lom-app、明确确认不是业务文件且已备份后，按具体路径人工处理，不自动删除历史上传。删除表单附件仅影响草稿，不删除服务器文件。
