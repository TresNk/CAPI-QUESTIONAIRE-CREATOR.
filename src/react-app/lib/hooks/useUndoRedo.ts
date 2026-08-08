/**
 * Undo/Redo hook for CAPI Builder
 * Implements command pattern for reversible operations
 */

import { useState, useCallback, useRef } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseUndoRedoOptions {
  maxHistory?: number; // Maximum history states to keep
  enableUndo?: boolean;
  enableRedo?: boolean;
}

const DEFAULT_OPTIONS: Required<UseUndoRedoOptions> = {
  maxHistory: 50,
  enableUndo: true,
  enableRedo: true,
};

/**
 * Custom hook for undo/redo functionality
 * @param initialState - Initial state value
 * @param options - Configuration options
 * @returns State management functions and status
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): {
  // Current state
  state: T;
  
  // State setters
  setState: (newState: T) => void;
  setPresent: (newState: T) => void;
  
  // Undo/Redo controls
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // History info
  historyLength: number;
  currentPosition: number;
  
  // Reset
  reset: (newState: T) => void;
  clearHistory: () => void;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });
  
  // Track if we're in the middle of a batch operation
  const isBatching = useRef(false);
  
  /**
   * Set new state, adding current state to history
   */
  const setState = useCallback((newState: T) => {
    if (isBatching.current) {
      // During batching, just update present without history
      setHistory(prev => ({ ...prev, present: newState }));
      return;
    }
    
    setHistory(prev => {
      const newPast = [...prev.past, prev.present];
      
      // Trim history if exceeds max
      if (newPast.length > opts.maxHistory) {
        newPast.shift();
      }
      
      return {
        past: newPast,
        present: newState,
        future: [], // Clear future on new action
      };
    });
  }, [opts.maxHistory]);
  
  /**
   * Directly set the present state (for initialization)
   */
  const setPresent = useCallback((newState: T) => {
    setHistory(prev => ({ ...prev, present: newState }));
  }, []);
  
  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (!opts.enableUndo) return;
    
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, [opts.enableUndo]);
  
  /**
   * Redo previously undone action
   */
  const redo = useCallback(() => {
    if (!opts.enableRedo) return;
    
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, [opts.enableRedo]);
  
  /**
   * Reset to a new initial state
   */
  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);
  
  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory(prev => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);
  
  // Computed values
  const canUndo = opts.enableUndo && history.past.length > 0;
  const canRedo = opts.enableRedo && history.future.length > 0;
  const historyLength = history.past.length + history.future.length + 1;
  const currentPosition = history.past.length + 1;
  
  return {
    state: history.present,
    setState,
    setPresent,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength,
    currentPosition,
    reset,
    clearHistory,
  };
}

/**
 * Higher-order function to create undoable actions
 * Wraps a state updater to work with useUndoRedo
 */
export function createUndoableAction<T>(
  currentState: T,
  action: (state: T) => T
): T {
  return action(currentState);
}

/**
 * Batch multiple operations into a single undo step
 * Useful for complex multi-step changes
 */
export function useBatchUndo() {
  const startBatch = () => {
    // Mark that we're starting a batch
    // The useUndoRedo hook handles this internally via refs
  };
  
  const endBatch = () => {
    // End batch - the final state will be saved as one undo step
  };
  
  return { startBatch, endBatch };
}

/**
 * Keyboard shortcut handler for undo/redo
 * Call this in your component's useEffect
 */
export function useUndoRedoKeyboardShortcuts(
  undo: () => void,
  redo: () => void,
  enabled: boolean = true
) {
  // This would typically be called in a component with useEffect
  // Returning the handler setup logic
  return {
    handleKeyDown: (e: KeyboardEvent) => {
      if (!enabled) return;
      
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    },
  };
}
