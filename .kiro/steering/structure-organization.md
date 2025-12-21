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
- **Maximum file size**: 200 lines per file
- **Splitting strategy**: Split large files into logical, cohesive modules
- **Single responsibility**: Each split module has one clear purpose
- **Functionality preservation**: Original functionality remains intact

### File Splitting Guidelines
- **Logical boundaries**: Split at natural code boundaries
- **Cohesive modules**: Each new file contains related functionality
- **Clear interfaces**: Well-defined exports and imports between split files
- **Import path updates**: Automatically update all references during splitting

## Folder Structure Optimization

### Target Folder Structure
```
src/services/
├── api/                 # API integration services (max 10 files)
├── business-logic/      # Core business logic services (max 10 files)
├── data-processing/     # Data transformation services (max 10 files)
└── utilities/          # Service utilities and helpers (max 10 files)

src/utils/
├── validation/          # Input validation utilities (max 10 files)
├── formatting/          # Date, string, number formatting (max 10 files)
├── data-processing/     # Data transformation utilities (max 10 files)
├── performance/         # Performance monitoring utilities (max 10 files)
└── shared/             # Common utilities across domains (max 10 files)
```

### Reorganization Strategy
- **Logical subfolders**: Create subfolders based on functional grouping
- **Size enforcement**: Ensure no folder exceeds 10 files
- **Intuitive naming**: Subfolder names reflect contained functionality
- **Import path automation**: Automatically update all import paths during moves

## Performance Guidelines

### File and Folder Size Limits (ENFORCED)
- **Files**: Maximum **200 lines**, split if larger
- **Folders**: Maximum **10 files**, create subfolders if needed
- **Services**: Consolidate similar functionality, organize into subfolders by domain
- **Utils**: Group by functional domain with subfolders

### Component Optimization
- **React.memo**: For expensive components
- **useCallback**: For event handlers passed to children
- **useMemo**: For expensive calculations

### Bundle Optimization
- **Code Splitting**: Lazy load non-critical features
- **Tree Shaking**: Use named imports and avoid barrel exports
- **Vendor Chunks**: Separate vendor code in build