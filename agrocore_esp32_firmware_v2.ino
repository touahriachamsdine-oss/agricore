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
// HARDWARE STRATEGY
// ---------------------------------------------------------
#define PUMP_CHANNELS 3
const int pumps[PUMP_CHANNELS] = {4, 5, 6}; // R1, R2, R3
unsigned long pumpOffAt[PUMP_CHANNELS] = {0, 0, 0};
bool activeLowLogic = true; // Set to false for Active-High relays

WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80);
StaticJsonDocument<256> jsonDoc;

void executePulse(int ch, String command, int duration) {
  if(ch < 0 || ch >= PUMP_CHANNELS) return;
  
  if(command == "ON") {
    // Determine physical level based on relay logic
    int onLevel = activeLowLogic ? LOW : HIGH;
    digitalWrite(pumps[ch], onLevel);
    if(duration > 0) {
      pumpOffAt[ch] = millis() + duration;
    }
    Serial.print("NEURAL LINK: Channel "); Serial.print(ch+1); Serial.println(" ACTIVE.");
  } 
  else if(command == "OFF") {
    int offLevel = activeLowLogic ? HIGH : LOW;
    digitalWrite(pumps[ch], offLevel);
    pumpOffAt[ch] = 0;
    Serial.print("NEURAL LINK: Channel "); Serial.print(ch+1); Serial.println(" IDLE.");
  }
  else if(command == "STOP_ALL") {
    for(int i=0; i<PUMP_CHANNELS; i++) {
        digitalWrite(pumps[i], activeLowLogic ? HIGH : LOW);
        pumpOffAt[i] = 0;
    }
    Serial.println("NEURAL LINK: EMERGENCY HALT EXECUTED.");
  }
  else if(command == "LOGIC_HIGH") {
    activeLowLogic = false;
    Serial.println("NEURAL LINK: Polarity set to ACTIVE-HIGH.");
  }
  else if(command == "LOGIC_LOW") {
    activeLowLogic = true;
    Serial.println("NEURAL LINK: Polarity set to ACTIVE-LOW.");
  }
}

// MQTT Message Receiver
void onNeuralImpulse(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.println("CLOUD-LINK IMPULSE: " + message);
  
  DeserializationError error = deserializeJson(jsonDoc, message);
  if (!error) {
    executePulse(jsonDoc["relay"].as<int>() - 1, jsonDoc["command"], jsonDoc["duration"]);
  }
}

void setup() {
  Serial.begin(115200);
  
  for(int i=0; i<PUMP_CHANNELS; i++) {
    pinMode(pumps[i], OUTPUT);
    digitalWrite(pumps[i], activeLowLogic ? HIGH : LOW);
  }

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
