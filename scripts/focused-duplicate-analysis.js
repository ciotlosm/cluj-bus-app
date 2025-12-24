#!/usr/bin/env node

/**
 * Focused Duplicate Analysis - Identifies specific function and pattern duplicates
 * Focuses on icon creation, popup patterns, and utility functions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract icon creation functions
function extractIconCreationFunctions(content, filePath) {
  const iconFunctions = [];
  
  // Match icon creation function patterns
  const iconFunctionRegex = /const\s+(create\w*Icon)\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?return\s+new\s+Icon\s*\({[\s\S]*?}\);?\s*}/g;
  
  let match;
  while ((match = iconFunctionRegex.exec(content)) !== null) {
    const functionName = match[1];
    const fullFunction = match[0];
    
    // Extract key characteristics
    const hasSize = /size|width|height/i.test(fullFunction);
    const hasColor = /color/i.test(fullFunction);
    const hasSVG = /svg/i.test(fullFunction);
    const hasShape = /circle|rect|polygon/i.test(fullFunction);
    
    iconFunctions.push({
      name: functionName,
      filePath,
      fullFunction,
      characteristics: {
        hasSize,
        hasColor,
        hasSVG,
        hasShape
      },
      lineCount: fullFunction.split('\n').length
    });
  }
  
  return iconFunctions;
}

// Extract popup JSX patterns
function extractPopupPatterns(content, filePath) {
  const popupPatterns = [];
  
  // Match Popup JSX blocks
  const popupRegex = /<Popup>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/Popup>/g;
  
  let match;
  while ((match = popupRegex.exec(content)) !== null) {
    const popupContent = match[1];
    const fullPopup = match[0];
    
    // Analyze popup structure
    const hasHeader = /<div[^>]*fontWeight[^>]*bold/i.test(popupContent);
    const hasMultipleFields = (popupContent.match(/<strong>/g) || []).length > 2;
    const hasConditionalContent = /&&|\?/g.test(popupContent);
    const hasFooter = /fontSize[^>]*12px|color[^>]*#666/i.test(popupContent);
    
    popupPatterns.push({
      filePath,
      fullPopup,
      characteristics: {
        hasHeader,
        hasMultipleFields,
        hasConditionalContent,
        hasFooter
      },
      lineCount: fullPopup.split('\n').length,
      fieldCount: (popupContent.match(/<strong>/g) || []).length
    });
  }
  
  return popupPatterns;
}

// Extract utility functions
function extractUtilityFunctions(content, filePath) {
  const utilityFunctions = [];
  
  // Match utility function patterns
  const utilityRegex = /const\s+(calculate\w+|format\w+|get\w+|normalize\w+|create\w+)\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*{[\s\S]*?};?/g;
  
  let match;
  while ((match = utilityRegex.exec(content)) !== null) {
    const functionName = match[1];
    const fullFunction = match[0];
    
    // Categorize function type
    let category = 'other';
    if (functionName.startsWith('calculate')) category = 'calculation';
    else if (functionName.startsWith('format')) category = 'formatting';
    else if (functionName.startsWith('get')) category = 'getter';
    else if (functionName.startsWith('normalize')) category = 'normalization';
    else if (functionName.startsWith('create')) category = 'creation';
    
    utilityFunctions.push({
      name: functionName,
      filePath,
      fullFunction,
      category,
      lineCount: fullFunction.split('\n').length
    });
  }
  
  return utilityFunctions;
}

// Calculate function similarity based on structure and purpose
function calculateFunctionSimilarity(func1, func2) {
  // Different categories are less likely to be similar
  if (func1.category && func2.category && func1.category !== func2.category) {
    return 0;
  }
  
  // Compare function bodies (simplified)
  const body1 = func1.fullFunction.replace(/\s+/g, ' ').toLowerCase();
  const body2 = func2.fullFunction.replace(/\s+/g, ' ').toLowerCase();
  
  // Look for common patterns
  const patterns = [
    'new icon',
    'svg',
    'circle',
    'rect',
    'polygon',
    'iconsize',
    'iconanchor',
    'popupanchor',
    'return',
    'const',
    'color',
    'size'
  ];
  
  let commonPatterns = 0;
  patterns.forEach(pattern => {
    if (body1.includes(pattern) && body2.includes(pattern)) {
      commonPatterns++;
    }
  });
  
  return commonPatterns / patterns.length;
}

// Calculate popup similarity
function calculatePopupSimilarity(popup1, popup2) {
  const chars1 = popup1.characteristics;
  const chars2 = popup2.characteristics;
  
  let similarity = 0;
  const totalCharacteristics = 4;
  
  if (chars1.hasHeader === chars2.hasHeader) similarity++;
  if (chars1.hasMultipleFields === chars2.hasMultipleFields) similarity++;
  if (chars1.hasConditionalContent === chars2.hasConditionalContent) similarity++;
  if (chars1.hasFooter === chars2.hasFooter) similarity++;
  
  return similarity / totalCharacteristics;
}

// Main analysis
async function runFocusedAnalysis() {
  console.log('🎯 Focused Duplicate Code Analysis for Maps Features\n');
  
  const mapsDir = path.join(__dirname, '../src/components/features/maps');
  const files = fs.readdirSync(mapsDir)
    .filter(file => file.endsWith('.tsx'))
    .map(file => path.join(mapsDir, file));
  
  console.log(`📁 Analyzing ${files.length} component files:\n`);
  
  const allIconFunctions = [];
  const allPopupPatterns = [];
  const allUtilityFunctions = [];
  
  // Extract patterns from each file
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file);
    
    const iconFunctions = extractIconCreationFunctions(content, fileName);
    const popupPatterns = extractPopupPatterns(content, fileName);
    const utilityFunctions = extractUtilityFunctions(content, fileName);
    
    allIconFunctions.push(...iconFunctions);
    allPopupPatterns.push(...popupPatterns);
    allUtilityFunctions.push(...utilityFunctions);
    
    if (iconFunctions.length > 0 || popupPatterns.length > 0 || utilityFunctions.length > 0) {
      console.log(`📄 ${fileName}:`);
      if (iconFunctions.length > 0) {
        console.log(`   🎨 ${iconFunctions.length} icon functions: ${iconFunctions.map(f => f.name).join(', ')}`);
      }
      if (popupPatterns.length > 0) {
        console.log(`   💬 ${popupPatterns.length} popup patterns (avg ${Math.round(popupPatterns.reduce((sum, p) => sum + p.fieldCount, 0) / popupPatterns.length)} fields)`);
      }
      if (utilityFunctions.length > 0) {
        console.log(`   🔧 ${utilityFunctions.length} utility functions: ${utilityFunctions.map(f => f.name).join(', ')}`);
      }
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log(`🎨 Icon Functions: ${allIconFunctions.length}`);
  console.log(`💬 Popup Patterns: ${allPopupPatterns.length}`);
  console.log(`🔧 Utility Functions: ${allUtilityFunctions.length}\n`);
  
  // Analyze icon function similarities
  console.log('🎨 ICON FUNCTION ANALYSIS:\n');
  
  if (allIconFunctions.length > 1) {
    const iconSimilarities = [];
    
    for (let i = 0; i < allIconFunctions.length; i++) {
      for (let j = i + 1; j < allIconFunctions.length; j++) {
        const func1 = allIconFunctions[i];
        const func2 = allIconFunctions[j];
        
        if (func1.filePath === func2.filePath) continue;
        
        const similarity = calculateFunctionSimilarity(func1, func2);
        
        if (similarity > 0.3) {
          iconSimilarities.push({
            func1: func1.name,
            file1: func1.filePath,
            func2: func2.name,
            file2: func2.filePath,
            similarity: similarity,
            avgLineCount: Math.round((func1.lineCount + func2.lineCount) / 2)
          });
        }
      }
    }
    
    iconSimilarities.sort((a, b) => b.similarity - a.similarity);
    
    if (iconSimilarities.length > 0) {
      console.log('🔍 Similar Icon Functions:');
      iconSimilarities.forEach((sim, index) => {
        console.log(`   ${index + 1}. ${sim.func1} (${sim.file1}) ↔ ${sim.func2} (${sim.file2})`);
        console.log(`      Similarity: ${(sim.similarity * 100).toFixed(1)}% | Avg Lines: ${sim.avgLineCount}`);
      });
      
      // Consolidation recommendation for icons
      const totalIconLines = iconSimilarities.reduce((sum, sim) => sum + sim.avgLineCount, 0);
      console.log(`\n💡 Icon Consolidation Opportunity:`);
      console.log(`   Create src/utils/maps/iconUtils.ts`);
      console.log(`   Potential savings: ~${Math.round(totalIconLines * 0.7)} lines`);
      console.log(`   Functions to consolidate: ${iconSimilarities.length} pairs`);
    } else {
      console.log('✅ No significant icon function duplicates found');
    }
  } else {
    console.log('ℹ️ Not enough icon functions to compare');
  }
  
  // Analyze popup similarities
  console.log('\n💬 POPUP PATTERN ANALYSIS:\n');
  
  if (allPopupPatterns.length > 1) {
    const popupSimilarities = [];
    
    for (let i = 0; i < allPopupPatterns.length; i++) {
      for (let j = i + 1; j < allPopupPatterns.length; j++) {
        const popup1 = allPopupPatterns[i];
        const popup2 = allPopupPatterns[j];
        
        if (popup1.filePath === popup2.filePath) continue;
        
        const similarity = calculatePopupSimilarity(popup1, popup2);
        
        if (similarity > 0.5) {
          popupSimilarities.push({
            file1: popup1.filePath,
            file2: popup2.filePath,
            similarity: similarity,
            avgLineCount: Math.round((popup1.lineCount + popup2.lineCount) / 2),
            avgFieldCount: Math.round((popup1.fieldCount + popup2.fieldCount) / 2)
          });
        }
      }
    }
    
    popupSimilarities.sort((a, b) => b.similarity - a.similarity);
    
    if (popupSimilarities.length > 0) {
      console.log('🔍 Similar Popup Patterns:');
      popupSimilarities.forEach((sim, index) => {
        console.log(`   ${index + 1}. ${sim.file1} ↔ ${sim.file2}`);
        console.log(`      Similarity: ${(sim.similarity * 100).toFixed(1)}% | Avg Lines: ${sim.avgLineCount} | Avg Fields: ${sim.avgFieldCount}`);
      });
      
      // Consolidation recommendation for popups
      const totalPopupLines = popupSimilarities.reduce((sum, sim) => sum + sim.avgLineCount, 0);
      console.log(`\n💡 Popup Consolidation Opportunity:`);
      console.log(`   Create MapPopup component or popupStyles utility`);
      console.log(`   Potential savings: ~${Math.round(totalPopupLines * 0.6)} lines`);
      console.log(`   Patterns to consolidate: ${popupSimilarities.length} pairs`);
    } else {
      console.log('✅ No significant popup pattern duplicates found');
    }
  } else {
    console.log('ℹ️ Not enough popup patterns to compare');
  }
  
  // Analyze utility function similarities
  console.log('\n🔧 UTILITY FUNCTION ANALYSIS:\n');
  
  if (allUtilityFunctions.length > 1) {
    const utilityByCategory = new Map();
    
    allUtilityFunctions.forEach(func => {
      if (!utilityByCategory.has(func.category)) {
        utilityByCategory.set(func.category, []);
      }
      utilityByCategory.get(func.category).push(func);
    });
    
    utilityByCategory.forEach((functions, category) => {
      if (functions.length > 1) {
        console.log(`📂 ${category.toUpperCase()} functions (${functions.length}):`);
        functions.forEach(func => {
          console.log(`   - ${func.name} (${func.filePath}) - ${func.lineCount} lines`);
        });
        
        if (functions.length >= 2) {
          const avgLines = Math.round(functions.reduce((sum, f) => sum + f.lineCount, 0) / functions.length);
          console.log(`   💡 Consider consolidating into shared ${category} utilities (~${avgLines * functions.length * 0.5} line savings)`);
        }
        console.log();
      }
    });
  } else {
    console.log('ℹ️ Not enough utility functions to analyze');
  }
  
  // Generate final recommendations
  console.log('\n🎯 FINAL RECOMMENDATIONS:\n');
  
  const recommendations = [];
  
  if (allIconFunctions.length >= 3) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Create src/utils/maps/iconUtils.ts',
      description: `Consolidate ${allIconFunctions.length} icon creation functions`,
      estimatedSavings: allIconFunctions.reduce((sum, f) => sum + f.lineCount, 0) * 0.7,
      files: [...new Set(allIconFunctions.map(f => f.filePath))]
    });
  }
  
  if (allPopupPatterns.length >= 3) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Create MapPopup component',
      description: `Standardize ${allPopupPatterns.length} popup patterns`,
      estimatedSavings: allPopupPatterns.reduce((sum, p) => sum + p.lineCount, 0) * 0.5,
      files: [...new Set(allPopupPatterns.map(p => p.filePath))]
    });
  }
  
  const utilityCategories = new Map();
  allUtilityFunctions.forEach(func => {
    if (!utilityCategories.has(func.category)) {
      utilityCategories.set(func.category, []);
    }
    utilityCategories.get(func.category).push(func);
  });
  
  utilityCategories.forEach((functions, category) => {
    if (functions.length >= 2) {
      recommendations.push({
        priority: 'MEDIUM',
        action: `Create shared ${category} utilities`,
        description: `Consolidate ${functions.length} ${category} functions`,
        estimatedSavings: functions.reduce((sum, f) => sum + f.lineCount, 0) * 0.4,
        files: [...new Set(functions.map(f => f.filePath))]
      });
    }
  });
  
  recommendations.sort((a, b) => {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority] || b.estimatedSavings - a.estimatedSavings;
  });
  
  if (recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`${index + 1}. ${priority} ${rec.action}`);
      console.log(`   ${rec.description}`);
      console.log(`   Estimated savings: ~${Math.round(rec.estimatedSavings)} lines`);
      console.log(`   Affected files: ${rec.files.join(', ')}`);
      console.log();
    });
    
    const totalSavings = recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
    console.log(`💰 Total Potential Savings: ~${Math.round(totalSavings)} lines of code`);
  } else {
    console.log('✅ No significant consolidation opportunities found');
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      iconFunctions: allIconFunctions.length,
      popupPatterns: allPopupPatterns.length,
      utilityFunctions: allUtilityFunctions.length,
      recommendations: recommendations.length,
      totalPotentialSavings: Math.round(recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0))
    },
    iconFunctions: allIconFunctions.map(f => ({
      name: f.name,
      file: f.filePath,
      lineCount: f.lineCount,
      characteristics: f.characteristics
    })),
    popupPatterns: allPopupPatterns.map(p => ({
      file: p.filePath,
      lineCount: p.lineCount,
      fieldCount: p.fieldCount,
      characteristics: p.characteristics
    })),
    utilityFunctions: allUtilityFunctions.map(f => ({
      name: f.name,
      file: f.filePath,
      category: f.category,
      lineCount: f.lineCount
    })),
    recommendations
  };
  
  const reportPath = path.join(__dirname, '../temporary/analysis/focused-duplicate-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log('✅ Focused analysis complete!');
}

// Run analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  runFocusedAnalysis().catch(console.error);
}

export { runFocusedAnalysis };