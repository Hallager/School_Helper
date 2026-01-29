<template>
  <div class="game-container">
    <header class="game-header">
      <div class="stat-box">
        <div class="stat-label">Tid</div>
        <div class="stat-value">{{ formattedTime }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Bedste Tid</div>
        <div class="stat-value">{{ formattedBestTime }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Par fundet</div>
        <div class="stat-value">{{ matchedPairs }}/10</div>
      </div>
    </header>

    <div id="game-board">
      <div 
        v-for="card in cards" 
        :key="card.uniqueId" 
        class="card"
        :class="{ flipped: card.isFlipped || card.isMatched, matched: card.isMatched }"
        @click="flipCard(card)"
      >
        <div class="card-inner">
          <div class="card-front" :class="card.c">
            <div>{{ card.v }}</div>
            <div class="suit">{{ card.s }}</div>
          </div>
          <div class="card-back"></div>
        </div>
      </div>
    </div>

    <!-- Overlay / Start / End Screen -->
    <div v-if="showOverlay" id="overlay">
      <h1>{{ titleText }}</h1>
      <p v-html="infoText"></p>
      <button @click="startGame">Start Spil</button>
    </div>

    <!-- Confetti -->
    <div v-if="showConfetti" id="confetti-container">
      <div 
        v-for="n in 50" 
        :key="n" 
        class="confetti-piece"
        :style="getConfettiStyle()"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useUser } from '../composables/useUser'

const { initAudio, sfx } = useAudio()

// State
const cards = ref([])
const matchedPairs = ref(0)
const timerSeconds = ref(0)
const bestTime = ref(localStorage.getItem('venneSpilBestTime'))
const showOverlay = ref(true)
const showConfetti = ref(false)
const titleText = ref("10'er Venner")
const infoText = ref("Find de kort der giver 10 tilsammen!<br>(F.eks. 8 og 2)")

// Internal game state
let timerInterval = null
let flippedCards = [] // holds the card objects currently flipped
let isLocked = false

const basePairs = [
    { v: 1, c: 'red', s: '♥' }, { v: 9, c: 'black', s: '♠' },
    { v: 2, c: 'black', s: '♣' }, { v: 8, c: 'red', s: '♦' },
    { v: 3, c: 'red', s: '♥' }, { v: 7, c: 'black', s: '♠' },
    { v: 4, c: 'black', s: '♣' }, { v: 6, c: 'red', s: '♦' },
    { v: 5, c: 'red', s: '♥' }, { v: 5, c: 'black', s: '♠' }
]

// Computed
const formattedTime = computed(() => formatTime(timerSeconds.value))
const formattedBestTime = computed(() => bestTime.value ? formatTime(parseInt(bestTime.value)) : '--:--')

// Methods
const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
}

const startGame = () => {
    initAudio()
    sfx.click()

    // Reset state
    matchedPairs.value = 0
    flippedCards = []
    isLocked = false
    timerSeconds.value = 0
    showOverlay.value = false
    showConfetti.value = false
    
    // Create and shuffle deck
    cards.value = shuffle(createDeck())
    
    // Start timer
    if (timerInterval) clearInterval(timerInterval)
    const startTime = Date.now()
    timerInterval = setInterval(() => {
        timerSeconds.value = Math.floor((Date.now() - startTime) / 1000)
    }, 1000)
}

const createDeck = () => {
    // Duplicate base pairs to get 20 cards
    let deck = [...basePairs, ...basePairs]
    
    return deck.map((card, index) => ({ 
        ...card, 
        uniqueId: index, // unique ID for v-for key
        // Variation handling for second set
        c: index >= 10 ? (card.c === 'red' ? 'black' : 'red') : card.c,
        s: index >= 10 ? (card.s === '♥' ? '♣' : '♦') : card.s,
        isFlipped: false,
        isMatched: false
    }))
}

const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}

const flipCard = (card) => {
    if (isLocked) return
    if (card.isFlipped || card.isMatched) return
    
    sfx.select()
    // Flip interaction
    card.isFlipped = true
    flippedCards.push(card)
    
    if (flippedCards.length === 2) {
        checkForMatch()
    }
}

const checkForMatch = () => {
    const c1 = flippedCards[0]
    const c2 = flippedCards[1]
    
    // Check sum equals 10
    if (c1.v + c2.v === 10) {
        handleMatch(c1, c2)
    } else {
        unflipCards(c1, c2)
    }
}

const handleMatch = (c1, c2) => {
    isLocked = true
    setTimeout(() => {
        sfx.correct()
        c1.isMatched = true
        c2.isMatched = true
        c1.isFlipped = false // Logic: matched state keeps it visible, flipped param resets for cleaner logic
        c2.isFlipped = false
        
        matchedPairs.value++
        flippedCards = []
        isLocked = false
        
        if (matchedPairs.value === 10) {
            endGame()
        }
    }, 500)
}

const unflipCards = (c1, c2) => {
    isLocked = true
    setTimeout(() => {
        // sfx.wrong()
        c1.isFlipped = false
        c2.isFlipped = false
        flippedCards = []
        isLocked = false
    }, 1000)
}

const endGame = () => {
    clearInterval(timerInterval)
    sfx.win()
    
    const finalTime = timerSeconds.value
    let isNewRecord = false
    
    if (!bestTime.value || finalTime < parseInt(bestTime.value)) {
        bestTime.value = finalTime
        localStorage.setItem('venneSpilBestTime', finalTime)
        isNewRecord = true
    }
    
    titleText.value = isNewRecord ? "Ny Rekord! 🎉" : "Flot klaret!"
    infoText.value = `Du fandt alle 10'er vennerne på ${formatTime(finalTime)}.`
    showOverlay.value = true
    showConfetti.value = true

    const { saveGameResult } = useUser()
    saveGameResult("10'er Venner", 100, { 
        time: finalTime,
        isNewRecord
    })
}

const getConfettiStyle = () => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722']
    return {
        left: Math.random() * 100 + '%',
        top: '-10px',
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        width: Math.random() * 10 + 5 + 'px',
        height: Math.random() * 10 + 5 + 'px',
        animation: `fall ${Math.random() * 3 + 2}s linear infinite`
    }
}

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.game-container {
    --primary: #4CAF50;
    --secondary: #FF9800;
    --bg: #f0f8ff;
    --card-back: #2196F3;
    --text: #333;

    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-height: 80vh;
}

.game-header {
    width: 100%;
    padding: 10px;
    background: white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    display: flex;
    justify-content: space-around;
    align-items: center;
    font-size: 1.2rem;
    color: var(--text);
    margin-bottom: 20px;
    border-radius: 8px;
}

.stat-box { text-align: center; }
.stat-label { font-size: 0.8rem; color: #666; }
.stat-value { font-weight: bold; font-size: 1.2rem; color: var(--primary); }

#game-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    padding: 15px;
    max-width: 600px;
    width: 100%;
    box-sizing: border-box;
}

/* Card Design */
.card {
    background-color: transparent;
    aspect-ratio: 3/4;
    perspective: 1000px;
    cursor: pointer;
    position: relative;
}

.card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    text-align: center;
    transition: transform 0.6s;
    transform-style: preserve-3d;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    border-radius: 10px;
}

.card.flipped .card-inner { transform: rotateY(180deg); }
.card.matched .card-inner { animation: pulse 0.5s ease-in-out; transform: rotateY(180deg); }

.card-front, .card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    font-weight: bold;
    border: 2px solid white;
}

.card-back {
    background: linear-gradient(45deg, var(--card-back), #64b5f6);
    color: white;
    font-size: 2rem;
}
.card-back::after { content: "?"; opacity: 0.5; }

.card-front {
    background-color: white;
    color: var(--text);
    transform: rotateY(180deg);
    font-size: 2.5rem;
    flex-direction: column;
}

.suit { font-size: 1rem; margin-top: 5px; }
.red { color: #e53935; }
.black { color: #333; }

/* Overlay */
#overlay {
    position: fixed;
    top: 60px; left: 0; right: 0; bottom: 0; /* Offset for navbar */
    background: rgba(255,255,255,0.95);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

h1 { color: var(--primary); margin-bottom: 10px; font-size: 2.5rem; text-align: center; }
p { font-size: 1.2rem; text-align: center; max-width: 80%; margin-bottom: 30px; }

button {
    background: var(--secondary);
    color: white;
    border: none;
    padding: 15px 40px;
    font-size: 1.5rem;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 4px 0 #d87f00;
    transition: transform 0.1s;
    font-family: inherit;
}
button:active { transform: translateY(4px); box-shadow: none; }

@keyframes pulse {
    0% { transform: rotateY(180deg) scale(1); }
    50% { transform: rotateY(180deg) scale(1.1); box-shadow: 0 0 15px gold; }
    100% { transform: rotateY(180deg) scale(1); }
}

/* Confetti */
#confetti-container {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none;
    z-index: 50;
    overflow: hidden;
}
.confetti-piece { position: absolute; }

@keyframes fall {
    to { transform: translateY(100vh) rotate(720deg); }
}
</style>
