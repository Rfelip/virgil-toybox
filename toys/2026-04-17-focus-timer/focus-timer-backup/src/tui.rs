use std::io;
use std::path::PathBuf;
use std::time::{Duration, Instant};

use chrono::Local;
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use crossterm::execute;
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::backend::CrosstermBackend;
use ratatui::layout::{Alignment, Constraint, Direction, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Gauge, List, ListItem, ListState, Paragraph, Wrap};
use ratatui::{Frame, Terminal};

use crate::tasks::collect_today_tasks;
use crate::timer::{big_digits, format_mmss, Timer, TimerState};
use crate::vault::{record_session, SessionRecord, WriteOutcome};

pub struct AppConfig {
    pub vault: Option<PathBuf>,
    pub default_duration_minutes: u64,
    pub initial_task: Option<String>,
}

enum Screen {
    Idle {
        task_input: String,
        duration_minutes: u64,
        suggestions: Vec<String>,
        list_state: ListState,
        focus: IdleFocus,
        last_status: Option<String>,
    },
    Running {
        timer: Timer,
        task: Option<String>,
        duration_minutes: u64,
        start: chrono::DateTime<Local>,
    },
    Complete {
        message: String,
    },
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum IdleFocus {
    Suggestions,
    Input,
}

pub fn run(cfg: AppConfig) -> io::Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let res = run_app(&mut terminal, cfg);

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;
    res
}

fn run_app(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    cfg: AppConfig,
) -> io::Result<()> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let suggestions = cfg
        .vault
        .as_deref()
        .map(|v| collect_today_tasks(v, &today))
        .unwrap_or_default();

    let mut list_state = ListState::default();
    if !suggestions.is_empty() {
        list_state.select(Some(0));
    }

    let mut screen = Screen::Idle {
        task_input: cfg.initial_task.clone().unwrap_or_default(),
        duration_minutes: cfg.default_duration_minutes,
        suggestions,
        list_state,
        focus: IdleFocus::Input,
        last_status: None,
    };

    let tick = Duration::from_millis(200);
    let mut last_tick = Instant::now();

    loop {
        terminal.draw(|f| draw(f, &mut screen))?;

        let timeout = tick.saturating_sub(last_tick.elapsed());
        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                // Ctrl-C always quits.
                if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
                    return Ok(());
                }
                match &mut screen {
                    Screen::Idle {
                        task_input,
                        duration_minutes,
                        suggestions,
                        list_state,
                        focus,
                        last_status,
                    } => {
                        if handle_idle_key(
                            key.code,
                            task_input,
                            duration_minutes,
                            suggestions,
                            list_state,
                            focus,
                            last_status,
                        ) {
                            // Start session
                            let task = if task_input.trim().is_empty() {
                                None
                            } else {
                                Some(task_input.trim().to_string())
                            };
                            let total = Duration::from_secs(*duration_minutes * 60);
                            screen = Screen::Running {
                                timer: Timer::new(total),
                                task,
                                duration_minutes: *duration_minutes,
                                start: Local::now(),
                            };
                        } else if matches!(key.code, KeyCode::Esc)
                            && matches!(focus, IdleFocus::Input)
                        {
                            return Ok(());
                        }
                    }
                    Screen::Running {
                        timer,
                        task,
                        duration_minutes,
                        start: _,
                    } => match key.code {
                        KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
                        KeyCode::Char('p') | KeyCode::Char(' ') => timer.toggle_pause(),
                        KeyCode::Char('c') => {
                            // Cancel — drop back to idle without recording.
                            let mut ls = ListState::default();
                            let sugg = cfg
                                .vault
                                .as_deref()
                                .map(|v| collect_today_tasks(v, &today))
                                .unwrap_or_default();
                            if !sugg.is_empty() {
                                ls.select(Some(0));
                            }
                            screen = Screen::Idle {
                                task_input: task.clone().unwrap_or_default(),
                                duration_minutes: *duration_minutes,
                                suggestions: sugg,
                                list_state: ls,
                                focus: IdleFocus::Input,
                                last_status: Some("Session cancelled.".into()),
                            };
                        }
                        _ => {}
                    },
                    Screen::Complete { .. } => match key.code {
                        KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
                        _ => {
                            let mut ls = ListState::default();
                            let sugg = cfg
                                .vault
                                .as_deref()
                                .map(|v| collect_today_tasks(v, &today))
                                .unwrap_or_default();
                            if !sugg.is_empty() {
                                ls.select(Some(0));
                            }
                            let status = match &screen {
                                Screen::Complete { message } => Some(message.clone()),
                                _ => None,
                            };
                            screen = Screen::Idle {
                                task_input: String::new(),
                                duration_minutes: cfg.default_duration_minutes,
                                suggestions: sugg,
                                list_state: ls,
                                focus: IdleFocus::Input,
                                last_status: status,
                            };
                        }
                    },
                }
            }
        }

        if last_tick.elapsed() >= tick {
            last_tick = Instant::now();
            if let Screen::Running {
                timer,
                task,
                duration_minutes,
                start,
            } = &mut screen
            {
                timer.tick();
                if timer.state == TimerState::Done {
                    let end = Local::now();
                    let record = SessionRecord {
                        start: *start,
                        end,
                        duration_minutes: *duration_minutes,
                        task: task.clone(),
                    };
                    // Bell.
                    print!("\x07");
                    use std::io::Write;
                    let _ = std::io::stdout().flush();

                    let msg = match record_session(cfg.vault.as_deref(), &record) {
                        Ok(WriteOutcome::AppendedToDailyNote(p)) => {
                            format!("Session logged to {}", p.display())
                        }
                        Ok(WriteOutcome::FallbackJsonl(p)) => {
                            format!("Session logged to fallback {}", p.display())
                        }
                        Err(e) => format!("Failed to log session: {e}"),
                    };
                    screen = Screen::Complete { message: msg };
                }
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn handle_idle_key(
    code: KeyCode,
    task_input: &mut String,
    duration_minutes: &mut u64,
    suggestions: &[String],
    list_state: &mut ListState,
    focus: &mut IdleFocus,
    last_status: &mut Option<String>,
) -> bool {
    match code {
        KeyCode::Enter => {
            if matches!(focus, IdleFocus::Suggestions) {
                if let Some(i) = list_state.selected() {
                    if let Some(s) = suggestions.get(i) {
                        *task_input = s.clone();
                    }
                }
                *focus = IdleFocus::Input;
                *last_status = None;
                return false;
            }
            *last_status = None;
            return true;
        }
        KeyCode::Tab => {
            *focus = match focus {
                IdleFocus::Input => {
                    if suggestions.is_empty() {
                        IdleFocus::Input
                    } else {
                        IdleFocus::Suggestions
                    }
                }
                IdleFocus::Suggestions => IdleFocus::Input,
            };
        }
        KeyCode::Up => {
            if matches!(focus, IdleFocus::Suggestions) && !suggestions.is_empty() {
                let i = list_state.selected().unwrap_or(0);
                let new = if i == 0 { suggestions.len() - 1 } else { i - 1 };
                list_state.select(Some(new));
            } else {
                *duration_minutes = (*duration_minutes + 5).min(180);
            }
        }
        KeyCode::Down => {
            if matches!(focus, IdleFocus::Suggestions) && !suggestions.is_empty() {
                let i = list_state.selected().unwrap_or(0);
                let new = (i + 1) % suggestions.len();
                list_state.select(Some(new));
            } else {
                *duration_minutes = duration_minutes.saturating_sub(5).max(1);
            }
        }
        KeyCode::Left => {
            *duration_minutes = duration_minutes.saturating_sub(1).max(1);
        }
        KeyCode::Right => {
            *duration_minutes = (*duration_minutes + 1).min(180);
        }
        KeyCode::Backspace => {
            if matches!(focus, IdleFocus::Input) {
                task_input.pop();
            }
        }
        KeyCode::Char(c) => {
            if matches!(focus, IdleFocus::Input) {
                task_input.push(c);
            }
        }
        _ => {}
    }
    false
}

fn draw(f: &mut Frame, screen: &mut Screen) {
    let area = f.area();
    match screen {
        Screen::Idle {
            task_input,
            duration_minutes,
            suggestions,
            list_state,
            focus,
            last_status,
        } => draw_idle(
            f,
            area,
            task_input,
            *duration_minutes,
            suggestions,
            list_state,
            *focus,
            last_status.as_deref(),
        ),
        Screen::Running { timer, task, .. } => draw_running(f, area, timer, task.as_deref()),
        Screen::Complete { message } => draw_complete(f, area, message),
    }
}

#[allow(clippy::too_many_arguments)]
fn draw_idle(
    f: &mut Frame,
    area: Rect,
    task_input: &str,
    duration_minutes: u64,
    suggestions: &[String],
    list_state: &mut ListState,
    focus: IdleFocus,
    last_status: Option<&str>,
) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Min(5),
            Constraint::Length(3),
            Constraint::Length(2),
        ])
        .split(area);

    let title = Paragraph::new("🍅 focus-timer — idle")
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD));
    f.render_widget(title, chunks[0]);

    let dur = Paragraph::new(format!(
        "Duration: {} min   (←/→ ±1, ↑/↓ ±5 when focus is on Input)",
        duration_minutes
    ))
    .alignment(Alignment::Center)
    .block(Block::default().borders(Borders::ALL).title("Duration"));
    f.render_widget(dur, chunks[1]);

    let input_style = if matches!(focus, IdleFocus::Input) {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::Gray)
    };
    let input = Paragraph::new(if task_input.is_empty() {
        "(type a task label, or pick from below)"
    } else {
        task_input
    })
    .style(input_style)
    .block(
        Block::default()
            .borders(Borders::ALL)
            .title("Task (Tab to switch panes)"),
    );
    f.render_widget(input, chunks[2]);

    let items: Vec<ListItem> = if suggestions.is_empty() {
        vec![ListItem::new("(no open tasks for today found in vault)")]
    } else {
        suggestions
            .iter()
            .map(|s| ListItem::new(s.as_str()))
            .collect()
    };
    let list_style = if matches!(focus, IdleFocus::Suggestions) {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::Gray)
    };
    let list = List::new(items)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Today's open tasks"),
        )
        .style(list_style)
        .highlight_style(Style::default().bg(Color::DarkGray).add_modifier(Modifier::BOLD))
        .highlight_symbol("▶ ");
    f.render_stateful_widget(list, chunks[3], list_state);

    let status_text = last_status.unwrap_or("Enter to start • Tab to focus list • Ctrl-C to quit");
    let status = Paragraph::new(status_text)
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::Cyan))
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(status, chunks[4]);

    let hint = Paragraph::new("[Enter] start  [Tab] switch pane  [↑/↓] adjust  [Esc/Ctrl-C] quit")
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::DarkGray));
    f.render_widget(hint, chunks[5]);
}

fn draw_running(f: &mut Frame, area: Rect, timer: &Timer, task: Option<&str>) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2),
            Constraint::Length(3),
            Constraint::Length(7),
            Constraint::Length(3),
            Constraint::Min(1),
            Constraint::Length(2),
        ])
        .split(area);

    let header = Paragraph::new(match timer.state {
        TimerState::Running => "🍅 focus-timer — running",
        TimerState::Paused => "🍅 focus-timer — PAUSED",
        TimerState::Done => "🍅 focus-timer — done!",
    })
    .alignment(Alignment::Center)
    .style(
        Style::default()
            .fg(match timer.state {
                TimerState::Paused => Color::Yellow,
                TimerState::Done => Color::Green,
                _ => Color::Magenta,
            })
            .add_modifier(Modifier::BOLD),
    );
    f.render_widget(header, chunks[0]);

    let task_p = Paragraph::new(format!("Task: {}", task.unwrap_or("(no task)")))
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(task_p, chunks[1]);

    // Big digits.
    let mmss = format_mmss(timer.remaining());
    let rows = big_digits(&mmss);
    let lines: Vec<Line> = rows
        .iter()
        .map(|r| Line::from(Span::styled(r.clone(), Style::default().fg(Color::Magenta))))
        .collect();
    let big = Paragraph::new(lines).alignment(Alignment::Center);
    f.render_widget(big, chunks[2]);

    let pct = (timer.progress() * 100.0) as u16;
    let gauge = Gauge::default()
        .block(Block::default().borders(Borders::ALL).title("Progress"))
        .gauge_style(Style::default().fg(Color::Magenta))
        .percent(pct.min(100));
    f.render_widget(gauge, chunks[3]);

    let hint = Paragraph::new("[Space/p] pause  [c] cancel  [q/Esc] quit")
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::DarkGray));
    f.render_widget(hint, chunks[5]);
}

fn draw_complete(f: &mut Frame, area: Rect, message: &str) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(1), Constraint::Length(3)])
        .split(area);

    let body = Paragraph::new(vec![
        Line::from(""),
        Line::from(Span::styled(
            "🎉 Session complete!",
            Style::default().fg(Color::Green).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(message.to_string()),
        Line::from(""),
        Line::from("Press any key to start another, q to quit."),
    ])
    .alignment(Alignment::Center)
    .wrap(Wrap { trim: true })
    .block(Block::default().borders(Borders::ALL));
    f.render_widget(body, chunks[0]);

    let hint = Paragraph::new("[any key] new session  [q] quit")
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::DarkGray));
    f.render_widget(hint, chunks[1]);
}
