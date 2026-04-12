/**
 * AGROCORE — THE NEURAL FIELD FABRIC
 * ESP32 Hydroponic Controller v1.0
 * 
 * This firmware acts as the physical bridge for the AGROCORE platform.
 * It listens for Neural Dosing pulses via a REST API.
 * 
 * Hardware Mapping:
 * - Relay 1 (PH DOWN): GPIO 4
 * - Relay 2 (SOL A / NPK): GPIO 5
 * - Relay 3 (SOL B / NPK): GPIO 6
 * 
 * Protocol:
 * - POST /actuate {"relay": 1, "duration": 3000}
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
// HARDWARE DEFINITIONS
// ---------------------------------------------------------
#define RELAY_1 4
#define RELAY_2 5
#define RELAY_3 6

WebServer server(80);
StaticJsonDocument<200> jsonDoc;

void handleRoot() {
  server.send(200, "text/plain", "AGROCORE_NODE_ACTIVE");
}

void handleActuate() {
  if (server.hasArg("plain") == false) {
    server.send(400, "application/json", "{\"status\":\"body_missing\"}");
    return;
  }

  String body = server.arg("plain");
  DeserializationError error = deserializeJson(jsonDoc, body);
  if (error) {
    server.send(400, "application/json", "{\"status\":\"malformed_json\"}");
    return;
  }

  int relay = jsonDoc["relay"];
  int duration = jsonDoc["duration"];
  
  int gpio = 0;
  if (relay == 1) gpio = RELAY_1;
  else if (relay == 2) gpio = RELAY_2;
  else if (relay == 3) gpio = RELAY_3;

  if (gpio != 0) {
    Serial.printf("Neural Command: Actuating Relay %d (GPIO %d) for %dms\n", relay, gpio, duration);
    digitalWrite(gpio, LOW);  // Turn ON (Low Active)
    delay(duration);          // Pulse
    digitalWrite(gpio, HIGH); // Turn OFF
    server.send(200, "application/json", "{\"status\":\"executed\"}");
  } else {
    server.send(400, "application/json", "{\"status\":\"invalid_relay\"}");
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_1, OUTPUT);
  pinMode(RELAY_2, OUTPUT);
  pinMode(RELAY_3, OUTPUT);

  // All OFF at start
  digitalWrite(RELAY_1, HIGH);
  digitalWrite(RELAY_2, HIGH);
  digitalWrite(RELAY_3, HIGH);

  WiFi.begin(ssid, password);
  Serial.print("AGROCORE: Building Neural Link...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nLINK ESTABLISHED");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/actuate", HTTP_POST, handleActuate);
  
  server.begin();
  Serial.println("AGROCORE NODE: Awaiting neural impulses...");
}

void loop() {
  server.handleClient();
  
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    delay(5000);
  }
}
