import sys
b=sys.argv[1]
head='''<title>Matchday Arcade</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap">
'''
esc=lambda s: s.replace('</','<\\/')
body=open(b+'/arcade_body.html').read().replace('__DATA__',esc(open(b+'/data.json').read())).replace('__EXTRA__',esc(open(b+'/extra.json').read()))
open(sys.argv[2],'w').write(head+open(b+'/style.css').read()+'\n'+body)
