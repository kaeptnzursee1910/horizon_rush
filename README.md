# Horizon Rush

Arcade-Rennspiel und Party-Spiel im Browser – die Web-Version von Horizon Rush (ursprünglich in Python/pygame).
Läuft auf iPad, Android-Tablet und Windows-PC in Safari, Chrome, Edge oder Firefox.

**Spielen:** https://simkol34-ai.github.io/horizon_rush/

## Inhalt
- 3 Strecken (Küstenstraße, Alpenpass, Wüstencanyon), 4 Autos mit Lackierungen
- Einzelrennen, Meisterschaft, Zeitfahren, 2 Spieler im Splitscreen
- Online-Rennen für 2–8 Geräte, freie Startplätze fährt die KI
- Party-Modus für bis zu 8 Spieler mit 12 Minispielen, Chat und Siegerehrung
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

## Party
1. Ein Gerät tippt auf *Party → Party eröffnen* und bekommt einen 4-stelligen Code.
2. Alle anderen tippen auf *Party*, geben den Code ein und tippen auf *Beitreten*.
3. In der Lobby sehen alle die Einstellungen des Gastgebers: Spielerzahl, Runden und ob die
   Minispiele zufällig kommen oder ausgewählt werden. Nebenan ist ein Chat. Bei „Auswählen“
   wählt der Gastgeber vor jeder Runde das Minispiel, alle sehen dabei die Spielerliste und den Chat.
4. Vor jeder Runde erscheinen Beschreibung und Steuerung des Spiels. Sobald alle auf *Bereit!*
   getippt haben, geht es los. Platz 1 bis 8 bekommen 10, 8, 6, 5, 4, 3, 2 und 1 Punkte.

Minispiele:
- **Fahrspiele:** A1 Ausscheidungsrennen, A2 Polizeijagd, A3 Heiße Bombe, A5 Turbo-Rennen mit Extras
- **Arena-Spiele:** B1 Lichtrad-Arena, B2 Panzer-Arena, B3 Autoscooter-Sumo, B4 Mini-Rennen von oben,
  B6 Wolken-Wettklettern, B7 Tunnel-Überleben, B9 Pong-Achteck, B10 Straßen-Überquerung

Mit Tastatur: Pfeiltasten oder WASD, Leertaste für Aktionen (Extra, Feuer, Stoß, Schubser).

## Technik
Reines HTML, CSS und JavaScript ohne Build-Schritt. `index.html` lädt die Dateien aus `js/`:
`core.js` (Strecken, Autos, Grafiken), `race.js` (Fahrphysik, KI), `render.js` (Pseudo-3D),
`audio.js` (Sound), `input.js` (Touch/Tastatur), `net.js` (Online), `main.js` (Menüs, Ablauf),
`party.js` (Party-Lobby, Chat, Runden, Punkte), `partyrace.js` (Fahrspiele A1–A5),
`arena.js` (Grundgerüst der 2D-Spiele) und `games/*.js` (die Arena-Spiele).
Im Party-Modus rechnet der Gastgeber die Arena-Spiele, die anderen Geräte schicken nur ihre Tasten.
