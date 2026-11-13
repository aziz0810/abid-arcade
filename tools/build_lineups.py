"""Pick famous starting line-ups for the Starting XI game and add them to extra.json.

Usage: python3 tools/build_lineups.py DATA_DIR BUILD_DIR
  DATA_DIR: transfermarkt-datasets CSVs (games, game_lineups, competitions)
  BUILD_DIR: holds data.json, data.ids.json and extra.json from the other build steps
A line-up is scored by the fame of its 11 starters plus the size of the occasion
(finals, semi-finals, World Cup, Champions League knockouts), then the best are kept
with a cap per team so the set stays varied.
"""
import sys, json, re
import pandas as pd
from collections import Counter

D, B = sys.argv[1], sys.argv[2]
data = json.load(open(B + '/data.json')); ids = json.load(open(B + '/data.ids.json'))
extra = json.load(open(B + '/extra.json'))
tm2idx = {t: i for i, t in enumerate(ids['tm']) if t != -1}
club2idx = {c: i for i, c in enumerate(ids['clubids'])}
tier = [p[4] for p in data['players']]
FAME = {0: 3.0, 1: 1.4, 2: 0.5}

COMP = {'CL': 'Champions League', 'EL': 'Europa League', 'FIWC': 'World Cup', 'EURO': 'Euro', 'COPA': 'Copa América',
        'AFCN': 'Africa Cup of Nations', 'GB1': 'Premier League', 'ES1': 'LaLiga', 'IT1': 'Serie A', 'L1': 'Bundesliga',
        'FR1': 'Ligue 1', 'FAC': 'FA Cup', 'CDR': 'Copa del Rey', 'CIT': 'Coppa Italia', 'DFB': 'DFB-Pokal', 'PO1': 'Liga Portugal',
        'NL1': 'Eredivisie', 'SA1': 'Saudi Pro League'}
BIG = {'FIWC': 12, 'EURO': 9, 'COPA': 7, 'CL': 6, 'AFCN': 4, 'EL': 2}

def occasion(comp, rnd):
    r = str(rnd).lower(); b = BIG.get(comp, 0)
    if r.startswith('final') or r == 'final': b += 30
    elif 'semi' in r: b += 16
    elif 'quarter' in r: b += 9
    elif 'last 16' in r or 'round of 16' in r: b += 5
    return b

def nice_round(rnd):
    r = str(rnd)
    r = re.sub(r'(?i)\s*(1st|2nd) leg', lambda m: ' · ' + m.group(1).lower() + ' leg', r)
    r = re.sub(r'(?i)^last 16', 'Round of 16', r)
    r = re.sub(r'(?i)semi-finals', 'Semi-final', r); r = re.sub(r'(?i)quarter-finals', 'Quarter-final', r)
    r = re.sub(r'(?i)^(\d+)\. matchday$', r'Matchday \1', r)
    return r

G = pd.read_csv(D + '/games.csv.gz', low_memory=False)
G = G[G.competition_id.isin(COMP.keys())]
L = pd.read_csv(D + '/game_lineups.csv.gz', usecols=['game_id', 'player_id', 'club_id', 'player_name', 'type', 'position', 'number'], low_memory=False)
L = L[(L.type == 'starting_lineup') & L.game_id.isin(set(G.game_id))]
GI = G.set_index('game_id')

cands = []
for (gid, cid), grp in L.groupby(['game_id', 'club_id']):
    if len(grp) != 11: continue
    starters = []; known = 0; fame = 0.0
    for r in grp.itertuples(index=False):
        i = tm2idx.get(int(r.player_id), -1)
        if i >= 0: known += 1; fame += FAME[tier[i]]
        num = int(r.number) if str(r.number).isdigit() else 0
        starters.append([i, r.player_name, str(r.position), num])
    if known < 9 or not any(s[2] == 'Goalkeeper' for s in starters): continue
    g = GI.loc[gid]
    comp = g.competition_id
    score = fame + occasion(comp, g['round'])
    if g.home_club_goals == g.home_club_goals and abs(int(g.home_club_goals) - int(g.away_club_goals)) >= 3: score += 3
    cands.append((score, gid, int(cid), starters))

cands.sort(key=lambda x: -x[0])
per_team = Counter(); picked = []; seen = set()
for score, gid, cid, starters in cands:
    if per_team[cid] >= 18 or (gid, cid) in seen: continue
    g = GI.loc[gid]
    home = cid == int(g.home_club_id)
    name = lambda c, n: data['clubs'][club2idx[c]][0] if c in club2idx else str(n)
    hn, an = name(int(g.home_club_id), g.home_club_name), name(int(g.away_club_id), g.away_club_name)
    if g.home_club_goals != g.home_club_goals: continue
    ko = bool(re.search(r'(?i)final|2nd leg|round of 16|last 16|semi|quarter|third place', str(g['round'])))
    # knockout scores in the data include penalty shoot-outs (1-1 shows as 6-4), so knockout ties show no score
    title = f"{hn} v {an}" if ko else f"{hn} {int(g.home_club_goals)}–{int(g.away_club_goals)} {an}"
    team = hn if home else an
    picked.append([title, team, COMP[g.competition_id], nice_round(g['round']), str(g.date)[:10],
                   str(g.home_club_formation if home else g.away_club_formation) if str(g.home_club_formation if home else g.away_club_formation) != 'nan' else '',
                   round(score, 1), starters])
    per_team[cid] += 1; seen.add((gid, cid))
    if len(picked) >= 360: break

extra['xi'] = picked
s = json.dumps(extra, separators=(',', ':'), ensure_ascii=False)
open(B + '/extra.json', 'w').write(s)
print('starting XIs', len(picked), '| extra.json bytes', len(s), Counter(p[2] for p in picked).most_common())
for p in picked[:12]: print(' ', p[6], p[0], '·', p[2], p[3], p[4], '·', p[1])
