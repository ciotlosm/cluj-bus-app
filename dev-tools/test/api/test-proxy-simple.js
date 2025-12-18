// Simple test to verify CTP Cluj proxy is working
import fetch from 'node-fetch';

console.log('🔍 Testing CTP Cluj Proxy...\n');

async function testProxy() {
  try {
    console.log('📡 Testing proxy endpoint: http://localhost:5175/api/ctp-cluj/index.php/ro/orare-linii/linii-urbane/linia-42');
    
    const response = await fetch('http://localhost:5175/api/ctp-cluj/index.php/ro/orare-linii/linii-urbane/linia-42', {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const html = await response.text();
      console.log(`📊 Response Length: ${html.length} characters`);
      
      // Check for key indicators
      const hasTitle = html.includes('<title>');
      const hasOrarLinia = html.includes('orar_linia');
      const hasPdfLink = html.includes('.pdf');
      const hasTranzyIframe = html.includes('tranzy.ai');
      
      console.log('\n🔍 Content Analysis:');
      console.log(`  - Has HTML title: ${hasTitle ? '✅' : '❌'}`);
      console.log(`  - Has orar_linia calls: ${hasOrarLinia ? '✅' : '❌'}`);
      console.log(`  - Has PDF links: ${hasPdfLink ? '✅' : '❌'}`);
      console.log(`  - Has Tranzy iframe: ${hasTranzyIframe ? '✅' : '❌'}`);
      
      // Extract some key information
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        console.log(`  - Page title: "${titleMatch[1]}"`);
      }
      
      const pdfMatch = html.match(/href="([^"]*orar_[^"]*\.pdf)"/);
      if (pdfMatch) {
        console.log(`  - PDF URL found: ${pdfMatch[1]}`);
      }
      
      const tranzyMatch = html.match(/https:\/\/apps\.tranzy\.ai\/map\/ctp-cj-ro\?routeId=(\d+)/);
      if (tranzyMatch) {
        console.log(`  - Tranzy Route ID: ${tranzyMatch[1]}`);
      }
      
      // Show first 500 characters for debugging
      console.log('\n📄 First 500 characters of response:');
      console.log('='.repeat(80));
      console.log(html.substring(0, 500));
      console.log('='.repeat(80));
      
      if (hasOrarLinia && hasTranzyIframe) {
        console.log('\n✅ SUCCESS: Proxy is working and returning expected CTP Cluj content!');
      } else {
        console.log('\n⚠️  WARNING: Proxy is working but content might not be as expected');
      }
      
    } else {
      console.log('❌ FAILED: Proxy returned error status');
      const errorText = await response.text();
      console.log('Error response:', errorText.substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testProxy();