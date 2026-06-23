/**
 * useAuth — 认证状态 composable
 * 解决 Issue #11: Auth 状态读取绕过 Pinia，直接读 localStorage
 *
 * 所有组件/路由必须通过此 composable 访问认证状态，
 * 不再直接读取 localStorage。
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();

  const isLoggedIn = computed(() => authStore.isLoggedIn);
  const isAdmin = computed(() => authStore.isAdmin);
  const user = computed(() => authStore.user);
  const token = computed(() => authStore.token);
  const userAvatar = computed(() => authStore.userAvatar);
  const userDisplayName = computed(() => authStore.userDisplayName);

  /** 登录：设置 token + 拉取用户信息 */
  async function login(tokenValue) {
    authStore.setToken(tokenValue);
    await authStore.fetchUser();
  }

  /** 登出 */
  function logout() {
    authStore.logout();
    router.push('/login');
  }

  /** 确保用户信息已加载（用于路由守卫和组件挂载） */
  async function ensureUser() {
    if (authStore.token && !authStore.user) {
      await authStore.fetchUser();
    }
    return authStore.user;
  }

  return {
    isLoggedIn,
    isAdmin,
    user,
    token,
    userAvatar,
    userDisplayName,
    login,
    logout,
    ensureUser,
    authStore, // 向后兼容：部分组件直接使用 authStore.xxx
  };
}
