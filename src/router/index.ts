import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: {} },
    { path: '/tournament', name: 'tournament', component: {} },
    { path: '/local', name: 'local', component: {} },
  ],
})

export default router
