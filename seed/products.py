"""Sample product data for the toronto-shop-products table.

Data only -- no infrastructure changes. imageUrl uses picsum.photos keyed by
each product's slug so the same product always gets the same placeholder
image across reseeds.

RAW holds (name, description, price, stock) tuples grouped by
(category, gender). PRODUCTS (built at the bottom) flattens that into the
list the seed script actually writes, deriving a unique slug per item from
its gender + name.
"""

import re

CATEGORIES = {
    "watches": "Watches",
    "tops": "Tops",
    "bottoms-outerwear": "Bottoms & Outerwear",
    "shoes": "Shoes",
    "bags": "Bags",
    "accessories": "Accessories",
    "sunglasses-jewelry": "Sunglasses & Jewelry",
}

RAW = {
    ("watches", "men"): [
        ("Classic Chronograph Watch", "Stainless steel chronograph with a sunburst dial and tachymeter bezel.", 249.99, 18),
        ("Minimalist Steel Watch", "Slim-profile watch with a brushed steel case and mesh band.", 129.99, 25),
        ("Diver's Automatic Watch", "200m water-resistant automatic diver with a unidirectional bezel.", 349.99, 12),
        ("Leather Strap Dress Watch", "Classic dress watch with a genuine leather strap and Roman numerals.", 179.99, 20),
        ("Titanium Sport Watch", "Lightweight titanium case built for everyday durability.", 219.99, 16),
        ("Skeleton Automatic Watch", "Open-dial automatic movement visible through a skeletonized face.", 299.99, 10),
        ("Canvas Strap Field Watch", "Rugged field watch with a canvas strap and luminous hands.", 139.99, 28),
        ("GMT Pilot Watch", "Dual-timezone pilot watch with a rotating 24-hour bezel.", 259.99, 14),
        ("Rugged Digital Watch", "Shock-resistant digital watch with backlight and stopwatch.", 89.99, 35),
        ("Rose Gold Tone Watch", "Understated rose gold-tone case with a matching link bracelet.", 189.99, 19),
    ],
    ("watches", "women"): [
        ("Rose Gold Bangle Watch", "Elegant bangle-style watch in a rose gold finish with a mother-of-pearl dial.", 199.99, 22),
        ("Mother of Pearl Watch", "Delicate watch featuring a genuine mother-of-pearl dial and crystal accents.", 229.99, 15),
        ("Minimalist Mesh Watch", "Understated watch with a fine mesh band and a matte silver case.", 149.99, 28),
        ("Vintage Leather Watch", "Retro-inspired watch with a suede leather strap and gold-tone case.", 169.99, 19),
        ("Crystal Bezel Watch", "Statement watch with a crystal-studded bezel and slim leather strap.", 249.99, 11),
        ("Two-Tone Bracelet Watch", "Silver and gold two-tone bracelet watch with a round dial.", 219.99, 17),
        ("Slim Gold-Tone Watch", "Ultra-thin gold-tone watch designed for everyday elegance.", 179.99, 21),
        ("Ceramic Link Watch", "Scratch-resistant ceramic link watch with a polished finish.", 259.99, 13),
        ("Pastel Silicone Watch", "Sporty silicone band watch in a soft pastel colorway.", 99.99, 33),
        ("Diamond Accent Watch", "Dial ringed with diamond accents on a stainless steel bracelet.", 349.99, 8),
    ],
    ("tops", "men"): [
        ("Slim Fit Oxford Shirt", "Breathable cotton oxford shirt tailored for a slim, modern fit.", 59.99, 40),
        ("Classic Crewneck T-Shirt", "Everyday cotton tee with a classic crewneck fit.", 24.99, 60),
        ("Flannel Button-Down Shirt", "Brushed flannel shirt in a classic plaid pattern.", 49.99, 34),
        ("Merino Wool Sweater", "Fine-gauge merino wool sweater with a crewneck collar.", 89.99, 22),
        ("Graphic Print Tee", "Soft cotton tee with a screen-printed graphic.", 29.99, 45),
        ("Linen Short Sleeve Shirt", "Lightweight linen shirt ideal for warm weather.", 54.99, 27),
        ("Quarter-Zip Pullover", "Brushed fleece pullover with a quarter-zip collar.", 64.99, 30),
        ("Henley Long Sleeve Shirt", "Cotton henley with a three-button placket.", 39.99, 38),
        ("Striped Polo Shirt", "Pique cotton polo with a classic stripe pattern.", 44.99, 32),
        ("Fleece Crewneck Sweatshirt", "Heavyweight fleece sweatshirt with a ribbed hem.", 49.99, 36),
    ],
    ("tops", "women"): [
        ("Silk Blouse", "Fluid silk blouse with a relaxed, draped silhouette.", 74.99, 24),
        ("Ribbed Knit Tank Top", "Stretch ribbed tank top for everyday layering.", 29.99, 50),
        ("Cropped Cardigan", "Lightweight knit cardigan cropped at the waist.", 54.99, 28),
        ("Floral Print Blouse", "Airy blouse in an allover floral print.", 49.99, 31),
        ("Cashmere Blend Sweater", "Soft cashmere blend sweater with a relaxed, cozy fit.", 129.99, 20),
        ("Off-Shoulder Top", "Fitted off-shoulder top with elastic neckline.", 39.99, 29),
        ("Button-Front Denim Shirt", "Classic denim shirt with a button-front closure.", 59.99, 26),
        ("Turtleneck Sweater", "Fine-knit turtleneck sweater for layering.", 69.99, 23),
        ("Puff Sleeve Blouse", "Statement blouse with voluminous puff sleeves.", 44.99, 27),
        ("Basic V-Neck Tee", "Soft pima cotton tee with a flattering V-neck.", 22.99, 55),
    ],
    ("bottoms-outerwear", "men"): [
        ("Tailored Chino Pants", "Versatile chino pants with a tapered leg and stretch cotton fabric.", 69.99, 35),
        ("Slim Fit Denim Jeans", "Stretch denim jeans with a modern slim fit.", 79.99, 42),
        ("Wool Blend Overcoat", "Tailored overcoat in a warm wool blend, perfect for layering.", 219.99, 14),
        ("Classic Denim Jacket", "Rugged denim jacket with a timeless trucker silhouette.", 89.99, 30),
        ("Cargo Shorts", "Cotton twill cargo shorts with multiple pockets.", 44.99, 38),
        ("Puffer Jacket", "Insulated puffer jacket built for cold weather.", 159.99, 18),
        ("Tailored Wool Trousers", "Suit-weight wool trousers with a tapered leg.", 99.99, 20),
        ("Bomber Jacket", "Classic bomber jacket with ribbed cuffs and hem.", 129.99, 22),
        ("Jogger Sweatpants", "Relaxed fleece joggers with an elastic waistband.", 49.99, 40),
        ("Rain Shell Jacket", "Waterproof shell jacket with a packable hood.", 119.99, 25),
    ],
    ("bottoms-outerwear", "women"): [
        ("High-Waist Wide Leg Trousers", "Flowy wide-leg trousers with a flattering high-waisted cut.", 74.99, 26),
        ("Skinny Fit Jeans", "Stretch denim jeans in a classic skinny fit.", 69.99, 44),
        ("Trench Coat", "Classic double-breasted trench coat with a belted waist.", 189.99, 16),
        ("Faux Leather Leggings", "Stretch faux leather leggings with a high-rise waist.", 54.99, 33),
        ("Wool Blend Peacoat", "Structured peacoat in a warm wool blend.", 199.99, 13),
        ("Pleated Midi Skirt", "Flowing pleated skirt that falls to mid-calf.", 59.99, 27),
        ("Quilted Puffer Vest", "Lightweight quilted vest for layering in cool weather.", 89.99, 24),
        ("Cropped Wide-Leg Pants", "Cropped trousers with a relaxed wide-leg fit.", 64.99, 29),
        ("Denim Jacket", "Classic cropped denim jacket with button closure.", 84.99, 31),
        ("Belted Wrap Coat", "Wool-blend wrap coat cinched with a self-tie belt.", 179.99, 15),
    ],
    ("shoes", "men"): [
        ("Leather Oxford Shoes", "Polished leather oxfords with a classic cap-toe design.", 149.99, 24),
        ("Classic Running Sneakers", "Lightweight running sneakers with breathable mesh uppers.", 99.99, 45),
        ("Suede Chelsea Boots", "Sleek suede Chelsea boots with elastic side panels.", 159.99, 21),
        ("Canvas Low-Top Sneakers", "Casual canvas sneakers with a durable rubber sole.", 64.99, 38),
        ("Leather Derby Shoes", "Versatile leather derbies with an open lacing system.", 139.99, 23),
        ("Hiking Boots", "Rugged waterproof boots built for the trail.", 129.99, 27),
        ("Loafers", "Slip-on leather loafers with a cushioned footbed.", 109.99, 26),
        ("High-Top Basketball Sneakers", "Cushioned high-top sneakers with ankle support.", 94.99, 33),
        ("Boat Shoes", "Classic leather boat shoes with non-marking soles.", 79.99, 30),
        ("Suede Desert Boots", "Crepe-sole desert boots in soft suede.", 119.99, 25),
    ],
    ("shoes", "women"): [
        ("Pointed Toe Heels", "Sleek pointed-toe heels with a comfortable mid-height heel.", 119.99, 27),
        ("Classic White Sneakers", "Everyday white leather sneakers with a minimalist silhouette.", 89.99, 42),
        ("Suede Ankle Boots", "Chic suede ankle boots with a stacked block heel.", 139.99, 23),
        ("Strappy Sandals", "Delicate strappy sandals with an adjustable ankle buckle.", 54.99, 30),
        ("Espadrille Wedges", "Canvas espadrille wedges with a woven jute sole.", 69.99, 28),
        ("Knee-High Boots", "Sleek knee-high boots in smooth leather.", 179.99, 16),
        ("Ballet Flats", "Classic leather ballet flats with a cushioned insole.", 59.99, 36),
        ("Platform Sneakers", "Chunky platform sneakers with a retro silhouette.", 94.99, 29),
        ("Block Heel Mules", "Backless mules on a comfortable block heel.", 84.99, 25),
        ("Slide Sandals", "Cushioned slide sandals for everyday wear.", 44.99, 40),
    ],
    ("bags", "men"): [
        ("Leather Messenger Bag", "Full-grain leather messenger bag with a padded laptop sleeve.", 179.99, 15),
        ("Canvas Backpack", "Durable canvas backpack with leather trim details.", 89.99, 24),
        ("Weekend Duffel Bag", "Spacious duffel bag built for short trips.", 129.99, 18),
        ("Slim Leather Briefcase", "Structured leather briefcase with a slim profile.", 219.99, 10),
        ("Nylon Crossbody Bag", "Lightweight nylon crossbody bag with multiple compartments.", 49.99, 32),
        ("Laptop Backpack", "Padded backpack with a dedicated 15-inch laptop sleeve.", 99.99, 26),
        ("Leather Belt Bag", "Compact leather belt bag for hands-free essentials.", 59.99, 29),
        ("Travel Tote Bag", "Roomy canvas tote built for travel days.", 109.99, 20),
        ("Canvas Tool Roll Bag", "Rugged canvas roll bag with multiple tool pockets.", 44.99, 22),
        ("Leather Card Holder Bag", "Slim leather pouch for cards and small essentials.", 39.99, 34),
    ],
    ("bags", "women"): [
        ("Structured Leather Handbag", "Polished leather handbag with a structured silhouette.", 199.99, 14),
        ("Quilted Crossbody Bag", "Quilted crossbody bag with a chain strap.", 89.99, 27),
        ("Woven Straw Tote", "Handwoven straw tote perfect for summer days.", 64.99, 25),
        ("Mini Leather Backpack", "Compact leather backpack with adjustable straps.", 119.99, 19),
        ("Chain Strap Shoulder Bag", "Structured shoulder bag with a metallic chain strap.", 149.99, 16),
        ("Canvas Beach Tote", "Oversized canvas tote with an interior zip pocket.", 39.99, 35),
        ("Leather Clutch", "Sleek leather clutch with a magnetic snap closure.", 79.99, 23),
        ("Bucket Bag", "Slouchy bucket bag with a drawstring closure.", 109.99, 21),
        ("Quilted Belt Bag", "Compact quilted belt bag with adjustable strap.", 49.99, 31),
        ("Structured Satchel", "Top-handle satchel with a detachable shoulder strap.", 229.99, 11),
    ],
    ("accessories", "men"): [
        ("Leather Belt", "Full-grain leather belt with a brushed metal buckle.", 39.99, 45),
        ("Bifold Leather Wallet", "Slim bifold wallet in genuine leather.", 44.99, 40),
        ("Silk Tie", "Woven silk tie in a classic solid weave.", 34.99, 30),
        ("Wool Beanie", "Ribbed wool beanie for cold-weather wear.", 24.99, 50),
        ("Leather Gloves", "Lined leather gloves built for warmth.", 49.99, 26),
        ("Canvas Baseball Cap", "Adjustable canvas cap with an embroidered logo.", 22.99, 55),
        ("Cufflink Set", "Polished metal cufflink set in a gift box.", 29.99, 28),
        ("Cotton Pocket Square", "Printed cotton pocket square for suiting.", 21.99, 34),
        ("Woven Leather Belt", "Braided leather belt with a matte buckle.", 54.99, 27),
        ("Card Holder Wallet", "Minimalist leather card holder wallet.", 34.99, 38),
    ],
    ("accessories", "women"): [
        ("Leather Belt", "Slim leather belt with a polished gold-tone buckle.", 39.99, 42),
        ("Silk Scarf", "Printed silk scarf finished with hand-rolled edges.", 44.99, 33),
        ("Cashmere Gloves", "Soft cashmere gloves for cold-weather styling.", 54.99, 24),
        ("Wide Brim Hat", "Structured wide brim hat for sun protection.", 39.99, 28),
        ("Leather Card Wallet", "Compact leather wallet sized for cards and cash.", 34.99, 37),
        ("Knit Beanie", "Chunky knit beanie with a folded cuff.", 24.99, 48),
        ("Beaded Hair Clip Set", "Set of beaded hair clips in assorted colors.", 22.99, 40),
        ("Woven Belt", "Woven fabric belt with an adjustable buckle.", 29.99, 35),
        ("Leather Coin Purse", "Compact leather coin purse with a zip closure.", 24.99, 39),
        ("Printed Silk Headband", "Silk headband in a rotating seasonal print.", 21.99, 44),
    ],
    ("sunglasses-jewelry", "men"): [
        ("Classic Aviator Sunglasses", "Timeless aviator sunglasses with polarized lenses.", 89.99, 30),
        ("Polarized Wayfarer Sunglasses", "Wayfarer-style sunglasses with polarized UV protection.", 79.99, 32),
        ("Stainless Steel Chain Bracelet", "Bold stainless steel chain-link bracelet.", 49.99, 26),
        ("Leather Cord Bracelet", "Minimalist leather cord bracelet with a metal clasp.", 29.99, 40),
        ("Sport Wrap Sunglasses", "Wraparound sunglasses designed for active wear.", 64.99, 28),
        ("Signet Ring", "Classic signet ring in a brushed metal finish.", 59.99, 22),
        ("Tortoiseshell Sunglasses", "Acetate sunglasses in a tortoiseshell pattern.", 94.99, 24),
        ("Beaded Bracelet Set", "Set of stackable beaded bracelets.", 34.99, 36),
        ("Titanium Chain Necklace", "Lightweight titanium chain necklace.", 69.99, 20),
        ("Mirrored Lens Sunglasses", "Sport-inspired sunglasses with mirrored lenses.", 74.99, 27),
    ],
    ("sunglasses-jewelry", "women"): [
        ("Oversized Cat-Eye Sunglasses", "Statement cat-eye sunglasses with an oversized frame.", 94.99, 25),
        ("Round Metal Frame Sunglasses", "Vintage-inspired round sunglasses in a metal frame.", 84.99, 29),
        ("Gold-Tone Layered Necklace", "Layered necklace set in a warm gold tone.", 49.99, 33),
        ("Pearl Stud Earrings", "Classic freshwater pearl stud earrings.", 39.99, 41),
        ("Delicate Chain Bracelet", "Fine chain bracelet with a lobster clasp.", 44.99, 31),
        ("Gradient Lens Sunglasses", "Sunglasses with a soft gradient lens tint.", 79.99, 28),
        ("Hoop Earring Set", "Set of three stacking hoop earrings.", 34.99, 37),
        ("Cubic Zirconia Pendant Necklace", "Pendant necklace set with a cubic zirconia stone.", 59.99, 23),
        ("Cat-Eye Sunglasses with Case", "Cat-eye sunglasses that come with a hard case.", 99.99, 20),
        ("Stacking Ring Set", "Set of three thin stacking rings.", 29.99, 38),
    ],
}


def _slugify(gender, name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{'mens' if gender == 'men' else 'womens'}-{slug}"


def _build_products():
    products = []
    for (category, gender), items in RAW.items():
        for name, description, price, stock in items:
            products.append({
                "slug": _slugify(gender, name),
                "name": name,
                "description": description,
                "price": price,
                "category": category,
                "gender": gender,
                "stock": stock,
            })
    return products


PRODUCTS = _build_products()
