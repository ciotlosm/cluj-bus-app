# Documentation Guidelines

## 📁 Root Directory Policy

**❌ NEVER create markdown files in project root (except README.md)**
**✅ ALWAYS use docs/ folder for documentation**
**✅ ALWAYS use temporary/ folder for intermediate files, testing artifacts**

## 📝 Content Guidelines

### Writing Style
- **Human-friendly** - Write for actual users, not just developers
- **Practical focus** - Include actionable steps and real examples
- **Comprehensive but concise** - Cover everything needed without redundancy

### Update Process
1. **Identify the right document** - Use existing consolidated docs
2. **Update existing sections** - Don't create new files
3. **Cross-reference** - Link between related sections
4. **Update changelog** - Document what changed and why

### File Size Management (AI-Optimized)
- **Optimal**: Under 300 lines (fast AI processing)
- **Good**: 300-400 lines (safe for AI processing)
- **Warning**: 400-500 lines (review for splitting)
- **Critical**: Over 500 lines (split immediately)

## 🚫 Anti-Bloating Enforcement

### FORBIDDEN Practices
❌ **NEVER create new .md files** - Update existing files instead
❌ **NEVER create implementation docs** - Keep technical details minimal
❌ **NEVER create step-by-step guides over 20 lines** - Summarize instead
❌ **NEVER leave temporary files in root** - Use temporary/ folder

### MANDATORY Practices
✅ **ALWAYS update existing files** - Never create new ones
✅ **ALWAYS keep entries under 5 lines** - Problem + Solution format
✅ **ALWAYS delete old content** - Move detailed history to archive
✅ **ALWAYS check file sizes** - Monitor with `wc -l docs/*.md`

### Content Quality Rules

**For Bug Fixes/Issues:**
- **Format**: `**Problem**: Brief description **Solution**: One-line fix`
- **Length**: Maximum 3 lines per issue

**For Features:**
- **Format**: `**Feature**: What it does **Usage**: How to use it`
- **Length**: Maximum 2 lines per feature

**For Changes:**
- **Format**: `**Date**: Brief change description`
- **Length**: Maximum 1 line per change
- **Archive**: Move entries older than 3 months

## 🎯 AI Assistant Guidelines

1. **Never create new markdown files** - Update existing consolidated docs
2. **Use the main documents** - All information goes into appropriate existing files
3. **Keep it consolidated** - Don't fragment information across multiple files
4. **Update changelog** - Always document significant changes
5. **USE TEMPORARY FOLDER** - Always use temporary/ for intermediate files