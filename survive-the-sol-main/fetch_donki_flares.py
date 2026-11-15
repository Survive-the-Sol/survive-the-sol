import json
import urllib.request
import calendar
from datetime import datetime

YEAR = 2026          # <-- saal yahan badlo (2024 ya 2026)
LAST_MONTH = 11      # <-- 2026 ke liye 11 (November), 2024 ke liye 12
OUTPUT_FILE = f"data/flares_{YEAR}.json"

CLASS_RULES = {
    "X": {"severity": "extreme", "radiation_hit": 30, "kid_label": "Huge solar storm!"},
    "M": {"severity": "strong",  "radiation_hit": 18, "kid_label": "Strong solar storm"},
    "C": {"severity": "mild",    "radiation_hit": 8,  "kid_label": "Small solar storm"},
}


def fetch_flares():
    all_flares = []
    for month in range(1, LAST_MONTH + 1):
        last_day = calendar.monthrange(YEAR, month)[1]
        start = f"{YEAR}-{month:02d}-01"
        end = f"{YEAR}-{month:02d}-{last_day}"
        url = f"https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?startDate={start}&endDate={end}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SurviveTheSol/1.0"})
            with urllib.request.urlopen(req, timeout=60) as response:
                month_data = json.loads(response.read().decode("utf-8")) or []
                all_flares += month_data
                print(f"  {start[:7]}: {len(month_data)} flares")
        except Exception as e:
            print(f"  {start[:7]}: skipped ({e})")
    return all_flares


def to_game_event(flare):
    class_type = flare.get("classType") or ""
    rules = CLASS_RULES.get(class_type[:1].upper())
    if not rules:
        return None
    peak = flare.get("peakTime") or flare.get("beginTime")
    try:
        nice_date = datetime.strptime(peak[:10], "%Y-%m-%d").strftime("%d %B %Y")
    except (TypeError, ValueError):
        nice_date = peak
    return {
        "id": flare.get("flrID"),
        "class": class_type,
        "date": nice_date,
        "peak_time_utc": peak,
        "severity": rules["severity"],
        "radiation_hit": rules["radiation_hit"],
        "kid_label": rules["kid_label"],
        "fact": f"This solar flare (class {class_type}) really happened on {nice_date}.",
        "source": "NASA CCMC DONKI",
        "source_link": flare.get("link"),
    }


def main():
    print(f"Fetching DONKI solar flares for {YEAR} ...")
    raw = fetch_flares()
    events = [e for e in (to_game_event(f) for f in raw) if e]
    order = {"extreme": 0, "strong": 1, "mild": 2}
    events.sort(key=lambda e: order[e["severity"]])
    data = {
        "dataset": "NASA CCMC DONKI Solar Flares (archived snapshot)",
        "year": YEAR,
        "fetched_on": datetime.now().strftime("%Y-%m-%d"),
        "count": len(events),
        "events": events,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    counts = {k: sum(1 for e in events if e["severity"] == k) for k in order}
    print(f"Saved {len(events)} flares to {OUTPUT_FILE}  {counts}")


if __name__ == "__main__":
    main()