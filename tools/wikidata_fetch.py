"""Refresh tools/wikidata.json: dated club careers from Wikidata (CC0) for footballers who have a Transfermarkt ID.

The Transfermarkt dataset only has matches from 2012 on and few transfers before 2008, so careers of older players
are thin. Wikidata fills those years and adds retired players the dataset never had.

Usage:  python3 tools/wikidata_fetch.py RAW_DIR [tools/wikidata.json]
  RAW_DIR keeps the downloads so an interrupted run resumes where it stopped.
The query service is often rate limited (one query a minute); the script waits and retries.
Individual players come from Special:EntityData, which is cached and fast.
"""
import sys, os, json, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "MatchdayArcade-databuild/1.0 (open-source football quiz; github.com/aziz0810/abid-arcade)"}
MIN_SITELINKS = 20          # how famous a player must be (number of Wikipedia languages) to be fetched


def sparql(q):
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": q, "format": "json"})
    for k in range(8):
        try:
            req = urllib.request.Request(url, headers={**UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8", "replace"), strict=False)["results"]["bindings"]
        except Exception as e:
            print("  query retry", k, e, file=sys.stderr, flush=True); time.sleep(95)
    raise SystemExit("Wikidata query service unavailable, try again later")


def entity(q):
    for k in range(6):
        try:
            req = urllib.request.Request(f"https://www.wikidata.org/wiki/Special:EntityData/{q}.json", headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                return q, next(iter(json.loads(r.read().decode("utf-8", "replace"))["entities"].values()))
        except Exception as e:
            if "404" in str(e): return q, None
            time.sleep(3 * (k + 1))
    return q, None


def val(snak):
    dv = snak.get("datavalue")
    if not dv: return None
    v = dv["value"]
    if isinstance(v, dict):
        if "id" in v: return v["id"]
        if "time" in v: return v["time"][1:11]
    return v


def slim_player(e):
    c = e.get("claims", {})
    vals = lambda p: [val(s["mainsnak"]) for s in c.get(p, []) if s.get("rank") != "deprecated"]
    stints = []
    for s in c.get("P54", []):
        if s.get("rank") == "deprecated": continue
        qq = s.get("qualifiers", {})
        g = lambda p: (val(qq[p][0]) if p in qq else None)
        stints.append([val(s["mainsnak"]), g("P580"), g("P582"), 1 if "P1642" in qq else 0])
    return {"name": e.get("labels", {}).get("en", {}).get("value"), "born": (vals("P569") or [None])[0],
            "nat": vals("P1532") or vals("P27"), "pos": vals("P413"), "tm": (vals("P2446") or [None])[0], "stints": stints}


def fetch_many(ids, path, slim):
    have = json.load(open(path)) if os.path.exists(path) else {}
    todo = [i for i in ids if i not in have]
    print(f"  {len(todo)} to download", flush=True)
    with ThreadPoolExecutor(3) as ex:
        for n, (q, e) in enumerate(ex.map(entity, todo), 1):
            have[q] = slim(e) if e else None
            if n % 500 == 0: json.dump(have, open(path, "w")); print("  ", n, flush=True)
    json.dump(have, open(path, "w"))
    return have


def compact(raw, out):
    lists = json.load(open(os.path.join(raw, "list.json")))
    sl = {q: s for q, tm, s in lists}
    players = json.load(open(os.path.join(raw, "players.json")))
    teams = json.load(open(os.path.join(raw, "teams.json")))
    labels = json.load(open(os.path.join(raw, "labels.json")))
    P = {}
    for q, p in players.items():
        if not p or not p["born"] or not p["born"][:4].isdigit(): continue
        st = [[t, a, b, l] for t, a, b, l in p["stints"] if t in teams and a]
        if not st: continue
        P[q] = [p["tm"], p["name"], int(p["born"][:4]), p["nat"], p["pos"], st, sl.get(q, 0)]
    used = {t for p in P.values() for t, *_ in p[5]}
    nats = {n for p in P.values() for n in p[3]}
    poss = {n for p in P.values() for n in p[4]}
    data = {"source": "Wikidata (CC0), fetched " + time.strftime("%Y-%m-%d"),
            "teams": {t: teams[t] for t in sorted(used)},
            "countries": {q: labels[q] for q in sorted(nats) if labels.get(q)},
            "positions": {q: labels[q] for q in sorted(poss) if labels.get(q)},
            "players": P}
    json.dump(data, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("wrote", out, len(P), "players", len(used), "clubs")


def main():
    raw = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "wikidata.json")
    os.makedirs(raw, exist_ok=True)
    lp = os.path.join(raw, "list.json")
    if not os.path.exists(lp):
        print("1/4 listing footballers with a Transfermarkt ID")
        rows = sparql(f"SELECT ?p ?tm ?sl WHERE {{ ?p wdt:P2446 ?tm; wikibase:sitelinks ?sl. FILTER(?sl >= {MIN_SITELINKS}) }}")
        json.dump([[r["p"]["value"].rsplit("/", 1)[1], r["tm"]["value"], int(r["sl"]["value"])] for r in rows], open(lp, "w"))
    tp = os.path.join(raw, "teams.json")
    if not os.path.exists(tp):
        print("2/4 club Transfermarkt IDs")
        rows = sparql("SELECT ?t ?id WHERE { ?t wdt:P7223 ?id }")
        json.dump({r["t"]["value"].rsplit("/", 1)[1]: r["id"]["value"] for r in rows}, open(tp, "w"))
    print("3/4 player careers")
    ids = sorted({q for q, tm, s in json.load(open(lp))}, key=lambda q: -dict((a, c) for a, b, c in json.load(open(lp)))[q])
    players = fetch_many(ids, os.path.join(raw, "players.json"), slim_player)
    print("4/4 country and position names")
    want = sorted({n for p in players.values() if p for n in (p["nat"] or []) + (p["pos"] or []) if n})
    lab = fetch_many(want, os.path.join(raw, "labels_raw.json"), lambda e: e.get("labels", {}).get("en", {}).get("value"))
    json.dump(lab, open(os.path.join(raw, "labels.json"), "w"))
    compact(raw, out)


if __name__ == "__main__":
    main()
