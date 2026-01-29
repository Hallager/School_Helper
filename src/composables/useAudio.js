import { ref } from 'vue'

const soundOn = ref(true)
let audioCtx = null

export function useAudio() {
    const initAudio = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        if (audioCtx.state === 'suspended') audioCtx.resume()
    }

    const toggleSound = () => {
        soundOn.value = !soundOn.value
    }

    const playTone = (freq, type, duration, startTime = 0) => {
        if (!soundOn.value || !audioCtx) return
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = type
        osc.frequency.value = freq
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start(audioCtx.currentTime + startTime)
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration)
        osc.stop(audioCtx.currentTime + startTime + duration)
    }

    const sfx = {
        click: () => playTone(800, 'sine', 0.1),
        select: () => playTone(600, 'triangle', 0.05),
        correct: () => {
            playTone(523.25, 'sine', 0.3, 0)
            playTone(659.25, 'sine', 0.4, 0.1)
        },
        wrong: () => {
            playTone(150, 'sawtooth', 0.3, 0)
            playTone(130, 'sawtooth', 0.3, 0.15)
        },
        win: () => {
            let now = 0
                ;[523, 659, 783, 1046].forEach((f) => {
                    playTone(f, 'square', 0.2, now)
                    now += 0.15
                })
        },
        pop: () => {
            if (!soundOn.value || !audioCtx) return
            const osc = audioCtx.createOscillator()
            const gain = audioCtx.createGain()

            osc.frequency.setValueAtTime(400, audioCtx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1)

            osc.connect(gain)
            gain.connect(audioCtx.destination)

            osc.start()
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
            osc.stop(audioCtx.currentTime + 0.1)
        }
    }

    const loadAudioBuffer = async (url) => {
        if (!audioCtx) initAudio()
        try {
            const response = await fetch(url)
            const arrayBuffer = await response.arrayBuffer()
            return await audioCtx.decodeAudioData(arrayBuffer)
        } catch (error) {
            console.error('Error loading audio buffer:', error)
            return null
        }
    }

    const playBuffer = (buffer, startTime = 0, duration = null) => {
        if (!soundOn.value || !audioCtx || !buffer) return

        const source = audioCtx.createBufferSource()
        source.buffer = buffer
        source.connect(audioCtx.destination)

        // play immediately
        source.start(0, startTime, duration || buffer.duration)
    }

    return {
        soundOn,
        toggleSound,
        initAudio,
        playTone,
        loadAudioBuffer,
        playBuffer,
        sfx
    }
}
