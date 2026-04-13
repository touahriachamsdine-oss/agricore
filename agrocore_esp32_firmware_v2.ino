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
#include <PubSubClient.h> // PLEASE INSTALL THIS LIBRARY IN ARDUINO IDE

// ---------------------------------------------------------
// NEURAL IDENTITY & NETWORK
// ---------------------------------------------------------
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* agroId = "AGRO_NODE_01"; // UNIQUE CHANNEL ID

// ---------------------------------------------------------
// CLOUD RELAY SETTINGS (HiveMQ)
// ---------------------------------------------------------
const char* mqttServer = "broker.hivemq.com";
const int mqttPort = 1883;
const String actuationTopic = "agrocore/actuate/" + String(agroId);

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

WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80);
StaticJsonDocument<256> jsonDoc;

void executePulse(int relay, int duration) {
  int targetPin = 0;
  if (relay == 1) targetPin = PH_DOWN_PUMP;
  else if (relay == 2) targetPin = NUTRIENT_A_PUMP;
  else if (relay == 3) targetPin = NUTRIENT_B_PUMP;

  if (targetPin != 0) {
    Serial.printf("EXECUTING NEURAL PULSE: Pin %d for %dms\n", targetPin, duration);
    digitalWrite(targetPin, LOW); 
    delay(duration);
    digitalWrite(targetPin, HIGH);
  }
}

// MQTT Message Receiver
void onNeuralImpulse(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.println("CLOUD-LINK IMPULSE: " + message);
  
  DeserializationError error = deserializeJson(jsonDoc, message);
  if (!error) {
    executePulse(jsonDoc["relay"], jsonDoc["duration"]);
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
  Serial.printf("LOCAL IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("CLOUD PAIRING ID: %s\n", agroId);

  // Configure MQTT
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(onNeuralImpulse);

  server.on("/status", HTTP_GET, [](){
    server.send(200, "application/json", "{\"node\":\"" + String(agroId) + "\",\"mode\":\"HYBRID\"}");
  });
  
  // Also keep HTTP actuate for local dev stability
  server.on("/actuate", HTTP_POST, [](){
    if (server.hasArg("plain")) {
        deserializeJson(jsonDoc, server.arg("plain"));
        executePulse(jsonDoc["relay"], jsonDoc["duration"]);
        server.send(200, "application/json", "{\"status\":\"ok\"}");
    }
  });
  
  server.begin();
}

void reconnectCloud() {
  while (!mqttClient.connected()) {
    Serial.print("AGROCORE: Negotiating Cloud Link...");
    if (mqttClient.connect(agroId)) {
      Serial.println("CONNECTED");
      mqttClient.subscribe(actuationTopic.c_str());
    } else {
      Serial.printf("FAILED (rc=%d), retrying in 5s...\n", mqttClient.state());
      delay(5000);
    }
  }
}

void loop() {
  server.handleClient();
  
  if (!mqttClient.connected()) {
    reconnectCloud();
  }
  mqttClient.loop();
  
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 15000) { 
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("STATUS: [ONLINE] RSSI: %d dBm | CLOUD: %s\n", 
                    WiFi.RSSI(), mqttClient.connected() ? "READY" : "ERR");
    } else {
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
    lastCheck = millis();
  }
}
