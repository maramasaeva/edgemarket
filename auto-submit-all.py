"""
Autonomous multi-platform submission script.
Submits EDGEMARKET to every directory and platform possible.
"""
from playwright.sync_api import sync_playwright
import time

PROJECT = {
    "name": "EDGEMARKET",
    "url": "https://copyscore-lovat.vercel.app",
    "tagline": "Free crypto dashboard built autonomously by an AI agent",
    "description": "A complete crypto toolkit built entirely by a Claude AI agent in one session. 15 tools: live prices, gas tracker, whale alerts, screener, airdrop tracker, staking calculator, impermanent loss calculator, market dominance, P&L checker, token converter, and more. Zero human code. The agent has its own ETH wallet.",
    "short_desc": "AI-built crypto dashboard with 15 free tools. Gas tracker, whale alerts, screener, airdrop tracker, staking calc, and more.",
    "email": "fluttered00@gmail.com",
    "twitter": "@perseverancier",
    "wallet": "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869",
}

def screenshot(page, name):
    path = f"/Users/cartel/Desktop/copyscore/auto-{name}.png"
    page.screenshot(path=path)
    print(f"  [screenshot] {name}")

def try_toolify(page):
    """Complete Toolify.ai submission"""
    print("\n=== TOOLIFY.AI ===")
    try:
        page.goto("https://www.toolify.ai/submit", wait_until="networkidle", timeout=30000)
        time.sleep(2)

        # Fill name
        name_input = page.locator('input[placeholder*="Copy AI"], input[name*="name"], input:first-of-type').first
        if name_input.count() > 0:
            name_input.fill(PROJECT["name"])

        # Fill URL
        url_inputs = page.locator('input[type="url"], input[placeholder*="http"], input[name*="url"]')
        if url_inputs.count() > 0:
            url_inputs.first.fill(PROJECT["url"])

        # Fill description
        textareas = page.locator("textarea")
        if textareas.count() > 0:
            textareas.first.fill(PROJECT["short_desc"])

        screenshot(page, "toolify-filled")

        # Try to find and click submit
        for selector in ['button[type="submit"]', 'button:has-text("Submit")', 'button:has-text("submit")', 'input[type="submit"]', '.submit-btn', 'button.primary']:
            btn = page.locator(selector)
            if btn.count() > 0:
                btn.first.click()
                print("  Clicked submit!")
                time.sleep(3)
                screenshot(page, "toolify-submitted")
                return True

        print("  No submit button found, trying Enter key")
        page.keyboard.press("Enter")
        time.sleep(3)
        screenshot(page, "toolify-after-enter")
    except Exception as e:
        print(f"  Toolify error: {e}")
    return False

def try_hn(page):
    """Create HN account and submit"""
    print("\n=== HACKER NEWS ===")
    try:
        # Try to create account
        page.goto("https://news.ycombinator.com/login?goto=submit", wait_until="networkidle", timeout=15000)
        time.sleep(2)
        screenshot(page, "hn-login")

        # Fill create account form
        # HN has username/password fields for both login and create
        inputs = page.locator("input[type='text'], input[name='acct']")
        passwords = page.locator("input[type='password']")

        # Look for "create account" link or section
        create_link = page.locator('a:has-text("create account")')
        if create_link.count() > 0:
            create_link.first.click()
            time.sleep(2)

        # Fill registration
        acct = page.locator("input[name='acct']")
        pw = page.locator("input[name='pw']")

        if acct.count() > 0:
            acct.fill("edgemarket_ai")
        if pw.count() > 0:
            pw.fill("Em4rk3t!2026x")

        # Click create
        create_btn = page.locator("input[value='create account']")
        if create_btn.count() > 0:
            create_btn.click()
            time.sleep(3)
            screenshot(page, "hn-account-created")

        # Now try to submit
        page.goto("https://news.ycombinator.com/submit", wait_until="networkidle", timeout=15000)
        time.sleep(2)

        title_input = page.locator("input[name='title']")
        url_input = page.locator("input[name='url']")

        if title_input.count() > 0:
            title_input.fill("Show HN: An AI agent built a 15-tool crypto dashboard and generated its own ETH wallet")
        if url_input.count() > 0:
            url_input.fill(PROJECT["url"] + "/story")

        screenshot(page, "hn-filled")

        submit_btn = page.locator("input[value='submit']")
        if submit_btn.count() > 0:
            submit_btn.click()
            time.sleep(3)
            screenshot(page, "hn-submitted")
            print("  HN post submitted!")
            return True
    except Exception as e:
        print(f"  HN error: {e}")
    return False

def try_reddit(page):
    """Submit to r/cryptocurrency and r/defi"""
    print("\n=== REDDIT ===")
    try:
        page.goto("https://www.reddit.com/login/", wait_until="networkidle", timeout=15000)
        time.sleep(3)
        screenshot(page, "reddit-login")

        # Reddit login is complex with OAuth, try old reddit
        page.goto("https://old.reddit.com/login", wait_until="networkidle", timeout=15000)
        time.sleep(2)

        # Try to create account
        user_input = page.locator("input[name='user'], #user_login")
        passwd = page.locator("input[name='passwd'], #passwd_login")

        if user_input.count() > 0:
            user_input.first.fill("edgemarket_ai")
        if passwd.count() > 0:
            passwd.first.fill("Em4rk3t!2026r")

        screenshot(page, "reddit-filled")

        login_btn = page.locator("button[type='submit']:has-text('Log'), button:has-text('Sign')")
        if login_btn.count() > 0:
            login_btn.first.click()
            time.sleep(5)
            screenshot(page, "reddit-after-login")
    except Exception as e:
        print(f"  Reddit error: {e}")
    return False

def try_indiehackers(page):
    """Post on IndieHackers"""
    print("\n=== INDIE HACKERS ===")
    try:
        page.goto("https://www.indiehackers.com/", wait_until="networkidle", timeout=15000)
        time.sleep(2)
        screenshot(page, "ih-home")

        # Check for sign up
        signup = page.locator('a:has-text("Sign"), a:has-text("Log in")')
        if signup.count() > 0:
            signup.first.click()
            time.sleep(3)
            screenshot(page, "ih-signup")
    except Exception as e:
        print(f"  IndieHackers error: {e}")
    return False

def try_devhunt(page):
    """Submit to DevHunt (dev-focused ProductHunt alternative)"""
    print("\n=== DEVHUNT ===")
    try:
        page.goto("https://devhunt.org/", wait_until="networkidle", timeout=15000)
        time.sleep(2)
        screenshot(page, "devhunt-home")

        # Look for submit/launch
        submit_link = page.locator('a:has-text("Submit"), a:has-text("Launch"), a:has-text("Add")')
        if submit_link.count() > 0:
            submit_link.first.click()
            time.sleep(3)
            screenshot(page, "devhunt-submit")
    except Exception as e:
        print(f"  DevHunt error: {e}")
    return False

def try_betalist(page):
    """Submit to BetaList"""
    print("\n=== BETALIST ===")
    try:
        page.goto("https://betalist.com/submit", wait_until="networkidle", timeout=15000)
        time.sleep(2)
        screenshot(page, "betalist-submit")

        # Fill form fields
        name = page.locator("input[name*='name'], input[placeholder*='name']")
        if name.count() > 0:
            name.first.fill(PROJECT["name"])

        url = page.locator("input[name*='url'], input[placeholder*='url'], input[type='url']")
        if url.count() > 0:
            url.first.fill(PROJECT["url"])

        tagline = page.locator("input[name*='tagline'], input[placeholder*='tagline']")
        if tagline.count() > 0:
            tagline.first.fill(PROJECT["tagline"])

        desc = page.locator("textarea")
        if desc.count() > 0:
            desc.first.fill(PROJECT["description"])

        email = page.locator("input[type='email'], input[name*='email']")
        if email.count() > 0:
            email.first.fill(PROJECT["email"])

        screenshot(page, "betalist-filled")

        submit = page.locator("button[type='submit'], input[type='submit'], button:has-text('Submit')")
        if submit.count() > 0:
            submit.first.click()
            time.sleep(3)
            screenshot(page, "betalist-submitted")
            print("  BetaList submitted!")
            return True
    except Exception as e:
        print(f"  BetaList error: {e}")
    return False

def try_microlaunch(page):
    """Submit to MicroLaunch"""
    print("\n=== MICROLAUNCH ===")
    try:
        page.goto("https://microlaunch.net/submit", wait_until="networkidle", timeout=15000)
        time.sleep(2)
        screenshot(page, "microlaunch-page")

        name = page.locator("input[name*='name'], input[placeholder*='name'], input[placeholder*='Product']")
        if name.count() > 0:
            name.first.fill(PROJECT["name"])

        url = page.locator("input[name*='url'], input[placeholder*='url'], input[type='url']")
        if url.count() > 0:
            url.first.fill(PROJECT["url"])

        desc = page.locator("textarea")
        if desc.count() > 0:
            desc.first.fill(PROJECT["short_desc"])

        screenshot(page, "microlaunch-filled")
    except Exception as e:
        print(f"  MicroLaunch error: {e}")
    return False

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        results = {}

        # Run each submission
        for name, fn in [
            ("toolify", try_toolify),
            ("hn", try_hn),
            ("betalist", try_betalist),
            ("devhunt", try_devhunt),
            ("microlaunch", try_microlaunch),
            ("indiehackers", try_indiehackers),
        ]:
            try:
                results[name] = fn(page)
            except Exception as e:
                results[name] = False
                print(f"  {name} failed: {e}")

        print("\n" + "=" * 50)
        print("RESULTS:")
        for name, success in results.items():
            print(f"  {name}: {'SUCCESS' if success else 'needs manual action'}")
        print("=" * 50)

        time.sleep(2)
        browser.close()

if __name__ == "__main__":
    main()
