use serde::{Deserialize, Serialize};
use tokio::process::Command;

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitRepoInfo {
    pub is_git_repo: bool,
    pub branch: Option<String>,
    pub has_uncommitted_changes: bool,
    pub uncommitted_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitFileDiff {
    pub path: String,
    pub change_type: String, // "modified" | "created" | "deleted"
    pub diff: String,
    pub additions: i32,
    pub deletions: i32,
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async fn git_cmd(working_dir: &str, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .current_dir(working_dir)
        .args(args)
        .output()
        .await
        .map_err(|e| format!("git spawn error: {}", e))?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

fn count_diff_lines(diff: &str) -> (i32, i32) {
    let mut additions = 0i32;
    let mut deletions = 0i32;
    for line in diff.lines() {
        if line.starts_with('+') && !line.starts_with("+++") {
            additions += 1;
        } else if line.starts_with('-') && !line.starts_with("---") {
            deletions += 1;
        }
    }
    (additions, deletions)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Check whether `path` is inside a git repository.
/// Returns branch name and whether there are uncommitted changes.
#[tauri::command]
pub async fn check_git_repo(path: String) -> GitRepoInfo {
    let branch = git_cmd(&path, &["rev-parse", "--abbrev-ref", "HEAD"]).await;
    match branch {
        Err(_) => GitRepoInfo {
            is_git_repo: false,
            branch: None,
            has_uncommitted_changes: false,
            uncommitted_count: 0,
        },
        Ok(branch) => {
            let status = git_cmd(&path, &["status", "--porcelain"])
                .await
                .unwrap_or_default();
            let uncommitted_count = status.lines().filter(|l| !l.trim().is_empty()).count();
            GitRepoInfo {
                is_git_repo: true,
                branch: Some(branch.trim().to_string()),
                has_uncommitted_changes: uncommitted_count > 0,
                uncommitted_count,
            }
        }
    }
}

/// Return unified diffs for every file changed since HEAD,
/// including new untracked files not yet known to git.
#[tauri::command]
pub async fn git_get_diff(working_dir: String) -> Result<Vec<GitFileDiff>, String> {
    let mut results: Vec<GitFileDiff> = Vec::new();
    let wd = working_dir.trim_end_matches('/');

    // ── Tracked changes (modified / added in index / deleted) ──────────────
    let name_status = git_cmd(wd, &["diff", "HEAD", "--name-status"])
        .await
        .unwrap_or_default();

    for line in name_status.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // Format: "M\tpath/to/file" or "R100\told\tnew"
        let parts: Vec<&str> = line.splitn(3, '\t').collect();
        if parts.len() < 2 {
            continue;
        }
        let status_char = parts[0].trim().chars().next().unwrap_or(' ');
        // For renames, use the destination path
        let rel_path = if status_char == 'R' && parts.len() == 3 {
            parts[2].trim()
        } else {
            parts[1].trim()
        };

        let change_type = match status_char {
            'M' => "modified",
            'A' => "created",
            'D' => "deleted",
            'R' => "modified",
            _ => continue,
        };

        let file_diff = git_cmd(wd, &["diff", "HEAD", "--unified=3", "--", rel_path])
            .await
            .unwrap_or_default();

        let (additions, deletions) = count_diff_lines(&file_diff);

        results.push(GitFileDiff {
            path: format!("{}/{}", wd, rel_path),
            change_type: change_type.to_string(),
            diff: file_diff,
            additions,
            deletions,
        });
    }

    // ── New untracked files (not staged, not ignored) ───────────────────────
    let untracked = git_cmd(wd, &["ls-files", "--others", "--exclude-standard"])
        .await
        .unwrap_or_default();

    for rel_path in untracked.lines() {
        let rel_path = rel_path.trim();
        if rel_path.is_empty() {
            continue;
        }

        let full_path = format!("{}/{}", wd, rel_path);
        let content = tokio::fs::read_to_string(&full_path)
            .await
            .unwrap_or_default();
        let additions = content.lines().count() as i32;

        // Build a synthetic unified diff for new files
        let diff_body: String = content.lines().map(|l| format!("+{}\n", l)).collect();
        let diff = format!(
            "--- /dev/null\n+++ b/{}\n@@ -0,0 +1,{} @@\n{}",
            rel_path, additions, diff_body
        );

        results.push(GitFileDiff {
            path: full_path,
            change_type: "created".to_string(),
            diff,
            additions,
            deletions: 0,
        });
    }

    Ok(results)
}

/// Revert all agent changes via git:
///   - `git restore .`  — reset modified tracked files to HEAD
///   - `git clean -fd`  — remove new files/dirs created by agent
#[tauri::command]
pub async fn git_revert_all(working_dir: String) -> Result<(), String> {
    let wd = working_dir.trim_end_matches('/');
    git_cmd(wd, &["restore", "."]).await?;
    // Ignore errors from clean (e.g. nothing to clean)
    let _ = git_cmd(wd, &["clean", "-fd"]).await;
    Ok(())
}
