import { createRouter, createWebHashHistory } from 'vue-router'
import CourtsView from './views/CourtsView.vue'
import BookView from './views/BookView.vue'
import ShareView from './views/ShareView.vue'
import OnsiteView from './views/OnsiteView.vue'
import IncidentsView from './views/IncidentsView.vue'
import MyView from './views/MyView.vue'
import AdminView from './views/AdminView.vue'
import FairnessView from './views/FairnessView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/courts' },
    { path: '/courts', component: CourtsView, meta: { title: '场地' } },
    { path: '/book', component: BookView, meta: { title: '预约' } },
    { path: '/share', component: ShareView, meta: { title: '拼场' } },
    { path: '/onsite', component: OnsiteView, meta: { title: '现场' } },
    { path: '/incidents', component: IncidentsView, meta: { title: '事件' } },
    { path: '/my', component: MyView, meta: { title: '我的' } },
    { path: '/admin', component: AdminView, meta: { title: '后台' } },
    { path: '/fairness', component: FairnessView, meta: { title: '公平性' } },
  ],
})
