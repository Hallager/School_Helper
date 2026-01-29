<template>
  <div class="zoo-container">
    <div class="header">
      <button class="icon-btn" @click="$router.push('/')">❌</button>
      <h1 class="game-title">🦁 Zoo Fodring 🍎</h1>
      <div class="header-stats">
        <div class="round-indicator">Runde: {{ roundsPlayed }} / {{ MAX_ROUNDS }}</div>
        <div class="score">⭐ {{ score }}</div>
      </div>
    </div>

    <!-- MAIN GAME AREA (Side by side) -->
    <div class="main-game-area">
      <!-- MAIN ZOO AREA -->
      <div class="zoo-landscape">
        <!-- Show only the current target animal enclosure -->
        <template v-if="currentTarget && animalData[currentTarget]">
          <div :class="['enclosure', currentTarget, { active: true, 'highlight-error': showErrorHighlight === currentTarget }]"
               @dragover.prevent @drop="handleDrop($event, currentTarget, 'enclosure')">
            
            <!-- Boredom Meter -->
            <div class="boredom-container" :title="'Kedsomhed: ' + boredomLevels[currentTarget] + '%'">
                <div class="boredom-bar" :style="{ width: boredomLevels[currentTarget] + '%' }" :class="{ 'high': boredomLevels[currentTarget] > 60 }"></div>
                <span v-if="boredomLevels[currentTarget] > 60" class="bored-icon">🥱</span>
            </div>
  
            <!-- Task Indicators -->
            <div class="task-indicator" v-if="roundData[currentTarget]?.task === 'clean' && !bowls[currentTarget].taskDone">💩</div>
            
            <div class="animal-bubble" :class="getAnimationClass(currentTarget)">
              <span class="animal-emoji">{{ animalData[currentTarget].icon }}</span>
            </div>
            <div class="label">{{ animalData[currentTarget].name }}</div>
            
            <div class="bowls">
              <!-- Food Bowl -->
              <div class="bowl-wrapper" @dragover.prevent @drop="handleDrop($event, currentTarget, 'food')">
                <div class="bowl food-bowl" :class="{ 'correct': validationResults[currentTarget]?.food }">
                  <div class="items-in-bowl" title="Klik for at fjerne mad">
                    <span v-for="(item, idx) in bowls[currentTarget].food" :key="idx" @click="removeFoodItem(currentTarget, idx)" class="item-in-bowl">{{ getFoodIcon(item) }}</span>
                  </div>
                </div>
                <div class="bowl-label">Mad</div>
              </div>
              
              <!-- Water Bowl -->
              <div class="bowl-wrapper" @dragover.prevent @drop="handleDrop($event, currentTarget, 'water')">
                <div class="bowl water-bowl" 
                     :class="{ 'filled': bowls[currentTarget].water, 'correct': validationResults[currentTarget]?.water }"
                     @click="emptyWater(currentTarget)"
                     title="Klik for at tømme vand">
                  <span v-if="bowls[currentTarget].water" class="water-emoji">💧</span>
                </div>
                <div class="bowl-label">Vand</div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="loading-zoo">Henter næste dyr...</div>
      </div>

      <!-- FEEDING PLAN (CLIPBOARD) -->
      <div class="feeding-plan-container">
        <div class="clipboard">
          <h2 class="plan-title">📋 Fodringsplan</h2>
          <table class="plan-table">
            <thead>
              <tr>
                <th>Dyr</th>
                <th>Type</th>
                <th>Antal</th>
                <th>Vand?</th>
                <th>Opgave</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(animal, id) in animalData" :key="id" :class="{ 'highlight': currentTarget === id }">
                <td>{{ animal.icon }}</td>
                <td>{{ animal.foodIcon }}</td>
                <td class="quantity-cell">
                  {{ roundData[id]?.count || '?' }}
                </td>
                <td>{{ roundData[id]?.water ? '💧 Ja' : '🚫 Nej' }}</td>
                <td>
                  <span v-if="roundData[id]?.task === 'clean'">🧹</span>
                  <span v-else-if="roundData[id]?.task === 'medicine'">💊</span>
                  <span v-else>✅</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- EVENT CARDS INSIDE CLIPBOARD -->
          <div class="event-cards">
            <template v-for="(data, id) in roundData" :key="'card-'+id">
              <div v-if="data.task !== 'none' && !bowls[id].taskDone" 
                   class="event-card" :class="data.task">
                <div class="card-animal">{{ animalData[id].icon }}</div>
                <div class="card-icon">{{ data.task === 'clean' ? '🧹' : '💊' }}</div>
                <div class="card-text">
                    {{ data.task === 'clean' ? 'Gør rent!' : 'Giv medicin!' }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- KITCHEN / TRUCK AREA -->
    <div class="kitchen-area">
      <div class="truck" :class="{ 'truck-animate': truckAnimating }">
        <div class="truck-body">🚚</div>
      </div>
      
      <div class="kitchen-groups">
        <!-- FOOD & WATER GROUP -->
        <div class="kitchen-group">
          <div class="group-label">Mad & Vand</div>
          <div class="kitchen-shelf">
            <div 
              v-for="food in foods" 
              :key="food.id"
              class="food-item draggable" 
              draggable="true"
              @dragstart="handleDragStart($event, food.id)"
            >
              <span class="food-emoji">{{ food.icon }}</span>
            </div>
            
            <div 
              class="food-item draggable water-bucket" 
              draggable="true" 
              @dragstart="handleDragStart($event, 'water_bucket')"
            >
              <span class="food-emoji">🪣</span>
            </div>
          </div>
        </div>

        <!-- INVENTORY GROUP -->
        <div class="kitchen-group" v-if="inventory.length > 0">
          <div class="group-label">Legetøj</div>
          <div class="kitchen-shelf">
            <div 
              v-for="(toy, index) in inventory" 
              :key="'inv-'+index"
              class="food-item draggable toy-item" 
              draggable="true" 
              @dragstart="handleDragStart($event, 'toy', index)"
            >
              <span class="food-emoji">{{ toy.icon }}</span>
            </div>
          </div>
        </div>

        <!-- TOOLS GROUP ... (no change to broom/medicine) -->
        <div class="kitchen-group">
          <div class="group-label">Værktøj</div>
          <div class="kitchen-shelf">
            <div 
              class="food-item draggable broom" 
              draggable="true" 
              @dragstart="handleDragStart($event, 'broom')"
            >
              <span class="food-emoji">🧹</span>
            </div>

            <div 
              class="food-item draggable medicine" 
              draggable="true" 
              @dragstart="handleDragStart($event, 'medicine')"
            >
              <span class="food-emoji">💊</span>
            </div>
          </div>
        </div>
      </div>

      <div class="kitchen-actions">
        <button class="shop-btn" @click="showShop = true">🛒 Butik</button>
        <button class="serve-btn" @click="checkFeeding" :disabled="isVerifying">
          {{ isVerifying ? 'Tjekker...' : 'Servér! 🍽️' }}
        </button>
      </div>
    </div>

    <!-- SHOP MODAL -->
    <div v-if="showShop" class="shop-overlay" @click.self="showShop = false">
      <div class="shop-modal">
        <div class="shop-header">
          <h2>🦁 Zoo Butik 🛍️</h2>
          <button class="close-shop" @click="showShop = false">✕</button>
        </div>
        <p class="shop-intro">Køb legetøj for dine point! Dyrene keder sig hvis de ikke leger.</p>
        <div class="shop-grid">
          <div v-for="toy in availableToys" :key="toy.id" class="shop-item" :class="{ 'too-expensive': score < toy.price }">
            <div class="toy-icon">{{ toy.icon }}</div>
            <div class="toy-name">{{ toy.name }}</div>
            <div class="toy-price">⭐ {{ toy.price }}</div>
            <button class="buy-btn" @click="buyToy(toy)" :disabled="score < toy.price">Køb</button>
          </div>
        </div>
      </div>
    </div>

    <!-- FEEDBACK OVERLAY -->
    <div v-if="feedback" class="feedback-overlay" :class="feedback.type">
      <div class="feedback-content">
        <div class="feedback-emoji">{{ feedback.emoji }}</div>
        <div class="feedback-text">{{ feedback.message }}</div>
      </div>
    </div>

    <!-- WIN OVERLAY -->
    <div v-if="isGameOver" class="win-overlay-zoo">
      <div class="win-content">
        <h1>🎉 Fantastisk Arbejde!</h1>
        <p>Du har fodret alle dyrene i dag!</p>
        <div class="final-score">
          <span>Din Score:</span>
          <span>⭐ {{ score }}</span>
        </div>
        <button class="btn-main-zoo" @click="resetGame">Spil Igen 🔄</button>
        <button class="btn-secondary-zoo" @click="$router.push('/')">Tilbage til Forsiden 🏠</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useUser } from '../composables/useUser'
import { useRouter } from 'vue-router'
import zooVoiceData from '../assets/data/zoo_voice.json'
import zooVoiceMp3 from '../assets/zoo_voice.mp3'

const { sfx, initAudio } = useAudio()
const router = useRouter()

let voiceAudio = null;

const playVoice = (id) => {
  if (!voiceAudio) {
    voiceAudio = new Audio(zooVoiceMp3);
  }
  const clip = zooVoiceData.find(c => c.id === id);
  if (!clip) return;

  voiceAudio.pause();
  voiceAudio.currentTime = clip.start;
  voiceAudio.play();

  // Stop after clip duration
  const duration = (clip.slut - clip.start) * 1000;
  setTimeout(() => {
    // Check if we are still playing this clip
    if (Math.abs(voiceAudio.currentTime - clip.slut) < 0.5) {
        voiceAudio.pause();
    }
  }, duration + 100);
}

const animalVoiceMap = {
  lion: 'id_7_fodr_løverne',
  monkey: 'id_8_fodr_aberne',
  elephant: 'id_9_fodr_elefanterne',
  penguin: 'id_10_fodr_pingvinerne',
  panda: 'id_11_fodr_pandaerne', // Fallback as we don't have new voice clips
  giraffe: 'id_12_fodr_girafferne',
  rabbit: 'id_13_fodr_kaninerne'
}

// --- CONFIG ---
const animalData = {
  lion: { name: 'Løve', icon: '🦁', food: 'meat', foodIcon: '🥩', maxCount: 2 },
  monkey: { name: 'Abe', icon: '🐵', food: 'banana', foodIcon: '🍌', maxCount: 2 },
  elephant: { name: 'Elefant', icon: '🐘', food: 'hay', foodIcon: '🥜', maxCount: 2 },
  penguin: { name: 'Pingvin', icon: '🐧', food: 'fish', foodIcon: '🐟', maxCount: 2 },
  panda: { name: 'Panda', icon: '🐼', food: 'bamboo', foodIcon: '🎋', maxCount: 2 },
  giraffe: { name: 'Giraf', icon: '🦒', food: 'leaves', foodIcon: '🌿', maxCount: 2 },
  rabbit: { name: 'Kanin', icon: '🐰', food: 'carrot', foodIcon: '🥕', maxCount: 2 }
}

const foods = [
  { id: 'meat', icon: '🥩' },
  { id: 'banana', icon: '🍌' },
  { id: 'hay', icon: '🥜' },
  { id: 'fish', icon: '🐟' },
  { id: 'bamboo', icon: '🎋' },
  { id: 'leaves', icon: '🌿' },
  { id: 'carrot', icon: '🥕' }
]

const getFoodIcon = (foodId) => {
  const food = foods.find(f => f.id === foodId)
  return food ? food.icon : '❓'
}

const availableToys = [
  { id: 'ball', name: 'Bold', icon: '⚽', price: 3, boredomReduction: 40 },
  { id: 'rope', name: 'Reb', icon: '🧶', price: 5, boredomReduction: 60 },
  { id: 'trampoline', name: 'Trampolin', icon: '🕴️', price: 10, boredomReduction: 100 },
  { id: 'tire', name: 'Dæk', icon: '🛞', price: 4, boredomReduction: 50 }
]

// --- STATE ---
const score = ref(0)
const truckAnimating = ref(false)
const isVerifying = ref(false)
const showShop = ref(false)
const inventory = reactive([])
const currentTarget = ref(null) // Which animal we are feeding this round
const roundData = reactive({}) // Current requirements
const roundsPlayed = ref(0)
const MAX_ROUNDS = 10
const isGameOver = ref(false)

const boredomLevels = reactive({})
const bowls = reactive({})

// Initialize state for all animals
Object.keys(animalData).forEach(id => {
  boredomLevels[id] = 0
  bowls[id] = { food: [], water: false, taskDone: false }
})
const validationResults = reactive({})
const animationStates = reactive({}) // 'idle', 'hungry', 'happy', 'confused', 'sick', 'bored'
const feedback = ref(null)
const showErrorHighlight = ref(null)

// --- LOGIC ---

const startRound = () => {
  truckAnimating.value = true
  
  // Increase boredom for everyone
  Object.keys(boredomLevels).forEach(id => {
      boredomLevels[id] = Math.min(100, boredomLevels[id] + Math.floor(Math.random() * 15) + 5)
  })

  // Reset bowls
  Object.keys(bowls).forEach(id => {
    bowls[id].food = []
    bowls[id].water = false
    bowls[id].taskDone = false
    animationStates[id] = 'idle'
    validationResults[id] = {}
    
    // Check for high boredom
    if (boredomLevels[id] > 60) {
        animationStates[id] = 'bored'
    }
  })
  feedback.value = null
  showErrorHighlight.value = null

  // Pick one target animal (avoid repeating the last one for variety)
  const animals = Object.keys(animalData)
  const previousAnimal = currentTarget.value
  let nextAnimalId
  
  if (previousAnimal && animals.length > 1) {
    const otherAnimals = animals.filter(id => id !== previousAnimal)
    nextAnimalId = otherAnimals[Math.floor(Math.random() * otherAnimals.length)]
  } else {
    nextAnimalId = animals[Math.floor(Math.random() * animals.length)]
  }
  
  currentTarget.value = nextAnimalId

  // Generate requirements for all animals
  Object.keys(animalData).forEach(id => {
    // Only the current target can have a special task (clean/medicine)
    // Other animals should not have tasks to avoid confusion
    let task = 'none'
    if (id === currentTarget.value) {
        // Higher chance of tasks: 2 out of 3 rounds will have a special task
        const tasks = ['none', 'clean', 'medicine']
        task = tasks[Math.floor(Math.random() * tasks.length)]
    }

    roundData[id] = {
      count: Math.floor(Math.random() * animalData[id].maxCount) + 1,
      water: Math.random() > 0.4, // 60% chance for water
      task: task
    }
    
    // Set animations based on state (medicine trumps hungry/bored)
    if (roundData[id].task === 'medicine') {
        animationStates[id] = 'sick'
    } else if (id === currentTarget.value) {
        animationStates[id] = 'hungry'
    } else if (boredomLevels[id] > 60) {
        animationStates[id] = 'bored'
    } else {
        animationStates[id] = 'idle'
    }
  })

  setTimeout(() => {
    truckAnimating.value = false
    // Play animal prompt voice
    if (currentTarget.value) {
        playVoice(animalVoiceMap[currentTarget.value]);
    }
  }, 2000)
}

const handleDragStart = (event, type, index = null) => {
  event.dataTransfer.setData('type', type)
  if (index !== null) event.dataTransfer.setData('index', index)
}

const buyToy = (toy) => {
    if (score.value >= toy.price) {
        score.value -= toy.price
        inventory.push({ ...toy })
        sfx.select()
    }
}

const handleDrop = (event, animalId, slotType) => {
  const itemType = event.dataTransfer.getData('type')
  const itemIndex = event.dataTransfer.getData('index')
  initAudio()
  
  // HANDLE TOYS
  if (itemType === 'toy' && itemIndex !== null) {
      const toy = inventory[parseInt(itemIndex)]
      boredomLevels[animalId] = Math.max(0, boredomLevels[animalId] - toy.boredomReduction)
      inventory.splice(parseInt(itemIndex), 1)
      sfx.win()
      
      // Update animation state immediately
      if (boredomLevels[animalId] <= 60 && animationStates[animalId] === 'bored') {
          animationStates[animalId] = (animalId === currentTarget.value) ? 'hungry' : 'idle'
      } else {
          animationStates[animalId] = 'happy'
          setTimeout(() => {
              animationStates[animalId] = (animalId === currentTarget.value) ? 'hungry' : 'idle'
          }, 2000)
      }
      return
  }

  // TOOLS (Broom / Medicine) should work anywhere in the enclosure
  if (itemType === 'broom' || itemType === 'medicine') {
    const targetTask = roundData[animalId].task
    if (bowls[animalId].taskDone) return

    if (itemType === 'broom' && targetTask === 'clean') {
        bowls[animalId].taskDone = true
        score.value++
        sfx.select()
        return
    } else if (itemType === 'medicine' && targetTask === 'medicine') {
        bowls[animalId].taskDone = true
        score.value++
        // If it was the current hungry target, keep it hungry, otherwise idle
        animationStates[animalId] = (animalId === currentTarget.value) ? 'hungry' : 'idle'
        sfx.click()
        return
    }
  }

  // FOOD & WATER
  if (slotType === 'food') {
    // Only allow actual food items (not buckets/tools/toys)
    const validFoodIds = foods.map(f => f.id)
    if (!validFoodIds.includes(itemType)) return 
    
    if (bowls[animalId].food.length < 10) {
      bowls[animalId].food.push(itemType)
      sfx.select()
    }
  } else if (slotType === 'water') {
    if (itemType === 'water_bucket') {
      bowls[animalId].water = true
      sfx.click()
    }
  }
}

const removeFoodItem = (animalId, index) => {
  bowls[animalId].food.splice(index, 1)
  sfx.select()
}

const emptyWater = (animalId) => {
  if (bowls[animalId].water) {
    bowls[animalId].water = false
    sfx.click()
  }
}

const checkFeeding = async () => {
  if (isVerifying.value) return
  isVerifying.value = true
  initAudio()

  const id = currentTarget.value
  const targetReq = roundData[id]
  const animal = animalData[id]
  const bowl = bowls[id]

  // Validate
  const foodCount = bowl.food.filter(f => f === animal.food).length
  const onlyCorrectFood = bowl.food.every(f => f === animal.food)
  const countCorrect = foodCount === targetReq.count
  const waterCorrect = bowl.water === targetReq.water
  const taskCorrect = targetReq.task === 'none' || bowl.taskDone

  validationResults[id] = {
    food: countCorrect && onlyCorrectFood,
    water: waterCorrect,
    task: taskCorrect
  }

  if (validationResults[id].food && validationResults[id].water && validationResults[id].task) {
    // CORRECT - Now gives more points!
    score.value += 5
    animationStates[id] = 'happy'
    sfx.correct()

    const positiveClips = ['id_3_flot', 'id_4_rigtigt', 'id_5_godt_klaret'];
    playVoice(positiveClips[Math.floor(Math.random() * positiveClips.length)]);

    roundsPlayed.value++

    if (roundsPlayed.value >= MAX_ROUNDS) {
      const { saveGameResult } = useUser()
      saveGameResult('Zoo Fodring', score.value)
      
      setTimeout(() => {
        isGameOver.value = true
        sfx.win()
      }, 1500)
    }

    feedback.value = {
      type: 'success',
      emoji: '❤️',
      message: 'Flot! ' + animal.name + ' er mæt!'
    }
    
    if (!isGameOver.value) {
      setTimeout(() => {
        startRound()
        isVerifying.value = false
      }, 3000)
    }
  } else {
    // WRONG
    animationStates[id] = 'confused'
    showErrorHighlight.value = id
    sfx.wrong()
    
    // Negative voice feedback
    const negativeClips = ['id_1_prøv_igen', 'id_2_næsten', 'id_6_tjek_planen'];
    playVoice(negativeClips[Math.floor(Math.random() * negativeClips.length)]);

    let msg = 'Hov! Tjek planen igen.'
    if (!countCorrect) msg = 'Forkert antal! Se tabellen.'
    if (!onlyCorrectFood && bowl.food.length > 0) msg = animal.name + ' spiser ikke det!'
    if (!waterCorrect) msg = targetReq.water ? animal.name + ' er tørstig!' : animal.name + ' skal ikke have vand.'
    if (!taskCorrect) msg = targetReq.task === 'clean' ? 'Der skal gøres rent!' : 'Dyret har brug for medicin!'

    feedback.value = {
      type: 'error',
      emoji: '🤔',
      message: msg
    }

    setTimeout(() => {
      feedback.value = null
      animationStates[id] = 'hungry'
      showErrorHighlight.value = null
      isVerifying.value = false
    }, 3000)
  }
}

const getAnimationClass = (id) => {
  return animationStates[id] || 'idle'
}

const resetGame = () => {
  score.value = 0
  roundsPlayed.value = 0
  isGameOver.value = false
  inventory.splice(0, inventory.length)
  Object.keys(boredomLevels).forEach(id => boredomLevels[id] = 0)
  startRound()
}

onMounted(() => {
  startRound()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&display=swap');

.zoo-container {
  min-height: 100vh;
  background: #a8e6cf; /* Soft grass green */
  background-image: radial-gradient(#96d4bd 2px, transparent 2px);
  background-size: 30px 30px;
  font-family: 'Fredoka', cursive;
  display: flex;
  flex-direction: column;
  padding-bottom: 180px; /* Plads til bunden af skærmen */
  user-select: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 20px;
}

.round-indicator {
  font-size: 1.2rem;
  font-weight: bold;
  color: #5d4037;
  background: #f0f0f0;
  padding: 5px 15px;
  border-radius: 20px;
}

.game-title {
  font-size: 2rem;
  color: #2d5a27;
  margin: 0;
}

.icon-btn {
  background: #ff8b94;
  border: none;
  font-size: 1.5rem;
  border-radius: 50%;
  width: 50px; height: 50px;
  cursor: pointer;
  box-shadow: 0 4px 0 #d96e76;
}

.score {
  font-size: 1.5rem;
  background: gold;
  padding: 5px 20px;
  border-radius: 50px;
  font-weight: bold;
  box-shadow: 0 4px 0 #bfa500;
}

/* MAIN GAME AREA */
.main-game-area {
  display: flex;
  flex: 1;
  padding: 20px;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* ZOO LANDSCAPE */
.zoo-landscape {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  min-height: 400px;
}

.loading-zoo {
  font-size: 1.5rem;
  color: #5d4037;
  font-weight: bold;
}

/* Add some paths and trees */
.zoo-landscape::before {
  content: '🌳';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 5rem;
  z-index: 0;
  opacity: 0.6;
}

.enclosure {
  background: #e1f5fe;
  border: 12px solid #8d6e63;
  border-radius: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s;
  padding: 40px;
  z-index: 1;
  box-shadow: 0 10px 0 #6d4c41;
  width: 100%;
  max-width: 500px;
  min-height: 400px;
}

.lion { background: #fff3e0; }
.monkey { background: #efebe9; }
.elephant { background: #f5f5f5; }
.penguin { background: #e0f7fa; }
.panda { background: #f0f0f0; }
.giraffe { background: #fffde7; }
.rabbit { background: #fbe9e7; }

.enclosure.active {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.1), 0 10px 0 #5d4037;
  background: white;
}

.enclosure.highlight-error {
  animation: shake 0.5s;
  border-color: #ff5252;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.animal-bubble {
  width: 100px;
  height: 100px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  box-shadow: 0 8px 15px rgba(0,0,0,0.1);
  margin-bottom: 10px;
  position: relative;
}

.animal-bubble::after {
  content: '';
  position: absolute;
  bottom: -15px;
  left: 20px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 5px rgba(0,0,0,0.05);
}

/* Animations */
.idle { animation: bob 3s infinite ease-in-out; }
.hungry { animation: bounce 0.6s infinite ease-in-out; }
.happy { animation: celebrate 0.5s 3; }
.confused { animation: headShake 0.5s; }

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
@keyframes celebrate {
  0% { transform: scale(1); }
  50% { transform: scale(1.2) rotate(10deg); }
  100% { transform: scale(1); }
}
@keyframes headShake {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-15deg); }
  75% { transform: rotate(15deg); }
}

.sick {
    filter: sepia(0.5) hue-rotate(80deg);
    animation: sickPulse 2s infinite;
}

.bored {
    filter: grayscale(0.5);
    transform: scale(0.9);
}

@keyframes sickPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.boredom-container {
    position: absolute;
    top: 5px;
    left: 20px;
    width: 60px;
    height: 10px;
    background: rgba(0,0,0,0.1);
    border-radius: 5px;
    overflow: hidden;
}

.boredom-bar {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s, background 0.3s;
}

.boredom-bar.high { background: #ff9800; }

.bored-icon {
    position: absolute;
    top: 12px;
    left: 0;
    font-size: 1.5rem;
}

.task-indicator {
    position: absolute;
    top: 10px;
    right: 20px;
    font-size: 2rem;
    z-index: 5;
    animation: bob 2s infinite ease-in-out;
}

.label {
  font-weight: bold;
  font-size: 1.2rem;
  color: #5d4037;
  margin-bottom: 15px;
}

.bowls {
  display: flex;
  gap: 20px;
}

.bowl-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.bowl {
  width: 70px;
  height: 35px;
  background: #bdbdbd;
  border-radius: 0 0 30px 30px;
  border: 4px solid #757575;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.food-bowl { overflow: visible; }
.water-bowl.filled { background: #4fc3f7; border-color: #03a9f4; }

.items-in-bowl {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  position: absolute;
  bottom: 0;
  width: 100%;
}

.items-in-bowl span { font-size: 1.2rem; margin-bottom: 5px; }

.item-in-bowl {
  cursor: pointer;
  transition: transform 0.2s;
}

.item-in-bowl:hover {
  transform: scale(1.3);
  filter: drop-shadow(0 0 5px rgba(255,0,0,0.5));
}

.water-bowl {
  cursor: pointer;
}

.bowl-label { font-size: 0.9rem; color: #5d4037; font-weight: bold; }

/* FEEDING PLAN */
.feeding-plan-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 20px;
  min-width: 300px;
}

.clipboard {
  background: #fff;
  border-radius: 10px;
  padding: 15px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  border-top: 40px solid #5d4037;
  position: relative;
}

.clipboard::before {
  content: '📎';
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
}

.plan-title {
  margin: 0 0 15px 0;
  text-align: center;
  font-size: 1.5rem;
  color: #333;
}

.plan-table {
  width: 100%;
  border-collapse: collapse;
}

.plan-table th {
  background: #f5f5f5;
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #ddd;
}

.plan-table td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  font-size: 1.2rem;
}

.plan-table tr.highlight {
  background: #fff9c4;
}

/* EVENT CARDS */
.event-cards {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
}

.event-card {
    background: #f9f9f9;
    border-radius: 10px;
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    animation: slideIn 0.3s ease-out;
    border-left: 6px solid #ddd;
}

.event-card.clean { border-left-color: #8d6e63; }
.event-card.medicine { border-left-color: #ff5252; }

@keyframes slideIn {
    from { transform: translateX(50px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.card-animal { font-size: 2.5rem; }
.card-icon { font-size: 2rem; }
.card-text { font-weight: bold; color: #333; font-size: 1.1rem; }

/* KITCHEN AREA */
.kitchen-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #f5f5f5;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  border-top: 10px solid #e0e0e0;
  z-index: 100;
  box-shadow: 0 -10px 20px rgba(0,0,0,0.1);
}

.truck {
  position: absolute;
  left: -150px;
  font-size: 5rem;
  transition: transform 2s ease-in-out;
}

.truck-animate {
  transform: translateX(300px);
}

.kitchen-groups {
  display: flex;
  gap: 40px;
  align-items: flex-end;
}

.kitchen-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.group-label {
  font-size: 1rem;
  font-weight: bold;
  color: #5d4037;
  background: white;
  padding: 4px 15px;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
  border: 2px solid #e0e0e0;
}

.kitchen-shelf {
  display: flex;
  gap: 15px;
  background: white;
  padding: 12px;
  border-radius: 20px;
  box-shadow: inset 0 4px 10px rgba(0,0,0,0.05);
  border: 3px solid #eee;
}

.food-item {
  width: 70px;
  height: 70px;
  background: #fff;
  border: 4px solid #eee;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  cursor: grab;
  transition: transform 0.2s;
}

.food-item:hover { transform: scale(1.1); border-color: #ddd; }
.food-item:active { cursor: grabbing; }

.serve-btn {
  padding: 15px 40px;
  font-size: 1.5rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 6px 0 #388e3c;
  font-family: 'Fredoka', cursive;
  font-weight: bold;
}

.serve-btn:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #388e3c;
}

.serve-btn:disabled {
  background: #ccc;
  box-shadow: 0 6px 0 #999;
  cursor: not-allowed;
}

.kitchen-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.shop-btn {
    padding: 10px 20px;
    background: #ff7979;
    color: white;
    border: none;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 0 #cc6666;
    font-size: 1.1rem;
}

.shop-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 #cc6666;
}

/* SHOP MODAL */
.shop-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.shop-modal {
    background: white;
    width: 90%;
    max-width: 500px;
    border-radius: 30px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    border: 8px solid #ff7979;
}

.shop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.close-shop {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #666;
}

.shop-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.shop-item {
    background: #fdf2f2;
    border: 3px solid #ffe6e6;
    border-radius: 20px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.shop-item.too-expensive { opacity: 0.6; }

.toy-icon { font-size: 3rem; }
.toy-name { font-weight: bold; font-size: 1.2rem; }
.toy-price { color: #f9ca24; font-weight: bold; font-size: 1.2rem; }

.buy-btn {
    background: #4caf50;
    color: white;
    border: none;
    padding: 8px 30px;
    border-radius: 50px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 4px 0 #388e3c;
}

.buy-btn:disabled {
    background: #ccc;
    box-shadow: 0 4px 0 #999;
    cursor: not-allowed;
}

/* FEEDBACK OVERLAY */
.feedback-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 30px;
  border-radius: 30px;
  background: white;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  z-index: 100;
  text-align: center;
  min-width: 300px;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.feedback-emoji { font-size: 5rem; margin-bottom: 10px; }
.feedback-text { font-size: 1.8rem; font-weight: bold; color: #333; }

.success { border: 8px solid #4caf50; }
.error { border: 8px solid #ff5252; }

/* WIN OVERLAY */
.win-overlay-zoo {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.win-content {
  background: white;
  padding: 50px;
  border-radius: 40px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  max-width: 500px;
  width: 90%;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.win-content h1 {
  color: #4caf50;
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.final-score {
  font-size: 2rem;
  margin: 30px 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.btn-main-zoo {
  background: #4caf50;
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 1.5rem;
  border-radius: 50px;
  cursor: pointer;
  width: 100%;
  margin-bottom: 15px;
  font-weight: bold;
  box-shadow: 0 6px 0 #2e7d32;
}

.btn-secondary-zoo {
  background: #2196f3;
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1.2rem;
  border-radius: 50px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
}

@media (max-width: 800px) {
  .zoo-landscape { grid-template-columns: 1fr; }
  .game-title { font-size: 1.5rem; }
  .kitchen-area { flex-wrap: wrap; gap: 20px; }
}
</style>
