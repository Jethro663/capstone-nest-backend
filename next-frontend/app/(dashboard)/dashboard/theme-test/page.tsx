'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StudentThemeSwitcher } from '@/components/layout/StudentThemeSwitcher';
import { useTheme } from '@/providers/ThemeProvider';

export default function ThemeTestPage() {
  const { theme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Theme Consistency Test</h1>
          <p className="text-gray-600 mb-6">
            Testing all UI components for theme responsiveness
          </p>
          <div className="flex justify-center gap-4">
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-600">Current Theme:</span>
              <span className="ml-2 font-semibold">{resolvedTheme.label}</span>
            </div>
            <StudentThemeSwitcher />
          </div>
        </div>

        {/* Core UI Components */}
        <motion.div
          className="grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Buttons */}
          <Card variant="student">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="student">Primary</Button>
                <Button variant="studentOutline">Outline</Button>
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="student">Small</Button>
                <Button size="lg" variant="student">Large</Button>
                <Button size="icon" variant="student">Icon</Button>
              </div>
            </CardContent>
          </Card>

          {/* Inputs & Forms */}
          <Card variant="student">
            <CardHeader>
              <CardTitle>Inputs & Forms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter your name" variant="student" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com" variant="student" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="select">Select Option</Label>
                <Select>
                  <SelectTrigger variant="student">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Enter your message" variant="student" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dialog & Popover */}
        <motion.div
          className="grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Dialog */}
          <Card variant="student">
            <CardHeader>
              <CardTitle>Dialog</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="student">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent variant="student">
                  <DialogHeader>
                    <DialogTitle>Theme Test Dialog</DialogTitle>
                    <DialogDescription>
                      This dialog should use theme-aware styling that changes with the selected theme.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      The dialog background, borders, and text colors should adapt to the current theme.
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="studentOutline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="student" onClick={() => setOpen(false)}>Confirm</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Popover */}
          <Card variant="student">
            <CardHeader>
              <CardTitle>Popover</CardTitle>
            </CardHeader>
            <CardContent>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="student">Open Popover</Button>
                </PopoverTrigger>
                <PopoverContent variant="student" className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Theme-Aware Popover</h4>
                    <p className="text-sm text-muted-foreground">
                      This popover should use theme-aware styling that changes with the selected theme.
                    </p>
                    <div className="flex justify-end space-x-2">
                      <Button variant="studentOutline" size="sm" onClick={() => setPopoverOpen(false)}>Close</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges & Status */}
        <motion.div
          className="grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Badges */}
          <Card variant="student">
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Note: Badge component currently uses hardcoded colors for consistency with existing design.
              </div>
            </CardContent>
          </Card>

          {/* Skeleton & Loading */}
          <Card variant="student">
            <CardHeader>
              <CardTitle>Skeleton & Loading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="text-sm text-muted-foreground">
                Skeleton components use theme-aware styling for their shimmer effect.
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Information */}
        <motion.div
          className="grid gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card variant="student">
            <CardHeader>
              <CardTitle>Theme Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Theme ID</h4>
                  <p className="text-sm text-muted-foreground">{theme}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Theme Label</h4>
                  <p className="text-sm text-muted-foreground">{resolvedTheme.label}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{resolvedTheme.description}</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Testing Instructions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use the theme switcher above to change themes</li>
                  <li>• Observe how all components adapt to the new theme</li>
                  <li>• Check that borders, backgrounds, and text colors change appropriately</li>
                  <li>• Verify hover states work correctly in all themes</li>
                  <li>• Test interactive elements like dialogs and popovers</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}