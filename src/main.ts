import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Punto de entrada: crea la app de Vue con Pinia (estado) y Vue Router (rutas).
createApp(App).use(createPinia()).use(router).mount('#app')
