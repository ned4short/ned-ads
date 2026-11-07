#!/usr/bin/env python3
"""Make every ad image in ads/ small and fast: 1200x400 WebP, under MAX_KB.

- Banner-shaped images (close to 3:1) become exactly 1200x400 (scaled, center-cropped if slightly off).
- Any other shape is scaled down to fit inside 1200x400 without cropping
  (the widget shows those beside a colored panel).
- Saves as ads/<name>.webp, deletes the original if it wasn't already that file,
  and updates ads.json to point to the new file.
- Images already 1200x400-or-smaller WebP under MAX_KB are left alone, so it's safe to run any time.

Run from the repo root:  python3 tools/optimize_ads.py
"""
import hashlib
import io
import json
import os
import sys

from PIL import Image, ImageOps

W, H = 1200, 400
BANNER_TOLERANCE = 0.12      # within 12% of 3:1 counts as a banner
MAX_KB = 100                 # target size per image
START_QUALITY, MIN_QUALITY = 82, 50
EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADS_DIR = os.path.join(ROOT, 'ads')
ADS_JSON = os.path.join(ROOT, 'ads.json')
DONE_FILE = os.path.join(ROOT, 'tools', 'optimized.json')  # fingerprints of files already optimized


def resize(im):
    ratio = im.width / im.height
    if abs(ratio - W / H) / (W / H) <= BANNER_TOLERANCE:
        return ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, 0.5))
    im = im.copy()
    im.thumbnail((W, H), Image.LANCZOS)   # only ever shrinks
    return im


def encode(im):
    q = START_QUALITY
    while True:
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=q, method=6)
        if buf.tell() <= MAX_KB * 1024 or q <= MIN_QUALITY:
            return buf.getvalue(), q
        q = max(q - 6, MIN_QUALITY)


def fingerprint(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()


def needs_work(path, im, done):
    if fingerprint(path) in done:  # already optimized by this script; don't compress twice
        return False
    return not (path.lower().endswith('.webp') and im.width <= W and im.height <= H
                and os.path.getsize(path) <= MAX_KB * 1024)


def main():
    renamed = {}
    changed = 0
    try:
        with open(DONE_FILE) as f:
            done = set(json.load(f))
    except (OSError, ValueError):
        done = set()
    for name in sorted(os.listdir(ADS_DIR)):
        src = os.path.join(ADS_DIR, name)
        stem, ext = os.path.splitext(name)
        if not os.path.isfile(src) or ext.lower() not in EXTS:
            continue
        with Image.open(src) as im:
            if not needs_work(src, im, done):
                continue
            im.seek(0)
            im = ImageOps.exif_transpose(im)
            rgba = im.convert('RGBA')
            im = rgba if rgba.getextrema()[3][0] < 255 else im.convert('RGB')  # keep transparency only if used
            before = (os.path.getsize(src), im.width, im.height)
            out = resize(im)
            data, q = encode(out)
        dest_name = stem + '.webp'
        with open(os.path.join(ADS_DIR, dest_name), 'wb') as f:
            f.write(data)
        done.add(hashlib.sha1(data).hexdigest())
        if dest_name != name:
            os.remove(src)
            renamed['ads/' + name] = 'ads/' + dest_name
        changed += 1
        print(f'{name}: {before[1]}x{before[2]} {before[0] // 1024} KB -> '
              f'{dest_name}: {out.width}x{out.height} {len(data) // 1024} KB (quality {q})')

    if renamed and os.path.exists(ADS_JSON):
        with open(ADS_JSON, encoding='utf-8') as f:
            text = f.read()
        for old, new in renamed.items():
            text = text.replace('"' + old + '"', '"' + new + '"')
        json.loads(text)  # make sure it's still valid
        with open(ADS_JSON, 'w', encoding='utf-8') as f:
            f.write(text)
    current = {fingerprint(os.path.join(ADS_DIR, n)) for n in os.listdir(ADS_DIR)
               if os.path.isfile(os.path.join(ADS_DIR, n))}
    with open(DONE_FILE, 'w') as f:
        json.dump(sorted(done & current), f, indent=0)
        f.write('\n')
    if not changed:
        print('All ad images are already optimized.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
