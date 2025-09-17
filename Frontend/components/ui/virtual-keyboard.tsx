"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Delete,
  Space,
  CornerDownLeft,
  ChevronsUp,
  ChevronUp,
  Globe,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VirtualKeyboardProps {
  isVisible: boolean;
  onClose: () => void;
  onKeyPress: (key: string) => void;
  onKeyAction: (action: 'backspace' | 'enter' | 'space' | 'clear') => void;
  className?: string;
  layout?: 'qwerty' | 'numeric' | 'alphanumeric';
  showNumbers?: boolean;
  position?: 'bottom' | 'center' | 'top' | 'left' | 'right';
  onPositionChange?: (position: 'bottom' | 'center' | 'top' | 'left' | 'right') => void;
  showPositionControls?: boolean;
}

type KeyboardLayout = 'qwerty' | 'numeric' | 'alphanumeric';
type KeyboardMode = 'lowercase' | 'uppercase' | 'caps';

const QWERTY_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

const NUMERIC_LAYOUT = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0', '.', '-']
];

const SPECIAL_CHARS = ['@', '#', '$', '%', '&', '*', '(', ')', '-', '+', '=', '[', ']', '{', '}', '\\', '|', ';', ':', '"', "'", '<', '>', ',', '.', '?', '/', '!', '~', '`'];

export function VirtualKeyboard({
  isVisible,
  onClose,
  onKeyPress,
  onKeyAction,
  className,
  layout = 'qwerty',
  showNumbers = true,
  position = 'bottom',
  onPositionChange,
  showPositionControls = true
}: VirtualKeyboardProps) {
  const [currentLayout, setCurrentLayout] = useState<KeyboardLayout>(layout);
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>('lowercase');
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCurrentLayout(layout);
  }, [layout]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    // Prevent event bubbling that might cause issues
    event?.preventDefault?.();
    event?.stopPropagation?.();

    let processedKey = key;

    if (currentLayout === 'qwerty' && keyboardMode === 'uppercase') {
      processedKey = key.toUpperCase();
    } else if (currentLayout === 'qwerty' && keyboardMode === 'caps') {
      processedKey = key.toUpperCase();
    }

    onKeyPress(processedKey);

    // Reset to lowercase after single key press in uppercase mode
    if (keyboardMode === 'uppercase') {
      setKeyboardMode('lowercase');
    }
  }, [onKeyPress, currentLayout, keyboardMode]);

  const handleShiftPress = useCallback(() => {
    if (keyboardMode === 'lowercase') {
      setKeyboardMode('uppercase');
    } else if (keyboardMode === 'uppercase') {
      setKeyboardMode('caps');
    } else {
      setKeyboardMode('lowercase');
    }
  }, [keyboardMode]);

  const handleLayoutSwitch = useCallback(() => {
    if (currentLayout === 'qwerty') {
      setCurrentLayout('numeric');
    } else if (currentLayout === 'numeric') {
      setCurrentLayout('qwerty');
    }
  }, [currentLayout]);

  const handlePositionChange = useCallback((newPosition: 'bottom' | 'center' | 'top' | 'left' | 'right') => {
    onPositionChange?.(newPosition);
  }, [onPositionChange]);

  const getPositionIcon = useCallback((pos: 'bottom' | 'center' | 'top' | 'left' | 'right') => {
    switch (pos) {
      case 'top':
        return <ArrowUp className="h-3 w-3" />;
      case 'center':
        return <Minus className="h-3 w-3" />;
      case 'bottom':
        return <ArrowDown className="h-3 w-3" />;
      case 'left':
        return <ArrowLeft className="h-3 w-3" />;
      case 'right':
        return <ArrowRight className="h-3 w-3" />;
      default:
        return <ArrowDown className="h-3 w-3" />;
    }
  }, []);

  const renderKey = useCallback((key: string, index: number, isWide = false, isAction = false) => {
    const keyVariant = isAction ? 'secondary' : 'outline';

    let displayKey = key;
    if (currentLayout === 'qwerty' && (keyboardMode === 'uppercase' || keyboardMode === 'caps')) {
      displayKey = key.toUpperCase();
    }

    return (
      <Button
        key={`${key}-${index}`}
        variant={keyVariant}
        className={cn(
          // Base responsive styles
          "font-medium shadow-sm hover:shadow-md transition-all active:scale-95",
          // Mobile (xs) - smaller buttons
          "h-8 min-w-[28px] text-xs sm:h-10 sm:min-w-[32px] sm:text-sm",
          // Desktop (md+) - larger buttons
          "md:h-12 md:min-w-[40px] md:text-base",
          // Wide buttons (space, etc)
          isWide && "flex-1 min-w-[60px] sm:min-w-[80px] md:min-w-[100px]",
          // Action button styling
          isAction && "bg-muted hover:bg-muted/80 dark:bg-muted dark:hover:bg-muted/80"
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleKeyPress(key);
        }}
        type="button"
      >
        {displayKey}
      </Button>
    );
  }, [handleKeyPress, currentLayout, keyboardMode]);

  const renderActionKey = useCallback((
    action: 'backspace' | 'enter' | 'space' | 'shift' | 'layout' | 'special' | 'clear',
    icon?: React.ReactNode,
    label?: string,
    className?: string
  ) => {
    const handleClick = () => {
      switch (action) {
        case 'backspace':
          onKeyAction('backspace');
          break;
        case 'enter':
          onKeyAction('enter');
          break;
        case 'space':
          onKeyAction('space');
          break;
        case 'clear':
          onKeyAction('clear');
          break;
        case 'shift':
          handleShiftPress();
          break;
        case 'layout':
          handleLayoutSwitch();
          break;
        case 'special':
          setShowSpecialChars(!showSpecialChars);
          break;
      }
    };

    const isActive = action === 'shift' && (keyboardMode === 'uppercase' || keyboardMode === 'caps');
    const isCapsLock = action === 'shift' && keyboardMode === 'caps';

    return (
      <Button
        variant={isActive ? 'default' : 'secondary'}
        className={cn(
          // Base responsive styles
          "font-medium shadow-sm hover:shadow-md transition-all active:scale-95",
          // Mobile (xs) - smaller buttons
          "h-8 min-w-[48px] text-xs sm:h-10 sm:min-w-[52px] sm:text-sm",
          // Desktop (md+) - larger buttons
          "md:h-12 md:min-w-[60px] md:text-base",
          // Active state styling
          isActive && "bg-primary text-primary-foreground",
          isCapsLock && "bg-primary/80 text-primary-foreground ring-2 ring-primary/50",
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-1">
          {/* Responsive icon sizes */}
          <div className="[&>svg]:h-3 [&>svg]:w-3 sm:[&>svg]:h-4 sm:[&>svg]:w-4">
            {icon}
          </div>
          <span className={cn(
            "truncate",
            // Hide labels on very small screens for action buttons
            action !== 'space' && "hidden xs:inline"
          )}>
            {label}
          </span>
        </div>
      </Button>
    );
  }, [onKeyAction, handleShiftPress, handleLayoutSwitch, keyboardMode, showSpecialChars]);

  const getKeyboardLayout = useCallback(() => {
    if (currentLayout === 'numeric') {
      return NUMERIC_LAYOUT;
    }
    return QWERTY_LAYOUT;
  }, [currentLayout]);

  const getPositionClasses = () => {
    // Use viewport-relative positioning
    switch (position) {
      case 'top':
        return 'top-2 left-1/2 -translate-x-1/2 sm:top-4';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom':
        return 'bottom-2 left-1/2 -translate-x-1/2 sm:bottom-4';
      case 'left':
        return 'left-2 top-1/2 -translate-y-1/2 sm:left-4';
      case 'right':
        return 'right-2 top-1/2 -translate-y-1/2 sm:right-4';
      default:
        return 'bottom-2 left-1/2 -translate-x-1/2 sm:bottom-4';
    }
  };

  if (!isVisible || !mounted) return null;

  const keyboardLayout = getKeyboardLayout();

  const keyboardElement = (
    <div
      className={cn(
        "fixed z-[9999]",
        // Force viewport-based positioning, ignoring parent containers
        "inset-0 pointer-events-none"
      )}
      style={{ position: 'fixed' }}
    >
      <div
        className={cn(
          "absolute pointer-events-auto",
          // Responsive padding from viewport edges
          "mx-2 sm:mx-4",
          // Width based on viewport, not parent container
          position === 'left' || position === 'right'
            ? "w-[280px] sm:w-[320px] md:w-[360px]"
            : "w-[calc(100vw-16px)] max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-5xl sm:w-[calc(100vw-32px)]",
          getPositionClasses()
        )}
        data-virtual-keyboard
      >
      <Card className={cn(
        "bg-background/95 backdrop-blur-sm border shadow-2xl virtual-keyboard-container",
        "animate-in slide-in-from-bottom-full duration-300",
        // Responsive padding
        "p-2 sm:p-3 md:p-4",
        className
      )}
      data-virtual-keyboard>
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
          <div className="flex items-center gap-1 sm:gap-2 overflow-hidden">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              <span className="hidden sm:inline">Virtual Keyboard - </span>
              {currentLayout === 'qwerty' ? 'QWERTY' : 'Numeric'}
            </h3>
            {currentLayout === 'qwerty' && (
              <span className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                {keyboardMode === 'caps' ? 'CAPS' : keyboardMode.toUpperCase()}
              </span>
            )}

            {/* Position Controls - Hidden on mobile for space */}
            {showPositionControls && onPositionChange && (
              <div className="hidden sm:flex items-center gap-1 ml-2">
                <span className="text-xs text-muted-foreground mr-1 hidden md:inline">Position:</span>
                <div className="grid grid-cols-3 gap-0.5">
                  {/* Top row */}
                  <div></div>
                  <Button
                    variant={position === 'top' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-5 w-5 p-0 sm:h-6 sm:w-6"
                    onClick={() => handlePositionChange('top')}
                    title="Move to top"
                  >
                    {getPositionIcon('top')}
                  </Button>
                  <div></div>

                  {/* Middle row */}
                  <Button
                    variant={position === 'left' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-5 w-5 p-0 sm:h-6 sm:w-6"
                    onClick={() => handlePositionChange('left')}
                    title="Move to left"
                  >
                    {getPositionIcon('left')}
                  </Button>
                  <Button
                    variant={position === 'center' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-5 w-5 p-0 sm:h-6 sm:w-6"
                    onClick={() => handlePositionChange('center')}
                    title="Move to center"
                  >
                    {getPositionIcon('center')}
                  </Button>
                  <Button
                    variant={position === 'right' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-5 w-5 p-0 sm:h-6 sm:w-6"
                    onClick={() => handlePositionChange('right')}
                    title="Move to right"
                  >
                    {getPositionIcon('right')}
                  </Button>

                  {/* Bottom row */}
                  <div></div>
                  <Button
                    variant={position === 'bottom' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-5 w-5 p-0 sm:h-6 sm:w-6"
                    onClick={() => handlePositionChange('bottom')}
                    title="Move to bottom"
                  >
                    {getPositionIcon('bottom')}
                  </Button>
                  <div></div>
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Close button clicked, hiding keyboard');
              onClose();
            }}
            className="h-6 w-6 p-0 sm:h-8 sm:w-8"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Special Characters Row (when enabled) */}
        {showSpecialChars && currentLayout === 'qwerty' && (
          <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-2 sm:mb-3 p-1.5 sm:p-2 bg-muted/50 rounded-md">
            {SPECIAL_CHARS.map((char, index) => renderKey(char, index))}
          </div>
        )}

        {/* Main Keyboard */}
        <div className="space-y-1 sm:space-y-2">
          {keyboardLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-0.5 sm:gap-1 justify-center">
              {/* Shift key for alphabet rows */}
              {currentLayout === 'qwerty' && rowIndex >= 1 && rowIndex === 1 && (
                renderActionKey(
                  'shift',
                  keyboardMode === 'caps' ? <ChevronsUp className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />,
                  undefined,
                  "mr-1"
                )
              )}

              {row.map((key, keyIndex) => renderKey(key, keyIndex))}

              {/* Backspace key for first row */}
              {rowIndex === 0 && (
                renderActionKey('backspace', <Delete className="h-4 w-4" />, undefined, "ml-1")
              )}
            </div>
          ))}

          {/* Bottom Action Row */}
          <div className="flex gap-0.5 sm:gap-1 justify-center pt-1 sm:pt-2">
            {renderActionKey('layout', <Globe />, currentLayout === 'qwerty' ? '123' : 'ABC')}

            {currentLayout === 'qwerty' && (
              renderActionKey('special', undefined, '!@#', 'min-w-[40px] sm:min-w-[50px]')
            )}

            {renderActionKey('space', <Space />, 'Space', 'flex-1 mx-1 sm:mx-2')}

            {renderActionKey('clear', undefined, 'Clear', 'min-w-[48px] sm:min-w-[60px]')}

            {renderActionKey('enter', <CornerDownLeft />, 'Enter')}
          </div>
        </div>
      </Card>
      </div>
    </div>
  );

  // Use createPortal to render outside any container constraints
  // Fallback for SSR or when document.body is not available
  if (typeof document === 'undefined') return null;

  return createPortal(keyboardElement, document.body);
}

export default VirtualKeyboard;