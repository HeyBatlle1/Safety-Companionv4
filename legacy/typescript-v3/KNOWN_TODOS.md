# Known TODOs and Future Enhancements

## 🚨 Critical (Blockers for Production)
None currently - all critical items resolved.

## ⚠️ High Priority (Authentication & Security)

### Authentication System
**Location:** `backend/app/api/v1/admin.py:30-32`
**Status:** Documented placeholder
**Description:** Admin endpoints currently use a temporary admin user dependency. Need to implement proper authentication when user system is ready.
```python
# Current: Placeholder admin dependency
async def get_current_admin_user():
    return {"user_id": "admin", "is_admin": True}

# Future: Integrate with Clerk/Auth0/custom auth
```
**Impact:** Admin endpoints are unprotected. Safe for development, but must be addressed before production.
**Timeline:** Phase 2 - User Management System

### User ID Extraction
**Location:** `backend/app/api/v1/jha.py:114`
**Status:** Hardcoded UUID
**Description:** JHA endpoints use placeholder user_id instead of extracting from authentication token.
```python
# Current
user_id = UUID("00000000-0000-0000-0000-000000000000")

# Future: Extract from JWT/session
user_id = get_user_id_from_token(request)
```
**Timeline:** Phase 2 - User Management System

## 📋 Medium Priority (Feature Enhancements)

### Live JHA Updates
**Location:** `backend/app/api/v1/jha.py:117-118`
**Status:** Placeholder implementation
**Description:** Live update endpoint exists but needs full implementation in JHAService.
**What's Needed:**
- Implement voice-to-text processing
- Variable extraction from natural language
- Re-run Agent 2 & 3 with new conditions
- Generate crew alerts
**Timeline:** Phase 3 - Real-time Features

### JHA Update Acknowledgment
**Location:** `backend/app/api/v1/jha.py:155`
**Status:** Placeholder implementation
**Description:** Acknowledgment endpoint needs database persistence logic.
**What's Needed:**
- Update JHAUpdate model with acknowledgment details
- Track who acknowledged and when
- Close the safety loop for compliance
**Timeline:** Phase 3 - Real-time Features

## 🔧 Low Priority (Optional Enhancements)

### Anthropic API Integration
**Location:** `backend/requirements.txt:18`
**Status:** Commented out dependency
**Description:** Anthropic SDK ready to add when LLC account is set up.
```python
# anthropic==0.40.0  # TODO: Add when LLC account is set up
```
**Timeline:** When production Anthropic account is ready

### Debug Print Statements
**Location:** Multiple files in `backend/app/agents/`
**Status:** Active for development
**Description:** Various print() statements used for debugging agent execution. Consider converting to proper logging.
**Files:**
- `backend/app/agents/orchestrator.py` (lines 94, 107, 111, 128, 132, 151, 155, 176, 206)
- `backend/app/agents/profiles/jha_validator.py` (line 259)
- `backend/app/agents/profiles/risk_assessor.py` (line 264)
- `backend/app/agents/profiles/swiss_cheese_analyzer.py` (line 304)
- `backend/app/agents/registry.py` (lines 47, 55)
- `backend/app/agents/adapters/google.py` (lines 45, 58)
- `backend/app/agents/adapters/openrouter.py` (line 67)

**Action:** Keep for now - helpful for development. Convert to Python logging in production.
**Timeline:** Phase 4 - Production Hardening

### Database Initialization Prints
**Location:** `backend/init_db.py`
**Status:** Active for migration script
**Description:** Print statements for database migration feedback.
**Action:** Keep - these are intentional for CLI script output.

## ✅ Not Issues (Intentional)

### API Test Page Console Logs
**Location:** `frontend/app/api-test/page.tsx:17`
**Status:** Intentional for testing
**Description:** Console logs in test page for debugging API integration.
**Action:** Keep - this is a debug/test page.

### README Placeholder Keys
**Location:** `README.md:162-163,171`
**Status:** Example configuration
**Description:** Placeholder API keys in documentation (xxxxx values).
**Action:** Keep - these are examples, not real keys.

## 📊 Summary

| Priority | Count | Blocker? |
|----------|-------|----------|
| Critical | 0 | ❌ No |
| High | 2 | ⚠️ Production only |
| Medium | 2 | ❌ No |
| Low | 2 | ❌ No |

**Current Status:** ✅ All critical issues resolved. Application is fully functional for development and testing.

**Next Phase:** Focus on frontend development. Authentication and real-time features can be added in later phases.

---

*Last Updated: 2025-12-08*
*Version: v3.0.0-dev*
