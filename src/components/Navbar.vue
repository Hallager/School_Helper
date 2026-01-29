<template>
  <nav class="nav">
    <div class="brand" @click="$router.push('/')">🏫 School Helper</div>
    <div class="actions">
      <button @click="$router.push('/')">Start</button>
      <button @click="restart">Genstart</button>
      <button v-if="$route.path !== '/'" @click="$router.back()">Tilbage</button>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'Navbar',
  methods: {
    restart() {
      // Do a full reload from the current origin+path to avoid stale dev-server ports
      window.location.href = window.location.origin + this.$route.fullPath;
    }
  }
}
</script>

<style scoped>
.nav { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.06); }
.brand { font-weight:700; cursor:pointer }
.actions button { margin-left:8px; padding:6px 10px; border-radius:8px; border:none; background:#4CAF50; color:white; cursor:pointer }
.actions button:nth-child(2){ background:#FF9800 }
.actions button:nth-child(3){ background:#2196F3 }
</style>
