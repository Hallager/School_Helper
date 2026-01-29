import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../pages/LandingPage.vue'
import TenGame from '../pages/TenGame.vue'
import GetEtTal from '../pages/GetEtTal.vue'
import HvilAntal from '../pages/HvilAntal.vue'
import BalloonHunt from '../pages/BalloonHunt.vue'

const routes = [
  { path: '/', name: 'Home', component: LandingPage },
  { path: '/10er', name: 'TenGame', component: TenGame },
  { path: '/getettal', name: 'GetEtTal', component: GetEtTal },
  { path: '/hvilantal', name: 'HvilAntal', component: HvilAntal },
  { path: '/balloon', name: 'BalloonHunt', component: BalloonHunt },
  { path: '/toget', name: 'TalRaekkefoelge', component: () => import('../pages/TalRaekkefoelge.vue') },
  { path: '/emojipuslespil', name: 'EmojiPuzzle', component: () => import('../pages/EmojiPuzzle.vue') },
  { path: '/dyrefodring', name: 'ZooFeeder', component: () => import('../pages/ZooFeeder.vue') },
  { path: '/profil', name: 'Profile', component: () => import('../pages/Profile.vue') }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
