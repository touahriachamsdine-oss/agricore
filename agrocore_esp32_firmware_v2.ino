/**
 * AGROCORE — THE NEURAL FIELD FABRIC
 * ESP32 Hydroponic Controller v3.0 (Robust Edition)
 * 
 * Reworked for absolute hardware stability and explicit pin addressing.
 * - Explicit #define GPIOs
 * - Switch-case logic for command routing
 * - Failsafe Emergency Halt
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

// ---------------------------------------------------------
// NEURAL IDENTITY & NETWORK
// ---------------------------------------------------------
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* agroId = "AGRO_NODE_01"; 

// ---------------------------------------------------------
// CLOUD RELAY SETTINGS (HiveMQ)
// ---------------------------------------------------------
const char* mqttServer = "broker.hivemq.com";
const int mqttPort = 1883;
const String actuationTopic = "agrocore/actuate/" + String(agroId);

// ---------------------------------------------------------
// EXPLICIT HARDWARE DEFINITIONS (THE NORMAL WAY)
// ---------------------------------------------------------
#define PUMP_PH 4   // Relay 1
#define PUMP_NA 5   // Relay 2
#define PUMP_NB 6   // Relay 3

// TIMING ENGINE (Independent Failsafes)
unsigned long phOffAt = 0;
unsigned long naOffAt = 0;
unsigned long nbOffAt = 0;
bool activeLow = true; // DEFAULT: LOW=ON, HIGH=OFF

WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80);
StaticJsonDocument<512> jsonDoc;

// ---------------------------------------------------------
// ROBUST ACTUATION ENGINE
// ---------------------------------------------------------
void physicalDrive(int pin, String state) {
  int level;
  if (state == "ON") level = activeLow ? LOW : HIGH;
  else level = activeLow ? HIGH : LOW;
  digitalWrite(pin, level);
}

void executeNeuralCommand(int relay, String command, int duration) {
  Serial.print("NEURAL COMMAND: R"); Serial.print(relay);
  Serial.print(" "); Serial.print(command);
  if(duration > 0) { Serial.print(" for "); Serial.print(duration); Serial.println("ms"); }
  else Serial.println(" (LATCHING)");

  if (command == "STOP_ALL") {
    physicalDrive(PUMP_PH, "OFF"); phOffAt = 0;
    physicalDrive(PUMP_NA, "OFF"); naOffAt = 0;
    physicalDrive(PUMP_NB, "OFF"); nbOffAt = 0;
    Serial.println(">>> FULL SYSTEM HALT <<<");
    return;
  }

  if (command == "LOGIC_HIGH") { activeLow = false; Serial.println("POLARITY: ACTIVE-HIGH"); return; }
  if (command == "LOGIC_LOW")  { activeLow = true; Serial.println("POLARITY: ACTIVE-LOW"); return; }

  // Explicit Pin Routing
  int targetPin = 0;
  if(relay == 1) targetPin = PUMP_PH;
  else if(relay == 2) targetPin = PUMP_NA;
  else if(relay == 3) targetPin = PUMP_NB;

  if(targetPin == 0) return;

  if (command == "ON") {
    physicalDrive(targetPin, "ON");
    if(duration > 0) {
      unsigned long expire = millis() + duration;
      if(relay == 1) phOffAt = expire;
      else if(relay == 2) naOffAt = expire;
      else if(relay == 3) nbOffAt = expire;
    }
  } else {
    physicalDrive(targetPin, "OFF");
    if(relay == 1) phOffAt = 0;
    else if(relay == 2) naOffAt = 0;
    else if(relay == 3) nbOffAt = 0;
  }
}

// MQTT Message Receiver
void onNeuralImpulse(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  StaticJsonDocument<256> mqttDoc;
  if (!deserializeJson(mqttDoc, message)) {
    executeNeuralCommand(mqttDoc["relay"], mqttDoc["command"], mqttDoc["duration"]);
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(PUMP_PH, OUTPUT);
  pinMode(PUMP_NA, OUTPUT);
  pinMode(PUMP_NB, OUTPUT);

  // FORCE INITIAL IDLE STATE
  physicalDrive(PUMP_PH, "OFF");
  physicalDrive(PUMP_NA, "OFF");
  physicalDrive(PUMP_NB, "OFF");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nNEURAL NODE READY.");
  Serial.printf("IP: %s | ID: %s\n", WiFi.localIP().toString().c_str(), agroId);

  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(onNeuralImpulse);

  server.on("/status", HTTP_GET, [](){ server.send(200, "text/plain", "ONLINE"); });
  server.on("/actuate", HTTP_POST, []() {
    String message = server.arg("plain");
    StaticJsonDocument<256> httpDoc;
    if(!deserializeJson(httpDoc, message)) {
      executeNeuralCommand(httpDoc["relay"], httpDoc["command"], httpDoc["duration"]);
      server.send(200, "application/json", "{\"status\":\"ACK\"}");
    } else {
      server.send(400, "text/plain", "Err");
    }
  });
  
  server.begin();
}

void reconnectCloud() {
  while (!mqttClient.connected()) {
    Serial.print("Agrocore: Linking...");
    if (mqttClient.connect(agroId)) {
      Serial.println("SYNCED");
      mqttClient.subscribe(actuationTopic.c_str());
    } else {
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
  
  // Independent Hardware Watchdog
  unsigned long now = millis();
  if (phOffAt > 0 && now >= phOffAt) { physicalDrive(PUMP_PH, "OFF"); phOffAt = 0; Serial.println("R1 IDLE"); }
  if (naOffAt > 0 && now >= naOffAt) { physicalDrive(PUMP_NA, "OFF"); naOffAt = 0; Serial.println("R2 IDLE"); }
  if (nbOffAt > 0 && now >= nbOffAt) { physicalDrive(PUMP_NB, "OFF"); nbOffAt = 0; Serial.println("R3 IDLE"); }
}
