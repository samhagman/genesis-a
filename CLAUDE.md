## Development Guidelines

- When making changes to code using Cloudflare services, you first SHALL check \_CLAUDE_RULES/cloudflare.txt for best practices, guidance, and context
- Keep the number of files and directories to a minimum – prevent code sprawl
- Have file names be descriptive of what they are, make it easy to guess what a file does by its name
- Write small unit tests after each milestone of work that test how you expect the code you wrote to run. Then run those tests and get them to pass before moving on to the next milestone
- After each milestone is reached: run tests and check if types can compile. Make sure those work before moving on to the next milestone
- Do not make stubs or half-implemented functionality and leave it in the code. If you aren't going to make something functional, do not leave it in the code. Only write code you intend to make real and functional. It is ok to do SLC MVPs of features/processes/functions, but the code must do what it says it will do (function names actually do what they say). Things get confusing when code _appears_ to do something, but isn't fully implemented
- When debugging with vitest, use `console.warn` to write debug statements inside the tests and `--silent=false` to see the messages in the console

## Interface Design

- Strongly type all interfaces between services and packages, places of integration within the system
- Try to keep the number of types minimal by designing services and packages to use similar interfaces if they are siblings of functionality

## Scope of Development

- You SHALL focus ONLY, SOLEY on building the core functionality of the request
- You WILL NOT consider performance, security, authentication, responsive design (different screen sizes)
- ONLY IF explicitly asked, will you plan or build anything related to performance, security, authentication, or responsive design
- If unsure about the scope of development, ask for clarification before proceeding

- Assume a desktop view for this application. Mobile or tablet views are not important or relevant
