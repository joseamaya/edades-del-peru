#!/usr/bin/env python3
"""Generate PBR texture albedos with Cloudflare Workers AI (free, no watermark).

Models: FLUX.2 [dev]/[klein] use multipart/form-data inputs, FLUX.1 [schnell]
uses JSON. Both are handled transparently.

Credentials (either one):
  - environment variables CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN
  - file scripts/.cloudflare.json  { "accountId": "...", "apiToken": "..." }

Usage:
  python3 scripts/gen_textures.py [--force] [--only=slot1,slot2]

Output: scripts/_textures_raw/{slot}_raw.png
"""
import base64
import io
import json
import os
import pathlib
import sys
import time

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "scripts" / "_textures_raw"
REFS = ROOT / "scripts" / "_refs"
PROMPTS_FILE = ROOT / "scripts" / "prompts_textures.json"
REFS_FILE = ROOT / "scripts" / "refs.json"
DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell"
SECTIONS = ("terrain", "materials", "buildings", "textiles", "landscape")
PARAM_KEYS = ("steps", "guidance", "width", "height", "seed")
MAX_REF_SIDE = 512
KLEIN_STEP = 4


def creds():
    acc = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    tok = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not (acc and tok):
        f = ROOT / "scripts" / ".cloudflare.json"
        if f.exists():
            d = json.loads(f.read_text())
            acc = acc or d.get("accountId")
            tok = tok or d.get("apiToken")
    if not (acc and tok):
        print("Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN (or scripts/.cloudflare.json)")
        sys.exit(2)
    return acc, tok


def is_flux2(model: str) -> bool:
    return model.startswith("@cf/black-forest-labs/flux-2")


def resize_ref(path: pathlib.Path) -> bytes:
    """Read a reference image and downscale it to the model's input limit."""
    from PIL import Image

    img = Image.open(path).convert("RGBA")
    if max(img.size) > MAX_REF_SIDE:
        img.thumbnail((MAX_REF_SIDE, MAX_REF_SIDE))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def ref_paths(params: dict) -> list:
    out = []
    for name in params.get("refs", []) or []:
        p = REFS / name
        if p.exists():
            out.append(p)
        else:
            print(f"     warn: reference missing {p}")
    return out


def download_refs() -> None:
    """Fetch reference images listed in refs.json (only when a direct image URL is set)."""
    if not REFS_FILE.exists():
        return
    entries = json.loads(REFS_FILE.read_text())
    REFS.mkdir(parents=True, exist_ok=True)
    for slot, meta in entries.items():
        name = meta.get("file") or f"{slot}.png"
        dest = REFS / name
        if dest.exists() or not meta.get("image"):
            continue
        try:
            r = requests.get(meta["image"], timeout=120)
            r.raise_for_status()
            dest.write_bytes(r.content)
            print(f"ref  {slot} -> {dest.name} ({meta.get('license', '?')})")
        except Exception as e:  # noqa: BLE001
            print(f"ref FAIL {slot}: {type(e).__name__}: {str(e)[:160]}")
        time.sleep(1)


def _post(url: str, headers: dict, *, json_body=None, files=None, tries: int = 4) -> requests.Response:
    """POST with backoff; abort early on the Workers AI daily neuron quota."""
    last = None
    for i in range(tries):
        r = requests.post(url, headers=headers, json=json_body, files=files, timeout=300)
        if r.status_code == 429 and "daily free allocation" in r.text:
            raise RuntimeError("Cloudflare Workers AI daily neuron quota exhausted; retry after the daily reset")
        if r.status_code not in (429, 500, 502, 503, 504):
            return r
        last = r
        retry_after = r.headers.get("retry-after", "")
        delay = int(retry_after) if retry_after.isdigit() else min(60, 5 * (2**i))
        print(f"     retry {i + 1}/{tries} after HTTP {r.status_code} ({delay}s)")
        time.sleep(delay)
    return last


def generate(prompt: str, model: str, acc: str, tok: str, params: dict) -> bytes:
    url = f"https://api.cloudflare.com/client/v4/accounts/{acc}/ai/run/{model}"
    headers = {"Authorization": f"Bearer {tok}"}
    if is_flux2(model):
        files = {
            "prompt": (None, prompt),
            "width": (None, str(params.get("width", 1024))),
            "height": (None, str(params.get("height", 1024))),
        }
        steps = params.get("steps")
        if steps is not None and "klein" not in model:
            files["steps"] = (None, str(steps))
        if params.get("guidance") is not None:
            files["guidance"] = (None, str(params["guidance"]))
        if params.get("seed") is not None:
            files["seed"] = (None, str(params["seed"]))
        for i, ref in enumerate(ref_paths(params)):
            files[f"input_image_{i}"] = (ref.name, resize_ref(ref), "image/png")
        r = _post(url, headers, files=files)
    else:
        body = {"prompt": prompt, "steps": params.get("steps", KLEIN_STEP)}
        if params.get("seed") is not None:
            body["seed"] = params["seed"]
        r = _post(url, headers, json_body=body)
    r.raise_for_status()
    ctype = r.headers.get("content-type", "")
    if "application/json" in ctype:
        data = r.json()
        result = data.get("result", {})
        b64 = result.get("image") if isinstance(result, dict) else result
        if not b64:
            raise RuntimeError(f"response without image: {json.dumps(data)[:200]}")
        return base64.b64decode(b64)
    return r.content


def collect_slots(prompts: dict) -> dict:
    """Flatten the prompt sections; a slot may be a bare string or an object."""
    slots = {}
    for section in SECTIONS:
        for key, val in prompts.get(section, {}).items():
            slots[key] = {"prompt": val} if isinstance(val, str) else dict(val)
    return slots


def main() -> None:
    force = "--force" in sys.argv
    only = None
    for arg in sys.argv:
        if arg.startswith("--only="):
            only = set(arg.split("=", 1)[1].split(","))

    prompts = json.loads(PROMPTS_FILE.read_text())
    model = prompts.get("model", os.environ.get("CF_IMAGE_MODEL", DEFAULT_MODEL))
    globals_ = {k: prompts[k] for k in PARAM_KEYS if k in prompts}
    slots = collect_slots(prompts)

    OUT.mkdir(parents=True, exist_ok=True)
    acc, tok = creds()
    download_refs()
    print(f"model: {model}  slots: {len(slots)}")
    for slot, spec in slots.items():
        if only and slot not in only:
            continue
        raw = OUT / f"{slot}_raw.png"
        if raw.exists() and not force:
            print(f"skip {slot} (already exists)")
            continue
        params = {**globals_}
        params.update({k: spec[k] for k in (*PARAM_KEYS, "refs") if k in spec})
        try:
            t = time.time()
            data = generate(spec["prompt"], model, acc, tok, params)
            raw.write_bytes(data)
            print(f"ok   {slot}  {len(data) // 1024} KB  {time.time() - t:.1f}s")
        except Exception as e:  # noqa: BLE001
            print(f"FAIL {slot}: {type(e).__name__}: {str(e)[:240]}")
        time.sleep(1)
    print("Done. Now run: python3 scripts/post_textures.py")


if __name__ == "__main__":
    main()
