"""Writes PRODUCTS from products.py into the toronto-shop-products table.

Usage:
    python seed_products.py            # write all items
    python seed_products.py --dry-run  # print what would be written, no writes
"""

import argparse
import sys
import uuid
from decimal import Decimal

import boto3

from products import PRODUCTS

TABLE_NAME = "toronto-shop-products"
AWS_PROFILE = "capstone"
AWS_REGION = "ca-central-1"


def build_item(product):
    return {
        "productId": str(uuid.uuid4()),
        "name": product["name"],
        "description": product["description"],
        # boto3's DynamoDB resource rejects native float for the Number type.
        "price": Decimal(str(product["price"])),
        "category": product["category"],
        "gender": product["gender"],
        "imageUrl": f"https://picsum.photos/seed/{product['slug']}/600/600",
        "stock": product["stock"],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    items = [build_item(p) for p in PRODUCTS]

    if args.dry_run:
        for item in items:
            print(item)
        print(f"\n{len(items)} items (dry run, nothing written)")
        return

    session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
    table = session.resource("dynamodb").Table(TABLE_NAME)

    for item in items:
        table.put_item(Item=item)
        print(f"wrote {item['category']:9s} {item['gender']:5s} {item['name']}")

    print(f"\ndone: {len(items)} items written to {TABLE_NAME}")


if __name__ == "__main__":
    sys.exit(main())
