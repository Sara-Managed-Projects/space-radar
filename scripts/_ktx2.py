"""KTX2 encoding plan for the maps (spec 0056 task 2, internal #156): what `ktx create` is asked, and what the GPU holds.

Pure (no PIL, no subprocess at import) so tests/test_ktx2_plan.py runs it with a fake `ktx`. The encoder
is KTX-Software, pinned in .github/workflows/textures.yml; the flags are the ones that workflow's probe
ran on 2026-10-08 and found byte-identical twice and `ktx validate` clean:
  etc1s  colour maps:       --encode basis-lz --qlevel 128 --generate-mipmap          (Earth day 2k: 171 046 B)
  uastc  normals, lights:   --encode uastc --uastc-quality 2 --zstd 18 --generate-mipmap (1 137 091 B)
"""
from __future__ import annotations

import subprocess
from pathlib import Path

# The maps whose 4k files the first KTX2 build covers (the spec's list: the Earth, Moon, Mars, Mercury),
# as (output stem, input file under site/textures, kind, format). The input is the shipped 4k WebP: the
# originals are never committed, and ETC1S is lossy over a lossy file, which the PR that commits the
# first artefact must look at before it ships (#155 draws one in a browser).
PLAN = [
    ("earth_day_01", "4k/earth_day_01.webp", "etc1s", "R8G8B8_SRGB"),
    ("earth_night", "4k/earth_night.webp", "uastc", "R8G8B8_SRGB"),
    ("moon", "4k/moon.webp", "etc1s", "R8G8B8_SRGB"),
    ("mars", "4k/mars.webp", "etc1s", "R8G8B8_SRGB"),
    ("mercury", "4k/mercury.webp", "etc1s", "R8G8B8_SRGB"),
]

KINDS = {
    "etc1s": ["--encode", "basis-lz", "--qlevel", "128"],
    "uastc": ["--encode", "uastc", "--uastc-quality", "2", "--zstd", "18"],
}


def ktx_command(png: Path, out: Path, kind: str, fmt: str = "R8G8B8_SRGB") -> list[str]:
    """The argument list for `ktx create`. A kind that is not etc1s or uastc is an error, not a default."""
    if kind not in KINDS:
        raise ValueError(f"unknown KTX2 kind {kind!r}; one of {sorted(KINDS)}")
    return ["ktx", "create", "--format", fmt, "--assign-tf", "srgb", *KINDS[kind], "--generate-mipmap", str(png), str(out)]


def gpu_bytes(width: int, height: int, mips: bool = True) -> int:
    """What the GPU holds once a transcoded map is uploaded, with the whole mip chain: BC7 and ASTC 4x4
    both store a 4 x 4 block in 16 bytes (1 byte a pixel); ETC2 RGB would be half. The chain stops at 1 x 1."""
    total, w, h = 0, width, height
    while True:
        total += ((w + 3) // 4) * ((h + 3) // 4) * 16
        if not mips or (w == 1 and h == 1):
            return total
        w, h = max(1, w // 2), max(1, h // 2)


def encode_all(textures: Path, out_dir: Path, to_png, run=subprocess.run, plan=PLAN) -> list[dict]:
    """Encode every plan row into `out_dir`, validate it, and return a row each: stem, kind, bytes, gpu_bytes.
    `to_png(src, dst)` turns the WebP into the PNG the encoder reads (PIL in the real run, a copy in the test)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for stem, rel, kind, fmt in plan:
        src, png, ktx2 = textures / rel, out_dir / f"{stem}.png", out_dir / f"{stem}.ktx2"
        to_png(src, png)
        run(ktx_command(png, ktx2, kind, fmt), check=True)
        run(["ktx", "validate", str(ktx2)], check=True)
        rows.append({"stem": stem, "kind": kind, "bytes": ktx2.stat().st_size, "sha256": _sha(ktx2)})
        png.unlink()
    return rows


def _sha(path: Path) -> str:
    import hashlib
    return hashlib.sha256(path.read_bytes()).hexdigest()
