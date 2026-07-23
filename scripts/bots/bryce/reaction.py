"""
Bot for the Reaction Time game.

Game: file:///Users/bryce/aurp/scripts/bots/reaction_time.html
  - Screen starts BLUE ("Click to start").
  - First click -> RED ("Wait for green...").
  - After a random 1-4s delay it flips to GREEN ("CLICK!") and starts a timer.
  - Clicking while green records your reaction time in milliseconds. Lower = better.

How this bot wins:
  A human reacts in ~200ms (eyes -> brain -> finger). This bot injects a tiny
  detector loop INTO the browser page. The instant the box turns green, it clicks
  in the *same* event-loop tick -- so reaction times come out around 0-1ms.

  The key to being fast is that the detect-and-click happens entirely inside the
  page (via page.evaluate). We never round-trip to Python to decide when to click,
  because that network/IPC hop alone would cost several milliseconds.

Run it:
  cd /Users/bryce/aurp/scripts/bots
  .venv/bin/python bryce/reaction.py            # watch it play 10 rounds
  .venv/bin/python bryce/reaction.py --rounds 25
  .venv/bin/python bryce/reaction.py --headless # no visible window, same result
"""

import argparse
import re
import statistics
from pathlib import Path

from playwright.sync_api import sync_playwright

# Point at the game HTML file regardless of where you run this from.
GAME_FILE = Path(__file__).resolve().parents[1] / "reaction_time.html"
GAME_URL = GAME_FILE.as_uri()

# When the box is green the game sets background-color: #4bdb6a, which the browser
# reports as this exact rgb() string. That's what we watch for.
GREEN_RGB = "rgb(75, 219, 106)"

# This runs INSIDE the browser. It:
#   1. Starts a "click to start" -> the box goes red and the game arms its 1-4s timer.
#   2. Polls as fast as the event loop allows using a MessageChannel ("zero-delay"
#      scheduler -- faster than setTimeout(0), which browsers clamp to ~4ms).
#   3. The instant the box is green, it clicks and reads back the reported time.
# It yields between polls so the game's own timer is free to fire, then we catch the
# green transition one task-hop later -> sub-millisecond reaction time.
DETECT_AND_CLICK_JS = """
() => new Promise((resolve) => {
    const box = document.getElementById('box');
    const message = document.getElementById('message');
    const GREEN = 'rgb(75, 219, 106)';

    // Make sure we're on the blue "waiting" screen, then click to arm the round.
    if (box.style.backgroundColor === GREEN) box.click();   // finish a stray green
    box.click();  // waiting -> red (arms the random 1-4s timer)

    // A scheduler that reschedules us on the very next task with no clamp delay.
    const channel = new MessageChannel();
    let pending = null;
    channel.port1.onmessage = () => { const cb = pending; pending = null; cb(); };
    const soon = (cb) => { pending = cb; channel.port2.postMessage(0); };

    function poll() {
        if (box.style.backgroundColor === GREEN) {
            box.click();                 // GREEN -> click immediately, same tick
            resolve(message.innerText);  // "Time: N ms\\nClick to go again"
        } else {
            soon(poll);                  // not green yet, check again ASAP
        }
    }
    poll();
});
"""


def play_round(page):
    """Play one round and return the reaction time in ms (or None if unreadable)."""
    result_text = page.evaluate(DETECT_AND_CLICK_JS)
    match = re.search(r"(\d+)\s*ms", result_text)
    return int(match.group(1)) if match else None


def main():
    parser = argparse.ArgumentParser(description="Reaction Time game bot")
    parser.add_argument("--rounds", type=int, default=10, help="how many rounds to play")
    parser.add_argument("--headless", action="store_true", help="hide the browser window")
    parser.add_argument(
        "--pause",
        type=float,
        default=2.0,
        help="seconds to linger on each score so you can read it (default: 2.0)",
    )
    args = parser.parse_args()

    print(f"Loading game: {GAME_URL}")
    times = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        page = browser.new_page()
        page.goto(GAME_URL)

        for i in range(1, args.rounds + 1):
            ms = play_round(page)
            if ms is None:
                print(f"  Round {i:>2}: (couldn't read time)")
                continue
            times.append(ms)
            print(f"  Round {i:>2}: {ms} ms")

            # Linger on the score so you can read it in the window before the next
            # round arms (which clears the message). The final score stays up too.
            if args.pause > 0:
                page.wait_for_timeout(args.pause * 1000)

        browser.close()

    if times:
        print("\n--- Results ---")
        print(f"Best:    {min(times)} ms")
        print(f"Average: {statistics.mean(times):.1f} ms")
        print(f"Worst:   {max(times)} ms")


if __name__ == "__main__":
    main()
