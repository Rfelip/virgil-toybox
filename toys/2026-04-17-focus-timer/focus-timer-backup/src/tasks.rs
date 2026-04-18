use std::fs;
use std::path::Path;

/// Best-effort: scan the vault for open Obsidian tasks due today and return their labels.
/// Today.md uses Tasks-plugin code blocks rather than literal tasks, so we walk the vault
/// looking for `- [ ] ... 📅 YYYY-MM-DD` lines matching today's date.
pub fn collect_today_tasks(vault: &Path, today: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut stack = vec![vault.to_path_buf()];
    let skip_dirs = [".git", ".obsidian", ".trash", "05 - Archive", "target"];

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                if skip_dirs.contains(&name) {
                    continue;
                }
                stack.push(path);
            } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                if let Ok(content) = fs::read_to_string(&path) {
                    for line in content.lines() {
                        let trimmed = line.trim_start();
                        if trimmed.starts_with("- [ ]") && trimmed.contains(today) {
                            let label = clean_task_label(trimmed);
                            if !label.is_empty() && !out.contains(&label) {
                                out.push(label);
                            }
                        }
                        if out.len() >= 10 {
                            return out;
                        }
                    }
                }
            }
        }
    }
    out
}

fn clean_task_label(line: &str) -> String {
    let body = line.trim_start_matches("- [ ]").trim();
    // Strip everything from the first emoji metadata marker onward.
    let markers = ['📅', '⏳', '🛫', '✅', '❌', '🔁', '🔼', '⏫', '🔽', '⏬', '🆔', '⛔'];
    let mut cut = body.len();
    for (i, ch) in body.char_indices() {
        if markers.contains(&ch) {
            cut = i;
            break;
        }
    }
    body[..cut].trim().to_string()
}
