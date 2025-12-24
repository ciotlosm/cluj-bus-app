#!/usr/bin/env node

/**
 * Maps vs Utils Duplication Analysis
 * Compares maps functionality against existing utils to identify:
 * 1. Duplicated functionality that could reuse existing utils
 * 2. Maps functionality that should be moved to utils
 * 3. Missing utils that maps components need
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MapsUtilsAnalyzer {
  constructor() {
    this.mapsFiles = [];
    this.utilsFiles = [];
    this.duplicates = [];
    this.opportunities = [];
  }

  // Extract function signatures and purposes from code
  extractFunctions(content, filePath) {
    const functions = [];
    
    // Match various function patterns
    const patterns = [
      // Arrow functions
      /(?:export\s+)?const\s+(\w+)\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*{/g,
      // Function declarations
      /(?:export\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g,
      // Method definitions
      /(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        
        // Skip common non-utility functions
        if (['render', 'useEffect', 'useState', 'default'].includes(functionName)) {
          continue;
        }

        // Determine function category based on name patterns
        let category = this.categorizeFunctionName(functionName);
        
        // Extract function body for analysis
        const startIndex = match.index;
        const functionBody = this.extractFunctionBody(content, startIndex);
        
        functions.push({
          name: functionName,
          category,
          filePath,
          body: functionBody,
          purpose: this.inferPurpose(functionName, functionBody),
          dependencies: this.extractDependencies(functionBody)
        });
      }
    });

    return functions;
  }

  // Categorize function based on naming patterns
  categorizeFunctionName(name) {
    const patterns = {
      'distance': /distance|proximity|range/i,
      'calculation': /calculate|compute|measure/i,
      'formatting': /format|display|render|show/i,
      'validation': /validate|check|verify|test/i,
      'transformation': /transform|convert|map|normalize/i,
      'creation': /create|build|generate|make/i,
      'filtering': /filter|find|search|select/i,
      'color': /color|theme|style/i,
      'geometry': /bearing|coordinate|point|shape|polygon/i,
      'icon': /icon|marker|symbol/i,
      'popup': /popup|tooltip|info/i,
      'status': /status|state|condition/i
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(name)) {
        return category;
      }
    }

    return 'other';
  }

  // Extract function body (simplified)
  extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let inFunction = false;
    let body = '';
    
    for (let i = startIndex; i < content.length; i++) {
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
    
    return body.slice(0, 500); // Limit body size for analysis
  }

  // Infer function purpose from name and body
  inferPurpose(name, body) {
    const purposes = [];
    
    // Check for specific patterns in function body
    if (/distance|math\.sqrt|haversine/i.test(body)) purposes.push('distance-calculation');
    if (/color|#[0-9a-f]{6}|rgb|hsl/i.test(body)) purposes.push('color-handling');
    if (/icon|svg|marker/i.test(body)) purposes.push('icon-creation');
    if (/format|tolocale|tofixed/i.test(body)) purposes.push('formatting');
    if (/validate|test|check/i.test(body)) purposes.push('validation');
    if (/coordinate|lat|lon|latitude|longitude/i.test(body)) purposes.push('coordinate-handling');
    if (/bearing|angle|rotation/i.test(body)) purposes.push('geometry-calculation');
    if (/popup|tooltip/i.test(body)) purposes.push('ui-component');
    
    return purposes.length > 0 ? purposes : ['general-utility'];
  }

  // Extract dependencies from function body
  extractDependencies(body) {
    const dependencies = [];
    
    // Look for imports and external calls
    const importMatches = body.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || [];
    const callMatches = body.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\(/g) || [];
    
    importMatches.forEach(imp => {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (match) dependencies.push(match[1]);
    });
    
    return [...new Set(dependencies)];
  }

  // Calculate similarity between two functions
  calculateSimilarity(func1, func2) {
    let similarity = 0;
    
    // Category match
    if (func1.category === func2.category) similarity += 0.3;
    
    // Purpose overlap
    const purposeOverlap = func1.purpose.filter(p => func2.purpose.includes(p)).length;
    const totalPurposes = new Set([...func1.purpose, ...func2.purpose]).size;
    if (totalPurposes > 0) similarity += (purposeOverlap / totalPurposes) * 0.4;
    
    // Name similarity (simple)
    const name1 = func1.name.toLowerCase();
    const name2 = func2.name.toLowerCase();
    if (name1.includes(name2) || name2.includes(name1)) similarity += 0.2;
    
    // Body similarity (very basic)
    const body1 = func1.body.toLowerCase().replace(/\s+/g, ' ');
    const body2 = func2.body.toLowerCase().replace(/\s+/g, ' ');
    const commonWords = body1.split(' ').filter(word => 
      word.length > 3 && body2.includes(word)
    ).length;
    if (commonWords > 5) similarity += 0.1;
    
    return similarity;
  }

  // Analyze a directory of files
  analyzeDirectory(dirPath, fileType = 'maps') {
    const files = this.getAllFiles(dirPath, ['.ts', '.tsx']);
    const allFunctions = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const functions = this.extractFunctions(content, file);
        allFunctions.push(...functions);
      } catch (error) {
        console.warn(`Warning: Could not analyze ${file}: ${error.message}`);
      }
    }
    
    if (fileType === 'maps') {
      this.mapsFiles = files;
    } else {
      this.utilsFiles = files;
    }
    
    return allFunctions;
  }

  // Get all files recursively
  getAllFiles(dirPath, extensions) {
    const files = [];
    
    if (!fs.existsSync(dirPath)) {
      return files;
    }
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Find duplicates between maps and utils
  findDuplicates(mapsFunctions, utilsFunctions) {
    const duplicates = [];
    
    for (const mapsFunc of mapsFunctions) {
      for (const utilsFunc of utilsFunctions) {
        const similarity = this.calculateSimilarity(mapsFunc, utilsFunc);
        
        if (similarity > 0.5) {
          duplicates.push({
            mapsFunction: mapsFunc,
            utilsFunction: utilsFunc,
            similarity,
            recommendation: this.getRecommendation(mapsFunc, utilsFunc, similarity)
          });
        }
      }
    }
    
    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  // Get recommendation for duplicate
  getRecommendation(mapsFunc, utilsFunc, similarity) {
    if (similarity > 0.8) {
      return {
        action: 'REPLACE',
        description: `Replace ${mapsFunc.name} in maps with existing ${utilsFunc.name} from utils`,
        priority: 'HIGH'
      };
    } else if (similarity > 0.6) {
      return {
        action: 'CONSOLIDATE',
        description: `Merge ${mapsFunc.name} and ${utilsFunc.name} into enhanced utility`,
        priority: 'MEDIUM'
      };
    } else {
      return {
        action: 'REVIEW',
        description: `Review if ${mapsFunc.name} can leverage ${utilsFunc.name}`,
        priority: 'LOW'
      };
    }
  }

  // Identify missing utilities that maps need
  identifyMissingUtils(mapsFunctions, utilsFunctions) {
    const missing = [];
    const utilsCategories = new Set(utilsFunctions.map(f => f.category));
    
    // Group maps functions by category
    const mapsByCategory = new Map();
    mapsFunctions.forEach(func => {
      if (!mapsByCategory.has(func.category)) {
        mapsByCategory.set(func.category, []);
      }
      mapsByCategory.get(func.category).push(func);
    });
    
    // Find categories with multiple maps functions but no utils
    mapsByCategory.forEach((functions, category) => {
      if (functions.length >= 2 && !utilsCategories.has(category)) {
        missing.push({
          category,
          functions: functions.map(f => ({ name: f.name, file: path.basename(f.filePath) })),
          recommendation: `Create src/utils/maps/${category}Utils.ts`,
          estimatedSavings: functions.length * 10 // rough estimate
        });
      }
    });
    
    return missing;
  }

  // Generate comprehensive report
  generateReport(mapsFunctions, utilsFunctions, duplicates, missing) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        mapsFiles: this.mapsFiles.length,
        utilsFiles: this.utilsFiles.length,
        mapsFunctions: mapsFunctions.length,
        utilsFunctions: utilsFunctions.length,
        duplicatesFound: duplicates.length,
        missingUtilsCategories: missing.length
      },
      analysis: {
        mapsFunctionsByCategory: this.groupByCategory(mapsFunctions),
        utilsFunctionsByCategory: this.groupByCategory(utilsFunctions),
        duplicates: duplicates.map(d => ({
          mapsFunction: {
            name: d.mapsFunction.name,
            file: path.basename(d.mapsFunction.filePath),
            category: d.mapsFunction.category,
            purpose: d.mapsFunction.purpose
          },
          utilsFunction: {
            name: d.utilsFunction.name,
            file: path.basename(d.utilsFunction.filePath),
            category: d.utilsFunction.category,
            purpose: d.utilsFunction.purpose
          },
          similarity: d.similarity,
          recommendation: d.recommendation
        })),
        missingUtils: missing,
        recommendations: this.generateRecommendations(duplicates, missing)
      }
    };
    
    return report;
  }

  // Group functions by category
  groupByCategory(functions) {
    const grouped = new Map();
    
    functions.forEach(func => {
      if (!grouped.has(func.category)) {
        grouped.set(func.category, []);
      }
      grouped.get(func.category).push({
        name: func.name,
        file: path.basename(func.filePath),
        purpose: func.purpose
      });
    });
    
    return Object.fromEntries(grouped);
  }

  // Generate actionable recommendations
  generateRecommendations(duplicates, missing) {
    const recommendations = [];
    
    // High-priority duplicates
    const highPriorityDuplicates = duplicates.filter(d => d.recommendation.priority === 'HIGH');
    if (highPriorityDuplicates.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Replace maps functions with existing utils',
        description: `${highPriorityDuplicates.length} maps functions can be replaced with existing utils`,
        items: highPriorityDuplicates.map(d => ({
          replace: d.mapsFunction.name,
          with: d.utilsFunction.name,
          file: path.basename(d.mapsFunction.filePath)
        })),
        estimatedSavings: highPriorityDuplicates.length * 15
      });
    }
    
    // Missing utils
    if (missing.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Create missing utility categories',
        description: `${missing.length} utility categories needed for maps functionality`,
        items: missing,
        estimatedSavings: missing.reduce((sum, m) => sum + m.estimatedSavings, 0)
      });
    }
    
    // Medium-priority consolidations
    const mediumPriorityDuplicates = duplicates.filter(d => d.recommendation.priority === 'MEDIUM');
    if (mediumPriorityDuplicates.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Consolidate similar functions',
        description: `${mediumPriorityDuplicates.length} function pairs can be consolidated`,
        items: mediumPriorityDuplicates.map(d => ({
          maps: d.mapsFunction.name,
          utils: d.utilsFunction.name,
          similarity: d.similarity
        })),
        estimatedSavings: mediumPriorityDuplicates.length * 8
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

// Main analysis function
async function analyzeMapsVsUtils() {
  console.log('🔍 Maps vs Utils Duplication Analysis\n');
  
  const analyzer = new MapsUtilsAnalyzer();
  const srcPath = path.join(__dirname, '../src');
  
  // Analyze maps components
  console.log('📁 Analyzing maps components...');
  const mapsPath = path.join(srcPath, 'components/features/maps');
  const mapsFunctions = analyzer.analyzeDirectory(mapsPath, 'maps');
  console.log(`   Found ${mapsFunctions.length} functions in ${analyzer.mapsFiles.length} files`);
  
  // Analyze utils
  console.log('📁 Analyzing existing utils...');
  const utilsPath = path.join(srcPath, 'utils');
  const utilsFunctions = analyzer.analyzeDirectory(utilsPath, 'utils');
  console.log(`   Found ${utilsFunctions.length} functions in ${analyzer.utilsFiles.length} files`);
  
  // Find duplicates
  console.log('\n🔍 Comparing maps functions against utils...');
  const duplicates = analyzer.findDuplicates(mapsFunctions, utilsFunctions);
  console.log(`   Found ${duplicates.length} potential duplicates/overlaps`);
  
  // Identify missing utils
  console.log('🔍 Identifying missing utility categories...');
  const missing = analyzer.identifyMissingUtils(mapsFunctions, utilsFunctions);
  console.log(`   Found ${missing.length} missing utility categories`);
  
  // Display results
  console.log('\n📊 ANALYSIS RESULTS:\n');
  
  // Maps function breakdown
  console.log('🗺️ MAPS FUNCTIONS BY CATEGORY:');
  const mapsByCategory = analyzer.groupByCategory(mapsFunctions);
  Object.entries(mapsByCategory).forEach(([category, functions]) => {
    console.log(`   ${category}: ${functions.length} functions`);
    if (functions.length <= 5) {
      functions.forEach(f => console.log(`     - ${f.name} (${f.file})`));
    } else {
      console.log(`     - ${functions.slice(0, 3).map(f => f.name).join(', ')} ... and ${functions.length - 3} more`);
    }
  });
  
  // Utils function breakdown
  console.log('\n🔧 UTILS FUNCTIONS BY CATEGORY:');
  const utilsByCategory = analyzer.groupByCategory(utilsFunctions);
  Object.entries(utilsByCategory).forEach(([category, functions]) => {
    console.log(`   ${category}: ${functions.length} functions`);
  });
  
  // High-priority duplicates
  console.log('\n🎯 HIGH-PRIORITY DUPLICATES:\n');
  const highPriorityDuplicates = duplicates.filter(d => d.recommendation.priority === 'HIGH');
  if (highPriorityDuplicates.length > 0) {
    highPriorityDuplicates.forEach((dup, index) => {
      console.log(`${index + 1}. 🔴 ${dup.mapsFunction.name} → ${dup.utilsFunction.name}`);
      console.log(`   Maps: ${path.basename(dup.mapsFunction.filePath)}`);
      console.log(`   Utils: ${path.basename(dup.utilsFunction.filePath)}`);
      console.log(`   Similarity: ${(dup.similarity * 100).toFixed(1)}%`);
      console.log(`   Action: ${dup.recommendation.description}`);
      console.log();
    });
  } else {
    console.log('✅ No high-priority duplicates found');
  }
  
  // Missing utilities
  console.log('🚫 MISSING UTILITY CATEGORIES:\n');
  if (missing.length > 0) {
    missing.forEach((miss, index) => {
      console.log(`${index + 1}. 🟡 ${miss.category} utilities`);
      console.log(`   Functions: ${miss.functions.map(f => f.name).join(', ')}`);
      console.log(`   Recommendation: ${miss.recommendation}`);
      console.log(`   Estimated savings: ~${miss.estimatedSavings} lines`);
      console.log();
    });
  } else {
    console.log('✅ All necessary utility categories exist');
  }
  
  // Generate and save report
  const report = analyzer.generateReport(mapsFunctions, utilsFunctions, duplicates, missing);
  
  console.log('🎯 FINAL RECOMMENDATIONS:\n');
  report.analysis.recommendations.forEach((rec, index) => {
    const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`${index + 1}. ${priority} ${rec.action}`);
    console.log(`   ${rec.description}`);
    console.log(`   Estimated savings: ~${rec.estimatedSavings} lines`);
    console.log();
  });
  
  const totalSavings = report.analysis.recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
  console.log(`💰 Total Potential Savings: ~${totalSavings} lines of code`);
  
  // Save report
  const reportPath = path.join(__dirname, '../temporary/analysis/maps-vs-utils-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log('✅ Maps vs Utils analysis complete!');
  
  return report;
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeMapsVsUtils().catch(console.error);
}

export { analyzeMapsVsUtils, MapsUtilsAnalyzer };