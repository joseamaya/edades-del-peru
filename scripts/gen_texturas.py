#!/usr/bin/env python3
"""Genera albedos de terreno con Cloudflare Workers AI (gratis, sin marca de agua).

Credenciales (una de las dos):
  - variables de entorno CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN
  - archivo scripts/.cloudflare.json  { "accountId": "...", "apiToken": "..." }

Uso:
  python3 scripts/gen_texturas.py [--force]

Salida: scripts/_texturas_raw/{slot}_raw.png
"""
import base64
import json
import os
import pathlib
import sys
import time

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "scripts" / "_texturas_raw"
PROMPTS_FILE = ROOT / "scripts" / "prompts_texturas.json"
DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell"


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
        print("Faltan CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN (o scripts/.cloudflare.json)")
        sys.exit(2)
    return acc, tok


def generate(prompt: str, model: str, acc: str, tok: str) -> bytes:
    url = f"https://api.cloudflare.com/client/v4/accounts/{acc}/ai/run/{model}"
    r = requests.post(
        url,
        headers={"Authorization": f"Bearer {tok}"},
        json={"prompt": prompt, "steps": 4},
        timeout=240,
    )
    r.raise_for_status()
    ctype = r.headers.get("content-type", "")
    if "application/json" in ctype:
        data = r.json()
        result = data.get("result", {})
        b64 = result.get("image") if isinstance(result, dict) else result
        if not b64:
            raise RuntimeError(f"respuesta sin imagen: {json.dumps(data)[:200]}")
        return base64.b64decode(b64)
    return r.content


def main() -> None:
    force = "--force" in sys.argv
    model = os.environ.get("CF_IMAGE_MODEL", DEFAULT_MODEL)
    prompts = json.loads(PROMPTS_FILE.read_text())
    model = prompts.get("model", model)
    OUT.mkdir(parents=True, exist_ok=True)
    acc, tok = creds()
    print(f"modelo: {model}")
    slots: dict[str, str] = {}
    slots.update(prompts.get("materials", {}))
    slots.update(prompts.get("materiales", {}))
    for slot, prompt in slots.items():
        raw = OUT / f"{slot}_raw.png"
        if raw.exists() and not force:
            print(f"skip {slot} (ya existe)")
            continue
        try:
            t = time.time()
            data = generate(prompt, model, acc, tok)
            raw.write_bytes(data)
            print(f"ok   {slot}  {len(data)//1024} KB  {time.time()-t:.1f}s")
        except Exception as e:  # noqa: BLE001
            print(f"FAIL {slot}: {type(e).__name__}: {str(e)[:240]}")
        time.sleep(1)
    print("Listo. Ahora ejecuta: python3 scripts/post_texturas.py")


if __name__ == "__main__":
    main()
