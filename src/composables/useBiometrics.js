import { ref } from 'vue';
import * as faceapi from '@vladmandic/face-api';

export function useBiometrics() {
    const isReady = ref(false);
    const statusMessage = ref('Iniciando sistema biométrico...');
    const currentEmotion = ref('neutral');
    const sessionId = ref(null);
    const videoStream = ref(null);

    // --- HANDSHAKE: Detección de parámetros de la URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const API_URL = urlParams.get('apiBaseUrl') || 'http://127.0.0.1:8000/api';
    const GAME_ID = urlParams.get('gameId') || '1';
    const TOKEN = urlParams.get('token');

    /**
     * Helper para preparar cabeceras con el token de Sanctum
     */
    const getHeaders = () => {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (TOKEN) {
            headers['Authorization'] = `Bearer ${TOKEN}`;
        }
        return headers;
    };

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
            const response = await fetch(`${API_URL}/games/${GAME_ID}/start-session`, {
                method: 'POST',
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Fallo de autenticación o conexión (Status: ${response.status})`);
            }

            const data = await response.json();
            if (data.status === 'success') {
                sessionId.value = data.session_id;
                statusMessage.value = '¡Conexión establecida!';
                isReady.value = true;
            }
        } catch (error) {
            console.error('[Biometrics] Error:', error);
            statusMessage.value = 'Error: ' + error.message;
        }
    }

    function startScanning(videoElement, getCurrentScore) {
        // Escanea la cara cada 2 segundos (2000ms) - Respetando límite de Laravel
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

                // Mandamos el dato a Laravel usando campos en inglés (emotion, confidence)
                fetch(`${API_URL}/sessions/${sessionId.value}/emotions`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        emotion: dominant,
                        confidence: parseFloat(expressions[dominant].toFixed(2)),
                        game_time: getCurrentScore() // Usamos los puntos del juego para saber en qué momento pasó
                    })
                }).catch(() => { });
            }
        }, 2100); // Un pequeño margen sobre los 2s del servidor
    }

    /**
     * Finaliza la sesión en el servidor y revoca el token
     */
    async function finishSession(finalScore) {
        if (!sessionId.value) return;

        try {
            const response = await fetch(`${API_URL}/sessions/${sessionId.value}/end`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ score: finalScore })
            });
            
            if (response.ok) {
                console.log('[Biometrics] Sesión cerrada y token revocado.');
                sessionId.value = null; // Limpiamos para evitar reenvíos
            }
        } catch (error) {
            console.error('[Biometrics] Error al cerrar sesión:', error);
        }
    }

    return { isReady, statusMessage, currentEmotion, initBiometrics, startScanning, videoStream, finishSession };
}