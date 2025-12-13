---
"@agentxjs/ui": minor
"@agentxjs/portagent": patch
---

Add mobile responsive support with separate mobile components

**@agentxjs/ui:**

- Add mobile components: MobileDrawer, MobileHeader, MobileMessagePane, MobileInputPane, MobileChat, MobileAgentList
- Add MobileStudio for full mobile experience with drawer navigation
- Add ResponsiveStudio for automatic mobile/desktop switching at 768px breakpoint
- Add useIsMobile hook for viewport detection
- Mobile design follows Claude App's minimalist style

**@agentxjs/portagent:**

- Use ResponsiveStudio for automatic mobile/desktop layout switching
