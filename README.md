# Block Life Simulator – online verze

Tahle složka obsahuje **celou hru + multiplayer server**. Jsou dvě části:

| Část | Co to je | Kde běží |
|---|---|---|
| **Hra** (`index.html`, `js/`) | statické soubory | GitHub Pages (nebo kdekoli – nebo přímo ze serveru) |
| **Server** (`server/`) | Node.js, WebSocket, max. 4 hráči, admin | u tebe doma / na VPS |

Hra na GitHub Pages **sama o sobě multiplayer neumí** – GitHub hostuje jen soubory. Hráči se připojí na tvůj server
(tlačítko **🌐 Online hra** v nabídce). Jednoduchá hra pro jednoho hráče funguje i bez serveru.

---

## Varianta A – nejjednodušší (jen doma / LAN, bez GitHubu)

Server umí rozdávat i samotnou hru, takže stačí jeden proces:

```bash
cd server
npm install          # jednou
node server.js
```

Na konzoli uvidíš port, seed a **admin heslo**. Otevři `http://localhost:8080/` – adresa serveru se v nabídce
vyplní sama. Kamarádi ve tvé síti: `http://TVOJE-IP:8080/`.

Pro hraní přes internet potřebuješ přístup zvenku – viz „Tunel“ níže.

## Varianta B – hra na GitHub Pages + server doma

### 1) Nahraj hru na GitHub Pages
1. Vytvoř repozitář na GitHubu a nahraj do něj **obsah téhle složky** (`index.html`, `js/`, `.nojekyll`, `server/`…).
   Složka `server/` tam klidně být může (jen se nepoužije); `server/data/` a `node_modules/` jsou v `.gitignore`.
2. *Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`*.
3. Za minutu je hra na `https://TVOJE-JMENO.github.io/NAZEV-REPA/`.

### 2) Spusť server doma
```bash
cd server
npm install
node server.js
```

### 3) Zpřístupni server přes **wss://** (povinné!)
GitHub Pages je **HTTPS**, a prohlížeč z HTTPS stránky povolí jen **šifrované** spojení (`wss://`). Nejjednodušší cesty:

* **Cloudflare Tunnel** (zdarma, bez otevírání portů na routeru):
  `cloudflared tunnel --url http://localhost:8080` → vypíše adresu `https://něco.trycloudflare.com`
  → do hry zadáš `wss://něco.trycloudflare.com`. (Pro stálou adresu si na Cloudflare přidej vlastní doménu a pojmenovaný tunel.)
* **Tailscale Funnel** nebo **ngrok** – funguje stejně (`ngrok http 8080` → `wss://…ngrok…`).
* **Vlastní doména + reverzní proxy** (Caddy/nginx s Let's Encrypt) → `wss://hra.tvoje-domena.cz`.
* Jen test na jednom PC: `ws://localhost:8080` funguje i z HTTPS stránky.

### 4) Ať hráči nemusí adresu opisovat
Otevři `js/config.js` a doplň:
```js
window.BLS_SERVER = 'wss://něco.trycloudflare.com';
```
(Alternativa: odkaz `https://…github.io/repo/?server=wss://něco.trycloudflare.com`.)

---

## Admin

* Při startu serveru se vypíše **admin heslo** (uloží se do `server/data/admin.txt`; nastavíš ho i přes `ADMIN_PASSWORD`).
* V nabídce „Online hra“ ho zadáš do pole **Admin heslo** – nebo za hry napíšeš `/login HESLO`.
* Admin se pozná **jen podle hesla** (jména se dají podvrhnout), a platí jen pro to připojení.
* Admin může dál povyšovat další: `/op jméno`, `/deop jméno`.

### Příkazy (chat: `T` nebo `/`)
| Příkaz | Kdo | Co dělá |
|---|---|---|
| `/list`, `/me text`, `/login heslo`, `/help` | všichni | |
| `/time day\|noon\|sunset\|night\|midnight\|0-1` | admin | nastaví denní dobu všem |
| `/weather clear\|rain\|storm` | admin | počasí |
| `/tp jméno [cíl]`, `/tphere jméno` | admin | teleport |
| `/kick jméno [důvod]`, `/ban jméno`, `/unban jméno`, `/bans` | admin | |
| `/mute jméno`, `/unmute jméno`, `/say text` | admin | |
| `/op`, `/deop`, `/seed`, `/save`, `/stop` | admin | |

Stejné příkazy (bez `/`) můžeš psát i do konzole serveru.

## Nastavení serveru

Proměnné prostředí, nebo soubor `server/config.json`:

| Proměnná | Výchozí | Význam |
|---|---|---|
| `PORT` | 8080 | port |
| `MAX_PLAYERS` | 4 | kolik hráčů najednou |
| `SEED` | náhodný | seed světa (jen při prvním startu, pak je uložený) |
| `MODE` | creative | `creative` / `survival` (jen při prvním startu) |
| `ADMIN_PASSWORD` | vygenerované | admin heslo |
| `SERVER_PASSWORD` | – | heslo pro vstup (kdo nezná, nevstoupí) |
| `MOTD` | | uvítací zpráva |
| `ALLOWED_ORIGINS` | všechny | např. `https://tvoje-jmeno.github.io` – pustí jen hru z té adresy |
| `STATIC` | 1 | `0` = server nerozdává hru, jen hraje |
| `DATA_DIR` | `server/data` | kde se ukládá svět |

Doporučení pro internet: nastav `SERVER_PASSWORD` a `ALLOWED_ORIGINS`.

Svět (změny bloků, truhly, nábytek, inventáře hráčů, čas) se ukládá do `server/data/world.json`
každých 30 s a při vypnutí. Záloha = zkopírovat ten soubor. Nový svět = smazat ho.

## Nároky

Server nesimuluje svět, jen přeposílá zprávy – pro 4 hráče je to pár MB RAM a zanedbatelný CPU. Provoz je
~10 malých zpráv za sekundu na hráče (desítky kB/s). Vyhodí ho spíš domácí upload než procesor.
Hráč si svět generuje a vykresluje u sebe, takže nároky na PC hráče jsou stejné jako v singleplayeru.

## Co je synchronizované a co ne (první verze)

**Sdílené:** seed a svět, všechny položené/vytěžené bloky (včetně výbuchů, dveří, pák), truhly, nábytek a cedule,
hráči (poloha, směr, chůze, jmenovka), chat, denní doba a počasí, inventář/poloha se uloží při odchodu
(po návratu pokračuješ).

**Zatím lokální u každého hráče:** vesničané, zvířata, příšery, nájezdy, golemové, auta, upuštěné předměty,
pece, obchody a reputace. Každý hráč tedy vidí „své“ NPC; stavby ve světě ale vidíte všichni stejné.
Hráči se navzájem nezraňují (žádné PvP).

## Řešení potíží

* **„Nepodařilo se připojit“** – neběží server, špatná adresa, nebo chybí tunel (u GitHub Pages musí být `wss://`).
* **„Server je plný“** – hraje už 4 hráči (`MAX_PLAYERS`).
* **„Jméno už někdo používá“** – zvol jiné.
* Po změně souborů hry na GitHubu si hráči případně obnoví stránku (Ctrl+F5).
