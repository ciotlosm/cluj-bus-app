# Documentation Structure

## Current Consolidated Structure

All documentation MUST go in the `docs/` directory:

```
docs/
├── README.md              # Documentation index and navigation
├── getting-started.md     # Setup, installation, first run
├── user-guide.md         # How to use the app (for end users)
├── developer-guide.md    # Technical details (for developers)
├── changelog.md          # Recent updates and changes
├── api/                  # API documentation and technical specs
├── performance/          # Performance analysis and benchmarks
└── troubleshooting/      # ORGANIZED TROUBLESHOOTING (split for manageability)
    ├── README.md         # Troubleshooting index and navigation
    ├── common-issues.md  # Most frequent problems
    ├── api-authentication.md  # API and auth issues
    ├── station-route-issues.md  # Station/route problems
    ├── mobile-pwa-issues.md     # Mobile and PWA issues
    ├── performance-caching.md   # Performance and cache issues
    ├── testing-development.md   # Test and dev issues
    └── emergency-recovery.md    # Last resort procedures

temporary/                # TEMPORARY FILES (git-ignored except structure)
├── analysis/            # Generated reports, codebase statistics
├── screenshots/         # UI mockups, comparison images, visual tests
├── testing/             # Test artifacts, debug outputs, logs
└── experiments/         # Temporary code experiments, prototypes
```

## Where to Add New Information

**Setup/Installation Issues** → `docs/getting-started.md`
**User-Facing Features** → `docs/user-guide.md` + `docs/changelog.md`
**Technical Details** → `docs/developer-guide.md`
**API Documentation** → `docs/api/` folder
**Performance Analysis** → `docs/performance/` folder
**Temporary/Intermediate Files** → `temporary/` folder
**Bug Fixes/Issues** → Appropriate `docs/troubleshooting/` file

## File Size Monitoring

Current structure is good - monitor for size limits with `wc -l docs/*.md`