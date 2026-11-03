# Putt Matto ⛳

Un videogioco 2D di minigolf (solo putt) che si gioca nel browser, da computer con la tastiera o da telefono con il touch.

## Regole

- Un giro è di **9 buche**.
- Ogni buca va chiusa in **massimo 2 colpi**. Se non ce la fai, **ricominci il percorso dalla buca 1**.
- **Power up, hole in one**: se imbuchi al primo colpo, alla buca successiva hai **3 colpi** invece di 2.
- Ogni giro completato vale **1 vittoria**. Le vittorie si spendono nel **Negozio** per comprare nuovi personaggi.

## Comandi

| | Tastiera | Telefono |
|---|---|---|
| Mirare | `←` `→` (con `Shift` più preciso) | trascina il dito all'indietro, come una fionda |
| Potenza e tiro | tieni premuto `Spazio`, rilascia per tirare | più trascini, più forte; lascia per tirare |
| Pausa | `Esc` | pulsante ❚❚ in alto a destra |
| Menu | frecce + `Invio` | tocca i pulsanti |

## Personaggi

| Personaggio | Prezzo | Com'è fatto |
|---|---|---|
| Gino | iniziale | Golfista normale: polo rossa e pantaloncini |
| Acquaman | 8 vittorie | Fatto interamente d'acqua, lascia goccioline |
| Elicus | 8 vittorie | Ha un'elica che gira al posto della testa |
| Magmo | 9 vittorie | Roccia vulcanica con crepe di lava e una fiammella in testa |
| Spinoso | 9 vittorie | Un cactus con un fiore in testa |
| Bullone | 10 vittorie | Robot con antenna lampeggiante |
| Nuvolo | 10 vittorie | Una nuvoletta con le gambe a goccia che piove |

Ogni personaggio speciale lascia una scia diversa dietro la pallina. Vittorie e personaggi vengono salvati nel browser (localStorage) del dispositivo.

## I percorsi

Ci sono 6 percorsi da 9 buche: si sceglie quale giocare dopo aver premuto *Gioca*. Ogni percorso completato vale 1 vittoria.

| Percorso | Ostacoli |
|---|---|
| Il Prato | muretti, sabbia, pendenze, funghi, blocchi mobili |
| La Spiaggia | lagune, dune, un molo stretto, onde che si muovono |
| Il Ghiacciaio | lastre di ghiaccio che fanno scivolare, eliche rotanti, crepacci |
| Il Vulcano | fiumi di lava, rampe acceleratrici, pistoni |
| Lo Spazio | portali IN → OUT, asteroidi, satelliti in orbita, gravità che spinge di lato |
| La Giungla | fiumi, radici, un tempio, la palude e la cascata che spinge indietro |

**Acqua e lava**: se la pallina ci finisce dentro torna dove l'hai colpita e il colpo è perso.

## Come avviarlo

Non serve installare niente: apri `index.html` nel browser.

Per giocarci dal telefono la cosa più comoda è **GitHub Pages**: nel repo vai su *Settings → Pages*, scegli *Deploy from a branch*, branch `main`, cartella `/ (root)` e salva. Dopo un minuto il gioco è online su `https://rickyd81.github.io/NextStage/`.

## Struttura

- `index.html`, `style.css`: pagina e schermate (menu, negozio, regole, pausa, risultato)
- `js/physics.js`: fisica della pallina e disegno dei 6 percorsi
- `js/characters.js`: personaggi (prezzi, descrizioni, disegno)
- `js/game.js`: logica di gioco, comandi, negozio e salvataggi
- `tools/verifica-buche.js`: controlla con Node che ogni buca si possa chiudere in 2 colpi (`node tools/verifica-buche.js` oppure `node tools/verifica-buche.js spiaggia` per un solo percorso)
