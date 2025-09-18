"use client";

import React, { useState, useRef } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function SimpleKeyboardDemo() {
  const [input, setInput] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const keyboard = useRef<any>();

  const onChange = (input: string) => {
    setInput(input);
  };

  const onKeyPress = (button: string) => {
    console.log("Button pressed", button);

    // Handle special buttons
    if (button === "{enter}") {
      setShowKeyboard(false);
    }
  };

  const onChangeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    setInput(input);
    keyboard.current?.setInput(input);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Simple Keyboard Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Demo Input</Label>
            <Input
              id="demo-input"
              value={input}
              placeholder="Click to show keyboard"
              onChange={onChangeInput}
              onFocus={() => setShowKeyboard(true)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowKeyboard(!showKeyboard)}
              variant="outline"
            >
              {showKeyboard ? 'Hide' : 'Show'} Keyboard
            </Button>
            <Button
              onClick={() => {
                setInput("");
                keyboard.current?.clearInput();
              }}
              variant="outline"
            >
              Clear
            </Button>
          </div>

          {showKeyboard && (
            <div className="mt-4">
              <Keyboard
                ref={keyboard}
                onChange={onChange}
                onKeyPress={onKeyPress}
                layout={{
                  'default': [
                    '1 2 3 4 5 6 7 8 9 0 {bksp}',
                    'q w e r t y u i o p',
                    'a s d f g h j k l {enter}',
                    '{shift} z x c v b n m {shift}',
                    '{space}'
                  ],
                  'shift': [
                    '! @ # $ % ^ & * ( ) {bksp}',
                    'Q W E R T Y U I O P',
                    'A S D F G H J K L {enter}',
                    '{shift} Z X C V B N M {shift}',
                    '{space}'
                  ]
                }}
                display={{
                  '{bksp}': '⌫',
                  '{enter}': '↵',
                  '{shift}': '⇧',
                  '{space}': ' '
                }}
                theme={"hg-theme-default hg-layout-default myTheme"}
                buttonTheme={[
                  {
                    class: "hg-red",
                    buttons: "{bksp}"
                  },
                  {
                    class: "hg-blue",
                    buttons: "{enter} {shift}"
                  }
                ]}
              />
            </div>
          )}

          {input && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current input:</p>
              <p className="font-mono">{input}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx global>{`
        .myTheme {
          background-color: hsl(var(--background));
          border-radius: 8px;
          border: 1px solid hsl(var(--border));
        }

        .myTheme .hg-button {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 6px;
          margin: 2px;
          font-size: 14px;
          transition: all 0.1s ease;
        }

        .myTheme .hg-button:hover {
          background: hsl(var(--muted));
        }

        .myTheme .hg-button:active {
          background: hsl(var(--muted));
          transform: scale(0.95);
        }

        .myTheme .hg-red {
          background: hsl(var(--destructive));
          color: hsl(var(--destructive-foreground));
        }

        .myTheme .hg-blue {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
      `}</style>
    </div>
  );
}