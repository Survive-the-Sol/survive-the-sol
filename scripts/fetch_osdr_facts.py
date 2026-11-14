"""
Build data/facts.json: short, kid-friendly "Did you know?" facts from real
NASA OSDR (Open Science Data Repository) studies.

OSDR APIs used (no key needed):
  Study metadata: https://osdr.nasa.gov/osdr/data/osd/meta/<number>
  Study search:   https://osdr.nasa.gov/osdr/data/search?term=<word>&type=cgene
(We used the search API with words like "lettuce" and "Veggie" to find
 candidate studies, then read each study description.)

HOW WE KEEP FACTS HONEST
Every fact below has a "quote": the exact sentence part from the study
description that supports it. This script downloads each study and checks the
quote is really there. If not, it stops – so we never ship a made-up fact.

Run:  python scripts/fetch_osdr_facts.py
"""
import json
import re
import urllib.request
from datetime import datetime

META_API = "https://osdr.nasa.gov/osdr/data/osd/meta/{num}"
STUDY_PAGE = "https://osdr.nasa.gov/bio/repo/data/studies/OSD-{num}"
OUTPUT_FILE = "data/facts.json"

FACTS = [
    {
        "study": 895, "emoji": "🥒",
        "text": "In a test space greenhouse called EDEN ISS (in Antarctica!), scientists grew more than 268 kg of food in 2018 – mostly cucumbers, lettuce, leafy greens and tomatoes.",
        "text_ur": "انٹارکٹیکا میں ایک آزمائشی خلائی گرین ہاؤس (ایڈن آئی ایس ایس) میں 2018 میں 268 کلو سے زیادہ خوراک اگائی گئی۔",
        "quote": "In total more than 268 kg of edible biomass was produced by the EDEN ISS greenhouse facility in 2018",
    },
    {
        "study": 895, "emoji": "💡",
        "text": "The EDEN ISS greenhouse grew 26 different crops under LED lights that were on for 17 hours a day.",
        "text_ur": "ایڈن آئی ایس ایس گرین ہاؤس میں ایل ای ڈی روشنی میں 26 قسم کی فصلیں اگائی گئیں، روزانہ 17 گھنٹے روشنی کے ساتھ۔",
        "quote": "During the first season 26 different crops were grown",
        "quote2": "the photoperiod was 17 h per day",
    },
    {
        "study": 767, "emoji": "🍅",
        "text": "Tomato plants grown on the International Space Station grew lots of extra roots as they coped with life in space.",
        "text_ur": "خلائی اسٹیشن پر اگنے والے ٹماٹر کے پودوں نے خلا میں رہنے کے لیے بہت سی اضافی جڑیں بنائیں۔",
        "quote": "spaceflight exhibited extensive adventitious roots formation",
    },
    {
        "study": 766, "emoji": "🔴",
        "text": "In the VEG-05 experiment, astronauts grew tomatoes on the ISS for 101 days, testing red-rich and blue-rich lights.",
        "text_ur": "VEG-05 تجربے میں خلابازوں نے خلائی اسٹیشن پر 101 دن ٹماٹر اگائے اور سرخ اور نیلی روشنی آزمائی۔",
        "quote": "(101 days) to investigate tomato-growth responses and plant-microbiome differences due to two lighting recipes",
    },
    {
        "study": 766, "emoji": "💧",
        "text": "When the space tomatoes did not get the right amount of water, they lost flowers and fruit. Space plants need careful watering – just like the plant in your base!",
        "text_ur": "جب خلائی ٹماٹروں کو صحیح مقدار میں پانی نہ ملا تو ان کے پھول اور پھل گر گئے۔",
        "quote": "Water stress in plants led to flower and fruit loss",
    },
    {
        "study": 412, "emoji": "🥬",
        "text": "Scientists checked red romaine lettuce, green lettuce and mizuna grown together in the ISS Veggie chamber. They were safe to eat!",
        "text_ur": "سائنس دانوں نے خلائی اسٹیشن کے ویجی خانے میں اگنے والی سلاد اور میزونا کو جانچا۔ وہ کھانے کے لیے محفوظ تھیں!",
        "quote": "indicated the leafy greens were safe for consumption",
    },
    {
        "study": 964, "emoji": "🛰️",
        "text": "BioSentinel was the first mission in 50 years to send living things beyond low Earth orbit to study radiation. Its tiny passengers were yeast cells!",
        "text_ur": "بائیو سینٹینل 50 سال میں پہلا مشن تھا جس نے تابکاری کے مطالعے کے لیے زندہ خلیے زمین کے قریبی مدار سے آگے بھیجے۔ اس کے مسافر خمیر کے خلیے تھے!",
        "quote": "The BioSentinel mission will be the first biological payload to study the effects of radiation beyond low Earth orbit in 50 years",
        "quote2": "budding yeast cells will be used",
    },
    {
        "study": 964, "emoji": "🧫",
        "text": "In BioSentinel tests, more space-like radiation made yeast cells grow less. That is why shielding astronauts is so important!",
        "text_ur": "بائیو سینٹینل کے تجربات میں زیادہ تابکاری سے خمیر کے خلیے کم بڑھے۔ اسی لیے خلابازوں کی حفاظت بہت ضروری ہے!",
        "quote": "there is a dose-dependent decrease in yeast cell growth and metabolism in response to space-like radiation",
    },
]


def fetch_study(num):
    req = urllib.request.Request(META_API.format(num=num),
                                 headers={"User-Agent": "SurviveTheSol/1.0 (NASA Space Apps student project)"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    study = data["study"][f"OSD-{num}"]["studies"][0]
    return study.get("title", ""), study.get("description", "")


def norm(text):
    return re.sub(r"\s+", " ", text).strip().lower()


def main():
    cache, out = {}, []
    for fact in FACTS:
        num = fact["study"]
        if num not in cache:
            cache[num] = fetch_study(num)
            print(f"OSD-{num}: {cache[num][0][:80]}")
        title, desc = cache[num]
        for q in (fact.get("quote"), fact.get("quote2")):
            if q and norm(q) not in norm(desc):
                raise SystemExit(f"Quote not found in OSD-{num}! Fix the fact, do not guess.\n  {q}")
        out.append({
            "id": f"OSD-{num}",
            "emoji": fact["emoji"],
            "text": fact["text"],
            "text_ur": fact["text_ur"],
            "evidence": " … ".join(q for q in (fact.get("quote"), fact.get("quote2")) if q),
            "study_title": title,
            "source": f"NASA OSDR, study OSD-{num}",
            "source_link": STUDY_PAGE.format(num=num),
        })
    data = {
        "dataset": "NASA Open Science Data Repository (OSDR) – kid-friendly facts (archived snapshot)",
        "api": "https://osdr.nasa.gov/osdr/data/osd/meta/<study number>",
        "fetched_on": datetime.now().strftime("%Y-%m-%d"),
        "count": len(out),
        "facts": out,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(out)} checked facts to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
