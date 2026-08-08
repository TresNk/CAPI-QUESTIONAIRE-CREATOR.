/// <reference types="vite/client" />

declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }
  
  export type Icon = ComponentType<IconProps>;
  
  // Common icons
  export const FileCode2: Icon;
  export const List: Icon;
  export const Plus: Icon;
  export const FolderOpen: Icon;
  export const Save: Icon;
  export const AlertCircle: Icon;
  export const CheckCircle: Icon;
  export const Trash2: Icon;
  export const Edit: Icon;
  export const ChevronDown: Icon;
  export const ChevronUp: Icon;
  export const ChevronRight: Icon;
  export const X: Icon;
  export const GripVertical: Icon;
  export const Settings: Icon;
  export const Copy: Icon;
  export const Download: Icon;
  export const Upload: Icon;
  export const RefreshCw: Icon;
  export const Undo: Icon;
  export const Redo: Icon;
  export const Moon: Icon;
  export const Sun: Icon;
  export const Menu: Icon;
  export const Search: Icon;
  export const Filter: Icon;
  export const MoreVertical: Icon;
  export const Check: Icon;
  export const ArrowLeft: Icon;
  export const ArrowRight: Icon;
  export const HelpCircle: Icon;
  export const Info: Icon;
  export const Loader2: Icon;
  export const GitBranch: Icon;
  export const PlusCircle: Icon;
  export const Circle: Icon;
}
