"""Génère 360-degres-nature.html : tout le site dans un seul fichier (CSS, JS et images intégrés)."""
import base64, re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = 'public/'
MIME = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
def uri(path):
    return 'data:%s;base64,%s' % (MIME[path.rsplit('.', 1)[-1].lower()], base64.b64encode(open(P + path, 'rb').read()).decode())
def inline_imgs(s):
    return re.sub(r'assets/img/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)', lambda m: uri(m.group(0)), s)
def read(p): return open(P + p, encoding='utf-8').read()
html = read('index.html')
html = html.replace('<link rel="stylesheet" href="assets/css/style.css">', '<style>\n' + read('assets/css/style.css') + '\n</style>')
for js in ('defaults', 'app'):
    code = read('assets/js/%s.js' % js)
    if js == 'defaults': code = inline_imgs(code)
    html = html.replace('<script%s src="assets/js/%s.js"></script>' % (' id="site-data"' if js == 'defaults' else '', js), '<script%s>\n' % (' id="site-data"' if js == 'defaults' else '') + '\n' + code.replace('</script', '<\\/script') + '\n</script>')
html = re.sub(r'<meta property="og:image"[^>]*>\n', '', html)
html = inline_imgs(html)
open('360-degres-nature.html', 'w', encoding='utf-8').write(html)
print('360-degres-nature.html :', os.path.getsize('360-degres-nature.html') // 1024, 'Ko')
