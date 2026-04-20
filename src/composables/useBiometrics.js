import { ref } from 'vue';
import * as faceapi from '@vladmandic/face-api';

export function useBiometrics() {
    const isReady = ref(false);
    const statusMessage = ref('Iniciando sistema biométrico...');
    const currentEmotion = ref('neutral');
    const sessionId = ref(null);
    const videoStream = ref(null);

    // IMPORTANTE: Pon la URL de tu backend Laravel
    const API_URL = 'http://127.0.0.1:8000/api';

    async function initBiometrics(videoElement) {
        try {
            statusMessage.value = '1/3 Cargando IA...';
            // Carga los archivos que metiste en public/models
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceExpressionNet.loadFromUri('/models')
            ]);

            statusMessage.value = '2/3 Encendiendo cámara...';
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream.value = stream;
            videoElement.srcObject = stream;

            await new Promise((resolve) => {
                videoElement.onloadedmetadata = () => {
                    videoElement.play();
                    resolve();
                };
            });

            statusMessage.value = '3/3 Conectando con Laravel...';
            const response = await fetch(`${API_URL}/games/1/start-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
            });

            const data = await response.json();
            if (data.status === 'success') {
                sessionId.value = data.session_id;
                statusMessage.value = '¡Conexión establecida!';
                isReady.value = true;
            }
        } catch (error) {
            console.error(error);
            statusMessage.value = 'Error: ' + error.message;
        }
    }

    function startScanning(videoElement, getCurrentScore) {
        // Escanea la cara cada 2 segundos (2000ms)
        setInterval(async () => {
            if (!isReady.value || !sessionId.value) return;

            const detections = await faceapi.detectSingleFace(
                videoElement,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceExpressions();

            if (detections) {
                // Obtenemos la emoción más alta
                const expressions = detections.expressions;
                const dominant = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

                currentEmotion.value = dominant;

                // Mandamos el dato a Laravel silenciosamente
                fetch(`${API_URL}/sessions/${sessionId.value}/emotions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        emocion: dominant,
                        confianza: expressions[dominant].toFixed(2),
                        time: getCurrentScore() // Usamos los puntos del juego para saber en qué momento pasó
                    })
                }).catch(() => { });
            }
        }, 2000);
    }

    return { isReady, statusMessage, currentEmotion, initBiometrics, startScanning, videoStream };
}