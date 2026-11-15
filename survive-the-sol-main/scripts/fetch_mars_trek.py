"""
Download a real Mars image from NASA Mars Trek for the Mars level background.

Layer: Mars_Viking_MDIM21_ClrMosaic_global_232m
       (Viking color mosaic of Mars, served by NASA Solar System Treks / Mars Trek)
Tile service (WMTS, no key needed):
  https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/default/default028mm/<zoom>/<row>/<col>.jpg
  Zoom 2 has 4 rows x 8 columns of 256 px tiles. Rows 1-2 are the band around
  the equator (this includes Valles Marineris, the giant canyon).

Credit shown in the game: "Mars image: NASA Mars Trek (NASA/JPL-Caltech),
Viking MDIM 2.1 color mosaic (NASA/USGS)". NASA imagery is generally free to
use for education (see NASA Images and Media Usage Guidelines).

Needs Pillow:  pip install pillow
Run:           python scripts/fetch_mars_trek.py
"""
import io
import urllib.request

from PIL import Image

LAYER = "Mars_Viking_MDIM21_ClrMosaic_global_232m"
URL = "https://trek.nasa.gov/tiles/Mars/EQ/" + LAYER + "/1.0.0/default/default028mm/{z}/{row}/{col}.jpg"
ZOOM, ROWS, COLS, TILE = 2, (1, 2), range(8), 256
OUTPUT_FILE = "assets/mars_trek_viking.jpg"


def get_tile(row, col):
    req = urllib.request.Request(URL.format(z=ZOOM, row=row, col=col),
                                 headers={"User-Agent": "SurviveTheSol/1.0 (NASA Space Apps student project)"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return Image.open(io.BytesIO(resp.read())).convert("RGB")


def main():
    out = Image.new("RGB", (TILE * len(COLS), TILE * len(ROWS)))
    for y, row in enumerate(ROWS):
        for x, col in enumerate(COLS):
            out.paste(get_tile(row, col), (x * TILE, y * TILE))
            print(f"  tile row {row} col {col} ok")
    out.save(OUTPUT_FILE, quality=82, optimize=True)
    print(f"Saved {OUTPUT_FILE} ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()
