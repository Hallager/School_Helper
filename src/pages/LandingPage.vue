<template>
  <div class="landing-container">
    <header class="header">
      <h1 class="bounce-title">🏫 School Helper 🎒</h1>
      <p class="subtitle">Velkommen! Vælg et sjovt spil at spille 👇</p>
    </header>

    <div class="user-section">
      <div v-if="currentUser" class="user-controls">
        <div class="active-user-badge" @click="showUserSelect = !showUserSelect">
          <span class="user-avatar">{{ currentUser.avatar }}</span>
          <span class="user-name">{{ currentUser.name }}</span>
          <span class="arrow">{{ showUserSelect ? '▲' : '▼' }}</span>
        </div>
        <button class="profile-link-btn" @click="$router.push('/profil')">📈 Se Resultater</button>
      </div>
      <div v-else class="no-user-badge" @click="showUserSelect = !showUserSelect">
        <span>Vælg eller opret en profil venligst 👤</span>
      </div>

      <div v-if="showUserSelect" class="user-dropdown card-shadow">
        <div class="user-list">
          <div 
            v-for="user in users" 
            :key="user.id" 
            class="user-item"
            :class="{ active: currentUser?.id === user.id }"
            @click="selectAndClose(user.id)"
          >
            <span class="item-avatar">{{ user.avatar }}</span>
            <span class="item-name">{{ user.name }}</span>
            <button class="delete-btn" @click.stop="confirmDelete(user)">✕</button>
          </div>
        </div>
        
        <div class="add-user-form">
          <input 
            v-model="newUserName" 
            type="text" 
            placeholder="Barnets navn..." 
            @keyup.enter="handleCreateUser"
          >
          <button @click="handleCreateUser">Opret</button>
        </div>
      </div>
    </div>

    <div class="games-grid">
      <div 
        v-for="game in orderedGames" 
        :key="game.id"
        class="game-card" 
        :class="[game.class, { 'is-dragging': draggingId === game.id }]"
        :draggable="!!currentUser"
        @click="handleGameClick(game.route)"
        @dragstart="handleGameDragStart($event, game.id)"
        @dragover.prevent="handleGameDragOver($event, game.id)"
        @drop="handleGameDrop"
        @dragend="handleGameDragEnd"
      >
        <div class="emoji">{{ game.emoji }}</div>
        <h2>{{ game.title }}</h2>
        <p>{{ game.description }}</p>
        <div v-if="currentUser" class="drag-handle" title="Træk for at flytte">⋮⋮</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUser } from '../composables/useUser';

const router = useRouter();
const { users, currentUser, addUser, deleteUser, selectUser, updateUser } = useUser();

const showUserSelect = ref(false);
const newUserName = ref('');

const allGames = [
  { id: '10er', title: "10'er Venner", emoji: '🔟', description: 'Find de tal der passer sammen!', route: '/10er', class: 'card-10er' },
  { id: 'getettal', title: 'Talspillet', emoji: '🍎', description: 'Lær dine tal at kende', route: '/getettal', class: 'card-tal' },
  { id: 'hvilantal', title: 'Tælle Spil', emoji: '🎲', description: 'Kan du tælle tingene?', route: '/hvilantal', class: 'card-taelle' },
  { id: 'balloon', title: 'Ballon Jagt', emoji: '🎈', description: 'Fang ballonerne fra 10-tabellen!', route: '/balloon', class: 'card-balloon' },
  { id: 'toget', title: 'Tal Toget', emoji: '🚂', description: 'Sæt tallene på plads så toget kan køre!', route: '/toget', class: 'card-tog' },
  { id: 'emojipuslespil', title: 'Emoji Puslespil', emoji: '🧩', description: 'Match tal og emojis i sjove temaer!', route: '/emojipuslespil', class: 'card-puslespil' },
  { id: 'dyrefodring', title: 'Zoo Fodring', emoji: '🦁', description: 'Læs tabellen og fodre dyrene!', route: '/dyrefodring', class: 'card-zoo' }
];

const orderedGames = computed(() => {
  if (!currentUser.value || !currentUser.value.gameOrder) return allGames;
  
  // Sort based on the saved gameOrder
  return [...allGames].sort((a, b) => {
    const indexA = currentUser.value.gameOrder.indexOf(a.id);
    const indexB = currentUser.value.gameOrder.indexOf(b.id);
    return indexA - indexB;
  });
});

const handleGameClick = (route) => {
  if (draggingId.value) return; // Forhindre klik under træk
  router.push(route);
};

const draggingId = ref(null);

const handleGameDragStart = (event, gameId) => {
  draggingId.value = gameId;
  event.dataTransfer.setData('gameId', gameId);
  event.dataTransfer.effectAllowed = 'move';
};

const handleGameDragOver = (event, targetId) => {
  const sourceId = draggingId.value;
  if (!sourceId || sourceId === targetId || !currentUser.value) return;

  const currentOrder = currentUser.value.gameOrder ? [...currentUser.value.gameOrder] : allGames.map(g => g.id);
  const sourceIndex = currentOrder.indexOf(sourceId);
  const targetIndex = currentOrder.indexOf(targetId);

  if (sourceIndex !== -1 && targetIndex !== -1) {
    currentOrder.splice(sourceIndex, 1);
    currentOrder.splice(targetIndex, 0, sourceId);
    updateUser(currentUser.value.id, { gameOrder: currentOrder });
  }
};

const handleGameDragEnd = () => {
  draggingId.value = null;
};

const handleGameDrop = () => {
  draggingId.value = null;
};

const handleCreateUser = () => {
  if (newUserName.value.trim()) {
    addUser(newUserName.value.trim());
    newUserName.value = '';
    showUserSelect.value = false;
  }
};

const selectAndClose = (id) => {
  selectUser(id);
  showUserSelect.value = false;
};

const confirmDelete = (user) => {
  if (confirm(`Er du sikker på du vil slette ${user.name}?`)) {
    deleteUser(user.id);
  }
};
</script>

<style scoped>
.landing-container {
  padding: 40px 20px;
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif; /* Lidt mere legende font */
  text-align: center;
}

.header {
  margin-bottom: 50px;
}

.bounce-title {
  font-size: 3.5rem;
  color: #FF6B6B;
  text-shadow: 2px 2px 0px #FFE66D;
  margin-bottom: 10px;
  animation: float 3s ease-in-out infinite;
}

.subtitle {
  font-size: 1.5rem;
  color: #555;
  background-color: #f7f9fc;
  display: inline-block;
  padding: 10px 20px;
  border-radius: 20px;
  border: 2px solid #EEE;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  padding: 10px;
}

.game-card {
  background: white;
  border-radius: 25px;
  padding: 30px 20px;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
  border-bottom: 8px solid rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
}

.drag-handle {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 1.2rem;
  color: rgba(0,0,0,0.2);
  cursor: grab;
}

.game-card[draggable="true"]:active {
  cursor: grabbing;
}

.game-card.is-dragging {
  opacity: 0.4; 
  border: 4px dashed #6C5CE7;
  background: rgba(108, 92, 231, 0.05);
  box-shadow: none;
  transform: scale(0.95);
}

.game-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 15px 30px rgba(0,0,0,0.15);
}

.game-card:active {
  transform: translateY(-2px);
  border-bottom-width: 4px;
}

.emoji {
  font-size: 4rem;
  margin-bottom: 10px;
}

.game-card h2 {
  margin: 0;
  font-size: 1.8rem;
  color: #333;
}

.game-card p {
  margin: 0;
  color: #666;
  font-size: 1.1rem;
}

/* Specifikke farver til kortene */
.card-10er {
  background-color: #4ECDC4; /* Turkis */
  border: 4px solid #45b7af;
}
.card-10er h2 { color: #fff; text-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
.card-10er p { color: #e6fffd; }

.card-tal {
  background-color: #FF6B6B; /* Rød/Koral */
  border: 4px solid #ee5253;
}
.card-tal h2 { color: #fff; text-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
.card-tal p { color: #ffe6e6; }

.card-taelle {
  background-color: #FFE66D; /* Gul */
  border: 4px solid #f7d794;
}
.card-taelle h2 { color: #5d5626; }
.card-taelle p { color: #7c7232; }

.card-balloon {
  background-color: #74b9ff; /* Himmelblå */
  border: 4px solid #0984e3;
}
.card-balloon h2 { color: #fff; text-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
.card-balloon p { color: #e6f7ff; }

.card-tog {
    background-color: #a55eea; /* Purple */
    border: 4px solid #8854d0;
}
.card-tog h2 { color: #fff; text-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
.card-tog p { color: #f3e5f5; }

.card-puslespil {
    background-color: #2ecc71; /* Emerald Green */
    border: 4px solid #27ae60;
}
.card-puslespil h2 { color: #fff; text-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
.card-puslespil p { color: #e8f8f5; }

.card-zoo {
    background-color: #f9ca24; /* Yellow/Gold */
    border: 4px solid #f0932b;
}
.card-zoo h2 { color: #5d4037; }
.card-zoo p { color: #7f5539; }

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

/* User Section Styles */
.user-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
  z-index: 100;
}

.user-controls {
  display: flex;
  gap: 15px;
  align-items: center;
}

.profile-link-btn {
  background: #6C5CE7;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 50px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
  transition: all 0.3s ease;
  font-family: inherit;
}

.profile-link-btn:hover {
  transform: scale(1.05);
  background: #5b4bc4;
}

.active-user-badge, .no-user-badge {
  background: white;
  padding: 12px 24px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #EEE;
  transition: all 0.3s ease;
  font-size: 1.2rem;
}

.active-user-badge:hover {
  transform: scale(1.05);
  border-color: #FF6B6B;
}

.user-avatar {
  font-size: 1.5rem;
  background: #f0f0f0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.user-name {
  font-weight: bold;
  color: #333;
}

.arrow {
  color: #999;
  font-size: 0.8rem;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  background: white;
  min-width: 300px;
  border-radius: 20px;
  padding: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  border: 1px solid #EEE;
}

.user-list {
  max-height: 250px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-item:hover {
  background: #f8f9fa;
}

.user-item.active {
  background: #fff0f0;
  border: 1px solid #FF6B6B;
}

.item-avatar {
  font-size: 1.2rem;
}

.item-name {
  flex: 1;
  text-align: left;
  font-weight: 500;
}

.delete-btn {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.2s;
}

.delete-btn:hover {
  color: #FF6B6B;
  background: #fff0f0;
}

.add-user-form {
  display: flex;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #EEE;
}

.add-user-form input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #EEE;
  border-radius: 10px;
  outline: none;
  font-family: inherit;
}

.add-user-form input:focus {
  border-color: #4ECDC4;
}

.add-user-form button {
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
}

.card-shadow {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
