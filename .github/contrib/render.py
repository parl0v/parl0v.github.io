"""Render anyps5/index.html from my pull requests to boykopovar/AnyPS5.

The page is plain HTML with every PR written into it, so crawlers and
LLMs that don't run JavaScript still see the full list. Run locally or
from a scheduled workflow; it only rewrites the file when the output
changes.

    python .github/contrib/render.py
"""
import html
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

AUTHOR = "parl0v"
REPO = "boykopovar/AnyPS5"
OUT = Path(__file__).resolve().parents[2] / "anyps5" / "index.html"
HOME = Path(__file__).resolve().parents[2] / "index.html"
LLMS = Path(__file__).resolve().parents[2] / "llms.txt"

# Per-PR notes live in notes.json: {"6060": {"summary": "...", "detail": "..."}}.
# PRs without a note show their title only.
NOTES = {int(k): v for k, v in json.loads(
    (Path(__file__).with_name("notes.json")).read_text(encoding="utf-8")).items()}


def search(query):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "parl0v-contrib"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    items, page = [], 1
    while True:
        url = "https://api.github.com/search/issues?" + urllib.parse.urlencode(
            {"q": query, "per_page": 100, "page": page, "sort": "created", "order": "desc"})
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
            data = json.load(r)
        items += data["items"]
        if len(items) >= data["total_count"] or not data["items"]:
            return items
        page += 1


LINKS = {
    "nidhunt": "https://github.com/parl0v/nidhunt",
    "AlxcBTW": "https://github.com/AlxcBTW",
    "sce_symbols": "https://github.com/zecoxao/sce_symbols",
}


def linkify(text):
    """Escape a note and link #1234 references and a few names."""
    out = html.escape(text)
    out = re.sub(r"#(\d{3,5})\b",
                 lambda m: f'<a href="https://github.com/{REPO}/issues/{m.group(1)}">#{m.group(1)}</a>', out)
    for word, url in LINKS.items():
        out = re.sub(rf"\b{word}\b", f'<a href="{url}">{word}</a>', out, count=1)
    return out


# Biggest-impact PRs go to the top of their list in this order; the rest follow by date.
PINNED = [6060, 6168, 5281, 7427, 6490, 7560]


def pinned_first(prs):
    rank = {n: i for i, n in enumerate(PINNED)}
    return sorted(prs, key=lambda p: rank.get(p["number"], len(PINNED)))


def month(iso):
    d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return f"{d.day} {d:%b %Y}"


def row(pr, when):
    n = pr["number"]
    note = NOTES.get(n, {})
    parts = [f'      <li>',
             f'        <div class="row"><a class="name" href="{pr["html_url"]}"><span class="num">#{n}</span> {html.escape(pr["title"])}</a>'
             f'<span class="date">{month(when)}</span></div>']
    if note.get("summary"):
        parts.append(f'        <p class="desc">{linkify(note["summary"])}</p>')
    if note.get("detail"):
        parts.append(f'        <details><summary>Details</summary><p>{linkify(note["detail"])}</p></details>')
    parts.append('      </li>')
    return "\n".join(parts)


def main():
    prs = search(f"repo:{REPO} author:{AUTHOR} is:pr")
    merged = pinned_first(sorted((p for p in prs if p["pull_request"].get("merged_at")),
                                 key=lambda p: p["pull_request"]["merged_at"], reverse=True))
    open_ = pinned_first(sorted((p for p in prs if p["state"] == "open"),
                                key=lambda p: p["created_at"], reverse=True))
    first = min(p["created_at"] for p in prs) if prs else None
    now = datetime.now(timezone.utc)
    updated = f"{now.day} {now:%b %Y}"

    page = TEMPLATE.format(
        merged_count=len(merged),
        open_count=len(open_),
        since=month(first) if first else "",
        merged_rows="\n".join(row(p, p["pull_request"]["merged_at"]) for p in merged) or "      <li>None yet.</li>",
        open_rows="\n".join(row(p, p["created_at"]) for p in open_) or "      <li>None right now.</li>",
        updated=updated,
        all_url=f"https://github.com/{REPO}/pulls?q=" + urllib.parse.quote(f"is:pr author:{AUTHOR}"),
    )
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    # Ignore the date line when deciding whether anything really changed.
    strip = lambda s: "\n".join(l for l in s.splitlines() if "class=\"updated\"" not in l)
    if strip(old) != strip(page):
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(page, encoding="utf-8")
        print(f"wrote {OUT} ({len(merged)} merged, {len(open_)} open)")
    else:
        print("unchanged")
    update_home(len(merged), len(open_))


def update_home(merged, open_):
    """Keep the PR counts on the homepage and in llms.txt in step with this page."""
    text = HOME.read_text(encoding="utf-8")
    new = re.sub(r'(data-count="merged">)\d+', rf"\g<1>{merged}", text)
    new = re.sub(r'(data-count="open">)\d+', rf"\g<1>{open_}", new)
    if new != text:
        HOME.write_text(new, encoding="utf-8")
        print(f"updated homepage counts ({merged} merged, {open_} open)")
    text = LLMS.read_text(encoding="utf-8")
    new = re.sub(r"\d+ merged and \d+ open", f"{merged} merged and {open_} open", text)
    if new != text:
        LLMS.write_text(new, encoding="utf-8")
        print(f"updated llms.txt counts ({merged} merged, {open_} open)")


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AnyPS5 contributions · Josip Parlov (parl0v)</title>
  <meta name="description" content="Pull requests by Josip Parlov (parl0v) to AnyPS5: {merged_count} merged, {open_count} open. Mostly GPU performance and memory on Windows." />
  <link rel="canonical" href="https://parl0v.github.io/anyps5/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" />
  <style>
    :root {{
      --bg: #0a0a0a;
      --fg: #ededed;
      --fg-2: #a3a3a3;
      --fg-3: #6e6e6e;
      --fg-4: #4a4a4a;
      --line: #1c1c1c;
      --accent: #8db5a2;
      --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas, monospace;
      color-scheme: dark;
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html {{ -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }}
    body {{
      font-family: var(--sans);
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      max-width: 752px;
      margin: 0 auto;
      padding: 96px 24px 64px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }}
    ::selection {{ background: rgba(141, 181, 162, 0.28); color: #fff; }}
    a {{ color: inherit; text-decoration: none; text-underline-offset: 4px; text-decoration-thickness: 1px; transition: color 0.15s ease, text-decoration-color 0.15s ease; }}
    a:focus-visible, summary:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }}
    h1 {{ font-size: 1.625rem; font-weight: 600; line-height: 1.25; letter-spacing: -0.025em; color: #fff; }}
    .intro {{ margin-top: 16px; max-width: 62ch; color: var(--fg-2); font-size: 1rem; }}
    .intro a {{ color: var(--fg); text-decoration: underline; text-decoration-color: var(--fg-4); }}
    .intro a:hover {{ text-decoration-color: var(--accent); }}
    h2 {{
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 72px 0 6px;
      font-family: var(--mono);
      font-size: 0.72rem;
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--fg-3);
    }}
    h2::after {{ content: ''; flex: 1; height: 1px; background: var(--line); }}
    ul {{ list-style: none; }}
    li {{ padding: 20px 0; }}
    li + li {{ border-top: 1px solid var(--line); }}
    .row {{ display: flex; justify-content: space-between; align-items: baseline; gap: 24px; }}
    .name {{ min-width: 0; color: var(--fg); font-size: 1rem; font-weight: 500; letter-spacing: -0.01em; }}
    .name a, a.name {{ color: var(--fg); }}
    .name a:hover, a.name:hover {{ text-decoration: underline; text-decoration-color: var(--accent); }}
    .date {{ flex-shrink: 0; font-family: var(--mono); font-size: 0.75rem; color: var(--fg-3); white-space: nowrap; font-variant-numeric: tabular-nums; }}
    .desc {{ margin-top: 6px; max-width: 64ch; color: var(--fg-2); font-size: 0.9375rem; }}
    footer {{ margin-top: 88px; padding-top: 20px; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 0.72rem; line-height: 1.8; color: var(--fg-4); }}
    footer a {{ color: var(--fg-3); }}
    footer a:hover {{ color: var(--fg); }}
    @media (max-width: 560px) {{
      body {{ padding: 56px 16px 48px; }}
      h1 {{ font-size: 1.45rem; }}
      h2 {{ margin-top: 56px; }}
      li {{ padding: 18px 0; }}
      .row {{ flex-direction: column; gap: 2px; }}
    }}
    @media (prefers-reduced-motion: reduce) {{
      *, *::before, *::after {{ transition: none !important; animation: none !important; }}
    }}

    .back {{ font-family: var(--mono); font-size: 0.78rem; color: var(--fg-3); }}
    .back:hover {{ color: var(--fg); }}
    .back + h1 {{ margin-top: 40px; }}
    .stats {{ margin-top: 36px; display: flex; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }}
    .stat {{ padding: 18px 48px 16px 0; }}
    .stat + .stat {{ padding-left: 28px; border-left: 1px solid var(--line); }}
    .stat b {{ display: block; font-size: 1.875rem; font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; color: #fff; font-variant-numeric: tabular-nums; }}
    .stat span {{ display: block; margin-top: 6px; font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-3); }}
    .name {{ font-size: 0.9375rem; }}
    .num {{ margin-right: 6px; font-family: var(--mono); font-size: 0.8rem; font-weight: 400; color: var(--fg-3); }}
    .num::before {{ content: ''; display: inline-block; width: 6px; height: 6px; margin-right: 10px; border-radius: 50%; vertical-align: 1px; }}
    .merged .num::before {{ background: var(--accent); box-shadow: 0 0 0 3px rgba(141, 181, 162, 0.14); }}
    .open .num::before {{ border: 1px solid var(--fg-3); }}
    .stat:first-child b {{ color: var(--accent); }}
    .desc a, details p a {{ color: var(--accent); }}
    .desc a:hover, details p a:hover {{ text-decoration: underline; }}
    details {{ margin-top: 10px; }}
    summary {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      list-style: none;
      font-family: var(--mono);
      font-size: 0.72rem;
      color: var(--fg-3);
      user-select: none;
      transition: color 0.15s ease;
    }}
    summary::-webkit-details-marker {{ display: none; }}
    summary::before {{
      content: '';
      width: 5px;
      height: 5px;
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: translateY(-1px) rotate(-45deg);
      transition: transform 0.15s ease;
    }}
    summary:hover {{ color: var(--fg); }}
    details[open] summary {{ color: var(--fg-2); }}
    details[open] summary::before {{ color: var(--accent); transform: translateY(-2px) rotate(45deg); }}
    details p {{ margin-top: 10px; max-width: 64ch; padding-left: 14px; border-left: 1px solid #262626; color: var(--fg-2); font-size: 0.875rem; line-height: 1.65; }}
    @media (max-width: 560px) {{
      .stat {{ padding-right: 32px; }}
      .stat + .stat {{ padding-left: 24px; }}
    }}
    .stats + h2 {{ margin-top: 56px; }}
  </style>
</head>
<body>
  <a class="back" href="../">← parl0v</a>
  <h1>AnyPS5 contributions</h1>
  <p class="intro"><a href="https://github.com/boykopovar/AnyPS5">AnyPS5</a> turns PS5 games into native Windows and Linux programs. My pull requests are mostly about GPU performance and memory on Windows, plus a few tools and docs. Contributing since {since}.</p>
  <div class="stats">
    <div class="stat"><b>{merged_count}</b><span>merged</span></div>
    <div class="stat"><b>{open_count}</b><span>open</span></div>
  </div>

  <h2>Merged</h2>
  <ul class="merged">
{merged_rows}
  </ul>

  <h2>Open</h2>
  <ul class="open">
{open_rows}
  </ul>

  <footer><p><a href="{all_url}">All of my pull requests on GitHub</a></p><p class="updated">Updated {updated} from the GitHub API.</p></footer>
  <script src="../motion.js" defer></script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
