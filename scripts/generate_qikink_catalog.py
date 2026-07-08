"""Regenerates apps/ecom-service/src/printondemand/data/qikink-apparel-catalog.ts
from sku_descriptions.xlsx (Qikink's SKU Descriptions export).

Curation rules:
- wearable garments only (keyword allowlist with word-boundary matching)
- AOP styles excluded (studio only supports front-decal designs today)
- accessories / home goods / pet items excluded

Run:  python scripts/generate_qikink_catalog.py
"""
import openpyxl
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / 'sku_descriptions.xlsx'
OUT = ROOT / 'apps/ecom-service/src/printondemand/data/qikink-apparel-catalog.ts'

GARMENT_KW = [
    't-shirt', 'tee', 'polo', 'hoodie', 'sweatshirt', 'tank', 'crop', 'raglan',
    'shirt', 'joggers', 'sweatpants', 'shorts', 'dress', 'skirt', 'jacket',
    'romper', 'rompers', 'kaftan', 'sweat',
]
EXCLUDE_KW = [
    'aop', 'dog', 'pet', 'cap', 'bag', 'mug', 'case', 'poster', 'sticker',
    'bandana', 'arm sleeves', 'balaclava', 'headband', 'scrunchies',
    'maternity', 'bottle',
]

COLOR_HEX = {
    'Baby Blue': '#A7C7E7', 'Baby Pink': '#F4C2C2', 'Beige': '#E8DCC5',
    'Black': '#1A1A1A', 'Black Charcoal Melange': '#33383D', 'Black White': '#2B2B2B',
    'Black melange': '#3A3A3C', 'Bottle Green': '#14532D', 'Brick Red': '#9C3B2E',
    'Brown Black': '#3E2B23', 'Charcoal Melange': '#4B5054', 'Coffee Brown': '#6F4E37',
    'Coffee Brown off white': '#8A6F55', 'Copper': '#B87333', 'Coral': '#FF7F6A',
    'Flag Green': '#04724D', 'Flamingo': '#FC8EAC', 'Golden Yellow': '#FFB81C',
    'Green Black': '#2F4538', 'Grey Melange': '#B5B8BC', 'Jade': '#00A86B',
    'Lavender': '#C5A3E0', 'Light Baby Pink': '#FADADD', 'Maroon': '#6E1F2E',
    'Maroon off white': '#8E4C5C', 'Mint': '#A8E6CF', 'Mushroom': '#BDB2A7',
    'Mustard Yellow': '#D9A521', 'Mustard yellow off white': '#DDB65A',
    'Navy Blue': '#1F2A44', 'Navy melange': '#3A4A6B', 'New Yellow': '#FFD84D',
    'Off White': '#FAF6EE', 'Olive Green': '#708238', 'Olive Green off white': '#8E9B62',
    'Orange': '#F97316', 'Orchid Blue': '#6A7BD9', 'Peach': '#FFCBA4',
    'Petrol Blue': '#2C5F6F', 'Pink': '#F472B6', 'Purple': '#6B3FA0',
    'Purple melange': '#8B6BAE', 'Red': '#D32F2F', 'Royal Blue': '#2A52BE',
    'SkyBlue': '#8EC5E8', 'Steel Grey': '#71797E', 'White': '#FFFFFF',
    'White Black': '#F5F5F5', 'White Lavender': '#EDE4F7', 'Yellow': '#FFD400',
}

GENDER_PREFIX = {'Male': "Men's", 'Female': "Women's", 'Boy': "Boys'", 'Girl': "Girls'", 'Kids': "Kids'", 'Unisex': ''}

SIZE_ORDER = ['0_12', '12_23', '24_35', '36_47', '1Yrs', '2Yrs', '3Yrs', '4Yrs', '5Yrs', '6Yrs', '7Yrs',
              '8Yrs', '9Yrs', '10Yrs', '11Yrs', '12Yrs', '13Yrs', '14Yrs',
              'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL']


def kw_match(text, kws):
    lc = text.lower()
    return any(re.search(r'(?<![a-z])' + re.escape(k) + r'(?![a-z])', lc) for k in kws)


def garment_type(cat):
    lc = cat.lower()
    for kw, gt in [
        ('t-shirt dress', 'dress'), ('polo', 'polo'), ('hoodie', 'hoodie'),
        ('sweatshirt', 'sweatshirt'), ('tank', 'tank'), ('crop', 'crop_top'),
        ('dress', 'dress'), ('skirt', 'skirt'), ('shorts', 'shorts'),
        ('joggers', 'joggers'), ('sweatpants', 'joggers'), ('jacket', 'jacket'),
        ('romper', 'romper'), ('kaftan', 'kaftan'), ('baby tee', 'tshirt'),
        ('t-shirt', 'tshirt'), ('tee', 'tshirt'), ('raglan', 'tshirt'),
        ('ringer', 'tshirt'), ('shirt', 'shirt'),
    ]:
        if kw in lc:
            return gt
    return 'other'


def slugify(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


wb = openpyxl.load_workbook(XLSX, read_only=True)
ws = wb['Sheet1']
rows = ws.iter_rows(values_only=True)
next(rows)
next(rows)

styles = {}
for r in rows:
    if not r or r[4] is None:
        continue
    gender, cat_raw, color, sku, price = r[1], str(r[2]), str(r[3]), str(r[4]), r[6]
    if kw_match(cat_raw, EXCLUDE_KW) or not kw_match(cat_raw, GARMENT_KW):
        continue
    cat = cat_raw.split('|')[0].strip()
    # "Female | Womens Tank Top" → avoid "Women's Womens Tank Top"
    cat = re.sub(r'^(Womens|Mens|Kids)\s+', '', cat)
    parts = sku.rsplit('-', 2)
    if len(parts) != 3:
        print(f'!! skipping malformed SKU {sku}')
        continue
    base, code, size = parts
    key = slugify(f'{gender}-{cat}')
    st = styles.setdefault(key, {
        'styleKey': key, 'gender': gender, 'name': cat,
        'displayName': f"{GENDER_PREFIX[gender]} {cat}".strip(),
        'garmentType': garment_type(cat_raw), 'printTypeId': 1,
        'baseSku': base, 'qikinkBasePriceRupees': 0,
        '_colors': {}, '_sizes': set(),
    })
    if st['baseSku'] != base:
        print(f"!! {key}: multiple base SKUs ({st['baseSku']} vs {base}) — keeping first")
        continue
    hexv = COLOR_HEX.get(color)
    if not hexv:
        print(f'!! no hex for color {color!r} — using #CCCCCC')
        hexv = '#CCCCCC'
    st['_colors'][color] = {'name': color, 'code': code, 'hex': hexv}
    st['_sizes'].add(size)
    st['qikinkBasePriceRupees'] = max(st['qikinkBasePriceRupees'], int(price))

catalog = []
for st in styles.values():
    st['colors'] = sorted(st.pop('_colors').values(), key=lambda c: c['name'])
    sizes = st.pop('_sizes')
    st['sizes'] = sorted(sizes, key=lambda s: (SIZE_ORDER.index(s) if s in SIZE_ORDER else 99, s))
    catalog.append(st)
catalog.sort(key=lambda s: (s['gender'], s['name']))

body = json.dumps(catalog, indent=2, ensure_ascii=False)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    '// AUTO-GENERATED by scripts/generate_qikink_catalog.py from sku_descriptions.xlsx — do not edit by hand.\n'
    '// Curated wearable, DTG-printable subset of the Qikink SKU catalog (AOP + non-garments excluded).\n'
    'import { QikinkStyle } from \'../pod-catalog.types\';\n\n'
    f'export const QIKINK_APPAREL_CATALOG: QikinkStyle[] = {body};\n',
    encoding='utf-8',
)
print(f'Wrote {len(catalog)} styles -> {OUT}')
