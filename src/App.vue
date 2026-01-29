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
/* global resets for the SPA (keep minimal) */
body { margin: 0; font-family: Arial, Helvetica, sans-serif; }
main { min-height: calc(100vh - 60px); }
</style>
