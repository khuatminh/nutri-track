#!/bin/zsh
# Render every wireframe HTML to PNG with headless Chrome
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd "$(dirname $0)/.."
for f in wireframes/*.html; do
  n=$(basename $f .html)
  h=$("$C" --headless=new --disable-gpu --virtual-time-budget=4000 --window-size=1600,3000 --dump-dom file://$PWD/$f 2>/dev/null | wc -c)
  case $n in design-system*) H=3600;; mobile*) H=1000;; desktop*) H=1060;; *) H=520;; esac
  "$C" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 --window-size=1600,$H --screenshot=$PWD/png/$n.png file://$PWD/$f >/dev/null 2>&1
done
