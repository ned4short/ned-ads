# Ned Ads

One advertiser slideshow shared by every Ned website. Change the ads here once and every site updates.

Live: https://ads.nedwebservices.com

## Add the slideshow to a website

Paste this where the slideshow should appear (usually right after the footer):

```html
<div data-ned-ads></div>
<script async src="https://ads.nedwebservices.com/widget.js"></script>
```

It carries its own styling, so it can't clash with the site's own design. Its background is transparent, so it sits on whatever background the site has. It includes the slideshow (5 seconds per ad, arrows, Pause/Play, swipe on phones), and the "Advertise with us" button.

## Manage the ads

- `ads.json` – the list of ads, in slideshow order. **New ads always go at the top of the list.** Each entry has a `name`, an `image` (file in `ads/`) and a `link` (opens in a new tab).
- Banner-shaped images (about 3 times wider than tall, e.g. 1200 × 400) are shown as-is.
- **Images are optimized automatically.** Upload any JPG, PNG, GIF or WebP to `ads/` and point `ads.json` at it. Within a minute the "Optimize ad images" GitHub Action converts it to a 1200 × 400 WebP under 100 KB (banner shapes are resized and lightly center-cropped; other shapes are shrunk to fit without cropping), deletes the original, and updates `ads.json`. To run it by hand: `pip install Pillow && python3 tools/optimize_ads.py`.
- Any other shape is shown whole beside a red, blue or yellow panel with the name and a "Visit …" link. `"color": "red" | "blue" | "yellow"` picks the panel color.
- Optional: `"sites": ["boredbandit.nedwebservices.com"]` shows an ad only on those sites; `"hideOn": [...]` hides it on those sites.

## Click tracking

Every ad click is recorded in Ned Traffic under the "Ned Ads" site as a visit to `/click/<ad-name>?from=<site>`. The page that was clicked from is the referrer. Set the site ID in `TRACK_SITE` at the top of `widget.js`.

## Advertiser requests

`advertise.html` is the shared "Advertise with us" form. Requests post to `https://www.ned4short.com/forms/advertise.php` (a PHP script on the ned4short.com GoDaddy hosting), which emails nedu@nedairfilters.com with the subject "Ned Ads Advertiser Request", attaches the banner, keeps a copy in `ned4short.com/forms/uploads/`, and returns to `advertise.html?sent=1` (or `?error=…`).

## Hosting

GitHub Pages from `main` of `ned4short/ned-ads`, custom domain `ads.nedwebservices.com` (`CNAME`). DNS: a CNAME record `ads` → `ned4short.github.io`.
