# Matchday Arcade

Five free football games in one page, built on 7,208 real players.

**Play:** https://aziz0810.github.io/abid-arcade/

| Game | How it works |
|---|---|
| **Close Control** | Find the secret footballer. Every guess is ranked by how similar it is (nationality, clubs, teammates, leagues, position, age). Daily match + unlimited. |
| **30 Seconds** | One category ("Played for Chelsea and Inter"), 30 seconds, name as many players as you can. 1–4 players. |
| **Letter Rush** | Name players whose first name or surname starts with a letter before the clock runs out. |
| **Name Chain** | Each name starts with the last letter of the previous one (Cristiano Ronaldo → Onana → …). Vs CPU, pass & play, or solo. |
| **Link Up** | A card game: play a card by naming a player who links it to the one on the table (Man United → Real Madrid: Cristiano Ronaldo). Clubs, nations, leagues, coaches, Ballon d'Or, Champions League. |

The whole game is a single static file, `index.html`. No server, no build step needed to host it.

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
cp tools/*.html tools/style.css build/
python3 tools/build.py data tools/legends-source.html tools/countries.json build/data.json
python3 tools/build_extra.py data build
python3 tools/assemble_arcade.py build build/arcade.html
python3 tools/make_index.py build/arcade.html index.html
```

Requires Python 3 with pandas and numpy.
