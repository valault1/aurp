#!/usr/bin/env python3
"""Dino Game bot.

High Score: 209

Game URL: https://dinosaurgame-free.io/

Uses mss for fast screen capture and pyautogui for clicking (jumping).
"""

import sys
import time

import mss
import pyautogui

# Eliminate artificial latency
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False

def physical_bbox(x, y, logical_width=11):
    """Convert logical coordinates to physical bbox for mss."""
    with mss.MSS() as sct:
        phys_w = sct.monitors[1]["width"]
    logical_w = pyautogui.size().width
    scale = phys_w / logical_w
    
    left_x = x - (logical_width // 2)
    return {
        "left": int(left_x * scale),
        "top": int(y * scale),
        "width": int(logical_width * scale),
        "height": int(1 * scale),
    }

def color_diff(r1, g1, b1, r2, g2, b2):
    """Calculate absolute difference between two colors."""
    return abs(r1 - r2) + abs(g1 - g2) + abs(b1 - b2)

def main():
    print("Dino Game Bot Setup")
    print("-------------------")
    
    input("Hover over the spot just in front of the Dino (where obstacles appear) and press Enter... ")
    x, y = pyautogui.position()
    print(f"  Recorded Point: ({x}, {y})")
    
    # We grab an 11 pixel wide horizontal line (5px left, center, 5px right)
    bbox = physical_bbox(x, y, logical_width=11)

    print("\nStarting in 3 seconds... Switch to the game window!")
    for i in range(3, 0, -1):
        print(f"{i}...")
        time.sleep(1)
    
    with mss.MSS() as sct:
        # Read the initial background color from the first pixel of the row
        raw = sct.grab(bbox).raw
        bg_b, bg_g, bg_r = raw[0], raw[1], raw[2]
        print(f"Initial background color: R:{bg_r} G:{bg_g} B:{bg_b}")
        print("GO! (Press Ctrl+C in this terminal to stop)")

        grab = sct.grab
        
        try:
            while True:
                raw = grab(bbox).raw
                num_pixels = len(raw) // 4
                
                jump = False
                for i in range(num_pixels):
                    idx = i * 4
                    b, g, r = raw[idx], raw[idx+1], raw[idx+2]
                    
                    # If any pixel in the line changes significantly, we found an obstacle!
                    if color_diff(r, g, b, bg_r, bg_g, bg_b) > 50:
                        jump = True
                        break
                        
                if jump:
                    # Click to jump
                    pyautogui.click()
                    
                    # Sleep to avoid double-jumping for the same obstacle
                    time.sleep(0.1)
                    
                    # Wait for ALL pixels to return to the background color
                    while True:
                        raw = grab(bbox).raw
                        clear = True
                        for i in range(len(raw) // 4):
                            idx = i * 4
                            b, g, r = raw[idx], raw[idx+1], raw[idx+2]
                            if color_diff(r, g, b, bg_r, bg_g, bg_b) > 50:
                                clear = False
                                break
                        if clear:
                            break
                        
        except KeyboardInterrupt:
            print("\nStopped.")

if __name__ == "__main__":
    main()

