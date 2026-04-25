require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const { MongoStore } = require('connect-mongo');
const cors       = require('cors');
const http       = require('http');
const path       = require('path');
const connectDB  = require('./src/config/db');
const initSocket = require('./src/config/socket');
const landRoutes = require('./src/routes/landRoutes');

const authRoutes = require('./src/routes/authRoutes');

const app    = express();
const server = http.createServer(app);
const io     = initSocket(server);
app.set('io', io);

connectDB();

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax'
  }
}));
app.use('/api/lands', landRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Land Auction API running' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on our end' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});