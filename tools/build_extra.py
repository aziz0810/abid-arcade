"""Extra data for the Matchday Arcade games: coaches played under, Champions League wins, Ballon d'Or wins.
Indexes line up with data.json players (same order)."""
import pandas as pd, json, sys, re, unicodedata
from collections import defaultdict

D, B = sys.argv[1], sys.argv[2]
data = json.load(open(B + '/data.json')); ids = json.load(open(B + '/data.ids.json'))
TM = ids['tm']; CLUBID = ids['clubids']
P = data['players']
def nz(s): return re.sub(r'[^a-z0-9 ]', '', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()).strip()
def base(n): return re.sub(r'\s*\(.*\)$', '', n)
tm_index = {t: i for i, t in enumerate(TM) if t >= 0}
name_index = defaultdict(list)
for i, p in enumerate(P): name_index[nz(base(p[0]))].append(i)

# player seasons per TM club id (from built careers)
seasons = []
for p in P:
    m = defaultdict(set); f = p[5]
    for k in range(0, len(f), 3):
        c, a, b = CLUBID[f[k]], f[k + 1], f[k + 2]
        if a: m[c].update(range(a, b + 1))
    seasons.append(m)

# ---------- coaches: (display name, name in match data, [(club_id, first_season, last_season)]) ----------
COACHES = [
 ("Pep Guardiola", "Pep Guardiola", [(131, 2008, 2011), (27, 2013, 2015), (281, 2016, 2025)]),
 ("José Mourinho", "José Mourinho", [(720, 2002, 2003), (631, 2004, 2006), (46, 2008, 2009), (418, 2010, 2012), (631, 2013, 2015), (985, 2016, 2018), (148, 2019, 2020), (12, 2021, 2023), (36, 2024, 2024), (294, 2025, 2025)]),
 ("Carlo Ancelotti", "Carlo Ancelotti", [(506, 1999, 2000), (5, 2001, 2008), (631, 2009, 2010), (583, 2011, 2012), (418, 2013, 2014), (27, 2016, 2017), (6195, 2018, 2019), (29, 2019, 2020), (418, 2021, 2024)]),
 ("Jürgen Klopp", "Jürgen Klopp", [(39, 2001, 2007), (16, 2008, 2014), (31, 2015, 2023)]),
 ("Zinedine Zidane", "Zinédine Zidane", [(418, 2015, 2017), (418, 2018, 2020)]),
 ("Diego Simeone", "Diego Simeone", [(13, 2011, 2025)]),
 ("Antonio Conte", "Antonio Conte", [(506, 2011, 2013), (631, 2016, 2017), (46, 2019, 2020), (148, 2021, 2022), (6195, 2024, 2025)]),
 ("Thomas Tuchel", "Thomas Tuchel", [(39, 2009, 2013), (16, 2015, 2016), (583, 2018, 2020), (631, 2020, 2021), (27, 2023, 2024)]),
 ("Luis Enrique", "Luis Enrique", [(12, 2011, 2011), (940, 2013, 2013), (131, 2014, 2016), (583, 2023, 2025)]),
 ("Arsène Wenger", "Arsène Wenger", [(11, 1996, 2017)]),
 ("Alex Ferguson", "Sir Alex Ferguson", [(985, 1986, 2012)]),
 ("Mauricio Pochettino", "Mauricio Pochettino", [(714, 2008, 2012), (180, 2012, 2013), (148, 2014, 2019), (583, 2020, 2021), (631, 2023, 2023)]),
 ("Massimiliano Allegri", "Massimiliano Allegri", [(5, 2010, 2013), (506, 2014, 2018), (506, 2021, 2023), (5, 2025, 2025)]),
 ("Xabi Alonso", "Xabi Alonso", [(15, 2022, 2024), (418, 2025, 2025)]),
 ("Mikel Arteta", "Mikel Arteta", [(11, 2019, 2025)]),
 ("Hansi Flick", "Hansi Flick", [(27, 2019, 2020), (131, 2024, 2025)]),
 ("Arne Slot", "Arne Slot", [(234, 2021, 2023), (31, 2024, 2025)]),
 ("Simone Inzaghi", "Simone Inzaghi", [(398, 2016, 2020), (46, 2021, 2024), (1114, 2025, 2025)]),
 ("Unai Emery", "Unai Emery", [(1049, 2008, 2011), (368, 2012, 2015), (583, 2016, 2017), (11, 2018, 2019), (1050, 2020, 2022), (405, 2022, 2025)]),
 ("Rafael Benítez", "Rafael Benítez", [(1049, 2001, 2003), (31, 2004, 2009), (46, 2010, 2010), (631, 2012, 2012), (6195, 2013, 2014), (418, 2015, 2015), (762, 2015, 2018), (29, 2021, 2021)]),
 ("Julian Nagelsmann", "Julian Nagelsmann", [(533, 2015, 2018), (23826, 2019, 2020), (27, 2021, 2022)]),
 ("Maurizio Sarri", "Maurizio Sarri", [(6195, 2015, 2017), (631, 2018, 2018), (506, 2019, 2019), (398, 2021, 2023)]),
 ("Luciano Spalletti", "Luciano Spalletti", [(12, 2005, 2008), (964, 2009, 2013), (12, 2015, 2016), (46, 2017, 2018), (6195, 2021, 2022)]),
 ("Erik ten Hag", "Erik ten Hag", [(610, 2017, 2021), (985, 2022, 2024)]),
 ("Ernesto Valverde", "Ernesto Valverde", [(621, 2013, 2016), (131, 2017, 2019), (621, 2022, 2025)]),
 ("Roberto Mancini", "Roberto Mancini", [(46, 2004, 2007), (281, 2009, 2012), (141, 2013, 2013), (46, 2014, 2015)]),
 ("Louis van Gaal", "Louis van Gaal", [(610, 1991, 1996), (131, 1997, 1999), (131, 2002, 2002), (27, 2009, 2010), (985, 2014, 2015)]),
 ("Frank Rijkaard", None, [(131, 2003, 2007)]),
 ("Vincent Kompany", "Vincent Kompany", []),
 ("Enzo Maresca", "Enzo Maresca", []),
 ("Rúben Amorim", "Rúben Amorim", []),
 ("Julen Lopetegui", "Julen Lopetegui", []),
 ("Marcelo Bielsa", "Marcelo Bielsa", []),
]
coach_of = defaultdict(set)
for ci, (disp, mname, ten) in enumerate(COACHES):
    for i, m in enumerate(seasons):
        for club, a, b in ten:
            if m.get(club) and (m[club] & set(range(a, b + 1))):
                coach_of[i].add(ci); break
g = pd.read_csv(D + '/games.csv.gz', low_memory=False, usecols=['game_id', 'home_club_id', 'away_club_id', 'home_club_manager_name', 'away_club_manager_name', 'competition_id', 'round', 'home_club_goals', 'away_club_goals', 'season'])
L = pd.read_csv(D + '/game_lineups.csv.gz', usecols=['game_id', 'player_id', 'club_id'], low_memory=False)
L = L[L.player_id.isin(tm_index.keys())]
gm = pd.concat([g[['game_id', 'home_club_id', 'home_club_manager_name']].set_axis(['game_id', 'club_id', 'mgr'], axis=1),
                g[['game_id', 'away_club_id', 'away_club_manager_name']].set_axis(['game_id', 'club_id', 'mgr'], axis=1)])
mname = {c[1]: i for i, c in enumerate(COACHES) if c[1]}
gm = gm[gm.mgr.isin(mname.keys())]
J = L.merge(gm, on=['game_id', 'club_id'])
cnt = J.groupby(['player_id', 'mgr']).size().reset_index(name='n')
for r in cnt[cnt.n >= 2].itertuples(index=False):
    coach_of[tm_index[r.player_id]].add(mname[r.mgr])

HAND_COACH = {
 "Pep Guardiola": "Carles Puyol|Xavi|Andrés Iniesta|Lionel Messi|Gerard Piqué|Sergio Busquets|Dani Alves|Samuel Eto'o|Thierry Henry|David Villa|Zlatan Ibrahimović|Javier Mascherano|Pedro|Víctor Valdés|Eric Abidal|Seydou Keita|Yaya Touré|Cesc Fàbregas|Alexis Sánchez|Bojan Krkic|Aleksandr Hleb|Gabriel Milito|Rafael Márquez",
 "Alex Ferguson": "Paul Scholes|Ryan Giggs|Gary Neville|David Beckham|Roy Keane|Peter Schmeichel|Ole Gunnar Solskjær|Teddy Sheringham|Jaap Stam|Eric Cantona|Rio Ferdinand|Nemanja Vidić|Edwin van der Sar|Wayne Rooney|Cristiano Ronaldo|Carlos Tevez|Ruud van Nistelrooy|Park Ji-sung|Patrice Evra|Michael Carrick|Dimitar Berbatov|Javier Hernández|Robin van Persie|David de Gea|Shinji Kagawa|Michael Owen|Juan Sebastián Verón|Diego Forlán|Fabien Barthez|Laurent Blanc|Gabriel Heinze|Gerard Piqué|Nani|Owen Hargreaves|Antonio Valencia|Chris Smalling|Phil Jones|Danny Welbeck|Darren Fletcher|Wes Brown|John O'Shea|Louis Saha|Mark Hughes|Bryan Robson|Steve Bruce|Andy Cole|Dwight Yorke|Denis Irwin|Nicky Butt",
 "Arsène Wenger": "Thierry Henry|Dennis Bergkamp|Patrick Vieira|Robert Pires|Emmanuel Petit|Marc Overmars|Nwankwo Kanu|Freddie Ljungberg|Ashley Cole|Sol Campbell|Jens Lehmann|Cesc Fàbregas|Robin van Persie|Andrey Arshavin|Samir Nasri|Theo Walcott|Emmanuel Adebayor|Gilberto Silva|Kolo Touré|David Seaman|Nicolas Anelka|Sylvain Wiltord|Aleksandr Hleb|Tomáš Rosický|Alex Song|Bacary Sagna|Gaël Clichy|William Gallas|Per Mertesacker|Mesut Özil|Santi Cazorla|Olivier Giroud|Alexis Sánchez|Aaron Ramsey|Jack Wilshere|Lukas Podolski|Laurent Koscielny|Wojciech Szczęsny|Martin Keown|Tony Adams|Lauren|Ray Parlour|Edu",
 "José Mourinho": "John Terry|Frank Lampard|Didier Drogba|Petr Čech|Ashley Cole|Claude Makélélé|Arjen Robben|Damien Duff|Ricardo Carvalho|Michael Essien|Michael Ballack|Andriy Shevchenko|Joe Cole|William Gallas|Paulo Ferreira|Hernán Crespo|John Obi Mikel|Salomon Kalou|Javier Zanetti|Wesley Sneijder|Samuel Eto'o|Diego Milito|Júlio César|Maicon|Lúcio|Esteban Cambiasso|Dejan Stanković|Mario Balotelli|Zlatan Ibrahimović|Ricardo Quaresma|Cristiano Ronaldo|Iker Casillas|Sergio Ramos|Pepe|Marcelo|Xabi Alonso|Mesut Özil|Ángel Di María|Karim Benzema|Gonzalo Higuaín|Kaká|Sami Khedira|Luka Modrić|Raphaël Varane|Álvaro Arbeloa|Deco|Maniche",
 "Carlo Ancelotti": "Paolo Maldini|Alessandro Nesta|Andrea Pirlo|Gennaro Gattuso|Clarence Seedorf|Kaká|Andriy Shevchenko|Filippo Inzaghi|Cafu|Rui Costa|Rivaldo|Ronaldo Nazário|Ronaldinho|David Beckham|Alexandre Pato|Dida|Jaap Stam|Hernán Crespo|Kakha Kaladze|Alberto Gilardino|John Terry|Frank Lampard|Didier Drogba|Petr Čech|Ashley Cole|Branislav Ivanović|Nicolas Anelka|Florent Malouda|Michael Essien|Michael Ballack|Fernando Torres|David Luiz|Ramires|Thiago Silva|Zlatan Ibrahimović|Ezequiel Lavezzi|Javier Pastore|Marco Verratti|Thiago Motta|Zinedine Zidane|Alessandro Del Piero|Edgar Davids|Filippo Inzaghi|Pippo Inzaghi",
 "Jürgen Klopp": "Robert Lewandowski|Marco Reus|Mario Götze|Mats Hummels|Neven Subotić|Shinji Kagawa|Roman Weidenfeller|Łukasz Piszczek|Jakub Błaszczykowski|Nuri Şahin|Sven Bender|İlkay Gündoğan|Kevin Großkreutz|Lucas Barrios|Marcel Schmelzer",
 "Rafael Benítez": "Steven Gerrard|Jamie Carragher|Xabi Alonso|Fernando Torres|Pepe Reina|Javier Mascherano|Dirk Kuyt|Sami Hyypiä|Luis García|Djibril Cissé|Peter Crouch|John Arne Riise|Harry Kewell|Milan Baroš|Daniel Agger|Pablo Aimar|Roberto Ayala|David Albelda|Rubén Baraja|Vicente|Mista|Santiago Cañizares",
 "Frank Rijkaard": "Ronaldinho|Samuel Eto'o|Deco|Carles Puyol|Xavi|Andrés Iniesta|Lionel Messi|Henrik Larsson|Rafael Márquez|Víctor Valdés|Giovanni van Bronckhorst|Ludovic Giuly|Thierry Henry|Lilian Thuram|Gianluca Zambrotta|Edmílson|Mark van Bommel|Patrick Kluivert|Edgar Davids|Javier Saviola",
 "Louis van Gaal": "Patrick Kluivert|Edgar Davids|Clarence Seedorf|Marc Overmars|Edwin van der Sar|Frank Rijkaard|Nwankwo Kanu|Rivaldo|Luís Figo|Pep Guardiola|Phillip Cocu|Frank de Boer|Thomas Müller|Arjen Robben|Franck Ribéry|Bastian Schweinsteiger|Philipp Lahm|Holger Badstuber|David Alaba|Wayne Rooney|Juan Mata|Ángel Di María|Anthony Martial|Marcus Rashford|David de Gea",
 "Roberto Mancini": "Vincent Kompany|Yaya Touré|David Silva|Sergio Agüero|Joe Hart|Carlos Tevez|Edin Džeko|Mario Balotelli|Samir Nasri|Pablo Zabaleta|Gareth Barry|James Milner|Javier Zanetti|Zlatan Ibrahimović|Adriano|Esteban Cambiasso|Luís Figo|Patrick Vieira|Júlio César|Maicon|Marco Materazzi|Dejan Stanković",
 "Luciano Spalletti": "Francesco Totti|Daniele De Rossi|Mirko Vučinić|Simone Perrotta|Christian Panucci|Hulk|Axel Witsel|Danny|Alexander Kerzhakov",
 "Unai Emery": "David Villa|David Silva|Juan Mata|Raúl Albiol|Ever Banega|Kevin Gameiro|Ivan Rakitić|Carlos Bacca",
}
for coach, names in HAND_COACH.items():
    ci = [c[0] for c in COACHES].index(coach)
    for n in names.split('|'):
        for i in name_index.get(nz(n), [])[:1]: coach_of[i].add(ci)

# ---------- Champions League winners ----------
WIN = {1991: 131, 1992: 244, 1993: 5, 1994: 610, 1995: 506, 1996: 16, 1997: 418, 1998: 985, 1999: 418, 2000: 27, 2001: 418,
       2002: 5, 2003: 720, 2004: 31, 2005: 131, 2006: 5, 2007: 985, 2008: 131, 2009: 46, 2010: 131, 2011: 631, 2012: 27,
       2013: 418, 2014: 131, 2015: 418, 2016: 418, 2017: 418, 2018: 31, 2019: 27, 2020: 631, 2021: 418, 2022: 281,
       2023: 418, 2024: 583}
ucl = defaultdict(set)
for i, m in enumerate(seasons):
    for s, c in WIN.items():
        if s in m.get(c, ()): ucl[i].add(s)
F = g[(g.competition_id == 'CL') & (g['round'] == 'Final')]
for r in F.itertuples(index=False):
    w = r.home_club_id if r.home_club_goals > r.away_club_goals else r.away_club_id
    for pid in L[(L.game_id == r.game_id) & (L.club_id == w)].player_id:
        ucl[tm_index[pid]].add(int(r.season))
HAND_UCL = {"Alfredo Di Stéfano": [1955, 1956, 1957, 1958, 1959], "Eusébio": [1960, 1961], "Johan Cruyff": [1970, 1971, 1972],
 "Franz Beckenbauer": [1973, 1974, 1975], "Gerd Müller": [1973, 1974, 1975], "Karl-Heinz Rummenigge": [1974, 1975],
 "Kenny Dalglish": [1977, 1980, 1983], "Ian Rush": [1983], "Michel Platini": [1984], "Paolo Rossi": [1984],
 "Marco van Basten": [1988, 1989], "Ruud Gullit": [1988, 1989], "Frank Rijkaard": [1988, 1989, 1994], "Franco Baresi": [1988, 1989, 1993],
 "Paolo Maldini": [1988, 1989, 1993, 2002, 2006], "Michael Laudrup": [1991], "Hristo Stoichkov": [1991], "Pep Guardiola": [1991],
 "Marcel Desailly": [1992, 1993], "Didier Deschamps": [1992, 1995], "Zvonimir Boban": [1993], "Patrick Kluivert": [1994],
 "Edgar Davids": [1994], "Marc Overmars": [1994], "Clarence Seedorf": [1994, 1997, 2002, 2006], "Nwankwo Kanu": [1994],
 "Edwin van der Sar": [1994, 2007], "Alessandro Del Piero": [1995], "Gianluca Vialli": [1995], "Raúl": [1997, 1999, 2001],
 "Fernando Hierro": [1997, 1999, 2001], "Roberto Carlos": [1997, 1999, 2001], "Iker Casillas": [1999, 2001, 2013],
 "David Beckham": [1998], "Peter Schmeichel": [1998], "Ole Gunnar Solskjær": [1998], "Teddy Sheringham": [1998], "Roy Keane": [1998],
 "Jaap Stam": [1998], "Paul Scholes": [1998, 2007], "Ryan Giggs": [1998, 2007], "Gary Neville": [1998, 2007], "Oliver Kahn": [2000],
 "Bixente Lizarazu": [2000], "Zinedine Zidane": [2001], "Luís Figo": [2001], "Claude Makélélé": [2001], "Andrea Pirlo": [2002, 2006],
 "Alessandro Nesta": [2002, 2006], "Filippo Inzaghi": [2002, 2006], "Gennaro Gattuso": [2002, 2006], "Andriy Shevchenko": [2002],
 "Rui Costa": [2002], "Kaká": [2006], "Cafu": [2006], "Deco": [2003, 2005], "Steven Gerrard": [2004], "Jamie Carragher": [2004],
 "Xabi Alonso": [2004, 2013], "Ronaldinho": [2005], "Samuel Eto'o": [2005, 2008, 2009], "Henrik Larsson": [2005],
 "Carles Puyol": [2005, 2008, 2010], "Xavi": [2005, 2008, 2010], "Andrés Iniesta": [2005, 2008, 2010, 2014],
 "Lionel Messi": [2005, 2008, 2010, 2014], "Wayne Rooney": [2007], "Cristiano Ronaldo": [2007, 2013, 2015, 2016, 2017],
 "Rio Ferdinand": [2007], "Nemanja Vidić": [2007], "Carlos Tevez": [2007], "Thierry Henry": [2008], "Dani Alves": [2008, 2010, 2014],
 "Javier Zanetti": [2009], "Wesley Sneijder": [2009], "Júlio César": [2009], "Lúcio": [2009], "Frank Lampard": [2011],
 "Didier Drogba": [2011], "John Terry": [2011], "Petr Čech": [2011], "Ashley Cole": [2011], "Juan Mata": [2011],
 "Fernando Torres": [2011], "Branislav Ivanović": [2011]}
BALLON = {"Alfredo Di Stéfano": 2, "Johan Cruyff": 3, "Franz Beckenbauer": 2, "Gerd Müller": 1, "Karl-Heinz Rummenigge": 2,
 "Paolo Rossi": 1, "Michel Platini": 3, "Ruud Gullit": 1, "Marco van Basten": 3, "Lothar Matthäus": 1, "Jean-Pierre Papin": 1,
 "Roberto Baggio": 1, "Hristo Stoichkov": 1, "George Weah": 1, "Ronaldo Nazário": 2, "Zinedine Zidane": 1, "Rivaldo": 1,
 "Luís Figo": 1, "Michael Owen": 1, "Pavel Nedvěd": 1, "Andriy Shevchenko": 1, "Ronaldinho": 1, "Fabio Cannavaro": 1,
 "Kaká": 1, "Cristiano Ronaldo": 5, "Lionel Messi": 8, "Luka Modrić": 1, "Karim Benzema": 1, "Rodri": 1, "Ousmane Dembélé": 1,
 "Eusébio": 1, "George Best": 1}
def find(n):
    hits = name_index.get(nz(n), [])
    if not hits: print('NOT FOUND', n)
    return hits[:1]
for n, ss in HAND_UCL.items():
    for i in find(n): ucl[i].update(ss)
ballon = {}
for n, c in BALLON.items():
    for i in find(n): ballon[i] = c
out = dict(coaches=[c[0] for c in COACHES], coach={i: sorted(v) for i, v in coach_of.items()},
           ucl={i: len(v) for i, v in ucl.items()}, ballon=ballon)
s = json.dumps(out, separators=(',', ':'), ensure_ascii=False)
open(B + '/extra.json', 'w').write(s)
print('coach links', sum(len(v) for v in coach_of.values()), 'ucl winners', len(ucl), 'ballon', len(ballon), 'bytes', len(s))
for n in ['Carles Puyol', 'Luka Modrić', 'Thomas Müller', 'Mohamed Salah']:
    for i in find(n): print(n, [COACHES[c][0] for c in sorted(coach_of[i])], 'UCL', len(ucl.get(i, ())))
