"use client";

import { useRef } from 'react';
import { useVirtualKeyboard, UseVirtualKeyboardOptions } from './useVirtualKeyboard';

export function useVirtualKeyboardInput(options?: UseVirtualKeyboardOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboard = useVirtualKeyboard(options);

  // Override the inputRef with typed version
  const keyboardWithTypedRef = {
    ...keyboard,
    inputRef: inputRef,
  };

  return keyboardWithTypedRef;
}

export function useVirtualKeyboardTextarea(options?: UseVirtualKeyboardOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboard = useVirtualKeyboard(options);

  // Override the inputRef with typed version
  const keyboardWithTypedRef = {
    ...keyboard,
    inputRef: textareaRef,
  };

  return keyboardWithTypedRef;
}