# Matchday Arcade

Five free football games, built on 7,208 real players. Play **online with friends** (rooms, chat, reactions) or **on one device** (pass the phone).

**Play:** https://aziz0810.github.io/abid-arcade/

| Game | How it works |
|---|---|
| **Close Control** | Find the secret footballer. Every guess is ranked by how similar it is (nationality, clubs, teammates, leagues, position, age). Daily match + unlimited. |
| **30 Seconds** | One category ("Played for Chelsea and Inter"), 30 seconds, name as many players as you can. 1–4 players. |
| **Letter Rush** | Name players whose first name or surname starts with a letter before the clock runs out. |
| **Name Chain** | Each name starts with the last letter of the previous one (Cristiano Ronaldo → Onana → …). Vs CPU, pass & play, or solo. |
| **Link Up** | A card game: play a card by naming a player who links it to the one on the table (Man United → Real Madrid: Cristiano Ronaldo). Clubs, nations, leagues, coaches, Ballon d'Or, Champions League. |

Plus **Close Control Duel**: 2–4 players on one device take turns hunting the same secret player.

## Online play

- **Play online** → enter a name and avatar → **Play as guest** (no account) or **Sign in with Google**.
- **Create a room** and share the 5-letter code or the invite link (`…/#join-ABCDE`). Friends join from any phone or computer.
- Every room has a **chat** and **emoji reactions** that float across everyone's screen.
- All five games work online:
  - **Close Control**: a live race on the same secret player, with a leaderboard.
  - **30 Seconds / Letter Rush**: everyone plays at once, and answers nobody else gave score double.
  - **Name Chain**: turn by turn.
  - **Link Up**: private hands, and CPUs can fill empty seats.
- The host's browser runs the game. If the host leaves or their phone locks, another player takes over automatically.
- Room points and wins are tracked on the player chips.

Until Firebase is configured, **Play online** runs in *demo mode*: rooms only work between tabs of the same browser.

## Turn on online play (free, about 5 minutes)

Online play uses Firebase Realtime Database (free Spark plan, no credit card).

1. Go to https://console.firebase.google.com → **Add project** (Analytics can stay off).
2. **Build → Authentication → Get started → Sign-in method**: enable **Anonymous**, and enable **Google** (pick a support email).
3. **Authentication → Settings → Authorized domains → Add domain**: `aziz0810.github.io`.
4. **Build → Realtime Database → Create database** (any location, start in **locked mode**). Open the **Rules** tab, paste the contents of [`database.rules.json`](database.rules.json), and click **Publish**.
5. **Project settings** (gear icon) → **Your apps** → web icon `</>` → register an app → copy the `firebaseConfig` object.
6. In [`firebase-config.js`](firebase-config.js), replace `null` with that object. Make sure it includes `databaseURL` (if not, copy it from the Realtime Database page). Commit, and the site updates in about a minute.

The web config values are not secret: access is controlled by the database rules and sign-in.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole arcade (all games + player data). Static, no server. |
| `online.js`, `online.css` | Online rooms, chat, and the online versions of the games. |
| `firebase-config.js` | Your Firebase settings (empty = demo mode). |
| `database.rules.json` | Security rules to paste into Firebase. |
| `tools/` | Scripts that build `index.html` from the player data. |

## Data

Player data comes from [transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) (CC0), snapshot of July 2026,
plus hand-entered careers for legends who retired before 2012. Coach links use match lineups from 2013 onward and coaching
tenures before that. Progress and stats are stored in each player's browser.

## Rebuilding with fresh data

`tools/` holds the scripts that produced `index.html`.

```bash
mkdir -p data build && cd data
for f in players transfers clubs competitions appearances games game_lineups; do
  curl -sSO https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/$f.csv.gz
done
cd ..
```

```bash
cp tools/arcade_body.html tools/style.css build/
python3 tools/build.py data tools/legends-source.html tools/countries.json build/data.json
python3 tools/build_extra.py data build
python3 tools/assemble_arcade.py build build/arcade.html
python3 tools/make_index.py build/arcade.html index.html   # adds the online.js / online.css hooks
```

Requires Python 3 with pandas and numpy.
