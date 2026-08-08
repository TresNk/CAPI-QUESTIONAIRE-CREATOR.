/**
 * Performance optimization utilities for CAPI Builder
 * Helps with memoization, virtualization, and efficient rendering
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Deep comparison utility for complex objects
 * Use sparingly as it can be expensive for large objects
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (typeof a !== typeof b) return false;
  
  if (a === null || b === null) return a === b;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== (b as any[]).length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], (b as any[])[i])) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], (b as Record<string, any>)[key])) return false;
  }
  
  return true;
}

/**
 * Custom hook for memoizing expensive calculations with custom comparison
 * @param fn - Function to compute the value
 * @param deps - Dependencies array
 * @param compareFn - Optional custom comparison function
 */
export function useCustomMemo<T>(
  fn: () => T,
  deps: any[],
  compareFn: (prev: any[], next: any[]) => boolean = deepEqual
): T {
  const prevDepsRef = useRef<any[] | null>(null);
  const resultRef = useRef<T>(fn());
  
  if (!prevDepsRef.current || !compareFn(prevDepsRef.current, deps)) {
    resultRef.current = fn();
    prevDepsRef.current = deps;
  }
  
  return resultRef.current;
}

/**
 * Hook to prevent unnecessary re-renders with shallow comparison
 * Similar to React.memo but for hooks
 */
export function useShallowCompareProps<T extends object>(props: T): T {
  const prevPropsRef = useRef<T | null>(null);
  
  if (!prevPropsRef.current) {
    prevPropsRef.current = props;
    return props;
  }
  
  const prevProps = prevPropsRef.current;
  const keys = Object.keys(props) as (keyof T)[];
  
  // Check if all keys are equal with shallow comparison
  let isEqual = keys.length === Object.keys(prevProps).length;
  
  if (isEqual) {
    for (const key of keys) {
      if (props[key] !== prevProps[key]) {
        isEqual = false;
        break;
      }
    }
  }
  
  if (isEqual) {
    return prevProps;
  }
  
  prevPropsRef.current = props;
  return props;
}

/**
 * Debounce hook for delaying function execution
 * Useful for search inputs, resize handlers, etc.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useStateOrRef(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue.current;
}

/**
 * Throttle hook for limiting function execution rate
 * Useful for scroll handlers, window resize, etc.
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useStateOrRef(value);
  const lastUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    const now = Date.now();
    
    if (now - lastUpdateRef.current >= interval) {
      setThrottledValue(value);
      lastUpdateRef.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateRef.current = Date.now();
      }, interval - (now - lastUpdateRef.current));
      
      return () => clearTimeout(timer);
    }
  }, [value, interval]);
  
  return throttledValue.current;
}

/**
 * Virtual list renderer data preparation
 * Calculates which items to render based on scroll position
 */
export interface VirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render beyond visible area
}

export interface VirtualListResult {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
  visibleItems: number;
}

export function useVirtualList(
  itemCount: number,
  options: VirtualListOptions,
  scrollTop: number = 0
): VirtualListResult {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  
  const totalHeight = itemCount * itemHeight;
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  
  // Calculate start index based on scroll position
  let startIndex = Math.floor(scrollTop / itemHeight);
  startIndex = Math.max(0, Math.min(startIndex, itemCount - visibleItems));
  
  // Add overscan
  startIndex = Math.max(0, startIndex - overscan);
  
  // Calculate end index
  let endIndex = startIndex + visibleItems + (overscan * 2);
  endIndex = Math.min(itemCount, endIndex);
  
  // Calculate offset for positioning
  const offsetY = startIndex * itemHeight;
  
  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    visibleItems,
  };
}

/**
 * Memoize callback with dependency tracking
 * Only recreates the callback when dependencies actually change
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  fn: T,
  deps: any[]
): T {
  const fnRef = useRef(fn);
  const depsRef = useRef(deps);
  
  // Always update the function reference
  fnRef.current = fn;
  
  // Create stable wrapper
  const stableFn = useCallback((...args: any[]) => {
    return fnRef.current(...args);
  }, []);
  
  // Check if dependencies changed significantly
  if (!depsRef.current || deps.length !== depsRef.current.length) {
    depsRef.current = deps;
  }
  
  return stableFn as T;
}

/**
 * Batch multiple state updates together
 * Prevents multiple re-renders for related state changes
 */
export function useBatchUpdates() {
  const pendingUpdatesRef = useRef<(() => void)[]>([]);
  const isBatchingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  
  const scheduleUpdate = useCallback((updateFn: () => void) => {
    pendingUpdatesRef.current.push(updateFn);
    
    if (!isBatchingRef.current) {
      isBatchingRef.current = true;
      
      // Use requestAnimationFrame for optimal batching
      rafIdRef.current = requestAnimationFrame(() => {
        const updates = [...pendingUpdatesRef.current];
        pendingUpdatesRef.current = [];
        
        updates.forEach(fn => fn());
        
        isBatchingRef.current = false;
        rafIdRef.current = null;
      });
    }
  }, []);
  
  const flushUpdates = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    const updates = [...pendingUpdatesRef.current];
    pendingUpdatesRef.current = [];
    updates.forEach(fn => fn());
    isBatchingRef.current = false;
  }, []);
  
  return { scheduleUpdate, flushUpdates, isBatching: isBatchingRef.current };
}

/**
 * Lazy load component data only when needed
 * Useful for large forms or complex components
 */
export function useLazyLoad<T>(
  loadData: () => Promise<T>,
  options?: { threshold?: number; rootMargin?: string }
): { data: T | null; isLoading: boolean; error: Error | null; hasLoaded: boolean } {
  const [data, setData] = useStateOrRef<T | null>(null);
  const [isLoading, setIsLoading] = useStateOrRef(false);
  const [error, setError] = useStateOrRef<Error | null>(null);
  const [hasLoaded, setHasLoaded] = useStateOrRef(false);
  
  const loadRef = useRef<(() => Promise<void>) | null>(null);
  
  if (!loadRef.current) {
    loadRef.current = async () => {
      if (hasLoaded.current || isLoading.current) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await loadData();
        setData(result);
        setHasLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load'));
      } finally {
        setIsLoading(false);
      }
    };
  }
  
  return {
    data: data.current,
    isLoading: isLoading.current,
    error: error.current,
    hasLoaded: hasLoaded.current,
    load: loadRef.current,
  };
}

/**
 * Helper to create state-like ref for hooks without re-renders
 */
function useStateOrRef<T>(initialValue: T) {
  const ref = useRef<T>(initialValue);
  
  const setValue = (value: T | ((prev: T) => T)) => {
    if (typeof value === 'function') {
      ref.current = (value as (prev: T) => T)(ref.current);
    } else {
      ref.current = value;
    }
  };
  
  return { current: ref.current, setState: setValue };
}

/**
 * Compare two arrays by reference and length first, then deeply if needed
 * Faster than full deep comparison for most cases
 */
export function compareArrays(a: any[], b: any[]): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  
  // Quick reference check for all elements
  let allReferencesEqual = true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      allReferencesEqual = false;
      break;
    }
  }
  
  if (allReferencesEqual) return true;
  
  // Fall back to deep comparison
  return deepEqual(a, b);
}

/**
 * Create a memoized selector for extracting data from state
 * Similar to Reselect library but simpler
 */
export function createSelector<TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn: (a: TResult, b: TResult) => boolean = deepEqual
) {
  let lastResult: TResult | undefined;
  let lastState: TState | undefined;
  
  return (state: TState): TResult => {
    if (lastState !== undefined && equalityFn(lastState, state)) {
      return lastResult!;
    }
    
    lastState = state;
    lastResult = selector(state);
    return lastResult;
  };
}

/**
 * Track render count for debugging performance issues
 */
export function useRenderCounter(label: string = 'Component') {
  const countRef = useRef(0);
  countRef.current += 1;
  
  useEffect(() => {
    // Uncomment to log render counts in development
    // console.log(`${label} rendered ${countRef.current} times`);
  });
  
  return countRef.current;
}

/**
 * Detect if component is mounted
 * Useful for preventing state updates on unmounted components
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(false);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return () => isMountedRef.current;
}
