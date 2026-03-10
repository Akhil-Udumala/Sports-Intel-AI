import re
with open('src/components/AdminDashboard.jsx') as f:
    text = f.read()

# very rough tag matching
tags = re.findall(r'</?([a-zA-Z0-9\._]+)[^>]*>', text)

stack = []
for tag in tags:
    if not tag.startswith('/'):
        # opening
        if not re.search(r'/>$', tag) and tag not in ['br', 'hr', 'img', 'input']:
            stack.append(tag)
    else:
        # closing
        name = tag[1:]
        if not stack:
            print(f"Excess closing tag: {name}")
            continue
        last = stack.pop()
        while last != name and stack:
            print(f"Mismatched tag: expected {last}, got {name}")
            last = stack.pop()
            
if stack:
    print(f"Unclosed tags remaining: {stack}")
