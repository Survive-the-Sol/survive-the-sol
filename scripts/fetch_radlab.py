"""
Fetch real radiation dose-rate measurements from NASA OSDR RadLab and save a
small summary for the game in data/radiation.json.

RadLab Data API (no key needed): https://visualization.osdr.nasa.gov/radlab/api/
Docs / portal:                    https://visualization.osdr.nasa.gov/radlab/gui/data-api

Query syntax we use (GET, TSV output):
  ?instrument_id&spacecraft&absorbed_dose_rate
   &timestamp>=2023-03-01&timestamp<2023-03-08&format=tsv
"absorbed_dose_rate" is in micro-gray per hour (uGy/h).

What the game does with it:
  game_scale.moon = (median dose rate at the Moon, LRO/CRaTER) / (median on the ISS)
  game_scale.mars = (median dose rate on the Mars surface, Curiosity MSL-RAD) / (median on the ISS)
The daily drop of the "Radiation Safety" bar is multiplied by this scale,
so the game's radiation is based on real measurements.

Run:  python scripts/fetch_radlab.py
"""
import csv
import io
import json
import statistics
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

API = "https://visualization.osdr.nasa.gov/radlab/api/"
START = date(2023, 3, 1)   # March 2023: ISS, Moon (LRO) and Mars (Curiosity) all have data
DAYS = 28                  # 4 weeks of data
CHUNK_DAYS = 7             # ask for one week at a time (smaller requests)
OUTPUT_FILE = "data/radiation.json"

# Which detectors belong to which place.
GROUPS = {
    "iss":          {"label": "International Space Station (low Earth orbit)", "spacecraft": {"ISS"}},
    "moon":         {"label": "Moon orbit (NASA LRO, CRaTER detector)", "instruments": {"CRaTER-D1D2"}},
    "mars_surface": {"label": "Mars surface (NASA Curiosity rover, RAD detector)", "instruments": {"MSL-RAD-Surface"}},
    "deep_space":   {"label": "Deep space (NASA BioSentinel, BPD detector)", "spacecraft": {"BioSentinel"}},
}


def fetch_chunk(start, end):
    # RadLab wants the raw >= and < characters, so we keep them unescaped.
    query = (f"instrument_id&spacecraft&absorbed_dose_rate"
             f"&timestamp>={start.isoformat()}&timestamp<{end.isoformat()}&format=tsv")
    url = API + "?" + urllib.parse.quote(query, safe="&=<>:-_")
    req = urllib.request.Request(url, headers={"User-Agent": "SurviveTheSol/1.0 (NASA Space Apps student project)"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        text = resp.read().decode("utf-8")
    if not text.startswith("timestamp"):
        raise RuntimeError(f"Unexpected answer from RadLab: {text[:200]}")
    rows = list(csv.DictReader(io.StringIO(text), delimiter="\t"))
    return url, rows


def group_of(row):
    for key, g in GROUPS.items():
        if row["spacecraft"] in g.get("spacecraft", set()) or row["instrument_id"] in g.get("instruments", set()):
            return key
    return None


def main():
    values = {k: [] for k in GROUPS}
    instruments = {k: set() for k in GROUPS}
    example_url = None
    day = START
    end_all = START + timedelta(days=DAYS)
    print(f"Fetching RadLab dose rates {START} .. {end_all} ...")
    while day < end_all:
        end = min(day + timedelta(days=CHUNK_DAYS), end_all)
        url, rows = fetch_chunk(day, end)
        example_url = example_url or url
        for r in rows:
            g = group_of(r)
            try:
                v = float(r["absorbed_dose_rate"])
            except (TypeError, ValueError):
                continue
            if g and v >= 0:
                values[g].append(v)
                instruments[g].add(r["instrument_id"])
        print(f"  {day} .. {end}: {len(rows)} rows")
        day = end

    places = {}
    for key, g in GROUPS.items():
        if not values[key]:
            raise SystemExit(f"No data for {key} – stop and check the API (do not invent numbers).")
        med = statistics.median(values[key])
        places[key] = {
            "label": g["label"],
            "instruments": sorted(instruments[key]),
            "samples": len(values[key]),
            "median_uGy_per_hour": round(med, 2),
            "median_uGy_per_day": round(med * 24, 1),
        }
        print(f"  {key:13s} median {med:6.2f} uGy/h  ({len(values[key])} samples)")

    iss = places["iss"]["median_uGy_per_hour"]
    data = {
        "dataset": "NASA OSDR RadLab – absorbed dose rate (archived snapshot)",
        "source": "NASA Open Science Data Repository (OSDR) RadLab",
        "source_link": "https://visualization.osdr.nasa.gov/radlab/",
        "api": API,
        "example_query": example_url,
        "unit": "micro-gray per hour (uGy/h), absorbed dose rate",
        "period": [START.isoformat(), end_all.isoformat()],
        "fetched_on": datetime.now().strftime("%Y-%m-%d"),
        "places": places,
        # How much stronger than the ISS (used by the game to scale radiation).
        "game_scale": {
            "moon": round(places["moon"]["median_uGy_per_hour"] / iss, 2),
            "mars": round(places["mars_surface"]["median_uGy_per_hour"] / iss, 2),
        },
        "note": "Medians of all measurements in the period. Detectors and shielding differ, so this is a simple comparison for a kids' game.",
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved {OUTPUT_FILE}: game_scale = {data['game_scale']}")


if __name__ == "__main__":
    main()
