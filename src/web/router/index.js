import { createRouter, createWebHistory } from 'vue-router';
import Public from '../views/public/Status.vue';
import Login from '../views/admin/Login.vue';
import Dashboard from '../views/admin/Dashboard.vue';

export default createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: Public },
        { path: '/admin/login', component: Login },
        { path: '/admin', component: Dashboard },
    ],
});
