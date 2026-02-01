<template>
  <div class="hud">
    <div class="row">
      <div><b>Puntuación:</b> {{ score }}</div>
      <div><b>Récord:</b> {{ best }}</div>
      <div><b>Velocidad:</b> {{ speed.toFixed(1) }}</div>
    </div>

    <div v-if="isGameOver" class="gameover">
      <h2>Game Over</h2>
      <button @click="$emit('restart')">Reiniciar</button>
      <p class="hint">Controles: ← → o A/D para moverte · Espacio para saltar</p>
    </div>

    <div v-else class="hint">
      Controles: ← → o A/D para moverte · Espacio para saltar
      <button class="small" @click="$emit('restart')">Reiniciar</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  score: { type: Number, required: true },
  best: { type: Number, required: true },
  speed: { type: Number, required: true },
  isGameOver: { type: Boolean, required: true }
})
</script>

<style scoped>
.hud {
  position: absolute;
  left: 12px;
  bottom: 12px;
  color: white;
  font-family: system-ui, Arial;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .6);
  user-select: none;
}

.row {
  display: flex;
  gap: 16px;
  align-items: center;
  background: rgba(0, 0, 0, .35);
  padding: 8px 10px;
  border-radius: 10px;
}

.gameover {
  margin-top: 10px;
  background: rgba(0, 0, 0, .55);
  padding: 12px 12px;
  border-radius: 12px;
  max-width: 360px;
}

button {
  margin-top: 6px;
  padding: 8px 10px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

button.small {
  margin-left: 10px;
  margin-top: 0;
  padding: 6px 10px;
}

.hint {
  margin-top: 10px;
  background: rgba(0, 0, 0, .35);
  padding: 8px 10px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
</style>