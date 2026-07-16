"""Writes PRODUCTS from products.py into the toronto-shop-products table.

Usage:
    python seed_products.py            # wipe existing items, write all fresh
    python seed_products.py --dry-run  # print what would be written, no writes
"""

import argparse
import json
import os
import sys
import uuid
from decimal import Decimal

import boto3

from products import PRODUCTS

TABLE_NAME = "toronto-shop-products"
AWS_PROFILE = "capstone"
AWS_REGION = "ca-central-1"
IMAGE_CACHE_PATH = os.path.join(os.path.dirname(__file__), "image_cache.json")


def load_image_cache():
    if not os.path.exists(IMAGE_CACHE_PATH):
        raise SystemExit(
            f"Missing {IMAGE_CACHE_PATH} -- run `python fetch_images.py` first "
            "to resolve a Pexels photo per product."
        )
    with open(IMAGE_CACHE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def build_item(product, image_cache):
    if product["slug"] not in image_cache:
        raise SystemExit(
            f"No cached image for '{product['slug']}' -- run `python fetch_images.py` "
            "again to fill in the gap before seeding."
        )

    return {
        "productId": str(uuid.uuid4()),
        "name": product["name"],
        "description": product["description"],
        # boto3's DynamoDB resource rejects native float for the Number type.
        "price": Decimal(str(product["price"])),
        "category": product["category"],
        "gender": product["gender"],
        "imageUrl": image_cache[product["slug"]],
        "stock": product["stock"],
    }


def wipe_table(table):
    items = []
    scan = table.scan(ProjectionExpression="productId")
    items.extend(scan.get("Items", []))
    while "LastEvaluatedKey" in scan:
        scan = table.scan(ProjectionExpression="productId", ExclusiveStartKey=scan["LastEvaluatedKey"])
        items.extend(scan.get("Items", []))

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={"productId": item["productId"]})

    return len(items)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    image_cache = load_image_cache()
    items = [build_item(p, image_cache) for p in PRODUCTS]

    if args.dry_run:
        for item in items:
            print(item)
        print(f"\n{len(items)} items (dry run, nothing written)")
        return

    session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
    table = session.resource("dynamodb").Table(TABLE_NAME)

    deleted = wipe_table(table)
    print(f"wiped {deleted} existing items")

    for item in items:
        table.put_item(Item=item)
        print(f"wrote {item['category']:9s} {item['gender']:5s} {item['name']}")

    print(f"\ndone: {len(items)} items written to {TABLE_NAME}")


if __name__ == "__main__":
    sys.exit(main())
