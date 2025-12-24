#!/usr/bin/env node

/**
 * AST-based Duplicate Code Analysis for Maps Features
 * Analyzes TypeScript/React files for duplicate patterns, functions, and code blocks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple AST-like pattern matching for TypeScript/React
class CodeAnalyzer {
  constructor() {
    this.patterns = new Map();
    this.functions = new Map();
    this.imports = new Map();
    this.duplicates = [];
  }

  // Extract function signatures and bodies
  extractFunctions(content, filePath) {
    const functions = [];
    
    // Match function declarations, arrow functions, and methods
    const functionRegex = /(?:export\s+)?(?:const|function)\s+(\w+)\s*[=:]?\s*(?:\([^)]*\)\s*(?::\s*[^{]+)?\s*=>|function\s*\([^)]*\))\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
    const arrowFunctionRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
    const methodRegex = /(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;

    let match;
    
    // Function declarations
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        body: this.normalizeCode(match[2]),
        type: 'function',
        filePath,
        fullMatch: match[0]
      });
    }

    // Arrow functions
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        body: this.normalizeCode(match[2]),
        type: 'arrow',
        filePath,
        fullMatch: match[0]
      });
    }

    return functions;
  }

  // Extract JSX patterns and component structures
  extractJSXPatterns(content, filePath) {
    const patterns = [];
    
    // Icon creation patterns
    const iconPatterns = content.match(/new Icon\s*\({[^}]+}\)/g) || [];
    iconPatterns.forEach(pattern => {
      patterns.push({
        type: 'icon-creation',
        pattern: this.normalizeCode(pattern),
        filePath,
        fullMatch: pattern
      });
    });

    // SVG creation patterns
    const svgPatterns = content.match(/`[^`]*<svg[^`]*<\/svg>[^`]*`/g) || [];
    svgPatterns.forEach(pattern => {
      patterns.push({
        type: 'svg-template',
        pattern: this.normalizeCode(pattern),
        filePath,
        fullMatch: pattern
      });
    });

    // Popup JSX patterns
    const popupPatterns = content.match(/<Popup>[\s\S]*?<\/Popup>/g) || [];
    popupPatterns.forEach(pattern => {
      patterns.push({
        type: 'popup-jsx',
        pattern: this.normalizeCode(pattern),
        filePath,
        fullMatch: pattern
      });
    });

    // Style object patterns
    const stylePatterns = content.match(/style=\s*{{[^}]+}}/g) || [];
    stylePatterns.forEach(pattern => {
      patterns.push({
        type: 'inline-style',
        pattern: this.normalizeCode(pattern),
        filePath,
        fullMatch: pattern
      });
    });

    return patterns;
  }

  // Normalize code for comparison (remove whitespace, variables)
  normalizeCode(code) {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\b\d+(\.\d+)?\b/g, 'NUM')
      .replace(/['"`][^'"`]*['"`]/g, 'STR')
      .replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, (match) => {
        // Keep common keywords, replace variables
        const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'Icon', 'Marker', 'Popup', 'svg', 'circle', 'rect', 'polygon'];
        return keywords.includes(match) ? match : 'VAR';
      })
      .trim();
  }

  // Calculate similarity between two code blocks
  calculateSimilarity(code1, code2) {
    const tokens1 = code1.split(' ');
    const tokens2 = code2.split(' ');
    
    const maxLength = Math.max(tokens1.length, tokens2.length);
    if (maxLength === 0) return 0;
    
    let matches = 0;
    const minLength = Math.min(tokens1.length, tokens2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (tokens1[i] === tokens2[i]) {
        matches++;
      }
    }
    
    return matches / maxLength;
  }

  // Find duplicate patterns
  findDuplicates(items, threshold = 0.7) {
    const duplicates = [];
    
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i];
        const item2 = items[j];
        
        if (item1.filePath === item2.filePath) continue; // Skip same file
        
        const similarity = this.calculateSimilarity(item1.pattern || item1.body, item2.pattern || item2.body);
        
        if (similarity >= threshold) {
          duplicates.push({
            similarity: similarity,
            item1: item1,
            item2: item2,
            type: item1.type
          });
        }
      }
    }
    
    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  // Analyze a single file
  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const functions = this.extractFunctions(content, filePath);
    const patterns = this.extractJSXPatterns(content, filePath);
    
    return {
      functions,
      patterns,
      imports: this.extractImports(content, filePath),
      lineCount: content.split('\n').length
    };
  }

  // Extract import statements
  extractImports(content, filePath) {
    const imports = [];
    const importRegex = /import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"][^'"]+['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        statement: match[0],
        filePath
      });
    }
    
    return imports;
  }

  // Generate consolidation recommendations
  generateRecommendations(duplicates) {
    const recommendations = [];
    const groupedDuplicates = new Map();
    
    // Group duplicates by type
    duplicates.forEach(dup => {
      const type = dup.type;
      if (!groupedDuplicates.has(type)) {
        groupedDuplicates.set(type, []);
      }
      groupedDuplicates.get(type).push(dup);
    });
    
    groupedDuplicates.forEach((dups, type) => {
      const count = dups.length;
      const avgSimilarity = dups.reduce((sum, d) => sum + d.similarity, 0) / count;
      
      let recommendation = {
        type,
        count,
        avgSimilarity: avgSimilarity.toFixed(2),
        priority: 'LOW',
        action: '',
        estimatedSavings: 0
      };
      
      switch (type) {
        case 'icon-creation':
          recommendation.priority = count >= 3 ? 'HIGH' : 'MEDIUM';
          recommendation.action = 'Extract to src/utils/maps/iconUtils.ts';
          recommendation.estimatedSavings = count * 15; // ~15 lines per icon function
          break;
          
        case 'svg-template':
          recommendation.priority = count >= 2 ? 'HIGH' : 'MEDIUM';
          recommendation.action = 'Create reusable SVG template functions';
          recommendation.estimatedSavings = count * 20; // ~20 lines per SVG template
          break;
          
        case 'popup-jsx':
          recommendation.priority = count >= 3 ? 'MEDIUM' : 'LOW';
          recommendation.action = 'Create MapPopup component or popupStyles utility';
          recommendation.estimatedSavings = count * 25; // ~25 lines per popup
          break;
          
        case 'inline-style':
          recommendation.priority = count >= 4 ? 'MEDIUM' : 'LOW';
          recommendation.action = 'Extract to shared style constants';
          recommendation.estimatedSavings = count * 5; // ~5 lines per style
          break;
          
        case 'function':
          recommendation.priority = avgSimilarity > 0.8 ? 'HIGH' : 'MEDIUM';
          recommendation.action = 'Extract to shared utility function';
          recommendation.estimatedSavings = count * 10; // ~10 lines per function
          break;
      }
      
      recommendations.push(recommendation);
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.estimatedSavings - a.estimatedSavings;
    });
  }
}

// Main analysis function
async function analyzeMapsFeatures() {
  const analyzer = new CodeAnalyzer();
  const mapsDir = path.join(__dirname, '../src/components/features/maps');
  
  console.log('🔍 Starting AST-based duplicate code analysis for maps features...\n');
  
  // Get all TypeScript/React files in maps directory
  const files = fs.readdirSync(mapsDir)
    .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
    .map(file => path.join(mapsDir, file));
  
  console.log(`📁 Analyzing ${files.length} files:`);
  files.forEach(file => console.log(`   - ${path.basename(file)}`));
  console.log();
  
  // Analyze each file
  const allFunctions = [];
  const allPatterns = [];
  const fileStats = [];
  
  for (const file of files) {
    try {
      const analysis = analyzer.analyzeFile(file);
      allFunctions.push(...analysis.functions);
      allPatterns.push(...analysis.patterns);
      
      fileStats.push({
        file: path.basename(file),
        lineCount: analysis.lineCount,
        functionCount: analysis.functions.length,
        patternCount: analysis.patterns.length,
        importCount: analysis.imports.length
      });
      
      console.log(`✅ ${path.basename(file)}: ${analysis.lineCount} lines, ${analysis.functions.length} functions, ${analysis.patterns.length} patterns`);
    } catch (error) {
      console.error(`❌ Error analyzing ${path.basename(file)}:`, error.message);
    }
  }
  
  console.log('\n📊 File Statistics:');
  console.table(fileStats);
  
  // Find duplicates
  console.log('\n🔍 Analyzing for duplicate patterns...\n');
  
  const functionDuplicates = analyzer.findDuplicates(allFunctions, 0.6);
  const patternDuplicates = analyzer.findDuplicates(allPatterns, 0.7);
  
  const allDuplicates = [...functionDuplicates, ...patternDuplicates];
  
  console.log(`🎯 Found ${allDuplicates.length} potential duplicates:\n`);
  
  // Group and display duplicates
  const duplicatesByType = new Map();
  allDuplicates.forEach(dup => {
    const type = dup.type;
    if (!duplicatesByType.has(type)) {
      duplicatesByType.set(type, []);
    }
    duplicatesByType.get(type).push(dup);
  });
  
  duplicatesByType.forEach((dups, type) => {
    console.log(`\n📋 ${type.toUpperCase()} DUPLICATES (${dups.length} found):`);
    dups.slice(0, 3).forEach((dup, index) => { // Show top 3 per type
      console.log(`   ${index + 1}. Similarity: ${(dup.similarity * 100).toFixed(1)}%`);
      console.log(`      File 1: ${path.basename(dup.item1.filePath)}`);
      console.log(`      File 2: ${path.basename(dup.item2.filePath)}`);
      if (dup.item1.name) {
        console.log(`      Function: ${dup.item1.name} vs ${dup.item2.name}`);
      }
    });
    if (dups.length > 3) {
      console.log(`   ... and ${dups.length - 3} more`);
    }
  });
  
  // Generate recommendations
  console.log('\n🎯 CONSOLIDATION RECOMMENDATIONS:\n');
  const recommendations = analyzer.generateRecommendations(allDuplicates);
  
  recommendations.forEach((rec, index) => {
    const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`${index + 1}. ${priority} ${rec.type.toUpperCase()} (${rec.priority} Priority)`);
    console.log(`   Duplicates: ${rec.count} instances`);
    console.log(`   Avg Similarity: ${rec.avgSimilarity}%`);
    console.log(`   Action: ${rec.action}`);
    console.log(`   Est. Savings: ~${rec.estimatedSavings} lines`);
    console.log();
  });
  
  // Calculate total potential savings
  const totalSavings = recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
  console.log(`💡 Total Estimated Savings: ~${totalSavings} lines of code\n`);
  
  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesAnalyzed: files.length,
      totalDuplicates: allDuplicates.length,
      totalEstimatedSavings: totalSavings,
      highPriorityItems: recommendations.filter(r => r.priority === 'HIGH').length
    },
    fileStats,
    duplicates: allDuplicates.map(dup => ({
      type: dup.type,
      similarity: dup.similarity,
      file1: path.basename(dup.item1.filePath),
      file2: path.basename(dup.item2.filePath),
      name1: dup.item1.name,
      name2: dup.item2.name
    })),
    recommendations
  };
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../temporary/analysis/ast-duplicate-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  console.log('\n✅ Analysis complete!');
  
  return report;
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeMapsFeatures().catch(console.error);
}

export { analyzeMapsFeatures, CodeAnalyzer };