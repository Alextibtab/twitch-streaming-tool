// WebSocket connection
let socket = null;
const logElement = document.getElementById('event-log');
const statusElement = document.getElementById('connection-status');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');

// Connect to WebSocket
connectBtn.addEventListener('click', connectWebSocket);
disconnectBtn.addEventListener('click', disconnectWebSocket);

// Simulation buttons
document.getElementById('sim-glitch').addEventListener('click', () => {
  applyEffect('shader', { type: 'glitch', intensity: 0.8 });
  logEvent('Simulated glitch shader effect', 'effect');
});

document.getElementById('sim-camera').addEventListener('click', () => {
  applyEffect('camera', { angle: 'random' });
  logEvent('Simulated camera angle change', 'effect');
});

document.getElementById('sim-color').addEventListener('click', () => {
  applyEffect('color', { shift: true, duration: 5000 });
  logEvent('Simulated color shift effect', 'effect');
});

document.getElementById('sim-command').addEventListener('click', () => {
  logEvent('Simulated command: !effect by TestUser with args: glitch', 'command');
});

// Initial setup
drawPlaceholder();

  // Connect to WebSocket
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    logEvent('Already connected', 'error');
    return;
  }
  
  try {
    socket = new WebSocket('ws://localhost:8080/ws');
    
    socket.onopen = () => {
      statusElement.textContent = 'Connected';
      statusElement.style.color = '#28a745';
      logEvent('WebSocket connected', 'connection');
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    socket.onerror = (error) => {
      logEvent(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');
    };
    
    socket.onclose = () => {
      statusElement.textContent = 'Disconnected';
      statusElement.style.color = '#dc3545';
      logEvent('WebSocket disconnected', 'connection');
      socket = null;
    };
  } catch (error) {
    logEvent(`Failed to connect: ${error.message}`, 'error');
  }
}

// Disconnect from WebSocket
function disconnectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'shader':
      applyEffect('shader', message.data);
      break;
    case 'camera':
      applyEffect('camera', message.data);
      break;
    case 'color':
      applyEffect('color', message.data);
      break;
    case 'command':
      // Handle chatbot commands
      logEvent(`Command: ${message.data.command} by ${message.data.user}${message.data.args ? ' with args: ' + message.data.args: '' }`, 'command');
      break;
  }
}

// Log events to the UI
function logEvent(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const timestamp = `[${new Date().toLocaleTimeString()}]`;
  
  if (type === 'command') {
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = timestamp + ' ';

    const messageSpan = document.createElement('span');
    messageSpan.className = 'command-message';
    messageSpan.textContent = message;

    entry.appendChild(timestampSpan);
    entry.appendChild(messageSpan);
  } else {
    entry.textContent = `${timestamp} ${message}`;
  }

  logElement.appendChild(entry);
  logElement.scrollTop = logElement.scrollHeight;

  while (logElement.children.length > 100) {
    logElement.removeChild(logElement.firstChild);
  }
}

// Apply visual effects to the preview
function applyEffect(type, data) {
  // In a real implementation, this would apply WebGPU effects
  // For this demo, we'll just update the canvas
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  switch (type) {
    case 'shader':
      // Simulate glitch effect
      drawGlitchEffect(data.intensity || 0.5);
      break;
    case 'camera':
      // Simulate camera angle change
      drawCameraAngle(data.angle || 'random');
      break;
    case 'color':
      // Simulate color shift
      drawColorShift(data.duration || 3000);
      break;
    default:
      drawPlaceholder();
  }
}

// Draw placeholder content
function drawPlaceholder() {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#6441a5';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Twitch Stream Preview', canvas.width / 2, canvas.height / 2);
}

// Draw glitch effect
function drawGlitchEffect(intensity) {
  // Base background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw some random glitch rectangles
  const numGlitches = Math.floor(intensity * 20);
  
  for (let i = 0; i < numGlitches; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const width = Math.random() * 100 + 10;
    const height = Math.random() * 20 + 2;
    
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    const a = Math.random() * 0.7 + 0.1;
    
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    ctx.fillRect(x, y, width, height);
  }
  
  // Text with offset
  ctx.fillStyle = '#ff0000';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GLITCH EFFECT', canvas.width / 2 + 4, canvas.height / 2 + 4);
  
  ctx.fillStyle = '#00ffff';
  ctx.fillText('GLITCH EFFECT', canvas.width / 2 - 2, canvas.height / 2 - 2);
}

// Draw camera angle change
function drawCameraAngle(angle) {
  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Apply rotation based on angle
  ctx.translate(canvas.width / 2, canvas.height / 2);
  
  if (angle === 'random') {
    const angles = [0, 45, 90, 180, -45, -90];
    const randomAngle = angles[Math.floor(Math.random() * angles.length)];
    ctx.rotate(randomAngle * Math.PI / 180);
  } else {
    ctx.rotate(parseInt(angle) * Math.PI / 180);
  }
  
  // Draw camera frame
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(-canvas.width / 3, -canvas.height / 3, canvas.width * 2/3, canvas.height * 2/3);
  
  // Draw camera text
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAMERA ANGLE', 0, 0);
  
  ctx.restore();
}

// Draw color shift effect
function drawColorShift(duration) {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
  gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 0, 255, 0.5)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('COLOR SHIFT', canvas.width / 2, canvas.height / 2);
  
  // Animate color shift (in a real app, this would use requestAnimationFrame)
  setTimeout(() => {
    drawPlaceholder();
  }, duration);
}
