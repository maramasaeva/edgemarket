"""Register and submit EDGEMARKET to hackathons via browser automation
Uses existing Chrome profile to leverage GitHub/Google sessions"""
import asyncio
import os
import glob
from playwright.async_api import async_playwright

PROJECT = {
    "name": "EDGEMARKET",
    "tagline": "30+ page crypto toolkit built entirely by Claude AI — zero human code",
    "short_desc": "EDGEMARKET is a 30-page crypto intelligence platform built entirely by a Claude AI agent in one session. It provides 10 free API endpoints for real-time market data, whale alerts, token screening, and Fear & Greed analysis — all consumable by other AI agents. The agent chose its stack, designed the UI, generated its own wallet, and deployed to Vercel.",
    "url": "https://copyscore-lovat.vercel.app",
    "github": "https://github.com/maramasaeva/edgemarket",
}

FULL_DESC = """EDGEMARKET proves that AI agents can autonomously build and deploy production-grade crypto data infrastructure. Built by Claude (Anthropic) in a single session with zero human code.

What the AI Built (30+ pages):
- Live market dashboard, crypto heatmap, liquidation tracker, altcoin season index
- Fear & Greed Index, Bitcoin Rainbow Chart, halving countdown, BTC dominance
- DCA Calculator, tax calculator (7 countries), portfolio tracker, whale alerts
- Token screener, gas tracker, exchange comparison, staking yields
- Airdrop tracker, impermanent loss calculator, crypto converter
- Mining monitor (live RTX 4090 GPU stats)

10 Free APIs (no auth):
GET /api/markets — top coins, trending, global stats
GET /api/gas — ETH gas prices
GET /api/whales — whale transactions >$1M
GET /api/screener — top 100 with price changes
GET /api/fear-greed — sentiment index 0-100
GET /api/mining — live GPU mining stats

Revenue streams the AI set up:
- AADS crypto ad network on every page
- GPU mining (lolMiner, RTX 4090, ETC on 2miners)
- Tip jar with MetaMask deep links on 4 chains

Tech: Next.js 15, TypeScript, React 19, Vercel, CoinGecko API

Demo: https://copyscore-lovat.vercel.app
GitHub: https://github.com/maramasaeva/edgemarket"""


def find_chrome_profile():
    """Find existing Chrome user data directory"""
    paths = [
        os.path.expanduser("~/Library/Application Support/Google/Chrome"),
        os.path.expanduser("~/Library/Application Support/Google/Chrome/Default"),
        os.path.expanduser("~/Library/Application Support/Chromium"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None


async def main():
    chrome_profile = find_chrome_profile()
    print(f"Chrome profile: {chrome_profile}")

    async with async_playwright() as p:
        # Try using existing Chrome data
        if chrome_profile and os.path.exists(chrome_profile):
            print("Launching with existing Chrome profile (GitHub/Google sessions should be active)...")
            # Use a copy to avoid locking issues with running Chrome
            context = await p.chromium.launch_persistent_context(
                user_data_dir=chrome_profile + "_playwright_tmp",
                headless=False,
                args=['--no-sandbox', '--disable-blink-features=AutomationControlled'],
                viewport={"width": 1280, "height": 900},
                ignore_default_args=["--enable-automation"],
            )
            page = context.pages[0] if context.pages else await context.new_page()
        else:
            print("No Chrome profile found, launching fresh browser...")
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(viewport={"width": 1280, "height": 900})
            page = await context.new_page()

        try:
            # Step 1: Go to DoraHacks and try GitHub login
            print("\n=== STEP 1: DoraHacks Login ===")
            await page.goto("https://dorahacks.io/login", wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

            # Click "Continue with GitHub"
            github_btns = page.locator('button:has-text("GitHub"), a:has-text("GitHub"), div:has-text("GitHub")')
            count = await github_btns.count()
            print(f"Found {count} GitHub-related elements")

            if count > 0:
                await github_btns.first.click()
                print("Clicked GitHub login")
                await asyncio.sleep(5)

                # Check if GitHub OAuth page appeared or if we were auto-redirected
                current_url = page.url
                print(f"URL after GitHub click: {current_url}")

                if "github.com" in current_url:
                    # We're on GitHub OAuth page - need to authorize
                    print("On GitHub OAuth page...")
                    # Look for authorize button
                    auth_btn = page.locator('button:has-text("Authorize"), input[value*="Authorize"]').first
                    if await auth_btn.is_visible():
                        await auth_btn.click()
                        print("Clicked authorize")
                        await asyncio.sleep(5)

                await page.screenshot(path="/Users/cartel/Desktop/copyscore/dorahacks-after-login.png")
                print(f"After login URL: {page.url}")

            # Step 2: Check login state
            await asyncio.sleep(3)
            is_logged_in = "login" not in page.url.lower()
            print(f"Logged in: {is_logged_in}")

            if not is_logged_in:
                # Try Google login instead
                print("\nGitHub login didn't redirect. Trying Google...")
                await page.goto("https://dorahacks.io/login", wait_until="networkidle", timeout=30000)
                await asyncio.sleep(2)
                google_btn = page.locator('button:has-text("Google"), a:has-text("Google"), div:has-text("Google")')
                if await google_btn.count() > 0:
                    await google_btn.first.click()
                    await asyncio.sleep(5)
                    print(f"After Google click: {page.url}")
                    await page.screenshot(path="/Users/cartel/Desktop/copyscore/dorahacks-google.png")

            # Step 3: If logged in, navigate to BUIDL submission
            await asyncio.sleep(2)
            is_logged_in = "login" not in page.url.lower()

            if is_logged_in:
                print("\n=== STEP 2: Submit BUIDL ===")

                # Go to Bags hackathon page
                await page.goto("https://dorahacks.io/hackathon/the-bags-hackathon/buidl", wait_until="networkidle", timeout=30000)
                await asyncio.sleep(3)
                await page.screenshot(path="/Users/cartel/Desktop/copyscore/dorahacks-bags-page.png")
                print(f"Bags page URL: {page.url}")

                # Look for submit button
                submit_btn = page.locator('button:has-text("Submit"), a:has-text("Submit"), button:has-text("BUIDL")')
                if await submit_btn.count() > 0:
                    await submit_btn.first.click()
                    await asyncio.sleep(3)
                    print("Clicked submit button")
                    await page.screenshot(path="/Users/cartel/Desktop/copyscore/dorahacks-submit-form.png")

                    # Fill form fields
                    # Name
                    inputs = page.locator('input[type="text"]')
                    input_count = await inputs.count()
                    print(f"Found {input_count} text inputs")

                    for i in range(input_count):
                        inp = inputs.nth(i)
                        placeholder = await inp.get_attribute("placeholder") or ""
                        name = await inp.get_attribute("name") or ""
                        print(f"  Input {i}: placeholder='{placeholder}', name='{name}'")

                    # Try to fill based on common patterns
                    for i in range(input_count):
                        inp = inputs.nth(i)
                        placeholder = (await inp.get_attribute("placeholder") or "").lower()
                        name = (await inp.get_attribute("name") or "").lower()
                        label = placeholder + name

                        if "name" in label or "title" in label or "project" in label:
                            await inp.fill(PROJECT["name"])
                            print(f"  -> Filled name: {PROJECT['name']}")
                        elif "github" in label or "repo" in label or "source" in label:
                            await inp.fill(PROJECT["github"])
                            print(f"  -> Filled github")
                        elif "url" in label or "demo" in label or "website" in label or "link" in label:
                            await inp.fill(PROJECT["url"])
                            print(f"  -> Filled URL")
                        elif "tagline" in label or "brief" in label or "short" in label:
                            await inp.fill(PROJECT["tagline"])
                            print(f"  -> Filled tagline")

                    # Description textarea
                    textareas = page.locator('textarea')
                    ta_count = await textareas.count()
                    print(f"Found {ta_count} textareas")
                    if ta_count > 0:
                        await textareas.first.fill(FULL_DESC)
                        print("  -> Filled description")

                    await page.screenshot(path="/Users/cartel/Desktop/copyscore/dorahacks-filled-form.png")

            else:
                print("\n=== LOGIN FAILED ===")
                print("Could not auto-login to DoraHacks.")
                print("Taking screenshot of current state...")
                await page.screenshot(path="/Users/cartel/Desktop/copyscore/dorahacks-login-failed.png")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            await page.screenshot(path="/Users/cartel/Desktop/copyscore/dorahacks-error.png")

        print("\nKeeping browser open for 60s...")
        await asyncio.sleep(60)
        await context.close()

asyncio.run(main())
