<template>
  <div>
    <Navbar />
    <main style="padding:16px;"><router-view /></main>
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue'
export default {
  name: 'App',
  components: { Navbar }
}
</script>

<style>
/* global resets for the SPA */
body { 
  margin: 0; 
  font-family: 'Comic Sans MS', 'Chalkboard SE', 'Fredoka', sans-serif;
  background-color: #f0f7ff;
}
main { min-height: calc(100vh - 60px); }

/* Global Button Styles */
.nav-btn, .btn-main {
  padding: 10px 24px;
  border-radius: 15px;
  border: none;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1.1rem;
  text-decoration: none;
}

.btn-primary, .start-btn {
  background: #4ECDC4;
  color: white;
  box-shadow: 0 4px 0 #3dbbb3;
}

.btn-primary:hover, .start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #3dbbb3;
}

.btn-primary:active, .start-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #3dbbb3;
}

.btn-secondary, .back-btn {
  background: #FF7675;
  color: white;
  box-shadow: 0 4px 0 #e86362;
}

.btn-secondary:hover, .back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #e86362;
}

.btn-secondary:active, .back-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #e86362;
}

.card-shadow {
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}
</style>
