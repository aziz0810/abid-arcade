"""Wrap the assembled arcade page in a full HTML document for static hosting.
Usage: python3 tools/make_index.py build/arcade.html index.html"""
import sys
s = open(sys.argv[1]).read()
head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14603c">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Matchday">
<meta name="description" content="Five free football games: guess the secret player, 30-second challenges, letter rush, name chain and a football card game. 7,208 real players.">
<script src="i18n.js"></script>
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}</style>
'''
s = s.replace('family=Barlow+Condensed:wght@500;600;700&display=swap', 'family=Barlow+Condensed:wght@500;600;700&family=Cairo:wght@400;600;800&display=swap')
i = s.index('<div class="wrap">')
tail = '''
<script src="firebase-config.js"></script>
<script src="online.js"></script>
'''
assert s[:i].rstrip().endswith('</style>'), 'online.css link would land inside the page styles'
open(sys.argv[2], 'w').write(head + s[:i] + '<link rel="stylesheet" href="online.css">\n</head>\n<body>\n' + s[i:] + tail + '</body>\n</html>\n')
