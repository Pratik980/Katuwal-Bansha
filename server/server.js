
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { rateLimit } from './middlewares/rateLimit.js';

// Import routes
import memberRoutes from './routes/memberRoutes.js';
import familyRoutes from './routes/familyRoutes.js';

import notificationRoutes from './routes/notificationRoutes.js';

import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import houseRoutes from './routes/houseRoutes.js';

dotenv.config();

// Try to import logger, fallback to console if not available
let logger;
try {
  logger = (await import('./middlewares/logger.js')).logger;
} catch (error) {
  console.warn('Logger middleware not found, using default console logger');
  logger = {
    dev: (req, res, next) => {
      console.log(`${req.method} ${req.url}`);
      next();
    },
    combined: (req, res, next) => {
      console.log(`${req.method} ${req.url} - ${res.statusCode}`);
      next();
    }
  };
}

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  if (origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(compression());
app.use(cors(corsOptions));

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(logger.combined);
} else {
  app.use(logger.dev);
}

// Behind a hosting proxy every visitor would otherwise look like one address.
// Set TRUST_PROXY=1 on such a host so each visitor is counted separately.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// Rate limiting: one page of this app makes several requests, and a day of data
// entry makes thousands, so the limit only has to stop runaway loops and abuse.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 3000,
}));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Routes
app.use('/api/members', memberRoutes);
app.use('/api/families', familyRoutes);

app.use('/api/notifications', notificationRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/houses', houseRoutes);


// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Error handling
app.use(errorHandler);

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join chat rooms
  socket.on('joinChatRoom', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined chat room: ${room}`);
  });
  
  socket.on('leaveChatRoom', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left chat room: ${room}`);
  });
  
  socket.on('join', (data) => {
    socket.join(data.room);
    console.log(`Socket ${socket.id} joined room ${data.room}`);
  });
  
  socket.on('leave', (data) => {
    socket.leave(data.room);
    console.log(`Socket ${socket.id} left room ${data.room}`);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Export io for use in controllers
export { io };

// Start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API URL: http://localhost:${PORT}/api`);
      // console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'https://katuwalbanshabatika.netlify.app'}`)
      
      console.log(`📁 Upload limit: 15MB`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});