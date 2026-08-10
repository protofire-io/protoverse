const express = require('express');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
// const helmet = require('helmet');
const xssClean = require('xss-clean');
const expressRateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const imageService = require('../services/imageService');

const configureMiddleware = (app) => {
  // Body-parser middleware
  app.use(express.json());

  // Cookie Parser
  app.use(cookieParser());

  // MongoDB data sanitizer
  app.use(mongoSanitize());

  // Helmet improves API security by setting some additional header checks
  // app.use(helmet());

  app.use(xssClean());

  // Enable CORS early so static image URLs work cross-origin
  app.use(cors());

  // Serve uploaded images without hitting the API rate limiter
  imageService.ensureDirs();
  app.use(
    '/uploads',
    express.static(imageService.UPLOAD_ROOT, {
      fallthrough: true,
      maxAge: '7d',
      index: false,
    }),
  );

  // Add rate limit to API (100 requests per 10 mins), skip static/image GETs
  app.use(
    expressRateLimit({
      windowMs: 10 * 60 * 1000,
      max: 100,
      skip: (req) =>
        req.method === 'GET' &&
        (req.path.startsWith('/uploads/') || req.path.startsWith('/api/images/')),
    }),
  );

  // Prevent http param pollution
  app.use(hpp());
};

module.exports = configureMiddleware;
