// // // server.js - Railway Backend for LinkedIn Connection Finder

// // const express = require('express');
// // const cors = require('cors');
// // const rateLimit = require('express-rate-limit');
// // require('dotenv').config();

// // const app = express();
// // const PORT = process.env.PORT || 3000;

// // // Middleware
// // app.use(express.json());
// // app.use(cors({
// //   origin: [
// //     'chrome-extension://*',
// //     'https://*.chromium.org',
// //     'http://localhost:*'
// //   ]
// // }));

// // // Rate limiting: 100 requests per hour per IP
// // const limiter = rateLimit({
// //   windowMs: 60 * 60 * 1000, // 1 hour
// //   max: 100,
// //   message: { error: 'Too many requests. Try again in an hour.' },
// //   standardHeaders: true,
// //   legacyHeaders: false,
// // });

// // app.use('/api/', limiter);

// // // Health check
// // app.get('/', (req, res) => {
// //   res.json({ 
// //     status: 'ok', 
// //     service: 'LinkedIn Connection Finder API',
// //     version: '1.0.0'
// //   });
// // });

// // // Main API endpoint - proxy to Groq
// // app.post('/api/analyze', async (req, res) => {
// //   try {
// //     const { prompt, max_tokens = 1000 } = req.body;

// //     if (!prompt) {
// //       return res.status(400).json({ error: 'Prompt is required' });
// //     }

// //     if (prompt.length > 10000) {
// //       return res.status(400).json({ error: 'Prompt too long' });
// //     }

// //     // Call Groq API with YOUR secret key
// //     const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //         'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
// //       },
// //       body: JSON.stringify({
// //         model: 'llama-3.3-70b-versatile',
// //         messages: [{ role: 'user', content: prompt }],
// //         temperature: 0.7,
// //         max_tokens: max_tokens
// //       })
// //     });

// //     if (!groqResponse.ok) {
// //       const errorData = await groqResponse.text();
// //       console.error('Groq API error:', errorData);
// //       return res.status(groqResponse.status).json({ 
// //         error: 'AI service unavailable. Please try again.' 
// //       });
// //     }

// //     const data = await groqResponse.json();
// //     const content = data.choices[0]?.message?.content || '';

// //     res.json({ 
// //       success: true, 
// //       content: content,
// //       usage: data.usage // Track token usage for monitoring
// //     });

// //   } catch (error) {
// //     console.error('Server error:', error);
// //     res.status(500).json({ 
// //       error: 'Internal server error. Please try again.' 
// //     });
// //   }
// // });

// // // Analytics endpoint (optional - track usage)
// // app.post('/api/stats', async (req, res) => {
// //   try {
// //     const { event, version, persona } = req.body;
    
// //     // Log to console (you can add database later)
// //     console.log('Analytics:', { 
// //       event, 
// //       version, 
// //       persona,
// //       timestamp: new Date().toISOString(),
// //       ip: req.ip
// //     });

// //     res.json({ success: true });
// //   } catch (error) {
// //     console.error('Stats error:', error);
// //     res.json({ success: false });
// //   }
// // });

// // // Error handling
// // app.use((err, req, res, next) => {
// //   console.error('Unhandled error:', err);
// //   res.status(500).json({ error: 'Something went wrong' });
// // });

// // // Start server
// // app.listen(PORT, () => {
// //   console.log(`🚀 Server running on port ${PORT}`);
// //   console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
// // });




// // server.js - Railway Backend for LinkedIn Connection Finder
// const express = require('express');
// const cors = require('cors');
// const rateLimit = require('express-rate-limit');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(express.json());

// // ✅ FIXED CORS CONFIGURATION
// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (mobile apps, curl, postman)
//     if (!origin) return callback(null, true);
    
//     // Allow Chrome extensions (they have chrome-extension:// protocol)
//     if (origin.startsWith('chrome-extension://')) {
//       return callback(null, true);
//     }
    
//     // Allow localhost for testing
//     if (origin.includes('localhost')) {
//       return callback(null, true);
//     }
    
//     // Allow all origins (you can restrict this later if needed)
//     return callback(null, true);
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
// }));

// // OR USE THIS SIMPLER VERSION (allows everything):
// // app.use(cors({
// //   origin: '*',
// //   methods: ['GET', 'POST', 'OPTIONS']
// // }));

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
//     version: '1.0.0',
//     timestamp: new Date().toISOString()
//   });
// });

// // ✅ ADDED: Explicit health endpoint for extension to test
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'ok',
//     groqConfigured: !!process.env.GROQ_API_KEY,
//     timestamp: new Date().toISOString()
//   });
// });

// // Main API endpoint - proxy to Groq
// app.post('/api/analyze', async (req, res) => {
//   try {
//     const { prompt, max_tokens = 1500 } = req.body;
    
//     if (!prompt) {
//       return res.status(400).json({ error: 'Prompt is required' });
//     }
    
//     if (prompt.length > 10000) {
//       return res.status(400).json({ error: 'Prompt too long' });
//     }

//     if (!process.env.GROQ_API_KEY) {
//       console.error('❌ GROQ_API_KEY not set!');
//       return res.status(500).json({ error: 'API key not configured' });
//     }

//     console.log('📥 Received analyze request. Prompt length:', prompt.length);

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
//         temperature: 0.3,
//         max_tokens: max_tokens
//       })
//     });

//     if (!groqResponse.ok) {
//       const errorData = await groqResponse.text();
//       console.error('❌ Groq API error:', errorData);
//       return res.status(groqResponse.status).json({ 
//         error: 'AI service unavailable. Please try again.' 
//       });
//     }

//     const data = await groqResponse.json();
//     const content = data.choices[0]?.message?.content || '';

//     console.log('✅ Successfully generated response. Length:', content.length);

//     res.json({ 
//       success: true, 
//       content: content,
//       usage: data.usage // Track token usage for monitoring
//     });

//   } catch (error) {
//     console.error('❌ Server error:', error);
//     res.status(500).json({ 
//       error: 'Internal server error. Please try again.',
//       message: error.message
//     });
//   }
// });

// // Analytics endpoint (optional - track usage)
// app.post('/api/stats', async (req, res) => {
//   try {
//     const { event, version, persona } = req.body;
    
//     // Log to console (you can add database later)
//     console.log('📊 Analytics:', { 
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
//   console.error('❌ Unhandled error:', err);
//   res.status(500).json({ error: 'Something went wrong' });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
//   console.log(`🔑 GROQ_API_KEY configured: ${!!process.env.GROQ_API_KEY}`);
//   if (!process.env.GROQ_API_KEY) {
//     console.error('⚠️  WARNING: GROQ_API_KEY is not set!');
//   }
// });

// server_claude.js - Production Server with Claude AI
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY; // Your Claude API key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// User storage (in-memory - use database in production)
const userUsage = new Map();

// Plans
const PLANS = {
  FREE: { name: 'Free', scrapesPerDay: 5, price: 0 },
  PREMIUM: { 
    name: 'Premium', 
    scrapesPerDay: 25, 
    price: 10,
    stripeProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID
  }
};

// Middleware
app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('chrome-extension://')) return callback(null, true);
    if (origin.includes('localhost')) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Extension-Id']
}));

const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Try again later.' }
});

app.use('/api/', globalLimiter);

// ====================================================================
// USER MANAGEMENT
// ====================================================================

function getUserId(req) {
  return req.headers['x-extension-id'] || req.ip;
}

function getUserUsage(userId) {
  if (!userUsage.has(userId)) {
    userUsage.set(userId, {
      scrapesUsed: 0,
      resetDate: getNextResetDate(),
      isPremium: false,
      premiumExpiry: null,
      scrapeTimes: []
    });
  }
  
  const usage = userUsage.get(userId);
  
  if (new Date() >= new Date(usage.resetDate)) {
    usage.scrapesUsed = 0;
    usage.resetDate = getNextResetDate();
    usage.scrapeTimes = [];
    userUsage.set(userId, usage);
  }
  
  if (usage.isPremium && usage.premiumExpiry && new Date() >= new Date(usage.premiumExpiry)) {
    usage.isPremium = false;
    usage.premiumExpiry = null;
    userUsage.set(userId, usage);
  }
  
  return usage;
}

function getNextResetDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

function canScrape(userId) {
  const usage = getUserUsage(userId);
  const limit = usage.isPremium ? PLANS.PREMIUM.scrapesPerDay : PLANS.FREE.scrapesPerDay;
  
  if (usage.scrapesUsed >= limit) {
    return {
      allowed: false,
      reason: 'Daily limit reached',
      scrapesUsed: usage.scrapesUsed,
      scrapesLimit: limit,
      resetDate: usage.resetDate,
      isPremium: usage.isPremium
    };
  }
  
  const now = Date.now();
  const recentScrapes = usage.scrapeTimes.filter(t => now - t < 30000);
  
  if (recentScrapes.length > 0) {
    return {
      allowed: false,
      reason: 'Rate limited: Wait 30 seconds between scrapes',
      scrapesUsed: usage.scrapesUsed,
      scrapesLimit: limit,
      waitSeconds: 30
    };
  }
  
  const last5Minutes = usage.scrapeTimes.filter(t => now - t < 300000);
  if (last5Minutes.length >= 3) {
    return {
      allowed: false,
      reason: 'Rate limited: Max 3 scrapes per 5 minutes',
      scrapesUsed: usage.scrapesUsed,
      scrapesLimit: limit,
      waitMinutes: 5
    };
  }
  
  return {
    allowed: true,
    scrapesUsed: usage.scrapesUsed,
    scrapesLimit: limit,
    scrapesRemaining: limit - usage.scrapesUsed - 1,
    resetDate: usage.resetDate,
    isPremium: usage.isPremium
  };
}

function recordScrape(userId) {
  const usage = getUserUsage(userId);
  usage.scrapesUsed += 1;
  usage.scrapeTimes.push(Date.now());
  
  if (usage.scrapeTimes.length > 10) {
    usage.scrapeTimes = usage.scrapeTimes.slice(-10);
  }
  
  userUsage.set(userId, usage);
  console.log(`📊 User ${userId}: ${usage.scrapesUsed}/${usage.isPremium ? PLANS.PREMIUM.scrapesPerDay : PLANS.FREE.scrapesPerDay} scrapes`);
}

// ====================================================================
// MCP CLIENT
// ====================================================================

class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.requestId = 0;
    this.lastRequestTime = 0;
  }

  async callTool(toolName, args) {
    // Anti-ban delay: 2-5 seconds
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 2000 + Math.random() * 3000;
    
    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      console.log(`⏳ Anti-ban delay: ${Math.round(waitTime/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestId++;
    
    const payload = {
      jsonrpc: "2.0",
      id: this.requestId,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: {
          ...args,
          _internal_use_stealth: true
        }
      }
    };

    console.log(`📡 MCP: ${toolName}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`MCP error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'MCP error');
      }

      return result.result || {};
    } catch (error) {
      console.error('❌ MCP Error:', error.message);
      throw error;
    }
  }
}

const mcp = new MCPClient(MCP_SERVER_URL);

// ====================================================================
// CLAUDE AI CLIENT
// ====================================================================

async function generateMessageWithClaude(myProfile, targetProfile, commonalities) {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  const prompt = buildPrompt(myProfile, targetProfile, commonalities);

  console.log('🤖 Calling Claude AI...');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // Latest Sonnet
        max_tokens: 300,
        temperature: 0.7,
        system: 'You are a professional LinkedIn connection message writer. Create personalized, concise connection requests under 300 characters that feel genuine and highlight real commonalities. Be professional but warm.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Claude API error:', error);
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    const message = data.content[0]?.text || '';

    console.log(`✅ Claude generated ${message.length} char message`);
    console.log(`💰 Usage: ${data.usage.input_tokens} in, ${data.usage.output_tokens} out tokens`);

    return message;

  } catch (error) {
    console.error('❌ Claude error:', error.message);
    throw new Error('AI message generation failed');
  }
}

function buildPrompt(myProfile, targetProfile, commonalities) {
  const myName = myProfile.name?.split(' ')[0] || 'I';
  const targetName = targetProfile.name?.split(' ')[0] || 'there';
  const myRole = myProfile.currentRole || myProfile.headline || 'professional';
  const targetRole = targetProfile.currentRole || targetProfile.headline || 'their role';

  let commonalitiesText = 'No strong commonalities found.';
  if (commonalities.length > 0) {
    commonalitiesText = commonalities.map(c => `- ${c.text}`).join('\n');
  }

  return `Write a LinkedIn connection request message under 300 characters.

MY PROFILE:
- Name: ${myName}
- Role: ${myRole}
- Location: ${myProfile.location || 'Not specified'}

TARGET PROFILE:
- Name: ${targetName}
- Role: ${targetRole}
- Company: ${targetProfile.company || 'Not specified'}
- Location: ${targetProfile.location || 'Not specified'}

COMMONALITIES:
${commonalitiesText}

REQUIREMENTS:
- MUST be under 300 characters (LinkedIn's strict limit)
- Mention ONE specific commonality if available
- Professional but warm and conversational tone
- No generic "I'd love to connect" phrases
- Clear reason for connecting
- Natural, not robotic

Write ONLY the message text, no subject or extra text:`;
}

// ====================================================================
// HEALTH & STATUS
// ====================================================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'LinkedIn Connection Finder',
    version: '2.0.0',
    ai: 'Claude 3.5 Sonnet',
    features: ['claude-ai', 'mcp-scraping', 'rate-limiting', 'premium'],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  let mcpStatus = 'unknown';
  try {
    const testResponse = await fetch(MCP_SERVER_URL.replace('/mcp', '/'), { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    mcpStatus = testResponse.ok ? 'healthy' : 'unhealthy';
  } catch {
    mcpStatus = 'unreachable';
  }

  res.json({ 
    status: 'ok',
    claudeConfigured: !!CLAUDE_API_KEY,
    mcpServer: mcpStatus,
    mcpUrl: MCP_SERVER_URL,
    stripeConfigured: !!STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/debug-mcp", async (req, res) => {
  try {
    const r = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
      })
    });

    const text = await r.text();

    res.json({
      ok: r.ok,
      status: r.status,
      body: text
    });
  } catch (e) {
    res.json({
      error: e.message,
      stack: e.stack
    });
  }
});


app.get('/api/user/status', (req, res) => {
  const userId = getUserId(req);
  const usage = getUserUsage(userId);
  const limit = usage.isPremium ? PLANS.PREMIUM.scrapesPerDay : PLANS.FREE.scrapesPerDay;
  
  res.json({
    success: true,
    data: {
      scrapesUsed: usage.scrapesUsed,
      scrapesLimit: limit,
      scrapesRemaining: limit - usage.scrapesUsed,
      resetDate: usage.resetDate,
      isPremium: usage.isPremium,
      plan: usage.isPremium ? 'Premium' : 'Free',
      premiumExpiry: usage.premiumExpiry
    }
  });
});

// ====================================================================
// SCRAPING ENDPOINTS
// ====================================================================

app.post('/api/scrape-profile', async (req, res) => {
  const userId = getUserId(req);
  const { url, skipRateLimit } = req.body;

  if (!url || !url.includes('linkedin.com/in/')) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid LinkedIn profile URL required' 
    });
  }

  if (!skipRateLimit) {
    const canScrapeResult = canScrape(userId);
    
    if (!canScrapeResult.allowed) {
      return res.status(429).json({
        success: false,
        error: canScrapeResult.reason,
        quota: {
          scrapesUsed: canScrapeResult.scrapesUsed,
          scrapesLimit: canScrapeResult.scrapesLimit,
          scrapesRemaining: canScrapeResult.scrapesLimit - canScrapeResult.scrapesUsed,
          resetDate: canScrapeResult.resetDate,
          isPremium: canScrapeResult.isPremium
        },
        upgradeAvailable: !canScrapeResult.isPremium
      });
    }
  }

  try {
    console.log(`🔍 Scraping: ${url}`);

    const profileData = await mcp.callTool('get_person_profile', {
      profile_url: url
    });

    if (!skipRateLimit) {
      recordScrape(userId);
    }

    const usage = getUserUsage(userId);
    const limit = usage.isPremium ? PLANS.PREMIUM.scrapesPerDay : PLANS.FREE.scrapesPerDay;

    console.log(`✅ Scraped: ${profileData.name || 'Unknown'}`);

    res.json({
      success: true,
      data: profileData,
      quota: {
        scrapesUsed: usage.scrapesUsed,
        scrapesLimit: limit,
        scrapesRemaining: limit - usage.scrapesUsed,
        resetDate: usage.resetDate,
        isPremium: usage.isPremium
      }
    });

  } catch (error) {
    console.error('❌ Scrape error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape profile'
    });
  }
});

app.post('/api/analyze-connection', async (req, res) => {
  const userId = getUserId(req);
  const { myProfile, targetUrl } = req.body;

  if (!myProfile || !targetUrl) {
    return res.status(400).json({ 
      success: false,
      error: 'Both myProfile and targetUrl required' 
    });
  }

  const canScrapeResult = canScrape(userId);
  
  if (!canScrapeResult.allowed) {
    return res.status(429).json({
      success: false,
      error: canScrapeResult.reason,
      quota: {
        scrapesUsed: canScrapeResult.scrapesUsed,
        scrapesLimit: canScrapeResult.scrapesLimit,
        scrapesRemaining: canScrapeResult.scrapesLimit - canScrapeResult.scrapesUsed,
        resetDate: canScrapeResult.resetDate,
        isPremium: canScrapeResult.isPremium
      },
      upgradeAvailable: !canScrapeResult.isPremium
    });
  }

  try {
    console.log(`🎯 Analyzing: ${targetUrl}`);

    // Step 1: Scrape profile
    const profileData = await mcp.callTool('get_person_profile', {
      profile_url: targetUrl
    });

    recordScrape(userId);

    // Step 2: Find commonalities
    const commonalities = findCommonalities(myProfile, profileData);

    // Step 3: Generate message with Claude
    const message = await generateMessageWithClaude(myProfile, profileData, commonalities);

    const usage = getUserUsage(userId);
    const limit = usage.isPremium ? PLANS.PREMIUM.scrapesPerDay : PLANS.FREE.scrapesPerDay;

    res.json({
      success: true,
      data: {
        targetProfile: profileData,
        commonalities,
        message
      },
      quota: {
        scrapesUsed: usage.scrapesUsed,
        scrapesLimit: limit,
        scrapesRemaining: limit - usage.scrapesUsed,
        resetDate: usage.resetDate,
        isPremium: usage.isPremium
      }
    });

  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze connection'
    });
  }
});

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

function findCommonalities(myProfile, targetProfile) {
  const commonalities = [];

  const myCompanies = extractCompanies(myProfile.experience || []);
  const targetCompanies = extractCompanies(targetProfile.experience || []);
  const commonCompanies = myCompanies.filter(c => targetCompanies.includes(c));

  commonCompanies.forEach(company => {
    commonalities.push({
      type: 'company',
      text: `Both worked at ${company}`,
      strength: 'high'
    });
  });

  const mySchools = extractSchools(myProfile.education || []);
  const targetSchools = extractSchools(targetProfile.education || []);
  const commonSchools = mySchools.filter(s => targetSchools.includes(s));

  commonSchools.forEach(school => {
    commonalities.push({
      type: 'education',
      text: `Both studied at ${school}`,
      strength: 'high'
    });
  });

  const mySkills = new Set(myProfile.skills || []);
  const targetSkills = new Set(targetProfile.skills || []);
  const commonSkills = [...mySkills].filter(s => targetSkills.has(s));

  if (commonSkills.length >= 3) {
    commonalities.push({
      type: 'skills',
      text: `Shared skills: ${commonSkills.slice(0, 3).join(', ')}`,
      strength: 'medium'
    });
  }

  if (myProfile.location && targetProfile.location) {
    const myCity = myProfile.location.split(',')[0].trim();
    const targetCity = targetProfile.location.split(',')[0].trim();
    
    if (myCity === targetCity) {
      commonalities.push({
        type: 'location',
        text: `Both based in ${myCity}`,
        strength: 'medium'
      });
    }
  }

  const myIndustry = extractIndustry(myProfile.headline || '');
  const targetIndustry = extractIndustry(targetProfile.headline || '');
  
  if (myIndustry && targetIndustry && myIndustry === targetIndustry) {
    commonalities.push({
      type: 'industry',
      text: `Both work in ${myIndustry}`,
      strength: 'medium'
    });
  }

  return commonalities;
}

function extractCompanies(experienceList) {
  const companies = [];
  experienceList.forEach(exp => {
    if (typeof exp === 'object' && exp.company) {
      companies.push(exp.company);
    } else if (typeof exp === 'string') {
      const lines = exp.split('\n');
      if (lines.length >= 2) companies.push(lines[1].trim());
    }
  });
  return [...new Set(companies)];
}

function extractSchools(educationList) {
  const schools = [];
  educationList.forEach(edu => {
    if (typeof edu === 'object' && edu.school) {
      schools.push(edu.school);
    } else if (typeof edu === 'string') {
      const lines = edu.split('\n');
      if (lines.length >= 1) schools.push(lines[0].trim());
    }
  });
  return [...new Set(schools)];
}

function extractIndustry(headline) {
  const industries = {
    'engineer': 'Software Engineering',
    'developer': 'Software Development',
    'designer': 'Design',
    'product': 'Product Management',
    'marketing': 'Marketing',
    'sales': 'Sales',
    'data': 'Data Science',
    'analyst': 'Analytics'
  };

  const headlineLower = headline.toLowerCase();
  for (const [keyword, industry] of Object.entries(industries)) {
    if (headlineLower.includes(keyword)) return industry;
  }
  return null;
}

// ====================================================================
// PAYMENT (Stripe) - Same as before
// ====================================================================

app.post('/api/create-checkout-session', async (req, res) => {
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const userId = getUserId(req);
  const { planType } = req.body;

  if (planType !== 'PREMIUM') {
    return res.status(400).json({ error: 'Invalid plan type' });
  }

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLANS.PREMIUM.stripeProductId,
          quantity: 1,
        },
      ],
      success_url: `chrome-extension://${req.headers['x-extension-id']}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `chrome-extension://${req.headers['x-extension-id']}/popup.html`,
      client_reference_id: userId,
      metadata: { userId: userId }
    });

    res.json({ 
      success: true,
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/admin/activate-premium', (req, res) => {
  const { userId, days = 30 } = req.body;
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const usage = getUserUsage(userId);
  usage.isPremium = true;
  
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  usage.premiumExpiry = expiry.toISOString();
  
  userUsage.set(userId, usage);

  res.json({ 
    success: true,
    message: `Premium activated for ${days} days`,
    expiry: usage.premiumExpiry
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 AI: Claude ${CLAUDE_API_KEY ? '✓' : '✗'}`);
  console.log(`📡 MCP: ${MCP_SERVER_URL}`);
  console.log(`💳 Stripe: ${STRIPE_SECRET_KEY ? '✓' : '✗'}`);
  console.log(`\n📊 Limits: Free ${PLANS.FREE.scrapesPerDay}/day, Premium ${PLANS.PREMIUM.scrapesPerDay}/day`);
});