use chrono::{DateTime, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub start: DateTime<Local>,
    pub end: DateTime<Local>,
    pub duration_minutes: u64,
    pub task: Option<String>,
}

#[derive(Debug)]
pub enum WriteOutcome {
    AppendedToDailyNote(PathBuf),
    FallbackJsonl(PathBuf),
}

pub fn discover_vault(cli_override: Option<&Path>) -> Option<PathBuf> {
    if let Some(p) = cli_override {
        return validate(p);
    }
    if let Ok(env_path) = std::env::var("FOCUS_TIMER_VAULT") {
        if let Some(p) = validate(Path::new(&env_path)) {
            return Some(p);
        }
    }
    let default = dirs::home_dir().map(|h| h.join("Desktop/personal_obsidian"));
    default.and_then(|p| validate(&p))
}

fn validate(p: &Path) -> Option<PathBuf> {
    if p.is_dir() && p.join("00 - Tasks").is_dir() {
        Some(p.to_path_buf())
    } else {
        None
    }
}

pub fn daily_note_path(vault: &Path, date: NaiveDate) -> PathBuf {
    vault
        .join("01 - Journal")
        .join("Daily")
        .join(format!("{}.md", date.format("%Y-%m-%d")))
}

pub fn fallback_log_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("focus-timer")
        .join("sessions.jsonl")
}

pub fn record_session(
    vault: Option<&Path>,
    record: &SessionRecord,
) -> std::io::Result<WriteOutcome> {
    let line = format!(
        "- 🍅 {}-{} ({}min) — {}",
        record.start.format("%H:%M"),
        record.end.format("%H:%M"),
        record.duration_minutes,
        record.task.as_deref().unwrap_or("(no task)")
    );

    if let Some(v) = vault {
        let path = daily_note_path(v, record.start.date_naive());
        if path.exists() {
            let mut f = OpenOptions::new().append(true).open(&path)?;
            // Ensure newline separation.
            writeln!(f)?;
            writeln!(f, "{}", line)?;
            return Ok(WriteOutcome::AppendedToDailyNote(path));
        } else {
            eprintln!(
                "warning: today's daily note does not exist at {} — falling back to JSONL log",
                path.display()
            );
        }
    } else {
        eprintln!("warning: vault not found — falling back to JSONL log");
    }

    let log = fallback_log_path();
    if let Some(parent) = log.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut f = OpenOptions::new().create(true).append(true).open(&log)?;
    writeln!(f, "{}", serde_json::to_string(record)?)?;
    Ok(WriteOutcome::FallbackJsonl(log))
}

/// Read today's session lines back from the daily note.
pub fn read_today_sessions(vault: &Path, date: NaiveDate) -> std::io::Result<Vec<String>> {
    let path = daily_note_path(vault, date);
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path)?;
    Ok(content
        .lines()
        .filter(|l| l.trim_start().starts_with("- 🍅"))
        .map(|l| l.to_string())
        .collect())
}
