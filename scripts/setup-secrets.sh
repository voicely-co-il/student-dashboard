#!/bin/bash
# Setup Supabase Edge Function Secrets
# Run: ./scripts/setup-secrets.sh

echo "Setting up Supabase Edge Function secrets..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Create .env file with required variables first."
    exit 1
fi

# Source .env file
set -a
source .env
set +a

# Required secrets for teacher-chat
echo "Setting GEMINI_API_KEY..."
if [ -n "$GEMINI_API_KEY" ]; then
    supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
else
    echo "  Warning: GEMINI_API_KEY not found in .env"
fi

echo "Setting OPENAI_API_KEY..."
if [ -n "$OPENAI_API_KEY" ]; then
    supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
else
    echo "  Warning: OPENAI_API_KEY not found in .env"
fi

echo "Setting NOTION_API_KEY..."
if [ -n "$NOTION_API_KEY" ]; then
    supabase secrets set NOTION_API_KEY="$NOTION_API_KEY"
else
    echo "  Warning: NOTION_API_KEY not found in .env"
fi

echo "Setting NOTION_CRM_DATABASE_ID..."
if [ -n "$NOTION_CRM_DATABASE_ID" ]; then
    supabase secrets set NOTION_CRM_DATABASE_ID="$NOTION_CRM_DATABASE_ID"
else
    echo "  Warning: NOTION_CRM_DATABASE_ID not found in .env"
fi

echo ""
echo "Done! Current secrets:"
supabase secrets list
