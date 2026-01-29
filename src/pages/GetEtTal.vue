<template>
  <div class="container">
    <!-- Start Screen -->
    <div v-if="gameState === 'start'" id="start-screen">
      <h1>🍎 Talspillet</h1>
      <p>Lyt til tallet og tryk på den rigtige knap!</p>
      <p>Kan du klare 10 runder?</p>
      <div class="highscore-box">
        🏆 Bedste Score: <span>{{ bestScoreDisplay }}</span>
      </div>
      <button class="btn-main" @click="startGame">Start Spil</button>
      
      <div class="range-selector">
        <p>Vælg talområde:</p>
        <div class="range-buttons">
          <button 
            :class="{ active: selectedRange === '1-10' }" 
            @click="selectedRange = '1-10'; sfx.click()"
          >1-10</button>
          <button 
            :class="{ active: selectedRange === '10-20' }" 
            @click="selectedRange = '10-20'; sfx.click()"
          >10-20</button>
        </div>
      </div>
    </div>

    <!-- Game Area -->
    <div v-if="gameState === 'playing'" id="game-area">
      <div class="stats-bar">
        <span>Tid: <span>{{ timerSeconds }}</span>s</span>
        <span>Runde: <span>{{ currentRound }}</span>/{{ totalRounds }}</span>
      </div>
      
      <div class="progress">
        <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      </div>

      <button class="speaker-btn" @click="speakCurrentNumber">
        🔊
      </button>
      <p>Tryk på højtaleren for at høre tallet igen</p>

      <div class="choices">
        <div 
          v-for="(num, index) in options" 
          :key="index"
          class="number-card"
          :class="{ pop: num.state === 'correct', shake: num.state === 'wrong' }"
          @click="handleGuess(num)"
        >
          {{ num.val }}
        </div>
      </div>
    </div>

    <!-- End Screen -->
    <div v-if="gameState === 'ended'" id="end-screen">
      <h1>🎉 Flot klaret!</h1>
      <div style="font-size: 4rem; margin: 20px;">⭐</div>
      <p>Du gættede rigtigt <span>{{ accuracy }}</span>% af gangene.</p>
      <p>Din tid: <span>{{ timerSeconds }}</span> sekunder.</p>
      <p>Forkerte gæt: <span>{{ wrongGuesses }}</span></p>
      <button class="btn-main" @click="resetGame">Spil Igen</button>
    </div>

    <!-- Confetti Overlay -->
    <div v-if="showConfetti" id="confetti">
        <div 
            v-for="n in 30" 
            :key="n" 
            class="confetti-piece"
            :style="getConfettiStyle()"
        >🎉</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useUser } from '../composables/useUser'
import numberAudioPath from '../assets/nummbers.mp3'

const { initAudio, sfx } = useAudio()

const totalRounds = 10
const gameState = ref('start') // start, playing, ended
const currentRound = ref(1)
const timerSeconds = ref(0)
const wrongGuesses = ref(0)
const correctClicks = ref(0)
const totalClicks = ref(0)
const bestScore = ref(localStorage.getItem('mathGameBestTime'))
const showConfetti = ref(false)

const targetNumber = ref(0)
const options = ref([]) // Array of { val: number, state: string }
const selectedRange = ref('1-10')

let timerInterval = null
let startTime = 0 // Fixed: Ensure startTime is declared

// Computed properties
const bestScoreDisplay = computed(() => bestScore.value ? bestScore.value + "s" : "Ingen endnu")
const progressPercent = computed(() => ((currentRound.value - 1) / totalRounds) * 100)
const accuracy = computed(() => Math.round((correctClicks.value / totalClicks.value) * 100) || 0)

// Custom Audio Setup
let numberAudio = null
let stopAudioTimeout = null

import { onMounted } from 'vue'

onMounted(() => {
    numberAudio = new Audio(numberAudioPath)
})

const startGame = () => {
  initAudio()
  sfx.click()
  gameState.value = 'playing'
  currentRound.value = 0
  wrongGuesses.value = 0
  correctClicks.value = 0
  totalClicks.value = 0
  timerSeconds.value = 0
  showConfetti.value = false

  startTime = Date.now()
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    timerSeconds.value = Math.floor((Date.now() - startTime) / 1000)
  }, 1000)

  nextRound()
}

const nextRound = () => {
  if (currentRound.value >= totalRounds) {
    endGame()
    return
  }

  currentRound.value++
  
  // 1. New Target
  const min = selectedRange.value === '1-10' ? 1 : 10
  const max = selectedRange.value === '1-10' ? 10 : 20
  const range = max - min + 1

  let newTarget
  do {
    newTarget = Math.floor(Math.random() * range) + min
  } while (newTarget === targetNumber.value && range > 1)
  
  targetNumber.value = newTarget

  // 2. Generate Options
  let opts = [targetNumber.value]
  while (opts.length < 3) {
    let r = Math.floor(Math.random() * range) + min
    if (!opts.includes(r)) {
      opts.push(r)
    }
  }
  // Shuffle
  opts.sort(() => Math.random() - 0.5)
  
  options.value = opts.map(val => ({ val, state: 'normal' }))

  // 3. Speak (delayed slightly)
  setTimeout(speakCurrentNumber, 500)
}

import audioData from '../assets/data/audioData.json'

const speakCurrentNumber = () => {
    // Stop any currently playing sound
    if (numberAudio) {
        numberAudio.pause()
        if (stopAudioTimeout) clearTimeout(stopAudioTimeout)

        const data = audioData.find(d => d.tal === targetNumber.value)
        
        if (data) {
            numberAudio.currentTime = data.start
            numberAudio.play().catch(e => console.error("Audio play failed", e))
            
            const durationMs = (data.slut - data.start) * 1000
            stopAudioTimeout = setTimeout(() => {
                numberAudio.pause()
            }, durationMs)
        } else {
            console.warn("No audio data for number:", targetNumber.value)
        }
    }
}

const handleGuess = (numObj) => {
  if (gameState.value !== 'playing') return
  if (numObj.state === 'correct') return // Already guessed this one right (shouldn't happen with current flow but safe guard)
  
  totalClicks.value++

  if (numObj.val === targetNumber.value) {
    // Correct
    sfx.correct()
    numObj.state = 'correct'
    correctClicks.value++
    setTimeout(nextRound, 1000)
  } else {
    // Wrong
    sfx.wrong()
    wrongGuesses.value++
    numObj.state = 'wrong'
    // Remove shake class after animation to allow re-shake
    setTimeout(() => {
      if(numObj.state === 'wrong') numObj.state = 'normal' // Reset visual state if we want them to click again? 
      // Actually, original code kept it red until round change or removed class to allow re-shake.
      // Let's just set it back to normal or 'viewed' state if we want re-shake.
      // But better UX might be just briefly shaking.
      numObj.state = 'normal' 
    }, 500)
  }
}

const endGame = () => {
  clearInterval(timerInterval)
  sfx.win()
  gameState.value = 'ended'
  
  const { saveGameResult } = useUser()
  saveGameResult('Talspillet', accuracy.value, { 
    time: timerSeconds.value, 
    range: selectedRange.value,
    wrongGuesses: wrongGuesses.value
  })
  
  // Save Highscore
  const currentBest = localStorage.getItem('mathGameBestTime')
  if (!currentBest || timerSeconds.value < parseInt(currentBest)) {
      localStorage.setItem('mathGameBestTime', timerSeconds.value)
      bestScore.value = timerSeconds.value
      // We could show a specific message here
  }
  
  showConfetti.value = true
}

const resetGame = () => {
  sfx.click()
  startGame()
}

const getConfettiStyle = () => {
    const left = Math.random() * 100
    const animDuration = 2 + Math.random() * 3
    return {
        left: left + '%',
        top: '-10%',
        animation: `fall ${animDuration}s linear infinite`
    }
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  window.speechSynthesis.cancel()
})
</script>

<style scoped>
/* --- CSS STYLES --- */
.container {
    --primary: #4A90E2;
    --accent: #FFD700;
    --success: #2ECC71;
    --error: #E74C3C;
    --bg: #F0F4F8;
    --text: #333;

    background: white;
    padding: 2rem;
    border-radius: 25px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    max-width: 500px;
    width: 90%;
    margin: 20px auto;
    position: relative;
    font-family: 'Comic Sans MS', 'Verdana', sans-serif;
    color: var(--text);
    text-align: center;
}

h1 { margin-top: 0; color: var(--primary); }

/* Header Stats */
.stats-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    font-weight: bold;
    font-size: 1.2rem;
    color: #555;
}

.progress {
    margin-bottom: 20px;
    background: #eee;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
}
.progress-bar {
    height: 100%;
    background: var(--success);
    transition: width 0.5s;
}

.speaker-btn {
    background: var(--primary);
    border: none;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    cursor: pointer;
    margin: 20px auto;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 2rem;
    color: white;
    box-shadow: 0 5px 15px rgba(74, 144, 226, 0.4);
    transition: transform 0.2s;
    animation: pulse 2s infinite;
}

.speaker-btn:active { transform: scale(0.9); }

.choices {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 30px;
}

.number-card {
    background: white;
    border: 3px solid var(--primary);
    width: 80px;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 2.5rem;
    font-weight: bold;
    border-radius: 15px;
    cursor: pointer;
    box-shadow: 0 5px 0 var(--primary);
    transition: transform 0.1s, box-shadow 0.1s;
    user-select: none;
}

.number-card:active {
    transform: translateY(5px);
    box-shadow: 0 0 0 var(--primary);
}

/* Animations */
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

.shake { 
    animation: shake 0.5s; 
    background-color: var(--error) !important; 
    color: white; 
    border-color: var(--error) !important; 
    box-shadow: 0 5px 0 #c0392b !important; 
}
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}

.pop { 
    animation: pop 0.4s; 
    background-color: var(--success) !important; 
    color: white; 
    border-color: var(--success) !important; 
    box-shadow: 0 5px 0 #27ae60 !important; 
}
@keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}

/* Start & End Screen */
.btn-main {
    background: var(--success);
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 1.5rem;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 5px 0 #219150;
    font-family: inherit;
    margin-top: 20px;
}
.btn-main:active { transform: translateY(5px); box-shadow: 0 0 0 #219150; }

.highscore-box {
    background: #fff8e1;
    padding: 10px;
    border-radius: 10px;
    margin-top: 20px;
    border: 2px dashed var(--accent);
}

.range-selector {
  margin-top: 25px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 15px;
}

.range-selector p {
  margin-bottom: 10px;
  font-weight: bold;
  color: #666;
}

.range-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.range-buttons button {
  padding: 10px 20px;
  font-size: 1.1rem;
  border: 2px solid var(--primary);
  background: white;
  color: var(--primary);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  font-weight: bold;
}

.range-buttons button.active {
  background: var(--primary);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 10px rgba(74, 144, 226, 0.3);
}

.range-buttons button:hover:not(.active) {
  background: #f0f7ff;
}

/* Confetti */
#confetti {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none;
    z-index: 1000;
}
.confetti-piece {
    position: absolute;
    font-size: 30px;
}
@keyframes fall { 
    to { top: 110%; transform: rotate(360deg); } 
}
</style>
