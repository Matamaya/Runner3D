<template>
  <div class="app">
    <canvas ref="canvas" class="game-canvas"></canvas>

    <GameHUD
      :score="score"
      :best="best"
      :speed="speed"
      :isGameOver="isGameOver"
      @restart="restart"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import GameHUD from './components/GameHUD.vue'
import { useThreeGame } from './composables/useThreeGame'

const canvas = ref(null)

const { start, stop, restart, score, best, speed, isGameOver } = useThreeGame(canvas)

onMounted(() => start())
onBeforeUnmount(() => stop())
</script>

<style>
html, body, #app { height: 100%; margin: 0; }
.app { position: relative; height: 100%; overflow: hidden; }
.game-canvas { width: 100%; height: 100%; display: block; }
</style>