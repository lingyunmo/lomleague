import axios from 'axios';
import { isTokenExpired } from './utils.js';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        if (isTokenExpired(token)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } else {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, error => Promise.reject(error));

api.interceptors.response.use(
    response => response,
    error => {
        if ([401, 403].includes(error.response?.status)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
