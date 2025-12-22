# Project Structure & Organization

## Directory Organization

```
src/
├── components/          # React components
├── stores/              # Zustand state management (minimal, focused stores)
├── services/            # API services and business logic
├── hooks/               # Custom React hooks
├── utils/               # Pure utility functions
├── types/               # TypeScript type definitions
├── theme/               # Material-UI theme configuration
└── test/                # Test utilities and integration tests
```

## Architecture Simplification

**CRITICAL**: This codebase is undergoing architecture simplification:
- **Services folder**: Being consolidated with subfolders (max 10 files each)
- **Utils folder**: Being organized into subfolders by functional domain
- **File size limits**: Enforcing **200-line files**, **10-file folders**
- **Pattern modernization**: Moving from complex patterns to simple exports
- **Import path automation**: Automatic import path updates during moves

## Modern Architecture Patterns

### Core Principles
- **Composition Over Inheritance**: Prefer function composition over class inheritance
- **Dependency Minimization**: Reduce cross-service dependencies
- **Single Responsibility**: Each file/function has one clear purpose
- **Minimal Complexity**: Avoid over-engineering and complex patterns
- **Testable Design**: Easy to test without complex mocking

## File Size Optimization

### Size Limit Enforcement
- **Maximum file size**: 200 lines per file (EXCLUDES test files)
- **Test files exempt**: Files with `.test.`, `.spec.`, or in test directories are exempt from line limits
- **Splitting strategy**: Split large files into logical, cohesive modules
- **Single responsibility**: Each split module has one clear purpose
- **Functionality preservation**: Original functionality remains intact

### File Splitting Guidelines
- **Logical boundaries**: Split at natural code boundaries
- **Cohesive modules**: Each new file contains related functionality
- **Clear interfaces**: Well-defined exports and imports between split files
- **Import path updates**: Automatically update all references during splitting
- **Test files**: No splitting required regardless of size

## Folder Structure Optimization

### Reorganization Strategy
- **Logical subfolders**: Create subfolders based on functional grouping
- **Size enforcement**: Ensure no folder exceeds 10 files
- **Intuitive naming**: Subfolder names reflect contained functionality
- **Import path automation**: Automatically update all import paths during moves

## Performance Guidelines

### File and Folder Size Limits (ENFORCED)
- **Files**: Maximum **200 lines**, split if larger (EXCLUDES test files)
- **Test files**: No line limits for `.test.`, `.spec.`, or test directory files
- **Folders**: Maximum **10 files**, create subfolders if needed
- **Services**: Consolidate similar functionality, organize into subfolders by domain
- **Utils**: Group by functional domain with subfolders

### Component Optimization
- **React.memo**: For expensive components
- **useCallback**: For event handlers passed to children
- **useMemo**: For expensive calculations