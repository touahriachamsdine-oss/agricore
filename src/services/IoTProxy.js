/**
 * AGROCORE IoT Proxy Service
 * Handles command relay between the Neural Engine and the ESP32 Actuators.
 */

const ESP32_BASE_URL = 'http://agrocore-esp32.local'; // Placeholder for user's ESP32 IP

export const IoTProxy = {
    /**
     * Send actuation command to the ESP32
     * @param {string} ip - The ESP32 IP address
     * @param {number} relay - 1, 2, or 3
     * @param {string} state - 'ON' or 'OFF'
     * @param {number} durationMs - How long to keep the pump on
     */
    actuate: async (ip, relay, state, durationMs = 3000) => {
        console.log(`[IoTProxy] SENDING NEURAL IMPULSE: ${ip}/actuate (Relay ${relay}, ${durationMs}ms)`);

        try {
            const response = await fetch(`http://${ip}/actuate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relay, duration: durationMs })
            });
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error(`[IoTProxy] LINK FAILURE:`, error);
            // Fallback for visual demo if hardware is not yet online
            return new Promise((resolve) => {
                setTimeout(() => resolve({ success: true, mock: true }), 100);
            });
        }
    },

    /**
     * Verify physical link to ESP32
     * @param {string} ip 
     */
    checkLink: async (ip) => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`http://${ip}/status`, {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                return { online: true, node: data.node };
            }
            return { online: false };
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
