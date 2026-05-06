"""
Submit EDGEMARKET to AlternativeTo and Toolify.ai
Uses Playwright (sync API) with visible browser and screenshots.
"""

import time
import os
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCREENSHOT_DIR = "/Users/cartel/Desktop/copyscore"
EMAIL = "fluttered00@gmail.com"

EDGEMARKET = {
    "name": "EDGEMARKET",
    "url": "https://copyscore-lovat.vercel.app",
    "alt_description": (
        "Free crypto dashboard built autonomously by an AI agent. "
        "Live prices, gas tracker, whale alerts, P&L checker, token converter, "
        "Fear & Greed index. No signup, no tracking."
    ),
    "toolify_description": (
        "First crypto dashboard built entirely by an AI agent. "
        "Features live prices, gas tracker, whale alerts, portfolio checker. "
        "Zero human code."
    ),
    "tags": ["Cryptocurrency", "Finance", "Dashboard", "AI"],
    "alternatives_to": ["CoinGecko", "CoinMarketCap"],
    "license": "Free",
    "platform": "Web",
    "category": "AI Tools / Blockchain",
}


def screenshot(page, name):
    """Take a screenshot and save it."""
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=False)
    print(f"  [screenshot] {path}")


def wait_and_click(page, selector, timeout=10000):
    """Wait for a selector and click it."""
    page.wait_for_selector(selector, timeout=timeout)
    page.click(selector)


def safe_fill(page, selector, value, timeout=5000):
    """Wait for a field and fill it."""
    page.wait_for_selector(selector, timeout=timeout)
    page.fill(selector, value)


# ---------------------------------------------------------------------------
# AlternativeTo submission
# ---------------------------------------------------------------------------
def submit_alternativeto(browser):
    print("\n========================================")
    print("ALTERNATIVETO.NET - Submit EDGEMARKET")
    print("========================================\n")

    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
    )
    page = context.new_page()
    page.set_default_timeout(15000)

    # Step 1: Go to AlternativeTo
    print("[1] Navigating to alternativeto.net ...")
    page.goto("https://alternativeto.net", wait_until="domcontentloaded")
    time.sleep(3)
    screenshot(page, "alt-01-homepage")

    # Step 2: Look for "Add Application" or "Submit" link
    print("[2] Looking for submission link ...")
    try:
        # Try the direct URL for adding a new app
        page.goto("https://alternativeto.net/manage/new/", wait_until="domcontentloaded")
        time.sleep(3)
        screenshot(page, "alt-02-add-page")
    except Exception as e:
        print(f"  Could not navigate to /manage/new/: {e}")
        # Fallback: try from homepage
        try:
            page.goto("https://alternativeto.net/submit/", wait_until="domcontentloaded")
            time.sleep(3)
            screenshot(page, "alt-02-submit-page")
        except Exception as e2:
            print(f"  Could not navigate to /submit/ either: {e2}")

    # Check if we need to log in
    current_url = page.url
    print(f"  Current URL: {current_url}")
    screenshot(page, "alt-03-current-state")

    if "login" in current_url.lower() or "sign" in current_url.lower():
        print("[3] Login required - attempting to sign up / log in ...")
        try:
            # Look for email/social login options
            # Try email signup first
            email_input = page.query_selector('input[type="email"], input[name="email"], input[name="Email"]')
            if email_input:
                email_input.fill(EMAIL)
                screenshot(page, "alt-04-email-filled")
                # Look for submit/continue button
                submit_btn = page.query_selector('button[type="submit"], input[type="submit"]')
                if submit_btn:
                    submit_btn.click()
                    time.sleep(3)
                    screenshot(page, "alt-05-after-login-submit")
            else:
                print("  No email field found on login page.")
                # Try social login buttons
                google_btn = page.query_selector('a[href*="google"], button:has-text("Google")')
                if google_btn:
                    print("  Found Google login option (requires manual auth).")
                screenshot(page, "alt-04-login-options")
        except Exception as e:
            print(f"  Login attempt error: {e}")
            screenshot(page, "alt-04-login-error")

    # Step 3: Try to fill out the submission form (if we reached it)
    print("[4] Attempting to fill submission form ...")
    try:
        # Look for name/title field
        name_field = page.query_selector(
            'input[name="name"], input[name="Name"], input[name="title"], '
            'input[placeholder*="name" i], input[placeholder*="Name"], '
            'input[id*="name" i], input[id*="title" i]'
        )
        if name_field:
            name_field.fill(EDGEMARKET["name"])
            print("  Filled name field.")

        # URL field
        url_field = page.query_selector(
            'input[name="url"], input[name="Url"], input[name="website"], '
            'input[placeholder*="url" i], input[placeholder*="URL"], '
            'input[type="url"], input[id*="url" i]'
        )
        if url_field:
            url_field.fill(EDGEMARKET["url"])
            print("  Filled URL field.")

        # Description field
        desc_field = page.query_selector(
            'textarea[name="description"], textarea[name="Description"], '
            'textarea[placeholder*="description" i], textarea[id*="description" i], '
            'textarea[name="shortDescription"]'
        )
        if desc_field:
            desc_field.fill(EDGEMARKET["alt_description"])
            print("  Filled description field.")

        screenshot(page, "alt-05-form-filled")

        # Try to find and click submit
        submit_btn = page.query_selector(
            'button[type="submit"], input[type="submit"], '
            'button:has-text("Submit"), button:has-text("Add"), '
            'button:has-text("Save"), button:has-text("Create")'
        )
        if submit_btn:
            print("  Found submit button, clicking ...")
            submit_btn.click()
            time.sleep(5)
            screenshot(page, "alt-06-after-submit")
            print("  Submission attempted!")
        else:
            print("  No submit button found.")

    except Exception as e:
        print(f"  Form fill error: {e}")
        screenshot(page, "alt-05-form-error")

    # Step 4: Try direct approach via CoinGecko's alternatives page
    print("[5] Trying to add as alternative to CoinGecko ...")
    try:
        page.goto(
            "https://alternativeto.net/software/coingecko/",
            wait_until="domcontentloaded",
        )
        time.sleep(3)
        screenshot(page, "alt-07-coingecko-page")

        # Look for "Suggest Alternative" or similar button
        suggest_btn = page.query_selector(
            'a:has-text("Suggest"), a:has-text("Add Alternative"), '
            'button:has-text("Suggest"), button:has-text("Add Alternative"), '
            'a[href*="suggest"], a[href*="alternative"]'
        )
        if suggest_btn:
            print("  Found suggest alternative button, clicking ...")
            suggest_btn.click()
            time.sleep(3)
            screenshot(page, "alt-08-suggest-form")

            # Try to fill in our app name
            search_input = page.query_selector(
                'input[type="search"], input[type="text"], '
                'input[placeholder*="search" i], input[placeholder*="name" i]'
            )
            if search_input:
                search_input.fill(EDGEMARKET["name"])
                time.sleep(2)
                screenshot(page, "alt-09-suggest-filled")
        else:
            print("  No 'Suggest Alternative' button found on CoinGecko page.")

    except Exception as e:
        print(f"  CoinGecko alternatives page error: {e}")

    # Final state
    screenshot(page, "alt-10-final-state")
    print("[DONE] AlternativeTo submission flow complete.\n")
    context.close()


# ---------------------------------------------------------------------------
# Toolify.ai submission
# ---------------------------------------------------------------------------
def submit_toolify(browser):
    print("\n========================================")
    print("TOOLIFY.AI - Submit EDGEMARKET")
    print("========================================\n")

    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
    )
    page = context.new_page()
    page.set_default_timeout(15000)

    # Step 1: Go to Toolify
    print("[1] Navigating to toolify.ai ...")
    page.goto("https://www.toolify.ai", wait_until="domcontentloaded")
    time.sleep(3)
    screenshot(page, "toolify-01-homepage")

    # Step 2: Find submission page
    print("[2] Looking for submission page ...")
    # Try common submission URLs
    submit_urls = [
        "https://www.toolify.ai/submit",
        "https://www.toolify.ai/submit-tool",
        "https://www.toolify.ai/tool/submit",
        "https://www.toolify.ai/add",
        "https://www.toolify.ai/add-tool",
    ]

    found_submit = False
    for url in submit_urls:
        try:
            print(f"  Trying {url} ...")
            response = page.goto(url, wait_until="domcontentloaded")
            time.sleep(2)
            if response and response.status < 400:
                current = page.url
                print(f"  Landed on: {current}")
                screenshot(page, "toolify-02-submit-page")
                found_submit = True
                break
        except Exception:
            continue

    if not found_submit:
        # Try finding a submit link on the homepage
        print("  No direct submit URL worked. Looking for submit link on page ...")
        page.goto("https://www.toolify.ai", wait_until="domcontentloaded")
        time.sleep(2)

        submit_link = page.query_selector(
            'a:has-text("Submit"), a:has-text("Add Tool"), '
            'a:has-text("Submit Tool"), a:has-text("List Your Tool"), '
            'a[href*="submit"], a[href*="add"]'
        )
        if submit_link:
            print(f"  Found submit link: {submit_link.get_attribute('href')}")
            submit_link.click()
            time.sleep(3)
            screenshot(page, "toolify-02-submit-page")
            found_submit = True
        else:
            # Check footer
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(2)
            submit_link = page.query_selector(
                'a:has-text("Submit"), a[href*="submit"]'
            )
            if submit_link:
                print(f"  Found submit link in footer.")
                submit_link.click()
                time.sleep(3)
                screenshot(page, "toolify-02-submit-page-footer")
                found_submit = True

    current_url = page.url
    print(f"  Current URL: {current_url}")

    # Check if login is needed
    if "login" in current_url.lower() or "sign" in current_url.lower() or "auth" in current_url.lower():
        print("[3] Login required - attempting ...")
        try:
            email_input = page.query_selector(
                'input[type="email"], input[name="email"], '
                'input[placeholder*="email" i]'
            )
            if email_input:
                email_input.fill(EMAIL)
                print("  Filled email.")
                screenshot(page, "toolify-03-email")

                # Look for continue/submit
                continue_btn = page.query_selector(
                    'button[type="submit"], button:has-text("Continue"), '
                    'button:has-text("Sign"), button:has-text("Log in"), '
                    'button:has-text("Submit")'
                )
                if continue_btn:
                    continue_btn.click()
                    time.sleep(3)
                    screenshot(page, "toolify-04-after-login")

                    # Check for password field
                    pw_field = page.query_selector(
                        'input[type="password"], input[name="password"]'
                    )
                    if pw_field:
                        print("  Password field appeared - cannot proceed without password.")
                        screenshot(page, "toolify-04-needs-password")
            else:
                # Maybe Google login
                google_btn = page.query_selector(
                    'a[href*="google"], button:has-text("Google"), '
                    'a:has-text("Google"), div:has-text("Google")'
                )
                if google_btn:
                    print("  Found Google login (requires manual auth).")
                    google_btn.click()
                    time.sleep(3)
                    screenshot(page, "toolify-03-google-login")
                screenshot(page, "toolify-03-login-options")
        except Exception as e:
            print(f"  Login error: {e}")
            screenshot(page, "toolify-03-login-error")

    # Step 4: Try to fill the submission form
    print("[4] Attempting to fill submission form ...")
    try:
        # Name field
        name_field = page.query_selector(
            'input[name="name"], input[name="title"], input[name="tool_name"], '
            'input[placeholder*="name" i], input[placeholder*="tool" i], '
            'input[id*="name" i], input[id*="title" i]'
        )
        if name_field:
            name_field.fill(EDGEMARKET["name"])
            print("  Filled name.")

        # URL field
        url_field = page.query_selector(
            'input[name="url"], input[name="website"], input[name="link"], '
            'input[placeholder*="url" i], input[placeholder*="URL"], '
            'input[type="url"], input[id*="url" i], input[id*="link" i]'
        )
        if url_field:
            url_field.fill(EDGEMARKET["url"])
            print("  Filled URL.")

        # Description
        desc_field = page.query_selector(
            'textarea[name="description"], textarea[name="desc"], '
            'textarea[placeholder*="description" i], textarea[id*="description" i], '
            'textarea'
        )
        if desc_field:
            desc_field.fill(EDGEMARKET["toolify_description"])
            print("  Filled description.")

        # Category - try to type or select
        cat_field = page.query_selector(
            'select[name="category"], input[name="category"], '
            'input[placeholder*="category" i], select[id*="category" i]'
        )
        if cat_field:
            tag_name = cat_field.evaluate("el => el.tagName.toLowerCase()")
            if tag_name == "select":
                # Try to select an AI or blockchain option
                options = cat_field.query_selector_all("option")
                for opt in options:
                    text = opt.inner_text().lower()
                    if "ai" in text or "blockchain" in text or "crypto" in text:
                        cat_field.select_option(label=opt.inner_text())
                        print(f"  Selected category: {opt.inner_text()}")
                        break
            else:
                cat_field.fill(EDGEMARKET["category"])
                print("  Filled category.")

        screenshot(page, "toolify-05-form-filled")

        # Submit
        submit_btn = page.query_selector(
            'button[type="submit"], input[type="submit"], '
            'button:has-text("Submit"), button:has-text("Add"), '
            'button:has-text("Save"), button:has-text("Create"), '
            'button:has-text("Publish")'
        )
        if submit_btn:
            print("  Found submit button, clicking ...")
            submit_btn.click()
            time.sleep(5)
            screenshot(page, "toolify-06-after-submit")
            print("  Submission attempted!")
        else:
            print("  No submit button found on form.")

    except Exception as e:
        print(f"  Form fill error: {e}")
        screenshot(page, "toolify-05-form-error")

    # Final state
    screenshot(page, "toolify-07-final-state")
    print("[DONE] Toolify.ai submission flow complete.\n")
    context.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 50)
    print("EDGEMARKET - Directory Submission Script")
    print("=" * 50)
    print(f"Target sites: AlternativeTo, Toolify.ai")
    print(f"Email: {EMAIL}")
    print(f"Screenshots: {SCREENSHOT_DIR}/")
    print()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,
            slow_mo=500,  # Slow down actions for visibility
        )

        try:
            submit_alternativeto(browser)
            submit_toolify(browser)
        except Exception as e:
            print(f"\n[ERROR] Unexpected error: {e}")
        finally:
            print("\nClosing browser ...")
            browser.close()

    print("\n" + "=" * 50)
    print("ALL DONE - Check screenshots in:")
    print(f"  {SCREENSHOT_DIR}/")
    print("=" * 50)


if __name__ == "__main__":
    main()
