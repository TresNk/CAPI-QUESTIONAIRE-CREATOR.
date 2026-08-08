# CAPI Builder - Security & Architecture Gap Analysis

## Executive Summary

This document identifies security vulnerabilities, architectural gaps, and missing features in the CAPI Builder application. The analysis covers code quality, data integrity, user experience, and production readiness.

---

## 🔴 Critical Security Issues

### 1. **LocalStorage Data Exposure** (HIGH PRIORITY)
**Location:** `/workspace/src/react-app/lib/hooks/useAutoSave.ts`

**Issues:**
- Sensitive survey data stored unencrypted in localStorage
- No data expiration or cleanup mechanism
- Vulnerable to XSS attacks that could exfiltrate questionnaire data
- No user authentication/authorization layer

**Impact:** Data breach, unauthorized access to survey designs

**Recommendations:**
```typescript
// Add encryption layer
import { encrypt, decrypt } from './crypto';

const STORAGE_KEY = 'capi-builder-questionnaire';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

// Encrypt before saving
localStorage.setItem(STORAGE_KEY, encrypt(JSON.stringify(data), ENCRYPTION_KEY));

// Decrypt when loading
const stored = localStorage.getItem(STORAGE_KEY);
const data = JSON.parse(decrypt(stored, ENCRYPTION_KEY));
```

### 2. **Missing Input Sanitization** (MEDIUM-HIGH PRIORITY)
**Location:** Multiple components accepting user input

**Issues:**
- `customSkipLogic` field accepts arbitrary code without validation
- `calculationFormula` field not sanitized before processing
- Question text and variable names not escaped for CSPro output
- Potential for injection attacks in generated code

**Impact:** Code injection, malformed CSPro scripts, data corruption

**Recommendations:**
```typescript
// Add sanitization utility
export function sanitizeInput(input: string, context: 'variable' | 'formula' | 'text'): string {
  switch (context) {
    case 'variable':
      return input.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50);
    case 'formula':
      // Only allow safe mathematical operations
      if (!/^[\d\+\-\*\/\(\)\[\]\s]+$/.test(input)) {
        throw new Error('Invalid formula characters');
      }
      return input;
    case 'text':
      return input.replace(/[<>\"\'&]/g, escapeChar);
  }
}
```

### 3. **No CSRF Protection** (MEDIUM PRIORITY)
**Location:** Application-wide

**Issues:**
- No CSRF tokens for state-modifying operations
- State changes via direct function calls without validation
- No request origin verification

**Impact:** Unauthorized state modifications via malicious links

---

## 🟡 Architectural Gaps

### 4. **Type Inconsistency** (MEDIUM PRIORITY)
**Location:** `/workspace/src/react-app/types/survey.ts` vs `/workspace/src/react-app/lib/utils/crossFieldValidation.ts`

**Issues:**
- `Questionnaire` interface defined locally in `useAutoSave.ts` instead of shared types
- `skipLogic` property referenced in validation but not defined in `SurveyQuestion` type
- `isCalculated` and `calculationFormula` used in validation but missing from type definition
- `requiredIf` validation exists but not in `ValidationRules` interface

**Current Type Definition:**
```typescript
export interface SurveyQuestion {
  id: string;
  variableName: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  condition?: Condition;
  customSkipLogic?: string;
  // MISSING: skipLogic, isCalculated, calculationFormula
}
```

**Recommended Fix:**
```typescript
export interface SkipLogicCondition {
  targetQuestionId: string;
  operator: string;
  value: string | number;
}

export interface ValidationRules {
  required?: boolean;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  requiredIf?: {
    questionId: string;
    value: string | number;
  };
  dateRange?: {
    minDate: string;
    maxDate: string;
  };
}

export interface SurveyQuestion {
  id: string;
  variableName: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  condition?: Condition;
  customSkipLogic?: string;
  skipLogic?: {
    conditions: SkipLogicCondition[];
  };
  isCalculated?: boolean;
  calculationFormula?: string;
  length?: number;
  decimalPlaces?: number;
  validation?: ValidationRules;
  sectionId?: string;
  parentQuestionId?: string;
  isGridQuestion?: boolean;
  subQuestions?: SurveyQuestion[];
  codeListId?: string;
}
```

### 5. **Missing Error Boundaries** (MEDIUM PRIORITY)
**Location:** Application-wide

**Issues:**
- No React error boundaries to catch runtime errors
- Single component failure can crash entire app
- No graceful degradation

**Recommendations:**
```typescript
// Create ErrorBoundary component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 6. **No Data Export/Import** (MEDIUM PRIORITY)
**Location:** Missing feature

**Issues:**
- Users cannot backup questionnaires
- No way to share questionnaire definitions
- Vendor lock-in to browser storage

**Recommendations:**
- Add JSON export/import functionality
- Support CSV export for collected data
- Add version history with rollback capability

---

## 🟢 Missing Features

### 7. **Incomplete Validation System** (LOW-MEDIUM PRIORITY)
**Status:** Partially implemented in `crossFieldValidation.ts`

**Missing Validations:**
- Circular dependency detection in skip logic (not just calculations)
- Date format validation (YYYYMMDD for CSPro)
- Code list value uniqueness
- Section ordering validation
- Maximum questionnaire size limits
- Variable name collision with CSPro reserved words

**Recommended Additions:**
```typescript
// Reserved CSPro keywords
const RESERVED_WORDS = ['ID', 'CASE_ID', 'OCCUR', 'CHECKME', 'ERRMSG'];

// Add to validation
if (RESERVED_WORDS.includes(question.variableName.toUpperCase())) {
  errors.push({
    questionId: question.id,
    field: 'variableName',
    message: `Variable name "${question.variableName}" is reserved in CSPro`,
    severity: 'error'
  });
}
```

### 8. **No Undo/Redo Functionality** (LOW-MEDIUM PRIORITY)
**Impact:** Poor UX, accidental changes cannot be reverted

**Implementation:**
```typescript
// Use useReducer with history
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

function undoReducer(state, action) {
  switch (action.type) {
    case 'UNDO': /* ... */
    case 'REDO': /* ... */
    case 'SET': /* ... */
  }
}
```

### 9. **Missing Keyboard Shortcuts** (LOW PRIORITY)
**Impact:** Reduced productivity for power users

**Recommended Shortcuts:**
- `Ctrl+S`: Save/Export
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `Ctrl+Enter`: Add question
- `Escape`: Close dialogs

### 10. **No Collaboration Features** (LOW PRIORITY)
**Missing:**
- Multi-user editing
- Change tracking/comments
- Role-based permissions
- Real-time sync

---

## 🔵 Performance Concerns

### 11. **Inefficient Re-renders** (LOW-MEDIUM PRIORITY)
**Location:** `Home.tsx`, `QuestionList.tsx`

**Issues:**
- Large questionnaires cause performance degradation
- No virtualization for long question lists
- useMemo underutilized

**Recommendations:**
```typescript
// Add virtualization for question lists
import { FixedSizeList } from 'react-window';

// Memoize expensive computations
const processedQuestions = useMemo(() => {
  return questions.map(q => heavyTransformation(q));
}, [questions]);
```

### 12. **LocalStorage Size Limits** (MEDIUM PRIORITY)
**Issue:** localStorage limited to ~5-10MB per domain

**Impact:** Large questionnaires with many code lists may exceed limits

**Solutions:**
- Implement compression before storage
- Use IndexedDB for larger datasets
- Add storage quota warnings

---

## 🟣 User Experience Gaps

### 13. **No Onboarding/Tutorials** (LOW PRIORITY)
**Missing:**
- First-time user guide
- Tooltips for complex features
- Example questionnaires
- Video tutorials

### 14. **Limited Accessibility** (MEDIUM PRIORITY)
**Issues:**
- Missing ARIA labels on custom components
- No keyboard navigation in some areas
- Color contrast issues in dark theme
- Screen reader compatibility not tested

**Recommendations:**
```typescript
// Add ARIA labels
<button aria-label="Delete question" aria-describedby="delete-help">
  <TrashIcon />
</button>
<span id="delete-help" className="sr-only">
  This will permanently remove the question
</span>
```

### 15. **No Mobile Optimization** (LOW PRIORITY)
**Issues:**
- Complex forms difficult on small screens
- Touch targets too small
- No responsive layout testing

---

## 📋 Implementation Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 P0 | LocalStorage Encryption | Medium | High |
| 🔴 P0 | Input Sanitization | Low | High |
| 🟡 P1 | Type Consistency | Medium | Medium |
| 🟡 P1 | Error Boundaries | Low | Medium |
| 🟡 P1 | Data Export/Import | Medium | Medium |
| 🟢 P2 | Complete Validation | Medium | Low |
| 🟢 P2 | Undo/Redo | Medium | Low |
| 🔵 P3 | Performance Optimization | High | Medium |
| 🟣 P4 | Accessibility | Medium | Low |

---

## 🛠️ Recommended Next Steps

### Immediate (This Sprint):
1. **Fix Type Definitions** - Add missing properties to `SurveyQuestion` interface
2. **Add Input Sanitization** - Create and apply sanitization utilities
3. **Implement Error Boundaries** - Wrap main components

### Short-term (Next 2 Weeks):
4. **Add Encryption Layer** - Protect localStorage data
5. **Complete Validation System** - Add all missing validations
6. **Data Export/Import** - Enable backup and sharing

### Medium-term (Next Month):
7. **Undo/Redo System** - Improve UX
8. **Performance Optimization** - Add virtualization and memoization
9. **Accessibility Audit** - Fix ARIA labels and keyboard navigation

### Long-term (Future Releases):
10. **Collaboration Features** - Multi-user support
11. **Mobile App** - Native mobile experience
12. **Cloud Sync** - Server-side storage and sync

---

## 📝 Code Review Checklist

- [ ] All user inputs sanitized before storage/use
- [ ] Type definitions match actual usage
- [ ] Error boundaries in place
- [ ] Sensitive data encrypted
- [ ] No hardcoded secrets or API keys
- [ ] Proper error handling throughout
- [ ] Accessibility features implemented
- [ ] Performance tested with large datasets
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness checked

---

*Generated: $(date)*
*Analyzer: Security & Architecture Review*
