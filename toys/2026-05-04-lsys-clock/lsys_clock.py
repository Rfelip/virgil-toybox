#!/usr/bin/env python3
"""L-systems clock — terminal toy.

Each minute is a different iteration depth of an L-system. The system itself
shifts hour-by-hour, so 24 distinct shapes mark a day. Time is encoded as
shape: a glance gives you the hour and minute without reading numbers.

Run:
  python3 lsys_clock.py            # live, updates every 5s
  python3 lsys_clock.py --frame 03 12   # one-shot for hour=3, minute=12
"""
from __future__ import annotations

import argparse
import math
import shutil
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime


# ---------- L-system core --------------------------------------------------

@dataclass
class LSystem:
    name: str
    axiom: str
    rules: dict[str, str]
    angle_deg: float
    initial_step: float = 1.0
    step_decay: float = 1.0  # multiplicative decay per draw step (used by some)

    def expand(self, n: int) -> str:
        s = self.axiom
        for _ in range(n):
            out = []
            for c in s:
                out.append(self.rules.get(c, c))
            s = "".join(out)
            # Cap to avoid runaway. Different terminals + iteration limits.
            if len(s) > 200_000:
                break
        return s


# ---------- 24 hour-aware L-system shapes ----------------------------------
#
# Hour selects the shape. Minute selects the iteration depth. A few classics
# and a few hand-tuned to keep the visual readable in a terminal.

PLANT = LSystem("plant", "X", {
    "X": "F-[[X]+X]+F[+FX]-X",
    "F": "FF",
}, angle_deg=22.5)

DRAGON = LSystem("dragon", "FX", {
    "X": "X+YF+",
    "Y": "-FX-Y",
}, angle_deg=90)

KOCH = LSystem("koch", "F", {
    "F": "F+F-F-F+F",
}, angle_deg=90)

SIERPINSKI = LSystem("sierpinski", "F-G-G", {
    "F": "F-G+F+G-F",
    "G": "GG",
}, angle_deg=120)

WAVE = LSystem("wave", "F", {
    "F": "F+F-F-F+F+F",
}, angle_deg=60)

LEAF = LSystem("leaf", "X", {
    "X": "F[+X][-X]FX",
    "F": "FF",
}, angle_deg=25)

FERN = LSystem("fern", "F", {
    "F": "F[+F]F[-F]F",
}, angle_deg=25.7)

BUSH = LSystem("bush", "Y", {
    "Y": "YFX[+Y][-Y]",
    "X": "X[-FFF][+FFF]FX",
}, angle_deg=25.7)

# 24 hours → cycle through these shapes with rotation
SHAPES = [PLANT, LEAF, FERN, BUSH, KOCH, WAVE, SIERPINSKI, DRAGON]


def shape_for_hour(h: int) -> tuple[LSystem, float]:
    """Return (shape, base-angle-rotation-degrees) for a given hour 0-23."""
    base = SHAPES[h % len(SHAPES)]
    # Rotate the seed angle by hour for variety. Wraps around 24h.
    rotation = (h / 24.0) * 360.0
    return base, rotation


def iterations_for_minute(m: int) -> int:
    """Map minute 0-59 to iteration depth. Higher minutes = deeper recursion.
    But cap iterations to avoid memory explosion.
    """
    # 5 minutes per iteration step → 0..11 iterations across the hour.
    # Most L-systems explode past iteration 6-7; cap at 6.
    return min(int(m / 5), 6) + 1  # 1..7


# ---------- Turtle interpretation → ascii canvas ---------------------------

@dataclass
class Canvas:
    w: int
    h: int
    grid: list[list[str]] = field(default_factory=list)

    def __post_init__(self):
        self.grid = [[" "] * self.w for _ in range(self.h)]

    def put(self, x: float, y: float, ch: str):
        ix, iy = int(round(x)), int(round(y))
        if 0 <= ix < self.w and 0 <= iy < self.h:
            self.grid[iy][ix] = ch

    def line(self, x0: float, y0: float, x1: float, y1: float, ch: str):
        # Bresenham-ish; emits ch along the line.
        steps = max(abs(int(x1 - x0)), abs(int(y1 - y0)), 1)
        for i in range(steps + 1):
            t = i / steps
            self.put(x0 + t * (x1 - x0), y0 + t * (y1 - y0), ch)

    def render(self) -> str:
        return "\n".join("".join(row) for row in self.grid)


def draw(lsys: LSystem, n: int, base_rotation: float, canvas: Canvas) -> None:
    """Walk the L-system string with turtle. Auto-fits to canvas."""
    s = lsys.expand(n)
    if not s:
        return

    # First pass: compute bbox in (x, y) using a unit step.
    x = y = 0.0
    a = math.radians(base_rotation - 90)  # start pointing up
    angle = math.radians(lsys.angle_deg)
    stack = []
    minx = maxx = miny = maxy = 0.0
    step = 1.0
    for c in s:
        if c in "FG":
            x += step * math.cos(a)
            y += step * math.sin(a)
            minx = min(minx, x); maxx = max(maxx, x)
            miny = min(miny, y); maxy = max(maxy, y)
        elif c == "+":
            a += angle
        elif c == "-":
            a -= angle
        elif c == "[":
            stack.append((x, y, a))
        elif c == "]":
            x, y, a = stack.pop()

    pad = 1.0
    span_x = (maxx - minx) + 2 * pad
    span_y = (maxy - miny) + 2 * pad
    if span_x == 0:
        span_x = 1
    if span_y == 0:
        span_y = 1
    scale = min((canvas.w - 2) / span_x, (canvas.h - 2) / span_y)
    ox = -minx + pad
    oy = -miny + pad

    # Second pass: draw, scaled.
    x = y = 0.0
    a = math.radians(base_rotation - 90)
    stack = []
    for c in s:
        if c in "FG":
            nx = x + math.cos(a)
            ny = y + math.sin(a)
            # Map to canvas (flip y so up is up)
            cx0 = (x + ox) * scale
            cy0 = (canvas.h - 1) - (y + oy) * scale
            cx1 = (nx + ox) * scale
            cy1 = (canvas.h - 1) - (ny + oy) * scale
            ch = "*" if c == "F" else "+"
            canvas.line(cx0, cy0, cx1, cy1, ch)
            x, y = nx, ny
        elif c == "+":
            a += angle
        elif c == "-":
            a -= angle
        elif c == "[":
            stack.append((x, y, a))
        elif c == "]":
            x, y, a = stack.pop()


# ---------- Render frame ---------------------------------------------------

ANSI_CLEAR = "\x1b[2J\x1b[H"
ANSI_DIM = "\x1b[2m"
ANSI_BOLD = "\x1b[1m"
ANSI_RESET = "\x1b[0m"
ANSI_GREEN = "\x1b[32m"
ANSI_CYAN = "\x1b[36m"
ANSI_GREY = "\x1b[90m"


def frame(now: datetime, term_w: int, term_h: int, color: bool) -> str:
    h, m, s = now.hour, now.minute, now.second
    shape, rotation = shape_for_hour(h)
    n = iterations_for_minute(m)

    canvas_w = max(20, term_w - 4)
    canvas_h = max(10, term_h - 5)
    c = Canvas(canvas_w, canvas_h)
    draw(shape, n, rotation, c)
    body = c.render()

    if color:
        # Color the asterisks green, branches grey, clock cyan
        body = body.replace("*", f"{ANSI_GREEN}*{ANSI_RESET}")
        body = body.replace("+", f"{ANSI_GREY}+{ANSI_RESET}")

    timestr = now.strftime("%H:%M:%S")
    caption = (f"{shape.name}  iter={n}  hour-rot={rotation:.0f}°  "
               f"angle={shape.angle_deg:.1f}°")
    if color:
        timestr_c = f"{ANSI_BOLD}{ANSI_CYAN}{timestr}{ANSI_RESET}"
        caption_c = f"{ANSI_DIM}{caption}{ANSI_RESET}"
    else:
        timestr_c = timestr
        caption_c = caption

    head = f" {timestr_c}   {caption_c}"
    return f"{ANSI_CLEAR}{head}\n\n{body}\n"


# ---------- Main loop ------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frame", nargs=2, type=int, metavar=("HOUR", "MINUTE"),
                    help="render one frame for the given hour/minute and exit")
    ap.add_argument("--no-color", action="store_true")
    ap.add_argument("--interval", type=float, default=5.0,
                    help="seconds between live updates")
    args = ap.parse_args()

    color = sys.stdout.isatty() and not args.no_color

    if args.frame:
        h, m = args.frame
        ts = datetime.now().replace(hour=h, minute=m, second=0, microsecond=0)
        cols, rows = shutil.get_terminal_size((80, 30))
        sys.stdout.write(frame(ts, cols, rows, color))
        return

    try:
        while True:
            cols, rows = shutil.get_terminal_size((80, 30))
            sys.stdout.write(frame(datetime.now(), cols, rows, color))
            sys.stdout.flush()
            time.sleep(args.interval)
    except KeyboardInterrupt:
        sys.stdout.write(ANSI_RESET + "\n")


if __name__ == "__main__":
    main()
