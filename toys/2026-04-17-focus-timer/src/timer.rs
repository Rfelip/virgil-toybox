use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimerState {
    Running,
    Paused,
    Done,
}

#[derive(Debug)]
pub struct Timer {
    pub total: Duration,
    pub state: TimerState,
    /// When the current run-segment started.
    started_at: Option<Instant>,
    /// Accumulated elapsed time across run segments (excludes pauses).
    accumulated: Duration,
}

impl Timer {
    pub fn new(total: Duration) -> Self {
        Self {
            total,
            state: TimerState::Running,
            started_at: Some(Instant::now()),
            accumulated: Duration::ZERO,
        }
    }

    pub fn elapsed(&self) -> Duration {
        let live = if self.state == TimerState::Running {
            self.started_at
                .map(|s| s.elapsed())
                .unwrap_or(Duration::ZERO)
        } else {
            Duration::ZERO
        };
        self.accumulated + live
    }

    pub fn remaining(&self) -> Duration {
        self.total.saturating_sub(self.elapsed())
    }

    pub fn progress(&self) -> f64 {
        if self.total.is_zero() {
            return 1.0;
        }
        (self.elapsed().as_secs_f64() / self.total.as_secs_f64()).clamp(0.0, 1.0)
    }

    pub fn tick(&mut self) {
        if self.state == TimerState::Running && self.remaining().is_zero() {
            // Freeze accumulator so elapsed stays at total.
            if let Some(s) = self.started_at.take() {
                self.accumulated += s.elapsed();
            }
            self.state = TimerState::Done;
        }
    }

    pub fn toggle_pause(&mut self) {
        match self.state {
            TimerState::Running => {
                if let Some(s) = self.started_at.take() {
                    self.accumulated += s.elapsed();
                }
                self.state = TimerState::Paused;
            }
            TimerState::Paused => {
                self.started_at = Some(Instant::now());
                self.state = TimerState::Running;
            }
            TimerState::Done => {}
        }
    }
}

pub fn format_mmss(d: Duration) -> String {
    let secs = d.as_secs();
    format!("{:02}:{:02}", secs / 60, secs % 60)
}

/// 5-row ASCII big-digit renderer. Returns 5 strings, one per row.
pub fn big_digits(text: &str) -> [String; 5] {
    // Glyphs are 5 rows tall, 5 cols wide, with a trailing space column for spacing.
    let glyph = |c: char| -> [&'static str; 5] {
        match c {
            '0' => [" ███ ", "█   █", "█   █", "█   █", " ███ "],
            '1' => ["  █  ", " ██  ", "  █  ", "  █  ", " ███ "],
            '2' => [" ███ ", "█   █", "   █ ", "  █  ", "█████"],
            '3' => ["████ ", "    █", " ███ ", "    █", "████ "],
            '4' => ["█   █", "█   █", "█████", "    █", "    █"],
            '5' => ["█████", "█    ", "████ ", "    █", "████ "],
            '6' => [" ███ ", "█    ", "████ ", "█   █", " ███ "],
            '7' => ["█████", "    █", "   █ ", "  █  ", " █   "],
            '8' => [" ███ ", "█   █", " ███ ", "█   █", " ███ "],
            '9' => [" ███ ", "█   █", " ████", "    █", " ███ "],
            ':' => ["     ", "  █  ", "     ", "  █  ", "     "],
            _ => ["     ", "     ", "     ", "     ", "     "],
        }
    };
    let mut rows: [String; 5] = Default::default();
    for c in text.chars() {
        let g = glyph(c);
        for (i, row) in g.iter().enumerate() {
            rows[i].push_str(row);
            rows[i].push(' ');
        }
    }
    rows
}
