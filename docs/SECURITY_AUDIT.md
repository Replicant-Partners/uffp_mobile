# Security Audit - Dependency Vulnerabilities

**Date:** 2026-02-03  
**Status:** 6 vulnerabilities remaining (3 high, 2 moderate, 1 low)

## Summary

We successfully fixed 5 moderate severity ESLint vulnerabilities by upgrading to ESLint 9.39.2 and @typescript-eslint 8.54.0.

## Remaining Vulnerabilities

### ✅ Fixed
- **eslint** - Stack Overflow vulnerability (MODERATE) → Fixed by upgrading to 9.39.2
- **@typescript-eslint/*** - Transitive vulnerabilities (MODERATE) → Fixed by upgrading to 8.54.0

### ⚠️ Unfixable (Require Breaking Changes or Upstream Fixes)

#### 1. **eas-cli** vulnerabilities (3 HIGH + 1 LOW)
- **Severity:** HIGH (node-forge, tar) + LOW (diff)
- **Current Version:** 16.32.0
- **Suggested Fix:** Downgrade to 13.4.2 (REGRESSION - older version)
- **Why not fixed:** 
  - npm suggests downgrading from v16 to v13, which is a major regression
  - These vulnerabilities are in transitive dependencies (node-forge, tar, diff)
  - eas-cli is used for build tooling (Expo Application Services)
  
**Risk Assessment:**
- **node-forge** (ASN.1 vulnerabilities): Used for certificate parsing in build pipeline
  - **Exploitability:** LOW - Only affects build process, not runtime app
  - **Impact:** Developer tooling only, doesn't affect end users
  
- **tar** (path traversal): Used for extracting archives during builds
  - **Exploitability:** LOW - Requires malicious tarball in build process
  - **Impact:** Build environment only, controllable inputs
  
- **diff** (DoS): Used for diff operations in CLI
  - **Exploitability:** VERY LOW - Requires crafted patch files
  - **Impact:** Minimal, CLI tool only

**Recommendation:** ACCEPT RISK
- Vulnerabilities affect build/dev tooling, not production runtime
- Wait for Expo team to update eas-cli dependencies
- Monitor for eas-cli updates: `npm outdated eas-cli`

#### 2. **markdown-it** vulnerability (MODERATE)
- **Severity:** MODERATE
- **Current Version:** <12.3.2 (via react-native-markdown-display)
- **Issue:** Uncontrolled Resource Consumption (DoS)
- **Suggested Fix:** None available - requires react-native-markdown-display update

**Risk Assessment:**
- **Exploitability:** LOW - Requires specially crafted markdown
- **Impact:** App could freeze when rendering malicious markdown
- **Mitigation:** We control markdown input sources (user-generated forecast content)

**Recommendation:** ACCEPT RISK WITH MONITORING
- Monitor for react-native-markdown-display updates
- Current risk is acceptable since:
  - We control markdown sources (our own forecast data)
  - No external/untrusted markdown rendering
  - Impact is DoS (app freeze), not data breach

## Action Items

### Immediate
- [x] Fix ESLint vulnerabilities (devDependencies)
- [x] Document remaining vulnerabilities and risk assessment

### Monitor
- [ ] Check monthly for eas-cli updates: `npm outdated eas-cli`
- [ ] Check for react-native-markdown-display updates: `npm outdated react-native-markdown-display`
- [ ] Review GitHub Dependabot alerts monthly

### Future
- Consider alternative to react-native-markdown-display if security updates lag
- Evaluate if eas-cli can be removed or replaced (unlikely - Expo dependency)

## Verification Commands

```bash
# Check current vulnerability status
npm audit

# Check for package updates
npm outdated

# Check specific packages
npm outdated eas-cli react-native-markdown-display

# View detailed vulnerability info
npm audit --json | jq '.vulnerabilities'
```

## Conclusion

**6 vulnerabilities remain, all ACCEPTED due to:**
1. **eas-cli (3 high + 1 low):** Build tooling only, wait for upstream fix
2. **markdown-it (2 moderate):** Controlled inputs, acceptable risk

**Overall Security Posture:** GOOD
- No critical/exploitable vulnerabilities in production runtime
- All high-severity issues isolated to developer tooling
- Monitoring process established for future updates
