#!/usr/bin/env python3
"""Piano Tiles bot.

High Score: 280 (would go infinitely)

Game URL: https://www.primarygames.com/arcade/music/pianotiles/

Uses mss for fast screen capture and pyautogui for clicking.
"""

import sys
import time

import mss
import pyautogui

# Eliminate artificial latency
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False

def is_black(r, g, b):
    """Detect if a pixel is dark enough to be a black tile."""
    return r < 50 and g < 50 and b < 50

def physical_bbox(x, y, w, h):
    """Convert logical coordinates to physical bbox for mss."""
    with mss.mss() as sct:
        phys_w = sct.monitors[1]["width"]
    logical_w = pyautogui.size().width
    scale = phys_w / logical_w
    return {
        "left": int(x * scale),
        "top": int(y * scale),
        "width": int(w * scale),
        "height": int(h * scale),
    }, scale

def main():
    print("Piano Tiles Bot Setup")
    print("---------------------")
    
    input("Hover over the TOP-LEFT corner of the 4 lanes and press Enter... ")
    tl_x, tl_y = pyautogui.position()
    print(f"  Recorded Top-Left: ({tl_x}, {tl_y})")
    
    input("Hover over the BOTTOM-RIGHT corner of the 4 lanes and press Enter... ")
    br_x, br_y = pyautogui.position()
    print(f"  Recorded Bottom-Right: ({br_x}, {br_y})")

    input("Hover over the Y-coordinate where tiles should be clicked (detection line) and press Enter... ")
    _, click_y = pyautogui.position()
    print(f"  Recorded Click Y: {click_y}")

    logical_w = br_x - tl_x
    if logical_w <= 0:
        print("Error: Invalid width. Top-left X must be less than bottom-right X.")
        return

    # Capture a 1-pixel high line spanning the width of the game
    bbox, scale = physical_bbox(tl_x, click_y, logical_w, 1)
    
    lane_width = logical_w / 4
    # The X offsets (logical) of the center of each lane relative to tl_x
    offsets_logical = [(lane_width * i) + (lane_width / 2) for i in range(4)]
    
    # Physical offsets within the 1D raw pixel array
    offsets_physical = [int(off * scale) for off in offsets_logical]

    # The actual click coordinates (logical)
    click_coords = [(int(tl_x + off), int(click_y)) for off in offsets_logical]

    print("\nCalibration Complete!")
    print(f"Lane click coordinates: {click_coords}")
    
    print("\nStarting in 3 seconds... Switch to the game window!")
    for i in range(3, 0, -1):
        print(f"{i}...")
        time.sleep(1)
    print("GO! (Press Ctrl+C in this terminal to stop)")

    state = [False, False, False, False]

    try:
        with mss.mss() as sct:
            grab = sct.grab
            while True:
                # Grab the single horizontal line of pixels
                raw = grab(bbox).raw
                
                for i in range(4):
                    # raw format is BGRA, 4 bytes per physical pixel
                    idx = offsets_physical[i] * 4
                    if idx + 2 < len(raw):
                        b, g, r = raw[idx], raw[idx+1], raw[idx+2]
                        black = is_black(r, g, b)
                        
                        # Only click when it transitions from not-black to black
                        if black and not state[i]:
                            pyautogui.click(x=click_coords[i][0], y=click_coords[i][1])
                        
                        state[i] = black
    except KeyboardInterrupt:
        print("\nStopped.")

if __name__ == "__main__":
    main()
