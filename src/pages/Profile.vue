<template>
  <div class="profile-container">
    <header class="header">
      <button class="back-btn" @click="$router.push('/')">← Tilbage</button>
      <h1>Min Profil</h1>
    </header>

    <div v-if="currentUser" class="profile-card card-shadow">
      <div class="user-info">
        <div class="avatar-edit-container">
          <div class="avatar-large">{{ currentUser.avatar }}</div>
          <div class="avatar-picker-overlay card-shadow">
            <p>Vælg ny avatar:</p>
            <div class="avatar-options">
              <span 
                v-for="emoji in avatars" 
                :key="emoji" 
                class="avatar-option"
                :class="{ selected: currentUser.avatar === emoji }"
                @click="updateAvatar(emoji)"
              >{{ emoji }}</span>
            </div>
          </div>
        </div>
        <div class="user-details">
          <div v-if="isEditingName" class="name-edit-form">
            <input 
              v-model="editedName" 
              class="name-input"
              @keyup.enter="saveName"
              placeholder="Indtast dit navn"
              autoFocus
            />
            <div class="edit-actions">
              <button class="save-btn" @click="saveName">Gem</button>
              <button class="cancel-btn" @click="cancelEditName">Annuller</button>
            </div>
          </div>
          <div v-else class="name-display">
            <h2>{{ currentUser.name }}</h2>
            <button class="edit-name-btn" @click="startEditingName" aria-label="Ret navn">✎</button>
          </div>
          <p>Super Elev 🌟</p>
        </div>
      </div>

      <div class="stats-summary">
        <div class="stat-box">
          <span class="stat-value">{{ currentUser.results.length }}</span>
          <span class="stat-label">Spil Spillet</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">{{ totalScore }}</span>
          <span class="stat-label">Samlet Point</span>
        </div>
      </div>

      <div class="history-section">
        <h3>Seneste Spil</h3>
        <div v-if="currentUser.results.length > 0" class="results-list">
          <div v-for="(res, index) in sortedResults" :key="index" class="result-item">
            <div class="result-game-icon">{{ getGameIcon(res.game) }}</div>
            <div class="result-main">
              <span class="result-game">{{ res.game }}</span>
              <span class="result-date">{{ formatDate(res.timestamp) }}</span>
            </div>
            <div class="result-score">
              <span class="score-val">{{ res.score }}</span>
              <span class="score-unit">{{ getScoreUnit(res.game) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-history">
          <p>Du har ikke spillet nogen spil endnu. Kom i gang! 🚀</p>
        </div>
      </div>
    </div>
    <div v-else class="no-user-warning">
      <p>Vælg venligst en profil på forsiden først.</p>
      <button class="btn-main" @click="$router.push('/')">Gå til forsiden</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUser } from '../composables/useUser';

const { currentUser, updateUser } = useUser();
import { ref } from 'vue';

const isEditingName = ref(false);
const editedName = ref('');

const startEditingName = () => {
  editedName.value = currentUser.value.name;
  isEditingName.value = true;
};

const saveName = () => {
  if (editedName.value.trim()) {
    updateUser(currentUser.value.id, { name: editedName.value.trim() });
    isEditingName.value = false;
  }
};

const cancelEditName = () => {
  isEditingName.value = false;
};

const avatars = ['👤', '🦁', '🐵', '🐼', '🦄', '🦒', '🐙', '🦖', '🚀', '⭐'];

const updateAvatar = (emoji) => {
  updateUser(currentUser.value.id, { avatar: emoji });
};

const sortedResults = computed(() => {
  if (!currentUser.value) return [];
  return [...currentUser.value.results].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
});

const totalScore = computed(() => {
  if (!currentUser.value) return 0;
  return currentUser.value.results.reduce((acc, curr) => acc + curr.score, 0);
});

const formatDate = (isoStr) => {
  const date = new Date(isoStr);
  return date.toLocaleDateString('da-DK', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const getGameIcon = (game) => {
  const icons = {
    'Ballon Jagt': '🎈',
    'Talspillet': '🍎',
    '10\'er Venner': '🔟',
    'Tælle Spil': '🎲',
    'Tal Toget': '🚂',
    'Emoji Puslespil': '🧩',
    'Zoo Fodring': '🦁'
  };
  return icons[game] || '🎮';
};

const getScoreUnit = (game) => {
  if (game === 'Talspillet') return '%';
  return 'pt';
};
</script>

<style scoped>
.profile-container {
  padding: 40px 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.back-btn {
  background: #eee;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #ddd;
}

h1 {
  color: #333;
  margin: 0;
}

.profile-card {
  background: white;
  border-radius: 30px;
  padding: 40px;
  position: relative;
  overflow: hidden;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 40px;
}

.avatar-edit-container {
  position: relative;
  cursor: pointer;
}

.avatar-edit-container:hover .avatar-picker-overlay {
  display: block;
}

.avatar-picker-overlay {
  display: none;
  position: absolute;
  top: 0;
  left: 130px;
  background: white;
  padding: 15px;
  border-radius: 20px;
  min-width: 250px;
  z-index: 10;
  border: 1px solid #eee;
}

.avatar-picker-overlay p {
  margin: 0 0 10px 0;
  font-weight: bold;
  color: #666;
  font-size: 0.9rem;
}

.avatar-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.avatar-option {
  font-size: 1.5rem;
  padding: 5px;
  border-radius: 10px;
  transition: all 0.2s;
  text-align: center;
}

.avatar-option:hover {
  background: #f0f0f0;
  transform: scale(1.1);
}

.avatar-option.selected {
  background: #fff0f0;
  border: 1px solid #FF7675;
}

.avatar-large {
  font-size: 5rem;
  background: #f0f7ff;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 4px solid #fff;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.user-details h2 {
  font-size: 2.5rem;
  margin: 0;
  color: #2D3436;
}

.user-details p {
  color: #00B894;
  font-weight: bold;
  font-size: 1.2rem;
  margin: 5px 0 0 0;
}

.name-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.edit-name-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #B2BEC3;
  opacity: 0.6;
  transition: all 0.2s;
  padding: 5px;
  border-radius: 50%;
}

.edit-name-btn:hover {
  color: #4A90E2;
  background: #f0f0f0;
  opacity: 1;
}

.name-edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 5px;
}

.name-input {
  font-size: 1.5rem;
  padding: 8px 15px;
  border: 2px solid #ddd;
  border-radius: 12px;
  font-family: inherit;
  width: 100%;
  max-width: 300px;
}

.name-input:focus {
  border-color: #4A90E2;
  outline: none;
}

.edit-actions {
  display: flex;
  gap: 10px;
}

.save-btn {
  background: #00B894;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9rem;
}

.cancel-btn {
  background: #FF7675;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9rem;
}

.stats-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 40px;
}

.stat-box {
  flex: 1;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 20px;
  text-align: center;
  border: 2px solid #eee;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #6C5CE7;
}

.stat-label {
  color: #636E72;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.history-section h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border: 1px solid #eee;
  border-radius: 15px;
  transition: transform 0.2s;
}

.result-item:hover {
  transform: translateX(10px);
  border-color: #6C5CE7;
}

.result-game-icon {
  font-size: 2rem;
  min-width: 50px;
  height: 50px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.result-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-game {
  font-weight: bold;
  font-size: 1.1rem;
  color: #2D3436;
}

.result-date {
  font-size: 0.85rem;
  color: #B2BEC3;
}

.result-score {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.score-val {
  font-size: 1.5rem;
  font-weight: bold;
  color: #FF7675;
}

.score-unit {
  font-size: 0.9rem;
  color: #B2BEC3;
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: #999;
}

.no-user-warning {
  text-align: center;
  padding: 100px 20px;
}

.card-shadow {
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
}

.btn-main {
  background: #4A90E2;
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 1.2rem;
  border-radius: 50px;
  cursor: pointer;
  margin-top: 20px;
}
</style>
