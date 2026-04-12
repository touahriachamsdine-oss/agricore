/**
 * AGROCORE — THE NEURAL FIELD FABRIC
 * ESP32 Hydroponic Controller v2.0
 * 
 * New in v2.0:
 * - Local Profile Storage (Hardware Fallback)
 * - Enhanced Neural Monitoring
 */

#include <WiFi.h>
#include <WebServer.h>
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

CropProfile activeProfile = {"LOCAL_PROD_1", 6.2, 1.8, 4000}; 

// ---------------------------------------------------------
// HARDWARE DEFINITIONS (GPIO 4, 5, 6)
// ---------------------------------------------------------
#define PH_DOWN_PUMP 4
#define NUTRIENT_A_PUMP 5
#define NUTRIENT_B_PUMP 6

WebServer server(80);
StaticJsonDocument<200> jsonDoc;

void handleActuate() {
  if (server.hasArg("plain") == false) {
    server.send(400, "application/json", "{\"status\":\"body_missing\"}");
    return;
  }

  String body = server.arg("plain");
  deserializeJson(jsonDoc, body);
  
  int relay = jsonDoc["relay"];
  int duration = jsonDoc["duration"];
  
  int targetPin = 0;
  if (relay == 1) targetPin = PH_DOWN_PUMP;
  else if (relay == 2) targetPin = NUTRIENT_A_PUMP;
  else if (relay == 3) targetPin = NUTRIENT_B_PUMP;

  if (targetPin != 0) {
    Serial.printf("EXECUTING NEURAL PULSE: Pin %d for %dms\n", targetPin, duration);
    digitalWrite(targetPin, LOW); 
    delay(duration);
    digitalWrite(targetPin, HIGH);
    server.send(200, "application/json", "{\"status\":\"pulse_complete\"}");
  } else {
    server.send(400, "application/json", "{\"status\":\"invalid_channel\"}");
  }
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

  server.on("/status", HTTP_GET, [](){
    server.send(200, "application/json", "{\"node\":\"AGROCORE_01\"}");
  });
  server.on("/actuate", HTTP_POST, handleActuate);
  
  server.begin();
}

void loop() {
  server.handleClient();
  
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 10000) { // Heartbeat print every 10s
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("STATUS: [ONLINE] IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
      Serial.println("STATUS: [OFFLINE] Requesting Reconnect...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
    lastCheck = millis();
  }
}
