import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        name: 'Main',
        component: () => import('@/components/Main.vue'),
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/components/user/Login.vue'),
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@/components/user/Register.vue'),
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/components/user/Profile.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/edit-profile',
        name: 'EditProfile',
        component: () => import('@/components/user/EditProfile.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/forums',
        name: 'Forums',
        component: () => import('@/components/forums/Forums.vue'),
    },
    {
        path: '/forum/:id',
        name: 'Forum',
        component: () => import('@/components/forums/Forum.vue'),
    },
    {
        path: '/articles',
        name: 'Articles',
        component: () => import('@/components/articles/Articles.vue'),
    },
    {
        path: '/article/:id',
        name: 'Article',
        component: () => import('@/components/articles/Article.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token');
    if (to.meta.requiresAuth && !token) {
        next({ name: 'Login', query: { redirect: to.fullPath } });
    } else {
        next();
    }
});

export default router;
