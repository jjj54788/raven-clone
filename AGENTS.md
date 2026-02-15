# Codex Project Instructions (my-code)

## Always-on workflow after code generation

When you **generate or modify code** in this repo (i.e., you write files via patches/edits), automatically run `$repo-review-commit` before finalizing the response:

- Gather context (`git status -sb`, `git diff --stat`, `git diff`, `git diff --cached` when applicable).
- Do a hard "red-line" scan for secrets/credentials and refuse to proceed until removed if found.
- Run the most relevant verification (at least `npm -C backend run build` and `npm -C frontend run build` when reasonable).
- Output: Verdict + MUST/SHOULD/NICE + **public-safe** summary (主要修改点/新增大功能) + proposed commit plan.

## Safety constraints

- Never auto-commit or auto-push unless the user explicitly asks.
- Public summary must be safe to share externally: do not include internal endpoints, table names, secrets, model IDs, prompts, or any identifying operational details.
