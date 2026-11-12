"""Build compact player data for Close Control from the Transfermarkt dataset + hand-written legends."""
import pandas as pd, numpy as np, re, json, sys, os, unicodedata
from collections import defaultdict, Counter

D, HTML, CJSON, OUT = sys.argv[1:5]
TODAY = pd.Timestamp(os.environ.get('BUILD_DATE') or pd.Timestamp.today().normalize())

def nz(s):
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9 ]', '', s).strip()

# ---------- countries ----------
CONF = json.load(open(CJSON))
COUNTRY = {}  # name -> (flag, confed)
for conf, m in CONF.items():
    for n, code in m.items():
        COUNTRY[n] = (code, conf)
ALIAS = {"Turkey": "Türkiye", "Korea, South": "South Korea", "Korea, North": "North Korea", "Cote d'Ivoire": "Ivory Coast",
         "Hongkong": "Hong Kong", "USA": "United States", "Bosnia": "Bosnia-Herzegovina", "Czechia": "Czech Republic",
         "N. Ireland": "Northern Ireland"}
def cname(n):
    if not isinstance(n, str): return None
    return ALIAS.get(n, n)

# ---------- load ----------
P = pd.read_csv(D + '/players.csv.gz')
T = pd.read_csv(D + '/transfers.csv.gz')
A = pd.read_csv(D + '/appearances.csv.gz', usecols=['player_id', 'player_club_id', 'date'])
C = pd.read_csv(D + '/clubs.csv.gz')
COMP = pd.read_csv(D + '/competitions.csv.gz')

P['hmv'] = P.highest_market_value_in_eur.fillna(0)
P['caps'] = P.international_caps.fillna(0)
P['country'] = P.country_of_citizenship.map(cname)
P['born'] = pd.to_datetime(P.date_of_birth, errors='coerce').dt.year
sel = P[((P.hmv >= 5_000_000) | (P.caps >= 40)) & P.born.notna() & P.country.notna()].copy()
sel = sel[sel.country.isin(COUNTRY)]
print('selected from TM:', len(sel))

# ---------- clubs ----------
JUNK = re.compile(r"(?i)(\b(u\d{2}|yth\.?|youth|jugend|jgd\.?|jv|academy|reserves?|juvenil|juniors? b|primavera|sub-?\d+|ii|iii|b|c|atl\.|castilla|atlètic|am|ama|amat\.|res\.)$|^jong |without club|retired|unknown|career break|^ban$|own youth)")
names = pd.concat([T[['from_club_id', 'from_club_name']].set_axis(['id', 'n'], axis=1),
                   T[['to_club_id', 'to_club_name']].set_axis(['id', 'n'], axis=1)]).dropna()
names['id'] = names.id.astype(int)
best_name = names.groupby(['id', 'n']).size().reset_index(name='c').sort_values('c', ascending=False).drop_duplicates('id').set_index('id').n.to_dict()
for r in C.itertuples():
    best_name.setdefault(int(r.club_id), r.name)
NAME_OVR = {13: "Atlético Madrid", 330: "Atlético Mineiro", 18: "Gladbach", 46: "Inter", 69261: "Inter Miami", 623: "NY Red Bulls",
            40058: "NYCFC", 866: "Nacional", 982: "CD Nacional", 23826: "RB Leipzig", 409: "RB Salzburg", 985: "Man United",
            27: "Bayern Munich", 16: "Dortmund", 15: "Leverkusen", 703: "Nottm Forest", 350: "Sheffield United", 1234: "Independiente",
            288: "Estudiantes", 897: "Deportivo La Coruña", 273: "Rennes", 40: "Bordeaux", 336: "Sporting CP", 114: "Beşiktaş",
            368: "Sevilla", 940: "Celta Vigo", 1084: "Málaga", 237: "Mallorca", 458: "Palermo", 3: "Köln", 33: "Schalke 04",
            995: "Nantes", 290: "Auxerre", 964: "Zenit", 660: "Shakhtar Donetsk", 58: "Anderlecht", 3342: "Espérance de Tunis",
            1030: "Argentinos Juniors", 1029: "Vélez Sarsfield", 4835: "NY Cosmos", 432: "Chicago Fire", 45604: "Orlando City",
            11141: "Toronto FC", 6321: "Vancouver Whitecaps", 2440: "DC United"}
best_name.update(NAME_OVR)
def is_junk(cid):
    n = best_name.get(cid)
    return (n is None) or bool(JUNK.search(n.strip()))

# club country: league country if known, else majority nationality of players who passed through
comp_country = COMP.set_index('competition_id').country_name.to_dict()
club_country = {}
for r in C.itertuples():
    cc = comp_country.get(r.domestic_competition_id)
    if isinstance(cc, str): club_country[int(r.club_id)] = cname(cc)
pc = P.set_index('player_id').country.to_dict()
votes = defaultdict(Counter)
for r in T[['player_id', 'to_club_id', 'from_club_id']].itertuples(index=False):
    c = pc.get(r.player_id)
    if c:
        votes[int(r.to_club_id)][c] += 1
        votes[int(r.from_club_id)][c] += 1
COUNTRY_OVR = {69261: "United States", 623: "United States", 40058: "United States", 1061: "United States", 51828: "United States",
               4835: "United States", 2440: "United States", 432: "United States", 45604: "United States", 11141: "United States",
               6321: "United States", 1114: "Saudi Arabia", 18544: "Saudi Arabia", 8023: "Saudi Arabia", 18487: "Saudi Arabia",
               7732: "Saudi Arabia", 656: "Qatar", 866: "Uruguay", 861: "Uruguay", 982: "Portugal", 3958: "Japan", 2407: "Mexico"}
def country_of(cid):
    if cid in COUNTRY_OVR: return COUNTRY_OVR[cid]
    if cid in club_country: return club_country[cid]
    v = votes.get(cid)
    if v:
        (c, n), tot = v.most_common(1)[0], sum(v.values())
        if n / tot >= 0.2 and (n >= 2 or tot == 1): return c
    return None

# ---------- stints ----------
def season(ts):
    return ts.year if (ts.month >= 7 or (ts.month == 6 and ts.day >= 20)) else ts.year - 1

sel_ids = set(sel.player_id)
CUR = season(TODAY)  # the season being played now (2026 = 2026/27)
cur_of = {pid: (int(c) if c == c else None) for pid, c in sel.set_index('player_id').current_club_id.items()}
last_season = sel.set_index('player_id').last_season.to_dict()
T['d'] = pd.to_datetime(T.transfer_date, errors='coerce')
TT = T[T.player_id.isin(sel_ids) & T.d.notna() & (T.d <= TODAY)].sort_values(['player_id', 'd'])
stints = defaultdict(lambda: defaultdict(list))  # pid -> club -> [(y0,y1)]
for pid, g in TT.groupby('player_id'):
    rows = list(g.itertuples(index=False))
    ls = int(last_season.get(pid, 2025))
    f = rows[0]
    if not is_junk(int(f.from_club_id)):
        s = season(f.d); stints[pid][int(f.from_club_id)].append((s - 1, s - 1 if f.d.month in (6, 7, 8) else s))
    for i, r in enumerate(rows):
        cid = int(r.to_club_id)
        if is_junk(cid): continue
        s0 = season(r.d)
        if i + 1 < len(rows):
            nx = rows[i + 1].d
            s1 = season(nx) - 1 if nx.month in (6, 7, 8) else season(nx)
            if s1 < s0: continue  # loan return / paperwork move inside one window
        else:
            s1 = max(s0, ls)
            if ls >= CUR - 1 and cid == cur_of.get(pid): s1 = max(s1, CUR)  # still there this season
        stints[pid][cid].append((s0, s1))
A = A[A.player_id.isin(sel_ids)]
A['y'] = pd.to_datetime(A.date)
A['s'] = np.where(A.y.dt.month >= 7, A.y.dt.year, A.y.dt.year - 1)
for (pid, cid), g in A.groupby(['player_id', 'player_club_id']):
    cid = int(cid)
    if is_junk(cid): continue
    yrs = sorted(set(g.s))
    a = b = yrs[0]
    for y in yrs[1:]:
        if y <= b + 1: b = y
        else: stints[pid][cid].append((a, b)); a = b = y
    stints[pid][cid].append((a, b))
cur = sel.set_index('player_id').current_club_id.to_dict()

def merge(iv):
    iv = sorted(iv); out = [list(iv[0])]
    for a, b in iv[1:]:
        if a <= out[-1][1] + 1: out[-1][1] = max(out[-1][1], b)
        else: out.append([a, b])
    return out

# ---------- positions ----------
SUB = {"Goalkeeper": "GK", "Centre-Back": "CB", "Left-Back": "FB", "Right-Back": "FB", "Defensive Midfield": "DM",
       "Central Midfield": "CM", "Attacking Midfield": "AM", "Left Midfield": "W", "Right Midfield": "W",
       "Left Winger": "W", "Right Winger": "W", "Second Striker": "ST", "Centre-Forward": "ST"}
GEN = {"Goalkeeper": "GK", "Defender": "CB", "Midfield": "CM", "Attack": "ST"}

players = []
for r in sel.itertuples(index=False):
    pid = r.player_id
    cl = stints.get(pid, {})
    if not cl and isinstance(r.current_club_id, (int, float)) and not np.isnan(r.current_club_id) and not is_junk(int(r.current_club_id)):
        cl = {int(r.current_club_id): [(int(r.last_season), int(r.last_season))]}
    if not cl: continue
    career = sorted(((cid, merge(iv)) for cid, iv in cl.items()), key=lambda x: x[1][0][0])
    pos = SUB.get(r.sub_position) or GEN.get(r.position) or "CM"
    players.append(dict(name=r.name, country=r.country, pos=pos, born=int(r.born), career=career,
                        hmv=float(r.hmv), caps=float(r.caps), src='tm', tm=int(pid)))

# ---------- legends from the hand-written list ----------
H = open(HTML).read()
hclub = dict(re.findall(r'(\w+):\["([^"]+)","\w+"\]', H.split('const CLUB =')[1].split('};')[0]))
hnat = dict(re.findall(r'(\w+):\["([^"]+)","[^"]*","\w+"\]', H.split('const NAT =')[1].split('};')[0]))
hraw = H.split('const RAW = `')[1].split('`;')[0].strip().split('\n')
CODE_ID = {"MUN": 985, "NFO": 703, "SHU": 350, "STK": 512, "HUL": 3008, "ATM": 13, "SEV": 368, "DEP": 897, "CEL": 940, "MAL": 1084,
           "MLL": 237, "PALE": 458, "BAY": 27, "RBL": 23826, "S04": 33, "BMG": 18, "KOE": 3, "BOR": 40, "REN": 273, "NAN": 995,
           "AUX": 290, "SCP": 336, "RAN": 124, "INT": 46, "INTB": 6600, "CAM": 330, "RIV": 209, "IND": 1234, "VEL": 1029, "EST": 288,
           "ARJ": 1030, "NAC": 866, "MIA": 69261, "NYRB": 623, "TFC": 11141, "ORL": 45604, "NYC": 40058, "CHF": 432, "HIL": 1114,
           "ITT": 8023, "AHL": 18487, "ZEN": 964, "SHK": 660, "RBS": 409, "AND": 58, "AHLE": 7, "ESTN": 3342, "NEW": 762, "COR": 199,
           "VAS": 978, "RAC": 1444, "COS": 4835, "VAN": 6321, "BJK": 114, "NAS": 18544, "ETT": 7732, "ASD": 656, "LAFC": 51828, "LAG": 1061}
name_to_id = {}
for cid, n in best_name.items():
    k = nz(n)
    if k not in name_to_id or cid < name_to_id[k]: name_to_id[k] = cid
for code, n in hclub.items():
    if code not in CODE_ID:
        cid = name_to_id.get(nz(n))
        if cid is None: print('UNMAPPED club', code, n)
        CODE_ID[code] = cid
tm_keys = defaultdict(list)
for i, p in enumerate(players): tm_keys[nz(p['name'])].append(i)
HALIAS = {"Andy Robertson": "Andrew Robertson", "Dani Carvajal": "Daniel Carvajal", "Gabriel Magalhães": "Gabriel",
          "Mykhailo Mudryk": "Mykhaylo Mudryk", "Hannibal Mejbri": "Hannibal", "Son Heung-min": "Heung-min Son",
          "Kim Min-jae": "Min-jae Kim", "Javier Hernández": "Chicharito"}
famous_tm = set(); added = 0; unmatched_modern = []
for line in hraw:
    n, nat, pos, born, clubs = line.split('|'); born = int(born)
    hits = [i for i in tm_keys.get(nz(HALIAS.get(n, n)), []) if abs(players[i]['born'] - born) <= 1]
    if hits:
        famous_tm.update(hits)
        if n in HALIAS:
            for i in hits: players[i]['name'] = n
        for i in hits:  # fill career gaps from the hand-written list (years unknown)
            have = {cid for cid, _ in players[i]['career']}
            for c in clubs.split(','):
                cid = CODE_ID.get(c)
                if cid and cid not in have: players[i]['career'].append((cid, [[0, 0]])); have.add(cid)
        continue
    if born >= 1984: unmatched_modern.append(n)
    career = [(CODE_ID[c], [[0, 0]]) for c in clubs.split(',') if CODE_ID.get(c)]
    players.append(dict(name=n, country=cname(hnat[nat]), pos=pos, born=born, career=career, hmv=0, caps=0, src='hand', tm=-1))
    added += 1
print('legends added:', added, '| hand players matched in TM:', len(famous_tm))
print('UNMATCHED modern hand players (possible duplicates):', unmatched_modern)

# ---------- Wikidata: dated careers before 2012, more retired players ----------
WDJSON = os.environ.get('WIKIDATA_JSON') or os.path.join(os.path.dirname(CJSON), 'wikidata.json')
wd_added = 0
if os.path.exists(WDJSON):
    WD = json.load(open(WDJSON))
    wteam = {q: int(t) for q, t in WD['teams'].items() if str(t).isdigit()}
    wcountry = {q: cname(n) for q, n in WD['countries'].items()}
    def wpos(qs):
        labs = ' '.join(WD['positions'].get(q, '') for q in qs).lower()
        for keys, code in ((('goalkeeper',), 'GK'), (('full-back', 'fullback', 'wing-back', 'wing half', 'left-back', 'right-back'), 'FB'),
                           (('centre-back', 'center back', 'central defender', 'sweeper', 'libero', 'defender'), 'CB'),
                           (('defensive midfielder',), 'DM'), (('attacking midfielder', 'playmaker'), 'AM'), (('winger', 'wide midfielder'), 'W'),
                           (('midfielder',), 'CM'), (('forward', 'striker', 'centre-forward', 'inside forward'), 'ST')):
            if any(k in labs for k in keys): return code
        return None
    def wseason(d, end):
        if not d: return None
        y, m = int(d[:4]), int(d[5:7] or 0)
        if m == 0: return y - 1 if end else y      # year precision: joined in the summer, left in the summer
        return season(pd.Timestamp(year=y, month=m, day=1)) - (1 if end and m in (6, 7, 8) else 0)
    def wcareer(st, born):
        out = defaultdict(list)
        for team, a, b, loan in st:
            cid = wteam.get(team)
            if cid is None or cid not in best_name or is_junk(cid): continue
            s0 = wseason(a, False)
            if s0 is None or s0 < born + 15: continue
            s1 = wseason(b, True) if b else s0
            out[cid].append((s0, max(s0, s1)))
        return out
    by_tm = {str(p['tm']): i for i, p in enumerate(players) if p['src'] == 'tm'}
    by_name = defaultdict(list)
    for i, p in enumerate(players): by_name[nz(p['name'])].append(i)
    filled = 0; moved = []
    for q, w in WD['players'].items():
        tm, name, born, nats, poss, st, sl = w
        if not born or not st: continue
        car = wcareer(st, born)
        if not car: continue
        i = by_tm.get(str(tm)) if tm else None
        if i is None:
            hits = [j for j in by_name.get(nz(name or ''), []) if abs(players[j]['born'] - born) <= 1]
            i = hits[0] if hits else None
        if i is not None:   # known player: add the clubs and years we were missing
            p = players[i]; have = {cid: ivs for cid, ivs in p['career']}; changed = False
            # this season: a move Wikidata knows about but the Transfermarkt snapshot missed
            today = str(TODAY.date()); moves = []
            for team, d0, d1, loan in st:
                cid = wteam.get(team)
                if cid is None or cid not in best_name or is_junk(cid) or not d0: continue
                if f"{CUR}-06-01" <= d0 <= today and (not d1 or d1 > today): moves.append((d0, cid))
            if moves:
                new = max(moves)[1]
                if not any(b >= CUR for a, b in have.get(new, [])):
                    for cid in list(have):   # the old club's spell ends last season
                        if cid != new: have[cid] = [[a, CUR - 1] if (b >= CUR and a < CUR) else [a, b] for a, b in have[cid]]
                    have[new] = merge([tuple(x) for x in have.get(new, [])] + [(CUR, CUR)])
                    changed = True; moved.append(p['name'])
            for cid, ivs in car.items():
                early = [iv for iv in ivs if iv[0] < 2012]
                if not early: continue
                if cid not in have or have[cid] == [[0, 0]]:
                    have[cid] = merge(early); changed = True
                elif all(a >= 2012 for a, b in have[cid] if a):
                    have[cid] = merge([tuple(x) for x in have[cid]] + early); changed = True
            if changed:
                p['career'] = sorted(have.items(), key=lambda x: (x[1][0][0] or 9999)); filled += 1
            p['sl'] = max(p.get('sl', 0), sl)
            continue
        if born >= 1990 or born < 1940 or sl < 26: continue      # new players: notable pre-2012 generations only
        country = next((wcountry[n] for n in nats if wcountry.get(n) in COUNTRY), None)
        pos = wpos(poss)
        if not country or not pos or len(car) < 2 or not name: continue
        career = sorted(((cid, merge(ivs)) for cid, ivs in car.items()), key=lambda x: x[1][0][0])
        players.append(dict(name=name, country=country, pos=pos, born=born, career=career, hmv=0, caps=0, src='wd', tm=-1, sl=sl))
        wd_added += 1
    print('wikidata: careers filled', filled, '| retired players added', wd_added)
    print('wikidata: moves this season not in the Transfermarkt snapshot:', len(moved), moved[:25])

# ---------- fame tiers ----------
for i, p in enumerate(players):
    f = p['hmv'] / 1e6 + p['caps'] * 0.6
    if p['src'] == 'hand' or i in famous_tm: f = max(f, 1000)
    if p['src'] == 'wd': f = p['sl'] * 2.4               # Wikipedia languages as a fame signal for retired players
    elif p.get('sl', 0) >= 60: f = max(f, p['sl'] * 2.4)
    p['fame'] = f
order = sorted(range(len(players)), key=lambda i: -players[i]['fame'])
for rank, i in enumerate(order):
    players[i]['tier'] = 0 if rank < 1100 else 1 if rank < 3400 else 2

# ---------- disambiguate duplicate names ----------
cnt = Counter(p['name'] for p in players)
for p in players:
    if cnt[p['name']] > 1: p['disp'] = f"{p['name']} ({p['born']})"
    else: p['disp'] = p['name']
cnt2 = Counter(p['disp'] for p in players)
for p in players:
    if cnt2[p['disp']] > 1:
        p['disp'] = f"{p['name']} ({p['born']}, {best_name.get(p['career'][-1][0], '?')})"

# ---------- encode ----------
used_clubs = sorted({cid for p in players for cid, _ in p['career']})
cidx = {c: i for i, c in enumerate(used_clubs)}
countries = sorted({p['country'] for p in players} | {country_of(c) for c in used_clubs if country_of(c)})
kidx = {c: i for i, c in enumerate(countries)}
club_rows = []
dn = Counter(best_name[c] for c in used_clubs)
for c in used_clubs:
    n = best_name[c]; k = country_of(c)
    if dn[n] > 1 and k: n = f"{n} ({k})"
    club_rows.append([n, kidx[k] if k else -1])
country_rows = [[c, COUNTRY.get(c, ("", ""))[0], COUNTRY.get(c, ("", "?"))[1]] for c in countries]
POS = ["GK", "CB", "FB", "DM", "CM", "AM", "W", "ST"]
prow = []
for p in sorted(players, key=lambda p: -p['fame']):
    flat = []
    for cid, ivs in p['career']:
        for a, b in ivs: flat += [cidx[cid], a, b]
    prow.append([p['disp'], kidx[p['country']], POS.index(p['pos']), p['born'], p['tier'], flat])
out = dict(countries=country_rows, clubs=club_rows, players=prow)
json.dump(dict(tm=[p['tm'] for p in sorted(players, key=lambda p: -p['fame'])], clubids=used_clubs), open(OUT.replace('.json', '.ids.json'), 'w'))
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open(OUT, 'w').write(s)
print('players', len(prow), 'clubs', len(club_rows), 'countries', len(country_rows), 'bytes', len(s.encode()))
print('tiers', Counter(p[4] for p in prow))
print('clubs without country', sum(1 for c in club_rows if c[1] < 0))
