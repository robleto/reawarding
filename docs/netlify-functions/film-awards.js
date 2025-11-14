// netlify/functions/film-awards.js
// Awards API: Film awards endpoint backed by Neon
// Copy this file into your GameAwardsAPI repo under netlify/functions/film-awards.js
// Requires: config/database.js with methods validateApiKey (enhanced), logApiUsage, and init() for Neon SQL

const db = require('../../config/database');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    // Optional caching hint (adjust as desired)
    'Cache-Control': 'public, max-age=300',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const start = Date.now();
  const qs = event.queryStringParameters || {};
  const apiKey = (event.headers['x-api-key'] || qs.apikey || '').trim();
  const imdbId = (qs.imdb_id || '').trim();
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
  const userAgent = event.headers['user-agent'] || '';

  // Basic param check
  if (!imdbId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing required parameter 'imdb_id'" }),
    };
  }

  // API key validation
  try {
    if (!apiKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'API key required. Provide via x-api-key header or apikey param.' }),
      };
    }

    const keyStatus = await db.validateApiKey(apiKey);
    if (!keyStatus || keyStatus.valid === false) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: keyStatus?.error || 'Invalid API key' }),
      };
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Key validation failed', details: e.message }),
    };
  }

  // Execute Neon SQL helpers
  let statusCode = 200;
  let responseBody = {};
  try {
    const sql = db.init();

    // Fetch nested nominations JSON
    const dataRes = await sql`SELECT get_film_awards_by_imdb(${imdbId}) AS data`;
    const data = dataRes?.[0]?.data || null;

    // If no nominations, return 404
    const nominations = Array.isArray(data?.nominations) ? data.nominations : [];
    if (!data || nominations.length === 0) {
      statusCode = 404;
      responseBody = { imdb_id: imdbId, nominations: [], badges: [], stats: { nominations: 0, wins: 0 } };
    } else {
      // Fetch badges summary
      const badgesRes = await sql`SELECT get_film_award_badges_by_imdb(${imdbId}) AS badges`;
      const badgesData = badgesRes?.[0]?.badges || { nominations: 0, wins: 0, badges: [] };

      responseBody = {
        imdb_id: imdbId,
        nominations,
        badges: Array.isArray(badgesData.badges) ? badgesData.badges : [],
        stats: {
          nominations: Number(badgesData.nominations || nominations.length),
          wins: Number(badgesData.wins || 0),
        },
      };
    }
  } catch (e) {
    statusCode = 500;
    responseBody = { error: 'Database error', details: e.message };
  }

  // Log usage (best-effort)
  try {
    const ms = Date.now() - start;
    await db.logApiUsage(apiKey, 'film-awards', { imdb_id: imdbId }, ms, statusCode, clientIp, userAgent);
  } catch (_) {}

  return {
    statusCode,
    headers,
    body: JSON.stringify(responseBody),
  };
};
