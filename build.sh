#!/bin/bash
# Собирает index.html для Telegram и GitHub Pages из src/
set -e
export LC_ALL=C
cd "$(dirname "$0")"
{
  echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">'
  echo '<script src="https://telegram.org/js/telegram-web-app.js?63"></script>'
  echo '<script>window.KOVRY_TG=1</script>'
  echo '<title>Дедова ковромойка</title>'
  echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  echo '<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Golos+Text:wght@400;600&family=Prata&display=swap" rel="stylesheet">'
  echo '<meta name="theme-color" content="#120E0B"></head><body>'
  echo "<style>/*@@file src/style.css*/"; cat src/style.css; echo "</style>"
  echo "<!--@@file src/body.html-->"; cat src/body.html; echo "<!--@@end-->"
  echo "<script>"; for f in src/js/*.js; do echo "/*@@file $f*/"; cat "$f"; echo; done; echo "</script>"
  echo '</body></html>'
} > index.html
echo "index.html: $(wc -c < index.html) байт"
