"""Full-page screenshot + PDF print of every course's scorecard page.

Reads data/banen/<slug>/course.json, opens scorecard.page_url in Chrome (headless, via Playwright)
and writes data/banen/<slug>/screenshots/scorecard_page.png and scorecard_page.pdf.

    python tools/banen/capture_scorecards.py            # all courses without a screenshot yet
    python tools/banen/capture_scorecards.py --force    # redo all
    python tools/banen/capture_scorecards.py hooge-graven-ommen de-koepel-wierden
"""
import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
COURSES = ROOT / "data" / "banen"

# Most privacy-preserving choice first; we never click "accept all".
DECLINE_TEXTS = [
    "Alleen noodzakelijke", "Alleen noodzakelijk", "Alleen functionele", "Weigeren", "Afwijzen",
    "Alles weigeren", "Niet akkoord", "Nur notwendige", "Nur essenzielle", "Ablehnen",
    "Alle ablehnen", "Reject all", "Decline", "Only necessary",
]
# If no decline button exists, hide the banner instead of accepting it.
HIDE_CSS = """
#CybotCookiebotDialog, #cookie-notice, #cookie-law-info-bar, .cky-consent-container, .cky-overlay,
#onetrust-consent-sdk, .cmplz-cookiebanner, #cmplz-cookiebanner-container, .cookie-banner,
.cookiebanner, #cookiebanner, .cc-window, .cookie-consent, #usercentrics-root, .borlabs-cookie,
#BorlabsCookieBox, .moove-gdpr-info-bar-container, #gdpr-cookie-message, .iubenda-cs-container,
[id*="cookie" i][class*="banner" i], [class*="cookie-bar" i] { display: none !important; }
html, body { overflow: auto !important; }
"""


def dismiss_cookies(page):
    for text in DECLINE_TEXTS:
        loc = page.get_by_role("button", name=text, exact=False)
        try:
            if loc.count() and loc.first.is_visible():
                loc.first.click(timeout=2000)
                page.wait_for_timeout(800)
                return text
        except Exception:
            pass
    page.add_style_tag(content=HIDE_CSS)
    return None


def capture(page, slug, url):
    out = COURSES / slug / "screenshots"
    out.mkdir(parents=True, exist_ok=True)
    page.goto(url, wait_until="domcontentloaded", timeout=45000)
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(1500)
    clicked = dismiss_cookies(page)
    # Trigger lazy-loaded images by scrolling to the bottom once.
    page.evaluate("""async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
        window.scrollTo(0, 0);
    }""")
    page.wait_for_timeout(1000)
    page.screenshot(path=str(out / "scorecard_page.png"), full_page=True)
    page.emulate_media(media="screen")
    page.pdf(path=str(out / "scorecard_page.pdf"), print_background=True, format="A4")
    return clicked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    jobs = []
    for f in sorted(COURSES.glob("*/course.json")):
        slug = f.parent.name
        if args.slugs and slug not in args.slugs:
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        url = (data.get("scorecard") or {}).get("page_url")
        if not url or url.lower().endswith((".pdf", ".jpg", ".jpeg", ".png")):
            continue
        if not args.force and (f.parent / "screenshots" / "scorecard_page.png").exists():
            continue
        jobs.append((slug, url))

    print(f"{len(jobs)} page(s) to capture")
    failed = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 1366, "height": 900}, locale="nl-NL")
        for slug, url in jobs:
            page = ctx.new_page()
            try:
                clicked = capture(page, slug, url)
                print(f"ok   {slug}  {url}  cookies={'declined: ' + clicked if clicked else 'hidden'}")
            except Exception as e:
                failed.append(slug)
                print(f"FAIL {slug}  {url}  {type(e).__name__}: {e}".splitlines()[0])
            finally:
                page.close()
        browser.close()
    if failed:
        print("failed:", " ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main()
