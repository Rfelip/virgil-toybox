# focus-timer

A pomodoro / deep-work timer that lives in the terminal and writes session
records into the Obsidian vault. Pure Rust, ratatui TUI, no system deps.

## What it does

The loop:

1. Pick a duration (default **25 min**) and an optional task label.
2. Big-digit countdown with a progress bar and the current task.
3. On completion: terminal bell + a one-line entry appended to today's daily
   note in the vault (or a JSONL fallback if the note doesn't exist yet).
4. Idle screen between sessions; press a key to start the next one.

## Run it

```bash
cd ~/Desktop/virgil-toybox/toys/2026-04-17-focus-timer
cargo build --release

# Interactive TUI
./target/release/focus-timer

# Custom duration / pre-filled task
./target/release/focus-timer --duration 50 --task "writing"

# Override vault path
./target/release/focus-timer --vault /some/other/vault

# Print today's sessions from the vault
./target/release/focus-timer log

# Help
./target/release/focus-timer --help
```

For daily use, drop an alias somewhere on your `$PATH`:

```bash
alias vt='~/Desktop/virgil-toybox/toys/2026-04-17-focus-timer/target/release/focus-timer'
```

(or symlink the binary into `~/.local/bin/`.)

### Keys

**Idle screen**

| Key            | Action                                 |
|----------------|----------------------------------------|
| `Enter`        | Start session                          |
| `Tab`          | Switch focus between input and list    |
| `←` / `→`      | Adjust duration ±1 min                 |
| `↑` / `↓`      | Adjust duration ±5 min (input pane) / move selection (list pane) |
| `Backspace`    | Edit task label                        |
| `Esc` / `Ctrl-C` | Quit                                 |

**Running screen**

| Key            | Action            |
|----------------|-------------------|
| `Space` / `p`  | Pause / resume    |
| `c`            | Cancel session (no log) |
| `q` / `Esc`    | Quit              |

## Vault integration

- **Default vault path:** `~/Desktop/personal_obsidian/`
- **Override:** `--vault PATH` flag, or `FOCUS_TIMER_VAULT` env var.
- **Validation:** the vault must exist and contain a `00 - Tasks/` directory.
- **Daily note path:** `01 - Journal/Daily/YYYY-MM-DD.md`.
- **Append format:** appends a single line to today's note, e.g.
  ```
  - 🍅 14:30-14:55 (25min) — writing
  ```
- **Today's tasks:** the idle screen lists open `- [ ] ... 📅 YYYY-MM-DD`
  tasks dated today, walking the vault (skipping `.git`, `.obsidian`,
  `05 - Archive`, `target`). `Today.md` itself just contains Tasks-plugin
  query blocks rather than literal tasks, so we scan the rest of the vault.
- **Fallback:** if today's daily note doesn't exist, focus-timer **does not
  auto-create it**. Instead it appends a JSON line to
  `~/.config/focus-timer/sessions.jsonl` and prints a warning.

## Why a CLI tonight

After ten consecutive HTML/Canvas toys (see
`~/.claude/projects/-home-rsousa-Desktop-personal-obsidian/memory/feedback_toybox_variety.md`),
this is a deliberate swing back to a CLI/TUI tool. The previous Rust attempt
(`vault-graph`, 2026-03-28) stalled — this is the rematch and the first
finished Rust binary in the workshop. Real Rust + real ratatui + real vault
integration. Language exploration first; if it gets adopted, bonus.

## Stack

- Rust 2021 (rustc 1.94)
- [`ratatui`](https://crates.io/crates/ratatui) 0.29 — TUI widgets
- [`crossterm`](https://crates.io/crates/crossterm) 0.28 — backend (Linux)
- [`chrono`](https://crates.io/crates/chrono) 0.4 — clock + serde
- [`clap`](https://crates.io/crates/clap) 4.5 — CLI parsing
- [`serde`](https://crates.io/crates/serde) 1 + `serde_json` 1 — JSONL fallback
- [`dirs`](https://crates.io/crates/dirs) 5 — `~/.config` discovery

## Project layout

```
2026-04-17-focus-timer/
  README.md
  Cargo.toml
  Cargo.lock
  .gitignore
  src/
    main.rs    # CLI parsing, dispatch
    tui.rs     # ratatui app loop, idle/running/complete screens
    vault.rs   # vault discovery, daily-note append, JSONL fallback
    tasks.rs   # parse open `- [ ]` Obsidian tasks for today
    timer.rs   # countdown, pause logic, ASCII big-digit renderer
```

## Known limitations

- Won't auto-create today's daily note (intentional — falls back to JSONL).
- No resume across crashes; killing the process loses the in-flight session.
- Big digits are hand-rolled ASCII (no `tui-big-text` dependency).
- Linux-only target (crossterm should work on macOS/Windows but untested).
- Bell character (`\x07`) on completion — your terminal must have audible
  bell enabled to hear it.
- Task discovery walks the vault on each idle render trigger; on huge vaults
  this could be slow. Currently capped at 10 results.

## Roadmap (if I come back to it)

- Pause/resume with elapsed-time persistence to disk
- Multi-session "block" mode (e.g. 4×25min with 5min breaks)
- Tick the matching `- [ ]` task in the vault on completion
- Daily/weekly stats subcommand (`focus-timer stats`)
- Native desktop notification (libnotify) instead of just the bell
