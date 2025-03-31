from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import io
import base64
from dotenv import load_dotenv
import json
import time

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Hugging Face API
# Get your token from Hugging Face account settings
HF_API_TOKEN = os.environ.get("HUGGINGFACE_API_KEY", "")
if not HF_API_TOKEN:
    print("WARNING: HUGGINGFACE_API_KEY not found in environment variables")
    # Fallback to HF_API_TOKEN if the preferred name isn't found
    HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "")
    if not HF_API_TOKEN:
        print("WARNING: HF_API_TOKEN also not found. Please set one of these environment variables.")

# Using a public model that should be accessible with your token
HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2"

@app.route('/api/generate-image', methods=['POST'])
def generate_image():
    """
    Generate an image based on a text prompt using Hugging Face's Inference API.
    Expects a JSON payload with a 'prompt' field.
    Returns a JSON response with the generated image as base64.
    """
    try:
        data = request.json
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt is required'}), 400
        
        prompt = data['prompt']
        
        # Print for debugging - avoid logging sensitive information
        print(f"Sending request to Hugging Face with prompt: {prompt}")
        
        # Verify token exists and is not empty
        if not HF_API_TOKEN or HF_API_TOKEN.strip() == "":
            return jsonify({'error': 'API token not configured. Please set HUGGINGFACE_API_KEY in your .env file'}), 500
        
        # Print token length for debugging (don't print the actual token!)
        print(f"Token length: {len(HF_API_TOKEN)}")
        
        # Prepare payload for Hugging Face
        payload = {
            "inputs": prompt,
        }
        
        # Call the Hugging Face API with proper headers
        # Make sure to properly format the Authorization header with "Bearer "
        headers = {"Authorization": f"Bearer {HF_API_TOKEN.strip()}"}
        
        response = requests.post(HF_API_URL, headers=headers, json=payload)
        
        print(f"Hugging Face response status: {response.status_code}")
        
        # Handle model loading
        if response.status_code == 503:
            # The model is loading
            print("Model is loading. Waiting for it to be ready...")
            try:
                estimated_time = json.loads(response.content.decode("utf-8")).get("estimated_time", 20)
                print(f"Estimated time: {estimated_time} seconds")
                time.sleep(min(estimated_time, 20))  # Wait for the model to load, but not too long
            except:
                time.sleep(10)  # Default wait time if we can't parse the response
            
            # Try again
            response = requests.post(HF_API_URL, headers=headers, json=payload)
            print(f"Retry response status: {response.status_code}")
        
        # Print response content for debugging if there's an error
        if response.status_code != 200:
            error_message = response.text
            print(f"API Error: {error_message}")
            return jsonify({'error': f'API Error: {error_message}'}), 500
        
        # The response is the binary image data
        image_bytes = response.content
        
        # Convert to base64 for sending to the frontend
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        image_url = f"data:image/jpeg;base64,{image_base64}"
        
        # Return the base64 image
        return jsonify({
            'imageUrl': image_url,
            'prompt': prompt
        })
    
    except requests.exceptions.RequestException as e:
        app.logger.error(f"API request error: {str(e)}")
        print(f"Request error details: {str(e)}")
        return jsonify({'error': f'Failed to connect to image API: {str(e)}'}), 500
    
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        print(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint to verify the API is running."""
    return jsonify({'status': 'ok', 'token_configured': bool(HF_API_TOKEN)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)