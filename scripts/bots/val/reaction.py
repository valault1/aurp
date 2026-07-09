#!/usr/bin/env python3
"""Reaction Time bot.

High Score: 20 ms

Game: file:///Users/val/src/aurp/scripts/bots/reaction_time.html
The screen starts blue, turns RED after you click to arm it, then flips to
GREEN after a random delay. Goal: click the instant it turns green.

Latency strategy (the whole point of this bot)
----------------------------------------------
The bottleneck in "watch the screen, then click" is *reading the screen*.

  * pyautogui.pixel() / .screenshot() capture the ENTIRE display every call
    (tens of milliseconds on a Retina Mac) -> far too slow to react well.
  * mss grabs an arbitrary rectangle via macOS's native CoreGraphics capture.
    When that rectangle is only a few pixels, each grab is well under 1 ms.

So we point mss at a tiny box over the game and poll it in a *tight busy loop*
with no sleep(). Each grab is a blocking syscall that already yields the CPU,
so this won't "freeze" anything -- and dropping the sleep is what keeps
detection latency down to a single loop iteration (~3 ms, measured -- mss's
CGWindowListCreateImage call has a fixed cost that doesn't shrink much below
that, regardless of how tiny the region is).

The other half of the story: how we click. `pyautogui.click()` measures ~12 ms
per call on this machine -- it does failsafe checks, tween/easing setup for
the move, and other pure-Python bookkeeping on every call. A raw Quartz
CGEventPost mouse-down/up (the same primitive pyautogui itself eventually
calls) measures ~0.3 ms. Since we already pre-position the mouse before the
round starts, the hot path doesn't need pyautogui's move logic at all -- just
the click -- so we bypass it and post the CGEvents directly. That one swap
saves roughly the same amount of time as the entire screen-poll loop costs.

Color detection
---------------
Blue  #2b87d1 -> (r,g,b) = (43,135,209)
Red   #ce2636 -> (206, 38,  54)
Green #4bdb6a -> ( 75,219, 106)

Green is the only state where the green channel is the largest, i.e.
    g > r  AND  g > b
That test is robust to exact shades / anti-aliasing and never fires on blue or
red, so we don't need precise color matching.

Setup (macOS)
-------------
Grant the terminal running this two permissions in System Settings > Privacy:
  * Screen Recording  (so mss can read the pixels)
  * Accessibility     (so pyautogui can move/click the mouse)

Run:
    scripts/bots/.venv/bin/python scripts/bots/val/reaction.py [rounds]
"""

import sys
import time

import mss
import pyautogui
import Quartz

# --- pyautogui tuning: strip out every source of artificial latency ---------
pyautogui.PAUSE = 0         # no automatic pause after each call
pyautogui.FAILSAFE = False  # don't abort if the cursor hits a screen corner

# Size (in physical pixels) of the box we capture. A few px is plenty.
SAMPLE = 6


def is_green(r, g, b):
    """Green is the only game state where the green channel dominates."""
    return g > r and g > b


def fast_click(x, y):
    """Post a left-click directly via Quartz, skipping pyautogui's overhead.

    pyautogui.click() measures ~12 ms/call here (failsafe checks, tweening
    setup, ...). CGEventPost measures ~0.3 ms. Since the mouse is already
    parked at (x, y) before we start watching for green, we only need the
    down/up events -- no move logic -- so we go straight to the OS primitive.
    """
    down = Quartz.CGEventCreateMouseEvent(
        None, Quartz.kCGEventLeftMouseDown, (x, y), Quartz.kCGMouseButtonLeft
    )
    up = Quartz.CGEventCreateMouseEvent(
        None, Quartz.kCGEventLeftMouseUp, (x, y), Quartz.kCGMouseButtonLeft
    )
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, down)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)


def pick_point():
    """Hover the mouse over the game; use that spot to both sample and click.

    Put it anywhere on the colored background that is NOT over the center text,
    so we read a clean, solid color.
    """
    input(
        "\nOpen the game, hover the mouse over the colored area\n"
        "(away from the center text), and press Enter... "
    )
    x, y = pyautogui.position()  # logical coordinates
    print(f"  using screen point ({x}, {y})")
    return x, y


def physical_bbox(x, y):
    """Convert logical pyautogui coords -> an mss bbox in physical pixels.

    On a Retina display the logical coordinate space (pyautogui) is half the
    physical pixel grid (mss). Derive the scale from the two reported widths so
    this works on Retina and non-Retina alike.
    """
    with mss.mss() as sct:
        phys_w = sct.monitors[1]["width"]
    logical_w = pyautogui.size().width
    scale = phys_w / logical_w
    return {
        "left": int(x * scale),
        "top": int(y * scale),
        "width": SAMPLE,
        "height": SAMPLE,
    }


def read_rgb(sct, bbox):
    """Grab the box and return the top-left pixel as (r, g, b)."""
    raw = sct.grab(bbox).raw  # BGRA bytes, first pixel first
    return raw[2], raw[1], raw[0]


def wait_for_green(sct, bbox):
    """Tight busy-loop until the box turns green (returns immediately)."""
    grab = sct.grab  # local ref: skip the attribute lookup in the hot loop
    while True:
        raw = grab(bbox).raw
        if is_green(raw[2], raw[1], raw[0]):
            return


def wait_until(sct, bbox, predicate, timeout=5.0):
    """Poll until predicate(r,g,b) is true, or timeout. Used between rounds."""
    grab = sct.grab
    deadline = time.perf_counter() + timeout
    while time.perf_counter() < deadline:
        raw = grab(bbox).raw
        if predicate(raw[2], raw[1], raw[0]):
            return True
    return False


def main():
    rounds = int(sys.argv[1]) if len(sys.argv) > 1 else 5

    x, y = pick_point()
    bbox = physical_bbox(x, y)

    with mss.mss() as sct:
        # Sanity check: confirm we're reading the game, not the desktop. If the
        # RGB below looks like your wallpaper, the terminal is missing Screen
        # Recording permission (mss silently returns the desktop behind it).
        r, g, b = read_rgb(sct, bbox)
        print(f"  reading color at that spot: R:{r} G:{g} B:{b}")

        print(f"\nRunning {rounds} round(s). Bring the browser to the front.")
        for i in range(3, 0, -1):
            print(f"  starting in {i}...")
            time.sleep(1)

        times = []
        for n in range(1, rounds + 1):
            # Park on our spot and arm the round (blue -> red).
            pyautogui.moveTo(x, y)
            fast_click(x, y)
            time.sleep(0.15)  # let it settle to red before we watch for green

            # Hot path: wait for green, then click as fast as possible.
            wait_for_green(sct, bbox)
            t0 = time.perf_counter()
            fast_click(x, y)
            dt = (time.perf_counter() - t0) * 1000
            times.append(dt)
            print(f"  round {n}: detect->click {dt:.1f} ms")

            # Wait for green to clear (back to the blue result screen) before
            # arming the next round.
            wait_until(sct, bbox, lambda r, g, b: not is_green(r, g, b))
            time.sleep(0.3)

    if times:
        print(f"\navg detect->click: {sum(times) / len(times):.1f} ms")
    print("done. (the game's on-screen number is your true reaction time)")


if __name__ == "__main__":
    main()
