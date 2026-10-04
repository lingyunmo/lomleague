import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const testDatabaseUrl = process.env.LOM_TEST_DATABASE_URL;
describe.skipIf(!testDatabaseUrl)('isolated MySQL application integration', () => {
  let server, baseUrl, prisma, alice, bob, post;
  async function request(route, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${baseUrl}/api${route}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json(),
      cacheControl: response.headers.get('cache-control'),
    };
  }
  async function member(name) {
    const username = `${name}_${Date.now()}`;
    const password = 'local-test-password';
    const register = await request('/user/register', {
      method: 'POST',
      body: { username, password, email: `${username}@example.invalid` },
    });
    expect(register.status).toBe(201);
    const login = await request('/user/login', { method: 'POST', body: { username, password } });
    expect(login.status).toBe(200);
    const payload = JSON.parse(Buffer.from(login.data.token.split('.')[1], 'base64url').toString('utf8'));
    expect(payload.exp - payload.iat).toBe(3600);
    return { id: register.data.userId, username, token: login.data.token };
  }
  beforeAll(async () => {
    const target = new URL(testDatabaseUrl);
    if (
      !['127.0.0.1', 'localhost'].includes(target.hostname) ||
      !['/lom_local_test', '/lom_ci_test'].includes(target.pathname)
    ) {
      throw new Error('Integration tests require an explicit local-only disposable database. Production is forbidden.');
    }
    vi.stubEnv('DATABASE_URL', testDatabaseUrl);
    vi.stubEnv('JWT_SECRET', 'isolated-integration-test-only');
    vi.stubEnv('JWT_EXPIRATION', '3600');
    const appModule = await import('../index.js');
    prisma = (await import('../dao/prismaClient.js')).default;
    server = appModule.startServer(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    alice = await member('local_alice');
    bob = await member('local_bob');
  });
  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    vi.unstubAllEnvs();
  });
  it('registers, authenticates and reads a profile without exposing a password', async () => {
    const result = await request('/user/me', { token: alice.token });
    expect(result.status).toBe(200);
    expect(result.data.username).toBe(alice.username);
    expect(result.data).not.toHaveProperty('password');
    expect(result.cacheControl).toBe('no-store');
  });
  it('retains Chinese, emoji and literal percent sequences in persisted posts', async () => {
    const title = '中文世界🧱 100% %E4%B8%AD';
    const created = await request('/forum/posts', {
      method: 'POST',
      token: alice.token,
      body: { title, content: '# 旧 Markdown\n\n**保留** 世界🧱 100%' },
    });
    expect(created.status).toBe(201);
    post = created.data;
    const result = await request(`/forum/posts/${post.id}`);
    expect(result.data.title).toBe(title);
    expect(result.data.content).toBe(post.content);
    const list = await request(`/forum/posts?keyword=${encodeURIComponent(title)}`);
    expect(list.data.posts.some((item) => item.id === post.id)).toBe(true);
  });
  it('saves a genuine uploaded Unicode avatar URL without truncating or decoding it', async () => {
    const name = `${'界'.repeat(40)}100% %E4%B8%AD.png`;
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=',
      'base64',
    );
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), name);
    const response = await fetch(`${baseUrl}/api/file/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${alice.token}` },
      body: form,
    });
    expect(response.status).toBe(200);
    const stored = await response.json();
    expect(stored.filename.replace(/^\d+_/, '')).toBe(name);
    expect(stored.url.length).toBeGreaterThan(191);
    expect(
      (await request('/user/update', { method: 'PUT', token: alice.token, body: { avatar: stored.url } })).status,
    ).toBe(200);
    expect((await request('/user/me', { token: alice.token })).data.avatar).toBe(stored.url);
    expect((await prisma.user.findUnique({ where: { id: alice.id } })).avatar).toBe(stored.url);
    const download = await fetch(`${baseUrl}${stored.url}`);
    expect(Buffer.from(await download.arrayBuffer())).toEqual(png);
  });
  it('does not let another member edit an owned post', async () => {
    expect(
      (await request(`/forum/posts/${post.id}`, { method: 'PUT', token: bob.token, body: { title: 'unauthorized' } }))
        .status,
    ).toBe(403);
    expect((await request(`/forum/posts/${post.id}`)).data.title).toBe(post.title);
  });
  it('adds replies, likes and owner notifications', async () => {
    const reply = await request('/forum/replies', {
      method: 'POST',
      token: bob.token,
      body: { postId: post.id, content: '测试回复：世界🧱' },
    });
    expect(reply.status).toBe(201);
    const like = await request('/likes/toggle', {
      method: 'POST',
      token: bob.token,
      body: { entityType: 'post', entityId: post.id },
    });
    expect(like.status).toBe(200);
    expect(like.data.liked).toBe(true);
    expect(like.data.count).toBe(1);
    const notifications = await request('/notifications/', { token: alice.token });
    expect(notifications.status).toBe(200);
    expect(notifications.data.unreadCount).toBeGreaterThan(0);
  });
  it("reads only the current member's actual activity, not all posts or replies for a user-id-shaped post", async () => {
    const otherPost = await request('/forum/posts', {
      method: 'POST',
      token: bob.token,
      body: { title: "Other member's post", content: 'local-only fixture' },
    });
    const ownReply = await request('/forum/replies', {
      method: 'POST',
      token: alice.token,
      body: { postId: otherPost.data.id, content: '自己的中文回复🧱100% %E4%B8%AD' },
    });
    const result = await request(`/user/activity?userId=${bob.id}`, { token: alice.token });
    expect(result.status).toBe(200);
    expect(result.cacheControl).toBe('no-store');
    expect(result.data.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: `p${post.id}`, type: 'post', postId: post.id, text: post.title }),
        expect.objectContaining({
          key: `r${ownReply.data.id}`,
          type: 'reply',
          postId: otherPost.data.id,
          text: '自己的中文回复🧱100% %E4%B8%AD',
        }),
      ]),
    );
    expect(result.data.activities.some((item) => item.type === 'post' && item.postId === otherPost.data.id)).toBe(
      false,
    );
    expect((await request('/user/activity')).status).toBe(401);
    const empty = await member('local_empty_activity');
    expect((await request('/user/activity', { token: empty.token })).data.activities).toEqual([]);
  });
  it('isolates member notifications and mark-read operations without retaining HTTP responses', async () => {
    const initial = await request('/notifications/', { token: alice.token });
    const other = await request('/notifications/', { token: bob.token });
    expect(initial.cacheControl).toBe('no-store');
    expect(other.cacheControl).toBe('no-store');
    expect(initial.data.notifications.every((item) => item.userId === alice.id)).toBe(true);
    expect(other.data.notifications.some((item) => item.userId === alice.id)).toBe(false);
    const id = initial.data.notifications[0].id;
    expect((await request(`/notifications/${id}/read`, { method: 'PUT', token: bob.token })).status).toBe(200);
    const unchanged = await request('/notifications/', { token: alice.token });
    expect(unchanged.data.unreadCount).toBe(initial.data.unreadCount);
    expect(unchanged.data.notifications.find((item) => item.id === id).isRead).toBe(false);
    expect((await request('/notifications/read-all', { method: 'PUT', token: alice.token })).status).toBe(200);
    expect((await request('/notifications/', { token: alice.token })).data.unreadCount).toBe(0);
    expect((await request('/notifications/')).status).toBe(401);
  });
  it('preserves count and member identity in real MySQL batch reads', async () => {
    const absent = 2_147_483_647;
    const body = { entityType: 'post', entityIds: [post.id, absent] };
    const counts = await request('/likes/batch-counts', { method: 'POST', body });
    expect(counts.status).toBe(200);
    expect(counts.data).toEqual({ counts: { [post.id]: 1, [absent]: 0 } });
    const bobStatus = await request('/likes/batch-status', { method: 'POST', token: bob.token, body });
    const aliceStatus = await request('/likes/batch-status', { method: 'POST', token: alice.token, body });
    expect(bobStatus.data).toEqual({ likedIds: [post.id] });
    expect(aliceStatus.data).toEqual({ likedIds: [] });
    expect((await request('/likes/batch-status', { method: 'POST', body })).status).toBe(401);
  });
  it('rewards check-in only once per business day', async () => {
    const first = await request('/user/checkin', { method: 'POST', token: alice.token });
    expect(first.status).toBe(200);
    expect(first.data.reward).toBe(5);
    expect((await request('/user/checkin', { method: 'POST', token: alice.token })).status).toBe(409);
    expect((await request('/user/me', { token: alice.token })).data.gold_coins).toBe(5);
  });
  it('grants only one reward under concurrent check-in requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, () => request('/user/checkin', { method: 'POST', token: bob.token })),
    );
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(11);
    const profile = await request('/user/me', { token: bob.token });
    expect(profile.data.gold_coins).toBe(5);
    expect(profile.data.checkin_streak).toBe(1);
  });
  it('also guards an existing persisted check-in date and retains the streak reward cap', async () => {
    const memberWithStreak = await member('local_streak');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.user.update({
      where: { id: memberWithStreak.id },
      data: { last_checkin_date: yesterday, checkin_streak: 7, gold_coins: 10 },
    });
    const results = await Promise.all(
      Array.from({ length: 12 }, () => request('/user/checkin', { method: 'POST', token: memberWithStreak.token })),
    );
    const successes = results.filter((result) => result.status === 200);
    expect(successes).toHaveLength(1);
    expect(successes[0].data).toMatchObject({ reward: 12, streak: 8, totalCoins: 22 });
    expect(results.filter((result) => result.status === 409)).toHaveLength(11);
    expect((await request('/user/me', { token: memberWithStreak.token })).data.gold_coins).toBe(22);
  });
  it('protects administrator-only article creation', async () => {
    expect(
      (await request('/articles/', { method: 'POST', token: alice.token, body: { title: 'test', content: 'test' } }))
        .status,
    ).toBe(403);
  });
});
