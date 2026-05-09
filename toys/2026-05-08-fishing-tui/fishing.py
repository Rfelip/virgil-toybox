#!/usr/bin/env python3
"""
Fishing Problem TUI — a hands-on intuition pump for bang-singular-bang control.

You're managing a fish population x(t) ∈ [0, 1]. Each timestep k=0..K-1, you
choose harvest intensity u_k ∈ {0, ½, 1}. Population evolves as

    dx/dt = x*(1 - x) - u*x        (logistic growth minus harvest)

Reward is ∫₀ᵀ u*x dt. Ruler is a back-projected ghost showing the optimal
control: bang (u=1) until t=t_s, singular at u=½ ish until late, then bang
back to u=0 to let stocks recover. (Approximate, deterministic version.)

Controls:
    ← →  move cursor
    SPACE   toggle u between {0, ½, 1}
    0/1/m   set u to 0 / 1 / 0.5
    g       toggle ghost (optimal reference)
    r       reset to all-0.5
    q       quit

Pure stdlib. No fishing problem dependencies. Runs in any terminal.
"""

from __future__ import annotations
import curses
import os
import sys

PB_PATH = os.path.expanduser("~/.local/share/virgil-fishing-tui-best")


def load_best() -> float:
    try:
        with open(PB_PATH) as f:
            return float(f.read().strip())
    except Exception:
        return 0.0


def save_best(r: float) -> None:
    try:
        os.makedirs(os.path.dirname(PB_PATH), exist_ok=True)
        with open(PB_PATH, "w") as f:
            f.write(f"{r:.6f}\n")
    except Exception:
        pass

# Problem constants (matches Ruan's deterministic fishing baseline)
T_HORIZON = 10.0
K = 20
DT = T_HORIZON / K
X0 = 0.4   # initial stock
U_LEVELS = [0.0, 0.5, 1.0]


def integrate(u: list[float], x0: float = X0) -> tuple[list[float], float]:
    """RK4 forward integrate dx/dt = x(1-x) - u*x; return trajectory + cum reward."""
    f = lambda x, uu: x * (1 - x) - uu * x
    x = x0
    traj = [x]
    reward = 0.0
    for k in range(K):
        uk = u[k]
        # 4 substeps per control step for accuracy
        h = DT
        k1 = f(x, uk)
        k2 = f(x + 0.5 * h * k1, uk)
        k3 = f(x + 0.5 * h * k2, uk)
        k4 = f(x + h * k3, uk)
        x = x + (h / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)
        x = max(0.0, min(1.0, x))
        traj.append(x)
        reward += uk * x * h
    return traj, reward


_ghost_cache: list[float] | None = None


def optimal_ghost() -> list[float]:
    """Best 3-segment bang-singular-bang policy under K=20 grid.

    Search over (k1, k2, u_low, u_mid, u_high) where:
      - u = u_low for k < k1
      - u = u_mid for k1 ≤ k < k2
      - u = u_high for k ≥ k2
    The bang-singular-bang shape emerges from the search; we don't hard-code it.
    """
    global _ghost_cache
    if _ghost_cache is not None:
        return list(_ghost_cache)

    best_r = -1e9
    best_u = [0.5] * K
    levels = [0.0, 0.25, 0.5, 0.75, 1.0]
    for k1 in range(0, K):
        for k2 in range(k1, K + 1):
            for u_lo in levels:
                for u_mid in levels:
                    for u_hi in levels:
                        u = [u_lo] * k1 + [u_mid] * (k2 - k1) + [u_hi] * (K - k2)
                        _, r = integrate(u)
                        if r > best_r:
                            best_r = r
                            best_u = u
    _ghost_cache = best_u
    return list(best_u)


def bar_h(val: float, height: int) -> int:
    return int(round(max(0.0, min(1.0, val)) * height))


def draw(stdscr, u: list[float], cur: int, show_ghost: bool):
    stdscr.erase()
    h, w = stdscr.getmaxyx()
    if h < 18 or w < 60:
        stdscr.addstr(0, 0, "Terminal too small — need ≥ 60×18.")
        stdscr.refresh()
        return

    # Header
    stdscr.addstr(0, 0, "FISHING PROBLEM TUI — bang-singular-bang puzzle", curses.A_BOLD)
    stdscr.addstr(1, 0, "←/→ move · SPACE cycle · 0/1/m set · g ghost · r reset · q quit")

    # Compute current trajectory + reward
    traj, reward = integrate(u)
    g = optimal_ghost()
    g_traj, g_reward = integrate(g)

    # Trajectory plot — population x(t) over time, top half
    plot_top = 3
    plot_h = 8
    plot_w = max(20, min(w - 6, K * 3))
    cell_w = plot_w / K

    # Y axis labels
    stdscr.addstr(plot_top + 0, 0, "1.0 ┤")
    stdscr.addstr(plot_top + plot_h // 2, 0, "0.5 ┤")
    stdscr.addstr(plot_top + plot_h, 0, "0.0 ┤")
    # Plot trajectory
    for k in range(K + 1):
        col = 6 + int(k * cell_w)
        if col >= w - 1:
            break
        # Ghost traj first so player overlay reads on top
        if show_ghost:
            grow = plot_top + plot_h - bar_h(g_traj[k], plot_h)
            try:
                stdscr.addch(grow, col, "·", cp(CP_GHOST) | curses.A_DIM)
            except curses.error:
                pass
        # Player traj
        row = plot_top + plot_h - bar_h(traj[k], plot_h)
        try:
            stdscr.addch(row, col, "●", cp(CP_PLAYER) | curses.A_BOLD)
        except curses.error:
            pass

    stdscr.addstr(plot_top + plot_h + 1, 0, "    " + "─" * (plot_w + 2))
    stdscr.addstr(plot_top + plot_h + 2, 0, "      x(t)  population trajectory" + ("  (ghost = singular reference)" if show_ghost else ""))

    # Ghost control row (above your row, faint)
    ctrl_top = plot_top + plot_h + 4
    if show_ghost:
        stdscr.addstr(ctrl_top, 0, "ref:", cp(CP_GHOST) | curses.A_DIM)
        for k in range(K):
            col = 6 + int(k * cell_w)
            if col >= w - 2:
                break
            sym = {0.0: "·", 0.25: "▁", 0.5: "▄", 0.75: "▆", 1.0: "█"}.get(g[k], "?")
            try:
                stdscr.addstr(ctrl_top, col, sym, cp(CP_GHOST) | curses.A_DIM)
            except curses.error:
                pass

    ctrl_top += 1
    stdscr.addstr(ctrl_top, 0, "u(t):", curses.A_BOLD | cp(CP_PLAYER))
    for k in range(K):
        col = 6 + int(k * cell_w)
        if col >= w - 2:
            break
        sym = {0.0: "·", 0.5: "▄", 1.0: "█"}[u[k]]
        attr = (curses.A_REVERSE if k == cur else curses.A_NORMAL) | cp(CP_PLAYER)
        try:
            stdscr.addstr(ctrl_top + 1, col, sym, attr)
        except curses.error:
            pass
        # Index every 5
        if k % 5 == 0:
            try:
                stdscr.addstr(ctrl_top + 2, col, f"{k}", curses.A_DIM)
            except curses.error:
                pass

    # Status row
    status_top = ctrl_top + 4
    stdscr.addstr(status_top + 0, 0, f"  Cursor:    k={cur}  t={cur*DT:.1f}s  u_k={u[cur]:.1f}")
    stdscr.addstr(status_top + 1, 0, f"  Population at end: x(T) = {traj[-1]:.3f}")
    bar_player = "█" * int(reward * 4) + " "
    bar_ghost = "·" * int(g_reward * 4) + " "
    stdscr.addstr(status_top + 2, 0, f"  Your reward:  {reward:6.3f}  ")
    stdscr.addstr(bar_player[:max(1, w - 30)], cp(CP_PLAYER) | curses.A_BOLD)
    if show_ghost:
        stdscr.addstr(status_top + 3, 0, f"  Ghost reward: {g_reward:6.3f}  ")
        stdscr.addstr(bar_ghost[:max(1, w - 30)], cp(CP_GHOST) | curses.A_DIM)
        diff = reward - g_reward
        sign = "+" if diff >= 0 else ""
        diff_color = CP_REWARD_OK if diff >= 0 else CP_REWARD_BAD
        stdscr.addstr(status_top + 4, 0, f"  Δ vs ghost:   {sign}{diff:6.3f}", curses.A_BOLD | cp(diff_color))
    pb = load_best()
    if reward > pb:
        save_best(reward)
        pb = reward
    pb_label = "  Personal best:"
    pb_row = status_top + 5 if show_ghost else status_top + 3
    try:
        stdscr.addstr(pb_row, 0, f"{pb_label} {pb:6.3f}", curses.A_DIM)
    except curses.error:
        pass

    stdscr.refresh()


CP_PLAYER = 1
CP_GHOST = 2
CP_REWARD_OK = 3
CP_REWARD_BAD = 4
CP_AXIS = 5


def init_colors():
    if not curses.has_colors():
        return
    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(CP_PLAYER, curses.COLOR_CYAN, -1)
    curses.init_pair(CP_GHOST, curses.COLOR_YELLOW, -1)
    curses.init_pair(CP_REWARD_OK, curses.COLOR_GREEN, -1)
    curses.init_pair(CP_REWARD_BAD, curses.COLOR_RED, -1)
    curses.init_pair(CP_AXIS, curses.COLOR_WHITE, -1)


def cp(n):
    try:
        return curses.color_pair(n)
    except curses.error:
        return 0


def main(stdscr):
    curses.curs_set(0)
    stdscr.nodelay(False)
    init_colors()

    u = [0.5] * K
    cur = 0
    show_ghost = True

    while True:
        draw(stdscr, u, cur, show_ghost)
        c = stdscr.getch()
        if c in (ord("q"), 27):  # esc or q
            break
        elif c == curses.KEY_LEFT:
            cur = (cur - 1) % K
        elif c == curses.KEY_RIGHT:
            cur = (cur + 1) % K
        elif c == ord(" "):
            i = U_LEVELS.index(u[cur])
            u[cur] = U_LEVELS[(i + 1) % len(U_LEVELS)]
        elif c == ord("0"):
            u[cur] = 0.0
        elif c == ord("1"):
            u[cur] = 1.0
        elif c == ord("m"):
            u[cur] = 0.5
        elif c == ord("g"):
            show_ghost = not show_ghost
        elif c == ord("r"):
            u = [0.5] * K
            cur = 0


if __name__ == "__main__":
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        sys.exit(0)
