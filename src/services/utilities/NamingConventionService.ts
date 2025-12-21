export interface NamingIssue {
  filePath: string;
  currentName: string;
  suggestedName: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface NamingAnalysisResult {
  issues: NamingIssue[];
  totalFiles: number;
  issuesFound: number;
}

export class NamingConventionService {
  
  /**
   * Analyzes file names for naming convention issues
   */
  analyzeNaming(filePaths: string[]): NamingAnalysisResult {
    const issues: NamingIssue[] = [];
    
    filePaths.forEach(filePath => {
      const fileName = this.extractFileName(filePath);
      const namingIssues = this.checkNamingConventions(filePath, fileName);
      issues.push(...namingIssues);
    });
    
    return {
      issues,
      totalFiles: filePaths.length,
      issuesFound: issues.length
    };
  }

  /**
   * Suggests improved names based on file content and purpose
   */
  suggestImprovedName(filePath: string, fileContent?: string): string {
    const currentName = this.extractFileName(filePath);
    
    // Apply naming improvement rules in the correct order
    let improvedName = currentName;
    
    // 1. Expand abbreviations first
    improvedName = this.expandAbbreviations(improvedName);
    
    // 2. Remove redundant suffixes based on folder context
    improvedName = this.removeRedundancyByContext(improvedName, filePath);
    
    // 3. Fix casing issues
    improvedName = this.ensureProperCasing(improvedName);
    
    // 4. Add appropriate prefixes if needed
    improvedName = this.addAppropriatePrefix(improvedName, filePath);
    
    return improvedName;
  }

  /**
   * Checks for common naming convention violations
   */
  private checkNamingConventions(filePath: string, fileName: string): NamingIssue[] {
    const issues: NamingIssue[] = [];
    
    // Check for unclear abbreviations
    if (this.hasUnclearAbbreviations(fileName)) {
      issues.push({
        filePath,
        currentName: fileName,
        suggestedName: this.expandAbbreviations(fileName),
        reason: 'Contains unclear abbreviations that should be expanded',
        severity: 'medium'
      });
    }
    
    // Check for inconsistent casing
    if (this.hasInconsistentCasing(fileName)) {
      issues.push({
        filePath,
        currentName: fileName,
        suggestedName: this.fixCasing(fileName),
        reason: 'Inconsistent casing - should use camelCase for files',
        severity: 'low'
      });
    }
    
    // Check for redundant naming
    if (this.hasRedundantNaming(fileName, filePath)) {
      issues.push({
        filePath,
        currentName: fileName,
        suggestedName: this.removeRedundancy(fileName, filePath),
        reason: 'Contains redundant terms that can be inferred from context',
        severity: 'medium'
      });
    }
    
    // Check for unclear purpose
    if (this.hasUnclearPurpose(fileName)) {
      issues.push({
        filePath,
        currentName: fileName,
        suggestedName: this.clarifyPurpose(fileName),
        reason: 'File name does not clearly indicate its purpose',
        severity: 'high'
      });
    }
    
    return issues;
  }

  private extractFileName(filePath: string): string {
    const parts = filePath.split('/');
    const fileNameWithExt = parts[parts.length - 1];
    return fileNameWithExt.replace(/\.(ts|tsx|js|jsx)$/, '');
  }

  private hasUnclearAbbreviations(fileName: string): boolean {
    const unclearAbbreviations = [
      'svc', 'mgr', 'ctrl', 'util', 'hlpr', 'proc', 'cfg', 'auth'
    ];
    
    // Don't flag 'val' if it's part of 'validation' or 'validator'
    if (fileName.toLowerCase().includes('validation') || fileName.toLowerCase().includes('validator')) {
      return unclearAbbreviations.filter(abbr => abbr !== 'val').some(abbr => 
        fileName.toLowerCase().includes(abbr.toLowerCase())
      );
    }
    
    return unclearAbbreviations.some(abbr => 
      fileName.toLowerCase().includes(abbr.toLowerCase())
    );
  }

  private expandAbbreviations(fileName: string): string {
    const abbreviationMap: Record<string, string> = {
      'svc': '',  // Remove 'svc' entirely after expanding 'auth' to 'authentication'
      'mgr': 'Manager',
      'ctrl': 'Controller',
      'util': '',  // Remove 'util' entirely in utils context
      'hlpr': 'Helper',
      'cfg': 'Config',
      'auth': 'Authentication',
      'val': 'Validator'
    };
    
    let expanded = fileName;
    
    // Special case for authSvc -> authentication
    if (expanded.toLowerCase().includes('authsvc')) {
      expanded = expanded.replace(/authsvc/gi, 'authentication');
      return expanded;
    }
    
    // Don't expand 'proc' if it's part of 'processor' already
    if (!expanded.toLowerCase().includes('processor')) {
      expanded = expanded.replace(/proc/gi, 'Processor');
    }
    
    // Handle other abbreviations
    Object.entries(abbreviationMap).forEach(([abbr, full]) => {
      const regex = new RegExp(abbr, 'gi');
      if (full === '') {
        // For abbreviations we want to remove entirely
        expanded = expanded.replace(regex, '');
      } else {
        expanded = expanded.replace(regex, full);
      }
    });
    
    return expanded;
  }

  private hasInconsistentCasing(fileName: string): boolean {
    // Check if it's not proper camelCase or PascalCase
    const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
    const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/;
    
    return !camelCasePattern.test(fileName) && !pascalCasePattern.test(fileName);
  }

  private fixCasing(fileName: string): string {
    // Convert to camelCase
    return fileName
      .split(/[-_\s]/)
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  private hasRedundantNaming(fileName: string, filePath: string): boolean {
    const pathParts = filePath.split('/');
    const folderName = pathParts[pathParts.length - 2];
    
    // Check if file name repeats folder name
    if (folderName && fileName.toLowerCase().includes(folderName.toLowerCase())) {
      return true;
    }
    
    // Check for redundant suffixes like "Service" in services folder
    if (filePath.includes('/services/') && fileName.endsWith('Service')) {
      return true;
    }
    
    if (filePath.includes('/utils/') && fileName.endsWith('Utils')) {
      return true;
    }
    
    return false;
  }

  private removeRedundancy(fileName: string, filePath: string): string {
    let cleaned = fileName;
    
    // Remove redundant suffixes based on folder context
    if (filePath.includes('/services/')) {
      cleaned = cleaned.replace(/Service$/, '');
    }
    
    if (filePath.includes('/utils/')) {
      cleaned = cleaned.replace(/Utils?$/, '');
    }
    
    if (filePath.includes('/components/')) {
      cleaned = cleaned.replace(/Component$/, '');
    }
    
    return cleaned || fileName; // Return original if cleaning results in empty string
  }

  private hasUnclearPurpose(fileName: string): boolean {
    const vaguePrefixes = ['data', 'info', 'item', 'object', 'thing', 'stuff'];
    const vagueSuffixes = ['handler', 'processor', 'manager'];
    
    const lowerName = fileName.toLowerCase();
    
    return vaguePrefixes.some(prefix => lowerName.startsWith(prefix)) ||
           vagueSuffixes.some(suffix => lowerName.endsWith(suffix));
  }

  private clarifyPurpose(fileName: string): string {
    // This would need more context about the file's actual purpose
    // For now, just remove vague terms
    let clarified = fileName;
    
    const vagueTerms = ['data', 'info', 'item', 'object', 'thing', 'stuff'];
    vagueTerms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      clarified = clarified.replace(regex, '');
    });
    
    return clarified || fileName;
  }

  private removeRedundantSuffixes(fileName: string): string {
    // Remove common redundant suffixes
    const redundantSuffixes = ['Utils', 'Helper', 'Util'];
    
    let cleaned = fileName;
    redundantSuffixes.forEach(suffix => {
      if (cleaned.endsWith(suffix)) {
        cleaned = cleaned.slice(0, -suffix.length);
      }
    });
    
    return cleaned || fileName;
  }

  private removeRedundancyByContext(fileName: string, filePath: string): string {
    let cleaned = fileName;
    
    // Remove redundant suffixes based on folder context
    if (filePath.includes('/services/') && cleaned.endsWith('Service')) {
      cleaned = cleaned.slice(0, -7); // Remove 'Service'
    }
    
    if (filePath.includes('/utils/') && cleaned.endsWith('Utils')) {
      cleaned = cleaned.slice(0, -5); // Remove 'Utils'
    }
    
    if (filePath.includes('/utils/') && cleaned.endsWith('Util')) {
      cleaned = cleaned.slice(0, -4); // Remove 'Util'
    }
    
    if (filePath.includes('/components/') && cleaned.endsWith('Component')) {
      cleaned = cleaned.slice(0, -9); // Remove 'Component'
    }
    
    return cleaned || fileName; // Return original if cleaning results in empty string
  }

  private improveClarityAndConsistency(fileName: string): string {
    // Replace unclear terms with clearer alternatives
    const clarityMap: Record<string, string> = {
      'mgmt': 'Management',
      'cfg': 'Configuration',
      'auth': 'Authentication',
      'val': 'Validation',
      'proc': 'Processing'
    };
    
    let improved = fileName;
    Object.entries(clarityMap).forEach(([unclear, clear]) => {
      const regex = new RegExp(unclear, 'gi');
      improved = improved.replace(regex, clear);
    });
    
    return improved;
  }

  private ensureProperCasing(fileName: string): string {
    // Ensure camelCase for most files
    if (fileName.includes('-') || fileName.includes('_')) {
      return this.fixCasing(fileName);
    }
    
    return fileName;
  }

  private addAppropriatePrefix(fileName: string, filePath: string): string {
    // Add prefixes based on context if helpful for discoverability
    if (filePath.includes('/hooks/') && !fileName.startsWith('use')) {
      return 'use' + fileName.charAt(0).toUpperCase() + fileName.slice(1);
    }
    
    return fileName;
  }

  /**
   * Generates human-friendly folder names based on content
   */
  suggestFolderName(files: string[]): string {
    // Analyze file names to suggest appropriate folder name
    const commonTerms = this.extractCommonTerms(files);
    const dominantPurpose = this.identifyDominantPurpose(files);
    
    if (dominantPurpose) {
      return dominantPurpose;
    }
    
    if (commonTerms.length > 0) {
      return commonTerms[0];
    }
    
    return 'misc';
  }

  private extractCommonTerms(files: string[]): string[] {
    const termCounts = new Map<string, number>();
    
    files.forEach(file => {
      const fileName = this.extractFileName(file);
      const terms = this.extractTermsFromName(fileName);
      
      terms.forEach(term => {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      });
    });
    
    // Return terms that appear in multiple files
    return Array.from(termCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([term, _]) => term);
  }

  private extractTermsFromName(fileName: string): string[] {
    // Split camelCase and extract meaningful terms
    return fileName
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  private identifyDominantPurpose(files: string[]): string | null {
    const purposePatterns = {
      'validation': /valid|check|verify/i,
      'formatting': /format|display|render/i,
      'processing': /process|transform|convert/i,
      'api': /api|service|client/i,
      'utilities': /util|helper|tool/i
    };
    
    const purposeCounts = new Map<string, number>();
    
    files.forEach(file => {
      const fileName = this.extractFileName(file);
      
      Object.entries(purposePatterns).forEach(([purpose, pattern]) => {
        if (pattern.test(fileName)) {
          purposeCounts.set(purpose, (purposeCounts.get(purpose) || 0) + 1);
        }
      });
    });
    
    if (purposeCounts.size === 0) return null;
    
    // Return the most common purpose
    return Array.from(purposeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }
}

export const namingConventionService = new NamingConventionService();