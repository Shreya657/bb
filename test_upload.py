import requests
import os
import sys

def test_disaster_prediction(image_path):
    """Test the disaster prediction API by uploading an image"""
    
    # Check if the image file exists
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} not found")
        return
    
    # API endpoint
    url = "http://localhost:5000/predict"
    
    # Prepare the file for upload
    files = {'file': open(image_path, 'rb')}
    
    try:
        # Make the request
        print(f"Uploading {image_path} for disaster analysis...")
        response = requests.post(url, files=files)
        
        # Check if the request was successful
        if response.status_code == 200:
            result = response.json()
            print("\nAnalysis Result:")
            print(f"Disaster Type: {result.get('disaster_type')}")
            print(f"Confidence: {result.get('confidence')}")
            print(f"Disaster Level (1-10): {result.get('disaster_level')}")
            print(f"Severity Category: {result.get('severity_category')}")
            print(f"File Processed: {result.get('file_processed')}")
            print(f"Status: {result.get('status')}")
        else:
            print(f"Error: API returned status code {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"Error: {str(e)}")
    
    finally:
        # Close the file
        files['file'].close()

def main():
    # Check if an image path was provided
    if len(sys.argv) < 2:
        print("Usage: python test_upload.py <path_to_image>")
        return
    
    # Get the image path from command line arguments
    image_path = sys.argv[1]
    
    # Test the disaster prediction
    test_disaster_prediction(image_path)

if __name__ == "__main__":
    main()