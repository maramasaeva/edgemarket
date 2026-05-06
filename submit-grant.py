from playwright.sync_api import sync_playwright
import time

FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfXuEzmiAzRhie_z9raFCF1BXweXgVt18o-DvBuRRgyTygL2A/viewform"

FIELDS = {
    "Nominator Name": "Mara Masaeva",
    "Project Name": "EDGEMARKET",
    "Project URL": "https://copyscore-lovat.vercel.app",
    "Project Twitter": "@perseverancier",
    "Project Farcaster": "edgemarket",
    "Builder Twitter": "@perseverancier",
    "Builder Farcaster": "perseverancier",
}

WHY_TEXT = (
    "EDGEMARKET is the first crypto dashboard built entirely by an autonomous AI agent "
    "(Claude Opus 4.6) in a single session — zero human code. It features live prices for "
    "top 20 coins, a gas tracker, whale transaction alerts, a wallet P&L checker, token "
    "converter, and Fear & Greed index. The agent generated its own ETH wallet and deployed "
    "everything to production autonomously. This is a proof of concept for AI economic agency: "
    "an agent that builds useful tools, deploys them, and can receive payment on-chain. A Base "
    "grant would fund the first AI-owned treasury from a grant program, and we plan to deploy "
    "Base-native features including on-chain analytics and Base gas tracking. The tool is live, "
    "free, and serves real users today."
)

DEMO_URL = "https://copyscore-lovat.vercel.app/story"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto(FORM_URL, wait_until="networkidle")
    time.sleep(3)

    # Fill text fields in order
    inputs = page.locator('input[type="text"]')
    count = inputs.count()
    print(f"Found {count} text inputs")

    field_values = list(FIELDS.values()) + [DEMO_URL]
    for i in range(min(count, len(field_values))):
        inputs.nth(i).click()
        inputs.nth(i).fill(field_values[i])
        print(f"Filled input {i}: {field_values[i][:50]}")

    # Fill textareas
    textareas = page.locator("textarea")
    ta_count = textareas.count()
    print(f"Found {ta_count} textareas")
    if ta_count > 0:
        textareas.first.click()
        textareas.first.fill(WHY_TEXT)
        print("Filled why textarea")

    # Select radio - try to find "planning" or pick the third option
    time.sleep(1)
    radios = page.locator('[role="radio"]')
    radio_count = radios.count()
    print(f"Found {radio_count} radio buttons")
    for i in range(radio_count):
        try:
            parent = radios.nth(i).locator("..").locator("..")
            label = parent.inner_text()
            print(f"  Radio {i}: {label[:60]}")
            if "planning" in label.lower() or "but" in label.lower():
                radios.nth(i).click()
                print(f"  -> Selected!")
                break
        except Exception:
            pass
    else:
        if radio_count >= 3:
            radios.nth(2).click()
            print("Selected third radio (planning to build on Base)")

    # Check all checkboxes
    time.sleep(0.5)
    checkboxes = page.locator('[role="checkbox"]')
    cb_count = checkboxes.count()
    print(f"Found {cb_count} checkboxes")
    for i in range(cb_count):
        checkboxes.nth(i).click()
        time.sleep(0.3)
        print(f"Checked checkbox {i}")

    # Screenshot before submit
    time.sleep(1)
    page.screenshot(path="/Users/cartel/Desktop/copyscore/grant-form-filled.png", full_page=True)
    print("Screenshot saved: grant-form-filled.png")

    # Find and click submit button
    time.sleep(1)
    submit = page.locator('[role="button"]:has-text("Verzenden"), [role="button"]:has-text("Submit")')
    if submit.count() > 0:
        submit.first.click()
        print("Clicked submit!")
        time.sleep(5)
        page.screenshot(path="/Users/cartel/Desktop/copyscore/grant-form-submitted.png", full_page=True)
        print("Post-submit screenshot saved")
    else:
        # Try the generic submit approach
        buttons = page.locator('[role="button"]')
        btn_count = buttons.count()
        print(f"Found {btn_count} buttons, looking for submit...")
        for i in range(btn_count):
            txt = buttons.nth(i).inner_text()
            print(f"  Button {i}: {txt}")
            if "verzend" in txt.lower() or "submit" in txt.lower() or "indienen" in txt.lower():
                buttons.nth(i).click()
                print(f"  -> Clicked submit: {txt}")
                time.sleep(5)
                page.screenshot(path="/Users/cartel/Desktop/copyscore/grant-form-submitted.png", full_page=True)
                break

    time.sleep(2)
    browser.close()
    print("Done!")
