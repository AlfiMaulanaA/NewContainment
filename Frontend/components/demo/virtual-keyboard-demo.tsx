"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { KeyboardInput } from '@/components/ui/keyboard-input';
import { VirtualKeyboard } from '@/components/ui/virtual-keyboard';
import { useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function VirtualKeyboardDemo() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    message: '',
    amount: ''
  });

  const [keyboardPosition, setKeyboardPosition] = useState<'bottom' | 'center' | 'top' | 'left' | 'right'>('bottom');
  const [keyboardLayout, setKeyboardLayout] = useState<'qwerty' | 'numeric'>('qwerty');

  // Example of manual keyboard control - recreate when layout/position changes
  const manualKeyboard = useVirtualKeyboard({
    autoShow: false,
    autoHide: true,
    layout: keyboardLayout,
    position: keyboardPosition
  });


  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(`Form submitted successfully! Data: ${JSON.stringify(formData, null, 2)}`);

    // Clear message after 3 seconds
    setTimeout(() => {
      setSubmitMessage('');
    }, 3000);
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Virtual Keyboard Demo</h1>
        <p className="text-muted-foreground">
          Demonstrasi penggunaan virtual keyboard untuk monitor touchscreen
        </p>
      </div>

      <Tabs defaultValue="auto" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="auto">Auto Keyboard</TabsTrigger>
          <TabsTrigger value="manual">Manual Control</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        {/* Auto Keyboard Demo */}
        <TabsContent value="auto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Automatic Virtual Keyboard
                <Badge variant="secondary">Recommended</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Keyboard muncul otomatis saat input field difokus dan hilang saat blur
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <KeyboardInput
                      id="username"
                      value={formData.username}
                      onChange={handleInputChange('username')}
                      placeholder="Enter username"
                      keyboardOptions={{ layout: 'qwerty' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <KeyboardInput
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      placeholder="Enter email"
                      keyboardOptions={{ layout: 'qwerty' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Numeric)</Label>
                    <KeyboardInput
                      id="phone"
                      value={formData.phone}
                      onChange={handleInputChange('phone')}
                      placeholder="Enter phone number"
                      keyboardOptions={{ layout: 'numeric' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <KeyboardInput
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={handleInputChange('amount')}
                      placeholder="Enter amount"
                      keyboardOptions={{ layout: 'numeric', position: 'center' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Textarea)</Label>
                  <KeyboardInput
                    variant="textarea"
                    textareaProps={{
                      id: "message",
                      value: formData.message,
                      onChange: handleInputChange('message'),
                      placeholder: "Enter your message here...",
                      rows: 4
                    }}
                    keyboardOptions={{ layout: 'qwerty', position: 'top' }}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Submit Form
                </Button>

                {submitMessage && (
                  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm text-green-800 dark:text-green-200 break-all">
                      {submitMessage}
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Control Demo */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Keyboard Control</CardTitle>
              <p className="text-sm text-muted-foreground">
                Kontrol manual untuk menampilkan/menyembunyikan keyboard
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-input">Regular Input with Manual Keyboard</Label>
                <Input
                  ref={manualKeyboard.inputRef as React.RefObject<HTMLInputElement>}
                  id="manual-input"
                  placeholder="Click button to show keyboard"
                  className="mb-4"
                />
              </div>

              {/* Keyboard Controls */}
              <div className="grid grid-cols-1 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Label>Keyboard Layout</Label>
                  <div className="flex gap-1">
                    {(['qwerty', 'numeric'] as const).map((layout) => (
                      <Button
                        key={layout}
                        variant={keyboardLayout === layout ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setKeyboardLayout(layout)}
                        className="capitalize"
                      >
                        {layout}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Position controls are now available directly in the keyboard header
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={manualKeyboard.showKeyboard}
                  variant="outline"
                >
                  Show Keyboard
                </Button>
                <Button
                  onClick={manualKeyboard.hideKeyboard}
                  variant="outline"
                >
                  Hide Keyboard
                </Button>
                <Button
                  onClick={manualKeyboard.toggleKeyboard}
                  variant="outline"
                >
                  Toggle Keyboard
                </Button>
              </div>

              <div className="text-sm text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                <div><strong>Current Settings:</strong></div>
                <div className="flex items-center gap-1 mt-2">
                  Position: <Badge variant="secondary">{manualKeyboard.currentPosition}</Badge>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  Layout: <Badge variant="secondary">{keyboardLayout}</Badge>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  Visible: <Badge variant={manualKeyboard.isKeyboardVisible ? "default" : "secondary"}>
                    {manualKeyboard.isKeyboardVisible ? "Yes" : "No"}
                  </Badge>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  💡 Use the position buttons in the keyboard header to change position
                </p>
              </div>

              <VirtualKeyboard
                {...manualKeyboard.keyboardProps}
                layout={keyboardLayout}
              />
            </CardContent>
          </Card>
        </TabsContent>


        {/* Usage Examples */}
        <TabsContent value="examples" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cara Penggunaan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Import Components</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    <code>{`import { KeyboardInput } from '@/components/ui/keyboard-input';
import { VirtualKeyboard } from '@/components/ui/virtual-keyboard';
import { useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';`}</code>
                  </pre>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">2. Basic Usage (Automatic)</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    <code>{`<KeyboardInput
  placeholder="Enter text"
  keyboardOptions={{
    layout: 'qwerty', // 'qwerty' | 'numeric'
    position: 'bottom', // 'bottom' | 'center' | 'top'
    autoShow: true,
    autoHide: true
  }}
/>`}</code>
                  </pre>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">3. Manual Control</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    <code>{`const keyboard = useVirtualKeyboard({
  autoShow: false,
  layout: 'qwerty'
});

// In your JSX:
<Input ref={keyboard.inputRef} />
<VirtualKeyboard {...keyboard.keyboardProps} />
<Button onClick={keyboard.showKeyboard}>Show</Button>`}</code>
                  </pre>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">4. Textarea Support</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    <code>{`<KeyboardInput
  variant="textarea"
  textareaProps={{
    rows: 4,
    placeholder: "Enter message..."
  }}
  keyboardOptions={{ layout: 'qwerty' }}
/>`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fitur Virtual Keyboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Layout Options:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• QWERTY - Full alphabet keyboard</li>
                      <li>• Numeric - Number pad only</li>
                      <li>• Special characters (!@#$%)</li>
                      <li>• Uppercase/Lowercase/Caps lock</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Features:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Auto show/hide on focus/blur</li>
                      <li>• Multiple position options</li>
                      <li>• Backspace, Enter, Space, Clear</li>
                      <li>• Responsive design</li>
                      <li>• Dark mode support</li>
                      <li>• Touch-friendly buttons</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VirtualKeyboardDemo;