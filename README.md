# Horizon Rush

Arcade-Rennspiel im Browser – die Web-Version von Horizon Rush (ursprünglich in Python/pygame).
Läuft auf iPad, Android-Tablet und Windows-PC in Safari, Chrome, Edge oder Firefox.

**Spielen:** https://simkol34-ai.github.io/horizon_rush/

## Inhalt
- 3 Strecken (Küstenstraße, Alpenpass, Wüstencanyon), 4 Autos mit Lackierungen
- Einzelrennen, Meisterschaft, Zeitfahren, 2 Spieler im Splitscreen
- Online-Rennen für 2–8 Geräte, freie Startplätze fährt die KI
- Bestzeiten werden im Browser des Geräts gespeichert

## Steuerung
- **Touch:** links ◄ ►, rechts GAS und BREMSE, oben II für Pause
- **Tastatur:** Pfeiltasten oder WASD, Esc Pause, M Ton, F11 Vollbild
- **Splitscreen mit Tastatur:** Spieler 1 WASD, Spieler 2 Pfeiltasten

Auf dem iPad: In Safari öffnen, dann *Teilen → Zum Home-Bildschirm*. So startet das Spiel im Vollbild.

## Online-Rennen
1. Ein Gerät tippt auf *Online-Rennen → Rennen erstellen* und bekommt einen 4-stelligen Code.
2. Die anderen tippen auf *Online-Rennen*, geben den Code ein und tippen auf *Beitreten*.
3. Der Gastgeber wählt Strecke, Runden und KI-Stärke und startet das Rennen.

Die Geräte verbinden sich per WebRTC direkt miteinander (Vermittlung über PeerJS).
In Netzen wie eduroam, die direkte Verbindungen blockieren, läuft die Verbindung über einen
Relay-Server. Dafür braucht jedes Gerät einmal den **Online-Schlüssel** (Benutzername und Passwort),
den die Person vergibt, die das Spiel eingerichtet hat. Der Schlüssel steht nicht im Code,
er wird nur im Browser des jeweiligen Geräts gespeichert.

## Technik
Reines HTML, CSS und JavaScript ohne Build-Schritt. `index.html` lädt die Dateien aus `js/`:
`core.js` (Strecken, Autos, Grafiken), `race.js` (Fahrphysik, KI), `render.js` (Pseudo-3D),
`audio.js` (Sound), `input.js` (Touch/Tastatur), `net.js` (Online), `main.js` (Menüs, Ablauf).
