#!/usr/bin/env python3
"""Put the site's real web address into every page, the sitemap and robots.txt.

Usage (from the site folder):
    python3 tools/set-domain.py https://www.example.co.za

Until this is run the files use the placeholder https://YOUR-DOMAIN, which
search engines and WhatsApp can't use. Run it once, before uploading.
"""
import glob
import os
import re
import sys

PLACEHOLDER = 'https://YOUR-DOMAIN'

def main():
    if len(sys.argv) != 2 or not re.fullmatch(r'https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}/?', sys.argv[1]):
        sys.exit('Give the full address, e.g.  python3 tools/set-domain.py https://www.example.co.za')
    domain = sys.argv[1].rstrip('/')
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = glob.glob(os.path.join(here, '*.html')) + [os.path.join(here, f) for f in ('sitemap.xml', 'robots.txt')]
    changed = 0
    for path in files:
        with open(path, encoding='utf-8') as fh:
            text = fh.read()
        if PLACEHOLDER in text:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(text.replace(PLACEHOLDER, domain))
            changed += 1
    print(f'Done: {domain} written into {changed} files.')

if __name__ == '__main__':
    main()
