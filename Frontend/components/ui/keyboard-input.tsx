"use client";

import React, { forwardRef } from 'react';
import { InputOriginal } from '@/components/ui/input-original';
import { Textarea } from '@/components/ui/textarea';
import { VirtualKeyboard } from '@/components/ui/virtual-keyboard';
import { useVirtualKeyboard, UseVirtualKeyboardOptions } from '@/hooks/useVirtualKeyboard';
import { Button } from '@/components/ui/button';
import { Keyboard, KeyboardOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KeyboardInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  keyboardOptions?: UseVirtualKeyboardOptions;
  showKeyboardToggle?: boolean;
  variant?: 'input' | 'textarea';
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}

export const KeyboardInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, KeyboardInputProps>(
  ({
    keyboardOptions,
    showKeyboardToggle = true,
    variant = 'input',
    textareaProps,
    className,
    ...props
  }, externalRef) => {
    const {
      isKeyboardVisible,
      showKeyboard,
      hideKeyboard,
      toggleKeyboard,
      inputRef,
      keyboardProps
    } = useVirtualKeyboard(keyboardOptions);

    // Merge refs
    const handleRef = (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputRef.current = element;

      if (typeof externalRef === 'function') {
        externalRef(element);
      } else if (externalRef) {
        externalRef.current = element;
      }
    };

    const inputElement = variant === 'textarea' ? (
      <Textarea
        ref={handleRef as React.RefObject<HTMLTextAreaElement>}
        className={cn("pr-12", className)}
        {...textareaProps}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    ) : (
      <InputOriginal
        ref={handleRef as React.RefObject<HTMLInputElement>}
        className={cn("pr-12", className)}
        {...props}
      />
    );

    return (
      <div className="relative">
        {inputElement}

        {showKeyboardToggle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
            onClick={toggleKeyboard}
            tabIndex={-1}
          >
            {isKeyboardVisible ? (
              <KeyboardOff className="h-4 w-4" />
            ) : (
              <Keyboard className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Virtual keyboard renders via portal, no container needed */}
        <VirtualKeyboard {...keyboardProps} />
      </div>
    );
  }
);

KeyboardInput.displayName = "KeyboardInput";

export default KeyboardInput;