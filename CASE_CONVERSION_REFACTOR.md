# Case Conversion Refactoring

## Overview

This refactoring implements automatic conversion between snake_case (database) and camelCase (JavaScript) for all data operations in the application.

## Changes Made

### 1. Created Case Conversion Utilities (`src/utils/caseConverter.js`)

- `snakeToCamel(str)`: Converts snake_case strings to camelCase
- `camelToSnake(str)`: Converts camelCase strings to snake_case
- `convertKeysToCamelCase(obj)`: Converts all object keys from snake_case to camelCase
- `convertKeysToSnakeCase(obj)`: Converts all object keys from camelCase to snake_case

### 2. Updated API Client (`src/apiClient.js`)

- **Data Fetching**: All data returned from Supabase is automatically converted from snake_case to camelCase
- **Data Sending**: All data sent to Supabase is automatically converted from camelCase to snake_case
- **Operations Covered**:
  - `getAll()` - Fetch all records
  - `getById()` - Fetch single record
  - `create()` - Create new record
  - `update()` - Update existing record
  - `delete()` - Delete record
  - `getStudentsWithGroups()` - Fetch with joins
  - `getGroupsWithStudentCount()` - Fetch with RPC calls

### 3. Simplified AppContext (`src/contexts/AppContext.jsx`)

- Removed manual field name conversions since apiClient now handles them automatically
- Kept JSON parsing for complex fields (installments, documents, etc.)
- Updated field references to use camelCase names

### 4. Updated All Components

All components that previously used direct Supabase calls now use the apiClient:

- `AttendanceModal.jsx`
- `DocumentEditModal.jsx`
- `GroupFormModal.jsx`
- `EventFormModal.jsx`
- `TransactionFormModal.jsx`
- `LessonFormModal.jsx`
- `TodoModule.jsx`
- `StudentFormModal.jsx`
- `AddStudentToGroupModal.jsx`
- `GroupDetailsModal.jsx`
- `StudentPaymentDetailsModal.jsx`
- `SettingsModule.jsx`
- `StudentDetailsModal.jsx`
- `DashboardModule.jsx`
- `DocumentsModule.jsx`

### 5. Field Name Changes

#### Database Fields (snake_case) → JavaScript Fields (camelCase)

**Students:**
- `full_name` → `fullName`
- `student_contact` → `studentContact`
- `parent_name` → `parentName`
- `parent_contact` → `parentContact`
- `group_id` → `groupId`
- `is_tutoring` → `isTutoring`
- `is_archived` → `isArchived`
- `enrollment_date` → `enrollmentDate`
- `birth_date` → `birthDate`
- `price_per_lesson` → `pricePerLesson`
- `fee_details` → `feeDetails`
- `tutoring_details` → `tutoringDetails`
- `document_names` → `documentNames`

**Groups:**
- `group_name` → `groupName`
- `start_date` → `startDate`
- `end_date` → `endDate`
- `program_length` → `programLength`
- `is_archived` → `isArchived`

**Lessons:**
- `lesson_date` → `lessonDate`
- `start_time` → `startTime`
- `end_time` → `endTime`
- `material_url` → `materialUrl`
- `material_name` → `materialName`
- `group_id` → `groupId`
- `student_id` → `studentId`

**Events:**
- `event_name` → `eventName`
- `start_time` → `startTime`
- `end_time` → `endTime`
- `is_all_day` → `isAllDay`

**Transactions:**
- `transaction_date` → `transactionDate`
- `expense_type` → `expenseType`
- `invoice_url` → `invoiceUrl`
- `invoice_name` → `invoiceName`
- `student_id` → `studentId`

**Documents:**
- `upload_date` → `uploadDate`
- `storage_path` → `storagePath`

**Todos:**
- `user_id` → `userId`
- `is_completed` → `isCompleted`
- `due_date` → `dueDate`

## Benefits

1. **Consistency**: All JavaScript code now uses camelCase consistently
2. **Maintainability**: No more manual field name conversions scattered throughout the codebase
3. **Type Safety**: Reduced risk of typos in field names
4. **Developer Experience**: Better IDE autocomplete and IntelliSense
5. **Centralized Logic**: All conversion logic is in one place

## What Wasn't Changed

- **Authentication calls** (`supabase.auth.*`) - These don't involve database field names
- **Storage calls** (`supabase.storage.*`) - These are for file operations, not database fields
- **JSON fields** - Complex fields like `installments`, `documents`, `schedule` still need manual JSON parsing

## Testing

The case conversion utilities have been tested and verified to work correctly with all common field name patterns used in the application.

## Migration Notes

- All existing code should continue to work as expected
- New code should use camelCase field names when working with data
- Database schema remains unchanged (still uses snake_case)
- The conversion is transparent to the database layer 