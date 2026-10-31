# Horizon Rush

Das Party-Spiel für bis zu 8 Spieler im Browser.
Läuft auf iPad, Android-Tablet und Windows-PC in Safari, Chrome, Edge oder Firefox.

**Spielen:** https://kaeptnzursee1910.github.io/horizon_rush/

## Inhalt
- **Multiplayer:** Party für bis zu 8 Spieler mit 24 Minispielen, Chat und Siegerehrung
- **Singleplayer:** alle 24 Minispiele gegen 1 bis 7 Computergegner, mit Runden, Punkten und Siegerehrung.
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
  Schatzgräber, Schnellzieher, Ballonpumpen, Im Dunkeln, Münzsturm

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

## Verbindung
Die Geräte verbinden sich per WebRTC direkt miteinander. In Netzwerken, die direkte Verbindungen
blockieren (etwa Firmen- oder Hochschul-WLANs), läuft die Verbindung über einen Verbindungsserver.
Die Zugangsdaten dafür trägt man unter *Einstellungen → Verbindungsserver* ein. Sie stehen nicht im Code
und werden nur im Browser des jeweiligen Geräts gespeichert.
