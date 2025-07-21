# Codebase Overview

This document provides a high-level overview of the application's architecture, key components, and overall functionality.

## Project Structure

The project is a standard [Vite](https://vitejs.dev/) + [React](https://react.dev/) application, with the main source code located in the `src` directory.

-   **`public/`**: Contains static assets that are copied to the build output.
-   **`src/`**: The main application source code.
    -   **`assets/`**: Static assets like images and icons.
    -   **`components/`**: All React components. This is where the majority of the UI is defined.
    -   **`contexts/`**: React Context providers for global state management.
    -   **`hooks/`**: Custom React hooks.
    -   **`utils/`**: Utility functions used across the application.
    -   **`main.jsx`**: The application's entry point.
    -   **`App.jsx`**: The root React component.
    -   **`index.css`**: Global CSS styles.
    -   **`supabaseClient.js`**: Initializes and exports the Supabase client.
-   **`index.html`**: The main HTML file.
-   **`package.json`**: Lists project dependencies and scripts.
-   **`vite.config.js`**: Vite configuration.
-   **`tailwind.config.js`**: Tailwind CSS configuration.
-   **`postcss.config.js`**: PostCSS configuration.

## Core Technologies

-   **Frontend**: [React](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Backend & Database**: [Supabase](https://supabase.io/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Charting**: [Recharts](https://recharts.org/)
-   **Date & Time**: [date-fns](https://date-fns.org/)

## Architecture

The application follows a component-based architecture. The state is managed through a combination of local component state (`useState`, `useReducer`) and global state via React Context (`AppContext`, `NotificationContext`).

### Authentication

-   Authentication is handled by Supabase Auth.
-   The `App.jsx` component checks for an active session.
    -   If a session exists, the `Dashboard` component is rendered.
    -   If not, the `Auth` component is rendered, which provides a login form.

### State Management

-   **`NotificationContext`**: Manages application-wide notifications. It provides a `showNotification` function that can be used by any component to display a message to the user.
-   **`AppContext`**: This is the primary global state provider. It fetches and holds the main data for the application (students, groups, lessons, etc.) and makes it available to all components. It also provides functions to refetch this data, ensuring that the UI is always up-to-date.

### Components

The `src/components/` directory is organized by feature/module.

-   **`Dashboard.jsx`**: The main layout for authenticated users. It includes a sidebar for navigation and renders the active module.
-   **`*Module.jsx`** (e.g., `StudentsModule.jsx`, `GroupsModule.jsx`, `FinancesModule.jsx`): Each of these components represents a major feature of the application. They are responsible for fetching and displaying data related to that module, and for handling user interactions.
-   **`*Modal.jsx`** (e.g., `StudentFormModal.jsx`, `StudentDetailsModal.jsx`): These are modal dialogs used for creating, viewing, or editing data. They are typically opened from a `*Module.jsx` component.
-   **Shared Components**: There are also many shared components like `Modal.jsx`, `Button.jsx`, `Input.jsx`, `ConfirmationModal.jsx`, etc., which are used throughout the application to maintain a consistent UI.

## Functionality

The application appears to be a **Student Management System**, likely for a tutoring center or a small school.

### Key Features

-   **Dashboard**: A central hub that provides an overview of the application's data.
-   **Student Management**:
    -   Add, edit, and view student information.
    -   Track student payments and installments.
    -   Monitor student attendance.
    -   Manage tutoring sessions for individual students.
-   **Group Management**:
    -   Create and manage student groups.
    -   Assign students to groups.
    -   Schedule lessons for groups.
-   **Financial Management**:
    -   Track income and expenses.
    -   View financial overviews and reports.
    -   Generate invoices.
-   **Scheduling**:
    -   Schedule lessons for groups and individual tutoring students.
    -   View a weekly overview of scheduled events.
-   **Document Management**:
    -   Upload and manage documents related to students.

## Data Flow

1.  The `App` component initializes and checks for an authenticated user.
2.  If the user is authenticated, the `Dashboard` is rendered.
3.  The `AppContext` provider fetches the initial data (students, groups, etc.) from Supabase.
4.  The user navigates to a module (e.g., "Students").
5.  The `StudentsModule` component gets the student data from `AppContext` and displays it.
6.  When the user performs an action (e.g., adds a new student), a modal (`StudentFormModal`) is opened.
7.  Upon form submission, the data is sent to Supabase.
8.  After the data is successfully saved, the `fetchData` function from `AppContext` is called to refresh the global state, which in turn updates the UI.

This covers the main aspects of the application. For more detailed information, refer to the source code of the individual components.
