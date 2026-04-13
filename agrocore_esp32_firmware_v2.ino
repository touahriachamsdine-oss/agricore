#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <PubSubClient.h> 

// ---------------------------------------------------------
// NETWORK IDENTITY (HOTEL EL EMIR)
// ---------------------------------------------------------
const char* ssid = "HOTEL EL EMIR";
const char* password = "1234567890";
const char* agroId = "AGRO_NODE_01"; 

// ---------------------------------------------------------
// CLOUD RELAY SETTINGS
// ---------------------------------------------------------
const char* mqttServer = "broker.hivemq.com";
const int mqttPort = 1883;
const String actuationTopic = "agrocore/actuate/" + String(agroId);
const String telemetryTopic = "agrocore/telemetry/" + String(agroId);
const String controlTopic = "agrocore/control/" + String(agroId);

// ---------------------------------------------------------
// TELEMETRY SIMULATION (Neural State)
// ---------------------------------------------------------
float simPH = 7.15;
float simEC = 0.95;
bool pumpsActive[4] = {false, false, false, false}; // 1-based index

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

// Advanced Timing Engine (Non-blocking pulses)
struct PulseJob {
  int pin;
  unsigned long endTime;
  bool active;
};
PulseJob activeJobs[4] = {{PH_DOWN_PUMP, 0, false}, {NUTRIENT_A_PUMP, 0, false}, {NUTRIENT_B_PUMP, 0, false}};

void executePulse(int relay, int duration) {
  int targetPin = 0;
  if (relay == 1) targetPin = PH_DOWN_PUMP;
  else if (relay == 2) targetPin = NUTRIENT_A_PUMP;
  else if (relay == 3) targetPin = NUTRIENT_B_PUMP;

  if (targetPin != 0) {
    Serial.printf("EXECUTING NEURAL PULSE: Pin %d for %dms\n", targetPin, duration);
    digitalWrite(targetPin, LOW); 
    pumpsActive[relay] = true;
    
    // Simple delay for now, but simulated data will drift
    delay(duration); 
    
    digitalWrite(targetPin, HIGH);
    pumpsActive[relay] = false;
    
    // Simulate immediate offset
    if (relay == 1) simPH -= (duration / 1000.0) * 0.1;
    if (relay == 2 || relay == 3) simEC += (duration / 1000.0) * 0.2;
  }
}

void emergencyStop() {
  Serial.println("!!! GLOBAL EMERGENCY STOP !!!");
  digitalWrite(PH_DOWN_PUMP, HIGH);
  digitalWrite(NUTRIENT_A_PUMP, HIGH);
  digitalWrite(NUTRIENT_B_PUMP, HIGH);
  for(int i=0; i<4; i++) pumpsActive[i] = false;
}

// MQTT Message Receiver
void onNeuralImpulse(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.println("CLOUD-LINK IMPULSE: " + message);
  
  if (message.indexOf("STOP") != -1) {
    emergencyStop();
    return;
  }

  DeserializationError error = deserializeJson(jsonDoc, message);
  if (!error) {
    if (jsonDoc.containsKey("relay") && jsonDoc.containsKey("duration")) {
        executePulse(jsonDoc["relay"], jsonDoc["duration"]);
    }
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

  // Configure MQTT
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(onNeuralImpulse);

  server.on("/status", HTTP_GET, [](){
    server.send(200, "application/json", "{\"node\":\"" + String(agroId) + "\",\"mode\":\"AUTONOMOUS\"}");
  });
  
  server.begin();
}

void reconnectCloud() {
  while (!mqttClient.connected()) {
    Serial.print("AGROCORE: Negotiating Cloud Link...");
    if (mqttClient.connect(agroId)) {
      Serial.println("CONNECTED");
      mqttClient.subscribe(actuationTopic.c_str());
      mqttClient.subscribe(controlTopic.c_str());
    } else {
      Serial.printf("FAILED (rc=%d), retrying in 5s...\n", mqttClient.state());
      delay(5000);
    }
  }
}

void sendTelemetry() {
  StaticJsonDocument<256> tel;
  tel["ph"] = simPH;
  tel["ec"] = simEC;
  tel["p1"] = pumpsActive[1];
  tel["p2"] = pumpsActive[2];
  tel["p3"] = pumpsActive[3];
  tel["rssi"] = WiFi.RSSI();
  
  String out;
  serializeJson(tel, out);
  mqttClient.publish(telemetryTopic.c_str(), out.c_str());
  Serial.println("TELEMETRY UPLINK: " + out);
}

void loop() {
  server.handleClient();
  
  if (!mqttClient.connected()) {
    reconnectCloud();
  }
  mqttClient.loop();
  
  static unsigned long lastTel = 0;
  if (millis() - lastTel > 5000) { 
    // Add minor drift
    simPH += 0.005; 
    simEC -= 0.002;
    
    sendTelemetry();
    lastTel = millis();
  }
}
