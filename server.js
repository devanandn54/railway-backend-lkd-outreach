// // server.js - Railway Backend for LinkedIn Connection Finder

// const express = require('express');
// const cors = require('cors');
// const rateLimit = require('express-rate-limit');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(express.json());
// app.use(cors({
//   origin: [
//     'chrome-extension://*',
//     'https://*.chromium.org',
//     'http://localhost:*'
//   ]
// }));

// // Rate limiting: 100 requests per hour per IP
// const limiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 100,
//   message: { error: 'Too many requests. Try again in an hour.' },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', limiter);

// // Health check
// app.get('/', (req, res) => {
//   res.json({ 
//     status: 'ok', 
//     service: 'LinkedIn Connection Finder API',
//     version: '1.0.0'
//   });
// });

// // Main API endpoint - proxy to Groq
// app.post('/api/analyze', async (req, res) => {
//   try {
//     const { prompt, max_tokens = 1000 } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: 'Prompt is required' });
//     }

//     if (prompt.length > 10000) {
//       return res.status(400).json({ error: 'Prompt too long' });
//     }

//     // Call Groq API with YOUR secret key
//     const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
//       },
//       body: JSON.stringify({
//         model: 'llama-3.3-70b-versatile',
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0.7,
//         max_tokens: max_tokens
//       })
//     });

//     if (!groqResponse.ok) {
//       const errorData = await groqResponse.text();
//       console.error('Groq API error:', errorData);
//       return res.status(groqResponse.status).json({ 
//         error: 'AI service unavailable. Please try again.' 
//       });
//     }

//     const data = await groqResponse.json();
//     const content = data.choices[0]?.message?.content || '';

//     res.json({ 
//       success: true, 
//       content: content,
//       usage: data.usage // Track token usage for monitoring
//     });

//   } catch (error) {
//     console.error('Server error:', error);
//     res.status(500).json({ 
//       error: 'Internal server error. Please try again.' 
//     });
//   }
// });

// // Analytics endpoint (optional - track usage)
// app.post('/api/stats', async (req, res) => {
//   try {
//     const { event, version, persona } = req.body;
    
//     // Log to console (you can add database later)
//     console.log('Analytics:', { 
//       event, 
//       version, 
//       persona,
//       timestamp: new Date().toISOString(),
//       ip: req.ip
//     });

//     res.json({ success: true });
//   } catch (error) {
//     console.error('Stats error:', error);
//     res.json({ success: false });
//   }
// });

// // Error handling
// app.use((err, req, res, next) => {
//   console.error('Unhandled error:', err);
//   res.status(500).json({ error: 'Something went wrong' });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
// });




// server.js - Railway Backend for LinkedIn Connection Finder
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// ✅ FIXED CORS CONFIGURATION
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Allow Chrome extensions (they have chrome-extension:// protocol)
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // Allow localhost for testing
    if (origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow all origins (you can restrict this later if needed)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// OR USE THIS SIMPLER VERSION (allows everything):
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'OPTIONS']
// }));

// Rate limiting: 100 requests per hour per IP
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { error: 'Too many requests. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'LinkedIn Connection Finder API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ✅ ADDED: Explicit health endpoint for extension to test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    groqConfigured: !!process.env.GROQ_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Main API endpoint - proxy to Groq
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, max_tokens = 1000 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt too long' });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY not set!');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('📥 Received analyze request. Prompt length:', prompt.length);

    // Call Groq API with YOUR secret key
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: max_tokens
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('❌ Groq API error:', errorData);
      return res.status(groqResponse.status).json({ 
        error: 'AI service unavailable. Please try again.' 
      });
    }

    const data = await groqResponse.json();
    const content = data.choices[0]?.message?.content || '';

    console.log('✅ Successfully generated response. Length:', content.length);

    res.json({ 
      success: true, 
      content: content,
      usage: data.usage // Track token usage for monitoring
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again.',
      message: error.message
    });
  }
});

// Analytics endpoint (optional - track usage)
app.post('/api/stats', async (req, res) => {
  try {
    const { event, version, persona } = req.body;
    
    // Log to console (you can add database later)
    console.log('📊 Analytics:', { 
      event, 
      version, 
      persona,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Stats error:', error);
    res.json({ success: false });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 GROQ_API_KEY configured: ${!!process.env.GROQ_API_KEY}`);
  if (!process.env.GROQ_API_KEY) {
    console.error('⚠️  WARNING: GROQ_API_KEY is not set!');
  }
});