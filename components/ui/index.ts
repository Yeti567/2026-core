/**
 * UI Components Index
 * 
 * Export all reusable UI components for easy imports
 */

export { Alert, AlertTitle, AlertDescription } from './alert';
export { Badge, badgeVariants } from './badge';
export { Button, buttonVariants } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Checkbox } from './checkbox';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './dropdown-menu';
export { Input } from './input';
export { default as PhotoCapture, type CapturedPhoto } from './photo-capture';
export { ScrollArea, ScrollBar } from './scroll-area';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { default as SignaturePad, type SignatureData } from './signature-pad';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { 
  HazardSelector, 
  HazardSelectorSingle, 
  HazardSelectorMulti,
  RISK_CONFIG,
  CATEGORY_CONFIG,
  type HazardItem,
  type SelectedHazard,
  type HazardCategory,
  type RiskLevel,
} from './hazard-selector';