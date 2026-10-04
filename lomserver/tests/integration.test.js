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
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
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
  it('rewards check-in only once per business day', async () => {
    const first = await request('/user/checkin', { method: 'POST', token: alice.token });
    expect(first.status).toBe(200);
    expect(first.data.reward).toBe(5);
    expect((await request('/user/checkin', { method: 'POST', token: alice.token })).status).toBe(409);
    expect((await request('/user/me', { token: alice.token })).data.gold_coins).toBe(5);
  });
  it('protects administrator-only article creation', async () => {
    expect(
      (await request('/articles/', { method: 'POST', token: alice.token, body: { title: 'test', content: 'test' } }))
        .status,
    ).toBe(403);
  });
});
