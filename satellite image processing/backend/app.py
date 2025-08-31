from flask import Flask, request, jsonify
from pymongo import MongoClient
from urllib.parse import quote_plus
from flask_cors import CORS
import ee

app = Flask(__name__)
CORS(app)

# Encode username and password
username = "dswetha59"
password = "Swetha@59"
encoded_username = quote_plus(username)
encoded_password = quote_plus(password)

# MongoDB Atlas connection string (replace with the new one from Atlas)
connection_string = "mongodb+srv://dswetha59:Swetha%4059@vegetation-analyzer.qwrpbhr.mongodb.net/?retryWrites=true&w=majority&appName=vegetation-analyzer"
client = MongoClient(connection_string)
db = client["vegetation_db"]
collection = db["locations"]

# Initialize Google Earth Engine
ee.Initialize(project='vegetationanalyzer')

def calculate_ndvi(coordinates):
    # Log for debugging
    print("Processing coordinates:", coordinates)
    
    if not coordinates or len(coordinates) < 2:  # Need at least 2 points for line
        return {"error": "Insufficient coordinates for analysis"}
    
    # Swap lat, lng to lng, lat for GEE
    swapped_coords = [[coord[1], coord[0]] for coord in coordinates]
    
    # Use LineString and buffer to create area (10m buffer)
    line = ee.Geometry.LineString(swapped_coords)
    geometry = line.buffer(10)  # Buffer to make area
    
    # Fetch Sentinel-2 SR
    sentinel = ee.ImageCollection('COPERNICUS/S2_SR') \
        .filterBounds(geometry) \
        .filterDate('2024-01-01', '2025-08-31') \
        .sort('CLOUDY_PIXEL_PERCENTAGE') \
        .first()
    
    if sentinel is None:
        return {"error": "No satellite data available for this area"}
    
    ndvi = sentinel.normalizedDifference(['B8', 'B4']).rename('NDVI')
    
    try:
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        ).get('NDVI').getInfo()
    except ee.EEException as e:
        print("EEException:", e)
        stats = None
    
    ndvi_value = stats if stats is not None else 0
    if ndvi_value > 0.4:
        status = "High vegetation"
        suggestion = "Maintain the area, no planting needed."
    elif ndvi_value > 0.2:
        status = "Moderate vegetation"
        suggestion = "Consider planting more trees (e.g., neem or mango)."
    else:
        status = "Low vegetation"
        suggestion = "Plant trees urgently (e.g., native species)."
    
    return {
        "ndvi": ndvi_value,
        "status": status,
        "suggestion": suggestion
    }

@app.route('/api/save_location', methods=['POST'])
def save_location():
    data = request.json
    print("Received data:", data)  # Debug
    location_data = {
        "userId": data.get("userId", "anonymous"),
        "location": {"type": "Point", "coordinates": [data["lng"], data["lat"]]},
        "path": data.get("path", []),
        "timestamp": data.get("timestamp", "")
    }
    result = collection.insert_one(location_data)
    ndvi_result = calculate_ndvi(data.get("path", [[data["lng"], data["lat"]]]))
    
    return jsonify({
        "status": "success",
        "id": str(result.inserted_id),
        **ndvi_result
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)