<template>
  <div class="game-container" :style="{ backgroundColor: currentTheme ? currentTheme.bgColor : '#f0faff' }">
    
    <!-- START SCREEN -->
    <div v-if="gameState === 'start'" class="start-screen">
      <h1 class="title">🧩 Emoji Puslespil</h1>
      <p class="subtitle">Vælg et tema</p>
      
      <div class="theme-grid">
        <button 
          v-for="theme in themeList" 
          :key="theme.id" 
          class="theme-card"
          :style="{ '--theme-color': theme.primaryColor }"
          @click="selectTheme(theme)"
        >
          <span class="theme-icon">{{ theme.icon }}</span>
          <span class="theme-name">{{ theme.name }}</span>
        </button>
      </div>
      
      <button class="nav-btn back-btn" @click="$router.push('/')">↩️ Tilbage</button>
    </div>

    <!-- GAME AREA -->
    <div v-else class="game-area">
      <div class="header">
        <button class="nav-btn back-btn" @click="gameState = 'start'" style="padding: 10px; width: 50px; height: 50px; border-radius: 50%;">❌</button>
        <div class="score">⭐ {{ score }} / 10</div>
      </div>

      <!-- TARGET AREA (THE QUESTION) -->
      <div class="target-zone">
         <div class="puzzle-container" :class="{ 'snapped': isCorrect }">
            <div class="puzzle-piece target" :style="{ '--piece-color': currentTheme.primaryColor }">
            <div class="number-display">{{ targetNumber }}</div>
            <div class="puzzle-knob-hole"></div>
            </div>
            
            <!-- Snapped Option -->
            <div 
                v-if="isCorrect && matchedItem"
                class="puzzle-piece option attached-bottom"
                :style="{ 
                    '--piece-color': 'white', 
                    '--border-color': currentTheme.primaryColor
                }"
            >
                <div class="emoji-grid" :class="'count-' + matchedItem.count">
                    <span v-for="n in matchedItem.count" :key="n">{{ matchedItem.emoji }}</span>
                </div>
                <div class="puzzle-knob-stick"></div>
            </div>
        </div>
      </div>

      <!-- MESSAGE / FEEDBACK -->
      <div class="feedback-text" :class="{ 'visible': feedbackMessage }">
        {{ feedbackMessage }}
      </div>

      <!-- OPTIONS AREA (THE DOCK) -->
      <div class="dock-zone">
        <div class="reader-slot">
             <div class="reader-icon">👂</div>
             <div class="reader-label">Lyt</div>
        </div>

        <div 
          v-for="(option, idx) in currentOptions" 
          :key="option.id"
          class="puzzle-piece option"
          :class="{ 'dragging': draggingId === option.id, 'correct-anim': isCorrect && option.count === targetNumber }"
          :style="{ 
            '--piece-color': 'white', 
            '--border-color': currentTheme.primaryColor,
            visibility: (draggingId === option.id || (isCorrect && matchedItem && matchedItem.id === option.id)) ? 'hidden' : 'visible' 
          }"
          @mousedown="startDrag($event, option)"
          @touchstart.prevent="startDrag($event, option)"
        >
          <div class="emoji-grid" :class="'count-' + option.count">
            <span v-for="n in option.count" :key="n">{{ option.emoji }}</span>
          </div>
          <div class="puzzle-knob-stick"></div>
        </div>
      </div>

      <!-- FLOATING DRAG GHOST (THE VISUAL BEING DRAGGED) -->
      <div 
        v-if="dragState.active"
        class="puzzle-piece dragon"
        :style="{ 
          '--piece-color': 'white', 
          '--border-color': currentTheme.primaryColor,
          transform: `translate(${dragState.x}px, ${dragState.y}px)`
        }"
      >
        <div class="emoji-grid" :class="'count-' + dragState.item.count">
          <span v-for="n in dragState.item.count" :key="n">{{ dragState.item.emoji }}</span>
        </div>
        <div class="puzzle-knob-stick"></div>
      </div>

      <!-- CONFETTI -->
      <div v-if="showConfetti" class="confetti-container">
         <div v-for="n in 50" :key="n" class="confetti" :style="getConfettiStyle()"></div>
      </div>
      <!-- GAME OVER OVERLAY -->
      <div v-if="isGameOver" class="win-overlay">
        <h1>🎉 Du vandt! 🎉</h1>
        <p>Du fik alle 10 rigtige!</p>
        <div class="win-actions">
            <button class="btn-main" @click="resetGame">Spil igen 🔄</button>
            <button class="btn-main btn-secondary" @click="gameState = 'start'">Vælg nyt tema 🎨</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Imports updated
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useUser } from '../composables/useUser'
import numberAudioPath from '../assets/nummbers.mp3'
import feedbackAudioPath from '../assets/balloonHunt.mp3'
import feedbackDataList from '../assets/data/balloonHunt.json'
import audioData from '../assets/data/audioData.json'

// --- CONFIGURATION ---
const themeList = [
    { id: 'farm', name: 'Bondegård', icon: '🐷', emojis: ['🐮', '🐷', '🐔', '🐑', '🚜', '🐴'], bgColor: '#e2f0cb', primaryColor: '#76c893' },
    { id: 'vehicles', name: 'Køretøjer', icon: '🚗', emojis: ['🚗', '🚓', '🚑', '🚒', '🚜', '🚌'], bgColor: '#dff9fb', primaryColor: '#22a6b3' },
    { id: 'fruit', name: 'Frugt & Grønt', icon: '🍎', emojis: ['🍎', '🍌', '🍇', '🍓', '🥕', '🥦'], bgColor: '#ffeaa7', primaryColor: '#fd79a8' },
    { id: 'ocean', name: 'Havet', icon: '🐙', emojis: ['🐟', '🦀', '🐙', '🐬', '🐳', '🐢'], bgColor: '#c7ecee', primaryColor: '#7ed6df' },
    { id: 'fantasy', name: 'Eventyr', icon: '🦄', emojis: ['🦄', '🐉', '👸', '👑', '🧚', '🏰'], bgColor: '#e056fd', primaryColor: '#be2edd' },
    { id: 'forest', name: 'Skoven', icon: '🐻', emojis: ['🦊', '🐻', '🦉', '🍄', '🌲', '🐿️'], bgColor: '#badc58', primaryColor: '#6ab04c' },
    { id: 'space', name: 'Rummet', icon: '🚀', emojis: ['🚀', '👽', '🪐', '⭐', '👨🚀', '🛸'], bgColor: '#30336b', primaryColor: '#f9ca24' },
    { id: 'party', name: 'Slik & Fest', icon: '🍦', emojis: ['🍦', '🎂', '🎈', '🎁', '🍭', '🍩'], bgColor: '#ffbe76', primaryColor: '#ff7979' },
]

// --- STATE ---
const gameState = ref('start')
const currentTheme = ref(null)
const targetNumber = ref(5)
const currentOptions = ref([])
const score = ref(0)
const draggingId = ref(null)
const feedbackMessage = ref('')
const isCorrect = ref(false)
const showConfetti = ref(false)
const matchedItem = ref(null) // New state for the matched item
const isGameOver = ref(false)

// Dragging Logic
const dragState = ref({
    active: false,
    item: null,
    startX: 0, 
    startY: 0,
    x: 0,
    y: 0
})

// Audio
const { initAudio, sfx } = useAudio()
let numAudioObj = null
let feedbackAudioObj = null

const negativeFeedbackIds = ["id_9_prøv_igen", "id_10_hov,_det_var_ikke_den", "id_11_kom_igen", "id_12_næsten", "id_13_prøv_en_gang_til"]
const positiveFeedbackIds = ["id_1_flot", "id_2_rigtigt", "id_3_sådan", "id_4_godt_klaret", "id_5_jubii", "id_6_super", "id_7_hvor_er_du_god", "id_8_fantastisk"]

onMounted(() => {
    numAudioObj = new Audio(numberAudioPath)
    feedbackAudioObj = new Audio(feedbackAudioPath)
})

onUnmounted(() => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchend', onEnd)
})

// --- GAME LOGIC ---

const selectTheme = (theme) => {
    initAudio() // unlock audio context
    sfx.select()
    currentTheme.value = theme
    gameState.value = 'playing'
    score.value = 0
    isGameOver.value = false
    startRound()
}

const resetGame = () => {
    sfx.select()
    score.value = 0
    isGameOver.value = false
    startRound()
}

const startRound = () => {
    isCorrect.value = false
    matchedItem.value = null
    feedbackMessage.value = ''
    showConfetti.value = false
    
    // Pick Target (1-10)
    targetNumber.value = Math.floor(Math.random() * 10) + 1
    
    // Generate Options
    const correctOption = {
        id: 'correct',
        count: targetNumber.value,
        emoji: getRandomEmoji(currentTheme.value)
    }
    
    // Wrong Option 1
    let wrong1Count = getDifferentRandom(targetNumber.value, 1, 10)
    const wrongOption1 = {
        id: 'wrong1',
        count: wrong1Count,
        emoji: getRandomEmoji(currentTheme.value, [correctOption.emoji])
    }
    
    // Wrong Option 2
    let wrong2Count = getDifferentRandom(targetNumber.value, 1, 10, [wrong1Count])
    const wrongOption2 = {
        id: 'wrong2',
        count: wrong2Count,
        emoji: getRandomEmoji(currentTheme.value, [correctOption.emoji, wrongOption1.emoji])
    }
    
    // Shuffle
    currentOptions.value = [correctOption, wrongOption1, wrongOption2].sort(() => Math.random() - 0.5)
}

const getDifferentRandom = (avoid, min, max, avoidList=[]) => {
    let num
    do {
        num = Math.floor(Math.random() * (max - min + 1)) + min
    } while (num === avoid || avoidList.includes(num))
    return num
}

const getRandomEmoji = (theme, exclude=[]) => {
    const pool = theme.emojis.filter(e => !exclude.includes(e))
    // If pool empty (unlikely with 6 emojis and 3 needed), reset
    if (pool.length === 0) return theme.emojis[0]
    return pool[Math.floor(Math.random() * pool.length)]
}

// --- INTERACTION ---

const playNumberSound = (num) => {
    const data = audioData.find(d => d.tal === num)
    if (data && numAudioObj) {
        numAudioObj.currentTime = data.start
        numAudioObj.play().catch(e => {})
        setTimeout(() => numAudioObj.pause(), (data.slut - data.start) * 1000)
    }
}

const playFeedback = (type) => {
    if (!feedbackAudioObj) return
    
    let list = type === 'positive' ? positiveFeedbackIds : negativeFeedbackIds
    let randomId = list[Math.floor(Math.random() * list.length)]
    
    const data = feedbackDataList.find(d => d.id === randomId)
    if (data) {
        feedbackAudioObj.currentTime = data.start
        feedbackAudioObj.play().catch(e => {})
        // Stop logic if needed, usually short enough clips
        setTimeout(() => feedbackAudioObj.pause(), (data.slut - data.start) * 1000 + 200) // +200ms buffer
    }
}

const startDrag = (event, item) => {
    if (isCorrect.value) return // Block if already winning
    
    // Removed immediate audio trigger
    // playNumberSound(item.count) 
    
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY
    
    draggingId.value = item.id
    dragState.value = {
        active: true,
        item: item,
        startX: clientX,
        startY: clientY,
        x: clientX,
        y: clientY
    }
    
    // Attach global listeners
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchend', onEnd)
}

const onMove = (event) => {
    if (!dragState.value.active) return
    if (event.cancelable) event.preventDefault() // Prevent scroll on mobile
    
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY
    
    dragState.value.x = clientX
    dragState.value.y = clientY
}

const onEnd = (event) => {
    if (!dragState.value.active) return
    
    const droppedItem = dragState.value.item
    const dropX = dragState.value.x
    const dropY = dragState.value.y
    
    // Check collision with Target Zone
    const targetEl = document.querySelector('.target-zone')
    let hitTarget = false

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect()
        
        // Simple hitbox with buffer
        if (
            dropX > rect.left - 50 && 
            dropX < rect.right + 50 && 
            dropY > rect.top - 50 && 
            dropY < rect.bottom + 50
        ) {
            checkMatch(droppedItem)
            hitTarget = true
        } 
    }
    
    // Check collision with Reader Slot (lyt-zone)
    if (!hitTarget) {
        const readerEl = document.querySelector('.reader-slot')
        if (readerEl) {
            const rRect = readerEl.getBoundingClientRect()
             if (dropX > rRect.left && dropX < rRect.right && dropY > rRect.top && dropY < rRect.bottom) {
                 playNumberSound(droppedItem.count)
                 hitTarget = true // Treat as "handled" so no negative feedback
             }
        }
    }
    
    if (!hitTarget) {
         // Check if dropped back in dock (Silent return)
         // ... existing dock logic
         const dockEl = document.querySelector('.dock-zone')
         let inDock = false
         
         if (dockEl) {
             const dRect = dockEl.getBoundingClientRect()
             if (dropX > dRect.left && dropX < dRect.right && dropY > dRect.top && dropY < dRect.bottom) {
                 inDock = true
             }
         }

         if (!inDock) {
             // Return to dock with feedback (only if dropped in void)
             playFeedback('negative') 
         }
    }
    
    // Reset
    draggingId.value = null
    dragState.value.active = false
    
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchend', onEnd)
}

const checkMatch = (item) => {
    if (item.count === targetNumber.value) {
        // Correct
        isCorrect.value = true
        matchedItem.value = item // Store matched item for "Snap" visual
        score.value++
        sfx.win()
        setTimeout(() => {
             playFeedback('positive')
        }, 1000) // Delay to let the win sound finish first
        feedbackMessage.value = "Fantastisk!"
        showConfetti.value = true
        
        // Check if game finished (10 rounds)
        if (score.value >= 10) {
            setTimeout(() => {
                isGameOver.value = true
                showConfetti.value = true // Ensure confetti keeps going

                const { saveGameResult } = useUser()
                saveGameResult("Emoji Puslespil", score.value, { theme: currentTheme.value.name })
            }, 1500)
        } else {
            setTimeout(() => {
                startRound()
            }, 3000)
        }
    } else {
        // Wrong
        // sfx.wrong()  
        playFeedback('negative') // Play "Prøv igen"
        feedbackMessage.value = "Prøv igen!"
        setTimeout(() => feedbackMessage.value = '', 1000)
    }
}

// Confetti Helper
const getConfettiStyle = () => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']
    return {
        left: Math.random() * 100 + '%',
        top: -20 + 'px',
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        animation: `fall ${Math.random() * 2 + 1}s linear infinite`,
        animationDelay: Math.random() + 's'
    }
}

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&display=swap');

.game-container {
  width: 100%;
  min-height: 100vh;
  font-family: 'Fredoka', 'Comic Sans MS', sans-serif;
  overflow: hidden;
  user-select: none;
  transition: background-color 0.5s;
}

/* --- START SCREEN --- */
.start-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    height: 100vh;
    box-sizing: border-box;
    overflow-y: auto;
}

.title {
    font-size: 2.5rem;
    color: #444;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
}
.subtitle {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 2rem;
}

.theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    width: 100%;
    max-width: 800px;
    padding-bottom: 2rem;
}

.theme-card {
    background: white;
    border: 4px solid var(--theme-color);
    border-radius: 20px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 0 rgba(0,0,0,0.1);
}

.theme-card:hover { 
    transform: translateY(-5px);
    box-shadow: 0 8px 0 rgba(0,0,0,0.1);
}
.theme-card:active {
    transform: translateY(0);
    box-shadow: 0 2px 0 rgba(0,0,0,0.1);
}

.theme-icon { font-size: 3rem; }
.theme-name { font-weight: 600; color: #444; }

/* .back-btn styles removed and handled by global App.vue styles */

/* --- GAME AREA --- */
.game-area {
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: relative;
}

.header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.icon-btn {
    background: rgba(255,255,255,0.5);
    border: none;
    font-size: 1.5rem;
    border-radius: 50%;
    width: 50px; height: 50px;
    cursor: pointer;
}
.score {
    font-size: 1.5rem;
    font-weight: bold;
    background: white;
    padding: 5px 15px;
    border-radius: 20px;
    box-shadow: 0 4px 0 rgba(0,0,0,0.1);
}

/* TARGET ZONE */
.target-zone {
    flex: 1; /* Still takes available vertical space */
    display: flex;
    justify-content: center;
    align-items: flex-start; /* Align to top to give predictable anchor */
    padding-top: 40px; /* Push down slightly */
    min-height: 350px; /* Ensure enough space for combined puzzle */
}

.puzzle-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.3s;
    position: relative; /* Anchor for absolute positioning */
}
.puzzle-container.snapped {
    animation: bounceSuccess 0.5s;
}
@keyframes bounceSuccess {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.attached-bottom {
    position: absolute;
    top: 100%; /* Position naturally below target */
    margin-top: -20px; /* Overlap slightly to look connected */
    z-index: 0; /* Behind target if needed, or fine as is */
    pointer-events: none; /* No interacting with solved puzzle */
}

/* DOCK ZONE */
.dock-zone {
    height: 250px;
    background: rgba(255,255,255,0.4);
    backdrop-filter: blur(10px);
    border-radius: 30px 30px 0 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
}

.reader-slot {
    width: 100px;
    height: 100px;
    border: 3px dashed rgba(0,0,0,0.2);
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: rgba(0,0,0,0.5);
    margin-right: 20px;
    background: rgba(255,255,255,0.3);
}
.reader-icon {
    font-size: 3rem;
}
.reader-label {
    font-size: 1rem;
    font-weight: bold;
}

/* PUZZLE PIECES */
.puzzle-piece {
    width: 140px;
    height: 140px;
    background-color: var(--piece-color);
    border: 4px solid var(--border-color, rgba(0,0,0,0.1));
    border-radius: 15px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 6px 0 rgba(0,0,0,0.1);
}

.target {
    width: 180px;
    height: 180px;
    font-size: 6rem;
    font-weight: bold;
    color: white;
    text-shadow: 3px 3px 0 rgba(0,0,0,0.2);
    /* For Target, we want a "HOLE" at bottom */
}

/* Knob/Hole Visuals using Psuedo elements */
.puzzle-knob-hole {
    position: absolute;
    bottom: -20px;
    width: 40px;
    height: 40px;
    background-color: var(--piece-color); /* Same as parent to look 'inward' ?? No, hole means cut out. */
    /* Actually for CSS "Hole", we need mask or complex bg. 
       Let's do "Inverted Knob" visual: A dark circle to simulate a hole. */
    background-color: rgba(0,0,0,0.15); /* Shadow colour */
    border-radius: 50%;
    /* To make it look like a cutout: top half inside, bottom half out? */
    bottom: 5px; /* Move up inside */
    box-shadow: inset 0 3px 5px rgba(0,0,0,0.2);
}

.puzzle-knob-stick {
    position: absolute;
    top: -24px;
    width: 40px;
    height: 40px;
    background-color: var(--piece-color);
    border: 4px solid var(--border-color, rgba(0,0,0,0.1));
    border-bottom: none;
    border-radius: 50%;
    z-index: 1;
}

.option {
    cursor: grab;
    transition: transform 0.1s;
}
.option:active {
    cursor: grabbing;
}

/* Emoji Grid Layouts */
.emoji-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    width: 100%; 
    height: 100%;
    padding: 10px;
    box-sizing: border-box;
    font-size: 2rem;
    line-height: 1;
}
/* Adjust sizing based on count */
.count-1 { font-size: 4rem; }
.count-2, .count-3, .count-4 { font-size: 2.5rem; }
.count-5, .count-6, .count-7, .count-8, .count-9 { font-size: 1.8rem; }
.count-10 { font-size: 1.5rem; }

/* Drag Ghost */
.dragon {
    position: fixed;
    top: 0; left: 0;
    pointer-events: none;
    z-index: 1000;
    margin-left: -70px; /* Center ghost on finger */
    margin-top: -70px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    opacity: 0.9;
    transform-origin: center center;
    /* Animation removed to prevent transform conflict */
}

.feedback-text {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 4rem;
    font-weight: bold;
    color: white;
    text-shadow: 0 4px 10px rgba(0,0,0,0.3);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s, transform 0.3s;
    z-index: 20;
}
.feedback-text.visible {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2);
}

/* Animations */
.correct-anim {
    animation: celebrate 0.5s ease-in-out;
}
@keyframes celebrate {
    0% { transform: scale(1); }
    50% { transform: scale(1.2) rotate(10deg); }
    100% { transform: scale(1); }
}

/* Mobile Responsive */
@media (max-width: 600px) {
    .dock-zone { height: 180px; gap: 10px; }
    .puzzle-piece { width: 90px; height: 90px; }
    .target { width: 140px; height: 140px; }
    .dragon { margin-left: -45px; margin-top: -45px; } /* Adjust for smaller size */
    
    .emoji-grid { font-size: 1.5rem; }
    .count-1 { font-size: 3rem; }
}

/* Confetti */
.confetti {
  position: absolute;
  width: 10px; height: 10px;
}
@keyframes fall {
  to { transform: translateY(100vh) rotate(720deg); }
}

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
    min-width: 300px;
}
.win-actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-top: 20px;
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
}
.btn-secondary {
    background: #3498db;
}
</style>
