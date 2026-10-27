// Golfscore buggy-scherm
//
// Toont de stand van de huidige hole en stuurt knopdrukken naar de Golfscore-app op de
// telefoon, via Bluetooth Low Energy. De telefoon is de baas: dit scherm bewaart niets
// en laat altijd zien wat de app stuurt. Protocol: zie js/buggy-protocol.js in de app.
//
// Bediening met knoppen (CoreInk: multifunctieknop omhoog / indrukken / omlaag = A / B / C):
//   A kort: slag eraf   C kort: slag erbij   B kort: volgende speler
//   B lang: volgende hole   A lang: vorige hole
// Bediening met aanraken (Core2/PaperS3): tik op een speler = slag erbij, onderste balk − / speler / +,
//   bovenste balk links/rechts = vorige/volgende hole.

#include <M5Unified.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <atomic>
#include <mutex>
#include <string>

// Moet gelijk zijn aan js/buggy-protocol.js
static const char* SERVICE_UUID = "480d22ab-2fa5-4c57-82c2-638cf27025df";
static const char* STATE_UUID = "7d07a84e-acbe-4784-8dd8-20c1be5a8b3f";
static const char* INPUT_UUID = "06bd9c2e-ebfd-4f11-8e80-3b541c03f86a";
static const char* DEVICE_NAME = "Golfscore Buggy";

static const int MAX_PLAYERS = 6;

struct Player {
  String name;
  int strokes = 0;  // 0 = nog geen score op deze hole
  int gross = 0;
  int toPar = 0;
};

struct Standing {
  bool valid = false;
  int hole = 0, par = 0, si = 0, length = 0;
  String course;
  Player players[MAX_PLAYERS];
  int count = 0;
} standing;

static std::atomic<bool> connected{false};
static std::atomic<bool> connectionChanged{false};
static std::mutex incomingLock;
static std::string incoming;  // laatst ontvangen stand, nog te verwerken
static bool hasIncoming = false;

static NimBLECharacteristic* inputChar = nullptr;
static M5Canvas canvas(&M5.Display);
static int selected = 0;
static bool needsDraw = true;
static String notice;
static uint32_t noticeUntil = 0;

// Waar de rijen en balken laatst getekend zijn, voor het aanraken.
static int headerBottom = 0;
static int footerTop = 0;
static int rowTop[MAX_PLAYERS];
static int rowHeight = 0;

// ---------- Bluetooth ----------

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* server, NimBLEConnInfo& info) override {
    connected = true;
    connectionChanged = true;
  }
  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& info, int reason) override {
    connected = false;
    connectionChanged = true;
    NimBLEDevice::startAdvertising();
  }
};

class StateCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* characteristic, NimBLEConnInfo& info) override {
    NimBLEAttValue value = characteristic->getValue();
    std::lock_guard<std::mutex> lock(incomingLock);
    incoming.assign(reinterpret_cast<const char*>(value.data()), value.size());
    hasIncoming = true;
  }
};

static void startBluetooth() {
  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setMTU(247);  // de stand past dan in één pakket

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  NimBLEService* service = server->createService(SERVICE_UUID);
  NimBLECharacteristic* stateChar = service->createCharacteristic(
      STATE_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR, 512);
  stateChar->setCallbacks(new StateCallbacks());
  inputChar = service->createCharacteristic(INPUT_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY, 64);
  service->start();

  // De service-UUID in de advertentie (zodat de app het scherm vindt), de naam in het scanantwoord.
  NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
  NimBLEAdvertisementData adv;
  adv.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
  adv.setCompleteServices(NimBLEUUID(SERVICE_UUID));
  advertising->setAdvertisementData(adv);
  NimBLEAdvertisementData scanResponse;
  scanResponse.setName(DEVICE_NAME);
  advertising->setScanResponseData(scanResponse);
  advertising->enableScanResponse(true);
  advertising->start();
}

static void showNotice(const char* text) {
  notice = text;
  noticeUntil = millis() + 2500;
  needsDraw = true;
}

static void sendCommand(const char* json) {
  if (!connected || !inputChar) {
    showNotice("Niet verbonden met de app");
    return;
  }
  inputChar->notify(reinterpret_cast<const uint8_t*>(json), strlen(json));
}

// ---------- Stand verwerken ----------

static void applyStanding(const std::string& json) {
  JsonDocument doc;
  if (deserializeJson(doc, json)) return;  // kapot bericht: negeren
  standing.hole = doc["h"] | 0;
  standing.par = doc["p"] | 0;
  standing.si = doc["i"] | 0;
  standing.length = doc["m"] | 0;
  standing.course = String(doc["c"] | "");
  standing.count = 0;
  for (JsonVariant item : doc["pl"].as<JsonArray>()) {
    if (standing.count >= MAX_PLAYERS) break;
    JsonArray p = item.as<JsonArray>();
    Player& player = standing.players[standing.count++];
    player.name = String(p[0] | "");
    player.strokes = p[1] | 0;
    player.gross = p[2] | 0;
    player.toPar = p[3] | 0;
  }
  standing.valid = true;
  if (selected >= standing.count) selected = 0;
  needsDraw = true;
}

// Direct op het scherm laten zien; de app stuurt meteen de echte stand terug.
static void changeScore(int delta) {
  if (!standing.valid || standing.count == 0) return;
  char json[40];
  snprintf(json, sizeof(json), "{\"c\":\"s\",\"p\":%d,\"d\":%d}", selected, delta);
  sendCommand(json);
  if (!connected) return;
  Player& p = standing.players[selected];
  const int before = p.strokes;
  int after = before == 0 ? (delta > 0 ? 1 : 0) : before + delta;  // tellen per slag: leeg begint bij 1, net als in de app
  if (after < 1) after = 0;
  // Bijdrage van deze hole aan "tegen par": 0 als er (nog) geen score is.
  auto overPar = [](int strokes, int par) { return strokes == 0 ? 0 : strokes - par; };
  p.strokes = after;
  p.gross += after - before;
  p.toPar += overPar(after, standing.par) - overPar(before, standing.par);
  needsDraw = true;
}

static void changeHole(int delta) {
  sendCommand(delta > 0 ? "{\"c\":\"h\",\"d\":1}" : "{\"c\":\"h\",\"d\":-1}");
}

static void nextPlayer() {
  if (standing.count == 0) return;
  selected = (selected + 1) % standing.count;
  needsDraw = true;
}

// ---------- Tekenen ----------

static String formatToPar(int value) {
  if (value == 0) return "E";
  return value > 0 ? "+" + String(value) : String(value);
}

static void draw() {
  const int w = canvas.width();
  const int h = canvas.height();
  const bool large = w >= 300;
  const bool touch = M5.Touch.isEnabled();
  const int footerH = touch ? h / 6 : (large ? 22 : 16);

  canvas.fillScreen(TFT_WHITE);
  canvas.setTextColor(TFT_BLACK);

  // Kop: hole, par, verbinding en batterij
  canvas.setTextDatum(top_left);
  canvas.setFont(large ? &fonts::FreeSansBold24pt7b : &fonts::FreeSansBold18pt7b);
  String title = standing.valid ? "Hole " + String(standing.hole) : String("Golfscore");
  canvas.drawString(touch ? String("< ") + title + " >" : title, 4, 2);
  int y = canvas.fontHeight() + 4;

  canvas.setFont(large ? &fonts::FreeSans12pt7b : &fonts::FreeSans9pt7b);
  if (standing.valid) {
    String meta = "Par " + String(standing.par) + "  SI " + String(standing.si);
    if (standing.length > 0) meta += "  " + String(standing.length) + " m";
    canvas.drawString(meta, 4, y);
  }
  canvas.setTextDatum(top_right);
  int battery = M5.Power.getBatteryLevel();
  String status = String(connected ? "BT" : "--") + (battery >= 0 ? "  " + String(battery) + "%" : "");
  canvas.drawString(status, w - 4, 4);
  y += canvas.fontHeight() + 4;
  canvas.drawFastHLine(0, y, w, TFT_BLACK);
  headerBottom = y;
  footerTop = h - footerH;
  y += 4;

  // Spelers: naam, slagen op deze hole, totaal t.o.v. par
  canvas.setFont(large ? &fonts::FreeSansBold18pt7b : &fonts::FreeSansBold9pt7b);
  const int rowH = canvas.fontHeight() + (large ? 10 : 6);
  rowHeight = rowH;
  if (!standing.valid) {
    canvas.setTextDatum(top_left);
    canvas.drawString(connected ? "Wacht op de app..." : "Open de app en", 4, y + 4);
    if (!connected) canvas.drawString("tik op Verbinden", 4, y + 4 + rowH);
  }
  for (int i = 0; i < standing.count && y + rowH <= h - footerH; i++) {
    const Player& p = standing.players[i];
    const bool isSelected = i == selected;
    rowTop[i] = y;
    if (isSelected) canvas.fillRect(0, y, w, rowH, TFT_BLACK);
    canvas.setTextColor(isSelected ? TFT_WHITE : TFT_BLACK);
    const int ty = y + (large ? 5 : 3);
    canvas.setTextDatum(top_left);
    canvas.drawString(p.name.substring(0, large ? 10 : 7), 6, ty);
    canvas.setTextDatum(top_right);
    canvas.drawString(p.strokes > 0 ? String(p.strokes) : String("-"), w * 2 / 3, ty);
    canvas.drawString(formatToPar(p.toPar), w - 6, ty);
    y += rowH;
  }
  canvas.setTextColor(TFT_BLACK);

  // Voet: bediening of melding
  canvas.setFont(large ? &fonts::FreeSans12pt7b : &fonts::FreeSans9pt7b);
  const int fy = h - footerH;
  canvas.drawFastHLine(0, fy, w, TFT_BLACK);
  canvas.setTextDatum(middle_center);
  if (notice.length() && millis() < noticeUntil) {
    canvas.drawString(notice, w / 2, fy + footerH / 2);
  } else if (touch) {
    canvas.drawFastVLine(w / 3, fy, footerH, TFT_BLACK);
    canvas.drawFastVLine(w * 2 / 3, fy, footerH, TFT_BLACK);
    canvas.setFont(large ? &fonts::FreeSansBold18pt7b : &fonts::FreeSansBold12pt7b);
    canvas.drawString("-", w / 6, fy + footerH / 2);
    canvas.drawString("Speler", w / 2, fy + footerH / 2);
    canvas.drawString("+", w * 5 / 6, fy + footerH / 2);
  } else {
    canvas.drawString("A:-  B:speler  C:+  lang B:hole>", w / 2, fy + footerH / 2);
  }

  canvas.pushSprite(0, 0);
}

// ---------- Bediening ----------

static void handleTouch() {
  if (!M5.Touch.isEnabled() || M5.Touch.getCount() == 0) return;
  const auto& t = M5.Touch.getDetail();
  if (!t.wasClicked()) return;
  const int w = M5.Display.width();
  const int h = M5.Display.height();
  if (t.y < 0 || t.y >= h) return;  // tik op de knoppen onder het scherm: die gaan via BtnA/B/C
  if (t.y < headerBottom) {
    changeHole(t.x < w / 2 ? -1 : 1);
  } else if (t.y >= footerTop) {
    if (t.x < w / 3) changeScore(-1);
    else if (t.x > w * 2 / 3) changeScore(1);
    else nextPlayer();
  } else {
    // Rij aangetikt: die speler kiezen en één slag erbij (tellen per slag)
    for (int i = 0; i < standing.count; i++) {
      if (t.y >= rowTop[i] && t.y < rowTop[i] + rowHeight) {
        selected = i;
        changeScore(1);
        needsDraw = true;
      }
    }
  }
}

static void handleButtons() {
  if (M5.BtnA.wasClicked()) changeScore(-1);
  if (M5.BtnC.wasClicked()) changeScore(1);
  if (M5.BtnB.wasClicked()) nextPlayer();
  if (M5.BtnB.wasHold()) changeHole(1);
  if (M5.BtnA.wasHold()) changeHole(-1);
}

void setup() {
  auto cfg = M5.config();
  M5.begin(cfg);
  if (M5.Display.isEPD()) {
    M5.Display.setEpdMode(epd_mode_t::epd_fast);
  } else {
    M5.Display.setBrightness(200);
  }
  canvas.setColorDepth(M5.Display.isEPD() ? 1 : 16);
  canvas.createSprite(M5.Display.width(), M5.Display.height());
  startBluetooth();
  draw();
}

void loop() {
  M5.update();
  handleButtons();
  handleTouch();

  std::string message;
  {
    std::lock_guard<std::mutex> lock(incomingLock);
    if (hasIncoming) {
      message.swap(incoming);
      hasIncoming = false;
    }
  }
  if (!message.empty()) applyStanding(message);

  if (connectionChanged.exchange(false)) needsDraw = true;
  if (notice.length() && millis() >= noticeUntil) {
    notice = "";
    needsDraw = true;
  }

  // E-ink niet vaker dan nodig verversen
  static uint32_t lastDraw = 0;
  const uint32_t minInterval = M5.Display.isEPD() ? 400 : 30;
  if (needsDraw && millis() - lastDraw >= minInterval) {
    draw();
    needsDraw = false;
    lastDraw = millis();
  }
  delay(10);
}
