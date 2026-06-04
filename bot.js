const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");
const qrcode = require("qrcode-terminal");

const CONFIG_FILE = "./config.json";

const defaultConfig = {
  owner: "919229180143",
  autoreply: `Hey there!✌️\n\nI'm currently away from my phone and might not be able to respond immediately. But don't worry - I'll get back to you as soon as I'm available! ⚡\n\n*Please note:* If it's urgent, feel free to call me directly. Otherwise, I'll reply to your message shortly.\n\nHave a great day! ✨`,
  cooldown: 18000000,
  enabled: true,
  ignoreGroups: true,
  blacklist: []
};

let config = fs.existsSync(CONFIG_FILE)
  ? JSON.parse(fs.readFileSync(CONFIG_FILE))
  : defaultConfig;

if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

let lastReply = {};
let waitingForTemplate = {}; // Changed from boolean to object

const isOwner = (number) => number === config.owner;

const shouldIgnore = (chatId, isGroup) => {
  if (!config.enabled) return true;
  if (isGroup && config.ignoreGroups) return true;
  const number = chatId.split("@")[0];
  if (config.blacklist.includes(number)) return true;
  return false;
};

const saveConfig = () => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  let sock;
  
  try {
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      logger: P({ level: "silent" }),
      auth: state,
      version,
      browser: ["Auto Reply Bot", "Chrome", "1.0.0"],
      syncFullHistory: false
    });
  } catch (error) {
    console.error("❌ Failed to create socket:", error.message);
    setTimeout(() => startBot(), 5000);
    return;
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log("\n📱 Scan this QR code with WhatsApp:\n");
      qrcode.generate(qr, { small: true });
      console.log("\n💡 How to scan:");
      console.log("   1. Open WhatsApp on your phone");
      console.log("   2. Go to Settings > Linked Devices");
      console.log("   3. Tap 'Link a Device'");
      console.log("   4. Scan the QR code above\n");
    }

    if (connection === "connecting") {
      console.log("🔄 Connecting to WhatsApp...");
    }
    
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.message;
      
      console.log("🔴 Connection closed:", reason || "Unknown reason");
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("❌ Logged out. Deleting session and restarting...");
        if (fs.existsSync("session")) {
          fs.rmSync("session", { recursive: true, force: true });
        }
        setTimeout(() => startBot(), 2000);
      } else if (statusCode === DisconnectReason.restartRequired) {
        console.log("🔄 Restart required. Restarting...");
        setTimeout(() => startBot(), 2000);
      } else if (statusCode === DisconnectReason.connectionClosed) {
        console.log("🔄 Connection closed. Reconnecting...");
        setTimeout(() => startBot(), 3000);
      } else if (statusCode === DisconnectReason.connectionLost) {
        console.log("🔄 Connection lost. Reconnecting...");
        setTimeout(() => startBot(), 3000);
      } else if (statusCode === DisconnectReason.timedOut) {
        console.log("⏱️ Connection timed out. Reconnecting...");
        setTimeout(() => startBot(), 3000);
      } else {
        console.log("🔄 Reconnecting in 5 seconds...");
        setTimeout(() => startBot(), 5000);
      }
    }
    
    if (connection === "open") {
      console.log("\n✅ =======================================");
      console.log("✅ WhatsApp Bot Connected Successfully!");
      console.log("✅ =======================================\n");
      console.log(`📱 Owner: +${config.owner}`);
      console.log(`🤖 Auto-reply: ${config.enabled ? "✅ ON" : "❌ OFF"}`);
      console.log(`⏱️  Cooldown: ${config.cooldown / 60000} minutes`);
      console.log(`👥 Ignore groups: ${config.ignoreGroups ? "Yes" : "No"}`);
      console.log("\n📋 Owner Commands (send from owner number):");
      console.log("  .change           - Change auto-reply message");
      console.log("  .status           - Check bot status");
      console.log("  .toggle           - Enable/disable auto-reply");
      console.log("  .cooldown <min>   - Set cooldown (e.g., .cooldown 5)");
      console.log("  .blacklist <num>  - Block number");
      console.log("  .whitelist <num>  - Unblock number");
      console.log("  .stats            - Show statistics");
      console.log("\n🟢 Bot is active and monitoring messages...\n");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || chatId;
    const senderNumber = sender.split("@")[0];
    const isGroup = chatId.endsWith("@g.us");
    
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    // Owner commands - ONLY process if sender is owner
    if (isOwner(senderNumber)) {
      
      if (text === ".change") {
        waitingForTemplate[chatId] = true; // Track per chat
        await sock.sendMessage(chatId, {
          text: "✏️ Send the new auto-reply message now:"
        });
        console.log("⚙️ Owner requested to change auto-reply message");
        return;
      }

      // Check if THIS chat is waiting for template
      if (waitingForTemplate[chatId] && text !== ".change") {
        config.autoreply = text;
        saveConfig();
        delete waitingForTemplate[chatId]; // Clear the flag for this chat
        await sock.sendMessage(chatId, {
          text: `✅ *Auto-reply updated!*\n\n📝 New message:\n${text}`
        });
        console.log("✅ Auto-reply message updated by owner");
        return;
      }

      if (text === ".status") {
        const statusMsg = `📊 *Bot Status*\n\n` +
          `🤖 Auto-reply: ${config.enabled ? "✅ ON" : "❌ OFF"}\n` +
          `⏱️ Cooldown: ${config.cooldown / 60000} min\n` +
          `🚫 Blacklist: ${config.blacklist.length} numbers\n` +
          `👥 Ignore groups: ${config.ignoreGroups ? "Yes" : "No"}\n` +
          `💬 Replied to: ${Object.keys(lastReply).length} chats`;
        
        await sock.sendMessage(chatId, { text: statusMsg });
        console.log("📊 Status requested by owner");
        return;
      }

      if (text === ".toggle") {
        config.enabled = !config.enabled;
        saveConfig();
        await sock.sendMessage(chatId, {
          text: `🔄 Auto-reply is now ${config.enabled ? "✅ *ENABLED*" : "❌ *DISABLED*"}`
        });
        console.log(`🔄 Auto-reply ${config.enabled ? "enabled" : "disabled"} by owner`);
        return;
      }

      if (text.startsWith(".cooldown ")) {
        const minutes = parseInt(text.split(" ")[1]);
        if (isNaN(minutes) || minutes < 1) {
          await sock.sendMessage(chatId, {
            text: "❌ Invalid usage!\n\n✅ Correct: .cooldown 5\n(Sets 5 minute cooldown)"
          });
          return;
        }
        config.cooldown = minutes * 60000;
        saveConfig();
        await sock.sendMessage(chatId, {
          text: `⏱️ Cooldown set to *${minutes} minutes*`
        });
        console.log(`⏱️ Cooldown set to ${minutes} minutes by owner`);
        return;
      }

      if (text.startsWith(".blacklist ")) {
        const number = text.split(" ")[1].replace(/[^0-9]/g, "");
        if (!number) {
          await sock.sendMessage(chatId, { 
            text: "❌ Usage: .blacklist 919876543210" 
          });
          return;
        }
        if (!config.blacklist.includes(number)) {
          config.blacklist.push(number);
          saveConfig();
          await sock.sendMessage(chatId, { text: `🚫 Blacklisted: +${number}` });
          console.log(`🚫 Blacklisted: +${number}`);
        } else {
          await sock.sendMessage(chatId, { text: `⚠️ Already in blacklist` });
        }
        return;
      }

      if (text.startsWith(".whitelist ")) {
        const number = text.split(" ")[1].replace(/[^0-9]/g, "");
        if (!number) {
          await sock.sendMessage(chatId, { 
            text: "❌ Usage: .whitelist 919876543210" 
          });
          return;
        }
        const index = config.blacklist.indexOf(number);
        if (index > -1) {
          config.blacklist.splice(index, 1);
          saveConfig();
          await sock.sendMessage(chatId, { text: `✅ Removed: +${number}` });
          console.log(`✅ Whitelisted: +${number}`);
        } else {
          await sock.sendMessage(chatId, { text: `⚠️ Not in blacklist` });
        }
        return;
      }

      if (text === ".stats") {
        let stats = "📈 *Reply Statistics*\n\n";
        const sorted = Object.entries(lastReply)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        
        if (sorted.length === 0) {
          stats += "No replies sent yet.";
        } else {
          stats += `Total chats: ${sorted.length}\n\n`;
          sorted.forEach(([chat, time], i) => {
            const number = chat.split("@")[0];
            const date = new Date(time).toLocaleString();
            stats += `${i + 1}. +${number}\n   ${date}\n\n`;
          });
        }
        
        await sock.sendMessage(chatId, { text: stats });
        console.log("📈 Stats requested by owner");
        return;
      }
    }

    // Auto-reply logic (ignore owner messages and template waiting)
    if (shouldIgnore(chatId, isGroup)) return;

    const now = Date.now();
    if (!lastReply[chatId] || now - lastReply[chatId] > config.cooldown) {
      setTimeout(async () => {
        try {
          await sock.sendMessage(chatId, { text: config.autoreply });
          lastReply[chatId] = now;
          console.log(`✉️  Auto-replied to +${senderNumber}`);
        } catch (error) {
          console.error("❌ Reply failed:", error.message);
        }
      }, 2000);
    }
  });
}

console.log("🚀 Starting WhatsApp Auto-Reply Bot...\n");
startBot().catch(console.error);
