import re
with open('src/components/AdminDashboard.jsx') as f:
    text = f.read()

# removing javascript inside { } naively helps simplify, but lets just use a simple regex for JSX.
# let's just use node to compile standard regex to find tags.
