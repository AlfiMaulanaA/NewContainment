"use client";

import React, { forwardRef } from 'react';
import { InputOriginal } from './input-original';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Removed virtual keyboard related props
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    // Simply use the original input component
    return (
      <InputOriginal
        ref={ref}
        type={type}
        className={className}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };