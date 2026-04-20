<template>
  <div class="app">
    <div v-if="!isReady" class="loading-screen">
      <h1>🎮 Preparando Partida</h1>
      <p class="status">{{ statusMessage }}</p>
      <video ref="hiddenVideoRef" muted playsinline class="hidden"></video>
    </div>

    <div v-else class="game-container">
      <canvas ref="canvas" class="game-canvas"></canvas>
      <GameHUD :score="score" :best="best" :speed="speed" :lives="lives" :isGameOver="isGameOver" @restart="restart" />

      <div class="webcam-pip">
        <video ref="pipVideoRef" muted playsinline autoplay></video>
        <div class="emotion-badge">Emoción: {{ currentEmotion }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import GameHUD from './components/GameHUD.vue'
import { useThreeGame } from './composables/useThreeGame'
import { useBiometrics } from './composables/useBiometrics'

// Refs
const canvas = ref(null)
const hiddenVideoRef = ref(null)
const pipVideoRef = ref(null)

// Composables
const { start, stop, restart, score, best, speed, lives, isGameOver } = useThreeGame(canvas)
const { isReady, statusMessage, currentEmotion, initBiometrics, startScanning, videoStream } = useBiometrics()

// Ciclo de vida
onMounted(async () => {
  // 1. Iniciamos biometría y conexión a Laravel primero
  await initBiometrics(hiddenVideoRef.value);

  // 2. Cuando está listo, la UI cambia (v-else). Esperamos a que el canvas exista.
  if (isReady.value) {
    await nextTick(); // Espera a que Vue pinte el Canvas y el PipVideo

    // Le pasamos el stream de video a la visible, cogido directamente de memoria
    if (videoStream.value) {
      pipVideoRef.value.srcObject = videoStream.value;
    }

    // Arrancamos el juego
    start();

    // Arrancamos el escáner de emociones, pasándole una función que devuelve el score actual
    startScanning(pipVideoRef.value, () => Math.floor(score.value));
  }
})

onBeforeUnmount(() => stop())
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  background-color: #101018;
  color: white;
  font-family: sans-serif;
}

.app {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.game-container {
  height: 100%;
  width: 100%;
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
}

/* Estilos para la carga */
.loading-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #1a1a2e;
}

.status {
  color: #4ade80;
  font-size: 1.2rem;
  margin-top: 20px;
  font-weight: bold;
}

.hidden {
  display: none;
}

/* Estilos de la webcam */
.webcam-pip {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 150px;
  border-radius: 12px;
  overflow: hidden;
  border: 3px solid #5a5aff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  background: black;
}

.webcam-pip video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  /* Efecto espejo */
  display: block;
}

.emotion-badge {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.7);
  text-align: center;
  font-size: 0.8rem;
  padding: 4px 0;
  text-transform: uppercase;
  font-weight: bold;
  color: #00ffcc;
}
</style>