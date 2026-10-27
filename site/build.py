"""Assemble index.html (a full, standalone page) from template + logic + ui + perks."""
import json, pathlib
SITE = pathlib.Path(__file__).resolve().parent
REPO = SITE.parent
tpl = (SITE / 'template.html').read_text(encoding='utf-8')
perks = json.loads((SITE / 'perks.json').read_text(encoding='utf-8'))
body = (tpl.replace('__PERKS__', json.dumps(perks, ensure_ascii=False))
           .replace('__LOGIC__', (SITE / 'logic.js').read_text(encoding='utf-8'))
           .replace('__UI__', (SITE / 'ui.js').read_text(encoding='utf-8')))
# fragment -> standalone document (title, fonts and styles go into <head>)
i = body.index('<style>'); j = body.index('</style>', i) + len('</style>')
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="Compare the official 2027 basic health insurance premiums in every Swiss canton and see what the numbers suggest for your plan.">\n'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n')
(REPO / 'index.html').write_text(head + body[:i] + body[i:j] + '\n</head>\n<body>\n' + body[j:] + '\n</body>\n</html>\n', encoding='utf-8')
(SITE / 'artifact.html').write_text(body, encoding='utf-8')  # fragment version for the claude.ai preview
print('index.html', len(head + body))
