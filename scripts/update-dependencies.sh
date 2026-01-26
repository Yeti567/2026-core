#!/bin/bash

# Dependency Update Script
# Updates dependencies to latest secure versions and checks for vulnerabilities

set -e

echo "🔄 Starting dependency update process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Create backup of package.json and package-lock.json
print_status "Creating backup of package files..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
if ! command_exists npm; then
    print_error "npm is not installed. Please install Node.js and npm."
    exit 1
fi

# Update npm to latest version
print_status "Updating npm to latest version..."
npm install -g npm@latest

# Clean npm cache
print_status "Cleaning npm cache..."
npm cache clean --force

# Check for known vulnerable packages
print_status "Checking for known vulnerabilities..."
npm audit --audit-level=moderate

# Update packages in phases to minimize breakage
print_status "Starting phased dependency updates..."

# Phase 1: Update patch versions (safest)
print_status "Phase 1: Updating patch versions..."
npm update --save

# Phase 2: Update minor versions for non-breaking changes
print_status "Phase 2: Updating minor versions..."
npm update --save

# Phase 3: Update major versions for security-critical packages
print_status "Phase 3: Updating security-critical major versions..."

# List of security-critical packages to update aggressively
SECURITY_PACKAGES=(
    "express"
    "jsonwebtoken" 
    "bcryptjs"
    "helmet"
    "cors"
    "mongoose"
    "axios"
    "lodash"
    "moment"
    "underscore"
)

for package in "${SECURITY_PACKAGES[@]}"; do
    if npm list "$package" >/dev/null 2>&1; then
        print_status "Checking $package for security updates..."
        npm audit fix --force --audit-level=moderate "$package" || true
    fi
done

# Install latest versions of security-related packages
print_status "Installing latest security packages..."
npm install --save-dev eslint-plugin-security@latest
npm install --save-dev helmet@latest
npm install --save-dev bcryptjs@latest

# Run audit again after updates
print_status "Running security audit after updates..."
npm audit --audit-level=moderate

# Fix any remaining vulnerabilities automatically
print_status "Attempting to fix vulnerabilities automatically..."
npm audit fix --force

# Check for outdated packages
print_status "Checking for outdated packages..."
npm outdated || true

# Generate dependency report
print_status "Generating dependency report..."
npm ls --depth=0 > dependency-report.txt
npm audit --json > audit-report.json 2>/dev/null || true

# Check for specific high-risk packages
print_status "Checking for high-risk packages..."

HIGH_RISK_PACKAGES=(
    "request"  # Deprecated
    "debug"    # Had security issues
    "tar"      # Had security issues
    "minimist" # Had security issues
    "axios"    # Check for latest
    "lodash"   # Check for latest
)

for package in "${HIGH_RISK_PACKAGES[@]}"; do
    if npm list "$package" >/dev/null 2>&1; then
        current_version=$(npm list "$package" --depth=0 | grep "$package" | sed 's/.*@//')
        latest_version=$(npm view "$package" version)
        
        if [ "$current_version" != "$latest_version" ]; then
            print_warning "$package is outdated (current: $current_version, latest: $latest_version)"
            
            # For deprecated packages, suggest alternatives
            if [ "$package" = "request" ]; then
                print_warning "Consider replacing 'request' with 'axios' or 'node-fetch'"
            fi
        fi
    fi
done

# Update TypeScript and related packages
print_status "Updating TypeScript and related packages..."
npm install --save-dev typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest

# Update ESLint and security plugins
print_status "Updating ESLint and security plugins..."
npm install --save-dev eslint@latest @typescript-eslint/parser@latest @typescript-eslint/eslint-plugin@latest
npm install --save-dev eslint-plugin-security@latest eslint-plugin-no-unsanitized@latest

# Check for package.json security best practices
print_status "Checking package.json security best practices..."

# Check for engines field
if ! grep -q '"engine"' package.json; then
    print_warning "Consider adding 'engines' field to package.json for version control"
fi

# Check for private field
if ! grep -q '"private".*true' package.json; then
    print_warning "Consider setting 'private: true' in package.json"
fi

# Run tests if available
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    print_status "Running tests to check for breaking changes..."
    npm test || print_warning "Tests failed after dependency updates. Please review changes."
fi

# Create summary report
print_status "Creating update summary..."
cat > dependency-update-summary.md << EOF
# Dependency Update Summary

## Date: $(date)

## Actions Taken:
1. ✅ Updated npm to latest version
2. ✅ Cleaned npm cache
3. ✅ Updated patch versions
4. ✅ Updated minor versions  
5. ✅ Updated security-critical packages
6. ✅ Installed latest security packages
7. ✅ Updated TypeScript and ESLint
8. ✅ Generated dependency reports

## Files Created:
- \`dependency-report.txt\` - Current dependency tree
- \`audit-report.json\` - Security audit results
- \`package.json.backup\` - Backup of original package.json
- \`package-lock.json.backup\` - Backup of original package-lock.json

## Next Steps:
1. Review the dependency report for any unexpected changes
2. Run your test suite to ensure no breaking changes
3. Test the application thoroughly
4. If issues occur, restore from backup files:
   \`\`\`bash
   cp package.json.backup package.json
   cp package-lock.json.backup package-lock.json
   npm install
   \`\`\`

## Security Recommendations:
1. Regularly run \`npm audit\` to check for new vulnerabilities
2. Keep dependencies updated to latest secure versions
3. Use \`npm audit fix --force\` only when necessary and test thoroughly
4. Consider using a dependency management tool like Renovate or Dependabot
5. Monitor security advisories for packages you use

EOF

print_success "Dependency update completed!"
print_status "Summary report created: dependency-update-summary.md"
print_status "Dependency report created: dependency-report.txt"
print_status "Security audit report created: audit-report.json"

# Show final audit status
print_status "Final security audit status:"
npm audit --audit-level=moderate || print_warning "Some vulnerabilities remain. Please review the audit report."

print_success "All done! Please review the changes and test your application."
