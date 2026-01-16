# Future Enhancements

This document tracks feature ideas and enhancements that are deferred for future implementation.

## Station Role Indicators

### Circular Route Detection (Deferred)

**Goal:** Distinguish between truly circular routes (A→B→C→D→E→A) and reversing routes (A→B→C→D→C→B→A) to provide specialized visual indicators.

**Requirements:**

1. **Pattern Detection**
   - Analyze trip stop sequences to detect if routes follow a circular pattern
   - Compare consecutive trips to identify if the route reverses or continues forward
   - Example circular: Route goes A→B→C→D→E→A→B→C→D→E→A (never reverses)
   - Example reversing: Route goes A→B→C→D then D→C→B→A (reverses at terminus)

2. **Visual Indicator**
   - When a truly circular route is detected, use a circular/disc icon instead of Play (▶) and Square (■) icons
   - This provides a distinct visual cue that the route continuously loops

3. **Implementation Considerations**
   - Complexity threshold: If logic exceeds 50 lines, default to treating same-station start/end as Turnaround
   - Store `isCircular` flag in cached route metadata
   - Ensure performance impact is minimal (< 100ms additional calculation time)

4. **Data Requirements**
   - Requires complete trip sequences from `stop_times` API
   - Needs multiple trips per route to establish pattern
   - May need to analyze trips across different service periods

**Deferred Because:**
- Adds significant complexity to initial implementation
- Turnaround indicator (both Play and Square) adequately communicates the station's dual role
- Can be added later without breaking existing functionality
- Requires extensive testing with real-world route data to validate detection logic

**Estimated Effort:** 2-3 days (algorithm design, testing, UI integration)

**Priority:** Low (nice-to-have enhancement)

---

*Last Updated: January 16, 2026*
