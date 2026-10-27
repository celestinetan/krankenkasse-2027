"""Build the page's data files from official Swiss sources.

Runs on GitHub's servers (see .github/workflows/update-data.yml).
Sources:
  - FOPH/BAG open data "Krankenversicherungspraemien" (opendata.swiss / opendata.bagnet.ch)
  - priminfo.admin.ch: premium regions by postcode, admitted insurers
Output (data/):
  tariffs.json      global list of insurer models  [[id, insurer, code, type, name], ...]
  insurers.json     {insurer_id: short name}
  cantons/XX.txt    one line per model x age x region x accident:  tid,age,reg,acc,p300 p500 ... p2500,prev2026
  plz.json          [[postcode, place, canton, [regions]], ...]
  meta.json         dates, counts, checksums
  raw/*.csv         small FOPH availability files, kept as published
  _inspect.txt      headers of every source file, for checking
"""
import csv, io, json, re, sys, time, zipfile, hashlib, datetime, pathlib
import requests
from openpyxl import load_workbook

OUT = pathlib.Path(__file__).resolve().parent.parent / "data"
YEAR = 2027
CKAN = "https://ckan.opendata.swiss/api/3/action/package_show?id=health-insurance-premiums"
PRIMINFO = "https://www.priminfo.admin.ch"
DEDS = [300, 500, 1000, 1500, 2000, 2500]
TYPE_2026 = {"TAR-BASE": "BASE", "TAR-HAM": "PRAXIS", "TAR-HMO": "PRAXIS", "TAR-DIV": "FLEX"}
inspect = []

S = requests.Session()
S.headers["User-Agent"] = "krankenkasse-2027 data job (github.com/celestinetan/krankenkasse-2027)"


def get(url, tries=6):
    for i in range(tries):
        try:
            r = S.get(url, timeout=180)
            if r.status_code == 200 and len(r.content) > 100:
                return r.content
            print(f"  {url[:80]} -> HTTP {r.status_code}, retry {i + 1}")
        except requests.RequestException as e:
            print(f"  {url[:80]} -> {e}, retry {i + 1}")
        time.sleep(20 * (i + 1))
    sys.exit(f"Could not download {url}. Source may be down; nothing was changed.")


def text(b):
    try:
        return b.decode("utf-8-sig")
    except UnicodeDecodeError:
        return b.decode("windows-1252")


def rows_of(csv_text, label):
    lines = csv_text.splitlines()
    sep = ";" if lines[0].count(";") > lines[0].count(",") else ","
    rd = list(csv.reader(lines, delimiter=sep))
    inspect.append(f"{label}: {len(rd) - 1} rows, sep '{sep}'\n  header: {rd[0]}\n  first: {rd[1] if len(rd) > 1 else ''}")
    return rd[0], rd[1:]


def resource_urls():
    pkg = json.loads(get(CKAN))["result"]
    out = {}
    for r in pkg["resources"]:
        n = r.get("title") or r.get("name")
        if isinstance(n, dict):
            n = n.get("de") or n.get("en") or next((v for v in n.values() if v), "")
        out[n] = r.get("download_url") or r.get("url")
    inspect.append("CKAN resources: " + ", ".join(out))
    return out


def premium_groups(csv_text, label):
    """-> {(ins, tar, canton, age, reg, acc): {"p": {ded: prem}, "type", "name"}}"""
    head, data = rows_of(csv_text, label)
    ix = {h: i for i, h in enumerate(head)}
    g = {}
    for f in data:
        if len(f) < len(head):
            continue
        akl = f[ix["Altersklasse"]]
        age = "E" if "ERW" in akl else "J" if "JUG" in akl else None
        if not age:
            continue  # children are not covered yet
        reg = int(re.search(r"(\d)\s*$", f[ix["Region"]]).group(1))
        acc = "M" if "MIT" in f[ix["Unfalleinschluss"]] else "O"
        ded = int(re.search(r"(\d+)$", f[ix["Franchise"]]).group(1))
        if ded not in DEDS:
            continue
        typ = f[ix["Tariftyp"]]
        typ = TYPE_2026.get(typ, typ)
        key = (f[ix["Versicherer"]], f[ix["Tarif"]], f[ix["Kanton"]], age, reg, acc)
        e = g.setdefault(key, {"p": {}, "type": typ, "name": f[ix["Tarifbezeichnung"]].strip() or f[ix["Tarif"]]})
        e["p"][ded] = round(float(f[ix["Prämie"]]) * 100)
    return g


def xlsx_rows(content, sheet_name=None):
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb[sheet_name] if sheet_name else wb.worksheets[0]
    return [[("" if c is None else str(c)).strip() for c in row] for row in ws.iter_rows(values_only=True)], wb.sheetnames


def priminfo_link(pattern):
    html = text(get(PRIMINFO + "/de/downloads/aktuell"))
    m = re.findall(r'href="(/downloads/[^"]+)"', html)
    hit = [x for x in m if re.search(pattern, x)]
    if not hit:
        sys.exit(f"No priminfo download matches {pattern}")
    return PRIMINFO + hit[0]


SHORT = {"Assura-Basis SA": "Assura", "Atupri Gesundheitsversicherung AG": "Atupri", "CONCORDIA": "Concordia",
         "Avenir Krankenversicherung AG": "Avenir (Groupe Mutuel)", "Mutuel Krankenversicherung AG": "Mutuel (Groupe Mutuel)",
         "Philos Krankenversicherung AG": "Philos (Groupe Mutuel)", "Easy Sana Krankenversicherung AG": "Easy Sana (Groupe Mutuel)",
         "AMB Assurances SA": "AMB (Groupe Mutuel)", "SUPRA-1846 SA": "Supra (Groupe Mutuel)", "Vivao Sympany": "Sympany (Vivao)",
         "GALENOS AG": "Galenos", "Einsiedler Krankenkasse": "Einsiedler Krankenkasse"}


def short(name):
    name = re.sub(r"\s+", " ", name).strip()
    if name in SHORT:
        return SHORT[name]
    return re.sub(r"\s+(Krankenversicherung|Kranken- und Unfallversicherung|Versicherungen)?\s*(AG|SA|Genossenschaft)$", "", name).strip() or name


def main():
    (OUT / "cantons").mkdir(parents=True, exist_ok=True)
    (OUT / "raw").mkdir(parents=True, exist_ok=True)
    res = resource_urls()

    print("Premiums 2027")
    p27 = premium_groups(text(get(res["Prämien_CH.csv"])), f"Prämien_CH.csv ({YEAR})")
    print("Premiums 2026")
    arch = next(k for k in res if k.startswith(f"Archiv_Praemien_{YEAR - 1}"))
    z = zipfile.ZipFile(io.BytesIO(get(res[arch])))
    name26 = next(n for n in z.namelist() if n.endswith("Prämien_CH.csv") or n.endswith("Prämien_CH.csv") or re.search(r"r.?mien_CH\.csv$", n))
    p26 = premium_groups(text(z.read(name26)), f"Prämien_CH.csv ({YEAR - 1})")

    ez_rows = []
    for label in ["Einzugsgebiete.csv", "Eingeschr.-Tät.gebiete.csv"]:
        if label in res:
            b = get(res[label])
            fn = "einzugsgebiete.csv" if label.startswith("Einzug") else "eingeschraenkte_taetigkeitsgebiete.csv"
            (OUT / "raw" / fn).write_text(text(b), encoding="utf-8")
            if label.startswith("Einzug"):
                ez_head, ez_rows = rows_of(text(b), label)
            else:
                inspect.append(label + ": kept as published in data/raw/")

    # 2026 lookup by code, then by name
    by_code = {k: v for k, v in p26.items()}
    by_name = {(k[0], v["name"], k[2], k[3], k[4], k[5]): v for k, v in p26.items()}

    # global tariff list
    tids = {}
    for (ins, tar, *_), v in sorted(p27.items()):
        if (ins, tar) not in tids:
            tids[(ins, tar)] = [len(tids), ins, tar, v["type"], v["name"]]

    per_canton = {}
    for key, v in sorted(p27.items(), key=lambda kv: (kv[0][2], tids[(kv[0][0], kv[0][1])][0], kv[0][3], kv[0][4], kv[0][5])):
        ins, tar, kt, age, reg, acc = key
        prev = by_code.get(key) or by_name.get((ins, v["name"], kt, age, reg, acc))
        p = [v["p"].get(d) for d in DEDS]
        pstr = " ".join("-" if x is None else str(x) for x in p)
        dstr = ""
        if prev:
            d = [None if (a is None or prev["p"].get(dd) is None) else a - prev["p"][dd] for a, dd in zip(p, DEDS)]
            nn = [x for x in d if x is not None]
            if nn and max(nn) - min(nn) <= 20:
                dstr = "d" + str(round(sum(nn) / len(nn) / 5) * 5)
            elif nn:
                dstr = " ".join("-" if x is None else str(x) for x in d)
        per_canton.setdefault(kt, []).append(f"{tids[(ins, tar)][0]},{age},{reg},{acc},{pstr},{dstr}")

    sums = {}
    for kt, lines in per_canton.items():
        body = "\n".join(lines) + "\n"
        (OUT / "cantons" / f"{kt}.txt").write_text(body, encoding="utf-8")
        sums[kt] = {"rows": len(lines), "sha256": hashlib.sha256(body.encode()).hexdigest()[:16]}
    (OUT / "tariffs.json").write_text(json.dumps(list(tids.values()), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # models only offered in some municipalities (FOPH "Einzugsgebiete"): {canton: {"tid|region": [BFS numbers]}}
    restricted = {}
    if ez_rows:
        ix = {h: i for i, h in enumerate(ez_head)}
        for f in ez_rows:
            if len(f) <= ix["Gemeinden-BFS"] or f[ix["Eingeschränkt"]].strip().upper() != "Y":
                continue
            key = (f[ix["Versicherer"]], f[ix["Tarif"]])
            if key not in tids:
                continue
            reg = int(re.search(r"(\d)\s*$", f[ix["Region"]]).group(1))
            bfs = sorted({int(x) for x in re.findall(r"\d+", f[ix["Gemeinden-BFS"]])})
            restricted.setdefault(f[ix["Kanton"]], {})[f"{tids[key][0]}|{reg}"] = bfs
    (OUT / "restricted.json").write_text(json.dumps(restricted, separators=(",", ":")), encoding="utf-8")
    inspect.append(f"restricted models: {sum(len(v) for v in restricted.values())}")

    print("Insurers")
    names = {}
    wb = load_workbook(io.BytesIO(get(priminfo_link(r"zugelassene-krankenversicherer.*\.xlsx$"))), read_only=True, data_only=True)
    for ws in wb.worksheets:
        for r in ws.iter_rows(values_only=True):
            vals = [c for c in r if c is not None]
            if len(vals) >= 2 and str(vals[0]).strip().isdigit():
                names[str(int(vals[0]))] = short(str(vals[1]))
    used = sorted({t[1] for t in tids.values()}, key=int)
    insurers = {i: names.get(i, f"Insurer {i}") for i in used}
    (OUT / "insurers.json").write_text(json.dumps(insurers, ensure_ascii=False, indent=0), encoding="utf-8")
    inspect.append(f"insurers: {len(insurers)} used, {sum(1 for i in used if i not in names)} without a name")

    print("Postcodes")
    content = get(priminfo_link(rf"praemienregionen-{YEAR}\.xlsx$"))
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = next(w for w in wb.worksheets if "NPA" in w.title.upper() or "PLZ" in w.title.upper())
    plz = {}
    started = False
    for r in ws.iter_rows(values_only=True):
        vals = ["" if c is None else str(c).strip() for c in r]
        nums = [v for v in vals if re.fullmatch(r"\d{4}", v)]
        if not started:
            started = bool(nums) and any(re.fullmatch(r"[A-Z]{2}", v) for v in vals)
            if not started:
                continue
        # expected columns: [flag], PLZ, place, canton, region, BFS, municipality, district
        try:
            i = next(k for k, v in enumerate(vals) if re.fullmatch(r"\d{4}", v))
            code, place, kt, reg, bfs = vals[i], vals[i + 1], vals[i + 2], vals[i + 3], vals[i + 4]
        except (StopIteration, IndexError):
            continue
        if not re.fullmatch(r"[A-Z]{2}", kt):
            continue
        regn = int(re.sub(r"\D", "", reg) or 0)
        e = plz.setdefault((code, place, kt), [set(), set()])
        e[0].add(regn)
        if re.fullmatch(r"\d+", bfs):
            e[1].add(int(bfs))
    plz_list = [[c, p, k, sorted(r), sorted(b)] for (c, p, k), (r, b) in sorted(plz.items())]
    (OUT / "plz.json").write_text(json.dumps(plz_list, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    inspect.append(f"postcodes: {len(plz_list)} entries, sheet {ws.title}")

    meta = {"year": YEAR, "built": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "source": "FOPH/BAG Krankenversicherungspraemien (opendata.swiss); priminfo.admin.ch",
            "tariffs": len(tids), "insurers": len(insurers), "cantons": sums}
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "_inspect.txt").write_text("\n\n".join(inspect) + "\n", encoding="utf-8")
    print(json.dumps({k: v["rows"] for k, v in sums.items()}))


if __name__ == "__main__":
    main()
