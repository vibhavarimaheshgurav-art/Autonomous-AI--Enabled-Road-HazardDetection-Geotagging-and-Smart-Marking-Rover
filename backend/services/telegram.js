/**
 * services/telegram.js
 * Telegram Bot alerts for high-severity hazard reports.
 *
 * Setup:
 *  1. Message @BotFather → /newbot → copy token to TELEGRAM_BOT_TOKEN
 *  2. Add the bot to a group/channel or start a DM → copy chat ID to TELEGRAM_CHAT_ID
 *     (Use @userinfobot to find your chat ID)
 */

const TelegramBot = require('node-telegram-bot-api');

let bot    = null;
let chatId = null;

function initTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  chatId      = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('⚠️  Telegram not configured — high-severity alerts disabled.');
    console.warn('   Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable.');
    return;
  }

  bot = new TelegramBot(token);
  console.log('✓ Telegram bot initialised');
}

/**
 * Send a formatted hazard alert.
 * Silently no-ops if Telegram is not configured.
 * @param {object} hazard  Firestore hazard document
 */
async function sendHazardAlert(hazard) {
  if (!bot || !chatId) return;

  const EMOJI = { High: '🔴', Critical: '🚨', Medium: '🟡', Low: '🟢' };
  const emoji = EMOJI[hazard.severity] || '⚠️';

  const lines = [
    `${emoji} *HIGH SEVERITY HAZARD ALERT*`,
    '',
    `*Type:*       ${(hazard.ai_hazard_type || hazard.trigger_reason || 'Unknown').replace(/_/g, ' ').toUpperCase()}`,
    `*Severity:*   ${hazard.severity}`,
    `*Confidence:* ${hazard.ai_confidence != null ? (hazard.ai_confidence * 100).toFixed(1) + '%' : 'N/A'}`,
    `*GPS:*        ${hazard.latitude?.toFixed(6)}, ${hazard.longitude?.toFixed(6)}`,
    `*Rover:*      ${hazard.rover_id || 'Unknown'}`,
    `*Time:*       ${new Date(hazard.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    hazard.ai_report ? `\n📋 *AI Report:*\n_${hazard.ai_report.slice(0, 400)}_` : '',
    `\n📍 [Open in Google Maps](https://maps.google.com/?q=${hazard.latitude},${hazard.longitude})`
  ].filter(Boolean).join('\n');

  try {
    await bot.sendMessage(chatId, lines, { parse_mode: 'Markdown', disable_web_page_preview: true });

    // Also send the image if available
    if (hazard.image_url && !hazard.image_url.startsWith('data:')) {
      await bot.sendPhoto(chatId, hazard.image_url, {
        caption: `📸 ${hazard.ai_hazard_type || hazard.trigger_reason} detected by ${hazard.rover_id}`
      });
    }
    console.log(`[Telegram] Alert sent for hazard ${hazard.id}`);
  } catch (err) {
    console.error('[Telegram] Failed to send alert:', err.message);
  }
}

module.exports = { initTelegram, sendHazardAlert };
