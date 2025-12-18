# 📦 Archive

Historical code and migration files preserved for reference.

## 📁 Structure

- **`hooks/`** - Archived hook implementations and migration infrastructure
- **`README.md`** - Archive documentation (moved from old archive directory)

## 🎯 Purpose

This directory contains:
- **Legacy implementations** - Historical code for reference
- **Migration infrastructure** - Tools used for major refactoring projects
- **Benchmark data** - Performance comparison data
- **Disabled tests** - Test files that are preserved but not executed

## ⚠️ Important Notes

- **No production imports** - These files should never be imported by active code
- **Reference only** - Use for understanding architectural decisions
- **Build exclusion** - These files are excluded from TypeScript compilation
- **Historical record** - Maintains evolution of the codebase

## 🔍 Contents

### Hook Archive (`hooks/`)
- `useVehicleProcessing.legacy.ts` - Original 829-line implementation
- `migration/` - Migration infrastructure and tools
- `*.disabled` files - Preserved test files

See individual README files in subdirectories for detailed information about archived components.