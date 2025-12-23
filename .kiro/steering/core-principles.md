# Core Development Principles

## 1. Simplicity First
- **Default to the simplest solution that works**
- **Reuse existing code before writing new code**
- **Consolidate duplicate functionality into shared utilities**
- **Question every abstraction: "Is this actually needed?"**

## 2. Smart Code Reuse
- **Create utilities for repeated patterns (3+ uses)**
- **Extend existing files when functionality is related**
- **Split files only when they exceed 300 lines AND have clear boundaries**
- **Prefer composition over duplication**

## 3. Clean Architecture
- **Remove unused code immediately**
- **Consolidate similar functionality**
- **Use existing patterns from the codebase**
- **Write minimal code that solves the actual problem**

## 4. Decision Framework
Before writing code, ask:
1. **Does this already exist?** → Reuse it
2. **Can I extend existing code?** → Extend it  
3. **Is this used 3+ times?** → Create utility
4. **Is this actually needed?** → Question it

**Remember: The best code is no code. The second best is simple, reusable code.**