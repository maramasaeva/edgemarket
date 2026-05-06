"""Automated web form interaction helper — resilient version"""
from playwright.sync_api import sync_playwright
import time, json

def run():
    tasks = json.loads(open("/Users/cartel/Desktop/copyscore/pw-tasks.json").read())

    with sync_playwright() as p:
        b = p.chromium.launch(headless=False, slow_mo=200)
        ctx = b.new_context(viewport={"width":1280,"height":800})

        for t in tasks:
            print(f"\n--- {t['name']} ---")
            pg = ctx.new_page()
            try:
                pg.goto(t["url"], wait_until="networkidle", timeout=25000)
                time.sleep(t["actions"][0].get("seconds", 3) if t["actions"] and t["actions"][0]["type"] == "wait" else 3)
                pg.screenshot(path=f"/Users/cartel/Desktop/copyscore/pw-{t['name']}-1.png")

                for action in t.get("actions", []):
                    try:
                        if action["type"] == "fill":
                            for sel in action["selector"].split(", "):
                                el = pg.locator(sel.strip())
                                if el.count() > 0 and el.first.is_visible():
                                    el.first.fill(action["value"])
                                    print(f"  filled: {sel.strip()[:50]}")
                                    break
                        elif action["type"] == "click":
                            for sel in action["selector"].split(", "):
                                el = pg.locator(sel.strip())
                                if el.count() > 0 and el.first.is_visible():
                                    el.first.click()
                                    print(f"  clicked: {sel.strip()[:50]}")
                                    time.sleep(2)
                                    break
                        elif action["type"] == "wait":
                            time.sleep(action.get("seconds", 2))
                    except Exception as e:
                        print(f"  action error: {str(e)[:80]}")

                pg.screenshot(path=f"/Users/cartel/Desktop/copyscore/pw-{t['name']}-2.png")
                print(f"  done: {pg.url}")
            except Exception as e:
                print(f"  page error: {str(e)[:80]}")
            finally:
                pg.close()

        time.sleep(1)
        b.close()

if __name__ == "__main__":
    run()
