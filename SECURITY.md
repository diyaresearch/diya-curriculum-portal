# Security Guide

## Issue #376 Resolution - Exposed API Keys

### Security Issues Identified:
- Stripe publishable keys were exposed in committed `.env` files
- Environment configuration files were tracked in git history
- Sensitive configuration was accessible in public repository

### Actions Taken:
1. ✅ **Immediate**: Removed `.env` files from git tracking
2. ✅ **Prevention**: Updated `.gitignore` to prevent future exposure
3. ✅ **Templates**: Created `.env.example` files with safe placeholder values
4. ✅ **Documentation**: Added clear environment setup instructions

### ⚠️ REQUIRED ACTIONS:

#### 1. Rotate Exposed Keys (CRITICAL)
Since keys were in git history, they should be considered compromised:

**Stripe Keys:**
- The following Stripe key was exposed: `pk_test_51PYERERqWgqDVRD3kSuQgmgKNIWup77t7Rxsh2mqIsnDDRbCtjuiYh8DCvSO84i5R9FTOgBEzvvr21qHjMGTjvWn00Dwdt2QDv`
- **Action Required**: Rotate this key in your Stripe dashboard immediately
- Update all environment files with the new key

#### 2. Git History Cleanup (RECOMMENDED)
For complete security, clean git history using BFG Repo-Cleaner:
```bash
# Install BFG Repo-Cleaner
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Clean the repository
git clone --mirror https://github.com/diyaresearch/diya-curriculum-portal.git temp-repo
cd temp-repo
bfg --delete-files '*.env*' --delete-files 'serviceAccountKey.json'
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force

# Update all collaborators to re-clone
```

#### 3. Security Audit
- [ ] Verify no other sensitive data is in git history
- [ ] Review all configuration files for hardcoded secrets
- [ ] Implement pre-commit hooks to prevent future exposure
- [ ] Set up secret scanning tools (GitHub secret scanning, GitLeaks, etc.)

### Best Practices Going Forward:

1. **Never commit sensitive data**
   - API keys, secrets, passwords
   - Service account files
   - Database connection strings
   - Any production configuration

2. **Use `.env.example` pattern**
   - Commit template files with placeholder values
   - Document all required environment variables
   - Include setup instructions in README

3. **Environment file management**
   - Copy `.env.example` to `.env.development` locally
   - Never track actual `.env` files in git
   - Use different keys for development vs production

4. **Secret management in production**
   - Use platform-specific secret management (Heroku config vars, AWS Secrets Manager, etc.)
   - Avoid putting secrets in Dockerfiles or CI/CD configs
   - Rotate keys regularly

### Verification Checklist:
- [ ] Stripe keys have been rotated
- [ ] All `.env` files are listed in `.gitignore`
- [ ] New environment setup works correctly
- [ ] Team members have been notified of security changes
- [ ] Git history cleanup completed (if applicable)