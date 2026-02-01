<template>
  <div class="hud">
    <div class="row">
      <div><b>Puntuación:</b> {{ score }}</div>
      <div><b>Récord:</b> {{ best }}</div>
      <div><b>Velocidad:</b> {{ speed.toFixed(1) }}</div>
      <div class="lives">
        <span v-for="n in 3" :key="n" :class="{ lost: n > lives }">❤</span>
      </div>
    </div>

    <div v-if="isGameOver" class="gameover">
      <h2>¡Te has chocado!</h2>
      <p>Puntuación Final: {{ Math.floor(score) }}</p>
      <button @click="$emit('restart')">Intentar de nuevo</button>
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
  isGameOver: { type: Boolean, required: true },
  lives: { type: Number, required: true }
})
</script>

<style scoped>
/* Añadir estilos para corazones */
.lives {
  font-size: 1.2rem;
}

.lives span {
  margin-right: 4px;
}

.lives span.lost {
  opacity: 0.2;
  filter: grayscale(100%);
}

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