import mqtt from 'mqtt';

/**
 * AGROCORE IoT Proxy Service
 * Handles command relay between the Neural Engine and the ESP32 Actuators.
 */

const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const ESP32_BASE_URL = 'http://agrocore-esp32.local'; // Placeholder for user's ESP32 IP

export const IoTProxy = {
    client: null,

    /**
     * Connect to the Cloud Relay
     * @param {string} channelId - Unique hardware ID
     */
    connect: (channelId, onStatusChange) => {
        if (IoTProxy.client) return;

        console.log(`[IoTProxy] Connecting to Cloud Relay: ${channelId}`);
        IoTProxy.client = mqtt.connect(BROKER_URL);

        IoTProxy.client.on('connect', () => {
            console.log('[IoTProxy] Cloud Link Ready.');
            onStatusChange(true);
        });

        IoTProxy.client.on('error', () => {
            onStatusChange(false);
        });
    },

    /**
     * Send actuation command via Cloud Relay (MQTT) or Direct Link (HTTP)
     * @param {string} channelId - The ESP32 IP address or Cloud ID
     * @param {number} relay - 1, 2, or 3
     * @param {string} state - 'ON' or 'OFF'
     * @param {number} durationMs - How long to keep the pump on
     */
    actuate: async (channelId, relay, state, durationMs = 300) => {
        console.log(`[IoTProxy] PULSE BROADCAST: ${channelId} -> R:${relay} (${durationMs}ms)`);

        // Always try Cloud Relay first if connected
        if (IoTProxy.client && IoTProxy.client.connected) {
            const topic = `agrocore/actuate/${channelId}`;
            const payload = JSON.stringify({ relay, duration: durationMs });
            IoTProxy.client.publish(topic, payload);
            return { success: true, method: 'CLOUD' };
        }

        // Fallback to direct HTTP for local development (might be blocked on HTTPS)
        try {
            const response = await fetch(`http://${channelId}/actuate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relay, duration: durationMs })
            });
            return { success: true, method: 'DIRECT' };
        } catch (error) {
            console.warn(`[IoTProxy] DIRECT LINK FAILED (Expected on Vercel):`, error);
            return { success: false, error: 'Link Severed' };
        }
    },

    /**
     * Verify physical link to ESP32
     * @param {string} channelId 
     */
    checkLink: async (channelId) => {
        if (IoTProxy.client && IoTProxy.client.connected) return { online: true };

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1000);
            const response = await fetch(`http://${channelId}/status`, { signal: controller.signal });
            clearTimeout(timeout);
            return { online: response.ok };
        } catch (e) {
            return { online: false };
        }
    },

    getSystemStatus: async () => {
        // Mocking ESP32 health check
        return {
            online: true,
            relays: [
                { id: 1, gpio: 4, label: 'PH DOWN', active: false },
                { id: 2, gpio: 5, label: 'SOL A (NPK)', active: false },
                { id: 3, gpio: 6, label: 'SOL B (NPK)', active: false }
            ]
        };
    }
};
