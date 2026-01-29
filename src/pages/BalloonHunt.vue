<template>
  <div class="sky-container">
    <!-- Start Screen -->
    <div v-if="gameState === 'start'" class="overlay">
      <div class="menu-card">
        <h1>🎈 Ballon Jagt</h1>
        <p>Fang ballonerne fra 10-tabellen!</p>
        <p>Lyt til tallet og klik på den rigtige ballon.</p>
        <div class="highscore-box" v-if="bestTime">
          🏆 Bedste Tid: <span>{{ bestTime }}s</span>
        </div>
        <div class="difficulty-menu">
           <p>Vælg sværhedsgrad:</p>
           <div class="btn-row">
             <button class="btn-diff easy" @click="startGame('easy')">
               <span class="diff-icon">🐣</span> Let
             </button>
             <button class="btn-diff medium" @click="startGame('medium')">
               <span class="diff-icon">🐇</span> Mellem
             </button>
             <button class="btn-diff hard" @click="startGame('hard')">
               <span class="diff-icon">🐅</span> Svær
             </button>
           </div>
        </div>
      </div>
    </div>

    <!-- Game Area -->
    <div v-show="gameState === 'playing'" class="game-area" ref="gameArea">
      <div class="hud">
        <div class="hud-item">
          <span>⭐ Point: {{ score }}/{{ totalRounds }}</span>
        </div>
        <div class="hud-item speaker-btn" @click="speakTargetNumber" title="Hør tallet igen">
          🔊 Hør tallet
        </div>
        <div class="hud-item">
          <span>⏱️ Tid: {{ timerSeconds }}s</span>
        </div>
      </div>

      <!-- Balloons -->
      <div
        v-for="ball in balloons"
        :key="ball.id"
        class="balloon-wrapper"
        :style="{ 
          left: ball.x + '%', 
          animationDuration: ball.speed + 's', 
          animationDelay: ball.delay + 's',
          zIndex: ball.zIndex 
        }"
        :class="{ pop: ball.isPopped, 'balloon-moving': !ball.isPopped }"
        @animationend="handleAnimationEnd(ball.id, $event)"
        @click="handleBalloonClick(ball)"
      >
        <div 
          class="balloon" 
          :style="{ 
            backgroundColor: ball.color,
            animationDuration: ball.swayDuration + 's',
            animationDelay: (ball.isShaking || ball.isPopped) ? '0s' : ball.swayDelay + 's'
          }"
          :class="{ shake: ball.isShaking, sway: !ball.isShaking && !ball.isPopped }"
        >
          <span class="balloon-text">{{ ball.number }}</span>
          <div class="string"></div>
        </div>
      </div>
    </div>

    <!-- End Screen -->
    <div v-if="gameState === 'ended'" class="overlay">
      <div class="menu-card">
        <h1>🎉 Sejr!</h1>
        <div style="font-size: 4rem; margin: 10px;">🎈</div>
        <p>Du fangede alle ballonerne!</p>
        <p>Din tid: <span>{{ timerSeconds }}</span> sekunder.</p>
        <button class="btn-main" @click="startGame">Spil Igen</button>
      </div>
    </div>

    <!-- Confetti -->
    <div v-if="showConfetti" id="confetti">
      <div 
        v-for="n in 50" 
        :key="n" 
        class="confetti-piece"
        :style="getConfettiStyle()"
      >🎉</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, onMounted, computed, watch } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useUser } from '../composables/useUser'
import balloonAudioPath from '../assets/balloonHunt.mp3'
import balloonAudioData from '../assets/data/balloonHunt.json'
import bubblesPopPath from '../assets/bubbles-pop.mp3'

const allowedNumbers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const balloonColors = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#FF4081', '#7C4DFF']

// Number text mapping for searching in JSON
const numberTextMap = {
  10: 'ti',
  20: 'tyve',
  30: 'tredive',
  40: 'fyrre',
  50: 'halvtreds',
  60: 'tres',
  70: 'halvfjerds',
  80: 'firs',
  90: 'halvfems',
  100: 'hundrede'
}

const popSegments = [
  { id: "id_0_pop0", tekst: "pop0", start: 0.185, slut: 0.226 },
  { id: "id_1_pop1", tekst: "pop1", start: 0.392, slut: 0.433 },
  { id: "id_2_pop2", tekst: "pop2", start: 0.6, slut: 0.628 },
  { id: "id_3_pop3", tekst: "pop3", start: 0.744, slut: 0.802 },
  { id: "id_4_pop4", tekst: "pop4", start: 1.047, slut: 1.063 },
  { id: "id_5_pop5", tekst: "pop5", start: 1.459, slut: 1.466 }
]

// --- State ---
const { initAudio, sfx, loadAudioBuffer, playBuffer } = useAudio()
const gameState = ref('start') // start, playing, ended
const score = ref(0)
const totalRounds = 10
const targetNumber = ref(null)
const balloons = ref([])
const timerSeconds = ref(0)
const bestTime = ref(localStorage.getItem('balloonHuntBestTime'))
const showConfetti = ref(false)

// Config - Speed (Seconds it takes to float up)
const minBalloonDuration = ref(6)
const maxBalloonDuration = ref(11)
const spawnRate = ref(1200)
const currentDifficulty = ref('medium')

let spawnInterval = null
let gameTimerInterval = null
let startTime = 0
let idCounter = 0
let voiceAudio = null
let popBuffer = null
let stopVoiceTimeout = null
let startPlayTimeout = null

let targetQueue = []
let decoyQueue = []

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- Lifecycle ---
onMounted(async () => {
  voiceAudio = new Audio(balloonAudioPath)
  popBuffer = await loadAudioBuffer(bubblesPopPath)
})

onUnmounted(() => {
  clearInterval(spawnInterval)
  clearInterval(gameTimerInterval)
  stopVoice()
})

// --- Audio Logic ---
function stopVoice() {
    if (voiceAudio) {
        voiceAudio.pause()
        if (stopVoiceTimeout) clearTimeout(stopVoiceTimeout)
        if (startPlayTimeout) clearTimeout(startPlayTimeout)
    }
}

function playVoiceSegment(segment) {
    if (!voiceAudio || !segment) return
    if (segment.start === 0 && segment.slut === 0) return // Skip invalid entries

    console.log(`🔊 Afspiller: "${segment.tekst}" [${segment.start}s -> ${segment.slut}s]`)

    stopVoice()
    
    // Slight delay to ensure previous audio stopped cleanly if needed
    startPlayTimeout = setTimeout(() => {
        voiceAudio.currentTime = segment.start
        const playPromise = voiceAudio.play()
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Play for exactly the duration specified in JSON
                const duration = (segment.slut - segment.start) * 1000
                
                stopVoiceTimeout = setTimeout(() => {
                    voiceAudio.pause()
                }, duration)
            }).catch(e => {
                // Ignore "interrupted" errors from rapid clicking
                if (e.name !== 'AbortError') console.error("Audio play error", e)
            })
        }
    }, 50)
}

function playRandomPrompt(number) {
    const text = numberTextMap[number]
    if (!text) return

    // Find all segments that contain the number text as a whole word (e.g. "ti") but are questions/imperatives
    // Use regex word boundary \b to avoid matching "ti" inside "Rigtigt" or "Fantastisk"
    const regex = new RegExp(`\\b${text}\\b`, 'i')
    
    const candidates = balloonAudioData.filter(d => 
        regex.test(d.tekst) && 
        d.start > 0 && // Valid time
        !d.id.includes('dansk') // Exclude intro if any
    )
    console.log(candidates)
    if (candidates.length > 0) {
        const choice = candidates[Math.floor(Math.random() * candidates.length)]
        playVoiceSegment(choice)
    }
}

function playRandomFeedback(type) {
    let keywords = []
    if (type === 'correct') {
        keywords = ['flot', 'rigtigt', 'sådan', 'godt', 'jubii', 'super', 'fantastisk']
    } else {
        keywords = ['prøv', 'igen', 'hov', 'næsten', 'kom']
    }

    const candidates = balloonAudioData.filter(d => {
        const t = d.tekst.toLowerCase()
        // Check if any keyword matches
        const hasKeyword = keywords.some(k => t.includes(k))
        
        // Ensure no numbers are in the text (using whole word match)
        // This ensures "Rigtigt" isn't excluded just because it contains "ti"
        const hasNumber = allowedNumbers.some(n => {
            const numText = numberTextMap[n]
            const regex = new RegExp(`\\b${numText}\\b`, 'i')
            return regex.test(t)
        })

        return hasKeyword && !hasNumber
    })

    if (candidates.length > 0) {
        const choice = candidates[Math.floor(Math.random() * candidates.length)]
        playVoiceSegment(choice)
        // Return duration in ms + small buffer (300ms) for sequencing
        return (choice.slut - choice.start) * 1000 + 300
    }
    return 0
}

function playRandomPopSound() {
  if (!popBuffer) return
  const segment = popSegments[Math.floor(Math.random() * popSegments.length)]
  
  // Calculate duration
  const duration = segment.slut - segment.start
  
  // Play using Web Audio API helper (buffer, offset, duration)
  playBuffer(popBuffer, segment.start, duration)
}

// --- Game Logic ---
function startGame(difficulty) {
  // If difficulty is passed (string), set it. If it's an event (from 'Spil Igen'), keep current.
  if (typeof difficulty === 'string') {
      currentDifficulty.value = difficulty
  }

  // Apply Settings
  if (currentDifficulty.value === 'easy') {
      minBalloonDuration.value = 15
      maxBalloonDuration.value = 20
      spawnRate.value = 1600
  } else if (currentDifficulty.value === 'hard') {
      minBalloonDuration.value = 3
      maxBalloonDuration.value = 6
      spawnRate.value = 900
  } else {
      // Medium
      minBalloonDuration.value = 10
      maxBalloonDuration.value = 15
      spawnRate.value = 1200
  }

  initAudio()
  sfx.click()
  
  // Reset State
  gameState.value = 'playing'
  score.value = 0
  timerSeconds.value = 0
  balloons.value = []
  showConfetti.value = false
  idCounter = 0
  
  targetQueue = [] // Reset queues
  decoyQueue = []
  
  // Start Timer
  startTime = Date.now()
  clearInterval(gameTimerInterval)
  gameTimerInterval = setInterval(() => {
    timerSeconds.value = Math.floor((Date.now() - startTime) / 1000)
  }, 1000)

  // Pick first target
  pickNewTarget()

  // Start Spawning
  startSpawning()
}

function stopGame() {
  clearInterval(spawnInterval)
  const { saveGameResult } = useUser()
  saveGameResult('Ballon Jagt', score.value, { 
    time: timerSeconds.value, 
    difficulty: currentDifficulty.value 
  })

  gameState.value = 'ended'
  sfx.win()
  playRandomFeedback('correct') // Final cheer
  showConfetti.value = true
  
  const oldBest = localStorage.getItem('balloonHuntBestTime')
  if (!oldBest || timerSeconds.value < parseInt(oldBest)) {
    localStorage.setItem('balloonHuntBestTime', timerSeconds.value)
    bestTime.value = timerSeconds.value
  }
}

function pickNewTarget(delay = 600) {
  if (score.value >= totalRounds) {
    stopGame()
    return
  }
  
  // Refill target bag if empty
  if (targetQueue.length === 0) {
      targetQueue = shuffleArray([...allowedNumbers])
  }
  
  targetNumber.value = targetQueue.pop()
  console.log('🎯 Nyt Mål (Target):', targetNumber.value)
  
  // Play sound
  setTimeout(() => playRandomPrompt(targetNumber.value), delay)
}

function speakTargetNumber() {
    playRandomPrompt(targetNumber.value)
}

function startSpawning() {
  clearInterval(spawnInterval)
  // Spawn a balloon based on difficulty rate
  spawnInterval = setInterval(spawnBalloon, spawnRate.value)
  // Initial balloon
  spawnBalloon() 
}

function spawnBalloon() {
  if (gameState.value !== 'playing') return

  // Determine number: 40% chance of being the target number (if set), else random
  let num
  if (targetNumber.value && Math.random() < 0.45) {
    num = targetNumber.value
  } else {
    // Logic to pick a decoy that doesn't repeat too often
    // Remove target from potential options in the bag if present
    decoyQueue = decoyQueue.filter(n => n !== targetNumber.value)

    if (decoyQueue.length === 0) {
        // Refill bag with all numbers except target
        const options = allowedNumbers.filter(n => n !== targetNumber.value)
        decoyQueue = shuffleArray([...options])
    }
    
    num = decoyQueue.pop()
  }

  // Random visual properties
  const color = balloonColors[Math.floor(Math.random() * balloonColors.length)]
  const x = Math.floor(Math.random() * 85) + 5 // 5% to 90% left
  
  // Calculate speed based on config
  const durationRange = maxBalloonDuration.value - minBalloonDuration.value
  const speed = (Math.random() * durationRange + minBalloonDuration.value).toFixed(1)
  
  const swayDuration = (Math.random() * 2 + 3).toFixed(1) // 3-5s sway
  const swayDelay = (Math.random() * 2).toFixed(1)
  const zIndex = Math.floor(Math.random() * 10) + 10

  balloons.value.push({
    id: idCounter++,
    number: num,
    color: color,
    x: x,
    speed: speed,
    swayDuration,
    swayDelay,
    zIndex,
    delay: 0,
    isPopped: false,
    isShaking: false
  })
}

function handleAnimationEnd(id, event) {
  // Ignore bubbling events (like shake from child .balloon)
  if (event.target !== event.currentTarget) return

  // If animation ends (floated off screen OR popped), remove balloon
  const idx = balloons.value.findIndex(b => b.id === id)
  if (idx !== -1) {
     balloons.value.splice(idx, 1)
  }
}

function handleBalloonClick(ball) {
  if (ball.isPopped || gameState.value !== 'playing') return

  if (ball.number === targetNumber.value) {
    // Correct!
    playRandomPopSound() // Custom pop sound
    // sfx.correct() // Ding
    const feedbackDuration = playRandomFeedback('correct') // Voice encouragement
    
    ball.isPopped = true
    score.value++
    
    // Pick new target after feedback finishes
    pickNewTarget(feedbackDuration + 400)
  } else {
    // Wrong!
    sfx.wrong() // Mechanical buzzer
    playRandomFeedback('wrong') // Voice "Prøv igen"
    
    ball.isShaking = true
    setTimeout(() => {
      ball.isShaking = false
    }, 500)
  }
}

function getConfettiStyle() {
    const left = Math.random() * 100
    const delay = Math.random() * 2
    const duration = 2 + Math.random() * 3
    return {
        left: left + '%',
        top: '-10%',
        animation: `fall ${duration}s linear infinite ${delay}s`
    }
}
</script>

<style scoped>
/* Main Container - Full Screen/Game Area style */
.sky-container {
  width: 100%;
  height: 100vh; /* Fill whatever view it's in, ideally handled by parent but ensuring height here */
  min-height: 600px; /* Minimum game height */
  background: linear-gradient(to bottom, #87CEEB 0%, #E0F7FA 100%);
  position: relative;
  overflow: hidden; /* Important for containing balloons */
  font-family: 'Comic Sans MS', 'Verdana', sans-serif;
  user-select: none;
}

/* UI Overlay (Start / End) */
.overlay {
  position: absolute;
  top: 0; left: 0; 
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.menu-card {
  background: white;
  padding: 3rem;
  border-radius: 30px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.2);
  border: 4px solid #fff;
  max-width: 90%;
  width: 400px;
}
.menu-card h1 {
  color: #FF4081;
  margin-top: 0;
  font-size: 2.5rem;
  text-shadow: 2px 2px 0px #eee;
}
.menu-card p {
  color: #555;
  font-size: 1.1rem;
}
.highscore-box {
  background: #FFF8E1;
  padding: 10px;
  border-radius: 10px;
  margin: 15px 0;
  border: 2px dashed #FFD740;
  color: #333;
  font-weight: bold;
}

.btn-main {
  background: linear-gradient(to bottom, #69F0AE, #00C853);
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 1.5rem;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 5px 0 #009624;
  font-family: inherit;
  transition: transform 0.1s;
  margin-top: 10px;
  text-transform: uppercase;
  font-weight: bold;
}
.btn-main:active {
  transform: translateY(5px);
  box-shadow: 0 0 0 #009624;
}

/* Difficulty Buttons */
.difficulty-menu p {
  margin-bottom: 15px;
  font-weight: bold;
}
.btn-row {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-diff {
  border: none;
  padding: 15px 25px;
  font-size: 1.2rem;
  border-radius: 15px;
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
  color: white;
  box-shadow: 0 6px 0 rgba(0,0,0,0.2);
  transition: transform 0.1s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 100px;
}
.btn-diff:active {
  transform: translateY(4px);
  box-shadow: none;
}
.diff-icon {
  font-size: 2rem;
  line-height: 1;
}
.easy { background: #69F0AE; }
.medium { background: #448AFF; }
.hard { background: #FF5252; }

/* Heads Up Display */
.hud {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 20px;
  z-index: 100;
  pointer-events: none; /* Let clicks pass through to empty space if needed */
}
.hud-item {
  background: white;
  padding: 10px 20px;
  border-radius: 50px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  font-weight: bold;
  font-size: 1.2rem;
  color: #448AFF;
  pointer-events: auto;
}
.speaker-btn {
  cursor: pointer;
  background: #448AFF;
  color: white;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}
.speaker-btn:active {
  transform: scale(0.95);
}

/* Balloons */
.balloon-wrapper {
  position: absolute;
  bottom: -150px; /* Start below screen */
  /* Used for movement */
  animation-name: floatUp;
  animation-timing-function: linear;
  animation-fill-mode: forwards; 
  /* animation-duration is set inline */
  z-index: 10;
  cursor: pointer;
  
  /* Prevent drag image ghosting */
  -webkit-user-drag: none;
}

@keyframes floatUp {
  0% { transform: translateY(0); }
  100% { transform: translateY(-130vh); } /* Move way up */
}

/* The actual balloon shape */
.balloon {
  width: 100px;
  height: 120px;
  border-radius: 50%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset -10px -10px 20px rgba(0,0,0,0.1), 5px 10px 15px rgba(0,0,0,0.1);
  transition: transform 0.1s;
}

/* The little string */
.string {
  position: absolute;
  bottom: -20px;
  left: 50%;
  width: 2px;
  height: 30px;
  background: rgba(0,0,0,0.4);
  transform: translateX(-50%);
}
.string::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -3px;
  width: 8px;
  height: 4px;
  background: rgba(0,0,0,0.4);
  border-radius: 4px;
}

/* Balloon text */
.balloon-text {
  font-size: 2.2rem;
  font-weight: 900;
  color: white;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
  z-index: 2;
}

/* Animations */
.shake { 
  animation: shake 0.5s ease-in-out; 
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px) rotate(-5deg); }
  75% { transform: translateX(8px) rotate(5deg); }
}

/* Sway Animation */
.sway {
  animation: swayAnim ease-in-out infinite alternate both;
}
@keyframes swayAnim {
  0% { transform: rotate(-8deg) translateX(-15px); }
  100% { transform: rotate(8deg) translateX(15px); }
}

/* Pop Animation: Scale up then disappear */
.pop {
  animation: popAnim 0.15s ease-out forwards !important; 
  pointer-events: none; 
}

@keyframes popAnim {
  0% { transform: scale(1); opacity: 1; filter: brightness(1); }
  40% { transform: scale(1.3); opacity: 0.9; filter: brightness(2); }
  100% { transform: scale(0); opacity: 0; }
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
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } 
}
</style>
