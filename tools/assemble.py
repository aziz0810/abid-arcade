import sys
b=sys.argv[1]
head='''<title>Close Control</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap">
'''
data=open(b+'/data.json').read().replace('</','<\\/')
body=open(b+'/body.html').read().replace('__DATA__',data)
open(sys.argv[2],'w').write(head+open(b+'/style.css').read()+'\n'+body)
