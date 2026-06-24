/**
 * Vue Router 配置
 * 解决 Issue #11: Auth 状态不再直接读 localStorage，统一走 Pinia store
 */
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

const routes = [
  { path: '/', name: 'Main', component: () => import('@/components/Main.vue') },
  { path: '/login', name: 'Login', component: () => import('@/components/user/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/components/user/Register.vue') },
  { path: '/profile', name: 'Profile', component: () => import('@/components/user/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/edit-profile', name: 'EditProfile', component: () => import('@/components/user/EditProfile.vue'), meta: { requiresAuth: true } },
  { path: '/forums', name: 'Forums', component: () => import('@/components/forums/Forums.vue') },
  { path: '/forum/:id', name: 'Forum', component: () => import('@/components/forums/Forum.vue') },
  { path: '/articles', name: 'Articles', component: () => import('@/components/articles/Articles.vue') },
  { path: '/article/:id', name: 'Article', component: () => import('@/components/articles/Article.vue') },
  { path: '/about', name: 'About', component: () => import('@/components/about/OurHistory.vue') },
  { path: '/admin', name: 'Admin', component: () => import('@/components/admin/AdminDashboard.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/components/NotFound.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Issue #11: 使用 Pinia store 而非直接读 localStorage
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.token) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.name === 'Admin' && !authStore.user?.is_admin) {
    next({ name: 'Main' });
  } else {
    next();
  }
});

export default router;
