#!/usr/bin/env node

/**
 * Refined Maps vs Utils Analysis
 * Focuses on meaningful function duplicates and actual utility opportunities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RefinedAnalyzer {
  constructor() {
    this.mapsUtilities = [];
    this.existingUtils = [];
  }

  // Extract meaningful utility functions (not basic language constructs)
  extractMeaningfulFunctions(content, filePath) {
    const functions = [];
    
    // Focus on named functions that look like utilities
    const patterns = [
      // Const arrow functions with meaningful names
      /const\s+(calculate\w+|format\w+|get\w+|create\w+|find\w+|normalize\w+|validate\w+|transform\w+)\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g,
      // Function declarations
      /(?:export\s+)?function\s+(calculate\w+|format\w+|get\w+|create\w+|find\w+|normalize\w+|validate\w+|transform\w+)\s*\(/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        
        // Skip if too generic or short
        if (functionName.length < 6) continue;
        
        // Extract function body
        const startIndex = match.index;
        const functionBody = this.extractFunctionBody(content, startIndex);
        
        // Only include functions with substantial logic
        if (functionBody.length < 50) continue;
        
        functions.push({
          name: functionName,
          filePath,
          body: functionBody,
          category: this.categorizeFunction(functionName, functionBody),
          lineCount: functionBody.split('\n').length,
          signature: this.extractSignature(match[0])
        });
      }
    });

    return functions;
  }

  // Extract function signature
  extractSignature(functionDeclaration) {
    // Extract parameter types and return type
    const paramMatch = functionDeclaration.match(/\(([^)]*)\)/);
    const returnMatch = functionDeclaration.match(/:\s*([^=>{]+)/);
    
    return {
      params: paramMatch ? paramMatch[1].trim() : '',
      returnType: returnMatch ? returnMatch[1].trim() : 'unknown'
    };
  }

  // Categorize function based on name and content
  categorizeFunction(name, body) {
    // Distance/geometry calculations
    if (/distance|bearing|coordinate|haversine|sqrt|math\./i.test(name + body)) {
      return 'geometry';
    }
    
    // Icon/visual creation
    if (/icon|svg|marker|create.*icon/i.test(name + body)) {
      return 'icon-creation';
    }
    
    // Color handling
    if (/color|rgb|hex|hsl/i.test(name + body)) {
      return 'color-utils';
    }
    
    // Formatting/display
    if (/format|display|tolocale|tofixed/i.test(name + body)) {
      return 'formatting';
    }
    
    // Validation
    if (/validate|check|verify|test.*valid/i.test(name + body)) {
      return 'validation';
    }
    
    // Data transformation
    if (/transform|convert|normalize|map.*data/i.test(name + body)) {
      return 'transformation';
    }
    
    return 'other';
  }

  // Extract function body with better parsing
  extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let inFunction = false;
    let body = '';
    let i = startIndex;
    
    // Find the opening brace
    while (i < content.length && content[i] !== '{') {
      i++;
    }
    
    if (i >= content.length) return '';
    
    // Extract until matching closing brace
    for (; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
      }
      
      if (inFunction) {
        body += char;
      }
      
      if (inFunction && braceCount === 0) {
        break;
      }
    }
    
    return body;
  }

  // Calculate meaningful similarity between functions
  calculateMeaningfulSimilarity(func1, func2) {
    let similarity = 0;
    
    // Category must match for meaningful similarity
    if (func1.category !== func2.category) {
      return 0;
    }
    
    // Name similarity (semantic)
    const name1 = func1.name.toLowerCase();
    const name2 = func2.name.toLowerCase();
    
    // Check for semantic similarity in names
    const semanticSimilarity = this.calculateNameSimilarity(name1, name2);
    similarity += semanticSimilarity * 0.4;
    
    // Parameter similarity
    const paramSimilarity = this.calculateParamSimilarity(func1.signature.params, func2.signature.params);
    similarity += paramSimilarity * 0.3;
    
    // Body similarity (look for key patterns)
    const bodySimilarity = this.calculateBodySimilarity(func1.body, func2.body);
    similarity += bodySimilarity * 0.3;
    
    return similarity;
  }

  // Calculate name similarity based on semantic meaning
  calculateNameSimilarity(name1, name2) {
    // Exact match
    if (name1 === name2) return 1.0;
    
    // One contains the other
    if (name1.includes(name2) || name2.includes(name1)) return 0.8;
    
    // Similar prefixes/suffixes
    const prefixes = ['calculate', 'format', 'get', 'create', 'find', 'normalize'];
    const suffixes = ['utils', 'helper', 'calculator', 'formatter'];
    
    let prefixMatch = false;
    let suffixMatch = false;
    
    for (const prefix of prefixes) {
      if (name1.startsWith(prefix) && name2.startsWith(prefix)) {
        prefixMatch = true;
        break;
      }
    }
    
    for (const suffix of suffixes) {
      if (name1.endsWith(suffix) && name2.endsWith(suffix)) {
        suffixMatch = true;
        break;
      }
    }
    
    if (prefixMatch && suffixMatch) return 0.7;
    if (prefixMatch || suffixMatch) return 0.5;
    
    return 0;
  }

  // Calculate parameter similarity
  calculateParamSimilarity(params1, params2) {
    if (!params1 && !params2) return 1.0;
    if (!params1 || !params2) return 0;
    
    // Simple comparison - could be enhanced
    const p1 = params1.toLowerCase().replace(/\s+/g, '');
    const p2 = params2.toLowerCase().replace(/\s+/g, '');
    
    if (p1 === p2) return 1.0;
    if (p1.includes(p2) || p2.includes(p1)) return 0.7;
    
    return 0;
  }

  // Calculate body similarity based on key patterns
  calculateBodySimilarity(body1, body2) {
    // Look for common algorithmic patterns
    const patterns = [
      /math\.sqrt/g,
      /math\.atan2/g,
      /math\.sin/g,
      /math\.cos/g,
      /new\s+icon/gi,
      /svg/gi,
      /tolocalestring/gi,
      /tofixed/gi,
      /return.*\?/g, // ternary operators
      /if\s*\(/g,
      /for\s*\(/g,
      /\.map\(/g,
      /\.filter\(/g,
      /\.reduce\(/g
    ];
    
    let commonPatterns = 0;
    let totalPatterns = 0;
    
    patterns.forEach(pattern => {
      const matches1 = (body1.match(pattern) || []).length;
      const matches2 = (body2.match(pattern) || []).length;
      
      if (matches1 > 0 || matches2 > 0) {
        totalPatterns++;
        if (matches1 > 0 && matches2 > 0) {
          commonPatterns++;
        }
      }
    });
    
    return totalPatterns > 0 ? commonPatterns / totalPatterns : 0;
  }

  // Analyze specific utility files for existing functionality
  analyzeExistingUtils() {
    const utilsPath = path.join(__dirname, '../src/utils');
    const existingUtils = [];
    
    // Key utility files to check
    const keyUtilFiles = [
      'arrival/distanceUtils.ts',
      'arrival/geometryUtils.ts',
      'arrival/DistanceCalculator.ts',
      'vehicle/vehicleFormatUtils.ts',
      'station/stationDisplayUtils.ts',
      'core/performanceUtils.ts'
    ];
    
    keyUtilFiles.forEach(relPath => {
      const fullPath = path.join(utilsPath, relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const functions = this.extractMeaningfulFunctions(content, relPath);
        existingUtils.push(...functions);
      }
    });
    
    return existingUtils;
  }

  // Analyze maps for utility functions
  analyzeMapsUtils() {
    const mapsPath = path.join(__dirname, '../src/components/features/maps');
    const mapsUtils = [];
    
    const files = fs.readdirSync(mapsPath)
      .filter(file => file.endsWith('.tsx'))
      .map(file => path.join(mapsPath, file));
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const functions = this.extractMeaningfulFunctions(content, path.basename(file));
      mapsUtils.push(...functions);
    });
    
    return mapsUtils;
  }
}

// Main analysis
async function runRefinedAnalysis() {
  console.log('🎯 Refined Maps vs Utils Duplication Analysis\n');
  
  const analyzer = new RefinedAnalyzer();
  
  // Analyze existing utils
  console.log('📁 Analyzing existing utility functions...');
  const existingUtils = analyzer.analyzeExistingUtils();
  console.log(`   Found ${existingUtils.length} meaningful utility functions`);
  
  // Analyze maps utilities
  console.log('📁 Analyzing maps utility functions...');
  const mapsUtils = analyzer.analyzeMapsUtils();
  console.log(`   Found ${mapsUtils.length} utility functions in maps`);
  
  // Display breakdown by category
  console.log('\n📊 FUNCTION BREAKDOWN:\n');
  
  console.log('🔧 EXISTING UTILS BY CATEGORY:');
  const existingByCategory = new Map();
  existingUtils.forEach(func => {
    if (!existingByCategory.has(func.category)) {
      existingByCategory.set(func.category, []);
    }
    existingByCategory.get(func.category).push(func);
  });
  
  existingByCategory.forEach((functions, category) => {
    console.log(`   ${category}: ${functions.length} functions`);
    functions.forEach(f => console.log(`     - ${f.name} (${f.filePath})`));
  });
  
  console.log('\n🗺️ MAPS UTILS BY CATEGORY:');
  const mapsByCategory = new Map();
  mapsUtils.forEach(func => {
    if (!mapsByCategory.has(func.category)) {
      mapsByCategory.set(func.category, []);
    }
    mapsByCategory.get(func.category).push(func);
  });
  
  mapsByCategory.forEach((functions, category) => {
    console.log(`   ${category}: ${functions.length} functions`);
    functions.forEach(f => console.log(`     - ${f.name} (${f.filePath}) - ${f.lineCount} lines`));
  });
  
  // Find meaningful duplicates
  console.log('\n🔍 MEANINGFUL DUPLICATES:\n');
  const meaningfulDuplicates = [];
  
  mapsUtils.forEach(mapsFunc => {
    existingUtils.forEach(utilsFunc => {
      const similarity = analyzer.calculateMeaningfulSimilarity(mapsFunc, utilsFunc);
      
      if (similarity > 0.5) {
        meaningfulDuplicates.push({
          mapsFunction: mapsFunc,
          utilsFunction: utilsFunc,
          similarity,
          category: mapsFunc.category
        });
      }
    });
  });
  
  meaningfulDuplicates.sort((a, b) => b.similarity - a.similarity);
  
  if (meaningfulDuplicates.length > 0) {
    console.log('🎯 HIGH-CONFIDENCE DUPLICATES:');
    meaningfulDuplicates.forEach((dup, index) => {
      console.log(`${index + 1}. 🔴 ${dup.mapsFunction.name} → ${dup.utilsFunction.name}`);
      console.log(`   Category: ${dup.category}`);
      console.log(`   Maps: ${dup.mapsFunction.filePath} (${dup.mapsFunction.lineCount} lines)`);
      console.log(`   Utils: ${dup.utilsFunction.filePath}`);
      console.log(`   Similarity: ${(dup.similarity * 100).toFixed(1)}%`);
      console.log();
    });
  } else {
    console.log('✅ No high-confidence duplicates found');
  }
  
  // Identify consolidation opportunities
  console.log('💡 CONSOLIDATION OPPORTUNITIES:\n');
  
  const consolidationOpportunities = [];
  
  // Look for categories with multiple maps functions but no existing utils
  mapsByCategory.forEach((mapsFunctions, category) => {
    const existingInCategory = existingByCategory.get(category) || [];
    
    if (mapsFunctions.length >= 2) {
      if (existingInCategory.length === 0) {
        // No existing utils in this category - create new utility file
        consolidationOpportunities.push({
          type: 'CREATE_NEW_UTIL',
          category,
          functions: mapsFunctions,
          recommendation: `Create src/utils/maps/${category}Utils.ts`,
          estimatedSavings: mapsFunctions.reduce((sum, f) => sum + f.lineCount, 0) * 0.6
        });
      } else {
        // Existing utils - consider extending
        consolidationOpportunities.push({
          type: 'EXTEND_EXISTING',
          category,
          functions: mapsFunctions,
          existingUtils: existingInCategory,
          recommendation: `Extend existing ${category} utilities`,
          estimatedSavings: mapsFunctions.reduce((sum, f) => sum + f.lineCount, 0) * 0.4
        });
      }
    }
  });
  
  consolidationOpportunities.forEach((opp, index) => {
    const priority = opp.type === 'CREATE_NEW_UTIL' ? '🔴' : '🟡';
    console.log(`${index + 1}. ${priority} ${opp.recommendation}`);
    console.log(`   Category: ${opp.category}`);
    console.log(`   Maps functions: ${opp.functions.map(f => f.name).join(', ')}`);
    if (opp.existingUtils) {
      console.log(`   Existing utils: ${opp.existingUtils.map(f => f.name).join(', ')}`);
    }
    console.log(`   Estimated savings: ~${Math.round(opp.estimatedSavings)} lines`);
    console.log();
  });
  
  // Summary
  const totalSavings = consolidationOpportunities.reduce((sum, opp) => sum + opp.estimatedSavings, 0);
  console.log(`💰 Total Potential Savings: ~${Math.round(totalSavings)} lines of code`);
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      existingUtils: existingUtils.length,
      mapsUtils: mapsUtils.length,
      meaningfulDuplicates: meaningfulDuplicates.length,
      consolidationOpportunities: consolidationOpportunities.length,
      totalPotentialSavings: Math.round(totalSavings)
    },
    existingUtilsByCategory: Object.fromEntries(existingByCategory),
    mapsUtilsByCategory: Object.fromEntries(mapsByCategory),
    meaningfulDuplicates,
    consolidationOpportunities
  };
  
  const reportPath = path.join(__dirname, '../temporary/analysis/refined-maps-utils-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log('✅ Refined analysis complete!');
}

// Run analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  runRefinedAnalysis().catch(console.error);
}

export { runRefinedAnalysis };