#!/usr/bin/env python3
"""Cut the frames of tests/probes/track1.js to their own app and lay them out as contact sheets.

  python track1_sheet.py <shot-dir> <frames> <out-dir> [--cols=3] [--rows=4] [--thumb=300]

Every `f<i>-<name>.png` in <shot-dir> is a screenshot of the whole page (<frames> apps side by
side); the app in frame i is the i-th slice of its width. Writes <out-dir>/<name>.jpg (each frame, at
most 1440 px wide) and <out-dir>/sheet-<n>.jpg (thumbnails with their names, in name order).
Needs Pillow.
"""
import os, re, sys
from PIL import Image, ImageDraw

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opt = dict(a[2:].split('=') for a in sys.argv[1:] if a.startswith('--'))
    src, frames, out = args[0], int(args[1]), args[2]
    cols, rows, tw = int(opt.get('cols', 3)), int(opt.get('rows', 4)), int(opt.get('thumb', 300))
    os.makedirs(out, exist_ok=True)
    names = []
    for f in sorted(os.listdir(src)):
        m = re.match(r'f(\d+)-(.+)\.png$', f)
        if not m:
            continue
        i, name = int(m.group(1)), m.group(2)
        im = Image.open(os.path.join(src, f)).convert('RGB')
        w = im.width // frames
        im = im.crop((i * w, 0, (i + 1) * w, im.height))
        if im.width > 1440:
            im = im.resize((1440, round(im.height * 1440 / im.width)), Image.LANCZOS)
        im.save(os.path.join(out, name + '.jpg'), quality=86)
        names.append(name)
    names.sort()
    per = cols * rows
    for s in range(0, len(names), per):
        chunk = names[s:s + per]
        first = Image.open(os.path.join(out, chunk[0] + '.jpg'))
        th = round(tw * first.height / first.width)
        sheet = Image.new('RGB', (cols * tw, rows * (th + 14)), (8, 10, 14))
        d = ImageDraw.Draw(sheet)
        for k, name in enumerate(chunk):
            im = Image.open(os.path.join(out, name + '.jpg')).resize((tw, th), Image.LANCZOS)
            x, y = (k % cols) * tw, (k // cols) * (th + 14)
            sheet.paste(im, (x, y + 14))
            d.text((x + 3, y + 1), name[:48], fill=(200, 210, 225))
        sheet.save(os.path.join(out, 'sheet-%02d.jpg' % (s // per + 1)), quality=82)
    print(len(names), 'frames,', (len(names) + per - 1) // per, 'sheets in', out)

if __name__ == '__main__':
    main()
