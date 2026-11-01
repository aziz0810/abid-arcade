# Matchday Arcade

Free football games, built on 7,208 real players, in English, French and Arabic. Play **online with friends** (rooms, chat, reactions) or **on one device** (pass the phone).

**Play:** https://aziz0810.github.io/abid-arcade/

| Game | How it works |
|---|---|
| **Guess the Player** | Find the secret footballer. Every guess is ranked by how similar it is (nationality, clubs, teammates, leagues, position, age). Daily match + unlimited. |
| **30 Seconds** | One category ("Played for Chelsea and Inter"), 30 seconds, name as many players as you can. 1–4 players. |
| **Letter Rush** | Name players whose first name or surname starts with a letter before the clock runs out. |
| **Name Chain** | Each name starts with the last letter of the previous one (Cristiano Ronaldo → Onana → …). Vs CPU, pass & play, or solo. |
| **Link Up** | A card game: play a card by naming a player who links it to the one on the table (Man United → Real Madrid: Cristiano Ronaldo). Clubs, nations, leagues, coaches, Ballon d'Or, Champions League. |

| **Who Am I?** | Clues about a mystery footballer appear one by one. Name them earlier for more points. Solo or online. |
| **Career Path** | A career appears club by club, oldest first ("2009–13 · Real Madrid"). Name the player before the last club shows. Solo or online. |
| **World Cup Run** | Pick a country and play seven matches, from the group stage to the final. In each match you score by naming players from the opposing nation before the whistle. Solo or online. |

Plus **Guess the Player Duel** (2–4 players on one device).

**Languages:** ⚙ Settings → Language switches between English, Français and العربية (right-to-left, with an Arabic font). The first visit follows the phone's language. Player and club names stay as they are.

**Progress:** every signed-in player has a **profile** (👤, or tap a name in a room) with a rating, level, win rate per game and 12 badges.
- **Ranked rooms** (a switch in Room settings, on by default) change each player's **rating** after every game. Everyone starts at 1000, with Elo-style ±K=32 swings, and moves through divisions: Bronze, Silver (1100), Gold (1300), Platinum (1500), Legend (1700).
- **XP and levels** come from games and challenges.
- **🎯 Challenges:** three daily challenges (new every day) and three weekly ones (new every Monday), for example "Name 10 players in 30 Seconds" or "Reach the World Cup quarter-finals". Clearing all three daily ones keeps your 🔥 streak going.
- The leaderboards gain a **Ratings** tab.

**App & comfort:** install it as an app (Add to Home Screen; the same-device games then work offline). The ⚙ Settings menu has dark mode, a bigger-text option, and sound and vibration switches. When it's your turn and the app is in the background, the browser tab title flashes.

## Online play

- **Play online** → enter a name and avatar → **Play as guest** (no account) or **Sign in with Google**.
- **Create a room** and share the 5-letter code or the invite link (`…/#join-ABCDE`). Friends join from any phone or computer.
- Every room has a **chat** and **emoji reactions** that float across everyone's screen.
- All five games work online:
  - **Guess the Player**: two modes. **Race**: unlimited guesses each, first to find the secret player wins. **Team**: take turns on one shared list; each turn is timed and passes to the next player if time runs out.
  - **30 Seconds / Letter Rush**: everyone plays at once, and answers nobody else gave score double.
  - **Name Chain**: turn by turn.
  - **Link Up**: private hands, and CPUs can fill empty seats.
- The host's browser runs the game. If the host leaves or their phone locks, another player takes over automatically.
- Room points and wins are tracked on the player chips.
- **Invite** opens your phone's share sheet and shows a **QR code** friends can scan. A **rejoin banner** takes you back to your last room after a reload.
- **Chat extras:** live "typing…" indicator (also shown for the player whose turn it is), one-tap quick phrases, and cheers that late joiners can send while they watch.
- **Themes** for Guess the Player, 30 Seconds, Letter Rush, Name Chain and Who Am I?: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Saudi Pro League, Arab footballers, African players, South Americans, Legends, New generation.
- **Tournament mode:** the host picks several games, and everyone plays them back to back for tournament points (5/3/2, then 1 for taking part). The tournament ends with a champion podium.
- **Public or private rooms:** private rooms are joined by code only. Public rooms appear in a live list on the Play online screen (with ⚡ Quick join). The host sets the room size (2–20 players) and can change it later, give the host role to someone else, or remove a player.
- **Friends:** every player gets a 6-character friend code. Add friends by code, or by tapping a name in a room. You can accept or decline requests, invite friends to your room (they get a banner anywhere on the site), join a friend's room, and see their status: online, in a room, or "last seen 12 min ago". In rooms, away players show how long they've been gone.
- **Leaderboards:** this month's top online players (from points won in rooms) and today's fastest Daily Guess the Player solvers.

- **Notifications:** ⚙ Settings → Turn on notifications. While the site is open in the background you get a system notification for invites, friend requests, your turn and new messages. With the optional server setup below, invites and friend requests also arrive when the site is closed, plus a daily-match reminder and a Monday "new weekly challenges" note.

Until Firebase is configured, **Play online** runs in *demo mode*: rooms only work between tabs of the same browser.

## Turn on online play (free, about 5 minutes)

Online play uses Firebase Realtime Database (free Spark plan, no credit card). The free plan allows **100 people connected at the same time** across the whole site, 1 GB stored and 10 GB downloaded per month. That's why rooms are capped at 20 players. If you grow past that, upgrading to the pay-as-you-go Blaze plan removes the connection limit.

1. Go to https://console.firebase.google.com → **Add project** (Analytics can stay off).
2. **Build → Authentication → Get started → Sign-in method**: enable **Anonymous**, and enable **Google** (pick a support email).
3. **Authentication → Settings → Authorized domains → Add domain**: `aziz0810.github.io`.
4. **Build → Realtime Database → Create database** (any location, start in **locked mode**). Open the **Rules** tab, paste the contents of [`database.rules.json`](database.rules.json), and click **Publish**. Do this again whenever `database.rules.json` changes (leaderboards, friends and public rooms all need the latest version).
5. **Project settings** (gear icon) → **Your apps** → web icon `</>` → register an app → copy the `firebaseConfig` object.
6. In [`firebase-config.js`](firebase-config.js), replace `null` with that object. Make sure it includes `databaseURL` (if not, copy it from the Realtime Database page). Commit, and the site updates in about a minute.

The web config values are not secret: access is controlled by the database rules and sign-in.

### Optional: notifications when the site is closed

This part needs the pay-as-you-go **Blaze** plan, because it runs small Cloud Functions. At this site's size it should stay within the free monthly allowance, but Google asks for a card. Notifications while the site is open in the background work without it.

1. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair.** Copy the key into `window.FIREBASE_VAPID_KEY` in [`firebase-config.js`](firebase-config.js) and commit.
2. Upgrade the project to **Blaze** (Firebase console, bottom left).
3. On a computer with Node 20:
   ```bash
   npm i -g firebase-tools
   ```
   ```bash
   firebase login
   ```
   ```bash
   cd functions && npm install && cd .. && firebase deploy --only functions,database
   ```
   This deploys [`functions/index.js`](functions/index.js) (invites, friend requests, the 18:00 Tunis-time daily reminder and the Monday challenges note, in each player's language). It also publishes `database.rules.json`, so you can use `firebase deploy --only database` instead of pasting the rules.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole arcade (all games + player data). Static, no server. |
| `online.js`, `online.css` | Online rooms, chat, the online versions of the games, profiles, ratings, challenges and notifications. |
| `i18n.js` | French and Arabic translations of the interface. |
| `functions/`, `firebase.json`, `.firebaserc` | Optional Cloud Functions that send notifications when the site is closed. |
| `.github/workflows/refresh-data.yml` | Rebuilds the player data on the 3rd of every month. |
| `firebase-config.js` | Your Firebase settings (empty = demo mode). |
| `database.rules.json` | Security rules to paste into Firebase. |
| `manifest.webmanifest`, `sw.js`, `icons/` | Make the site installable as an app and available offline. |
| `tools/` | Scripts that build `index.html` from the player data. |

## Data

Player data comes from [transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) (CC0), snapshot of July 2026,
plus hand-entered careers for legends who retired before 2012. Coach links use match lineups from 2013 onward and coaching
tenures before that. Progress and stats are stored in each player's browser.

## Rebuilding with fresh data

**Automatic:** the *Refresh player data* GitHub Action runs on the 3rd of every month (or on demand from the **Actions** tab → *Refresh player data* → *Run workflow*). It downloads the latest dataset, rebuilds `index.html`, refuses to publish if fewer than 5,000 players come out, and commits only if something changed. Note that the upstream dataset itself is updated irregularly (its latest snapshot is July 2026), so many months will have nothing new.

**By hand:** `tools/` holds the scripts that produced `index.html`.

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
