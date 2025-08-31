import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw';
import { useState, useEffect } from 'react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationMarker = () => {
  const [position, setPosition] = useState(null);
  const [ndviData, setNdviData] = useState(null); // NDVI data
  const [popupPosition, setPopupPosition] = useState(null); // New state for popup position
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 16 });
    map.on('locationfound', (e) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 16);
    });
    map.on('locationerror', () => {
      alert('Location access denied. Using default location.');
      setPosition([12.9716, 77.5946]);
    });

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      draw: {
        polyline: true,
        polygon: false,
        circle: false,
        marker: false,
        rectangle: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });
    map.addControl(drawControl);

   map.on('draw:created', (e) => {
  const layer = e.layer;
  drawnItems.addLayer(layer);
  const coordinates = layer.getLatLngs().map(coord => [coord.lat, coord.lng]);
  console.log('Drawn path coordinates:', coordinates);

  const latSum = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  const lngSum = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  const centroid = [latSum / coordinates.length, lngSum / coordinates.length];
  setPopupPosition(centroid);

  fetch('http://localhost:5000/api/save_location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: position ? position.lat : 12.9716,
      lng: position ? position.lng : 77.5946,
      path: coordinates,
      timestamp: new Date().toISOString()
    }),
  })
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  })
  .then(data => {
    console.log('Saved to DB:', data);
    setNdviData(data);
  })
  .catch(error => console.error('Fetch error:', error.message));
});

    return () => {
      map.off('locationfound');
      map.off('locationerror');
      map.off('draw:created');
    };
  }, [map]);

  return (
    <div>
      {position && (
        <Marker position={position}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      {popupPosition && ndviData && (
        <Popup position={popupPosition}>
          <div>
            <h3>Vegetation Analysis</h3>
            <p>NDVI: {ndviData.ndvi}</p>
            <p>Status: {ndviData.status}</p>
            <p>Suggestion: {ndviData.suggestion}</p>
          </div>
        </Popup>
      )}
    </div>
  );
};

const MapComponent = () => {
  const defaultPosition = [12.9716, 77.5946];

  return (
    <MapContainer center={defaultPosition} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; <a href="https://www.esri.com">Esri</a>'
      />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        opacity={0.5}
      />
      <LocationMarker />
    </MapContainer>
  );
};

export default MapComponent;