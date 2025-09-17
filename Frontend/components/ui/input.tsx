"use client";

import React, { forwardRef } from 'react';
import { KeyboardInput, KeyboardInputProps } from './keyboard-input';
import { InputOriginal } from './input-original';
import { useVirtualKeyboardSettings } from '@/contexts/virtual-keyboard-context';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<KeyboardInputProps, 'variant'> {
  disableVirtualKeyboard?: boolean;
  forceVirtualKeyboard?: boolean;
  keyboardLayout?: 'qwerty' | 'numeric';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    disableVirtualKeyboard = false,
    forceVirtualKeyboard = false,
    keyboardLayout,
    className,
    keyboardOptions,
    type,
    ...props
  }, ref) => {
    const { settings, shouldShowKeyboard } = useVirtualKeyboardSettings();

    // Determine if virtual keyboard should be used
    const useVirtualKeyboard = () => {
      if (disableVirtualKeyboard) return false;
      if (forceVirtualKeyboard) return true;
      return shouldShowKeyboard();
    };

    // Auto-detect layout based on input type
    const getLayout = (): 'qwerty' | 'numeric' => {
      if (keyboardLayout) return keyboardLayout;
      if (type === 'number' || type === 'tel') return 'numeric';
      return settings.defaultLayout;
    };

    // If virtual keyboard should not be used, return original input
    if (!useVirtualKeyboard()) {
      return (
        <InputOriginal
          ref={ref}
          type={type}
          className={className}
          {...props}
        />
      );
    }

    // Use virtual keyboard input
    return (
      <KeyboardInput
        ref={ref}
        type={type}
        className={className}
        keyboardOptions={{
          layout: getLayout(),
          position: settings.defaultPosition,
          autoShow: settings.autoShow,
          autoHide: settings.autoHide,
          ...keyboardOptions // Allow override default options
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
