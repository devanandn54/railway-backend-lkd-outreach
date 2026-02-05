// server.js - Railway Backend for LinkedIn Connection Finder

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'chrome-extension://*',
    'https://*.chromium.org',
    'http://localhost:*'
  ]
}));

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
    version: '1.0.0'
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
      console.error('Groq API error:', errorData);
      return res.status(groqResponse.status).json({ 
        error: 'AI service unavailable. Please try again.' 
      });
    }

    const data = await groqResponse.json();
    const content = data.choices[0]?.message?.content || '';

    res.json({ 
      success: true, 
      content: content,
      usage: data.usage // Track token usage for monitoring
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again.' 
    });
  }
});

// Analytics endpoint (optional - track usage)
app.post('/api/stats', async (req, res) => {
  try {
    const { event, version, persona } = req.body;
    
    // Log to console (you can add database later)
    console.log('Analytics:', { 
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
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});