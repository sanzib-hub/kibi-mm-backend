#!/usr/bin/env bash
#
# cleanup-history.sh — Strip exposed secrets from git history using BFG Repo-Cleaner
#
# IMPORTANT: Do NOT run this script without team coordination.
# After running, all team members must re-clone their repos.
#
# Prerequisites:
#   - Java Runtime Environment (JRE 8+)
#   - Network access to download BFG jar
#   - Write access to push --force to all affected repos
#
# Usage:
#   chmod +x cleanup-history.sh
#   ./cleanup-history.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BFG_VERSION="1.14.0"
BFG_JAR="$SCRIPT_DIR/bfg-${BFG_VERSION}.jar"
BFG_URL="https://repo1.maven.org/maven2/com/madgasser/bfg/bfg/${BFG_VERSION}/bfg-${BFG_VERSION}.jar"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW} KIBI Git History Secret Cleanup${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${RED}WARNING: This script will rewrite git history for 3 repositories.${NC}"
echo -e "${RED}All team members will need to re-clone after force-pushing.${NC}"
echo ""
read -p "Have you coordinated with the team and confirmed it's safe to proceed? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    echo "Aborted. Coordinate with team before running."
    exit 1
fi

# Step 1: Download BFG if not present
if [[ ! -f "$BFG_JAR" ]]; then
    echo -e "${GREEN}Downloading BFG Repo-Cleaner v${BFG_VERSION}...${NC}"
    curl -L -o "$BFG_JAR" "$BFG_URL"
    echo "Downloaded to $BFG_JAR"
else
    echo -e "${GREEN}BFG jar already present at $BFG_JAR${NC}"
fi

# Verify Java is available
if ! command -v java &> /dev/null; then
    echo -e "${RED}Error: Java is required but not found. Install JRE 8+ and try again.${NC}"
    exit 1
fi

# Step 2: Create secrets file for BFG --replace-text
# BFG replaces matched strings with ***REMOVED***
SECRETS_FILE="$SCRIPT_DIR/secrets-to-remove.txt"
cat > "$SECRETS_FILE" << 'SECRETS_EOF'
# Populate this file with one secret per line before running.
# Obtain the compromised values from your password manager.
# This cleanup was already executed on Mar 2, 2026.
SECRETS_EOF

echo ""
echo -e "${GREEN}Created secrets file with $(wc -l < "$SECRETS_FILE") patterns to strip.${NC}"

# Step 3: Process each affected repo
REPOS=("kibi-backend-rework" "mobile-app-refactor" "web_admin_fe")

for REPO in "${REPOS[@]}"; do
    REPO_PATH="$SCRIPT_DIR/$REPO"

    if [[ ! -d "$REPO_PATH/.git" ]]; then
        echo -e "${RED}Skipping $REPO — not found at $REPO_PATH${NC}"
        continue
    fi

    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW} Processing: $REPO${NC}"
    echo -e "${YELLOW}========================================${NC}"

    # Run BFG to replace secret strings in history
    echo -e "${GREEN}Running BFG --replace-text on $REPO...${NC}"
    java -jar "$BFG_JAR" --replace-text "$SECRETS_FILE" "$REPO_PATH"

    # Also remove any .env files and service account JSON from history
    echo -e "${GREEN}Running BFG to remove .env files and service account keys from history...${NC}"
    java -jar "$BFG_JAR" --delete-files '.env' "$REPO_PATH"
    java -jar "$BFG_JAR" --delete-files 'firebase.service.account.json' "$REPO_PATH"

    # Clean up git objects
    echo -e "${GREEN}Running git gc on $REPO...${NC}"
    pushd "$REPO_PATH" > /dev/null
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    popd > /dev/null

    echo -e "${GREEN}Done processing $REPO.${NC}"
done

# Clean up secrets file
rm -f "$SECRETS_FILE"

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW} History cleanup complete!${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Verify the cleanup worked by searching for secrets:"
echo "   for repo in kibi-backend-rework mobile-app-refactor web_admin_fe; do"
echo '     echo "=== $repo ===" '
echo '     cd "'$SCRIPT_DIR'/$repo"'
echo '     git log --all -p | grep -iE "<pattern1>|<pattern2>|..." || echo "  Clean!"'
echo "     cd .."
echo "   done"
echo ""
echo "2. Force-push each repo (requires admin access):"
echo "   for repo in kibi-backend-rework mobile-app-refactor web_admin_fe; do"
echo '     cd "'$SCRIPT_DIR'/$repo"'
echo '     git push --force --all'
echo '     git push --force --tags'
echo "     cd .."
echo "   done"
echo ""
echo "3. Notify ALL team members to:"
echo "   - Delete their local clones"
echo "   - Re-clone from the remote"
echo "   - Do NOT merge old branches into the cleaned repo"
echo ""
echo "4. On GitHub, go to each repo → Settings → Danger Zone → "
echo "   'Delete cached views' to clear GitHub's cached copies"
echo ""
echo -e "${RED}IMPORTANT: After force-pushing, complete credential rotation${NC}"
echo -e "${RED}as documented in CREDENTIAL_ROTATION.md${NC}"
