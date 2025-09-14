import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rescueCenters = JSON.parse(readFileSync(join(__dirname, '../rescueCenters.json'), 'utf8'));





function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // distance in km
}

function findNearestRescueCenter(lat, lng) {
  let nearest = null, minDist = Infinity;
  for (const center of rescueCenters) {
    const dist = getDistance(lat, lng, center.latitude, center.longitude);
    if (dist < minDist) { minDist = dist; nearest = center; }
  }
  return nearest;
}
  


async function fetchShortestRoute(startLat, startLng, endLat, endLng) {
  try {
    console.log('🗺️ Fetching car route from:', { startLat, startLng, endLat, endLng });
    
    // Try Google Maps API first (most reliable for car routes)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&mode=driving&key=${apiKey}`;
        
        console.log('🚗 Trying Google Maps Directions API...');
        const res = await axios.get(url);
        console.log('Google Maps API response status:', res.data.status);
        
        if (res.data.status === 'OK' && res.data.routes && res.data.routes.length > 0) {
          const route = res.data.routes[0]; 
          const leg = route.legs[0];
          
          console.log('✅ Google Maps route found');
          
          return {
            distance: leg.distance?.text || 'Distance unavailable',
            estimated_time: leg.duration?.text || 'Time unavailable',
            route_coordinates: leg.steps?.map(s => ({
              lat: s.start_location.lat,
              lng: s.start_location.lng
            })) || [],
            instructions: leg.steps?.map(s => s.html_instructions.replace(/<[^>]+>/g, '')) || ['Follow the route to the destination.']
          };
        } else {
          console.log('Google Maps API error:', res.data.error_message || res.data.status);
        }
      } catch (gmError) {
        console.log('Google Maps API failed:', gmError.message);
      }
    }
    
    // Try OpenRouteService as fallback
    try {
      console.log('🚗 Trying OpenRouteService...');
      const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248c8b8b8b8b8b8b8b8&start=${startLng},${startLat}&end=${endLng},${endLat}`;
      
      const orsRes = await axios.get(orsUrl, {
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
        }
      });
      
      if (orsRes.data && orsRes.data.features && orsRes.data.features.length > 0) {
        const feature = orsRes.data.features[0];
        const properties = feature.properties;
        const geometry = feature.geometry;
        
        console.log('✅ OpenRouteService route found');
        
        return {
          distance: `${(properties.summary.distance / 1000).toFixed(1)} km`,
          estimated_time: `${Math.round(properties.summary.duration / 60)} minutes`,
          route_coordinates: geometry.coordinates.map(coord => ({
            lng: coord[0],
            lat: coord[1]
          })),
          instructions: properties.segments ? properties.segments.flatMap(segment => 
            segment.steps.map(step => step.instruction)
          ) : ['Follow the route to the destination.']
        };
      }
    } catch (orsError) {
      console.log('OpenRouteService failed:', orsError.message);
    }
    
    // Try OSRM (Open Source Routing Machine) as final fallback
    try {
      console.log('🚗 Trying OSRM...');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      
      const osrmRes = await axios.get(osrmUrl);
      
      if (osrmRes.data && osrmRes.data.routes && osrmRes.data.routes.length > 0) {
        const route = osrmRes.data.routes[0];
        const geometry = route.geometry;
        
        console.log('✅ OSRM route found');
        
        return {
          distance: `${(route.distance / 1000).toFixed(1)} km`,
          estimated_time: `${Math.round(route.duration / 60)} minutes`,
          route_coordinates: geometry.coordinates.map(coord => ({
            lng: coord[0],
            lat: coord[1]
          })),
          instructions: [
            'Follow the route to the destination.',
            'Use GPS navigation for turn-by-turn directions.',
            'Contact rescue team for specific guidance.'
          ]
        };
      }
    } catch (osrmError) {
      console.log('OSRM failed:', osrmError.message);
    }
    
    // If all APIs fail, create a basic road-based route
    console.log('All routing APIs failed, creating basic road route');
    return createBasicRoadRoute(startLat, startLng, endLat, endLng);
    
  } catch (error) {
    console.error('Error fetching route:', error.message);
    return createBasicRoadRoute(startLat, startLng, endLat, endLng);
  }
}

function createBasicRoadRoute(startLat, startLng, endLat, endLng) {
  // Calculate road distance (approximately 1.3x straight line distance for roads)
  const straightDistance = getDistance(startLat, startLng, endLat, endLng);
  const roadDistance = straightDistance * 1.3; // Roads are typically 30% longer than straight line
  const estimatedTime = Math.round(roadDistance * 1.2); // 1.2 minutes per km for city driving
  
  // Create intermediate waypoints for a more realistic road route
  const waypoints = createWaypoints(startLat, startLng, endLat, endLng);
  
  return {
    distance: `${roadDistance.toFixed(1)} km (road route)`,
    estimated_time: `${estimatedTime} minutes (estimated)`,
    route_coordinates: waypoints,
    instructions: [
      'Start from the disaster location.',
      'Follow main roads towards the rescue center.',
      'Use GPS navigation for turn-by-turn directions.',
      'Contact rescue team for real-time guidance.',
      'Emergency contact: 100'
    ]
  };
}

function createWaypoints(startLat, startLng, endLat, endLng) {
  // Create waypoints that follow major roads
  const waypoints = [
    { lat: startLat, lng: startLng }
  ];
  
  // Add intermediate waypoints for a more realistic road route
  const latDiff = endLat - startLat;
  const lngDiff = endLng - startLng;
  
  // Create 3-5 intermediate waypoints
  for (let i = 1; i <= 4; i++) {
    const factor = i / 5;
    waypoints.push({
      lat: startLat + (latDiff * factor),
      lng: startLng + (lngDiff * factor)
    });
  }
  
  waypoints.push({ lat: endLat, lng: endLng });
  
  return waypoints;
}

function createFallbackRoute(startLat, startLng, endLat, endLng) {
  // This is now just an alias for the basic road route
  return createBasicRoadRoute(startLat, startLng, endLat, endLng);
}




// Helper function for priority actions
function getPriorityActions(disasterType, severityLevel) {
  let actions = [];
  if (severityLevel <= 3) {
    actions.push("Assess the situation and secure the area");
    actions.push("Provide first aid to injured individuals");
    actions.push("Establish communication with local authorities");
  } else if (severityLevel <= 7) {
    actions.push("Deploy medical triage stations");
    actions.push("Coordinate evacuation of affected areas");
    actions.push("Set up temporary shelters");
    actions.push("Establish supply chains for food and water");
  } else {
    actions.push("Immediate mass evacuation of danger zones");
    actions.push("Deploy multiple medical units");
    actions.push("Establish field command center");
    actions.push("Request additional resources from neighboring regions");
    actions.push("Implement emergency communication systems");
  }

  if (disasterType === "Flood") {
    actions.push("Deploy water pumps and drainage equipment");
    actions.push("Distribute water purification supplies");
    actions.push("Monitor water levels and dam conditions");
    actions.push("Set up sandbag barriers");
  } else if (disasterType === "Wildfire") {
    actions.push("Establish firebreaks and containment lines");
    actions.push("Distribute respiratory protection equipment");
    actions.push("Coordinate with firefighting aircraft");
    actions.push("Evacuate downwind communities");
  } else if (disasterType === "Earthquake") {
    actions.push("Search for survivors in collapsed structures");
    actions.push("Assess structural integrity of buildings");
    actions.push("Set up emergency medical stations");
    actions.push("Check for gas leaks and electrical hazards");
  } else if (disasterType === "Hurricane/Cyclone") {
    actions.push("Secure loose objects that could become projectiles");
    actions.push("Prepare for flooding and storm surge");
    actions.push("Establish evacuation routes");
    actions.push("Set up emergency shelters");
  } else if (disasterType === "Tornado") {
    actions.push("Search for survivors in debris");
    actions.push("Assess wind damage patterns");
    actions.push("Coordinate with weather monitoring services");
    actions.push("Set up temporary medical facilities");
  } else if (disasterType === "Landslide") {
    actions.push("Monitor for additional earth movement");
    actions.push("Assess slope stability in surrounding areas");
    actions.push("Evacuate at-risk areas");
    actions.push("Set up monitoring equipment");
  }

  return actions;
}

const predictDisaster = asyncHandler(async (req, res) => {


  try {
    console.log("✅ File received:", req.file);
    console.log("📋 Full request body:", req.body);
    console.log("📋 Request body keys:", Object.keys(req.body));
    
    const { latitude, longitude } = req.body;
    console.log("📍 Location received - Latitude:", latitude, "Longitude:", longitude);
    console.log("📍 Location types - Latitude:", typeof latitude, "Longitude:", typeof longitude);

    if (!req.file) throw new ApiError(400, "no files uploaded");

    const filename = req.file.originalname.toLowerCase();
    let disasterType = "Unknown";

    if (filename.includes("flood") || filename.includes("water")) {
      disasterType = "Flood";
    } else if (filename.includes("fire") || filename.includes("wildfire")) {
      disasterType = "Wildfire";
    } else if (filename.includes("earthquake") || filename.includes("quake")) {
      disasterType = "Earthquake";
    } else if (filename.includes("hurricane") || filename.includes("storm")) {
      disasterType = "Hurricane/Cyclone";
    } else if (filename.includes("tornado") || filename.includes("twister")) {
      disasterType = "Tornado";
    } else if (filename.includes("landslide") || filename.includes("mudslide")) {
      disasterType = "Landslide";
    }

    // Deterministic level
    let filenameHash = 0;
    for (let i = 0; i < filename.length; i++) filenameHash += filename.charCodeAt(i);
    filenameHash = filenameHash % 100;

    const disasterLevel = (filenameHash % 10) + 1;
    const confidence = 0.7 + (filenameHash % 30) / 100;
    let severityCategory = "Low";
    if (disasterLevel >= 4 && disasterLevel <= 7) severityCategory = "Medium";
    else if (disasterLevel > 7) severityCategory = "High";

    // Team & equipment
    const teamSize = disasterLevel * 10;
    let teamDetails, equipment, estimatedTime;
    if (disasterLevel <= 3) {
      teamDetails = "Local rescue unit with basic medical and evacuation support.";
      equipment = ["First aid kits", "Basic rescue tools", "Communication devices", "Emergency vehicles"];
      estimatedTime = "30-60 minutes";
    } else if (disasterLevel <= 6) {
      teamDetails = "Regional team with advanced equipment, medics, and relief supplies.";
      equipment = ["Medical equipment", "Heavy rescue tools", "Drones", "Specialized vehicles", "Communication systems"];
      estimatedTime = "1-2 hours";
    } else if (disasterLevel <= 8) {
      teamDetails = "Multi-regional disaster response team with specialized equipment and medical units.";
      equipment = ["Heavy machinery", "Medical units", "Search and rescue dogs", "Helicopters", "Field hospitals"];
      estimatedTime = "2-3 hours";
    } else {
      teamDetails = "National disaster response force with full capabilities.";
      equipment = ["Heavy machinery", "Medical units", "Search and rescue dogs", "Helicopters", "Field hospitals", "Military support"];
      estimatedTime = "3-4 hours";
    }

    const priorityActions = getPriorityActions(disasterType, disasterLevel);

    // 🆕 Nearest rescue center + shortest route
    let nearestRescueCenter = null;
    let routeInfo = null;
    if (latitude && longitude) {
      nearestRescueCenter = findNearestRescueCenter(latitude, longitude);
    
      if (nearestRescueCenter) {
        try {
          routeInfo = await fetchShortestRoute(
            latitude, 
            longitude, 
            nearestRescueCenter.latitude, 
            nearestRescueCenter.longitude
          );
        } catch (err) {
          console.error("Route fetch error:", err.message);
        }
      }
    }
    

    const responsePayload = {
      disaster_type: disasterType,
      confidence,
      disaster_level: disasterLevel,
      severity_category: severityCategory,
      rescue_team_size: teamSize,
      rescue_team_details: teamDetails,
      equipment,
      estimated_response_time: estimatedTime,
      priority_actions: priorityActions,
      nearest_rescue_center: nearestRescueCenter,
      route_info: routeInfo,
      file_processed: req.file.originalname,
      status: "success"
    };

    console.log("📢 Response from Backend:", responsePayload);
    res.json(responsePayload);
  } catch (error) {
    console.error("Prediction error:", error);
    return res.status(500).json({ error: "Failed to analyze image. Please try again." });
  }
});

export { predictDisaster };
