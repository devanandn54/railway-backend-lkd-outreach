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

// server.js - Updated Railway Backend with MCP Integration
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// MCP Server Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';

// Middleware
app.use(express.json());

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('chrome-extension://')) return callback(null, true);
    if (origin.includes('localhost')) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ====================================================================
// MCP CLIENT - Communicates with LinkedIn MCP Server
// ====================================================================

class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.requestId = 0;
  }

  async callTool(toolName, toolArgs) {
    this.requestId++;
    
    const payload = {
      jsonrpc: "2.0",
      id: this.requestId,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: toolArgs
      }
    };

    console.log(`📡 Calling MCP tool: ${toolName}`);

    try {
      // Use AbortController to enforce a timeout with fetch (node-fetch / global fetch)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`MCP Server error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'Unknown MCP error');
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
// HEALTH CHECKS
// ====================================================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'LinkedIn Connection Finder API',
    version: '2.0.0',
    features: ['groq-ai', 'mcp-scraping'],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  // Check MCP server availability
  let mcpStatus = 'unknown';
  try {
    const testResponse = await fetch(MCP_SERVER_URL.replace('/mcp', '/'), { 
      method: 'GET',
      timeout: 5000 
    });
    mcpStatus = testResponse.ok ? 'healthy' : 'unhealthy';
  } catch {
    mcpStatus = 'unreachable';
  }

  res.json({ 
    status: 'ok',
    groqConfigured: !!process.env.GROQ_API_KEY,
    mcpServer: mcpStatus,
    mcpUrl: MCP_SERVER_URL,
    timestamp: new Date().toISOString()
  });
});

// ====================================================================
// NEW ENDPOINTS - LinkedIn Profile Scraping via MCP
// ====================================================================

app.post('/api/scrape-profile', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.includes('linkedin.com/in/')) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid LinkedIn profile URL required' 
      });
    }

    console.log(`🔍 Scraping profile: ${url}`);

    const profileData = await mcp.callTool('get_person_profile', {
      profile_url: url
    });

    console.log(`✅ Profile scraped: ${profileData.name || 'Unknown'}`);

    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('❌ Scrape error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape profile'
    });
  }
});

app.post('/api/scrape-company', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.includes('linkedin.com/company/')) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid LinkedIn company URL required' 
      });
    }

    console.log(`🏢 Scraping company: ${url}`);

    const companyData = await mcp.callTool('get_company_profile', {
      company_url: url
    });

    res.json({
      success: true,
      data: companyData
    });

  } catch (error) {
    console.error('❌ Company scrape error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape company'
    });
  }
});

// ====================================================================
// ENHANCED ANALYZE ENDPOINT - Scraping + AI Analysis
// ====================================================================

app.post('/api/analyze-connection', async (req, res) => {
  try {
    const { myProfile, targetUrl } = req.body;

    if (!myProfile || !targetUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Both myProfile and targetUrl required' 
      });
    }

    console.log(`🎯 Analyzing connection for: ${targetUrl}`);

    // Step 1: Scrape target profile via MCP
    console.log('📡 Step 1: Scraping target profile...');
    const targetProfile = await mcp.callTool('get_person_profile', {
      profile_url: targetUrl
    });

    console.log(`✅ Target profile: ${targetProfile.name}`);

    // Step 2: Find commonalities
    console.log('🔍 Step 2: Finding commonalities...');
    const commonalities = findCommonalities(myProfile, targetProfile);

    // Step 3: Generate AI message with Groq
    console.log('🤖 Step 3: Generating AI message...');
    const message = await generateMessageWithGroq(myProfile, targetProfile, commonalities);

    console.log('✅ Analysis complete!');

    res.json({
      success: true,
      data: {
        targetProfile,
        commonalities,
        message
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

  // 1. Common companies
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

  // 2. Common schools
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

  // 3. Common skills
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

  // 4. Location overlap
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

  // 5. Industry overlap (from headlines)
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

async function generateMessageWithGroq(myProfile, targetProfile, commonalities) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  // Build context prompt
  const prompt = buildPrompt(myProfile, targetProfile, commonalities);

  console.log('📝 Prompt length:', prompt.length);

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a professional LinkedIn connection message writer. Create personalized, concise connection requests that feel genuine and highlight real commonalities.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!groqResponse.ok) {
    const errorData = await groqResponse.text();
    console.error('❌ Groq API error:', errorData);
    throw new Error('AI service unavailable');
  }

  const data = await groqResponse.json();
  const message = data.choices[0]?.message?.content || '';

  return message;
}

function buildPrompt(myProfile, targetProfile, commonalities) {
  const myName = myProfile.name || 'I';
  const targetName = targetProfile.name || 'them';
  const myRole = myProfile.currentRole || myProfile.headline || 'professional';
  const targetRole = targetProfile.currentRole || targetProfile.headline || 'their role';

  let commonalitiesText = 'No strong commonalities found.';
  if (commonalities.length > 0) {
    commonalitiesText = commonalities
      .map(c => `- ${c.text}`)
      .join('\n');
  }

  return `Write a personalized LinkedIn connection request message.

MY PROFILE:
- Name: ${myName}
- Current Role: ${myRole}
- Location: ${myProfile.location || 'Not specified'}

TARGET PROFILE:
- Name: ${targetName}
- Current Role: ${targetRole}
- Location: ${targetProfile.location || 'Not specified'}
- Company: ${targetProfile.company || 'Not specified'}

COMMONALITIES:
${commonalitiesText}

REQUIREMENTS:
- Keep it under 300 characters (LinkedIn limit)
- Be genuine and professional
- Mention ONE specific commonality if available
- If no commonalities, mention their work/industry
- Don't be salesy or pushy
- End with a clear call to action

Write ONLY the message text, no subject line or extra formatting:`;
}

function extractCompanies(experienceList) {
  const companies = [];
  
  experienceList.forEach(exp => {
    if (typeof exp === 'object' && exp.company) {
      companies.push(exp.company);
    } else if (typeof exp === 'string') {
      const lines = exp.split('\n');
      if (lines.length >= 2) {
        companies.push(lines[1].trim());
      }
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
      if (lines.length >= 1) {
        schools.push(lines[0].trim());
      }
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
    'analyst': 'Analytics',
    'manager': 'Management',
    'recruiter': 'Recruiting',
    'consultant': 'Consulting'
  };

  const headlineLower = headline.toLowerCase();
  
  for (const [keyword, industry] of Object.entries(industries)) {
    if (headlineLower.includes(keyword)) {
      return industry;
    }
  }

  return null;
}

// ====================================================================
// LEGACY ENDPOINT - Keep for backward compatibility
// ====================================================================

app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, max_tokens = 1500 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt too long' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: max_tokens
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('❌ Groq API error:', errorData);
      return res.status(groqResponse.status).json({ 
        error: 'AI service unavailable' 
      });
    }

    const data = await groqResponse.json();
    const content = data.choices[0]?.message?.content || '';

    res.json({ 
      success: true, 
      content: content,
      usage: data.usage
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Analytics endpoint
app.post('/api/stats', async (req, res) => {
  try {
    const { event, version, persona } = req.body;
    
    console.log('📊 Analytics:', { 
      event, 
      version, 
      persona,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    res.json({ success: true });
  } catch (error) {
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
  console.log(`🌐 MCP_SERVER_URL: ${MCP_SERVER_URL}`);
  
  if (!process.env.GROQ_API_KEY) {
    console.error('⚠️  WARNING: GROQ_API_KEY is not set!');
  }
});