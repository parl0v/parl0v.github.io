"""Build ludusctrl/docs/privacy.html from LudusCtrl's PRIVACY.md.

PRIVACY.md in https://github.com/parl0v/ludusctrl is the only copy anyone
edits. This turns it into the styled page, through template.html next to this
script:

  - "**Last updated: ...**" becomes the muted date line under the title;
  - the "Summary" section becomes the highlighted box above everything else;
  - quotes and dashes are typeset, tables and code keep the page's styles.

    python .github/privacy/render.py [PRIVACY.md] [output.html]

With no arguments it downloads the current PRIVACY.md from the repository's
main branch and writes ludusctrl/docs/privacy.html. Needs `markdown`.
"""

from __future__ import annotations

import os
import re
import sys
import urllib.request

import markdown

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
# Through the API rather than raw.githubusercontent.com, whose CDN can serve a
# copy several minutes old right after a push.
SOURCE_URL = "https://api.github.com/repos/parl0v/ludusctrl/contents/PRIVACY.md?ref=main"
DEFAULT_OUT = os.path.join(REPO, "ludusctrl", "docs", "privacy.html")


def load(source: str | None) -> str:
    if source:
        with open(source, encoding="utf-8") as fh:
            return fh.read()
    req = urllib.request.Request(SOURCE_URL, headers={
        "Accept": "application/vnd.github.raw", "User-Agent": "parl0v-privacy-render"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def split_summary(md: str) -> tuple[str, str]:
    """Take the "## Summary" section out of the document, returning
    (summary body, document without it)."""
    m = re.search(r"^## Summary[ \t]*\n(.*?)(?=^## |\Z)", md, re.M | re.S)
    if not m:
        return "", md
    return m.group(1).strip(), md[:m.start()] + md[m.end():]


def to_html(md: str) -> str:
    return markdown.markdown(md, extensions=["tables", "smarty"], output_format="html")


def render(md: str) -> str:
    md = md.replace("\r\n", "\n")
    summary, md = split_summary(md)
    body = to_html(md)

    # The date line, styled as the page's subtitle.
    body, n = re.subn(r"<p><strong>(Last updated:[^<]*)</strong></p>",
                      r'<p class="updated">\1</p>', body, count=1)
    if n != 1:
        raise SystemExit('PRIVACY.md needs a "**Last updated: ...**" line')

    # The summary, as one highlighted paragraph straight after the date.
    if summary:
        inner = " ".join(re.sub(r"^<p>|</p>$", "", p.strip())
                         for p in to_html(summary).split("\n") if p.strip())
        lede = f'<p class="lede">\n{inner}\n</p>'
        i = body.index('<p class="updated">')
        j = body.index("</p>", i) + len("</p>")
        body = body[:j] + "\n" + lede + body[j:]

    return "\n".join("  " + line if line.strip() else "" for line in body.split("\n"))


def main() -> int:
    source = sys.argv[1] if len(sys.argv) > 1 else None
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    with open(os.path.join(HERE, "template.html"), encoding="utf-8") as fh:
        template = fh.read()
    page = template.replace("{{content}}", render(load(source)))
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(page)
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
