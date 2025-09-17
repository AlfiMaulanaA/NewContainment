"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseVirtualKeyboardOptions {
  autoShow?: boolean; // Show keyboard when input is focused
  autoHide?: boolean; // Hide keyboard when clicking outside
  layout?: 'qwerty' | 'numeric' | 'alphanumeric';
  position?: 'bottom' | 'center' | 'top' | 'left' | 'right';
}

export interface UseVirtualKeyboardReturn {
  isKeyboardVisible: boolean;
  showKeyboard: () => void;
  hideKeyboard: () => void;
  toggleKeyboard: () => void;
  handleKeyPress: (key: string) => void;
  handleKeyAction: (action: 'backspace' | 'enter' | 'space' | 'clear') => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  currentPosition: 'bottom' | 'center' | 'top' | 'left' | 'right';
  setPosition: (position: 'bottom' | 'center' | 'top' | 'left' | 'right') => void;
  keyboardProps: {
    isVisible: boolean;
    onClose: () => void;
    onKeyPress: (key: string) => void;
    onKeyAction: (action: 'backspace' | 'enter' | 'space' | 'clear') => void;
    layout?: 'qwerty' | 'numeric' | 'alphanumeric';
    position?: 'bottom' | 'center' | 'top' | 'left' | 'right';
    onPositionChange?: (position: 'bottom' | 'center' | 'top' | 'left' | 'right') => void;
    showPositionControls?: boolean;
  };
  restoreFromBackup: () => boolean;
}

export function useVirtualKeyboard(options: UseVirtualKeyboardOptions = {}): UseVirtualKeyboardReturn {
  const {
    autoShow = true,
    autoHide = true,
    layout = 'qwerty',
    position = 'bottom'
  } = options;

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<'bottom' | 'center' | 'top' | 'left' | 'right'>(position);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const valueBackupRef = useRef<string>('');

  const showKeyboard = useCallback(() => {
    setIsKeyboardVisible(true);
  }, []);

  const hideKeyboard = useCallback(() => {
    const currentValue = inputRef.current?.value || '';
    console.log('Hiding keyboard, current input value:', `"${currentValue}"`);

    // Update backup before hiding
    if (currentValue) {
      valueBackupRef.current = currentValue;
    }

    setIsKeyboardVisible(false);
  }, []);

  const toggleKeyboard = useCallback(() => {
    setIsKeyboardVisible(prev => !prev);
  }, []);

  const setPosition = useCallback((newPosition: 'bottom' | 'center' | 'top' | 'left' | 'right') => {
    setCurrentPosition(newPosition);
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    const input = inputRef.current;
    if (!input) return;

    // Focus the input and wait for focus to be established
    input.focus();

    // Use a timeout to ensure focus is established and cursor position is available
    setTimeout(() => {
      // Get cursor position after focus is established
      let start = input.selectionStart;
      let end = input.selectionEnd;

      // Check if input type supports selection
      const supportsSelection = !['email', 'number', 'tel', 'url'].includes(input.type);

      // If cursor position is not available, default to end of text
      if (start === null || end === null || !supportsSelection) {
        start = end = input.value.length;
      }

      const currentValue = input.value;

      // Create new value by inserting key at cursor position
      const newValue = currentValue.slice(0, start) + key + currentValue.slice(end);
      const newCursorPos = start + key.length;

      console.log('Typing debug:', {
        key,
        start,
        end,
        currentValue: `"${currentValue}"`,
        newValue: `"${newValue}"`,
        newCursorPos
      });

      // Update input value
      input.value = newValue;

      // Backup the new value
      valueBackupRef.current = newValue;

      // Trigger React onChange event
      const event = new Event('input', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: input,
        enumerable: true,
        configurable: true,
        writable: false
      });
      input.dispatchEvent(event);

      // Set new cursor position (skip for input types that don't support selection)
      if (supportsSelection) {
        try {
          input.setSelectionRange(newCursorPos, newCursorPos);
        } catch (e) {
          console.log('Failed to set selection range:', e);
        }
      }
    }, 1);
  }, []);

  const handleKeyAction = useCallback((action: 'backspace' | 'enter' | 'space' | 'clear') => {
    const input = inputRef.current;
    if (!input) return;

    // Ensure input is focused first
    input.focus();

    switch (action) {
      case 'backspace': {
        setTimeout(() => {
          const currentStart = input.selectionStart || 0;
          const currentEnd = input.selectionEnd || 0;
          const currentValue = input.value;

          let newValue: string;
          let newCursorPos: number;

          if (currentStart !== currentEnd) {
            // Delete selected text
            newValue = currentValue.slice(0, currentStart) + currentValue.slice(currentEnd);
            newCursorPos = currentStart;
          } else if (currentStart > 0) {
            // Delete character before cursor
            newValue = currentValue.slice(0, currentStart - 1) + currentValue.slice(currentStart);
            newCursorPos = currentStart - 1;
          } else {
            return; // Nothing to delete
          }

          console.log('Backspace debug:', { currentValue, newValue, currentStart, newCursorPos });

          // Update input value
          input.value = newValue;
          valueBackupRef.current = newValue;

          // Dispatch event to React
          const inputEvent = new Event('input', { bubbles: true });
          Object.defineProperty(inputEvent, 'target', {
            value: input,
            enumerable: true,
            configurable: true,
            writable: false
          });
          input.dispatchEvent(inputEvent);

          // Set cursor position
          try {
            input.setSelectionRange(newCursorPos, newCursorPos);
          } catch (e) {
            // Ignore for input types that don't support selection
          }
        }, 1);
        break;
      }

      case 'enter': {
        if (input.tagName.toLowerCase() === 'textarea') {
          handleKeyPress('\n');
        } else {
          // For input elements, just focus next field or blur
          const form = input.closest('form');
          if (form) {
            // Try to focus next input instead of submitting
            const formElements = Array.from(form.querySelectorAll('input, textarea, select, button[type="submit"]'));
            const currentIndex = formElements.indexOf(input);
            const nextElement = formElements[currentIndex + 1] as HTMLElement;

            if (nextElement && nextElement.tagName.toLowerCase() !== 'button') {
              nextElement.focus();
            } else {
              // If it's the last field, blur and hide keyboard
              input.blur();
              hideKeyboard();
            }
          } else {
            input.blur();
            hideKeyboard();
          }
        }
        break;
      }

      case 'space': {
        handleKeyPress(' ');
        break;
      }

      case 'clear': {
        setTimeout(() => {
          console.log('Clear action - before:', input.value);

          // Clear the input
          input.value = '';
          valueBackupRef.current = '';

          console.log('Clear action - after:', input.value);

          // Dispatch event to React
          const inputEvent = new Event('input', { bubbles: true });
          Object.defineProperty(inputEvent, 'target', {
            value: input,
            enumerable: true,
            configurable: true,
            writable: false
          });
          input.dispatchEvent(inputEvent);

          // Set cursor to start
          try {
            input.setSelectionRange(0, 0);
          } catch (e) {
            // Ignore for input types that don't support selection
          }
        }, 1);
        break;
      }
    }
  }, [handleKeyPress, hideKeyboard]);

  // Auto show/hide logic
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      const currentValue = input.value;
      console.log('Input focused, current value:', `"${currentValue}"`);

      // Update backup with current value (don't restore on focus, let React handle it)
      if (currentValue) {
        valueBackupRef.current = currentValue;
      }

      if (autoShow) {
        showKeyboard();
      }
    };

    const handleBlur = (e: Event) => {
      const currentValue = input.value;
      console.log('Input blur detected, current value:', `"${currentValue}"`);

      // Only backup non-empty values
      if (currentValue) {
        valueBackupRef.current = currentValue;
        console.log('Backed up value on blur:', `"${currentValue}"`);
      }

      // Don't auto-restore on blur - let React handle the state
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
    };
  }, [autoShow, autoHide, showKeyboard, hideKeyboard]);

  // Click outside to hide
  useEffect(() => {
    if (!isKeyboardVisible || !autoHide) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Don't hide if clicking on input, keyboard, or any button
      if (
        target.closest('[data-virtual-keyboard]') ||
        target === inputRef.current ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('.virtual-keyboard-container')
      ) {
        return;
      }

      // Store current value before hiding keyboard
      const currentValue = inputRef.current?.value || '';
      console.log('Clicking outside keyboard, current value:', `"${currentValue}"`);

      // Update backup before hiding
      if (currentValue) {
        valueBackupRef.current = currentValue;
      }

      // Simply hide keyboard without affecting input state
      setIsKeyboardVisible(false);
    };

    // Use capture phase to ensure we get the event before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isKeyboardVisible, autoHide, hideKeyboard]);

  const keyboardProps = {
    isVisible: isKeyboardVisible,
    onClose: hideKeyboard,
    onKeyPress: handleKeyPress,
    onKeyAction: handleKeyAction,
    layout,
    position: currentPosition,
    onPositionChange: setPosition,
    showPositionControls: true
  };

  // Emergency restore function - only use when form detects empty but we have backup
  const restoreFromBackup = useCallback(() => {
    const input = inputRef.current;
    const backup = valueBackupRef.current;

    if (input && backup && !input.value) {
      console.log('Emergency restore from backup:', `"${backup}"`);
      input.value = backup;
      const event = new Event('input', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: input,
        enumerable: true,
        configurable: true,
        writable: false
      });
      input.dispatchEvent(event);
      return true;
    }
    return false;
  }, []);

  return {
    isKeyboardVisible,
    showKeyboard,
    hideKeyboard,
    toggleKeyboard,
    handleKeyPress,
    handleKeyAction,
    inputRef,
    currentPosition,
    setPosition,
    keyboardProps,
    restoreFromBackup // Export for emergency use
  };
}