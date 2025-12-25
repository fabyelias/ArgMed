#!/bin/bash

# ArgMed Deployment Script to Hostinger VPS
# This script builds the project and deploys to argmed.online (89.117.32.202)

set -e

echo "🚀 Starting ArgMed deployment process..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# VPS Configuration
VPS_USER="root"  # Cambia esto según tu usuario SSH
VPS_IP="89.117.32.202"
VPS_DOMAIN="argmed.online"
VPS_PATH="/var/www/argmed.online"  # Cambia esto según tu configuración

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🔧 Building project for production...${NC}"
npm run build

if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Build failed! dist directory not found.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"

echo -e "${YELLOW}📤 Preparing to deploy to VPS...${NC}"
echo -e "VPS: ${VPS_DOMAIN} (${VPS_IP})"

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
  echo -e "${YELLOW}⚠️  No SSH key found. You'll need to enter password.${NC}"
fi

# Create backup on VPS
echo -e "${YELLOW}💾 Creating backup on VPS...${NC}"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && tar -czf backup-\$(date +%Y%m%d-%H%M%S).tar.gz * 2>/dev/null || true"

# Upload files to VPS
echo -e "${YELLOW}📤 Uploading files to VPS...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'backup-*.tar.gz' \
  dist/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

# Copy .htaccess
echo -e "${YELLOW}📋 Copying .htaccess...${NC}"
scp public/.htaccess ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

# Set proper permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && chown -R www-data:www-data . && chmod -R 755 ."

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application is live at: https://${VPS_DOMAIN}${NC}"
