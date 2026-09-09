"""Separate the approved cat processing from its baked-in room background."""
import json
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from unify_cat_animations import ROOT, RAW, SOURCES, REFERENCE, FF, probe, key

OUT = ROOT / 'public/videos/cat/transparent-v3'
OUT.mkdir(parents=True, exist_ok=True)
report = json.loads((ROOT / 'artifacts/cat-animation-v3/report.json').read_text())
shadow = Image.new('RGBA', (942, 1672))
mask = Image.new('L', shadow.size)
ImageDraw.Draw(mask).ellipse((300, 1368, 714, 1423), fill=65)
shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(13)))

for name, relative in {**SOURCES, 'head-pet': str(REFERENCE.relative_to(RAW))}.items():
    source = RAW / relative
    gain = np.array(report['clips'][name]['gain'] if name != 'head-pet' else [1, 1, 1])
    size = next(s for s in probe(source) if s['codec_type'] == 'video')['height']
    decoder = subprocess.Popen([FF, '-v', 'error', '-i', str(source), '-vf', 'crop=ih:ih,fps=25', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    # Original audio is retained only for the interaction that uses embedded audio.
    audio = ROOT / 'public/videos/cat/unified-head-v3/body-scratch-composited.mp4'
    encoder = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '942x1672', '-r', '25', '-i', '-', '-i', str(audio), '-map', '0:v', *(['-map', '1:a?', '-c:a', 'libopus'] if name == 'body-scratch-composited' else ['-an']), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '18', '-deadline', 'realtime', '-cpu-used', '6', '-row-mt', '1', '-auto-alt-ref', '0', '-shortest', str(OUT / f'{name}.webm')], stdin=subprocess.PIPE)
    count = 0
    while True:
        data = decoder.stdout.read(size * size * 3)
        if not data:
            break
        rgb, alpha = key(np.frombuffer(data, np.uint8).reshape(size, size, 3).astype(np.float32))
        rgba = np.dstack((np.clip(rgb * gain, 0, 255), alpha * 255)).astype(np.uint8)
        cat = Image.fromarray(rgba).resize((849, 849), Image.Resampling.LANCZOS)
        result = shadow.copy()
        result.alpha_composite(cat, (45, 617))
        encoder.stdin.write(result.tobytes())
        if count == 0 and name == 'sit-idle-loop':
            result.save(OUT / 'idle-poster.png')
        count += 1
    decoder.stdout.close()
    encoder.stdin.close()
    if decoder.wait() or encoder.wait():
        raise RuntimeError(name)
    print(name, count, flush=True)
subprocess.run([FF, '-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', str(OUT / 'sleep-to-belly.webm'), '-vf', 'reverse', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '18', '-deadline', 'realtime', '-cpu-used', '6', '-auto-alt-ref', '0', str(OUT / 'belly-to-sleep.webm')], check=True)
