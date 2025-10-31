const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/business_dashboard';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import Routes with guards (handle default exports/mis-exports)
const loadRouter = (path, name) => {
  const mod = require(path);
  const candidate = typeof mod === 'function'
    ? mod
    : (mod && typeof mod.default === 'function' ? mod.default : null);
  if (!candidate) {
    console.error(`Invalid router export for ${name}. typeof export=`, typeof mod, 'keys=', mod && Object.keys(mod));
    throw new TypeError(`${name} router must export a function (Express router).`);
  }
  return candidate;
};

const authRoutes = loadRouter('./api/routes/auth', 'auth');
const orderRoutes = loadRouter('./api/routes/orders', 'orders');
const summaryRoutes = loadRouter('./api/routes/summary', 'summary');
const userRoutes = loadRouter('./api/routes/users', 'users');

// Routes
app.get('/test', (res,req)=>{
  return res.json({message: 'Hello World'});
});
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
