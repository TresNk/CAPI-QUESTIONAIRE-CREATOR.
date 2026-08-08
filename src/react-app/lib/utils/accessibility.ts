/**
 * Accessibility utilities for CAPI Builder
 * Provides ARIA labels, focus management, and keyboard navigation helpers
 */

import { useCallback, useRef } from 'react';

/**
 * Common ARIA label templates for consistent accessibility
 */
export const ARIA_LABELS = {
  // Navigation
  NAV_MAIN: 'Main navigation',
  NAV_QUESTION_LIST: 'Question list',
  NAV_SECTIONS: 'Survey sections',
  
  // Actions
  ACTION_ADD_QUESTION: 'Add new question',
  ACTION_ADD_SECTION: 'Add new section',
  ACTION_EDIT_QUESTION: (questionName: string) => `Edit question: ${questionName}`,
  ACTION_DELETE_QUESTION: (questionName: string) => `Delete question: ${questionName}`,
  ACTION_MOVE_UP: (itemName: string) => `Move ${itemName} up`,
  ACTION_MOVE_DOWN: (itemName: string) => `Move ${itemName} down`,
  ACTION_SAVE: 'Save questionnaire',
  ACTION_EXPORT: 'Export questionnaire',
  ACTION_IMPORT: 'Import questionnaire',
  ACTION_UNDO: 'Undo last action',
  ACTION_REDO: 'Redo last action',
  
  // Forms
  FORM_QUESTION: 'Question form',
  FORM_SECTION: 'Section form',
  FORM_VALIDATION: 'Validation rules',
  FORM_SKIP_LOGIC: 'Skip logic conditions',
  
  // Status
  STATUS_SAVING: 'Saving...',
  STATUS_SAVED: 'Saved successfully',
  STATUS_ERROR: 'Error occurred',
  STATUS_LOADING: 'Loading...',
  
  // Dialogs
  DIALOG_CONFIRM_DELETE: 'Confirm deletion',
  DIALOG_SETTINGS: 'Settings',
  DIALOG_HELP: 'Help',
  
  // Regions
  REGION_MAIN: 'Main content area',
  REGION_SIDEBAR: 'Sidebar panel',
  REGION_HEADER: 'Header',
  REGION_FOOTER: 'Footer',
} as const;

/**
 * ARIA roles for different UI elements
 */
export const ARIA_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  LIST: 'list',
  LIST_ITEM: 'listitem',
  MENU: 'menu',
  MENU_ITEM: 'menuitem',
  TAB: 'tab',
  TAB_LIST: 'tablist',
  TAB_PANEL: 'tabpanel',
  DIALOG: 'dialog',
  ALERT: 'alert',
  STATUS: 'status',
  PROGRESSBAR: 'progressbar',
  TREE: 'tree',
  TREE_ITEM: 'treeitem',
  GRID: 'grid',
  ROW: 'row',
  CELL: 'gridcell',
  COLUMNHEADER: 'columnheader',
  SEARCHBOX: 'searchbox',
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  RADIOGROUP: 'radiogroup',
  SWITCH: 'switch',
  SLIDER: 'slider',
  SPINBUTTON: 'spinbutton',
} as const;

/**
 * Live region politeness levels
 */
export type LiveRegionPoliteness = 'off' | 'polite' | 'assertive';

/**
 * Hook for managing focus within a component
 * Returns ref to attach to container and functions to manage focus
 */
export function useFocusManager<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  
  /**
   * Focus the first focusable element in the container
   */
  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusable = containerRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusable?.focus();
  }, []);
  
  /**
   * Focus the last focusable element in the container
   */
  const focusLast = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const lastElement = focusableElements[focusableElements.length - 1];
    lastElement?.focus();
  }, []);
  
  /**
   * Focus a specific element by selector
   */
  const focusElement = useCallback((selector: string) => {
    if (!containerRef.current) return;
    
    const element = containerRef.current.querySelector<HTMLElement>(selector);
    element?.focus();
  }, []);
  
  /**
   * Trap focus within container (for modals/dialogs)
   */
  const trapFocus = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    containerRef.current.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return {
    containerRef,
    focusFirst,
    focusLast,
    focusElement,
    trapFocus,
  };
}

/**
 * Hook for announcing messages to screen readers
 * Uses ARIA live regions
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);
  
  /**
   * Announce a message to screen readers
   * @param message - Message to announce
   * @param politeness - Level of politeness ('polite' or 'assertive')
   */
  const announce = useCallback((message: string, politeness: LiveRegionPoliteness = 'polite') => {
    // Create announcer if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', politeness);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only'; // Should be visually hidden but accessible
      announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }
    
    // Update the announcement
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', politeness);
      announcerRef.current.textContent = '';
      
      // Force reflow for screen readers to pick up the change
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
        }
      }, 100);
    }
  }, []);
  
  /**
   * Clear the current announcement
   */
  const clear = useCallback(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent = '';
    }
  }, []);
  
  return { announce, clear };
}

/**
 * Hook for keyboard navigation in lists/grids
 */
export function useKeyboardNavigation<T extends HTMLElement>(options?: {
  orientation?: 'vertical' | 'horizontal';
  cycle?: boolean;
  onActivate?: (index: number) => void;
}) {
  const {
    orientation = 'vertical',
    cycle = true,
    onActivate,
  } = options || {};
  
  const containerRef = useRef<T>(null);
  const focusedIndexRef = useRef<number>(-1);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemCount: number) => {
    if (itemCount === 0) return;
    
    const isVertical = orientation === 'vertical';
    const moveForward = isVertical ? e.key === 'ArrowDown' : e.key === 'ArrowRight';
    const moveBackward = isVertical ? e.key === 'ArrowUp' : e.key === 'ArrowLeft';
    
    let newIndex = focusedIndexRef.current;
    
    if (moveForward) {
      e.preventDefault();
      newIndex = Math.min(newIndex + 1, itemCount - 1);
    } else if (moveBackward) {
      e.preventDefault();
      newIndex = Math.max(newIndex - 1, 0);
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = itemCount - 1;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onActivate && focusedIndexRef.current >= 0) {
        onActivate(focusedIndexRef.current);
      }
      return;
    } else {
      return; // Don't update if no relevant key pressed
    }
    
    // Handle cycling
    if (cycle) {
      if (newIndex < 0) newIndex = itemCount - 1;
      if (newIndex >= itemCount) newIndex = 0;
    }
    
    focusedIndexRef.current = newIndex;
    
    // Move actual focus
    if (containerRef.current) {
      const items = containerRef.current.querySelectorAll<HTMLElement>('[role="option"], [role="menuitem"], button, [tabindex="0"]');
      const targetItem = items[newIndex];
      if (targetItem) {
        targetItem.focus();
      }
    }
  }, [orientation, cycle, onActivate]);
  
  return {
    containerRef,
    focusedIndex: focusedIndexRef.current,
    setFocusedIndex: (index: number) => { focusedIndexRef.current = index; },
    handleKeyDown,
  };
}

/**
 * Helper to create state-like ref for hooks without re-renders
 */
function useStateOrRef<T>(initialValue: T) {
  const ref = useRef<T>(initialValue);
  
  const setState = (value: T | ((prev: T) => T)) => {
    if (typeof value === 'function') {
      ref.current = (value as (prev: T) => T)(ref.current);
    } else {
      ref.current = value;
    }
  };
  
  return { current: ref.current, setState };
}

/**
 * Generate unique ID for ARIA relationships
 */
let ariaIdCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++ariaIdCounter}`;
}

/**
 * Check if element is currently focused
 */
export function isElementFocused(element: HTMLElement | null): boolean {
  return element === document.activeElement;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');
  
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Make an element visible to screen readers only
 */
export const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

/**
 * Validate ARIA attributes for common issues
 */
export function validateAriaAttributes(element: HTMLElement): string[] {
  const errors: string[] = [];
  
  // Check for valid role
  const role = element.getAttribute('role');
  const validRoles = Object.values(ARIA_ROLES);
  if (role && !validRoles.includes(role as any)) {
    errors.push(`Invalid ARIA role: ${role}`);
  }
  
  // Check aria-labelledby references exist
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    for (const id of ids) {
      if (!document.getElementById(id)) {
        errors.push(`aria-labelledby reference not found: ${id}`);
      }
    }
  }
  
  // Check aria-describedby references exist
  const describedBy = element.getAttribute('aria-describedby');
  if (describedBy) {
    const ids = describedBy.split(/\s+/);
    for (const id of ids) {
      if (!document.getElementById(id)) {
        errors.push(`aria-describedby reference not found: ${id}`);
      }
    }
  }
  
  // Check for required child roles
  if (role === 'listbox' || role === 'menu' || role === 'radiogroup') {
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      const childRole = children[i].getAttribute('role');
      if (!childRole) {
        errors.push(`${role} element has child without role attribute`);
      }
    }
  }
  
  return errors;
}
