from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/images/cat-room/sofa-rug-clean-room-v1.png'
CUSHION = [(595, 492), (941, 492), (941, 720), (590, 720)]
ART = [(750, 112), (906, 112), (906, 297), (750, 297)]
DECOR = [(0, 0), (360, 0), (360, 700), (0, 700)]

ITEMS = {
    **{f'cushion-{name}-plate-v1.png': (f'cushion-{name}-source-v1.png', CUSHION, 10) for name in (
        'olive-mosaic', 'botanical-heraldry', 'terracotta-ripple', 'indigo-arc', 'rust-terrace',
        'plum-pebble', 'cobalt-weave', 'sienna-tile', 'teal-geometry', 'teal-architecture',
    )},
    **{f'art-{name}-plate-v1.png': (f'art-{name}-source-v1.png', ART, 8) for name in (
        'moon-clouds', 'ginkgo', 'terracotta-arch', 'cat-portal', 'navy-flow',
        'sage-leaves', 'mist-boat', 'stretching-cat', 'cloud-window', 'dune-path',
    )},
    **{f'decor-{name}-plate-v1.png': (f'decor-{name}-source-v1.png', DECOR, 18) for name in (
        'cat-stair', 'oak-shelf', 'moon-crescent', 'cream-cat-tree', 'walnut-cat-tree',
        'tiered-cat-tree', 'space-capsule', 'parlor-palm', 'calathea', 'walnut-cabinet',
    )},
}


def plate(source_name, polygon, blur):
    base = Image.open(BASE).convert('RGBA')
    source = Image.open(ROOT / 'public/images/shop' / source_name).convert('RGBA').resize(base.size, Image.Resampling.LANCZOS)
    mask = Image.new('L', base.size)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(blur))
    source.putalpha(mask)
    return source


for output_name, (source_name, polygon, blur) in ITEMS.items():
    plate(source_name, polygon, blur).save(ROOT / 'public/images/shop' / output_name)
