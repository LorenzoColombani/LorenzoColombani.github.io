#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
/usr/bin/env python3 workshop/launch.py
