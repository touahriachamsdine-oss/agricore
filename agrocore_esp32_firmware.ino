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
#include <ESPAsyncWebServer.h>
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

AsyncWebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Initialize Pins
  pinMode(RELAY_1, OUTPUT);
  pinMode(RELAY_2, OUTPUT);
  pinMode(RELAY_3, OUTPUT);

  // All OFF at start (Low Active Relays)
  digitalWrite(RELAY_1, HIGH);
  digitalWrite(RELAY_2, HIGH);
  digitalWrite(RELAY_3, HIGH);

  // WiFi Connection
  Serial.print("AGROCORE: Initializing Neural Link...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nLINK ESTABLISHED");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // API Endpoints
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", "AGROCORE_NODE_ACTIVE");
  });

  // Neural Actuation endpoint
  AsyncCallbackJsonWebHandler* handler = new AsyncCallbackJsonWebHandler("/actuate", [](AsyncWebServerRequest *request, JsonVariant &json) {
    const JsonObject& jsonObj = json.as<JsonObject>();
    
    if (jsonObj.containsKey("relay") && jsonObj.containsKey("duration")) {
      int relay = jsonObj["relay"];
      int duration = jsonObj["duration"];
      
      int gpio = 0;
      if (relay == 1) gpio = RELAY_1;
      else if (relay == 2) gpio = RELAY_2;
      else if (relay == 3) gpio = RELAY_3;

      if (gpio != 0) {
        Serial.printf("Neural Command: Actuating Relay %d (GPIO %d) for %dms\n", relay, gpio, duration);
        
        // Execute Pulse (Low Active)
        digitalWrite(gpio, LOW);
        
        // Non-blocking timer using lambdas or simple delay in thread (Async server handles this)
        // For simplicity in this v1.0, we use a blocking pulse as the AsyncServer handles the rest.
        // In v2.0 we would use Ticker or separate tasks.
        delay(duration); 
        digitalWrite(gpio, HIGH);
        
        request->send(200, "application/json", "{\"status\":\"executed\"}");
      } else {
        request->send(400, "application/json", "{\"status\":\"invalid_relay\"}");
      }
    } else {
      request->send(400, "application/json", "{\"status\":\"malformed_request\"}");
    }
  });
  
  server.addHandler(handler);
  server.begin();
  
  Serial.println("AGROCORE NODE: Awaiting neural impulses...");
}

void loop() {
  // Maintaining link integrity
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Neural Link Severed. Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    delay(5000);
  }
}
