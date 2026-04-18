use std::path::PathBuf;
use std::process::ExitCode;

use chrono::Local;
use clap::{Parser, Subcommand};

mod tasks;
mod timer;
mod tui;
mod vault;

#[derive(Parser, Debug)]
#[command(
    name = "focus-timer",
    version,
    about = "Pomodoro / focus timer TUI that logs sessions into your Obsidian vault"
)]
struct Cli {
    /// Override the vault path (default: ~/Desktop/personal_obsidian or $FOCUS_TIMER_VAULT)
    #[arg(long, global = true)]
    vault: Option<PathBuf>,

    /// Session duration in minutes (default 25)
    #[arg(long, short = 'd')]
    duration: Option<u64>,

    /// Pre-fill task label
    #[arg(long, short = 't')]
    task: Option<String>,

    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Print today's logged sessions from the vault
    Log,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let vault = vault::discover_vault(cli.vault.as_deref());

    match cli.command {
        Some(Command::Log) => match vault {
            Some(v) => {
                let today = Local::now().date_naive();
                match vault::read_today_sessions(&v, today) {
                    Ok(sessions) if sessions.is_empty() => {
                        println!("No focus sessions logged today ({}).", today);
                        ExitCode::SUCCESS
                    }
                    Ok(sessions) => {
                        println!("Sessions for {}:", today);
                        for s in sessions {
                            println!("  {}", s);
                        }
                        ExitCode::SUCCESS
                    }
                    Err(e) => {
                        eprintln!("Failed to read daily note: {e}");
                        ExitCode::FAILURE
                    }
                }
            }
            None => {
                eprintln!("Vault not found. Set FOCUS_TIMER_VAULT or use --vault.");
                ExitCode::FAILURE
            }
        },
        None => {
            if vault.is_none() {
                eprintln!(
                    "warning: vault not found at default path. \
                     Sessions will fall back to ~/.config/focus-timer/sessions.jsonl"
                );
            }
            let cfg = tui::AppConfig {
                vault,
                default_duration_minutes: cli.duration.unwrap_or(25),
                initial_task: cli.task,
            };
            if let Err(e) = tui::run(cfg) {
                eprintln!("TUI error: {e}");
                return ExitCode::FAILURE;
            }
            ExitCode::SUCCESS
        }
    }
}
