"""Wrap the assembled arcade page in a full HTML document for static hosting.
Usage: python3 tools/make_index.py build/arcade.html index.html"""
import sys
s = open(sys.argv[1]).read()
head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Five free football games: guess the secret player, 30-second challenges, letter rush, name chain and a football card game. 7,208 real players.">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}</style>
'''
i = s.index('<div class="wrap">')
open(sys.argv[2], 'w').write(head + s[:i] + '</head>\n<body>\n' + s[i:] + '\n</body>\n</html>\n')
