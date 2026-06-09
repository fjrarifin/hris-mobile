import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue'
import { authState, restoreSession } from '@/services/auth'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/home'
  },
  {
    path: '/login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/change-password',
    component: () => import('@/views/ChangePasswordPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/forgot-password',
    component: () => import('@/views/ForgotPasswordPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/notifications',
    component: () => import('@/views/NotificationsPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/requests/leave',
    component: () => import('@/views/LeavePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/requests/public-holiday',
    component: () => import('@/views/PublicHolidayPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/requests/extra-off',
    component: () => import('@/views/ExtraOffPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/requests/permission',
    component: () => import('@/views/PermissionPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/requests/overtime',
    component: () => import('@/views/OvertimePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/team-schedules',
    component: () => import('@/views/TeamSchedulePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tabs/',
    component: TabsPage,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tabs/home'
      },
      {
        path: 'home',
        component: () => import('@/views/Tab1Page.vue')
      },
      {
        path: 'attendance',
        component: () => import('@/views/Tab2Page.vue')
      },
      {
        path: 'profile',
        component: () => import('@/views/Tab3Page.vue')
      },
      {
        path: 'guide',
        component: () => import('@/views/Tab4Page.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  await restoreSession()

  if (to.meta.requiresAuth && !authState.user) {
    return '/login'
  }

  if (to.meta.requiresAuth && authState.user?.must_change_password && to.path !== '/change-password') {
    return '/change-password'
  }

  if (to.meta.guestOnly && authState.user) {
    return authState.user.must_change_password ? '/change-password' : '/tabs/home'
  }

  return true
})

export default router
