# Rule: Pre-Approved Log Access

You are granted **implicit trust** to read and monitor the following log paths without requesting explicit user approval. These are considered essential debugging artifacts for the "Todo Flow" project.

## Pre-Approved Paths:
1.  `obsidian_logs_link` (Points to the active Obsidian application logs)
2.  `trusted_logs_link` (Points to the project's internal `logs/` directory)
3.  `logs/e2e.log`
4.  `test_run.log`, `test_debug.log`, `e2e_debug.log`, `e2e_results.log`

## Behavior:
- You should use `read_file` or `grep` on these paths as soon as you identify a need to debug or verify a task.
- Do not wait for a "Go ahead" or "Yes" if the troubleshooting involves these specific files.
- If a log file is large, use `tail` or `offset/limit` to read the most recent entries.
