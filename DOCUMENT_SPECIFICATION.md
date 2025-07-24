# UDMS - Document Specification

## Project Overview
UDMS (University Document Management System) is a comprehensive student and document management application built with React, Supabase, and modern web technologies.

## Settings Module Specification

### 6. Settings Module Requirements

#### 6.1 Core Functionality
- **Dark Mode Toggle**: System-wide theme switching
- **Data Export**: Comprehensive system export functionality
- **Message Generation**: Automated message templates for late payments and student absence

#### 6.2 Export System Requirements
- **Student Data**: Complete student lists and details
- **Group Data**: Complete group lists and details  
- **Documents**: Organized by categories in zip file
- **Format**: ZIP file with structured folders
- **Metadata**: Export timestamps and system information

#### 6.3 Message Generation System
- **Late Payment Messages**: Automated templates for overdue payments
- **Student Absence Messages**: Automated templates for missed lessons
- **Template Editing**: Customizable message templates
- **Parent Communication**: Direct messaging to student parents

### Technical Architecture

#### Frontend Structure
```
src/
├── components/
│   ├── SettingsModule.jsx          # Main settings component
│   ├── DarkModeToggle.jsx          # Dark mode switch component
│   ├── ExportManager.jsx           # Data export functionality
│   ├── MessageGenerator.jsx        # Message template system
│   ├── MessageTemplateEditor.jsx   # Template editing interface
│   └── SettingsCard.jsx            # Reusable settings card component
├── contexts/
│   ├── ThemeContext.jsx            # Dark mode context
│   └── MessageContext.jsx          # Message templates context
├── hooks/
│   ├── useDarkMode.js              # Dark mode hook
│   ├── useExport.js                # Export functionality hook
│   └── useMessageTemplates.js      # Message templates hook
├── utils/
│   ├── exportUtils.js              # Export utilities
│   ├── messageUtils.js             # Message generation utilities
│   └── themeUtils.js               # Theme utilities
└── styles/
    ├── darkMode.css                # Dark mode styles
    └── settings.css                # Settings-specific styles
```

#### Database Schema Updates
```sql
-- Settings table enhancements
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS export_settings JSONB DEFAULT '{}';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS message_templates JSONB DEFAULT '{}';

-- Message templates structure
{
  "latePayment": {
    "subject": "Payment Reminder",
    "body": "Dear {parentName}, your child {studentName} has an overdue payment...",
    "variables": ["parentName", "studentName", "amount", "dueDate"]
  },
  "studentAbsence": {
    "subject": "Absence Notification", 
    "body": "Dear {parentName}, your child {studentName} was absent on {date}...",
    "variables": ["parentName", "studentName", "date", "lesson"]
  }
}
```

### Component Specifications

#### 6.1 DarkModeToggle Component
**Purpose**: System-wide dark mode switching
**Features**:
- Toggle switch with smooth animation
- Persistent state across sessions
- CSS custom properties for theming
- Automatic system preference detection

**Props**:
```javascript
{
  isDark: boolean,
  onToggle: function,
  className?: string
}
```

**State Management**:
- ThemeContext for global state
- localStorage for persistence
- CSS custom properties for styling

#### 6.2 ExportManager Component
**Purpose**: Comprehensive data export functionality
**Features**:
- Progress tracking with visual indicators
- Structured ZIP file generation
- Category-based document organization
- Export history and logs

**Export Structure**:
```
udms_export_YYYY-MM-DD/
├── students/
│   ├── students.json
│   └── student_documents/
├── groups/
│   ├── groups.json
│   └── group_schedules/
├── documents/
│   ├── student_documents/
│   ├── finance_documents/
│   └── meb_documents/
├── finances/
│   ├── transactions.json
│   └── expenses.json
├── lessons/
│   └── lessons.json
├── events/
│   └── events.json
└── export_metadata.json
```

#### 6.3 MessageGenerator Component
**Purpose**: Automated message generation for parents
**Features**:
- Template-based message generation
- Variable substitution system
- Preview functionality
- Bulk message sending

**Message Types**:
1. **Late Payment Messages**
   - Student name, amount, due date
   - Payment plan details
   - Contact information

2. **Student Absence Messages**
   - Student name, date, lesson details
   - Attendance tracking
   - Follow-up instructions

#### 6.4 MessageTemplateEditor Component
**Purpose**: Customizable message template editing
**Features**:
- Rich text editor for template content
- Variable insertion system
- Template preview
- Version control for templates

**Template Variables**:
```javascript
const templateVariables = {
  student: ['firstName', 'lastName', 'fullName', 'id'],
  parent: ['parentName', 'parentPhone', 'parentEmail'],
  payment: ['amount', 'dueDate', 'installmentNumber', 'totalAmount'],
  lesson: ['lessonDate', 'lessonTime', 'lessonTopic', 'groupName'],
  system: ['businessName', 'businessPhone', 'businessEmail']
};
```

### Implementation Guidelines

#### 6.1 Dark Mode Implementation
1. **CSS Custom Properties**: Define theme variables
2. **Context Provider**: Global theme state management
3. **Persistent Storage**: localStorage for user preference
4. **Smooth Transitions**: CSS transitions for theme switching

#### 6.2 Export Implementation
1. **JSZip Library**: For ZIP file generation
2. **Progress Tracking**: Real-time upload progress
3. **Error Handling**: Comprehensive error management
4. **File Organization**: Structured folder hierarchy

#### 6.3 Message System Implementation
1. **Template Engine**: Variable substitution system
2. **Rich Text Editor**: React Quill or similar
3. **Preview System**: Real-time template preview
4. **Bulk Operations**: Efficient message sending

### File Organization Strategy

#### Component Separation
- **Single Responsibility**: Each component has one clear purpose
- **Reusability**: Components designed for reuse across modules
- **Maintainability**: Clear file structure and naming conventions
- **Testability**: Components designed for easy testing

#### State Management
- **Context API**: For global state (theme, settings)
- **Local State**: For component-specific state
- **Custom Hooks**: For reusable logic
- **Persistence**: localStorage for user preferences

#### Styling Strategy
- **CSS Custom Properties**: For theme switching
- **Tailwind CSS**: For utility-first styling
- **Component-Specific Styles**: For unique styling needs
- **Responsive Design**: Mobile-first approach

### Development Phases

#### Phase 1: Foundation
1. Create ThemeContext and dark mode infrastructure
2. Implement basic dark mode toggle
3. Set up CSS custom properties system

#### Phase 2: Export System
1. Create ExportManager component
2. Implement ZIP file generation
3. Add progress tracking and error handling

#### Phase 3: Message System
1. Create MessageGenerator component
2. Implement template engine
3. Add template editor functionality

#### Phase 4: Integration
1. Integrate all components into SettingsModule
2. Add comprehensive error handling
3. Implement user feedback and notifications

### Quality Assurance

#### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **User Testing**: Real-world usage scenarios
- **Performance Testing**: Export and message generation performance

#### Code Quality
- **ESLint**: Code style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type safety (if applicable)
- **Documentation**: Comprehensive code documentation

### Performance Considerations

#### Export Performance
- **Chunked Processing**: Large data sets processed in chunks
- **Progress Indicators**: Real-time progress feedback
- **Memory Management**: Efficient memory usage for large exports
- **Background Processing**: Non-blocking export operations

#### Message Generation Performance
- **Template Caching**: Cached template compilation
- **Bulk Operations**: Efficient bulk message processing
- **Preview Optimization**: Fast template preview rendering
- **Variable Resolution**: Optimized variable substitution

### Security Considerations

#### Data Export Security
- **User Authentication**: Export only for authenticated users
- **Data Sanitization**: Sanitize exported data
- **Access Control**: User-specific data access
- **Audit Logging**: Export activity logging

#### Message System Security
- **Template Validation**: Validate message templates
- **Variable Sanitization**: Sanitize template variables
- **Rate Limiting**: Prevent message spam
- **Privacy Protection**: Protect sensitive information

### Future Enhancements

#### Potential Features
1. **Advanced Export Options**: Custom export configurations
2. **Message Scheduling**: Scheduled message sending
3. **Template Categories**: Organized template management
4. **Analytics**: Export and message usage analytics
5. **API Integration**: External messaging service integration

#### Scalability Considerations
1. **Database Optimization**: Efficient data queries
2. **Caching Strategy**: Intelligent caching system
3. **Load Balancing**: Handle multiple concurrent users
4. **Storage Optimization**: Efficient file storage management

---

## Development Standards

### Code Style
- **Consistent Naming**: camelCase for variables, PascalCase for components
- **Component Structure**: Functional components with hooks
- **Error Handling**: Comprehensive error boundaries
- **Documentation**: JSDoc comments for all functions

### Git Workflow
- **Feature Branches**: Separate branches for each feature
- **Commit Messages**: Clear, descriptive commit messages
- **Code Review**: Peer review for all changes
- **Testing**: All changes must pass tests

### Deployment
- **Environment Configuration**: Separate configs for dev/staging/prod
- **Build Optimization**: Optimized production builds
- **Monitoring**: Application performance monitoring
- **Backup Strategy**: Regular data backups

---

*This specification serves as the primary reference document for all Settings Module development work.* 