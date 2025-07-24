# UDMS - File Organization Layout

## Complete Project Structure

```
udmsmac/
├── src/
│   ├── components/
│   │   ├── SettingsModule.jsx              # Main settings component
│   │   ├── DarkModeToggle.jsx              # Dark mode switch
│   │   ├── ExportManager.jsx               # Data export functionality
│   │   ├── MessageGenerator.jsx            # Message generation system
│   │   ├── MessageTemplateEditor.jsx       # Template editing interface
│   │   ├── SettingsCard.jsx                # Reusable settings card
│   │   ├── ExportProgressModal.jsx         # Export progress display
│   │   ├── MessagePreviewModal.jsx         # Message preview interface
│   │   ├── TemplateVariableSelector.jsx    # Variable insertion tool
│   │   └── SettingsSection.jsx             # Settings section wrapper
│   │
│   ├── contexts/
│   │   ├── ThemeContext.jsx                # Dark mode context
│   │   ├── MessageContext.jsx              # Message templates context
│   │   └── SettingsContext.jsx             # Settings state context
│   │
│   ├── hooks/
│   │   ├── useDarkMode.js                  # Dark mode hook
│   │   ├── useExport.js                    # Export functionality hook
│   │   ├── useMessageTemplates.js          # Message templates hook
│   │   ├── useSettings.js                  # Settings management hook
│   │   └── useLocalStorage.js              # Local storage hook
│   │
│   ├── utils/
│   │   ├── themeUtils.js                   # Theme utilities
│   │   ├── exportUtils.js                  # Export utilities
│   │   ├── messageUtils.js                 # Message generation utilities
│   │   ├── settingsUtils.js                # Settings utilities
│   │   ├── templateUtils.js                # Template processing utilities
│   │   └── validationUtils.js              # Form validation utilities
│   │
│   ├── styles/
│   │   ├── darkMode.css                    # Dark mode styles
│   │   ├── settings.css                    # Settings-specific styles
│   │   ├── components.css                  # Component styles
│   │   └── variables.css                   # CSS custom properties
│   │
│   ├── constants/
│   │   ├── themeConstants.js               # Theme-related constants
│   │   ├── exportConstants.js              # Export configuration
│   │   ├── messageConstants.js             # Message template constants
│   │   └── settingsConstants.js            # Settings constants
│   │
│   └── types/
│       ├── settingsTypes.js                # Settings type definitions
│       ├── exportTypes.js                  # Export type definitions
│       └── messageTypes.js                 # Message type definitions
│
├── database/
│   ├── migrations/
│   │   ├── add_settings_enhancements.sql   # Settings table updates
│   │   ├── add_message_templates.sql       # Message templates table
│   │   └── add_export_history.sql          # Export history table
│   │
│   ├── seeds/
│   │   ├── default_settings.sql            # Default settings data
│   │   ├── message_templates.sql           # Default message templates
│   │   └── export_configs.sql              # Export configurations
│   │
│   └── functions/
│       ├── export_data.sql                 # Export data function
│       ├── generate_message.sql            # Message generation function
│       └── update_settings.sql             # Settings update function
│
├── docs/
│   ├── api/
│   │   ├── settings-api.md                 # Settings API documentation
│   │   ├── export-api.md                   # Export API documentation
│   │   └── message-api.md                  # Message API documentation
│   │
│   ├── user-guides/
│   │   ├── settings-guide.md               # Settings user guide
│   │   ├── export-guide.md                 # Export user guide
│   │   └── messaging-guide.md              # Messaging user guide
│   │
│   └── development/
│       ├── component-guide.md              # Component development guide
│       ├── testing-guide.md                # Testing guidelines
│       └── deployment-guide.md             # Deployment instructions
│
├── tests/
│   ├── components/
│   │   ├── SettingsModule.test.jsx         # Settings module tests
│   │   ├── DarkModeToggle.test.jsx         # Dark mode toggle tests
│   │   ├── ExportManager.test.jsx          # Export manager tests
│   │   ├── MessageGenerator.test.jsx       # Message generator tests
│   │   └── MessageTemplateEditor.test.jsx  # Template editor tests
│   │
│   ├── hooks/
│   │   ├── useDarkMode.test.js             # Dark mode hook tests
│   │   ├── useExport.test.js               # Export hook tests
│   │   └── useMessageTemplates.test.js     # Message templates hook tests
│   │
│   ├── utils/
│   │   ├── themeUtils.test.js              # Theme utilities tests
│   │   ├── exportUtils.test.js             # Export utilities tests
│   │   └── messageUtils.test.js            # Message utilities tests
│   │
│   └── integration/
│       ├── settings-flow.test.js           # Settings workflow tests
│       ├── export-flow.test.js             # Export workflow tests
│       └── messaging-flow.test.js          # Messaging workflow tests
│
└── config/
    ├── tailwind.config.js                  # Tailwind configuration
    ├── vite.config.js                      # Vite configuration
    ├── eslint.config.js                    # ESLint configuration
    └── jest.config.js                      # Jest configuration
```

## Component Responsibility Matrix

### Core Components

| Component | Responsibility | Dependencies | Files |
|-----------|---------------|--------------|-------|
| `SettingsModule.jsx` | Main settings interface | All settings components | Main orchestrator |
| `DarkModeToggle.jsx` | Theme switching | ThemeContext, useDarkMode | Theme management |
| `ExportManager.jsx` | Data export functionality | useExport, exportUtils | Export operations |
| `MessageGenerator.jsx` | Message creation | MessageContext, messageUtils | Message generation |
| `MessageTemplateEditor.jsx` | Template editing | MessageContext, templateUtils | Template management |

### Supporting Components

| Component | Responsibility | Dependencies | Files |
|-----------|---------------|--------------|-------|
| `SettingsCard.jsx` | Reusable settings card | Generic wrapper | UI consistency |
| `ExportProgressModal.jsx` | Export progress display | useExport | Progress tracking |
| `MessagePreviewModal.jsx` | Message preview | messageUtils | Preview functionality |
| `TemplateVariableSelector.jsx` | Variable insertion | templateUtils | Template editing |
| `SettingsSection.jsx` | Settings section wrapper | Generic wrapper | Layout management |

## Context Architecture

### ThemeContext.jsx
```javascript
// Global theme state management
const ThemeContext = createContext();

// State
- isDark: boolean
- theme: 'light' | 'dark'
- systemPreference: 'light' | 'dark' | 'auto'

// Actions
- toggleTheme()
- setTheme(theme)
- detectSystemPreference()
```

### MessageContext.jsx
```javascript
// Message template state management
const MessageContext = createContext();

// State
- templates: object
- activeTemplate: string
- templateHistory: array

// Actions
- saveTemplate(type, template)
- loadTemplate(type)
- deleteTemplate(type)
- previewTemplate(template, variables)
```

### SettingsContext.jsx
```javascript
// Settings state management
const SettingsContext = createContext();

// State
- settings: object
- isLoading: boolean
- error: string

// Actions
- updateSettings(settings)
- resetSettings()
- validateSettings(settings)
```

## Hook Architecture

### useDarkMode.js
```javascript
// Dark mode functionality
const useDarkMode = () => {
  // State
  const [isDark, setIsDark] = useState(false)
  const [systemPreference, setSystemPreference] = useState('auto')
  
  // Actions
  const toggle = () => { /* implementation */ }
  const setTheme = (theme) => { /* implementation */ }
  const detectSystemPreference = () => { /* implementation */ }
  
  return { isDark, toggle, setTheme, systemPreference }
}
```

### useExport.js
```javascript
// Export functionality
const useExport = () => {
  // State
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportHistory, setExportHistory] = useState([])
  
  // Actions
  const exportData = async (options) => { /* implementation */ }
  const getExportHistory = () => { /* implementation */ }
  const clearExportHistory = () => { /* implementation */ }
  
  return { isExporting, progress, exportData, exportHistory }
}
```

### useMessageTemplates.js
```javascript
// Message template functionality
const useMessageTemplates = () => {
  // State
  const [templates, setTemplates] = useState({})
  const [activeTemplate, setActiveTemplate] = useState(null)
  
  // Actions
  const saveTemplate = async (type, template) => { /* implementation */ }
  const generateMessage = (template, variables) => { /* implementation */ }
  const validateTemplate = (template) => { /* implementation */ }
  
  return { templates, saveTemplate, generateMessage, validateTemplate }
}
```

## Utility Functions

### themeUtils.js
```javascript
// Theme-related utilities
export const applyTheme = (theme) => { /* implementation */ }
export const getSystemPreference = () => { /* implementation */ }
export const createThemeVariables = (isDark) => { /* implementation */ }
export const validateTheme = (theme) => { /* implementation */ }
```

### exportUtils.js
```javascript
// Export utilities
export const createZipFile = async (data) => { /* implementation */ }
export const organizeData = (data) => { /* implementation */ }
export const generateMetadata = () => { /* implementation */ }
export const validateExportData = (data) => { /* implementation */ }
```

### messageUtils.js
```javascript
// Message generation utilities
export const substituteVariables = (template, variables) => { /* implementation */ }
export const validateVariables = (template, variables) => { /* implementation */ }
export const formatMessage = (message, format) => { /* implementation */ }
export const sanitizeMessage = (message) => { /* implementation */ }
```

## Database Schema

### Settings Table
```sql
CREATE TABLE public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  dark_mode BOOLEAN DEFAULT FALSE,
  export_settings JSONB DEFAULT '{}',
  message_templates JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Message Templates Table
```sql
CREATE TABLE public.message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1
);
```

### Export History Table
```sql
CREATE TABLE public.export_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  export_type TEXT NOT NULL,
  file_size BIGINT,
  status TEXT DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'
);
```

## File Naming Conventions

### Components
- **PascalCase**: `SettingsModule.jsx`, `DarkModeToggle.jsx`
- **Descriptive names**: Clear indication of purpose
- **Consistent suffixes**: `.jsx` for React components

### Hooks
- **camelCase with 'use' prefix**: `useDarkMode.js`, `useExport.js`
- **Action-oriented names**: Indicate what the hook does

### Utilities
- **camelCase with purpose suffix**: `themeUtils.js`, `exportUtils.js`
- **Functional names**: Clear indication of utility purpose

### Constants
- **camelCase with 'Constants' suffix**: `themeConstants.js`
- **Organized by domain**: Group related constants

### Tests
- **Component name + '.test'**: `SettingsModule.test.jsx`
- **Hook name + '.test'**: `useDarkMode.test.js`
- **Utility name + '.test'**: `themeUtils.test.js`

## Import/Export Structure

### Index Files
```javascript
// src/components/index.js
export { default as SettingsModule } from './SettingsModule'
export { default as DarkModeToggle } from './DarkModeToggle'
export { default as ExportManager } from './ExportManager'
export { default as MessageGenerator } from './MessageGenerator'
export { default as MessageTemplateEditor } from './MessageTemplateEditor'

// src/hooks/index.js
export { default as useDarkMode } from './useDarkMode'
export { default as useExport } from './useExport'
export { default as useMessageTemplates } from './useMessageTemplates'

// src/utils/index.js
export * from './themeUtils'
export * from './exportUtils'
export * from './messageUtils'
```

### Import Patterns
```javascript
// Component imports
import { SettingsModule, DarkModeToggle } from '../components'

// Hook imports
import { useDarkMode, useExport } from '../hooks'

// Utility imports
import { applyTheme, createZipFile } from '../utils'

// Context imports
import { ThemeContext, MessageContext } from '../contexts'
```

## Development Workflow

### 1. Component Development
1. Create component file in appropriate directory
2. Add component to index.js export
3. Create corresponding test file
4. Update documentation

### 2. Hook Development
1. Create hook file in hooks directory
2. Add hook to index.js export
3. Create corresponding test file
4. Update documentation

### 3. Utility Development
1. Create utility file in utils directory
2. Add utility to index.js export
3. Create corresponding test file
4. Update documentation

### 4. Database Changes
1. Create migration file in database/migrations
2. Update schema.sql
3. Create seed data if needed
4. Test migration in development

### 5. Testing
1. Unit tests for individual components/hooks/utils
2. Integration tests for workflows
3. E2E tests for complete user journeys
4. Performance tests for critical paths

---

*This file organization layout ensures clear separation of concerns, easy maintenance, and scalable architecture for the enhanced Settings Module.* 