<template>
  <div v-if="!isJoined" class="join-container">
    <div class="join-card">
      <h1>Proximity Chat</h1>
      <p class="subtitle">Enter your name to join the voice chat</p>
      <div class="input-group">
        <input
          type="text"
          placeholder="Your name"
          v-model="name"
          @keypress.enter="handleJoin"
          class="name-input"
          autofocus
        />
        <button @click="handleJoin" class="join-button">
          Join Chat
        </button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>

  <div v-else class="app-container">
    <div class="chat-container">
      <div class="chat-header">
        <div>
          <h2>Voice Chat</h2>
          <p class="user-name">You: {{ name }}</p>
        </div>
        <div class="header-controls">
          <button
            @click="toggleMute"
            :class="['mute-button', { muted: isMuted }]"
            :title="isMuted ? 'Unmute' : 'Mute'"
          >
            {{ isMuted ? '🔇' : '🎤' }}
          </button>
          <button @click="handleLeave" class="leave-button">
            Leave
          </button>
        </div>
      </div>
      <div class="users-list">
        <h3>Connected Users ({{ users.length + 1 }})</h3>
        <div class="proximity-info">
          <p class="controls-hint">Use Arrow Keys or WASD to move</p>
          <details v-if="isAdmin" class="admin-controls">
            <summary>Admin Controls</summary>
            <div class="admin-controls-content">
              <div class="range-control">
                <label>Inner Range: {{ innerRange }}px</label>
                <input 
                  type="range" 
                  v-model.number="innerRange" 
                  min="50" 
                  :max="outerRange - 10" 
                  step="10"
                  @input="updateRanges"
                  class="range-slider"
                />
              </div>
              <div class="range-control">
                <label>Outer Range: {{ outerRange }}px</label>
                <input 
                  type="range" 
                  v-model.number="outerRange" 
                  :min="innerRange + 10" 
                  max="1000" 
                  step="10"
                  @input="updateRanges"
                  class="range-slider"
                />
              </div>
              <div class="canvas-size-controls">
                <h5>Canvas Size</h5>
                <div class="range-control">
                  <label>Width: {{ mapWidth }}px</label>
                  <input 
                    type="range" 
                    v-model.number="mapWidth" 
                    min="800" 
                    max="5000" 
                    step="100"
                    @input="updateCanvasSize"
                    class="range-slider"
                  />
                </div>
                <div class="range-control">
                  <label>Height: {{ mapHeight }}px</label>
                  <input 
                    type="range" 
                    v-model.number="mapHeight" 
                    min="600" 
                    max="5000" 
                    step="100"
                    @input="updateCanvasSize"
                    class="range-slider"
                  />
                </div>
              </div>
              <div class="background-controls">
                <h5>Background Image</h5>
                <div class="range-control">
                  <label>Canvas Background Image</label>
                  <div class="image-url-group">
                    <input 
                      type="url" 
                      v-model="canvasBackgroundImageUrl"
                      @input="handleImageUrlChange"
                      @blur="handleImageUrlChange"
                      class="url-input"
                      placeholder="https://example.com/image.jpg"
                    />
                    <button 
                      v-if="canvasBackgroundImage"
                      @click="removeBackgroundImage"
                      class="remove-image-button"
                    >
                      Remove
                    </button>
                  </div>
                  <div v-if="canvasBackgroundImage" class="image-preview">
                    <img :src="canvasBackgroundImage" alt="Background preview" />
                  </div>
                  <p v-if="imageLoadError" class="image-error">{{ imageLoadError }}</p>
                </div>
                <div v-if="canvasBackgroundImage" class="range-control">
                  <label>Image Scale: {{ (imageScale * 100).toFixed(0) }}%</label>
                  <input 
                    type="range" 
                    v-model.number="imageScale" 
                    min="0.1" 
                    max="5" 
                    step="0.1"
                    @input="updateImageScale"
                    class="range-slider"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>
        <div class="user-item you" :class="{ 'talking': isLocalTalking }">
          <span class="user-icon">👤</span>
          <span class="user-name-text">{{ name }} (You)</span>
          <span v-if="isAdmin" class="admin-badge">👑 Admin</span>
          <span v-if="isMuted" class="muted-indicator">🔇</span>
          <span v-if="isLocalTalking && !isMuted" class="talking-indicator">🎤</span>
        </div>
        <div
          v-for="user in users"
          :key="user.socketId"
          :class="['user-item', { 
            'in-range': user.inRange && user.zone === 'inner', 
            'outer-range': user.inRange && user.zone === 'outer',
            'out-of-range': !user.inRange 
          }]"
        >
          <span class="user-icon">👤</span>
          <span class="user-name-text">{{ user.name }}</span>
          <span v-if="user.isAdmin" class="admin-badge">👑 Admin</span>
          <span v-if="user.zone === 'inner'" class="status-indicator">●</span>
          <span v-else-if="user.zone === 'outer'" class="outer-range-indicator">○</span>
          <span v-else class="out-of-range-indicator">○</span>
          <span v-if="user.isMuted" class="muted-indicator">🔇</span>
          <span v-if="user.isTalking && !user.isMuted" class="talking-indicator">🎤</span>
        </div>
      </div>
    </div>
    <div class="map-container">
      <div class="zoom-controls">
        <button @click="zoomOut" class="zoom-button" :disabled="zoomLevel <= 0.1">−</button>
        <span class="zoom-level">{{ (zoomLevel * 100).toFixed(0) }}%</span>
        <button @click="zoomIn" class="zoom-button" :disabled="zoomLevel >= 2">+</button>
      </div>
      <div class="canvas-wrapper">
        <canvas 
          ref="canvasRef" 
          @click="handleCanvasClick"
          @mousemove="handleMouseMove"
          tabindex="0"
          class="game-map"
          :style="{ transform: `scale(${zoomLevel})` }"
        ></canvas>
      </div>
      <div class="map-overlay">
        <div class="map-info">
          <p>Click to move • Arrow Keys / WASD to move</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, nextTick, watch } from 'vue';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';
const MOVE_SPEED = 5;

// Canvas dimensions (will be updated from server)
const mapWidth = ref(1920);
const mapHeight = ref(1080);

// Canvas display dimensions (fixed, with zoom)
const canvasDisplayWidth = ref(1920);
const canvasDisplayHeight = ref(1080);
const zoomLevel = ref(1.0); // 0.1x to 2x

const name = ref('');
const isJoined = ref(false);
const users = ref([]);
const error = ref('');
const isMuted = ref(false);
const isAdmin = ref(false);

// Reactive range values (will be updated from server)
const innerRange = ref(100);
const outerRange = ref(200);

// Reactive background colors (will be updated from server)
const bodyBackgroundColor = ref('#1a1a2e');
const canvasBackgroundColor = ref('#2c3e50');
const canvasBackgroundImage = ref(null); // Image URL or base64 data
const canvasBackgroundImageUrl = ref(''); // URL input value
const backgroundImageRef = ref(null); // Image object for drawing
const imageLoadError = ref('');
const imageScale = ref(1.0); // Image scale multiplier

const socketRef = ref(null);
const localStreamRef = ref(null);
const peerConnectionsRef = ref(new Map());
const audioRefsRef = ref(new Map());
const audioAnalysersRef = ref(new Map());
const isLocalTalking = ref(false);
const localAudioContextRef = ref(null);
const localAnalyserRef = ref(null);

// Canvas references
const canvasRef = ref(null);
const ctxRef = ref(null);
const myPosition = ref({ x: 960, y: 540 }); // Store in server coordinates (default center)
const keysPressed = ref({});
const animationFrameRef = ref(null);

// Convert server coordinates to canvas coordinates for rendering (with zoom)
const serverToCanvas = (serverX, serverY) => {
  const scaleX = canvasDisplayWidth.value / mapWidth.value;
  const scaleY = canvasDisplayHeight.value / mapHeight.value;
  return {
    x: serverX * scaleX,
    y: serverY * scaleY
  };
};

// Convert canvas coordinates to server coordinates (with zoom)
const canvasToServer = (canvasX, canvasY) => {
  const scaleX = mapWidth.value / canvasDisplayWidth.value;
  const scaleY = mapHeight.value / canvasDisplayHeight.value;
  return {
    x: canvasX * scaleX,
    y: canvasY * scaleY
  };
};

// Calculate distance between two 2D points
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Initialize canvas
const initCanvas = () => {
  if (!canvasRef.value) return;
  
  const canvas = canvasRef.value;
  
  // Set fixed canvas size (will be updated from server)
  canvas.width = canvasDisplayWidth.value;
  canvas.height = canvasDisplayHeight.value;
  
  ctxRef.value = canvas.getContext('2d');
  
  // Focus canvas for keyboard input
  canvas.focus();
  
  // Draw initial frame
  draw();
  
  // Start game loop
  gameLoop();
};

// Draw everything on canvas
const draw = () => {
  if (!ctxRef.value) return;
  
  const ctx = ctxRef.value;
  const width = canvasDisplayWidth.value;
  const height = canvasDisplayHeight.value;
  
  // Clear canvas with background color
  ctx.fillStyle = canvasBackgroundColor.value;
  ctx.fillRect(0, 0, width, height);
  
  // Draw background image if available (scaled)
  if (backgroundImageRef.value && canvasBackgroundImage.value) {
    const img = backgroundImageRef.value;
    // Draw image scaled by imageScale
    const scaledWidth = img.naturalWidth * imageScale.value;
    const scaledHeight = img.naturalHeight * imageScale.value;
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
  }
  
  // Draw grid pattern (only if no image)
  if (!canvasBackgroundImage.value) {
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  
  // Draw proximity circles for current user
  const myCanvasPos = serverToCanvas(myPosition.value.x, myPosition.value.y);
  const innerCanvasRange = (innerRange.value * canvasDisplayWidth.value) / mapWidth.value;
  const outerCanvasRange = (outerRange.value * canvasDisplayWidth.value) / mapWidth.value;
  
  // Outer ring (gradual fade zone)
  ctx.beginPath();
  ctx.arc(myCanvasPos.x, myCanvasPos.y, outerCanvasRange, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
  ctx.fill();
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Inner ring (full volume zone)
  ctx.beginPath();
  ctx.arc(myCanvasPos.x, myCanvasPos.y, innerCanvasRange, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw other users
  users.value.forEach(user => {
    if (user.position) {
      // Calculate distance in server coordinates
      const distance = calculateDistance(
        myPosition.value.x,
        myPosition.value.y,
        user.position.x,
        user.position.y
      );
      
      // Convert to canvas coordinates for rendering
      const userCanvasPos = serverToCanvas(user.position.x, user.position.y);
      
      // Draw connection line if in range
      if (distance <= outerRange.value) {
        ctx.beginPath();
        ctx.moveTo(myCanvasPos.x, myCanvasPos.y);
        ctx.lineTo(userCanvasPos.x, userCanvasPos.y);
        // Color based on distance - green for inner, yellow for outer
        if (distance <= innerRange.value) {
          ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
        } else {
          ctx.strokeStyle = 'rgba(255, 193, 7, 0.3)';
        }
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw user marker
      const markerRadius = user.isTalking ? 18 : 15;
      ctx.beginPath();
      ctx.arc(userCanvasPos.x, userCanvasPos.y, markerRadius, 0, Math.PI * 2);
      // Color based on zone
      if (distance <= innerRange.value) {
        ctx.fillStyle = '#4caf50'; // Green - full volume
      } else if (distance <= outerRange.value) {
        ctx.fillStyle = '#ffc107'; // Yellow - fading volume
      } else {
        ctx.fillStyle = '#999'; // Gray - out of range
      }
      ctx.fill();
      ctx.strokeStyle = user.isTalking ? '#ffeb3b' : '#fff';
      ctx.lineWidth = user.isTalking ? 4 : 3;
      ctx.stroke();
      
      // Draw talking indicator ring
      if (user.isTalking) {
        ctx.beginPath();
        ctx.arc(userCanvasPos.x, userCanvasPos.y, markerRadius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 235, 59, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw user name
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(user.name, userCanvasPos.x, userCanvasPos.y - 30);
      
      // Draw talking indicator
      if (user.isTalking) {
        ctx.fillStyle = '#ffeb3b';
        ctx.font = '16px Arial';
        ctx.fillText('🎤', userCanvasPos.x, userCanvasPos.y - 45);
      }
    }
  });
  
  // Draw current user (always on top)
  const myRadius = isLocalTalking.value ? 23 : 20;
  ctx.beginPath();
  ctx.arc(myCanvasPos.x, myCanvasPos.y, myRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#667eea';
  ctx.fill();
  ctx.strokeStyle = isLocalTalking.value ? '#ffeb3b' : '#fff';
  ctx.lineWidth = isLocalTalking.value ? 5 : 4;
  ctx.stroke();
  
  // Draw talking indicator ring
  if (isLocalTalking.value) {
    ctx.beginPath();
    ctx.arc(myCanvasPos.x, myCanvasPos.y, myRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 235, 59, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Draw user icon
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('👤', myCanvasPos.x, myCanvasPos.y + 7);
  
  // Draw user name
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(name.value, myCanvasPos.x, myCanvasPos.y - 35);
  
  // Draw talking indicator
  if (isLocalTalking.value && !isMuted.value) {
    ctx.fillStyle = '#ffeb3b';
    ctx.font = '18px Arial';
    ctx.fillText('🎤', myCanvasPos.x, myCanvasPos.y - 50);
  }
};

// Game loop for movement
const gameLoop = () => {
  if (!isJoined.value) return;
  
  let moved = false;
  let newX = myPosition.value.x;
  let newY = myPosition.value.y;
  
  // Handle movement
  if (keysPressed.value['ArrowUp'] || keysPressed.value['w'] || keysPressed.value['W']) {
    newY = Math.max(20, myPosition.value.y - MOVE_SPEED);
    moved = true;
  }
  if (keysPressed.value['ArrowDown'] || keysPressed.value['s'] || keysPressed.value['S']) {
    newY = Math.min(mapHeight.value - 20, myPosition.value.y + MOVE_SPEED);
    moved = true;
  }
  if (keysPressed.value['ArrowLeft'] || keysPressed.value['a'] || keysPressed.value['A']) {
    newX = Math.max(20, myPosition.value.x - MOVE_SPEED);
    moved = true;
  }
  if (keysPressed.value['ArrowRight'] || keysPressed.value['d'] || keysPressed.value['D']) {
    newX = Math.min(mapWidth.value - 20, myPosition.value.x + MOVE_SPEED);
    moved = true;
  }
  
  if (moved) {
    myPosition.value = { x: newX, y: newY };
    // Clamp position to server coordinate bounds
    myPosition.value.x = Math.max(20, Math.min(mapWidth.value - 20, myPosition.value.x));
    myPosition.value.y = Math.max(20, Math.min(mapHeight.value - 20, myPosition.value.y));
    updateProximity();
    
    // Send position update to server (already in server coordinates)
    if (socketRef.value) {
      socketRef.value.emit('position-update', {
        x: myPosition.value.x,
        y: myPosition.value.y
      });
    }
  }
  
  draw();
  animationFrameRef.value = requestAnimationFrame(gameLoop);
};

// Handle canvas click
const handleCanvasClick = (event) => {
  if (!canvasRef.value) return;
  
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const wrapper = canvas.parentElement;
  
  // Get click coordinates relative to canvas (accounting for scroll position and zoom)
  const scrollLeft = wrapper?.scrollLeft || 0;
  const scrollTop = wrapper?.scrollTop || 0;
  const clickX = (event.clientX - rect.left + scrollLeft) / zoomLevel.value;
  const clickY = (event.clientY - rect.top + scrollTop) / zoomLevel.value;
  
  // Convert canvas coordinates to server coordinates
  const serverPos = canvasToServer(clickX, clickY);
  
  // Clamp to server coordinate bounds
  const newX = Math.max(20, Math.min(mapWidth.value - 20, serverPos.x));
  const newY = Math.max(20, Math.min(mapHeight.value - 20, serverPos.y));
  
  myPosition.value = { x: newX, y: newY };
  updateProximity();
  
  // Send position update to server (already in server coordinates)
  if (socketRef.value) {
    socketRef.value.emit('position-update', {
      x: newX,
      y: newY
    });
  }
};

// Handle mouse move (for hover effects)
const handleMouseMove = () => {
  // Could add hover effects here
};

// Keyboard event handlers
const handleKeyDown = (event) => {
  keysPressed.value[event.key] = true;
};

const handleKeyUp = (event) => {
  keysPressed.value[event.key] = false;
};

// Update proximity calculations
const updateProximity = () => {
  users.value.forEach(user => {
    if (user.position) {
      const distance = calculateDistance(
        myPosition.value.x,
        myPosition.value.y,
        user.position.x,
        user.position.y
      );
      user.distance = distance;
      
      // Determine which zone user is in
      if (distance <= innerRange.value) {
        user.inRange = true;
        user.zone = 'inner'; // Full volume
      } else if (distance <= outerRange.value) {
        user.inRange = true;
        user.zone = 'outer'; // Gradual fade
      } else {
        user.inRange = false;
        user.zone = 'out'; // Out of range
      }

      // Update audio volume based on distance
      const audio = audioRefsRef.value.get(user.socketId);
      if (audio) {
        if (user.inRange) {
          let volume;
          if (distance <= innerRange.value) {
            // Full volume in inner zone
            volume = 1.0;
          } else {
            // More gradual fade from innerRange to outerRange
            // Using exponential curve for more natural fade
            const fadeRange = outerRange.value - innerRange.value;
            const distanceInFadeZone = distance - innerRange.value;
            const fadeRatio = distanceInFadeZone / fadeRange; // 0 to 1
            
            // Exponential curve: starts at 1.0, ends at 0.05 (barely audible)
            // Using power curve for smoother fade
            volume = Math.max(0.05, 1.0 * Math.pow(1.0 - fadeRatio, 2.5));
          }
          audio.volume = volume;
        } else {
          audio.volume = 0;
        }
      }

      // Manage peer connections based on proximity
      const pc = peerConnectionsRef.value.get(user.socketId);
      if (user.inRange && !pc) {
        // User entered range - create connection
        createPeerConnection(user.socketId, user.name, true);
      } else if (!user.inRange && pc) {
        // User left range - close connection
        pc.close();
        peerConnectionsRef.value.delete(user.socketId);
        const audio = audioRefsRef.value.get(user.socketId);
        if (audio) {
          audio.remove();
          audioRefsRef.value.delete(user.socketId);
        }
      }
    }
  });
};

// Watch for zoom changes
watch(zoomLevel, () => {
  if (ctxRef.value && isJoined.value) {
    draw();
  }
});

// Watch for canvas size changes (admin only for local updates)
watch([mapWidth, mapHeight], () => {
  if (isJoined.value && isAdmin.value) {
    // Only update display if admin (non-admin will get updates from server)
    canvasDisplayWidth.value = mapWidth.value;
    canvasDisplayHeight.value = mapHeight.value;
    if (canvasRef.value) {
      canvasRef.value.width = canvasDisplayWidth.value;
      canvasRef.value.height = canvasDisplayHeight.value;
      if (ctxRef.value) {
        draw();
      }
    }
  }
});

// Watch for range changes to redraw canvas
watch([innerRange, outerRange], () => {
  if (ctxRef.value && isJoined.value) {
    draw();
    updateProximity();
  }
});

// Watch for background color changes
watch([bodyBackgroundColor, canvasBackgroundColor, canvasBackgroundImage], () => {
  if (isJoined.value) {
    document.body.style.backgroundColor = bodyBackgroundColor.value;
    if (ctxRef.value) {
      draw();
    }
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  
  if (animationFrameRef.value) {
    cancelAnimationFrame(animationFrameRef.value);
  }
  
  // Cleanup on unmount
  if (socketRef.value) {
    socketRef.value.disconnect();
  }
  if (localStreamRef.value) {
    localStreamRef.value.getTracks().forEach(track => track.stop());
  }
  peerConnectionsRef.value.forEach(pc => pc.close());
});

// Zoom functions
const zoomIn = () => {
  if (zoomLevel.value < 2) {
    zoomLevel.value = Math.min(2, zoomLevel.value + 0.1);
    if (ctxRef.value) {
      draw();
    }
  }
};

const zoomOut = () => {
  if (zoomLevel.value > 0.1) {
    zoomLevel.value = Math.max(0.1, zoomLevel.value - 0.1);
    if (ctxRef.value) {
      draw();
    }
  }
};

// Update canvas size function (admin only)
const updateCanvasSize = () => {
  if (!isAdmin.value || !socketRef.value) return;
  
  // Update display dimensions to match map dimensions
  canvasDisplayWidth.value = mapWidth.value;
  canvasDisplayHeight.value = mapHeight.value;
  
  // Update canvas element size
  if (canvasRef.value) {
    canvasRef.value.width = canvasDisplayWidth.value;
    canvasRef.value.height = canvasDisplayHeight.value;
    if (ctxRef.value) {
      draw();
    }
  }
  
  // Send update to server
  socketRef.value.emit('update-canvas-size', {
    canvasWidth: mapWidth.value,
    canvasHeight: mapHeight.value
  });
};

// Handle image URL change
const handleImageUrlChange = () => {
  imageLoadError.value = '';
  
  const url = canvasBackgroundImageUrl.value.trim();
  
  // If empty, remove image
  if (!url) {
    removeBackgroundImage();
    return;
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    imageLoadError.value = 'Please enter a valid URL';
    return;
  }
  
  // Load image from URL
  const img = new Image();
  img.crossOrigin = 'anonymous'; // Enable CORS for external images
  
  img.onload = () => {
    // Image loaded successfully
    canvasBackgroundImage.value = url;
    backgroundImageRef.value = img;
    imageLoadError.value = '';
    updateBackground();
  };
  
  img.onerror = () => {
    // Image failed to load
    imageLoadError.value = 'Failed to load image from URL. Make sure the URL is accessible and CORS is enabled.';
    canvasBackgroundImage.value = null;
    backgroundImageRef.value = null;
  };
  
  img.src = url;
};

// Remove background image
const removeBackgroundImage = () => {
  canvasBackgroundImage.value = null;
  canvasBackgroundImageUrl.value = '';
  backgroundImageRef.value = null;
  imageLoadError.value = '';
  updateBackground();
};

// Update image scale function (admin only)
const updateImageScale = () => {
  if (!isAdmin.value || !socketRef.value) return;
  
  // Redraw canvas with new scale
  if (ctxRef.value) {
    draw();
  }
  
  // Send update to server
  socketRef.value.emit('update-image-scale', {
    imageScale: imageScale.value
  });
};

// Update background function (admin only)
const updateBackground = () => {
  if (!isAdmin.value || !socketRef.value) return;
  
  // Apply body background immediately
  document.body.style.backgroundColor = bodyBackgroundColor.value;
  
  // Redraw canvas with new background
  if (ctxRef.value) {
    draw();
  }
  
  // Send update to server
  socketRef.value.emit('update-background', {
    bodyBackgroundColor: bodyBackgroundColor.value,
    canvasBackgroundColor: canvasBackgroundColor.value,
    canvasBackgroundImage: canvasBackgroundImage.value
  });
};

// Update ranges function (admin only)
const updateRanges = () => {
  if (!isAdmin.value || !socketRef.value) return;
  
  // Ensure outer range is always greater than inner range
  if (outerRange.value <= innerRange.value) {
    outerRange.value = innerRange.value + 10;
  }
  
  // Send update to server
  socketRef.value.emit('update-ranges', {
    innerRange: innerRange.value,
    outerRange: outerRange.value
  });
};

const handleJoin = async () => {
  if (!name.value.trim()) {
    error.value = 'Please enter your name';
    return;
  }

  try {
    // Initialize socket connection
    socketRef.value = io(SOCKET_URL);
    const socket = socketRef.value;

    // Get user media (microphone)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.value = stream;
    
    // Set up local audio level detection
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8; // Higher smoothing for more stable detection
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      localAudioContextRef.value = audioContext;
      localAnalyserRef.value = analyser;
      
      console.log('Microphone access granted. Audio level detection initialized.');
      
      // Start monitoring local audio
      monitorLocalAudioLevel();
    } catch (err) {
      console.error('Error setting up local audio level detection:', err);
      error.value = 'Failed to initialize audio level detection.';
    }

    // Join the chat
    socket.emit('join', { name: name.value.trim() });

    // Handle canvas configuration from server
    socket.on('canvas-config', ({ canvasWidth: serverWidth, canvasHeight: serverHeight }) => {
      mapWidth.value = serverWidth;
      mapHeight.value = serverHeight;
      canvasDisplayWidth.value = serverWidth;
      canvasDisplayHeight.value = serverHeight;
      
      // Update canvas element size
      if (canvasRef.value) {
        canvasRef.value.width = canvasDisplayWidth.value;
        canvasRef.value.height = canvasDisplayHeight.value;
        if (ctxRef.value) {
          draw();
        }
      }
    });

    // Handle canvas size updates from server
    socket.on('canvas-size-updated', ({ canvasWidth: newWidth, canvasHeight: newHeight }) => {
      mapWidth.value = newWidth;
      mapHeight.value = newHeight;
      canvasDisplayWidth.value = newWidth;
      canvasDisplayHeight.value = newHeight;
      
      // Update canvas element size
      if (canvasRef.value) {
        canvasRef.value.width = canvasDisplayWidth.value;
        canvasRef.value.height = canvasDisplayHeight.value;
        if (ctxRef.value) {
          draw();
        }
      }
    });

    // Handle range configuration from server
    socket.on('range-config', ({ innerRange: serverInnerRange, outerRange: serverOuterRange, isAdmin: adminStatus }) => {
      innerRange.value = serverInnerRange;
      outerRange.value = serverOuterRange;
      isAdmin.value = adminStatus;
      // Redraw canvas with new ranges
      if (ctxRef.value) {
        draw();
      }
      updateProximity();
    });

    // Handle background configuration from server
    socket.on('background-config', ({ bodyBackgroundColor: serverBodyBg, canvasBackgroundColor: serverCanvasBg, canvasBackgroundImage: serverCanvasImg, imageScale: serverImageScale }) => {
      bodyBackgroundColor.value = serverBodyBg;
      canvasBackgroundColor.value = serverCanvasBg;
      canvasBackgroundImage.value = serverCanvasImg;
      canvasBackgroundImageUrl.value = serverCanvasImg || '';
      if (serverImageScale !== undefined) {
        imageScale.value = serverImageScale;
      }
      
      // Load image if provided
      if (serverCanvasImg) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          backgroundImageRef.value = img;
          if (ctxRef.value) {
            draw();
          }
        };
        img.onerror = () => {
          imageLoadError.value = 'Failed to load image from server';
          backgroundImageRef.value = null;
        };
        img.src = serverCanvasImg;
      } else {
        backgroundImageRef.value = null;
      }
      
      // Apply body background
      document.body.style.backgroundColor = bodyBackgroundColor.value;
      // Redraw canvas with new background
      if (ctxRef.value) {
        draw();
      }
    });

    // Handle range updates from server
    socket.on('range-updated', ({ innerRange: newInnerRange, outerRange: newOuterRange }) => {
      innerRange.value = newInnerRange;
      outerRange.value = newOuterRange;
      // Redraw canvas with new ranges
      if (ctxRef.value) {
        draw();
      }
      updateProximity();
    });

    // Handle background updates from server
    socket.on('background-updated', ({ bodyBackgroundColor: newBodyBg, canvasBackgroundColor: newCanvasBg, canvasBackgroundImage: newCanvasImg, imageScale: newImageScale }) => {
      bodyBackgroundColor.value = newBodyBg;
      canvasBackgroundColor.value = newCanvasBg;
      canvasBackgroundImage.value = newCanvasImg;
      canvasBackgroundImageUrl.value = newCanvasImg || '';
      if (newImageScale !== undefined) {
        imageScale.value = newImageScale;
      }
      
      // Load image if provided
      if (newCanvasImg) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          backgroundImageRef.value = img;
          imageLoadError.value = '';
          if (ctxRef.value) {
            draw();
          }
        };
        img.onerror = () => {
          imageLoadError.value = 'Failed to load image from URL';
          backgroundImageRef.value = null;
          if (ctxRef.value) {
            draw();
          }
        };
        img.src = newCanvasImg;
      } else {
        backgroundImageRef.value = null;
        imageLoadError.value = '';
        if (ctxRef.value) {
          draw();
        }
      }
      
      // Apply body background
      document.body.style.backgroundColor = bodyBackgroundColor.value;
      // Redraw canvas with new background
      if (ctxRef.value) {
        draw();
      }
    });

    // Handle image scale updates from server
    socket.on('image-scale-updated', ({ imageScale: newScale }) => {
      imageScale.value = newScale;
      if (ctxRef.value) {
        draw();
      }
    });

    // Handle initial position from server
    socket.on('initial-position', ({ x, y }) => {
      // Store position in server coordinates (no scaling)
      myPosition.value = { x, y };
      // Initialize canvas after receiving position
      nextTick().then(() => {
        setTimeout(() => {
          initCanvas();
        }, 100);
      });
    });

    // Handle existing users
    socket.on('existing-users', (existingUsers) => {
      existingUsers.forEach(user => {
        // Store positions in server coordinates (no scaling)
        users.value.push({
          socketId: user.socketId,
          name: user.name,
          position: user.position, // Already in server coordinates
          distance: undefined,
          inRange: false,
          isTalking: false,
          isAdmin: user.isAdmin || false,
          isMuted: user.isMuted || false
        });
      });
      
      // Update proximity after receiving all users
      updateProximity();
    });

    // Handle new user joining
    socket.on('user-joined', ({ socketId, name: userName, position, isAdmin: userIsAdmin, isMuted: userIsMuted }) => {
      // Store position in server coordinates (no scaling)
      users.value.push({
        socketId,
        name: userName,
        position: position, // Already in server coordinates
        distance: undefined,
        inRange: false,
        isTalking: false,
        isAdmin: userIsAdmin || false,
        isMuted: userIsMuted || false
      });

      updateProximity();
    });

    // Handle position updates
    socket.on('user-position-updated', ({ socketId, position }) => {
      const user = users.value.find(u => u.socketId === socketId);
      if (user) {
        // Store position in server coordinates (no scaling)
        user.position = position;
        updateProximity();
      }
    });

    // Handle WebRTC offer
    socket.on('offer', async ({ offer, senderSocketId, senderName }) => {
      let pc = peerConnectionsRef.value.get(senderSocketId);
      
      // Create peer connection if it doesn't exist
      if (!pc) {
        pc = createPeerConnection(senderSocketId, senderName, false);
      }
      
      // Only process offer if connection is in stable state (not already processing an offer)
      if (pc && pc.signalingState === 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { answer, targetSocketId: senderSocketId });
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      } else if (pc) {
        console.warn(`Cannot handle offer: connection state is ${pc.signalingState}`);
      }
    });

    // Handle WebRTC answer
    socket.on('answer', async ({ answer, senderSocketId }) => {
      const pc = peerConnectionsRef.value.get(senderSocketId);
      // Only accept answer if we have a local offer (we initiated the connection)
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      } else if (pc) {
        console.warn(`Cannot handle answer: connection state is ${pc.signalingState}`);
      }
    });

    // Handle ICE candidate
    socket.on('ice-candidate', async ({ candidate, senderSocketId }) => {
      const pc = peerConnectionsRef.value.get(senderSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Ignore errors for candidates that arrive after connection is established
          if (pc.connectionState !== 'connected' && pc.connectionState !== 'completed') {
            console.error('Error adding ICE candidate:', err);
          }
        }
      }
    });

    // Handle mute status updates
    socket.on('user-mute-updated', ({ socketId, isMuted: userIsMuted }) => {
      const user = users.value.find(u => u.socketId === socketId);
      if (user) {
        user.isMuted = userIsMuted;
      }
    });

    // Handle admin change
    socket.on('admin-changed', ({ newAdminSocketId }) => {
      // Update admin status for all users
      users.value.forEach(user => {
        user.isAdmin = user.socketId === newAdminSocketId;
      });
      // Update local admin status
      if (socketRef.value) {
        isAdmin.value = socketRef.value.id === newAdminSocketId;
      }
    });

    // Handle user leaving
    socket.on('user-left', ({ socketId }) => {
      const pc = peerConnectionsRef.value.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.value.delete(socketId);
      }
      const audio = audioRefsRef.value.get(socketId);
      if (audio) {
        audio.remove();
        audioRefsRef.value.delete(socketId);
      }
      
      // Clean up audio analyser
      const analyserData = audioAnalysersRef.value.get(socketId);
      if (analyserData) {
        analyserData.audioContext.close();
        audioAnalysersRef.value.delete(socketId);
      }
      
      users.value = users.value.filter(u => u.socketId !== socketId);
    });

    isJoined.value = true;
    error.value = '';
  } catch (err) {
    console.error('Error joining chat:', err);
    error.value = 'Failed to access microphone. Please check permissions.';
  }
};

const createPeerConnection = (socketId, userName, isInitiator) => {
  // Don't create duplicate connections
  if (peerConnectionsRef.value.has(socketId)) {
    return peerConnectionsRef.value.get(socketId);
  }

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });

  // Add local stream tracks
  if (localStreamRef.value) {
    localStreamRef.value.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.value);
    });
  }

  // Handle remote stream
  pc.ontrack = (event) => {
    const [remoteStream] = event.streams;
    const audio = document.createElement('audio');
    audio.srcObject = remoteStream;
    audio.autoplay = true;
    
    // Set initial volume based on distance
    const user = users.value.find(u => u.socketId === socketId);
    if (user && user.distance !== undefined) {
      if (user.inRange) {
        let volume;
        if (user.distance <= innerRange.value) {
          // Full volume in inner zone
          volume = 1.0;
        } else {
          // More gradual fade from innerRange to outerRange
          // Using exponential curve for more natural fade
          const fadeRange = outerRange.value - innerRange.value;
          const distanceInFadeZone = user.distance - innerRange.value;
          const fadeRatio = distanceInFadeZone / fadeRange; // 0 to 1
          
          // Exponential curve: starts at 1.0, ends at 0.05 (barely audible)
          // Using power curve for smoother fade
          volume = Math.max(0.05, 1.0 * Math.pow(1.0 - fadeRatio, 2.5));
        }
        audio.volume = volume;
      } else {
        audio.volume = 0;
      }
    }
    
    audioRefsRef.value.set(socketId, audio);
    document.body.appendChild(audio);
    
    // Set up audio level detection
    setupAudioLevelDetection(socketId, remoteStream);
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log(`Connection state for ${userName}: ${pc.connectionState}`);
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      // Optionally try to reconnect or clean up
    }
  };

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate && socketRef.value) {
      socketRef.value.emit('ice-candidate', {
        candidate: event.candidate,
        targetSocketId: socketId
      });
    }
  };

  peerConnectionsRef.value.set(socketId, pc);

  // Create offer if initiator
  if (isInitiator) {
    // Small delay to ensure connection is ready
    setTimeout(() => {
      if (pc.signalingState === 'stable') {
        pc.createOffer()
          .then(offer => {
            return pc.setLocalDescription(offer);
          })
          .then(() => {
            if (socketRef.value) {
              socketRef.value.emit('offer', {
                offer: pc.localDescription,
                targetSocketId: socketId
              });
            }
          })
          .catch(err => console.error('Error creating offer:', err));
      }
    }, 100);
  }

  return pc;
};

const handleLeave = () => {
  if (animationFrameRef.value) {
    cancelAnimationFrame(animationFrameRef.value);
  }
  
  if (socketRef.value) {
    socketRef.value.disconnect();
    socketRef.value = null;
  }
  if (localStreamRef.value) {
    localStreamRef.value.getTracks().forEach(track => track.stop());
    localStreamRef.value = null;
  }
  if (localAudioContextRef.value) {
    localAudioContextRef.value.close();
    localAudioContextRef.value = null;
    localAnalyserRef.value = null;
  }
  peerConnectionsRef.value.forEach(pc => pc.close());
  peerConnectionsRef.value.clear();
  audioRefsRef.value.forEach(audio => audio.remove());
  audioRefsRef.value.clear();
  audioAnalysersRef.value.forEach(({ audioContext }) => {
    audioContext.close();
  });
  audioAnalysersRef.value.clear();
  users.value = [];
  isJoined.value = false;
  isLocalTalking.value = false;
  name.value = '';
};

// Set up audio level detection for remote users
const setupAudioLevelDetection = (socketId, stream) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8; // Higher smoothing for more stable detection
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    audioAnalysersRef.value.set(socketId, { analyser, audioContext });
    
    console.log(`Audio level detection set up for user: ${socketId}`);
    
    // Start monitoring audio levels
    monitorAudioLevel(socketId);
  } catch (err) {
    console.error('Error setting up audio level detection:', err);
  }
};

// Monitor audio level for a specific user
const monitorAudioLevel = (socketId) => {
  const analyserData = audioAnalysersRef.value.get(socketId);
  if (!analyserData) return;
  
  const { analyser } = analyserData;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  // Use time domain data for better volume detection
  analyser.getByteTimeDomainData(dataArray);
  
  // Calculate RMS (Root Mean Square) for volume
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const volume = rms * 100; // Convert to 0-100 scale
  
  const threshold = 5; // Lower threshold for better sensitivity
  
  // Update user's talking state
  const user = users.value.find(u => u.socketId === socketId);
  if (user) {
    user.isTalking = volume > threshold;
    // Debug logging (can be removed later)
    if (user.isTalking) {
      console.log(`${user.name} is talking (volume: ${volume.toFixed(2)})`);
    }
  }
  
  // Continue monitoring
  if (audioAnalysersRef.value.has(socketId)) {
    setTimeout(() => monitorAudioLevel(socketId), 100);
  }
};

// Monitor local audio level
const monitorLocalAudioLevel = () => {
  if (!localAnalyserRef.value || !isJoined.value) return;
  
  const dataArray = new Uint8Array(localAnalyserRef.value.frequencyBinCount);
  // Use time domain data for better volume detection
  localAnalyserRef.value.getByteTimeDomainData(dataArray);
  
  // Calculate RMS (Root Mean Square) for volume
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const volume = rms * 100; // Convert to 0-100 scale
  
  const threshold = 5; // Lower threshold for better sensitivity
  
  isLocalTalking.value = volume > threshold && !isMuted.value;
  
  // Debug logging (can be removed later)
  if (isLocalTalking.value) {
    console.log(`You are talking (volume: ${volume.toFixed(2)})`);
  }
  
  // Continue monitoring
  if (isJoined.value) {
    requestAnimationFrame(monitorLocalAudioLevel);
  }
};

const toggleMute = () => {
  if (localStreamRef.value) {
    localStreamRef.value.getAudioTracks().forEach(track => {
      track.enabled = isMuted.value;
    });
    isMuted.value = !isMuted.value;
    if (isMuted.value) {
      isLocalTalking.value = false;
    }
    
    // Send mute status to server
    if (socketRef.value) {
      socketRef.value.emit('mute-status', { isMuted: isMuted.value });
    }
  }
};
</script>

<style scoped>
.join-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100vh;
  padding: 20px;
}

.join-card {
  background: rgba(30, 30, 50, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px;
  border: 1px solid rgba(100, 100, 150, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(100, 100, 200, 0.1);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.join-card h1 {
  color: #6495ed;
  margin-bottom: 8px;
  font-size: 2rem;
}

.subtitle {
  color: rgba(224, 224, 224, 0.7);
  margin-bottom: 32px;
  font-size: 0.95rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.name-input {
  padding: 14px 18px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  border-radius: 12px;
  font-size: 1rem;
  background: rgba(20, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  color: #e0e0e0;
}

.name-input::placeholder {
  color: rgba(224, 224, 224, 0.5);
}

.name-input:focus {
  outline: none;
  border-color: rgba(100, 150, 255, 0.5);
  background: rgba(30, 30, 50, 0.8);
  box-shadow: 0 0 0 4px rgba(100, 150, 255, 0.1);
}

.join-button {
  padding: 14px 24px;
  background: rgba(100, 150, 255, 0.8);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(100, 150, 255, 0.3);
}

.join-button:hover {
  background: rgba(120, 170, 255, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(100, 150, 255, 0.4);
}

.join-button:active {
  transform: translateY(0);
}

.error {
  color: #ff3b30;
  margin-top: 12px;
  font-size: 0.9rem;
}

.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  gap: 20px;
  padding: 20px;
  background: #0f0f1e;
}

.chat-container {
  background: rgba(30, 30, 50, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(100, 100, 150, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(100, 100, 200, 0.1);
  width: 400px;
  min-width: 350px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-container {
  flex: 1;
  background: rgba(30, 30, 50, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(100, 100, 150, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(100, 100, 200, 0.1);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(20, 20, 40, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.zoom-button {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  border-radius: 8px;
  background: rgba(100, 150, 255, 0.2);
  color: #e0e0e0;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-button:hover:not(:disabled) {
  background: rgba(100, 150, 255, 0.4);
  border-color: rgba(100, 150, 255, 0.5);
}

.zoom-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-level {
  color: #e0e0e0;
  font-size: 0.9rem;
  min-width: 50px;
  text-align: center;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
}

.game-map {
  display: block;
  cursor: crosshair;
  outline: none;
  transform-origin: 0 0;
  transition: transform 0.1s ease;
}

.map-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.map-info {
  background: rgba(20, 20, 40, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #e0e0e0;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  font-size: 0.85rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.map-info p {
  margin: 0;
}

.chat-header {
  background: rgba(40, 40, 70, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #e0e0e0;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(100, 100, 150, 0.2);
}

.chat-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.user-name {
  margin: 4px 0 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.header-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mute-button,
.leave-button {
  padding: 10px 20px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  background: rgba(40, 40, 70, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #e0e0e0;
}

.mute-button {
  font-size: 1.2rem;
  padding: 10px 16px;
}

.mute-button:hover {
  background: rgba(60, 60, 90, 0.8);
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.2);
}

.mute-button.muted {
  background: rgba(255, 59, 48, 0.2);
  border-color: rgba(255, 59, 48, 0.4);
  color: #ff6b6b;
}

.leave-button:hover {
  background: rgba(60, 60, 90, 0.8);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.2);
}

.users-list {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.users-list h3 {
  color: #e0e0e0;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.admin-controls {
  margin-top: 16px;
  background: rgba(100, 150, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(100, 150, 255, 0.2);
}

.admin-controls summary {
  padding: 12px;
  color: #6495ed;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  user-select: none;
  transition: all 0.2s ease;
}

.admin-controls summary::-webkit-details-marker {
  display: none;
}

.admin-controls summary::before {
  content: '▶';
  display: inline-block;
  margin-right: 8px;
  transition: transform 0.2s ease;
  font-size: 0.8rem;
}

.admin-controls[open] summary::before {
  transform: rotate(90deg);
}

.admin-controls summary:hover {
  color: #7ba3f0;
  background: rgba(100, 150, 255, 0.15);
  border-radius: 8px;
}

.admin-controls-content {
  padding: 12px;
  padding-top: 0;
}

.background-controls {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(100, 150, 255, 0.2);
}

.background-controls h5 {
  margin: 0 0 12px 0;
  color: #6495ed;
  font-size: 0.85rem;
  font-weight: 600;
}

.canvas-size-controls {
  margin-top: 16px;
  padding: 12px;
  background: rgba(100, 150, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(100, 150, 255, 0.15);
}

.canvas-size-controls h5 {
  margin: 0 0 12px 0;
  color: #6495ed;
  font-size: 0.85rem;
  font-weight: 600;
}

.color-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker {
  width: 50px;
  height: 36px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  padding: 2px;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

.color-text-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  border-radius: 8px;
  background: rgba(20, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #e0e0e0;
  font-size: 0.85rem;
  font-family: monospace;
}

.color-text-input:focus {
  outline: none;
  border-color: rgba(100, 150, 255, 0.5);
  box-shadow: 0 0 0 2px rgba(100, 150, 255, 0.1);
}

.image-upload-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.file-input {
  display: none;
}

.file-input-label {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  border-radius: 8px;
  background: rgba(40, 40, 70, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #e0e0e0;
  font-size: 0.85rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-input-label:hover {
  background: rgba(60, 60, 90, 0.8);
  border-color: rgba(100, 150, 255, 0.5);
}

.image-url-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(100, 100, 150, 0.3);
  border-radius: 8px;
  background: rgba(20, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #e0e0e0;
  font-size: 0.85rem;
}

.url-input:focus {
  outline: none;
  border-color: rgba(100, 150, 255, 0.5);
  box-shadow: 0 0 0 2px rgba(100, 150, 255, 0.1);
}

.url-input::placeholder {
  color: rgba(224, 224, 224, 0.5);
}

.image-error {
  margin-top: 6px;
  color: #ff6b6b;
  font-size: 0.75rem;
  font-style: italic;
}

.file-input {
  padding: 8px 16px;
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 8px;
  background: rgba(255, 59, 48, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #ff6b6b;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-image-button:hover {
  background: rgba(255, 59, 48, 0.25);
  border-color: rgba(255, 59, 48, 0.5);
}

.image-preview {
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(100, 100, 150, 0.3);
  max-height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(20, 20, 40, 0.6);
}

.image-preview img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  display: block;
}

.range-control {
  margin-bottom: 12px;
}

.range-control:last-child {
  margin-bottom: 0;
}

.range-control label {
  display: block;
  color: #e0e0e0;
  font-size: 0.85rem;
  margin-bottom: 6px;
  font-weight: 500;
}

.range-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(100, 100, 150, 0.3);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #6495ed;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.range-slider::-webkit-slider-thumb:hover {
  background: #7aa5ff;
  transform: scale(1.1);
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #6495ed;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.range-slider::-moz-range-thumb:hover {
  background: #7aa5ff;
  transform: scale(1.1);
}

.proximity-info {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(40, 40, 70, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(100, 100, 150, 0.2);
}

.proximity-info p {
  margin: 4px 0;
  color: rgba(224, 224, 224, 0.8);
  font-size: 0.9rem;
}


.controls-hint {
  font-size: 0.8rem !important;
  color: rgba(224, 224, 224, 0.5) !important;
  font-style: italic;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(30, 30, 50, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(100, 100, 150, 0.2);
  transition: all 0.2s ease;
}

.user-item:hover {
  background: rgba(40, 40, 70, 0.7);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.15);
}

.user-item.you {
  background: rgba(100, 150, 255, 0.15);
  border-left: 3px solid #6495ed;
}

.user-item.in-range {
  background: rgba(52, 199, 89, 0.15);
  border-left: 3px solid #4ade80;
}

.user-item.outer-range {
  background: rgba(255, 204, 0, 0.15);
  border-left: 3px solid #fbbf24;
}

.user-item.out-of-range {
  opacity: 0.5;
}

.user-item.talking {
  background: rgba(255, 204, 0, 0.2);
  border-left: 3px solid #fbbf24;
  animation: talking-pulse 1s ease-in-out infinite;
}

@keyframes talking-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0);
  }
}

.talking-indicator {
  color: #fbbf24;
  font-size: 1rem;
  animation: talking-bounce 0.5s ease-in-out infinite;
}

@keyframes talking-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.user-icon {
  font-size: 1.5rem;
}

.user-name-text {
  flex: 1;
  color: #e0e0e0;
  font-weight: 500;
}

.status-indicator {
  color: #4ade80;
  font-size: 0.8rem;
}

.out-of-range-indicator {
  color: rgba(224, 224, 224, 0.6);
  font-size: 0.8rem;
}

.outer-range-indicator {
  color: #fbbf24;
  font-size: 0.8rem;
}

.distance-text {
  color: rgba(224, 224, 224, 0.7);
  font-size: 0.85rem;
  font-weight: 500;
}

.muted-indicator {
  color: #ff6b6b;
  font-size: 1rem;
}

.admin-badge {
  background: rgba(255, 204, 0, 0.2);
  color: #fbbf24;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Scrollbar styling */
.users-list::-webkit-scrollbar {
  width: 8px;
}

.users-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.users-list::-webkit-scrollbar-thumb {
  background: rgba(100, 100, 150, 0.4);
  border-radius: 4px;
}

.users-list::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 150, 255, 0.6);
}
</style>
