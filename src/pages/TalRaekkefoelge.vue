<template>
  <div class="game-container">
    <!-- START SCREEN -->
    <div v-if="gameState === 'start'" class="start-screen">
      <h1 class="title">🚂 Tal Toget</h1>
      <p class="subtitle">Vælg en bane og hjælp toget med at køre!</p>
      
      <div class="level-grid">
        <button 
          v-for="lvl in levels" 
          :key="lvl.id" 
          class="level-card"
          @click="startLevel(lvl)"
        >
          <span class="level-icon">🎫</span>
          <span class="level-name">{{ lvl.name }}</span>
        </button>
      </div>

      <button class="back-btn" @click="$router.push('/')">⬅ Tilbage</button>
    </div>

    <!-- PLAYING SCREEN -->
    <div v-if="gameState === 'playing'" class="play-area">
      <div class="header-bar">
        <button class="btn-small" @click="gameState = 'start'">❌ Stop</button>
        <div class="level-info">Bane: {{ currentLevel?.name }}</div>
      </div>

      <!-- TRAIN TRACK AREA -->
      <div class="train-container" :class="{ 'train-departing': isWon }">
        <div class="locomotive">
            <div class="chimney">☁️</div>
            🚂
        </div>
        <div class="wagons">
            <div 
                v-for="(slot, idx) in slots" 
                :key="idx" 
                class="wagon" 
                :class="{ 'filled': slot.filled }"
                @dragover.prevent 
                @drop="handleDrop($event, idx)"
                @click="handleSlotClick(idx)"
            >
                <div v-if="slot.filled" class="luggage-in-wagon">{{ slot.value }}</div>
                <div v-else class="empty-slot-number"> </div>
            </div>
        </div>
      </div>

      <!-- INSTRUCTION -->
      <p class="instruction" v-if="!isWon">
        Træk kufferterne op på de rigtige vogne!
        <span v-if="shouldPlayAudio">Tryk for at høre tallet.</span>
      </p>

      <!-- STATION / LUGGAGE AREA -->
      <div class="platform" v-if="!isWon">
        <transition-group name="pop" tag="div" class="luggage-pile">
            <div 
                v-for="item in draggables" 
                :key="item.id"
                class="luggage-item"
                draggable="true"
                @dragstart="handleDragStart($event, item)"
                @mousedown="playNumberAudio(item.value)"
                :style="{ backgroundColor: item.color }"
            >
                {{ item.value }}
                <div class="handle"></div>
            </div>
        </transition-group>
      </div>

      <!-- WIN OVERLAY -->
      <div v-if="showWinMessage" class="win-overlay">
        <h1>🎉 Godt gået! 🎉</h1>
        <p>Toget kører afsted!</p>
        <button class="btn-main" @click="gameState = 'start'">Vælg ny bane</button>
      </div>
    </div>
    
    <!-- Confetti -->
    <div v-if="showConfetti" class="confetti-container">
        <div v-for="n in 30" :key="n" class="confetti" :style="getConfettiStyle()"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useUser } from '../composables/useUser'
import numberAudioPath from '../assets/nummbers.mp3'
import dropAudioPath from '../assets/dropping-bag.mp3'
import whistleAudioPath from '../assets/train-whistle.mp3'
import audioData from '../assets/data/audioData.json'

const { initAudio, sfx } = useAudio()

// --- STATE ---
const gameState = ref('start') // start, playing
const currentLevel = ref(null)
const slots = ref([])
const draggables = ref([])
const isWon = ref(false)
const showWinMessage = ref(false)
const showConfetti = ref(false)
let numberAudio = null
let dropAudio = null
let whistleAudio = null

// --- AUDIO DATA ---
const dropAudioData = [
  {
    "id": "id_0_drop0",
    "tekst": "drop0",
    "start": 0.473,
    "slut": 0.769
  },
  {
    "id": "id_1_drop1",
    "tekst": "drop1",
    "start": 1.553,
    "slut": 1.801
  }
]

// --- CONFIG ---
const levels = [
    { id: 1, name: "1 - 10", sequence: Array.from({length: 10}, (_, i) => i + 1) },
    { id: 2, name: "1 - 20", sequence: Array.from({length: 20}, (_, i) => i + 1) },
    { id: 3, name: "10-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 10) },
    { id: 4, name: "2-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 2) },
    { id: 5, name: "3-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 3) },
    { id: 6, name: "4-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 4) },
    { id: 7, name: "5-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 5) },
    { id: 8, name: "6-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 6) },
    { id: 9, name: "7-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 7) },
    { id: 10, name: "8-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 8) },
    { id: 11, name: "9-tabellen", sequence: Array.from({length: 10}, (_, i) => (i + 1) * 9) },
]

const luggageColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#54A0FF', '#5F27CD', '#FF9FF3']

// --- AUDIO SETUP ---
onMounted(() => {
    numberAudio = new Audio(numberAudioPath)
    dropAudio = new Audio(dropAudioPath)
    whistleAudio = new Audio(whistleAudioPath)
})

const shouldPlayAudio = computed(() => {
    if (!currentLevel.value) return false
    // Check if we have audio for all numbers in this level's sequence
    return currentLevel.value.sequence.every(num => audioData.some(d => d.tal === num))
})

const playNumberAudio = (num) => {
    if (!shouldPlayAudio.value) {
        // Just a click sound if disabled
        sfx.select()
        return 
    }

    const data = audioData.find(d => d.tal === num)
    if (data && numberAudio) {
        numberAudio.currentTime = data.start
        numberAudio.play().catch(e => console.error(e))
        setTimeout(() => numberAudio.pause(), (data.slut - data.start) * 1000)
    } else {
        sfx.select() // Fallback
    }
}

const playDropSound = () => {
    if (!dropAudio) return
    
    // Pick random drop sound
    const soundData = dropAudioData[Math.floor(Math.random() * dropAudioData.length)]
    
    dropAudio.currentTime = soundData.start
    dropAudio.play().catch(e => console.error(e))
    setTimeout(() => dropAudio.pause(), (soundData.slut - soundData.start) * 1000)
}

// --- GAME LOGIC ---
const startLevel = (lvl) => {
    initAudio()
    sfx.click()
    currentLevel.value = lvl
    isWon.value = false
    showWinMessage.value = false
    showConfetti.value = false
    
    // Create slots
    slots.value = lvl.sequence.map((val) => ({
        targetValue: val,
        filled: false,
        value: null
    }))

    // Create draggables (shuffled)
    draggables.value = lvl.sequence.map((val, idx) => ({
        id: idx,
        value: val,
        color: luggageColors[idx % luggageColors.length]
    })).sort(() => Math.random() - 0.5)

    gameState.value = 'playing'
}

const handleDragStart = (evt, item) => {
    evt.dataTransfer.dropEffect = 'move'
    evt.dataTransfer.effectAllowed = 'move'
    evt.dataTransfer.setData('itemId', item.id)
    evt.dataTransfer.setData('itemValue', item.value)
}

const handleDrop = (evt, slotIdx) => {
    const itemValue = parseInt(evt.dataTransfer.getData('itemValue'))
    const itemId = parseInt(evt.dataTransfer.getData('itemId'))
    
    checkMove(itemValue, itemId, slotIdx)
}

// Also support click-to-move for accessibility/mobile
const selectedItem = ref(null) // For click logic if implemented later, currently drag-only primarily

const checkMove = (val, id, slotIdx) => {
    const slot = slots.value[slotIdx]
    
    // If slot is already filled, ignore
    if (slot.filled) return

    // Check if correct value
    if (val === slot.targetValue) {
        // Correct!
        playDropSound() // Play drop sound
       // sfx.correct()   // Optional: keep existing success sound or remove if 'drop' is enough. Keeping for feedback reinforcement.
        slot.filled = true
        slot.value = val
        
        // Remove from draggables
        draggables.value = draggables.value.filter(i => i.id !== id)
        
        // Play number sound immediately to reinforce?
        // if (shouldPlayAudio.value) playNumberAudio(val)

        checkWin()
    } else {
        // Wrong
        sfx.wrong()
    }
}

const checkWin = () => {
    if (slots.value.every(s => s.filled)) {
        isWon.value = true
        sfx.win()
        
        if (whistleAudio) {
            whistleAudio.currentTime = 0
            whistleAudio.play().catch(e => console.error("Whistle play error:", e))
        }

        setTimeout(() => {
            showConfetti.value = true
            showWinMessage.value = true

            const { saveGameResult } = useUser()
            saveGameResult('Tal Toget', slots.value.length, {
                level: currentLevel.value.name,
                sequenceLength: currentLevel.value.sequence.length
            })
        }, 1500) // Wait for train to drive a bit
    }
}

// -- FX --
const getConfettiStyle = () => {
     return {
        left: Math.random() * 100 + '%',
        top: -10 + '%',
        backgroundColor: luggageColors[Math.floor(Math.random() * luggageColors.length)],
        animation: `fall ${2 + Math.random() * 3}s linear infinite`
    }
}

</script>

<style scoped>
.game-container {
    padding: 20px;
    max-width: 1000px;
    margin: 0 auto;
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
    text-align: center;
    min-height: 80vh;
}

/* START SCREEN */
.title {
    font-size: 3rem;
    color: #5F27CD;
    margin-bottom: 2rem;
}
.level-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
}
.level-card {
    background: white;
    border: 3px solid #54A0FF;
    border-radius: 15px;
    padding: 20px;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}
.level-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 0 #2e86de;
}
.level-icon { font-size: 2rem; }
.level-name { font-weight: bold; font-size: 1.1rem; color: #333; }

/* PLAYING AREA */
.header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.btn-small {
    background: #FF6B6B;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
}

/* TRAIN */
.train-container {
    display: flex;
    align-items: flex-end;
    overflow-x: auto;
    padding-bottom: 20px;
    margin-bottom: 40px;
    border-bottom: 4px dashed #999;
}
.locomotive {
    font-size: 5rem;
    margin-right: 10px;
    position: relative;
    z-index: 2;
}
.chimney {
    position: absolute;
    top: -30px; left: 10px;
    font-size: 2rem;
    animation: puff 2s infinite;
}
@keyframes puff {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
}

.wagons {
    display: flex;
    gap: 5px;
}
.wagon {
    width: 60px;
    height: 70px;
    background: #546de5;
    border: 3px solid #3c40c6;
    border-top: none; /* Open top like a flatbed */
    border-radius: 5px 5px 15px 15px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    position: relative;
    margin-right: 2px;
}
.wagon::after { /* Wheels */
    content: 'OO';
    position: absolute;
    bottom: -15px;
    letter-spacing: 25px;
    color: #333;
    font-size: 1rem;
    font-weight: bold;
}
.wagon::before { /* Connector */
    content: '';
    position: absolute;
    left: -8px;
    bottom: 15px;
    width: 8px;
    height: 4px;
    background: #333;
}

.empty-slot-number {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5rem;
    color: rgba(255,255,255,0.3);
    font-weight: bold;
    pointer-events: none;
}
.luggage-in-wagon {
    width: 50px;
    height: 40px;
    background: #feca57;
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    animation: dropIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* PLAYFORM */
.platform {
    background: #dcdde1;
    padding: 20px;
    border-radius: 20px;
    min-height: 200px;
    border-top: 10px solid #bdc3c7;
}
.luggage-pile {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
}
.luggage-item {
    width: 60px;
    height: 50px;
    border: 2px solid rgba(0,0,0,0.1);
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    font-weight: bold;
    color: white;
    cursor: grab;
    position: relative;
    box-shadow: 3px 3px 0 rgba(0,0,0,0.1);
    user-select: none;
}
.luggage-item:active { cursor: grabbing; transform: scale(1.1); z-index: 10; }
.handle {
    position: absolute;
    top: -6px;
    width: 20px;
    height: 6px;
    border: 2px solid rgba(0,0,0,0.2);
    border-radius: 4px 4px 0 0;
}

/* ANIMATIONS */
.train-departing {
    animation: driveOff 3s forwards ease-in;
}
@keyframes driveOff {
    0% { transform: translateX(0); }
    10% { transform: translateX(20px); } /* backup slightly */
    100% { transform: translateX(-2000px); }
}

@keyframes dropIn {
    0% { transform: translateY(-50px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

.pop-enter-active, .pop-leave-active { transition: all 0.3s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0); }

.win-overlay {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
    text-align: center;
    z-index: 100;
    border: 5px solid #2ECC71;
}
.btn-main {
    background: #2ECC71;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 1.2rem;
    border-radius: 30px;
    cursor: pointer;
    font-weight: bold;
    margin-top: 15px;
}

/* Confetti */
.confetti {
    position: fixed;
    width: 10px; height: 10px;
    z-index: 999;
}
@keyframes fall {
    to { top: 110%; transform: rotate(720deg); }
}
</style>
