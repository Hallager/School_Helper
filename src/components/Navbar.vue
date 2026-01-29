<template>
  <nav class="nav card-shadow">
    <div class="brand" @click="$router.push('/')">
      <span class="logo-emoji">🏫</span>
      <span class="logo-text">Lær & Leg</span>
    </div>

    <div class="nav-right">
      <div v-if="currentUser" class="user-pill" @click="$router.push('/profil')">
        <span class="user-avatar">{{ currentUser.avatar }}</span>
        <span class="user-name">{{ currentUser.name }}</span>
      </div>

      <div class="actions">
        <button 
          class="nav-btn start-btn" 
          :class="{ active: $route.path === '/' }"
          @click="$router.push('/')"
        >
          🏠 Start
        </button>
        <button 
          v-if="$route.path !== '/'" 
          class="nav-btn back-btn"
          @click="$router.back()"
        >
          ↩️ Tilbage
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useUser } from '../composables/useUser';
import { useRoute } from 'vue-router';

const { currentUser } = useUser();
const route = useRoute();
</script>

<style scoped>
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  background: white;
  position: sticky;
  top: 0;
  z-index: 1000;
  font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 1.4rem;
  cursor: pointer;
  color: #2D3436;
  transition: transform 0.2s;
}

.brand:hover {
  transform: scale(1.05);
}

.logo-emoji {
  font-size: 1.8rem;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f7ff;
  padding: 6px 12px;
  border-radius: 50px;
  cursor: pointer;
  border: 2px solid #E1F0FF;
  transition: all 0.2s;
}

.user-pill:hover {
  background: #E1F0FF;
  transform: translateY(-2px);
}

.user-avatar {
  font-size: 1.2rem;
}

.user-name {
  font-weight: bold;
  font-size: 0.9rem;
  color: #0984e3;
}

.actions {
  display: flex;
  gap: 10px;
}

.nav-btn {
  padding: 10px 18px;
  border-radius: 15px;
  border: none;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
}

.start-btn {
  background: #4ECDC4;
  color: white;
  box-shadow: 0 4px 0 #3dbbb3;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #3dbbb3;
}

.start-btn.active {
  background: #45b7af;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
  transform: translateY(2px);
}

.back-btn {
  background: #FF7675;
  color: white;
  box-shadow: 0 4px 0 #e86362;
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #e86362;
}

.back-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #e86362;
}

@media (max-width: 600px) {
  .logo-text {
    display: none;
  }
  .user-name {
    display: none;
  }
}
</style>

