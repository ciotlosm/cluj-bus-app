# Development Guidelines

## Common Commands

### Development
```bash
npm run dev          # Start development server (port 5175)
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing
```bash
npm test             # Run all tests once (vitest --run)
npm run test:watch   # Run tests in watch mode (vitest)
npm run test:ui      # Run tests with visual UI (vitest --ui)
```

## 🚨 CRITICAL TEST COMMAND RULES

**PACKAGE.JSON TEST SCRIPT: `"test": "vitest --run"`**
**The --run flag is ALREADY INCLUDED in the npm test script!**

### ✅ CORRECT Test Commands
```bash
npm test                    # Run all tests (--run already included)
npm test -- vehicleStore    # Run specific test files (NO --run needed)
npm test -- --coverage     # Run with coverage (NO --run needed)
npm test -- --reporter=verbose  # Verbose output (NO --run needed)
npm run test:watch         # Watch mode (uses different script)
npm run test:ui            # Visual test runner
```

### ❌ FORBIDDEN Commands (Will Cause Duplicate --run Error)
```bash
npm test -- --run          # ❌ DUPLICATE --run ERROR
npm test -- --run vehicleStore  # ❌ DUPLICATE --run ERROR
npm test -- --run --coverage    # ❌ DUPLICATE --run ERROR
```

### AI Assistant Test Command Rules
- ❌ **NEVER EVER** add `--run` when using `npm test` - it's already in the script
- ❌ **NO** `--verbose` option exists - use `--reporter=verbose`
- ❌ **NO** `npm run test:coverage` script - use `npm test -- --coverage`
- ✅ **ALWAYS** use `npm test -- <pattern>` for specific tests (NO --run)
- ✅ **REMEMBER** the `--` separator passes args to vitest

## 🚨 CRITICAL TEST PERFORMANCE RULES

**MAXIMUM TEST EXECUTION TIME: 1 MINUTE**

### ✅ REQUIRED Test Performance Actions
- **Cancel tests immediately** if they run longer than 1 minute
- **Consider test failed** if execution exceeds 60 seconds
- **Report timeout issue** to user with specific test pattern that failed
- **Suggest test optimization** or splitting large test suites

### Test Performance Guidelines
- **Individual tests**: Should complete in seconds, not minutes
- **Test suites**: Full suite should run under 30 seconds ideally
- **Specific patterns**: Even targeted tests shouldn't exceed 1 minute

### When Tests Timeout (Over 1 minute)
1. **Immediately cancel** the test execution
2. **Report to user**: "Tests exceeded 1-minute limit and were cancelled"
3. **Identify the issue**: Slow test files, infinite loops, or performance problems
4. **Suggest solutions**: Split tests, optimize code, or check for blocking operations
5. **Never wait longer**: 1 minute is the absolute maximum

## Development Server Management

### AI Assistant Process Management Rules
**CRITICAL: Always use Kiro's built-in process management tools**

#### Required Workflow for Starting Dev Server:
1. **Always check existing processes first** using `listProcesses()`
2. **Look for "npm run dev" process** in the results
3. **Handle based on process state:**
   - **If running and under Kiro control:** Inform user server is available at http://localhost:5175
   - **If running but NOT under Kiro control:** Ask user to restart manually
   - **If stopped:** Restart using `controlBashProcess` with action="start"
   - **If not found:** Start new process using `controlBashProcess` with action="start"
4. **Never use aggressive system commands** like `lsof`, `kill -9`, or `pkill`

#### Process Management Commands:
```javascript
// Check existing processes
listProcesses()

// Start dev server (if none exists or stopped)
controlBashProcess({
  action: "start",
  command: "npm run dev",
  path: "." // workspace root
})

// Stop dev server (if needed)
controlBashProcess({
  action: "stop", 
  processId: <processId from listProcesses>
})
```

## Clean Architecture Philosophy

### 🚨 CRITICAL: No Backward Compatibility or Legacy Support

**ALWAYS aim for clean, fresh architecture with full cleanup when refactoring**

#### Core Principles:
- **Clean slate approach**: Remove old code completely, don't maintain compatibility layers
- **Full cleanup**: Delete deprecated files, unused imports, and legacy patterns
- **Fresh architecture**: Design new solutions from scratch rather than patching old ones
- **Complete removal**: When refactoring, remove all traces of old implementation

#### Refactoring Rules:
- ❌ **NEVER maintain backward compatibility** - Clean break from old patterns
- ❌ **NEVER create migration layers** - Replace systems completely
- ❌ **NEVER keep deprecated code** - Delete old implementations entirely
- ✅ **Complete replacement**: Remove old system, implement new one
- ✅ **Full cleanup**: Delete all related old files and imports
- ✅ **Fresh patterns**: Use modern approaches without legacy constraints

## Minimal Code Generation Philosophy

### 🚨 CRITICAL: Avoid Creating New Code Unless Absolutely Necessary

**ALWAYS prioritize smart, lean, lightweight approaches with minimal code generation**

#### Core Principles:
- **Reuse over create**: Extend existing code rather than writing new files
- **Minimal implementation**: Write only essential code, avoid verbose solutions
- **Smart solutions**: Find clever approaches that require less code
- **Critical file size limit**: Files over 200 lines require serious reconsideration

#### Code Generation Rules:
- ❌ **NEVER create new files** unless absolutely necessary for functionality
- ❌ **NEVER write verbose implementations** - Keep code concise and focused
- ❌ **NEVER generate files over 200 lines** without critical justification
- ✅ **Extend existing files**: Add functionality to current components/services
- ✅ **Reuse patterns**: Leverage existing architecture and utilities
- ✅ **Minimal additions**: Write only the essential code needed

#### File Size Guidelines:
- **Target**: Under 100 lines for new files
- **Warning**: 100-200 lines requires justification
- **Critical**: Over 200 lines needs serious reconsideration

**Remember: The best code is no code. The second best code is minimal, smart, reusable code that extends existing functionality.**

## Git Commit Guidelines

### Commit Message Rules
- Maximum 72 characters for first line
- Use conventional commit format: feat/fix/docs/style/refactor/test/chore
- Keep total message under 300 characters

### Example
```bash
git commit -m "feat: add performance testing script

- Measure TypeScript compilation time
- Add npm script for easy execution"
```