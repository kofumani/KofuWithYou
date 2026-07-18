#!/usr/bin/env python3
"""Build gallery metadata by locating old.png inside every thumbnail.

This script intentionally uses only Python's standard library and ImageMagick.
Run it again after adding files to thumnail/:

    python3 scripts/build_gallery_manifest.py
"""

from __future__ import annotations

import json
import hashlib
import math
import subprocess
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "thumnail"
REFERENCE = ROOT / "old.png"
OUTPUT = ROOT / "js" / "gallery-data.js"
PREVIEW_DIR = ROOT / "assets" / "gallery" / "previews"
SUPPORTED = {".png", ".jpg", ".jpeg", ".webp"}


@dataclass
class Component:
    area: int
    x0: int
    y0: int
    x1: int
    y1: int
    aspect: float
    density: float
    cx: float
    cy: float
    vx: float
    vy: float


def image_bytes(path: Path) -> tuple[int, int, bytes]:
    size = subprocess.check_output(
        ["magick", "identify", "-format", "%w %h", str(path)],
        text=True,
    )
    width, height = map(int, size.split())
    pixels = subprocess.check_output(["magick", str(path), "rgba:-"])
    return width, height, pixels


def is_reference_orange(red: int, green: int, blue: int, alpha: int) -> bool:
    return (
        alpha > 150
        and red > 190
        and 45 < green < 180
        and blue < 115
        and red > green * 1.38
    )


def orange_components(path: Path) -> tuple[int, int, list[Component]]:
    width, height, pixels = image_bytes(path)
    mask = bytearray(width * height)

    for pixel in range(width * height):
        offset = pixel * 4
        if is_reference_orange(*pixels[offset : offset + 4]):
            mask[pixel] = 1

    components: list[Component] = []
    for start in range(width * height):
        if not mask[start]:
            continue

        mask[start] = 0
        stack = [start]
        points: list[int] = []
        while stack:
            point = stack.pop()
            points.append(point)
            y, x = divmod(point, width)
            neighbours = (
                point - 1 if x else -1,
                point + 1 if x + 1 < width else -1,
                point - width if y else -1,
                point + width if y + 1 < height else -1,
            )
            for neighbour in neighbours:
                if neighbour >= 0 and mask[neighbour]:
                    mask[neighbour] = 0
                    stack.append(neighbour)

        if len(points) < 80:
            continue

        xs = [point % width for point in points]
        ys = [point // width for point in points]
        x0, x1 = min(xs), max(xs)
        y0, y1 = min(ys), max(ys)
        box_width = x1 - x0 + 1
        box_height = y1 - y0 + 1
        center_x = sum(xs) / len(xs)
        center_y = sum(ys) / len(ys)
        components.append(
            Component(
                area=len(points),
                x0=x0,
                y0=y0,
                x1=x1,
                y1=y1,
                aspect=box_width / box_height,
                density=len(points) / (box_width * box_height),
                cx=(center_x - x0) / box_width,
                cy=(center_y - y0) / box_height,
                vx=sum((x - center_x) ** 2 for x in xs)
                / len(xs)
                / box_width**2,
                vy=sum((y - center_y) ** 2 for y in ys)
                / len(ys)
                / box_height**2,
            )
        )

    return width, height, components


def component_distance(candidate: Component, reference: Component) -> float:
    if candidate.area < 180:
        return math.inf
    return (
        abs(candidate.aspect - reference.aspect) / 0.30
        + abs(candidate.density - reference.density) / 0.13
        + abs(candidate.cx - reference.cx) / 0.10
        + abs(candidate.cy - reference.cy) / 0.10
        + abs(candidate.vx - reference.vx) / 0.018
        + abs(candidate.vy - reference.vy) / 0.018
    )


def display_title(filename: str) -> str:
    title = Path(filename).stem
    for suffix in ("-1280_720", "-640_480", "-1280_72", "-12"):
        if title.endswith(suffix):
            title = title[: -len(suffix)]
    return title.replace("_", " ").strip()


def analyse(path: Path, reference: Component) -> dict[str, object]:
    width, height, components = orange_components(path)
    ranked = sorted(
        ((component_distance(component, reference), component) for component in components),
        key=lambda pair: pair[0],
    )

    if not ranked or not math.isfinite(ranked[0][0]):
        source_x = width * 0.38
        source_y = height * 0.28
        source_size = min(width, height) * 0.32
        confidence = 0.0
    else:
        score, best = ranked[0]
        box_width = best.x1 - best.x0 + 1
        box_height = best.y1 - best.y0 + 1
        reference_width = reference.x1 - reference.x0 + 1
        reference_height = reference.y1 - reference.y0 + 1
        scale = (box_width / reference_width + box_height / reference_height) / 2
        source_size = 400 * scale
        source_x = best.x0 - reference.x0 * scale
        source_y = best.y0 - reference.y0 * scale
        confidence = max(0.0, min(1.0, 1 - score / 9))

    # The replacement has a wider silhouette than old.png. A little extra
    # height ensures the reference's crown and feet are hidden without adding
    # any opaque plate behind the transparent WebP.
    overlay_height = source_size * 1.36
    overlay_width = overlay_height * (1682 / 1004)
    overlay_x = source_x + source_size / 2 - overlay_width / 2
    overlay_y = source_y - source_size * 0.25

    filename = unicodedata.normalize("NFC", path.name)
    return {
        "src": f"thumnail/{quote(filename, safe='')}",
        "title": display_title(filename),
        "width": width,
        "height": height,
        "placement": {
            "x": round(overlay_x / width, 6),
            "y": round(overlay_y / height, 6),
            "w": round(overlay_width / width, 6),
        },
        "confidence": round(confidence, 3),
    }


def build_preview(source: Path) -> str:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha1(source.name.encode("utf-8")).hexdigest()[:12]
    output = PREVIEW_DIR / f"{digest}.webp"
    if not output.exists() or output.stat().st_mtime < source.stat().st_mtime:
        subprocess.run(
            [
                "magick",
                str(source),
                "-thumbnail",
                "480x270>",
                "-strip",
                "-quality",
                "76",
                str(output),
            ],
            check=True,
        )
    return f"assets/gallery/previews/{output.name}"


def main() -> None:
    _, _, reference_components = orange_components(REFERENCE)
    reference = max(reference_components, key=lambda component: component.area)

    files = sorted(
        (
            path
            for path in SOURCE_DIR.iterdir()
            if path.is_file()
            and path.suffix.lower() in SUPPORTED
            and not path.name.startswith(("kofunei-", "."))
        ),
        key=lambda path: unicodedata.normalize("NFKC", path.name).casefold(),
    )
    items = []
    for path in files:
        item = analyse(path, reference)
        item["preview"] = build_preview(path)
        items.append(item)
    payload = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text(
        "window.KOFUNEI_GALLERY_ITEMS=" + payload + ";\n",
        encoding="utf-8",
    )

    low_confidence = [item for item in items if item["confidence"] < 0.45]
    print(f"Wrote {len(items)} items to {OUTPUT.relative_to(ROOT)}")
    print(f"Low-confidence detections: {len(low_confidence)}")
    for item in low_confidence:
        print(f"  {item['confidence']:.3f}  {item['src']}")


if __name__ == "__main__":
    main()
