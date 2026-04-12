/**
 * AGROCORE IoT Proxy Service
 * Handles command relay between the Neural Engine and the ESP32 Actuators.
 */

const ESP32_BASE_URL = 'http://agrocore-esp32.local'; // Placeholder for user's ESP32 IP

export const IoTProxy = {
    /**
     * Send actuation command to the ESP32
     * @param {number} relay - 1, 2, or 3 (mapped to GPIO 4, 5, 6)
     * @param {string} state - 'ON' or 'OFF'
     * @param {number} durationMs - How long to keep the pump on
     */
    actuate: async (relay, state, durationMs = 3000) => {
        console.log(`[IoTProxy] SENDING ACTUATION: Relay ${relay} -> ${state} (${durationMs}ms)`);

        // In a real environment, we'd fetch the ESP32 endpoint
        // e.g. fetch(`${ESP32_BASE_URL}/relay/${relay}?state=${state}&duration=${durationMs}`);

        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[IoTProxy] ACTUATION COMPLETE: Relay ${relay} is now ${state === 'ON' ? 'OFF (Cycle End)' : 'OFF'}`);
                resolve({ success: true, timestamp: new Date().toISOString() });
            }, state === 'ON' ? durationMs : 50);
        });
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
