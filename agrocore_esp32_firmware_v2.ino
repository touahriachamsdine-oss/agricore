/**
 * AGROCORE — THE NEURAL FIELD FABRIC
 * ESP32 Hydroponic Controller v2.0
 * 
 * New in v2.0:
 * - Local Profile Storage (Hardware Fallback)
 * - Enhanced Neural Monitoring
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// ---------------------------------------------------------
// NETWORK IDENTITY (Update these)
// ---------------------------------------------------------
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ---------------------------------------------------------
// LOCAL CROP KNOWLEDGE (Hardware Fallback)
// ---------------------------------------------------------
struct CropProfile {
  char name[20];
  float targetPH;
  float targetEC;
  int doseDuration;
};

CropProfile activeProfile = {"LOCAL_PROD_1", 6.2, 1.8, 4000}; // Your requested static profile

// ---------------------------------------------------------
// HARDWARE DEFINITIONS (GPIO 4, 5, 6)
// ---------------------------------------------------------
#define PH_DOWN_PUMP 4
#define NUTRIENT_A_PUMP 5
#define NUTRIENT_B_PUMP 6

AsyncWebServer server(80);

void executePulse(int pin, int ms) {
  Serial.printf("EXECUTING NEURAL PULSE: Pin %d for %dms\n", pin, ms);
  digitalWrite(pin, LOW);  // Turn ON (Low Active)
  delay(ms);
  digitalWrite(pin, HIGH); // Turn OFF
}

void setup() {
  Serial.begin(115200);
  
  pinMode(PH_DOWN_PUMP, OUTPUT);
  pinMode(NUTRIENT_A_PUMP, OUTPUT);
  pinMode(NUTRIENT_B_PUMP, OUTPUT);

  // Default OFF
  digitalWrite(PH_DOWN_PUMP, HIGH);
  digitalWrite(NUTRIENT_A_PUMP, HIGH);
  digitalWrite(NUTRIENT_B_PUMP, HIGH);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nAGROCORE NODE ONLINE");
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Loaded Static Profile: %s (PH: %.1f, EC: %.1f)\n", 
                activeProfile.name, activeProfile.targetPH, activeProfile.targetEC);

  // Status Endpoint
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request){
    String response = "{\"node\":\"AGROCORE_01\",\"profile\":\"" + String(activeProfile.name) + "\"}";
    request->send(200, "application/json", response);
  });

  // Correction Actuation
  AsyncCallbackJsonWebHandler* handler = new AsyncCallbackJsonWebHandler("/actuate", [](AsyncWebServerRequest *request, JsonVariant &json) {
    const JsonObject& jsonObj = json.as<JsonObject>();
    
    int relay = jsonObj["relay"];
    int duration = jsonObj["duration"];
    
    int targetPin = 0;
    if (relay == 1) targetPin = PH_DOWN_PUMP;
    else if (relay == 2) targetPin = NUTRIENT_A_PUMP;
    else if (relay == 3) targetPin = NUTRIENT_B_PUMP;

    if (targetPin != 0) {
      executePulse(targetPin, duration);
      request->send(200, "application/json", "{\"status\":\"pulse_complete\"}");
    } else {
      request->send(400, "application/json", "{\"status\":\"invalid_channel\"}");
    }
  });
  
  server.addHandler(handler);
  server.begin();
}

void loop() {
  // Reconnect logic
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    delay(5000);
  }
}
