# WhatsApp Auto-Reply Bot 🤖

A premium WhatsApp auto-reply bot built with Baileys that provides professional offline responses with smart automation and owner controls.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

- 🔄 **Smart Auto-Reply** - Automatically responds to messages when you're away
- ⏱️ **Cooldown System** - Prevents spam with configurable cooldown periods
- 👥 **Group Control** - Option to ignore group messages
- 🚫 **Blacklist System** - Block specific numbers from receiving auto-replies
- 📊 **Statistics** - Track reply history and bot performance
- ⚙️ **Owner Commands** - Full control via WhatsApp commands
- 🔐 **Session Management** - Persistent login with multi-device support

## 📋 Prerequisites

- Node.js 18.x or higher
- Google Cloud Platform account
- WhatsApp account
- Git

## 🚀 Deployment to Google Cloud

### Method 1: Google Cloud Run (Recommended)

#### Step 1: Clone the Repository

```bash
git clone https://gitlab.com/dangerboy10564/whatsapp-auto-reply.git
cd whatsapp-auto-reply
```

#### Step 2: Configure Owner Number

Edit `bot.js` or create `config.json`:

```json
{
  "owner": "91XXXXXXXXXX",
  "autoreply": "Your custom auto-reply message",
  "cooldown": 18000000,
  "enabled": true,
  "ignoreGroups": true,
  "blacklist": []
}
```

⚠️ **Important**: Replace `91XXXXXXXXXX` with your WhatsApp number (with country code, no +)

#### Step 3: Create Dockerfile

Create a file named `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create session directory
RUN mkdir -p session

# Expose port (optional, for health checks)
EXPOSE 8080

# Start the bot
CMD ["npm", "start"]
```

#### Step 4: Create .dockerignore

```
node_modules
session
config.json
*.log
.git
.gitignore
README.md
```

#### Step 5: Deploy to Google Cloud Run

```bash
# Install Google Cloud SDK if not already installed
# Visit: https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build and deploy
gcloud run deploy whatsapp-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --min-instances 1 \
  --max-instances 1
```

#### Step 6: Scan QR Code

1. Check the logs to get the QR code:
```bash
gcloud run services logs read whatsapp-bot --region us-central1 --limit 50
```

2. You'll see the QR code in ASCII format. Scan it with WhatsApp:
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Tap "Link a Device"
   - Scan the QR code

### Method 2: Google Compute Engine (VM)

#### Step 1: Create a VM Instance

```bash
gcloud compute instances create whatsapp-bot \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB
```

#### Step 2: SSH into the VM

```bash
gcloud compute ssh whatsapp-bot --zone=us-central1-a
```

#### Step 3: Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### Step 4: Clone and Setup

```bash
# Clone repository
git clone https://gitlab.com/dangerboy10564/whatsapp-auto-reply.git
cd whatsapp-auto-reply

# Install dependencies
npm install

# Configure owner number (edit config.json or bot.js)
nano config.json
```

#### Step 5: Run with PM2 (Process Manager)

```bash
# Install PM2
sudo npm install -g pm2

# Start the bot
pm2 start bot.js --name whatsapp-bot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# View logs
pm2 logs whatsapp-bot

# Monitor
pm2 monit
```

#### Step 6: Scan QR Code

```bash
# View logs to see QR code
pm2 logs whatsapp-bot --lines 50
```

Scan the QR code with your WhatsApp as described above.

## 🎮 Owner Commands

Send these commands from your owner number:

| Command | Description | Example |
|---------|-------------|---------|
| `.status` | Check bot status | `.status` |
| `.toggle` | Enable/disable auto-reply | `.toggle` |
| `.change` | Change auto-reply message | `.change` |
| `.cooldown <min>` | Set cooldown in minutes | `.cooldown 5` |
| `.blacklist <number>` | Block a number | `.blacklist 919876543210` |
| `.whitelist <number>` | Unblock a number | `.whitelist 919876543210` |
| `.stats` | View reply statistics | `.stats` |

## ⚙️ Configuration

The bot uses `config.json` for settings:

```json
{
  "owner": "91XXXXXXXXXX",
  "autoreply": "Your custom message here",
  "cooldown": 300000,
  "enabled": true,
  "ignoreGroups": true,
  "blacklist": []
}
```

### Configuration Options

- **owner**: Your WhatsApp number (country code + number, no +)
- **autoreply**: The message sent to contacts
- **cooldown**: Time between replies to same chat (in milliseconds)
- **enabled**: Enable/disable auto-reply
- **ignoreGroups**: Whether to ignore group messages
- **blacklist**: Array of numbers to ignore

## 🔧 Troubleshooting

### QR Code Not Showing

```bash
# For Cloud Run
gcloud run services logs read whatsapp-bot --region us-central1 --limit 100

# For Compute Engine
pm2 logs whatsapp-bot --lines 100
```

### Bot Keeps Disconnecting

- Ensure the VM/container stays running
- Check your internet connection
- For Cloud Run, ensure min-instances is set to 1

### Session Lost

If you get logged out:

```bash
# Cloud Run - redeploy to get new QR
gcloud run deploy whatsapp-bot --source .

# Compute Engine - restart
pm2 restart whatsapp-bot
```

Then scan the new QR code.

### Permission Errors

```bash
# Give proper permissions
chmod -R 755 /path/to/whatsapp-auto-reply
```

## 📊 Monitoring

### Cloud Run

```bash
# View logs
gcloud run services logs read whatsapp-bot --region us-central1

# Check service status
gcloud run services describe whatsapp-bot --region us-central1
```

### Compute Engine with PM2

```bash
# View logs
pm2 logs whatsapp-bot

# Monitor resources
pm2 monit

# View process list
pm2 list

# Restart bot
pm2 restart whatsapp-bot

# Stop bot
pm2 stop whatsapp-bot
```

## 💰 Cost Estimation

### Google Cloud Run
- **Free tier**: 2 million requests/month, 360,000 GB-seconds
- **Estimated cost**: $0-5/month for personal use

### Google Compute Engine (e2-micro)
- **Free tier**: 1 e2-micro instance in us-central1, us-west1, or us-east1
- **Estimated cost**: Free (if in free tier region) or ~$7/month

## 🔒 Security Best Practices

1. **Never commit** `config.json` or `session` folder
2. Keep your owner number **private**
3. Use strong, unique auto-reply messages
4. Regularly update dependencies:
   ```bash
   npm update
   ```
5. Monitor blacklist and reply statistics
6. Use environment variables for sensitive data (optional):
   ```bash
   export OWNER_NUMBER="91XXXXXXXXXX"
   ```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Disclaimer

This bot is for **personal use only**. Make sure to:
- Comply with WhatsApp's Terms of Service
- Not spam users
- Use responsibly
- Not use for commercial purposes without proper authorization

## 📞 Support

For issues and questions:
- Open an issue on GitLab
- Check existing issues for solutions

## 🌟 Credits

Built with:
- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- [Node.js](https://nodejs.org/)
- [Pino](https://getpino.io/)

---

Made with ❤️ by danger


#𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗟𝗜𝗦𝗧

cd directory_name
nano bot.js
nano config.json
npm i
node bot.js