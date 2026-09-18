# AGENTS.md — rnbguj (fast run guide for LLMs)

## Project layout
- Next.js app root: `C:\rnbguj\rnbguj` (this is the ONLY `workdir` to use).
- Outer `C:\rnbguj` is just a git wrapper. Never run `npm` from there.
- Stack: Next.js 15.5.14 (App Router) + React 19 + Tailwind 4 + Mongoose/MongoDB Atlas + NextAuth v5.
- Known-good runtime: Node v22.19.0, npm 10.9.3.
- Env file `C:\rnbguj\rnbguj\.env.local` must exist. Never overwrite it, never print secrets.

## How to run fast ("run project")
1. First check if it is ALREADY running — do NOT restart a healthy server:
   ```powershell
   netstat -ano | Select-String "3000"
   try { Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 20 | Select-Object StatusCode } catch { Write-Output "DOWN: $($_.Exception.Message)" }
   ```
   If StatusCode = 200 → done. Just report `http://localhost:3000`. Do nothing else.
2. Only if DOWN, skip install checks quickly (no `npm install` if present):
   ```powershell
   Get-ChildItem -LiteralPath "node_modules\.bin" -Filter "next*" | Select-Object Name
   ```
   If `next.cmd` exists → dependencies are ready. NEVER run `npm install` unconditionally.
3. Start dev server (foreground, short timeout to verify startup):
   ```powershell
   npm run dev -- --port 3000
   ```
   - This is faster than `npm run build` + `npm start`. Prefer `dev` for local runs.
   - `EADDRINUSE :::3000` means another agent already started it → treat as RUNNING, verify with step 1.
4. Verify with the step-1 `Invoke-WebRequest`. Expect 200 (may redirect to `/login` — that is healthy).

## Windows PowerShell 5.1 pitfalls (do NOT do these)
- `Start-Process -FilePath "npm" ...` FAILS with `%1 is not a valid Win32 application` (npm resolves to `.ps1`). Never use it.
- `cmd /c start ...` detaches and kills the tool harness. Never use `start /min`.
- `node_modules\.bin\next.exe` does NOT exist on Windows — check for `next.cmd` / `next.ps1` instead.
- Always pass `workdir=C:\rnbguj\rnbguj`. Never `cd` inside the command.
- Do not delete `.next/` to "fix" things — it only makes the next start slower.

## Keep it fast / cheap
- Do NOT read `node_modules/`, `.next/`, `*.xlsm`, `*.xlsx`, `*.pdf`, `*.docx`, `*.log`, `dev_*.log`, `output*.txt`, `package-lock.json`. They are huge and irrelevant (see `.cursorignore`).
- For orientation read only: `package.json`, `REPOSYSTEM.md`, `app/`, `lib/db.ts`, `models/`, `auth.ts`.
- Do not run `lint`, `build`, `db:backup`, or migration scripts when asked just to "run project".
