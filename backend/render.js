const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    // index.html is now located inside the frontend folder
    const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // Generate a per-request nonce (base64)
    const nonce = crypto.randomBytes(16).toString('base64');

    // Inject nonce attributes into inline <script> and <style> tags
    // Add nonce only to tags without src (scripts) or any style tags
    html = html.replace(/<script(?=[^>]*>)(?![^>]*\ssrc=)([^>]*)>/gi, (match, g1) => {
      return `<script nonce="${nonce}"${g1}>`;
    });
    html = html.replace(/<style([^>]*)>/gi, (match, g1) => {
      return `<style nonce="${nonce}"${g1}>`;
    });

    // Build CSP header including the nonce for scripts and styles
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com 'unsafe-hashes'`,
      `font-src 'self' https://fonts.gstatic.com data:`,
      `img-src 'self' data: https:`,
      `connect-src 'self' https://jwswrbjamdnwikwnsnjw.supabase.co`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`
    ].join('; ');

    // Set security headers
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', "camera=(), microphone=(), geolocation=(self)");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.statusCode = 200;
    res.end(html);
  } catch (err) {
    console.error('Error rendering index:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Internal Server Error');
  }
};
