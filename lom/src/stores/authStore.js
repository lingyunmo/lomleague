import { defineStore } from 'pinia';
import api from '../api/api.js';

export const useAuthStore = defineStore('auth', {
    state: () => {
        let user = null;
        try {
            const stored = localStorage.getItem('user');
            if (stored) user = JSON.parse(stored);
        } catch { /* ignore corrupt data */ }
        return {
            token: localStorage.getItem('token') || null,
            user,
            userLoading: false,
        };
    },
    getters: {
        isLoggedIn: (state) => !!state.token,
        isAdmin: (state) => !!state.user?.is_admin,
        userAvatar: (state) => state.user?.avatar || '/default-avatar.png',
        userDisplayName: (state) => state.user?.username || '',
    },
    actions: {
        setToken(token) {
            this.token = token;
            localStorage.setItem('token', token);
        },
        setUser(user) {
            this.user = user;
            localStorage.setItem('user', JSON.stringify(user));
        },
        async fetchUser() {
            if (!this.token) return null;
            if (this.userLoading) return this.user;
            this.userLoading = true;
            try {
                const response = await api.get('/user/me');
                this.setUser(response.data);
                return this.user;
            } catch {
                this.logout();
                return null;
            } finally {
                this.userLoading = false;
            }
        },
        logout() {
            this.token = null;
            this.user = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
    },
});
