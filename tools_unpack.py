# Раскладывает src/ из любой сборки с метками: python3 tools_unpack.py index.html .
import re, sys, os
html = open(sys.argv[1], encoding="utf-8").read()
out = sys.argv[2] if len(sys.argv) > 2 else "."
css = re.search(r"<style>/\*@@file (src/style\.css)\*/\n(.*?)</style>", html, re.S)
body = re.search(r"<!--@@file (src/body\.html)-->\n(.*?)<!--@@end-->", html, re.S)
i = html.index("/*@@file src/js/"); js = html[i:html.rindex("</script>")]
files = {css.group(1): css.group(2), body.group(1): body.group(2)}
for m in re.finditer(r"/\*@@file (src/js/[^*]+)\*/\n(.*?)(?=/\*@@file src/js/|\Z)", js, re.S):
    files[m.group(1)] = m.group(2)[:-1] if m.group(2).endswith("\n") else m.group(2)
for name, text in files.items():
    path = os.path.join(out, name); os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(text)
print(len(files), "files")
