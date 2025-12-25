/**
 * Compression Utilities for localStorage
 * Uses browser-native compression APIs to reduce storage size
 */

/**
 * Compress data using gzip compression
 * Uses the browser's native CompressionStream API (available in modern browsers)
 * Only compresses if the result is actually smaller
 */
export async function compressData(data: string): Promise<string> {
  try {
    // Don't compress very small data (less than 1KB) - overhead isn't worth it
    // But always attempt compression for larger data
    const shouldAttemptCompression = data.length >= 1024;

    // Check if CompressionStream is available
    if (typeof CompressionStream === 'undefined') {
      console.warn('CompressionStream not available, storing uncompressed');
      return data;
    }

    // Skip compression for very small data
    if (!shouldAttemptCompression) {
      return data;
    }

    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const input = encoder.encode(data);

    // Create compression stream
    const compressionStream = new CompressionStream('gzip');
    const writer = compressionStream.writable.getWriter();
    const reader = compressionStream.readable.getReader();

    // Write data to compression stream
    writer.write(input);
    writer.close();

    // Read compressed data
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Combine chunks and convert to base64 for storage
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to base64 string for localStorage
    // Use chunked approach to avoid stack overflow with large arrays
    let binaryString = '';
    const chunkSize = 8192; // Process in 8KB chunks to avoid stack overflow
    
    for (let i = 0; i < combined.length; i += chunkSize) {
      const chunk = combined.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    
    const base64 = btoa(binaryString);
    const compressed = `gzip:${base64}`;
    
    // Only return compressed version if it's actually smaller
    if (compressed.length < data.length) {
      return compressed;
    } else {
      return data; // Return original if compression doesn't help
    }
    
  } catch (error) {
    console.warn('Compression failed, storing uncompressed:', error);
    return data;
  }
}

/**
 * Decompress data that was compressed with compressData
 */
export async function decompressData(compressedData: string): Promise<string> {
  try {
    // Check if data is compressed
    if (!compressedData.startsWith('gzip:')) {
      // Not compressed, return as-is
      return compressedData;
    }

    // Check if DecompressionStream is available
    if (typeof DecompressionStream === 'undefined') {
      console.warn('DecompressionStream not available, cannot decompress');
      throw new Error('Decompression not supported');
    }

    // Extract base64 data
    const base64Data = compressedData.slice(5); // Remove 'gzip:' prefix
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const compressed = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      compressed[i] = binaryString.charCodeAt(i);
    }

    // Create decompression stream
    const decompressionStream = new DecompressionStream('gzip');
    const writer = decompressionStream.writable.getWriter();
    const reader = decompressionStream.readable.getReader();

    // Write compressed data to decompression stream
    writer.write(compressed);
    writer.close();

    // Read decompressed data
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Combine chunks and convert back to string
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(combined);
    
  } catch (error) {
    console.warn('Decompression failed:', error);
    throw error;
  }
}

/**
 * Get compression ratio for debugging
 */
export function getCompressionRatio(original: string, compressed: string): number {
  if (!compressed.startsWith('gzip:')) {
    return 1; // No compression
  }
  
  const originalSize = new TextEncoder().encode(original).length;
  const compressedSize = new TextEncoder().encode(compressed).length;
  
  return originalSize / compressedSize;
}

/**
 * Format size for human-readable display
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}