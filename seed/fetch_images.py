"""Fetches one relevant Pexels photo per product and writes seed/image_cache.json
(slug -> imageUrl). Run this before seed_products.py, which reads the cache.

Requires PEXELS_API_KEY in seed/.env (get a free key at pexels.com/api).

Usage:
    python fetch_images.py
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from products import PRODUCTS

# Windows console defaults to cp1252, which can't print some photographer
# names (accented characters). Progress-log output only, doesn't affect the
# cache file itself.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
CACHE_PATH = os.path.join(os.path.dirname(__file__), "image_cache.json")

# Only used as a fallback when a product's own name returns zero Pexels
# results -- most names ("Suede Chelsea Boots", "Signet Ring") are specific
# enough on their own to search well.
CATEGORY_FALLBACK_QUERY = {
    "watches": "wristwatch",
    "tops": "shirt",
    "bottoms-outerwear": "jacket",
    "shoes": "sneakers",
    "bags": "handbag",
    "accessories": "leather wallet",
    "sunglasses-jewelry": "sunglasses",
}


def load_env(path):
    env = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def pexels_search(api_key, query, retries=3):
    url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode(
        {"query": query, "per_page": 6, "orientation": "square"}
    )
    # Pexels sits behind Cloudflare, which blocks urllib's default
    # "Python-urllib/3.x" User-Agent as bot traffic (HTTP 403, Cloudflare
    # error 1010) even with a valid API key. A browser-like UA is enough.
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": api_key,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
    )

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise


def photo_to_square_url(photo):
    # Pexels' src.* presets don't include a square crop; build one with the
    # same dynamic resize params the API's own portrait/landscape/tiny
    # variants use.
    base = photo["src"]["original"]
    return f"{base}?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600"


def resolve_image(api_key, product, used_ids):
    result = pexels_search(api_key, product["name"])
    photos = result.get("photos", [])

    if not photos:
        fallback_query = CATEGORY_FALLBACK_QUERY[product["category"]]
        result = pexels_search(api_key, fallback_query)
        photos = result.get("photos", [])

    if not photos:
        return None

    # Prefer a candidate this run hasn't already used elsewhere -- a few
    # photographers' shoe/bag shoots otherwise dominate several different
    # product-name searches and the same photo gets reused across products.
    # Falls back to the top match if every candidate is already taken.
    photo = next((p for p in photos if p["id"] not in used_ids), photos[0])
    used_ids.add(photo["id"])

    return {
        "imageUrl": photo_to_square_url(photo),
        "photographer": photo["photographer"],
    }


def main():
    if not os.path.exists(ENV_PATH):
        print(f"Missing {ENV_PATH} -- create it with PEXELS_API_KEY=... first", file=sys.stderr)
        return 1

    env = load_env(ENV_PATH)
    api_key = env.get("PEXELS_API_KEY")
    if not api_key:
        print("PEXELS_API_KEY not set in seed/.env", file=sys.stderr)
        return 1

    # Resumable: anything already cached from a prior (possibly interrupted)
    # run is kept and not re-fetched.
    cache = {}
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            cache = json.load(f)

    misses = []
    # Reconstruct which photo ids are already spoken for from the resumed
    # cache, so a resumed run still avoids reusing them.
    used_ids = {int(m.group(1)) for url in cache.values() if (m := re.search(r"/photos/(\d+)/", url))}

    def save_cache():
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)

    try:
        for i, product in enumerate(PRODUCTS, 1):
            if product["slug"] in cache:
                print(f"[{i}/{len(PRODUCTS)}] {product['slug']:45s} <- (cached)")
                continue

            try:
                resolved = resolve_image(api_key, product, used_ids)
            except urllib.error.HTTPError as e:
                print(f"[{i}/{len(PRODUCTS)}] ERROR {product['slug']}: HTTP {e.code}", file=sys.stderr)
                misses.append(product["slug"])
                continue

            if resolved is None:
                print(f"[{i}/{len(PRODUCTS)}] NO RESULTS {product['slug']} (\"{product['name']}\")")
                misses.append(product["slug"])
                continue

            cache[product["slug"]] = resolved["imageUrl"]
            print(f"[{i}/{len(PRODUCTS)}] {product['slug']:45s} <- photo by {resolved['photographer']}")

            # Monthly quota has plenty of headroom (25000/month), but Pexels
            # also enforces a short-window burst limit that 0.25s between
            # requests tripped after ~100 calls. This paces well under it.
            time.sleep(1.0)
    finally:
        save_cache()

    print(f"\ndone: {len(cache)} images resolved, {len(misses)} misses")
    if misses:
        print("misses:", misses)
    print(f"wrote {CACHE_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
