import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // State variables to store prompt, image URL, loading state and error
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previousPrompts, setPreviousPrompts] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [apiTokenStatus, setApiTokenStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');

  // Backend API URL
  const API_URL = 'http://localhost:5001/api/generate-image';
  const HEALTH_CHECK_URL = 'http://localhost:5001/api/health';

  // Check if the backend is available on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await axios.get(HEALTH_CHECK_URL);
        setBackendStatus('online');
        setApiTokenStatus(response.data.token_configured);
      } catch (err) {
        console.error('Backend health check failed:', err);
        setBackendStatus('offline');
      }
    };

    checkBackendStatus();
  }, []);

  /**
   * Handle form submission to generate an image
   * @param {Event} e - The form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError('');
    setImageUrl('');
    
    try {
      console.log('Sending request to backend with prompt:', prompt);
      
      // Send request to the backend
      const response = await axios.post(API_URL, { prompt }, {
        headers: {
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging requests
        timeout: 60000 // 60 seconds
      });
      
      console.log('Response received:', response.data);
      
      // Check if the response contains the expected data
      if (response.data && response.data.imageUrl) {
        setImageUrl(response.data.imageUrl);
        
        // Add the prompt to previous prompts history
        setPreviousPrompts(prev => [prompt, ...prev.slice(0, 4)]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error generating image:', err);
      
      // Display a more user-friendly error message
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(err.response.data?.error || `Server error: ${err.response.status}`);
        
        // Special handling for authentication errors
        if (err.response.data?.error?.includes('Invalid credentials') || 
            err.response.data?.error?.includes('API token not configured')) {
          setError('HuggingFace API token is missing or invalid. Please check your .env file.');
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. Please check if the backend is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load a previous prompt
   * @param {string} oldPrompt - A previously used prompt
   */
  const loadPreviousPrompt = (oldPrompt) => {
    setPrompt(oldPrompt);
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">
            <span className="logo-icon">🎨</span>
            <h1>AI Image Generator</h1>
          </div>
          <ul className="navbar-menu">
            <li className={activeTab === 'generate' ? 'active' : ''}>
              <button onClick={() => setActiveTab('generate')}>Generate</button>
            </li>
            <li className={activeTab === 'gallery' ? 'active' : ''}>
              <button onClick={() => setActiveTab('gallery')}>Gallery</button>
            </li>
            <li className={activeTab === 'about' ? 'active' : ''}>
              <button onClick={() => setActiveTab('about')}>About</button>
            </li>
          </ul>
          <div className="system-status">
            <span className={`status-indicator ${backendStatus === 'online' ? 'online' : 'offline'}`}></span>
            <span className="status-text">{backendStatus === 'online' ? 'System Online' : 'System Offline'}</span>
          </div>
        </div>
      </nav>

      <div className="main-content">
        {activeTab === 'generate' && (
          <>
            <div className="hero-section">
              <h2>Transform Your Ideas Into Images</h2>
              <p>Create stunning AI-generated artwork with just a text prompt</p>
              
              {backendStatus === 'offline' && (
                <div className="status-banner error">
                  <span className="status-icon">⚠️</span>
                  Backend service is not available. Please check your server.
                </div>
              )}
              
              {apiTokenStatus === false && backendStatus === 'online' && (
                <div className="status-banner error">
                  <span className="status-icon">⚠️</span>
                  HuggingFace API token is not configured. Please set it in your .env file.
                </div>
              )}
            </div>
            
            <div className="generator-section">
              <form onSubmit={handleSubmit} className="generator-form">
                <div className="input-container">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a prompt (e.g., 'A futuristic city at sunset')"
                    className="prompt-input"
                  />
                  <button
                    type="submit"
                    className="generate-button"
                    disabled={isLoading || backendStatus === 'offline' || apiTokenStatus === false}
                  >
                    {isLoading ? 'Generating...' : 'Generate Image'}
                  </button>
                </div>
                {error && <div className="error-message">{error}</div>}
              </form>
              
              <div className="workspace">
                <div className="previous-prompts-panel">
                  <h3>Previous Prompts</h3>
                  {previousPrompts.length > 0 ? (
                    <ul className="prompt-history">
                      {previousPrompts.map((oldPrompt, index) => (
                        <li key={index}>
                          <button onClick={() => loadPreviousPrompt(oldPrompt)}>
                            {oldPrompt}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-history">Your prompt history will appear here</p>
                  )}
                </div>
                
                <div className="result-container">
                  {isLoading && (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>Generating your image...</p>
                    </div>
                  )}
                  
                  {imageUrl && !isLoading && (
                    <div className="image-result">
                      <h3>Generated Image</h3>
                      <div className="prompt-display">Prompt: "{prompt}"</div>
                      <div className="image-frame">
                        <img
                          src={imageUrl}
                          alt={`AI-generated: ${prompt}`}
                          className="generated-image"
                          onError={(e) => {
                            setError('Failed to load the generated image');
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="image-actions">
                        <button className="action-button">
                          <span className="action-icon">💾</span> Save
                        </button>
                        <button className="action-button">
                          <span className="action-icon">🔗</span> Share
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!isLoading && !imageUrl && (
                    <div className="empty-result">
                      <div className="placeholder-image">
                        <span className="placeholder-icon">🖼️</span>
                      </div>
                      <p>Your generated image will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'gallery' && (
          <div className="gallery-section">
            <h2>Your Gallery</h2>
            <p>View and manage your previously generated images</p>
            <div className="gallery-empty">
              <span className="gallery-icon">📁</span>
              <p>Your saved images will appear here</p>
            </div>
          </div>
        )}
        
        {activeTab === 'about' && (
          <div className="about-section">
            <h2>About AI Image Generator</h2>
            <div className="about-content">
              <p>
                This application uses state-of-the-art AI models to generate images from text descriptions.
                Simply enter a descriptive prompt, and watch as the AI creates a visual representation of your ideas.
              </p>
              <h3>How It Works</h3>
              <p>
                The application uses a React frontend connected to a Flask backend that interfaces with the 
                HuggingFace API to generate images using diffusion models.
              </p>
              <h3>Technologies Used</h3>
              <ul className="tech-list">
                <li>React</li>
                <li>Flask</li>
                <li>HuggingFace API</li>
                <li>Diffusion Models</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h3>AI Image Generator</h3>
            <p>Transform your ideas into stunning visuals with the power of AI</p>
          </div>
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><button onClick={() => setActiveTab('generate')}>Generate</button></li>
              <li><button onClick={() => setActiveTab('gallery')}>Gallery</button></li>
              <li><button onClick={() => setActiveTab('about')}>About</button></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Resources</h3>
            <ul>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Documentation</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>API Reference</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Support</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AI Image Generator. Built with React and Flask.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;