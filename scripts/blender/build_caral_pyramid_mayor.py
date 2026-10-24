#!/usr/bin/env python3
"""Backward-compatible entry point for the Caral Pyramid Mayor asset.

The shared builder is scripts/blender/build_caral_scenery.py.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_caral_scenery import main  # noqa: E402

if __name__ == '__main__':
    if '--' in sys.argv:
        index = sys.argv.index('--') + 1
        if not any(arg.startswith('--asset=') for arg in sys.argv[index:]):
            sys.argv.insert(index, '--asset=pyramid-mayor')
    else:
        sys.argv.extend(['--', '--asset=pyramid-mayor'])
    main()
