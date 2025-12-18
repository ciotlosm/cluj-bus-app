// Test CTP Cluj proxy functionality
console.log('🔗 Testing CTP Cluj Proxy...\n');

async function testCTPClujProxy() {
  try {
    console.log('📡 Testing proxy connection to CTP Cluj...');
    
    // Test the proxy endpoint
    const proxyUrl = '/api/ctp-cluj/index.php/ro/orare-linii/linii-urbane/linia-42';
    console.log(`🌐 Fetching: ${proxyUrl}`);
    
    const response = await fetch(proxyUrl);
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const html = await response.text();
      console.log(`📄 Response Length: ${html.length} characters`);
      
      // Check if it looks like a valid CTP Cluj page
      if (html.includes('ctpcj') || html.includes('CTP') || html.includes('Cluj')) {
        console.log('✅ SUCCESS: Received valid CTP Cluj page content!');
        
        // Look for PDF schedule links
        const pdfMatch = html.match(/href="([^"]*orar_[^"]*\.pdf)"/);
        if (pdfMatch) {
          console.log(`📋 Found PDF schedule link: ${pdfMatch[1]}`);
        }
        
        // Look for route info
        const routeMatch = html.match(/<title>([^<]*42[^<]*)<\/title>/i);
        if (routeMatch) {
          console.log(`🚌 Found route info: ${routeMatch[1]}`);
        }
        
      } else {
        console.log('⚠️  WARNING: Response doesn\'t look like CTP Cluj content');
        console.log('First 200 characters:', html.substring(0, 200));
      }
    } else {
      console.log(`❌ ERROR: HTTP ${response.status} - ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ PROXY TEST FAILED:', error.message);
    console.error('This might indicate the proxy is not working correctly');
  }
}

// Test the proxy
testCTPClujProxy();

console.log('\n🏁 Proxy test completed.');