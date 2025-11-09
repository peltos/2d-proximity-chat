import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

// Allow multiple origins for CORS
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:5173', 'https://peltos.github.io'];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Store connected users with positions
const users = new Map();

// Track admin (first user to join)
let adminSocketId = null;

// Store current range values (defaults)
let innerRange = 100;
let outerRange = 200;

// Store current canvas dimensions (defaults)
let canvasWidth = 1920;
let canvasHeight = 1080;

// Store current background colors (defaults)
let bodyBackgroundColor = '#1a1a2e';
let canvasBackgroundColor = '#2c3e50';
let canvasBackgroundImage = null; // Image URL string
let imageScale = 1.0; // Image scale multiplier

// Calculate distance between two 2D points (Euclidean distance)
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining with name
  socket.on('join', ({ name }) => {
    // Check if this is the first user (admin)
    const isAdmin = users.size === 0;
    if (isAdmin) {
      adminSocketId = socket.id;
      console.log(`${name} (${socket.id}) is now the admin`);
    }
    
    // Generate random starting position (x, y coordinates)
    const x = Math.random() * canvasWidth; // 0 to canvas width
    const y = Math.random() * canvasHeight; // 0 to canvas height
    
    users.set(socket.id, { 
      name, 
      socketId: socket.id,
      position: { x, y },
      isAdmin,
      isMuted: false
    });
    socket.data.name = name;
    socket.data.position = { x, y };
    socket.data.isAdmin = isAdmin;
    socket.data.isMuted = false;
    
    // Send initial position to the user
    socket.emit('initial-position', { x, y });
    
    // Send current range values and admin status
    socket.emit('range-config', {
      innerRange,
      outerRange,
      isAdmin
    });
    
    // Send current canvas dimensions
    socket.emit('canvas-config', {
      canvasWidth,
      canvasHeight
    });
    
    // Send current background colors
    socket.emit('background-config', {
      bodyBackgroundColor,
      canvasBackgroundColor,
      canvasBackgroundImage,
      imageScale
    });
    
    // Notify the user of all existing users with positions
    const existingUsers = Array.from(users.values())
      .filter(user => user.socketId !== socket.id)
      .map(user => ({ 
        socketId: user.socketId, 
        name: user.name,
        position: user.position,
        isAdmin: user.isAdmin,
        isMuted: user.isMuted
      }));
    
    socket.emit('existing-users', existingUsers);
    
    // Notify others about the new user
    socket.broadcast.emit('user-joined', {
      socketId: socket.id,
      name: name,
      position: { x, y },
      isAdmin: isAdmin,
      isMuted: false
    });
    
    console.log(`${name} (${socket.id}) joined the chat at [${x}, ${y}]`);
  });

  // Handle canvas dimension updates from admin
  socket.on('update-canvas-size', ({ canvasWidth: newWidth, canvasHeight: newHeight }) => {
    // Only allow admin to update canvas size
    if (socket.id !== adminSocketId) {
      console.log(`Non-admin ${socket.id} attempted to update canvas size`);
      return;
    }
    
    // Validate dimensions
    if (newWidth >= 800 && newWidth <= 5000 && newHeight >= 600 && newHeight <= 5000) {
      canvasWidth = newWidth;
      canvasHeight = newHeight;
      
      // Broadcast to all clients
      io.emit('canvas-size-updated', {
        canvasWidth,
        canvasHeight
      });
      
      console.log(`Admin updated canvas size: ${canvasWidth}x${canvasHeight}`);
    }
  });

  // Handle range updates from admin
  socket.on('update-ranges', ({ innerRange: newInnerRange, outerRange: newOuterRange }) => {
    // Only allow admin to update ranges
    if (socket.id !== adminSocketId) {
      console.log(`Non-admin ${socket.id} attempted to update ranges`);
      return;
    }
    
    // Validate ranges
    if (newInnerRange > 0 && newOuterRange > newInnerRange && newOuterRange <= 1000) {
      innerRange = newInnerRange;
      outerRange = newOuterRange;
      
      // Broadcast to all clients
      io.emit('range-updated', {
        innerRange,
        outerRange
      });
      
      console.log(`Admin updated ranges: Inner=${innerRange}px, Outer=${outerRange}px`);
    }
  });

  // Handle background updates from admin
  socket.on('update-background', ({ bodyBackgroundColor: newBodyBg, canvasBackgroundColor: newCanvasBg, canvasBackgroundImage: newCanvasImg }) => {
    // Only allow admin to update background
    if (socket.id !== adminSocketId) {
      console.log(`Non-admin ${socket.id} attempted to update background`);
      return;
    }
    
    // Validate colors (basic hex color validation)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (newBodyBg && hexColorRegex.test(newBodyBg)) {
      bodyBackgroundColor = newBodyBg;
    }
    if (newCanvasBg && hexColorRegex.test(newCanvasBg)) {
      canvasBackgroundColor = newCanvasBg;
    }
    
    // Update image if provided
    if (newCanvasImg !== undefined) {
      canvasBackgroundImage = newCanvasImg; // Can be null to remove image
    }
    
    // Broadcast to all clients
    io.emit('background-updated', {
      bodyBackgroundColor,
      canvasBackgroundColor,
      canvasBackgroundImage,
      imageScale
    });
    
    console.log(`Admin updated backgrounds: Body=${bodyBackgroundColor}, Canvas=${canvasBackgroundColor}, Image=${canvasBackgroundImage ? 'set' : 'none'}`);
  });

  // Handle image scale updates from admin
  socket.on('update-image-scale', ({ imageScale: newScale }) => {
    // Only allow admin to update image scale
    if (socket.id !== adminSocketId) {
      console.log(`Non-admin ${socket.id} attempted to update image scale`);
      return;
    }
    
    // Validate scale
    if (newScale >= 0.1 && newScale <= 5) {
      imageScale = newScale;
      
      // Broadcast to all clients
      io.emit('image-scale-updated', {
        imageScale
      });
      
      console.log(`Admin updated image scale: ${imageScale}`);
    }
  });

  // Handle mute status updates
  socket.on('mute-status', ({ isMuted }) => {
    const user = users.get(socket.id);
    if (user) {
      user.isMuted = isMuted;
      socket.data.isMuted = isMuted;
      
      // Broadcast mute status to all other users
      socket.broadcast.emit('user-mute-updated', {
        socketId: socket.id,
        isMuted
      });
    }
  });

  // Handle position updates
  socket.on('position-update', ({ x, y }) => {
    const user = users.get(socket.id);
    if (user) {
      user.position = { x, y };
      socket.data.position = { x, y };
      
      // Broadcast position update to all other users
      socket.broadcast.emit('user-position-updated', {
        socketId: socket.id,
        position: { x, y }
      });
    }
  });

  // Handle WebRTC signaling - offer
  socket.on('offer', ({ offer, targetSocketId }) => {
    socket.to(targetSocketId).emit('offer', {
      offer,
      senderSocketId: socket.id,
      senderName: socket.data.name
    });
  });

  // Handle WebRTC signaling - answer
  socket.on('answer', ({ answer, targetSocketId }) => {
    socket.to(targetSocketId).emit('answer', {
      answer,
      senderSocketId: socket.id
    });
  });

  // Handle ICE candidate exchange
  socket.on('ice-candidate', ({ candidate, targetSocketId }) => {
    socket.to(targetSocketId).emit('ice-candidate', {
      candidate,
      senderSocketId: socket.id
    });
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`${user.name} (${socket.id}) left the chat`);
      users.delete(socket.id);
      
      // If admin left, assign new admin (first remaining user)
      if (socket.id === adminSocketId && users.size > 0) {
        const newAdmin = Array.from(users.values())[0];
        adminSocketId = newAdmin.socketId;
        users.get(adminSocketId).isAdmin = true;
        
        // Notify new admin
        io.to(adminSocketId).emit('range-config', {
          innerRange,
          outerRange,
          isAdmin: true
        });
        
        // Broadcast admin change to all clients
        io.emit('admin-changed', {
          newAdminSocketId: adminSocketId,
          newAdminName: newAdmin.name
        });
        
        console.log(`${newAdmin.name} (${adminSocketId}) is now the admin`);
      } else if (users.size === 0) {
        adminSocketId = null;
      }
      
      socket.broadcast.emit('user-left', { socketId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

