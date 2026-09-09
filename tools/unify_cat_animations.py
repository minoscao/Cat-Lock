"""Rebuild active clips from originals, calibrated to the approved head-pet v3.

Run without --render for sample plates and measurements; --render writes new
versioned videos. Originals and the approved reference are never overwritten.
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
FF = str(Path.home() / 'AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe')
OLD = ROOT / 'public/videos/cat/scene-figure-layout-controls'
OUT = ROOT / 'public/videos/cat/unified-head-v3'
QA = ROOT / 'artifacts/cat-animation-v3'
RAW = ROOT / '视频文件/assets'
SOURCES = {
    'sit-idle-loop': 'b-awake/sit_idle_loop.mp4',
    'sit-blink': 'b-awake/sit-blink-sit.mp4',
    'sit-closer': 'b-awake/sit-closer-sit.mp4',
    'sit-tail': 'b-awake/sit-tail-sit.mp4',
    'sleep-enter': 'c-sleep/sleep_enter.mp4',
    'prone-sleep': 'c-sleep/趴着睡.mp4',
    'stretch-wake': 'c-sleep/伸懒腰起来_加长版.mp4',
    'sleep-to-belly': 'c-sleep/sleep-to-belly.mp4',
    'belly-loop': 'c-sleep/belly-loop.mp4',
    'belly-wake': 'c-sleep/belly-wake-sit.mp4',
    'paw-scratch-composited': '互动/坐-挠叫-坐.mp4',
    'body-scratch-composited': '互动/挠一下.mp4',
    'mouse-look-composited': '互动/mouse-look.mp4',
}
REFERENCE = RAW / '互动/摸头.mp4'
SIZE = (942, 1672)


def probe(path):
    return json.loads(subprocess.check_output([
        FF.replace('ffmpeg.exe', 'ffprobe.exe'), '-v', 'error',
        '-show_streams', '-of', 'json', str(path)]))['streams']


def frame(path, time):
    data = subprocess.check_output([
        FF, '-v', 'error', '-ss', str(time), '-i', str(path), '-frames:v', '1',
        '-vf', 'crop=ih:ih,scale=960:960', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    return np.frombuffer(data, np.uint8).reshape(960, 960, 3).astype(np.float32)


def key(rgb):
    # Exact approved v3 despill and soft matte; no erosion or hard silhouette cut.
    rgb = rgb.copy()
    r, g, b = [rgb[:, :, i].copy() for i in range(3)]
    excess = g - np.maximum(r, b)
    alpha = 1 - np.clip((excess - 3) / np.maximum(g * .55, 1), 0, 1)
    rgb[:, :, 1] = np.minimum(g, np.maximum(r, b) + 2)
    residual = np.clip(rgb[:, :, 1] - (r + b) * .5, 0, 10)
    rgb[:, :, 1] -= residual * .65
    rgb *= np.array([1.008, .965, 1.025], np.float32)
    return rgb, alpha


def white_point(samples):
    whites = []
    for sample in samples:
        rgb, alpha = key(sample)
        mask = (alpha > .99) & (rgb.min(2) > 145) & (np.ptp(rgb, axis=2) < 55)
        whites.append(rgb[mask])
    return np.percentile(np.concatenate(whites), 75, axis=0)


def background():
    bg = Image.open(ROOT / 'public/images/cat-room/sofa-rug-focus-figure-layout-controls-v1.png')
    bg = np.asarray(bg.convert('RGB').resize(SIZE, Image.Resampling.LANCZOS), dtype=np.float32)
    shadow = Image.new('L', SIZE)
    ImageDraw.Draw(shadow).ellipse((300, 1368, 714, 1423), fill=65)
    alpha = np.asarray(shadow.filter(ImageFilter.GaussianBlur(13)), dtype=np.float32) / 255
    return bg * (1 - alpha[:, :, None])


def composite(rgb, gain, bg):
    rgb, alpha = key(rgb)
    rgba = np.dstack((np.clip(rgb * gain, 0, 255), alpha * 255)).astype(np.uint8)
    # Every source uses one square transform, preserving anatomy and the floor anchor.
    cat = np.asarray(Image.fromarray(rgba).resize((849, 849), Image.Resampling.LANCZOS), dtype=np.float32)
    a = cat[:, :, 3:4] / 255
    result = bg.copy()
    result[617:1466, 45:894] = cat[:, :, :3] * a + result[617:1466, 45:894] * (1 - a)
    return np.clip(result, 0, 255).astype(np.uint8)


def render(name, source, duration, gain, bg):
    size = next(s for s in probe(source) if s['codec_type'] == 'video')['height']
    decoder = subprocess.Popen([
        FF, '-v', 'error', '-i', str(source), '-vf', 'crop=ih:ih,fps=25',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    encoder = subprocess.Popen([
        FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', '942x1672', '-r', '25', '-i', '-', '-i', str(OLD / f'{name}.mp4'),
        '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'fast',
        '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-t', str(duration),
        '-movflags', '+faststart', str(OUT / f'{name}.mp4')], stdin=subprocess.PIPE)
    count = 0
    try:
        while True:
            data = decoder.stdout.read(size * size * 3)
            if not data:
                break
            if len(data) != size * size * 3:
                raise RuntimeError(f'Incomplete frame: {name}')
            rgb = np.frombuffer(data, np.uint8).reshape(size, size, 3).astype(np.float32)
            encoder.stdin.write(composite(rgb, gain, bg).tobytes())
            count += 1
    finally:
        decoder.stdout.close()
        encoder.stdin.close()
        decode_status = decoder.wait()
        encode_status = encoder.wait()
    if decode_status or encode_status:
        raise RuntimeError(f'Conversion failed: {name}')
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    QA.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    target = white_point([frame(REFERENCE, t) for t in (0.2, 1, 7.6)])
    bg = background()
    report = {'reference': 'head-pet-edge-trial-v3.mp4', 'white_point': target.tolist(), 'clips': {}}
    sheet = Image.new('RGB', (1200, 4 * 380), 'white')
    draw = ImageDraw.Draw(sheet)
    reference = Image.fromarray(composite(frame(REFERENCE, .2), np.ones(3), bg))
    reference.crop((160, 720, 800, 1460)).resize((300, 347)).save(QA / 'reference.png')
    for i, (name, relative) in enumerate(SOURCES.items()):
        source = RAW / relative
        duration = float(next(s for s in probe(OLD / f'{name}.mp4') if s['codec_type'] == 'video')['duration'])
        samples = [frame(source, t) for t in (.2, min(1, duration/2), max(.2, duration-.3))]
        point = white_point(samples)
        # One constant correction per clip: never change exposure frame by frame.
        gain = np.clip(target / point, .90, 1.10)
        sample = Image.fromarray(composite(samples[0], gain, bg))
        sample.save(QA / f'{name}.png')
        crop = sample.crop((160, 720, 800, 1460)).resize((300, 347))
        x, y = (i % 4) * 300, (i // 4) * 380
        sheet.paste(crop, (x, y))
        draw.text((x + 4, y + 350), name, fill='black')
        entry = {'source': relative, 'gain': gain.tolist(), 'white_before': point.tolist(), 'white_after': (point*gain).tolist(), 'duration': duration}
        print(name, 'gain', gain.round(4), flush=True)
        if args.render:
            entry['frames'] = render(name, source, duration, gain, bg)
            print(name, 'finished', entry['frames'], flush=True)
        report['clips'][name] = entry
    sheet.save(QA / 'all-clips.jpg')
    if args.render:
        subprocess.run([FF, '-v', 'error', '-y', '-i', str(OUT / 'sleep-to-belly.mp4'),
            '-vf', 'reverse', '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast',
            '-movflags', '+faststart', str(OUT / 'belly-to-sleep.mp4')], check=True)
        subprocess.run([FF, '-v', 'error', '-y', '-i', str(OUT / 'sit-idle-loop.mp4'),
            '-frames:v', '1', str(OUT / 'idle-poster.png')], check=True)
    (QA / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=True))


if __name__ == '__main__':
    main()
