#!/usr/bin/env node

// Test script to check what the stop_times API actually returns
import axios from 'axios';

const API_KEY = 'VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej';
const BASE_URL = 'https://api.tranzy.ai/v1';
const AGENCY_ID = 2; // CTP Cluj

async function testStopTimesAPI() {
  try {
    console.log('🔍 Testing stop_times API...');
    
    // First, get a sample stop ID
    console.log('\n1. Getting stops to find a sample stop ID...');
    const stopsResponse = await axios.get(`${BASE_URL}/opendata/stops`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Agency-Id': AGENCY_ID
      }
    });
    
    const sampleStop = stopsResponse.data[0];
    console.log('Sample stop:', {
      id: sampleStop.stop_id,
      name: sampleStop.stop_name,
      lat: sampleStop.stop_lat,
      lon: sampleStop.stop_lon
    });
    
    // Test stop_times for this stop
    console.log(`\n2. Getting stop_times for stop ${sampleStop.stop_id}...`);
    const stopTimesResponse = await axios.get(`${BASE_URL}/opendata/stop_times`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Agency-Id': AGENCY_ID
      },
      params: {
        stop_id: sampleStop.stop_id
      }
    });
    
    console.log(`Found ${stopTimesResponse.data.length} stop times`);
    
    // Show first few stop times
    const sampleStopTimes = stopTimesResponse.data.slice(0, 3);
    console.log('\nSample stop times (RAW API response):');
    sampleStopTimes.forEach((stopTime, index) => {
      console.log(`${index + 1}. RAW:`, JSON.stringify(stopTime, null, 2));
    });
    
    // Check for undefined/null departure times
    const undefinedDepartures = stopTimesResponse.data.filter(st => 
      !st.departure_time || st.departure_time === null || st.departure_time === undefined
    );
    
    console.log(`\n📊 Statistics:`);
    console.log(`Total stop times: ${stopTimesResponse.data.length}`);
    console.log(`Undefined/null departure times: ${undefinedDepartures.length}`);
    console.log(`Valid departure times: ${stopTimesResponse.data.length - undefinedDepartures.length}`);
    
    if (undefinedDepartures.length > 0) {
      console.log('\n⚠️ Examples of undefined departure times:');
      undefinedDepartures.slice(0, 3).forEach((stopTime, index) => {
        console.log(`${index + 1}.`, {
          trip_id: stopTime.trip_id,
          arrival_time: stopTime.arrival_time,
          departure_time: stopTime.departure_time,
          stop_sequence: stopTime.stop_sequence
        });
      });
    }
    
    // Test with route 42 specifically
    console.log('\n3. Testing with route 42 specifically...');
    
    // Get trips for route 42
    const tripsResponse = await axios.get(`${BASE_URL}/opendata/trips`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Agency-Id': AGENCY_ID
      }
    });
    
    const route42Trips = tripsResponse.data.filter(trip => trip.route_id === '40'); // Route ID 40 = Route "42"
    console.log(`Found ${route42Trips.length} trips for route 42 (route_id: 40)`);
    
    if (route42Trips.length > 0) {
      const sampleTrip = route42Trips[0];
      console.log('Sample route 42 trip:', {
        trip_id: sampleTrip.trip_id,
        route_id: sampleTrip.route_id,
        trip_headsign: sampleTrip.trip_headsign,
        direction_id: sampleTrip.direction_id
      });
      
      // Get stop times for this trip
      const tripStopTimesResponse = await axios.get(`${BASE_URL}/opendata/stop_times`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'X-API-Key': API_KEY,
          'X-Agency-Id': AGENCY_ID
        },
        params: {
          trip_id: sampleTrip.trip_id
        }
      });
      
      console.log(`\nStop times for route 42 trip ${sampleTrip.trip_id}:`);
      const route42StopTimes = tripStopTimesResponse.data.slice(0, 5);
      route42StopTimes.forEach((stopTime, index) => {
        console.log(`${index + 1}.`, {
          stop_id: stopTime.stop_id,
          arrival_time: stopTime.arrival_time,
          departure_time: stopTime.departure_time,
          stop_sequence: stopTime.stop_sequence
        });
      });
      
      // Check if any have 15:45 or similar times
      const timesAround1545 = tripStopTimesResponse.data.filter(st => 
        st.departure_time && (
          st.departure_time.startsWith('15:4') || 
          st.departure_time.startsWith('15:3') ||
          st.departure_time.startsWith('15:5')
        )
      );
      
      console.log(`\n🕐 Times around 15:45 for route 42:`);
      timesAround1545.forEach(stopTime => {
        console.log({
          stop_id: stopTime.stop_id,
          departure_time: stopTime.departure_time,
          stop_sequence: stopTime.stop_sequence
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
}

testStopTimesAPI();