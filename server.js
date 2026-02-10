// server.js - Production Server v3: Claude AI + MCP (fixed) + RapidAPI Fallback
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // Optional fallback
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
// MCP CLIENT (Session-aware for Streamable HTTP transport)
// ====================================================================
// The stickerdaniel/linkedin-mcp-server uses Streamable HTTP which 
// REQUIRES: 1) An initialize handshake first, 2) Session ID header
// on all subsequent requests, 3) Accept header with both JSON + SSE

class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.requestId = 0;
    this.sessionId = null;
    this.lastRequestTime = 0;
    this.initializing = null; // Promise to prevent concurrent init
  }

  // Standard headers required by Streamable HTTP MCP transport
  _headers() {
    const h = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    if (this.sessionId) {
      h['Mcp-Session-Id'] = this.sessionId;
    }
    return h;
  }

  // Send a raw JSON-RPC request and return the parsed response
  async _send(method, params, timeoutMs = 90000) {
    this.requestId++;
    const payload = {
      jsonrpc: "2.0",
      id: this.requestId,
      method,
      params
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      // Capture session ID from response header
      const newSessionId = response.headers.get('mcp-session-id');
      if (newSessionId) {
        this.sessionId = newSessionId;
        console.log(`🔑 MCP session: ${this.sessionId.substring(0, 12)}...`);
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);
        // If session expired, reset and retry
        if (response.status === 400 && errBody.includes('session')) {
          console.warn('⚠️ MCP session expired, will re-initialize...');
          this.sessionId = null;
          this.initializing = null;
        }
        throw new Error(`MCP ${response.status}: ${errBody}`);
      }

      // Handle SSE response (text/event-stream) — some MCP servers 
      // return SSE even when we accept JSON
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        return await this._parseSSE(response);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  // Parse Server-Sent Events response into JSON-RPC result
  async _parseSSE(response) {
    const text = await response.text();
    const lines = text.split('\n');
    let lastData = null;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        lastData = line.slice(6);
      }
    }

    if (lastData) {
      try {
        return JSON.parse(lastData);
      } catch {
        return { result: { content: [{ type: 'text', text: lastData }] } };
      }
    }

    throw new Error('Empty SSE response from MCP server');
  }

  // Initialize session — must be called before any tool calls
  async initialize() {
    // Prevent concurrent initializations
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      console.log('🔄 MCP: Initializing session...');
      this.sessionId = null; // Reset for fresh init

      const result = await this._send('initialize', {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: {
          name: "linkedin-connection-finder",
          version: "3.0.0"
        }
      }, 15000);

      if (result.error) {
        throw new Error(`MCP init failed: ${result.error.message}`);
      }

      console.log(`✅ MCP session initialized: ${this.sessionId ? this.sessionId.substring(0, 12) + '...' : 'no ID returned'}`);

      // Send initialized notification (required by MCP protocol)
      try {
        await fetch(this.baseUrl, {
          method: 'POST',
          headers: this._headers(),
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized"
          })
        });
      } catch {
        // Notification failures are non-fatal
      }

      return result;
    })();

    return this.initializing;
  }

  // Ensure we have an active session
  async _ensureSession() {
    if (!this.sessionId) {
      await this.initialize();
    }
  }

  // Call an MCP tool with auto-session management
  async callTool(toolName, args) {
    // Anti-ban delay: 2-5 seconds between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 2000 + Math.random() * 3000;

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      console.log(`⏳ Anti-ban delay: ${Math.round(waitTime / 1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();

    console.log(`📡 MCP → ${toolName}`, JSON.stringify(args));

    // Ensure session is active (auto-initialize if needed)
    await this._ensureSession();

    try {
      const result = await this._send('tools/call', {
        name: toolName,
        arguments: args
      });

      if (result.error) {
        throw new Error(result.error.message || JSON.stringify(result.error));
      }

      return this._extractResult(result);
    } catch (error) {
      // If session error, re-initialize and retry once
      if (error.message.includes('session') || error.message.includes('Session')) {
        console.warn('🔄 MCP: Session error, re-initializing...');
        this.sessionId = null;
        this.initializing = null;
        await this._ensureSession();

        const retryResult = await this._send('tools/call', {
          name: toolName,
          arguments: args
        });

        if (retryResult.error) {
          throw new Error(retryResult.error.message);
        }

        return this._extractResult(retryResult);
      }

      console.error(`❌ MCP Error [${toolName}]:`, error.message);
      throw error;
    }
  }

  // List available tools (used by debug endpoint)
  async listTools() {
    await this._ensureSession();
    const result = await this._send('tools/list', {});
    return result;
  }

  // Extract profile data from MCP response format
  // stickerdaniel server returns: { result: { content: [{ type: "text", text: "{JSON}" }] } }
  _extractResult(result) {
    const content = result.result?.content;
    if (Array.isArray(content)) {
      const textBlock = content.find(c => c.type === 'text');
      if (textBlock && textBlock.text) {
        try {
          return JSON.parse(textBlock.text);
        } catch {
          return { raw: textBlock.text, name: '', headline: '' };
        }
      }
    }

    // Fallback: result itself might be profile data
    if (result.result && (result.result.name || result.result.full_name)) {
      return result.result;
    }

    return result.result || {};
  }

  // Health check — can the MCP server be reached and initialized?
  async healthCheck() {
    try {
      await this.initialize();
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }
}

const mcp = new MCPClient(MCP_SERVER_URL);

// ====================================================================
// RAPIDAPI FALLBACK SCRAPER
// ====================================================================

async function scrapeViaRapidAPI(username) {
  if (!RAPIDAPI_KEY) throw new Error('RapidAPI fallback not configured');

  console.log(`🔄 RapidAPI fallback → @${username}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://fresh-linkedin-scraper-api.p.rapidapi.com/api/v1/user/profile?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'fresh-linkedin-scraper-api.p.rapidapi.com'
        },
        signal: controller.signal
      }
    );
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`RapidAPI ${response.status}`);
    const data = await response.json();
    if (!data.success || !data.data) throw new Error('RapidAPI empty response');

    const p = data.data;
    return {
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.full_name || '',
      headline: p.headline || '',
      location: p.city || p.location || '',
      company: p.experiences?.[0]?.company || p.company || '',
      currentRole: p.experiences?.[0]?.title || p.headline || '',
      experience: (p.experiences || []).map(e => ({
        title: e.title || '', company: e.company || e.company_name || '', duration: e.duration || ''
      })),
      education: (p.educations || []).map(e => ({
        school: e.school || e.school_name || '', degree: e.degree || '', field: e.field_of_study || ''
      })),
      skills: (p.skills || []).map(s => typeof s === 'string' ? s : s.name || '').filter(Boolean),
      about: p.summary || p.about || ''
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ====================================================================
// UNIFIED SCRAPE: MCP primary → RapidAPI fallback
// ====================================================================

function extractUsername(url) {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
  return match ? match[1] : null;
}

function normalizeProfile(raw) {
  return {
    name: raw.name || raw.full_name || '',
    headline: raw.headline || raw.title || '',
    location: raw.location || '',
    company: raw.company || raw.current_company ||
             (Array.isArray(raw.experience) && raw.experience[0]?.company) ||
             (Array.isArray(raw.experiences) && raw.experiences[0]?.company) || '',
    currentRole: raw.current_role || raw.headline || '',
    experience: Array.isArray(raw.experience) ? raw.experience :
                Array.isArray(raw.experiences) ? raw.experiences : [],
    education: Array.isArray(raw.education) ? raw.education :
               Array.isArray(raw.educations) ? raw.educations : [],
    skills: Array.isArray(raw.skills) ? raw.skills.map(s =>
      typeof s === 'string' ? s : (s.name || s.skill || '')
    ).filter(Boolean) : [],
    about: raw.about || raw.summary || ''
  };
}

async function scrapeProfile(url) {
  const username = extractUsername(url);
  if (!username) throw new Error('Invalid LinkedIn profile URL');

  // Try MCP first
  try {
    const rawProfile = await mcp.callTool('get_person_profile', { linkedin_username: username });
    const profile = normalizeProfile(rawProfile);
    console.log(`✅ MCP scraped: ${profile.name || username}`);
    return profile;
  } catch (mcpError) {
    console.warn(`⚠️ MCP failed: ${mcpError.message}`);
  }

  // Fallback to RapidAPI
  if (RAPIDAPI_KEY) {
    try {
      const profile = await scrapeViaRapidAPI(username);
      console.log(`✅ RapidAPI scraped: ${profile.name || username}`);
      return profile;
    } catch (rapidError) {
      console.error(`❌ RapidAPI also failed: ${rapidError.message}`);
    }
  }

  throw new Error(`Could not scrape @${username}. MCP server may be down or li_at cookie expired. Check /api/health`);
}

// ====================================================================
// CLAUDE AI CLIENT
// ====================================================================

async function generateMessageWithClaude(myProfile, targetProfile, commonalities) {
  if (!CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY not configured');

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0.7,
        system: `You write personalized LinkedIn connection request notes. Rules:
- MUST be under 300 characters (LinkedIn hard limit)
- Sound genuinely human, warm, professional
- Reference ONE specific commonality if available
- Adapt tone: respectful for directors/VPs, collegial for peers, interested for recruiters
- Never salesy, never use buzzwords
- End with soft CTA
- Write ONLY the message text`,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ Claude API error:', error);
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    const message = data.content[0]?.text || '';
    console.log(`✅ Claude: ${message.length} chars | ${data.usage?.input_tokens || '?'}in/${data.usage?.output_tokens || '?'}out tokens`);

    return message.length > 300 ? message.substring(0, 297) + '...' : message;
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
    commonalitiesText = commonalities.map(c => `- ${c.text} (${c.strength})`).join('\n');
  }

  let resumeContext = '';
  if (myProfile.resume) {
    resumeContext = `\nResume highlights: ${myProfile.resume.substring(0, 400)}`;
  }

  return `Write a LinkedIn connection request under 300 characters.

ME: ${myName} — ${myRole}
Location: ${myProfile.location || 'N/A'}${resumeContext}

TARGET: ${targetName} — ${targetRole}
Company: ${targetProfile.company || 'N/A'}
Location: ${targetProfile.location || 'N/A'}

COMMONALITIES:
${commonalitiesText}

Write ONLY the message (under 300 chars):`;
}

// ====================================================================
// HEALTH & STATUS
// ====================================================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'LinkedIn Connection Finder',
    version: '3.0.0',
    ai: 'Claude Sonnet',
    features: ['claude-ai', 'mcp-scraping', 'rapidapi-fallback', 'rate-limiting', 'premium'],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  const mcpStatus = await mcp.healthCheck();

  res.json({ 
    status: 'ok',
    claudeConfigured: !!CLAUDE_API_KEY,
    rapidApiConfigured: !!RAPIDAPI_KEY,
    mcpServer: mcpStatus,
    mcpUrl: MCP_SERVER_URL,
    mcpSessionActive: !!mcp.sessionId,
    stripeConfigured: !!STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/debug-mcp", async (req, res) => {
  try {
    const result = await mcp.listTools();
    res.json({ 
      ok: true, 
      sessionId: mcp.sessionId ? mcp.sessionId.substring(0, 12) + '...' : null,
      body: result 
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
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
    return res.status(400).json({ success: false, error: 'Valid LinkedIn profile URL required' });
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
    const profileData = await scrapeProfile(url);

    if (!skipRateLimit) recordScrape(userId);

    const usage = getUserUsage(userId);
    const limit = usage.isPremium ? PLANS.PREMIUM.scrapesPerDay : PLANS.FREE.scrapesPerDay;

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
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/scrape-company', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('linkedin.com/company/')) {
      return res.status(400).json({ success: false, error: 'Valid LinkedIn company URL required' });
    }
    console.log(`🏢 Scraping company: ${url}`);
    const companyName = url.split('/company/')[1]?.split('/')[0]?.split('?')[0];
    const companyData = await mcp.callTool('get_company_profile', { company_name: companyName });
    res.json({ success: true, data: companyData });
  } catch (error) {
    console.error('❌ Company scrape error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/analyze-connection', async (req, res) => {
  const userId = getUserId(req);
  const { myProfile, targetUrl } = req.body;

  if (!myProfile || !targetUrl) {
    return res.status(400).json({ success: false, error: 'Both myProfile and targetUrl required' });
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

    // Step 1: Scrape target (MCP → RapidAPI fallback)
    const targetProfile = await scrapeProfile(targetUrl);
    recordScrape(userId);
    console.log(`✅ Target: ${targetProfile.name}`);

    // Step 2: Find commonalities
    const commonalities = findCommonalities(myProfile, targetProfile);
    console.log(`📊 ${commonalities.length} commonalities`);

    // Step 3: Generate message with Claude
    const message = await generateMessageWithClaude(myProfile, targetProfile, commonalities);

    const usage = getUserUsage(userId);
    const limit = usage.isPremium ? PLANS.PREMIUM.scrapesPerDay : PLANS.FREE.scrapesPerDay;

    res.json({
      success: true,
      data: { targetProfile, commonalities, message },
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// ====================================================================
// COMMONALITY ENGINE (improved: case-insensitive)
// ====================================================================

function findCommonalities(myProfile, targetProfile) {
  const commonalities = [];

  const myCompanies = extractCompanies(myProfile.experience || []);
  const targetCompanies = extractCompanies(targetProfile.experience || []);
  myCompanies.filter(c => targetCompanies.some(tc => tc.toLowerCase() === c.toLowerCase()))
    .forEach(company => commonalities.push({ type: 'company', text: `Both worked at ${company}`, strength: 'high' }));

  const mySchools = extractSchools(myProfile.education || []);
  const targetSchools = extractSchools(targetProfile.education || []);
  mySchools.filter(s => targetSchools.some(ts => ts.toLowerCase() === s.toLowerCase()))
    .forEach(school => commonalities.push({ type: 'education', text: `Both studied at ${school}`, strength: 'high' }));

  const norm = s => (typeof s === 'string' ? s : (s?.name || s?.skill || '')).toLowerCase().trim();
  const mySkills = new Set((myProfile.skills || []).map(norm).filter(Boolean));
  const targetSkills = new Set((targetProfile.skills || []).map(norm).filter(Boolean));
  const commonSkills = [...mySkills].filter(s => targetSkills.has(s));
  if (commonSkills.length >= 2) {
    commonalities.push({
      type: 'skills',
      text: `Shared skills: ${commonSkills.slice(0, 4).join(', ')}`,
      strength: commonSkills.length >= 5 ? 'high' : 'medium'
    });
  }

  if (myProfile.location && targetProfile.location) {
    const myCity = myProfile.location.split(',')[0].trim().toLowerCase();
    const targetCity = targetProfile.location.split(',')[0].trim().toLowerCase();
    if (myCity && targetCity && myCity === targetCity) {
      commonalities.push({ type: 'location', text: `Both based in ${myProfile.location.split(',')[0].trim()}`, strength: 'medium' });
    }
  }

  const myIndustry = extractIndustry(myProfile.headline || '');
  const targetIndustry = extractIndustry(targetProfile.headline || '');
  if (myIndustry && targetIndustry && myIndustry === targetIndustry) {
    commonalities.push({ type: 'industry', text: `Both work in ${myIndustry}`, strength: 'medium' });
  }

  return commonalities;
}

function extractCompanies(list) {
  const companies = [];
  list.forEach(exp => {
    if (typeof exp === 'object' && (exp.company || exp.company_name)) companies.push(exp.company || exp.company_name);
    else if (typeof exp === 'string') { const l = exp.split('\n'); if (l.length >= 2) companies.push(l[1].trim()); }
  });
  return [...new Set(companies.filter(Boolean))];
}

function extractSchools(list) {
  const schools = [];
  list.forEach(edu => {
    if (typeof edu === 'object' && (edu.school || edu.school_name || edu.name)) schools.push(edu.school || edu.school_name || edu.name);
    else if (typeof edu === 'string') schools.push(edu.split('\n')[0].trim());
  });
  return [...new Set(schools.filter(Boolean))];
}

function extractIndustry(headline) {
  const map = {
    'engineer': 'Software Engineering', 'developer': 'Software Development',
    'designer': 'Design', 'product': 'Product Management',
    'marketing': 'Marketing', 'sales': 'Sales', 'data': 'Data Science',
    'analyst': 'Analytics', 'manager': 'Management', 'recruiter': 'Recruiting',
    'consultant': 'Consulting', 'director': 'Leadership', 'devops': 'DevOps',
    'cloud': 'Cloud Computing', 'security': 'Cybersecurity', 'ai': 'AI/ML'
  };
  const lower = headline.toLowerCase();
  for (const [k, v] of Object.entries(map)) { if (lower.includes(k)) return v; }
  return null;
}

// ====================================================================
// STRIPE PAYMENT
// ====================================================================

app.post('/api/create-checkout-session', async (req, res) => {
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Stripe not configured' });

  const userId = getUserId(req);
  const { planType } = req.body;
  if (planType !== 'PREMIUM') return res.status(400).json({ error: 'Invalid plan type' });

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PLANS.PREMIUM.stripeProductId, quantity: 1 }],
      success_url: `chrome-extension://${req.headers['x-extension-id']}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `chrome-extension://${req.headers['x-extension-id']}/popup.html`,
      client_reference_id: userId,
      metadata: { userId }
    });
    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/admin/activate-premium', (req, res) => {
  const { userId, days = 30 } = req.body;
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const usage = getUserUsage(userId);
  usage.isPremium = true;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  usage.premiumExpiry = expiry.toISOString();
  userUsage.set(userId, usage);

  res.json({ success: true, message: `Premium activated for ${days} days`, expiry: usage.premiumExpiry });
});

// Legacy endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, max_tokens = 1500 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!CLAUDE_API_KEY) return res.status(500).json({ error: 'API key not configured' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) return res.status(response.status).json({ error: 'AI unavailable' });
    const data = await response.json();
    res.json({ success: true, content: data.content[0]?.text || '', usage: data.usage });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/stats', (req, res) => {
  console.log('📊', { ...req.body, ts: new Date().toISOString() });
  res.json({ success: true });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Claude: ${CLAUDE_API_KEY ? '✓' : '✗'}`);
  console.log(`📡 MCP: ${MCP_SERVER_URL}`);
  console.log(`🔄 RapidAPI: ${RAPIDAPI_KEY ? '✓' : '✗'}`);
  console.log(`💳 Stripe: ${STRIPE_SECRET_KEY ? '✓' : '✗'}`);
  console.log(`📊 Free ${PLANS.FREE.scrapesPerDay}/day | Premium ${PLANS.PREMIUM.scrapesPerDay}/day`);
});