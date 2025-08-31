import { useState } from 'react';
import MapComponent from './MapComponent';
import './App.css';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [vegetationContent, setVegetationContent] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);

      // Basic vegetation detection using canvas
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let greenPixels = 0;
        let totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          // Simple green detection (green > red and green > blue)
          if (green > red * 1.5 && green > blue * 1.5 && green > 100) {
            greenPixels++;
          }
        }

        const percentage = (greenPixels / totalPixels * 100).toFixed(2);
        setVegetationContent(`Vegetation Content: ${percentage}%`);
      };
    }
  };

  return (
    <div>
      <h1>Vegetation Analyzer</h1>
      <div style={{ textAlign: 'center', margin: '10px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ margin: '10px' }}
        />
        {uploadedImage && (
          <div>
            <h3>Uploaded Image:</h3>
            <img src={uploadedImage} alt="Uploaded" style={{ maxWidth: '300px' }} />
            {vegetationContent && <p>{vegetationContent}</p>}
          </div>
        )}
      </div>
      <MapComponent />
    </div>
  );
}

export default App;