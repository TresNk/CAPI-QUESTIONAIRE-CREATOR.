import { useEffect, useState, useCallback } from 'react';
import type { SurveyQuestion, SurveySection } from '../../types/survey';
import { encryptData, decryptData } from '../utils/encryption';

export interface Questionnaire {
  id: string;
  name: string;
  description: string;
  version: string;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  codeLists: any[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'capi-builder-questionnaire';
const SAVE_DELAY_MS = 1000; // Debounce time
const ENCRYPTION_SALT = 'capi-builder-auto-save-v1';

export function useAutoSave(data: Questionnaire | null) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!data) {
      setStatus('idle');
      return;
    }

    setStatus('saving');

    const timer = setTimeout(() => {
      try {
        // Use encrypted storage
        const encrypted = encryptData(data, ENCRYPTION_SALT);
        localStorage.setItem(STORAGE_KEY, encrypted);
        setLastSaved(new Date());
        setStatus('saved');
        
        // Reset to idle after showing saved state briefly
        const resetTimer = setTimeout(() => setStatus('idle'), 2000);
        return () => clearTimeout(resetTimer);
      } catch (error) {
        console.error('Failed to auto-save:', error);
        setStatus('error');
      }
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [data]);

  return { status, lastSaved };
}

export function useQuestionnaireLoader() {
  const [loadedData, setLoadedData] = useState<Questionnaire | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Try to decrypt the data
        const decrypted = decryptData<Questionnaire>(stored, ENCRYPTION_SALT);
        if (decrypted && typeof decrypted === 'object') {
          setLoadedData(decrypted);
          setHasDraft(true);
        } else {
          // Decryption failed, data might be corrupted or in old format
          console.warn('Failed to decrypt stored questionnaire, clearing corrupted data');
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load questionnaire from storage:', error);
      // Corrupted storage, clear it
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasDraft(false);
    setLoadedData(null);
  }, []);

  return { loadedData, hasDraft, clearDraft, isLoading };
}
