# Cluj Bus App - Documentation Guidelines

## 📁 **Documentation Organization Rules**

### **CRITICAL: Root Directory Policy**

**❌ NEVER create markdown files in the project root directory (except README.md)**

### **✅ NEW CONSOLIDATED STRUCTURE (December 2024):**

All documentation MUST go in the `docs/` directory using our **human-friendly consolidated structure**:

```
docs/
├── README.md              # Documentation index and navigation
├── getting-started.md     # Setup, installation, first run
├── user-guide.md         # How to use the app (for end users)
├── developer-guide.md    # Technical details (for developers)
├── troubleshooting.md    # Common problems and solutions
├── changelog.md          # Recent updates and changes
└── archive/              # Historical detailed documentation
    ├── README.md         # Archive index
    └── [old files]       # Previous docs (kept for reference)
```

### **Documentation Categories (NEW):**

- **`docs/getting-started.md`** - Setup guides, installation, API key configuration
- **`docs/user-guide.md`** - App usage, features, mobile tips, daily workflows
- **`docs/developer-guide.md`** - Architecture, API integration, testing, debugging
- **`docs/troubleshooting.md`** - Bug fixes, common issues, debug tools
- **`docs/changelog.md`** - Recent changes, breaking changes, migration guides
- **`docs/archive/`** - Historical documentation (50+ old files preserved for reference)

### **Where to Add New Information:**

**For Setup/Installation Issues:**
- ✅ Add to `docs/getting-started.md`
- Include prerequisites, commands, verification steps

**For User-Facing Features:**
- ✅ Add to `docs/user-guide.md` 
- Include how-to guides, tips, feature explanations

**For Technical Details:**
- ✅ Add to `docs/developer-guide.md`
- Include architecture, APIs, code patterns, debugging

**For Bug Fixes/Issues:**
- ✅ Add to `docs/troubleshooting.md`
- Include problem description, root cause, solution

**For Recent Changes:**
- ✅ Add to `docs/changelog.md`
- Include what changed, why, and migration notes

### **Examples:**

✅ **Correct Approach:**
- Setup issue → Update `docs/getting-started.md`
- New feature → Update `docs/user-guide.md` + `docs/changelog.md`
- API change → Update `docs/developer-guide.md` + `docs/changelog.md`
- Bug fix → Update `docs/troubleshooting.md` + `docs/changelog.md`

❌ **Old Approach (Don't Do):**
- Creating `SETUP_ISSUE_FIX.md` in root
- Creating new files in `docs/implementation/`
- Scattering information across multiple small files

## 🎯 **AI Assistant Guidelines (UPDATED)**

When working on this project:

1. **Never create new markdown files** - Update existing consolidated docs instead
2. **Use the 5 main documents** - All information goes into one of the 5 main files
3. **Update the right document** - Follow the "Where to Add New Information" guide above
4. **Keep it consolidated** - Don't fragment information across multiple files
5. **Archive old approach** - Historical detailed docs are in `docs/archive/` for reference
6. **Update changelog** - Always document significant changes in `docs/changelog.md`

## 📝 **Content Guidelines (UPDATED)**

### **Writing Style:**
- **Human-friendly** - Write for actual users, not just developers
- **Practical focus** - Include actionable steps and real examples
- **Clear navigation** - Use consistent headings and cross-references
- **Comprehensive but concise** - Cover everything needed without redundancy

### **Update Process:**
1. **Identify the right document** - Use the guide above
2. **Update existing sections** - Don't create new files
3. **Cross-reference** - Link between related sections
4. **Update changelog** - Document what changed and why
5. **Test instructions** - Verify setup/troubleshooting steps work

### **Maintenance:**
- **Keep consolidated docs current** - Update the 5 main files regularly
- **Archive detailed history** - Move old detailed docs to `docs/archive/`
- **Version updates** - Run `node scripts/update-version.js` for major doc changes
- **Review quarterly** - Ensure information stays accurate and useful

### **Quality Checks:**
- ✅ Information is in the right consolidated document
- ✅ Instructions are tested and work
- ✅ Cross-references are accurate
- ✅ Changelog reflects the changes
- ✅ No new scattered files created

---

**Remember: Consolidated, human-friendly documentation is better than scattered technical files!**