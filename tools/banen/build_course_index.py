"""Merge data/banen/<slug>/course.json into import files and a readable report.

Writes:
    data/banen/courses.json   all courses, sorted by distance from Dedemsvaart (import this)
    data/banen/courses.csv    one row per course (name, address, GPS, holes, ...)
    data/banen/holes.csv      one row per hole per loop (par, SI, lengths per tee)
    data/banen/OVERZICHT.md   human-readable report per course

    python tools/banen/build_course_index.py
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSES = ROOT / "data" / "banen"


def load():
    out, bad = [], []
    for f in sorted(COURSES.glob("*/course.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            bad.append(f"{f.parent.name}: {e}")
            continue
        d.setdefault("slug", f.parent.name)
        shots = f.parent / "screenshots"
        d["screenshots"] = sorted(str(p.relative_to(f.parent)).replace("\\", "/") for p in shots.glob("*")) if shots.exists() else []
        out.append(d)
    out.sort(key=lambda d: d.get("distance_km_from_dedemsvaart") or 999)
    return out, bad


def fmt(v):
    return "" if v is None else str(v)


def write_csv(courses):
    cols = ["slug", "name", "club_name", "course_type", "holes_total", "street", "postal_code", "city",
            "province", "country", "lat", "lon", "distance_km", "phone", "email", "website", "booking_url",
            "founded", "architect", "landscape", "greenfee_welcome", "requirements", "loops", "par",
            "scorecard_page_url", "scorecard_complete", "description_nl"]
    with open(COURSES / "courses.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(cols)
        for d in courses:
            a, g, sc = d.get("address") or {}, d.get("gps") or {}, d.get("scorecard") or {}
            loops = d.get("loops") or []
            w.writerow([d.get("slug"), d.get("name"), d.get("club_name"), d.get("course_type"), d.get("holes_total"),
                        a.get("street"), a.get("postal_code"), a.get("city"), a.get("province"), a.get("country"),
                        g.get("lat"), g.get("lon"), d.get("distance_km_from_dedemsvaart"), d.get("phone"),
                        d.get("email"), d.get("website"), d.get("booking_url"), d.get("founded"), d.get("architect"),
                        d.get("landscape"), d.get("greenfee_welcome"), d.get("requirements"),
                        " | ".join(fmt(l.get("name")) for l in loops),
                        " | ".join(fmt(l.get("par")) for l in loops),
                        sc.get("page_url"), sc.get("complete"), d.get("description_nl")])

    tee_names = sorted({t for d in courses for l in d.get("loops") or [] for h in l.get("hole_data") or []
                        for t in (h.get("lengths_m") or {})})
    with open(COURSES / "holes.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["slug", "loop", "hole", "par", "si", "si_women"] + [f"len_{t}" for t in tee_names])
        for d in courses:
            for l in d.get("loops") or []:
                for h in l.get("hole_data") or []:
                    lens = h.get("lengths_m") or {}
                    w.writerow([d.get("slug"), l.get("name"), h.get("hole"), h.get("par"), h.get("si"),
                                h.get("si_women")] + [lens.get(t) for t in tee_names])


def write_md(courses, bad):
    L = ["# Golfbanen in Nederland (en net over de grens)", "",
         "Gegenereerd door `tools/banen/build_course_index.py` uit `data/banen/<slug>/course.json`. "
         "Gesorteerd op afstand hemelsbreed vanaf Dedemsvaart (52.6008, 6.4594). De scorekaartbestanden "
         "(`<slug>/scorecard/...`) staan op de branch `scorekaarten`, onder dezelfde paden.", "",
         "| # | Baan | Plaats | km | Holes | Scorekaart |", "|---|---|---|---|---|---|"]
    for i, d in enumerate(courses, 1):
        sc = d.get("scorecard") or {}
        state = {True: "compleet", False: "deels"}.get(sc.get("complete"), "geen")
        L.append(f"| {i} | [{d.get('name')}](#{d.get('slug')}) | {(d.get('address') or {}).get('city') or ''} | "
                 f"{fmt(d.get('distance_km_from_dedemsvaart'))} | {fmt(d.get('holes_total'))} | {state} |")
    L.append("")
    for d in courses:
        a, g, sc = d.get("address") or {}, d.get("gps") or {}, d.get("scorecard") or {}
        L += [f'<a id="{d.get("slug")}"></a>', f"## {d.get('name')}", ""]
        if d.get("description_nl"):
            L += [d["description_nl"], ""]
        addr = ", ".join(x for x in [a.get("street"), " ".join(x for x in [a.get("postal_code"), a.get("city")] if x),
                                     a.get("province"), a.get("country")] if x)
        rows = [("Club", d.get("club_name")), ("Adres", addr),
                ("GPS", f"{g.get('lat')}, {g.get('lon')}" if g.get("lat") else None),
                ("Afstand", f"{d.get('distance_km_from_dedemsvaart')} km" if d.get("distance_km_from_dedemsvaart") else None),
                ("Type", d.get("course_type")), ("Holes", d.get("holes_total")), ("Landschap", d.get("landscape")),
                ("Opgericht", d.get("founded")), ("Architect", d.get("architect")),
                ("Telefoon", d.get("phone")), ("E-mail", d.get("email")), ("Website", d.get("website")),
                ("Starttijden", d.get("booking_url")), ("Greenfee welkom", d.get("greenfee_welcome")),
                ("Eisen", d.get("requirements")), ("Faciliteiten", ", ".join(d.get("facilities") or []) or None)]
        L += [f"- **{k}:** {v}" for k, v in rows if v not in (None, "")]
        L.append("")
        for l in d.get("loops") or []:
            L.append(f"**Lus {l.get('name') or ''}** — {fmt(l.get('holes'))} holes, par {fmt(l.get('par'))}")
            tees = l.get("tees") or []
            if tees:
                L += ["", "| Tee | Lengte (m) | CR | Slope | Par |", "|---|---|---|---|---|"]
                L += [f"| {t.get('name')}{' (' + t['gender'] + ')' if t.get('gender') else ''} | {fmt(t.get('length_m'))} | "
                      f"{fmt(t.get('course_rating'))} | {fmt(t.get('slope'))} | {fmt(t.get('par'))} |" for t in tees]
            holes = l.get("hole_data") or []
            if holes:
                tn = list(dict.fromkeys(t for h in holes for t in (h.get("lengths_m") or {})))
                L += ["", "| Hole | Par | SI | " + " | ".join(tn) + " |", "|---" * (3 + len(tn)) + "|"]
                L += [f"| {h.get('hole')} | {fmt(h.get('par'))} | {fmt(h.get('si'))} | " +
                      " | ".join(fmt((h.get("lengths_m") or {}).get(t)) for t in tn) + " |" for h in holes]
            L.append("")
        files = [f"[{p}]({d.get('slug')}/{p})" for p in (sc.get("files") or []) + d["screenshots"]]
        L.append(f"- **Scorekaartpagina:** {sc.get('page_url') or '—'}")
        if files:
            L.append(f"- **Bestanden:** {', '.join(files)}")
        if sc.get("notes"):
            L.append(f"- **Opmerking:** {sc['notes']}")
        L.append("")
    if bad:
        L += ["## Ongeldige bestanden", ""] + [f"- {b}" for b in bad]
    (COURSES / "OVERZICHT.md").write_text("\n".join(L) + "\n", encoding="utf-8")


def main():
    courses, bad = load()
    (COURSES / "courses.json").write_text(json.dumps(courses, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(courses)
    write_md(courses, bad)
    print(f"{len(courses)} courses written" + (f", {len(bad)} invalid: {bad}" if bad else ""))


if __name__ == "__main__":
    main()
