Start phase $ARGUMENTS in the latest/highest version number prefixed slc-mvp-plan.md file in @_planning-docs/ (v1 < v2 < v3 etc)

Process:
1. Read @CLAUDE.md and @_CLAUDE_RULES/cloudflare.txt before starting
2. Read through the latest slc-mvp-plan.md you found and make a plan to implement phase $ARGUMENTS
3. Using all the guidelines from step 1 and in the plan from step 2, begin development on the first milestone
4. When working on a milestone, test early and often, check types early and often, and try to compile early and often
5. Once tests for a milestone are written and pass successfully, ask Gemini deep think with max tokens for a code review. Remember that it often over-engineers and we want to follow @CLAUDE.md rules and we're building an SLC MVP.
6. Once tests for a milestone are written and pass successfully (without stubbing them or commenting out), make a commit and push it to github
7. Once the commit is pushed, ask Gemini for a deepthink with max tokens for a code review.
8. Implement whatever "SLC MVP"-esque changes you think were smart from Gemini
9. Make another commit that talks about what you improved/refactored based on Gemini's input and then push that
10. Repeat across all milestones for phase $ARGUMENTS until all milestones are working, have passing tests, and are pushed to github.

Remember:
- Use @_CLAUDE_RULES/cloudflare.txt for guidance when coding something with Cloudflare services