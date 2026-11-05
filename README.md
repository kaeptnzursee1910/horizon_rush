# Horizon Rush

Das Party-Spiel für bis zu 8 Spieler im Browser.
Läuft auf iPad, Android-Tablet und Windows-PC in Safari, Chrome, Edge oder Firefox.

**Spielen:** https://kaeptnzursee1910.github.io/horizon_rush/

## Inhalt
- **Multiplayer:** Party für bis zu 8 Spieler mit 25 Minispielen, Chat und Siegerehrung. Freie Plätze füllen beim Start Computergegner auf.
- **Singleplayer:** alle 25 Minispiele gegen 1 bis 7 Computergegner, mit Runden, Punkten und Siegerehrung.
  Dort gibt es auch ein freies Rennen gegen 7 Computergegner.
- 3 Strecken (Küstenstraße, Alpenpass, Wüstencanyon), 4 Autos mit Lackierungen

## Steuerung
- **Touch:** wie ein Controller: links ein Steuerkreuz (hoch, runter, links, rechts), rechts die Aktionstasten des jeweiligen Spiels (z. B. GAS und BREMSE, SPRUNG, WERFEN), oben II für Pause
- **Tastatur:** Pfeiltasten oder WASD, Esc Pause, M Ton, F11 Vollbild

Auf dem iPad: In Safari öffnen, dann *Teilen → Zum Home-Bildschirm*. So startet das Spiel im Vollbild.

## Multiplayer (Party)
1. Ein Gerät tippt auf *Multiplayer → Party eröffnen* und bekommt einen 4-stelligen Code.
2. Alle anderen tippen auf *Multiplayer*, geben den Code ein und tippen auf *Beitreten*.
   Einfacher: Der Gastgeber tippt in der Lobby auf *Einladungslink teilen* und schickt den Link,
   z. B. per WhatsApp. Wer ihn öffnet, gibt nur noch seinen Namen ein und tippt auf *Beitreten*.
   Hat der Gastgeber einen Verbindungsserver eingetragen, nimmt der Link die Zugangsdaten mit
   (im Teil nach `#`, der nie an einen Server geht) und trägt sie beim Gast automatisch ein.
3. In der Lobby sehen alle die Einstellungen des Gastgebers: Spielerzahl, Runden und ob die
   Minispiele zufällig kommen oder ausgewählt werden. Nebenan ist ein Chat. Bei „Auswählen“
   wählt der Gastgeber vor jeder Runde das Minispiel, alle sehen dabei die Spielerliste und den Chat.
4. Vor jeder Runde erscheinen Beschreibung und Steuerung des Spiels. Sobald alle auf *Bereit!*
   getippt haben, geht es los. Platz 1 bis 8 bekommen 10, 8, 6, 5, 4, 3, 2 und 1 Punkte.

Minispiele:
- **Fahrspiele:** Ausscheidungsrennen, Polizeijagd, Heiße Bombe, Turbo-Rennen mit Extras
- **Arena-Spiele:** Lichtrad-Arena, Panzer-Arena, Autoscooter-Sumo, Mini-Rennen von oben,
  Wolken-Wettklettern, Tunnel-Überleben, Pong-Achteck, Straßen-Überquerung, Brüchiger Boden,
  Laser-Sprung, Kistenregen, Kronenjagd, Schneeballschlacht, Gedächtnis-Felder, Ampel-Lauf,
  Schatzgräber, Schnellzieher, Ballonpumpen, Im Dunkeln, Münzsturm, Hüpf-Parcours

Autoscooter-Sumo geht über 5 Runden, es gewinnt, wer die meisten Runden für sich entscheidet.
Der Hüpf-Parcours ist ein Jump and Run: Jedes Mal wird ein neues Level gebaut (Lücken, Stacheln,
schwebende Plattformen, Sprungfedern, Kreissägen) und vorher geprüft, ob es bis zur Zielflagge lösbar ist.

Die Computergegner spielen wie Menschen: Sie reagieren mit kurzer Verzögerung, drücken Tasten nicht
beliebig kurz, machen ab und zu Fehler und haben jeweils ihren eigenen Stil (vorsichtig oder mutig).

Alle Arena-Spiele teilen einen Grafikstil (runde Party-Figuren, kräftige Farben, dunkle Umrisse).

Mit Tastatur: Pfeiltasten oder WASD, Leertaste oder Enter für die Hauptaktion, Shift oder Q für die zweite Aktion.

## Technik
Reines HTML, CSS und JavaScript ohne Build-Schritt. `index.html` lädt die Dateien aus `js/`:
`core.js` (Strecken, Autos, Grafiken), `race.js` (Fahrphysik, KI), `render.js` (Pseudo-3D),
`audio.js` (Sound), `input.js` (Touch/Tastatur), `net.js` (Online), `main.js` (Menüs, Ablauf),
`party.js` (Party-Lobby, Chat, Runden, Punkte), `partyrace.js` (Fahrspiele),
`arena.js` (Grundgerüst der 2D-Spiele), `style.js` (gemeinsamer Grafikstil), `games/*.js` (die Arena-Spiele) und `showcase.js`
(Hintergrund des Startbildschirms: alle Minispiele im Wechsel, gespielt vom Computer).
Im Party-Modus rechnet der Gastgeber die Arena-Spiele, die anderen Geräte schicken nur ihre Tasten.

**Grafikstil:** Unter Einstellungen → Grafikstil wählt jedes Gerät „Original“ (Tageslicht-Rennlook) oder „Neon“.
Original ist der Grundstand. Neon liegt als Aufsatz in `js/neon/` und `style-neon.css`: `neon/style.js` und
`neon/render.js` ersetzen die Zeichenwerkzeuge, die `*-patch.js`-Dateien setzen nur die Zeichenfunktionen von
Strecken, Autos, Menüs und Minispielen ein. Spiellogik und Netzwerk sind gemeinsam, daher spielen Geräte mit
verschiedenen Stilen problemlos zusammen. Wer neue Spiellogik baut, ändert nur die Grunddateien; wer neue
Zeichnungen baut, sollte für Neon in `js/neon/games-patch.js` eine eigene `draw`-Funktion ergänzen (sonst nutzt
Neon die Original-Zeichnung).

## Verbindung
Die Geräte verbinden sich per WebRTC direkt miteinander. In Netzwerken, die direkte Verbindungen
blockieren (etwa Firmen- oder Hochschul-WLANs), läuft die Verbindung über einen Verbindungsserver.
Die Zugangsdaten dafür trägt man unter *Einstellungen → Verbindung* ein. Sie stehen nicht im Code
und werden nur im Browser des jeweiligen Geräts gespeichert.

Unter *Einstellungen → Verbindung* (oder *Verbindungseinstellungen* beim Eröffnen/Beitreten) wählt man den **Verbindungsweg**:
- **Direkt (P2P)** – nur direkte Verbindungen; der Spielverkehr läuft nie über den Verbindungsserver und spart dessen Kontingent. Klappt nicht in Netzen, die direkte Verbindungen sperren.
- **Automatisch** – direkt, wenn möglich, sonst über den Verbindungsserver (Standard).
- **Über Server** – der gesamte Verkehr läuft über den Verbindungsserver (braucht Zugangsdaten).

Der Gastgeber gibt seine Wahl im Einladungslink (`&via=…`) an die Gäste weiter. In der Lobby steht bei jedem Mitspieler, welcher Weg tatsächlich genutzt wird (⇄ Direkt / ☁ Server).
