#!/usr/bin/env python3
"""Remove image references a GLB names but does not contain. Helper for fetch-model.sh.

Some NASA GLBs were exported from FBX and kept their authoring machine's texture paths:

    "images": [{"uri": "..\\Terra.fbm\\solarpanels.tga"}, ...]

Those files are not in the GLB and not on anyone's disk, so every glTF tool fails at load and the
model looks broken rather than fixable. Nothing is lost by dropping them here: this app replaces
every material with its own toon shader at runtime, so the textures would be discarded seconds
later anyway.

Rewrites the GLB in place. Prints what it removed, or says there was nothing to do.

    _strip_external_images.py model.glb
"""

from __future__ import annotations

import json
import struct
import sys

GLB_MAGIC = b"glTF"
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942


def read_glb(path: str) -> tuple[dict, bytes]:
    raw = open(path, "rb").read()
    if raw[:4] != GLB_MAGIC:
        raise SystemExit(f"{path} is not a GLB")
    doc, buf = None, b""
    off = 12
    while off < len(raw):
        length, kind = struct.unpack_from("<II", raw, off)
        body = raw[off + 8 : off + 8 + length]
        if kind == CHUNK_JSON:
            doc = json.loads(body.decode("utf-8"))
        elif kind == CHUNK_BIN:
            buf = body
        off += 8 + length + (-length % 4)
    if doc is None:
        raise SystemExit(f"{path} has no JSON chunk")
    return doc, buf


def write_glb(path: str, doc: dict, buf: bytes) -> None:
    js = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    js += b" " * (-len(js) % 4)
    chunks = [struct.pack("<II", len(js), CHUNK_JSON) + js]
    if buf:
        pad = buf + b"\0" * (-len(buf) % 4)
        chunks.append(struct.pack("<II", len(pad), CHUNK_BIN) + pad)
    body = b"".join(chunks)
    with open(path, "wb") as fh:
        fh.write(GLB_MAGIC + struct.pack("<II", 2, 12 + len(body)) + body)


def is_external(image: dict) -> bool:
    """An image is external if it names a uri that is not embedded data."""
    uri = image.get("uri")
    if uri is None:
        return False  # bufferView-backed: it is inside the file
    return not uri.startswith("data:")


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    path = argv[1]
    doc, buf = read_glb(path)

    images = doc.get("images") or []
    bad = {i for i, im in enumerate(images) if is_external(im)}
    if not bad:
        print("no external image references; nothing to strip")
        return 0

    for i in sorted(bad):
        print(f"  dropping image[{i}]: {images[i].get('uri')}")

    # Textures pointing at a dropped image go too, and then any material slot pointing at one of
    # those textures. Done in that order so nothing is left referring to an index that moved.
    textures = doc.get("textures") or []
    dead_tex = {i for i, t in enumerate(textures) if t.get("source") in bad}

    for mat in doc.get("materials") or []:
        pbr = mat.get("pbrMetallicRoughness") or {}
        for holder, key in [(pbr, "baseColorTexture"), (pbr, "metallicRoughnessTexture"),
                            (mat, "normalTexture"), (mat, "occlusionTexture"),
                            (mat, "emissiveTexture")]:
            ref = holder.get(key)
            if isinstance(ref, dict) and ref.get("index") in dead_tex:
                holder.pop(key, None)

    # Leaving the (now unreferenced) arrays out entirely is simpler and safer than renumbering.
    doc.pop("images", None)
    doc.pop("textures", None)
    doc.pop("samplers", None)

    write_glb(path, doc, buf)
    print(f"  stripped {len(bad)} image(s), {len(dead_tex)} texture(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
