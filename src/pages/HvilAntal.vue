<template>
  <div class="game-container">
    <button class="sound-toggle" @click="toggleSound">{{ soundOn ? '🔊' : '🔇' }}</button>

    <!-- Start Screen -->
    <div v-if="gameState === 'start'" id="startScreen">
      <h1>🎲 Tælle Spil</h1>

      <h3>Vælg din figur:</h3>
      <div class="emoji-picker">
        <div 
          v-for="char in emojis" 
          :key="char" 
          class="emoji-btn" 
          :class="{ selected: selectedEmoji === char }" 
          @click="selectEmoji(char)"
        >
          {{ char }}
        </div>
      </div>

      <h3>Sværhedsgrad:</h3>
      <div class="preset-container">
        <div 
          class="preset-btn" 
          :class="{ active: selectedPreset === 'easy' }" 
          @click="setPreset('easy')"
        >
          <span class="preset-icon">🐣</span>
          <span class="preset-text">Let</span>
        </div>
        <div 
          class="preset-btn" 
          :class="{ active: selectedPreset === 'medium' }" 
          @click="setPreset('medium')"
        >
          <span class="preset-icon">🐇</span>
          <span class="preset-text">Mellem</span>
        </div>
        <div 
          class="preset-btn" 
          :class="{ active: selectedPreset === 'hard' }" 
          @click="setPreset('hard')"
        >
          <span class="preset-icon">🐆</span>
          <span class="preset-text">Svær</span>
        </div>
        <div 
          class="preset-btn" 
          :class="{ active: selectedPreset === 'custom' }" 
          @click="toggleCustom"
        >
          <span class="preset-icon">🛠️</span>
          <span class="preset-text">Indstil Selv</span>
        </div>
      </div>

      <div class="custom-settings" :class="{ open: selectedPreset === 'custom' }">
        <div class="settings-grid">
          <div class="setting-group"><label>Min antal:</label><input type="number" v-model.number="config.min"></div>
          <div class="setting-group"><label>Max antal:</label><input type="number" v-model.number="config.max"></div>
          <div class="setting-group"><label>Tid (sek):</label><input type="number" v-model.number="config.time"></div>
          <div class="setting-group">
            <label>Type:</label>
            <select v-model="config.type">
              <option value="dice">🎲 Terninger</option>
              <option value="random">✨ Rodet</option>
            </select>
          </div>
        </div>
      </div>

      <button class="big-btn" @click="startGame">Start Spillet ▶️</button>
    </div>

    <!-- Game Screen -->
    <div v-if="gameState === 'playing'" id="gameScreen">
      <div class="status-bar">
        <span>Runde: {{ round }}/{{ totalRounds }}</span>
        <span>Point: {{ score }}</span>
      </div>

      <div v-if="config.time > 0" class="timer-container" style="display: block;">
        <div class="timer-bar" :style="{ width: timerWidth + '%', backgroundColor: timerColor }"></div>
      </div>

      <!-- Table Area -->
      <div class="dice-table" :style="{ backgroundColor: tableColor }">
        
        <!-- Dice Layout -->
        <template v-if="config.type === 'dice'">
          <div v-for="(val, idx) in diceValues" :key="idx" class="die" style="animation: popIn 0.5s">
            <div v-for="i in 9" :key="i" class="dot-cell">
              <span v-if="isDotVisible(val, i-1)" class="emoji-dot">{{ selectedEmoji }}</span>
            </div>
          </div>
        </template>

        <!-- Random Layout -->
        <template v-if="config.type === 'random'">
           <div class="random-container">
             <div v-for="n in currentTarget" :key="n" class="random-item">{{ selectedEmoji }}</div>
           </div>
        </template>

      </div>

      <!-- Options Area -->
      <div class="options-container">
        <button 
          v-for="opt in options" 
          :key="opt.val"
          class="option-btn"
          :class="{ correct: opt.state === 'correct', wrong: opt.state === 'wrong' }"
          :style="{ opacity: opt.state === 'dimmed' ? 0.3 : 1 }"
          @click="handleGuess(opt)"
        >
          {{ opt.val }}
        </button>
      </div>
    </div>

    <!-- End Screen -->
    <div v-if="gameState === 'ended'" id="endScreen">
      <h1>Flot klaret! 🏁</h1>
      <p>Du fik <span style="color:var(--primary-color); font-size:2rem; font-weight:bold;">{{ score }}/{{ totalRounds }}</span> rigtige.</p>
      <button class="big-btn" @click="resetGame">Spil Igen 🔄</button>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useUser } from '../composables/useUser'

const { soundOn, toggleSound, initAudio, sfx } = useAudio()

const emojis = ['⚫', '⭐', '⚽', '🍎', '🦄', '🦖']
const selectedEmoji = ref('⚫')
// soundOn imported from composable
const selectedPreset = ref('easy')
const gameState = ref('start') // start, playing, ended
const round = ref(0)
const score = ref(0)
const totalRounds = 10
const config = reactive({
  min: 1,
  max: 6,
  time: 0,
  type: 'dice'
})

// Game State
const currentTarget = ref(0)
const diceValues = ref([])
const options = ref([])
const tableColor = ref('#2d3436')

// Timer
const timerWidth = ref(100)
const timerColor = ref('var(--secondary-color)')
let timerInterval = null

// Audio Logic moved to composable!

const selectEmoji = (char) => {
    initAudio()
    sfx.select()
    selectedEmoji.value = char
}

const setPreset = (level) => {
    initAudio()
    sfx.select()
    selectedPreset.value = level
    if(level === 'easy') { config.min=1; config.max=6; config.time=0; config.type='dice' }
    if(level === 'medium') { config.min=5; config.max=12; config.time=20; config.type='dice' }
    if(level === 'hard') { config.min=7; config.max=24; config.time=10; config.type='dice' }
}

const toggleCustom = () => {
    sfx.select()
    selectedPreset.value = 'custom'
}

const startGame = () => {
    initAudio()
    sfx.click()
    if(config.min > config.max) config.max = config.min
    round.value = 0
    score.value = 0
    gameState.value = 'playing'
    nextRound()
}

const resetGame = () => {
    gameState.value = 'start'
}

const nextRound = () => {
    if(round.value >= totalRounds) {
        endGame()
        return
    }
    round.value++
    // Reset visual state
    tableColor.value = '#2d3436'
    timerWidth.value = 100
    timerColor.value = 'var(--secondary-color)'
    
    // Logic
    const range = config.max - config.min + 1
    currentTarget.value = Math.floor(Math.random() * range) + config.min
    
    if (config.type === 'dice') {
        tableColor.value = '#2d3436'
        createDice(currentTarget.value)
    } else {
        tableColor.value = '#a29bfe'
    }

    createButtons()
    if (config.time > 0) startTimer()
}

const createDice = (number) => {
    let count = Math.ceil(number / 6)
    let values = new Array(count).fill(1)
    let remaining = number - count
    
    // Distribute remaining points randomly
    while (remaining > 0) {
        let r = Math.floor(Math.random() * count)
        if (values[r] < 6) {
            values[r]++
            remaining--
        }
    }
    diceValues.value = values
}

const isDotVisible = (dieVal, dotIndex) => {
    const dotsMap = { 
        1:[4], 
        2:[2,6], 
        3:[2,4,6], 
        4:[0,2,6,8], 
        5:[0,2,4,6,8], 
        6:[0,2,3,5,6,8] 
    }
    return (dotsMap[dieVal] || []).includes(dotIndex)
}

const createButtons = () => {
    let opts = [currentTarget.value]
    let attempts = 0
    
    // Bestem hvor stor spredning vi vil tillade baseret på tallets størrelse
    // For små tal (+/- 3), for større tal lidt mere (ca 25%), men mindst 3.
    const spread = Math.max(3, Math.floor(currentTarget.value * 0.25))

    while(opts.length < 3 && attempts < 50) {
        attempts++
        
        // Lav et tal tæt på målet (positivt eller negativt offset)
        // Vi undgår 0 offset
        let offset = Math.floor(Math.random() * (spread * 2 + 1)) - spread
        if (offset === 0) continue

        let candidate = currentTarget.value + offset

        // Regler: Skal være over 0, og ikke allerede valgt
        if (candidate > 0 && !opts.includes(candidate)) {
            opts.push(candidate)
        }
    }

    // Fallback hvis vi ikke fandt nok (f.eks. ved meget små tal)
    // Vi prøver bare +1, +2 etc. indtil vi har nok
    let fallbackOffset = 1
    while(opts.length < 3) {
        let candidate = currentTarget.value + fallbackOffset
        // Prøv positivt
        if (candidate > 0 && !opts.includes(candidate)) {
            opts.push(candidate)
        } else {
            // Prøv negativt hvis positivt var optaget eller ugyldigt
            let candidateNeg = currentTarget.value - fallbackOffset
            if (candidateNeg > 0 && !opts.includes(candidateNeg)) {
                opts.push(candidateNeg)
            }
        }
        fallbackOffset++
    }

    // Bland knapperne
    opts.sort(() => Math.random() - 0.5)
    
    options.value = opts.map(val => ({ val, state: 'normal' }))
}

const handleGuess = (optObj) => {
    // Prevent multiple clicks
    if (options.value.some(o => o.state === 'correct' || o.state === 'wrong' && config.time === 0 && selectedPreset.value !== 'hard')) {
         if (optObj.state !== 'normal') return
    }
    
    // Check if game is essentially "paused" via correct answer already found
    if (options.value.some(o => o.state === 'correct')) return

    if (optObj.val === currentTarget.value) {
        sfx.correct()
        optObj.state = 'correct'
        if(timerInterval) clearInterval(timerInterval)
        score.value++
        setTimeout(nextRound, 1200)
    } else {
        sfx.wrong()
        optObj.state = 'wrong'
        if (['hard','custom'].includes(selectedPreset.value)) {
           failRound() 
        }
    }
}

const failRound = () => {
    if(timerInterval) clearInterval(timerInterval)
    sfx.wrong()
    tableColor.value = '#d63031'
    
    // Reveal correct answer and dim others
    options.value.forEach(opt => {
        if (opt.val === currentTarget.value) opt.state = 'correct' // Or 'revealed'
        else opt.state = 'dimmed'
    })
    
    setTimeout(nextRound, 2000)
}

const startTimer = () => {
    if (timerInterval) clearInterval(timerInterval)
    let timeLeft = config.time * 1000
    const total = timeLeft
    
    timerInterval = setInterval(() => {
        timeLeft -= 50
        const pct = (timeLeft / total) * 100
        timerWidth.value = pct
        
        if (pct < 30) timerColor.value = '#fdcb6e'
        if (pct < 15) timerColor.value = '#d63031'
        
        if (timeLeft <= 0) {
            failRound()
        }
    }, 50)
}

const endGame = () => {
    sfx.win()
    gameState.value = 'ended'
    
    const { saveGameResult } = useUser()
    saveGameResult('Tælle Spil', score.value, { 
        difficulty: selectedPreset.value,
        range: `${config.min}-${config.max}`,
        type: config.type
    })
}

onUnmounted(() => {
    if(timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
/* Variables moved to scoped style but applied to container or root-like equivalent */
.game-container {
    --primary-color: #6C5CE7;
    --secondary-color: #00CEC9;
    --bg-color: #dfe6e9;
    --card-bg: #ffffff;
    --correct-color: #00b894;
    --wrong-color: #d63031;
    --table-color: #2d3436;

    background-color: var(--card-bg);
    width: 95%;
    max-width: 650px;
    padding: 20px;
    border-radius: 25px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    text-align: center;
    position: relative;
    margin: 20px auto;
    font-family: 'Comic Sans MS', 'Verdana', sans-serif;
}

h1 { color: var(--primary-color); margin: 5px 0 15px 0; font-size: 2rem; }
h3 { margin: 10px 0 5px 0; color: #636e72; font-size: 1rem; }

.sound-toggle {
    position: absolute;
    top: 15px;
    right: 15px;
    background: #f1f2f6;
    border: none;
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.sound-toggle:hover { background: #dfe6e9; }

/* EMOJI PICKER */
.emoji-picker { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.emoji-btn {
    background: #f1f2f6; border: 2px solid transparent; font-size: 2rem;
    cursor: pointer; border-radius: 50%; width: 50px; height: 50px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s;
}
.emoji-btn:hover { transform: scale(1.2); }
.emoji-btn.selected {
    background: #fff; border-color: var(--primary-color);
    box-shadow: 0 0 10px rgba(108, 92, 231, 0.5); transform: scale(1.1);
}

/* PRESETS */
.preset-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.preset-btn {
    background: white; border: 3px solid #dfe6e9; border-radius: 15px; padding: 10px;
    cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center;
}
.preset-btn:hover { border-color: var(--secondary-color); transform: translateY(-2px); }
.preset-btn.active { border-color: var(--primary-color); background-color: #f0f3ff; box-shadow: 0 4px 0 #a29bfe; }
.preset-icon { font-size: 1.8rem; }
.preset-text { font-size: 0.9rem; font-weight: bold; }

.custom-settings { max-height: 0; overflow: hidden; transition: max-height 0.4s; background: #f1f2f6; border-radius: 15px; text-align: left; }
.custom-settings.open { max-height: 400px; padding: 15px; border: 2px solid #dfe6e9; }
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.setting-group { display: flex; flex-direction: column; }
input[type="number"], select { padding: 8px; border-radius: 8px; border: 2px solid #b2bec3; width: 100%; box-sizing: border-box;}

/* GAME TABLE */
.dice-table {
    border-radius: 20px; padding: 20px; min-height: 180px;
    display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 15px;
    margin: 15px 0; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); border: 5px solid #636e72;
    transition: background-color 0.3s;
}

.die {
    width: 75px; height: 75px; background-color: #fff; border-radius: 14px;
    box-shadow: 0 4px 0 #b2bec3, 0 5px 15px rgba(0,0,0,0.4);
    display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);
    padding: 4px; position: relative;
}
.dot-cell { display: flex; justify-content: center; align-items: center; }
.emoji-dot { font-size: 18px; line-height: 1; }

.random-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; width: 100%; }
.random-item { font-size: 2.5rem; animation: popIn 0.3s; padding: 5px; }

/* BUTTONS */
.options-container { display: flex; justify-content: space-around; gap: 10px; margin-top: 20px; }
.option-btn {
    background-color: var(--primary-color); color: white; border: none;
    border-radius: 15px; padding: 10px 0; font-size: 2rem; font-weight: bold;
    cursor: pointer; width: 80px; box-shadow: 0 6px 0 #4834d4; transition: transform 0.1s;
}
.option-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #4834d4; }
.option-btn.correct { background-color: var(--correct-color); box-shadow: 0 6px 0 #00896f; animation: bounce 0.5s; pointer-events: none; }
.option-btn.wrong { background-color: var(--wrong-color); box-shadow: 0 6px 0 #b71c1c; animation: shake 0.4s; opacity: 0.6; pointer-events: none; }

.big-btn {
    background-color: var(--correct-color); color: white; font-size: 1.5rem;
    padding: 15px; border: none; border-radius: 15px; cursor: pointer;
    box-shadow: 0 6px 0 #00896f; width: 100%; margin-top: 15px; font-weight: bold;
}
.big-btn:hover { filter: brightness(1.1); }

/* STATUS & TIMER */
.status-bar { display: flex; justify-content: space-between; font-weight: bold; color: #636e72; margin-bottom: 5px; font-size: 1.1rem;}
.timer-container { background: #eee; height: 10px; border-radius: 5px; margin-bottom: 10px; display: none; }
.timer-bar { height: 100%; width: 100%; border-radius: 5px; transition: width 0.05s linear; }

@keyframes popIn { 0% { transform: scale(0); } 80% { transform: scale(1.1); } 100% { transform: scale(1); } }
@keyframes bounce { 0%, 100% {transform: translateY(0);} 50% {transform: translateY(-15px);} }
@keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-5px);} 75% {transform: translateX(5px);} }
</style>
