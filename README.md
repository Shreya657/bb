# Disaster Management System

## Overview
This project is a disaster management system that uses AI/ML to analyze disaster images and provide severity assessments on a scale of 1-10. The system now includes a PyTorch-based CNN model for more accurate disaster classification and severity prediction.

## Architecture
The system consists of two main components:

1. **Node.js Backend**: Handles user authentication, file uploads, and communication with the Flask server.
2. **Flask Server**: Processes uploaded images and performs disaster analysis using a multi-head CNN model implemented with PyTorch.

## Features
- User authentication and management
- Image upload for disaster analysis
- PyTorch CNN-based disaster type classification (Wildfire, Flood, Earthquake, Hurricane, Tornado)
- Multi-head model for simultaneous disaster type and severity prediction
- Disaster severity assessment on a scale of 1-10
- Severity categorization (Low, Medium, High)
- Web interface for direct image analysis
- Fallback mechanism when model is unavailable

## Setup Instructions

### Prerequisites
- Node.js
- Python 3.x
- MongoDB

### Installation

#### Node.js Backend
```bash
npm install
```

#### Flask Server
```bash
cd flask_server
pip install -r requirements.txt
```

### Running the Application

#### Start the Node.js Backend
```bash
node index.js
```

#### Start the Flask Server
```bash
cd flask_server
python app.py
```

## API Endpoints

### User Management
- `POST /api/v1/users/register`: Register a new user
- `POST /api/v1/users/login`: User login
- `POST /api/v1/users/logout`: User logout
- `GET /api/v1/users/me`: Get current user details

### Disaster Analysis
- `POST /api/v1/disaster/predict`: Upload an image for disaster analysis

## Response Format
When an image is uploaded for analysis, the system returns a JSON response with the following structure:

```json
{
  "disaster_type": "Wildfire",
  "confidence": 0.85,
  "disaster_level": 7,
  "severity_category": "Medium",
  "file_processed": "example.jpg",
  "status": "success"
}
```

- `disaster_type`: Type of disaster detected (Wildfire, Flood, Earthquake, etc.)
- `confidence`: Confidence level of the prediction (0-1)
- `disaster_level`: Severity level on a scale of 1-10
- `severity_category`: Categorized severity (Low: 1-3, Medium: 4-7, High: 8-10)
- `file_processed`: Name of the processed file
- `status`: Status of the analysis

## Model Architecture

The disaster classification model uses a multi-head CNN architecture:
- Three convolutional layers with ReLU activation and max pooling
- Two fully connected layers with dropout for regularization
- Separate output heads for classification and severity regression
- Proper image normalization and resizing

## Training the Model

To train the model with your own data:

1. Add disaster images to the respective folders in `flask_server/dataset/`
2. Run the training script:
   ```bash
   cd flask_server
   python train.py
   ```
3. The trained model will be saved as `best_model.pth`

## Future Enhancements
- Fine-tuning the CNN model with more diverse disaster images
- Real-time disaster monitoring
- Mobile application for field reporting
- Integration with emergency response systems
- Geolocation tagging for disaster mapping
