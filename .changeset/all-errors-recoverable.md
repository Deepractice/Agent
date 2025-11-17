---
"@deepractice-ai/agent-sdk": minor
"@deepractice-ai/agent": patch
---

Change error recovery strategy: treat all errors as recoverable by default

This update improves user experience by allowing sessions to continue after errors (e.g., insufficient credits). Previously, many errors would permanently terminate sessions, requiring users to create new sessions even after fixing the issue.

Changes:

- Modified `isRecoverableError()` to return `true` by default for all errors
- Sessions now stay in `idle` state after errors instead of `error` state
- Added empty `fatalErrorPatterns` array for future data-driven classification
- Enhanced error logging with `errorMessage` field for analysis
- Updated frontend error messages with specific recovery suggestions

Benefits:

- Users can continue sessions after recharging credits
- Better handling of temporary failures (network issues, rate limits)
- Data-driven approach: collect fatal errors first, then classify
- Improved error messages guide users to solutions
