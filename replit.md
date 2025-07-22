# replit.md

## Overview

This is a modern full-stack task management application called TaskFlow, built as a Microsoft To-Do inspired clone. The application features a React + TypeScript frontend with Express.js backend, using PostgreSQL with Drizzle ORM for data persistence. The system supports group collaboration, list sharing, real-time updates via WebSockets, and authentication through Replit's OAuth system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Microsoft To-Do inspired theme
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Real-time Communication**: WebSocket server for live updates
- **Authentication**: Replit OAuth integration with session management
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Key Components

#### Database Schema
Located in `shared/schema.ts`, the database includes:
- **Users**: Core user information from Replit OAuth
- **Groups**: Collaborative groups for any number of members
- **Lists**: Task collections with privacy settings and color themes
- **Tasks**: Individual tasks with subtask support, due dates, assignment, and color-coded priority dots
- **Sharing**: List sharing permissions and member management
- **Sessions**: Secure session storage for authentication

#### Authentication System
- Implements Replit's OpenID Connect (OIDC) flow
- Passport.js strategy for OAuth integration
- PostgreSQL session store for persistence
- Middleware for protecting API routes

#### Real-time Features
- WebSocket server integrated with Express
- Client subscription management for list updates
- Real-time notifications for task changes, assignments, and list sharing

#### API Structure
RESTful API with endpoints for:
- User authentication and profile management
- Family group creation and member management
- List CRUD operations and sharing
- Task management with subtask support
- Real-time WebSocket connections

## Data Flow

1. **Authentication**: Users authenticate via Replit OAuth, creating sessions stored in PostgreSQL
2. **List Management**: Users create private or shared lists, organized by groups
3. **Task Operations**: Tasks are created, assigned, and updated with real-time synchronization and color-coded priority system
4. **Collaboration**: Group members can share lists and assign tasks to each other
5. **Real-time Updates**: WebSocket connections broadcast changes to all connected clients

## Recent Changes (January 2025)

### Simplified Brainstorming Whiteboard (Latest)
- **Professional Drawing Tools**: Line drawing with color selection and adjustable thickness
- **Smart Connection System**: Click-to-connect notes with labeled arrows and visual feedback
- **Simple Note Design**: Simplified sticky notes with square shape only
- **Three Priority Colors**: Green (low), Yellow (medium), Red (high) priority colors only
- **Text Formatting**: Bold, italic, underline options with hover controls on each note
- **Pan & Zoom Navigation**: Left-click drag to pan, scroll wheel zoom (30%-300% range)
- **Infinite Canvas**: Extended 120% viewport whiteboard with transform-based movement
- **Enhanced Visual Frame**: Multi-layered wooden borders with realistic shadows and gradients
- **Complex Background Patterns**: Grid, dots, and diagonal line overlays for professional appearance
- **Export Functionality**: Save complete whiteboard state as JSON file
- **Navigation Controls**: Reset view and fit-to-content buttons for easy navigation
- **Real-time Feedback**: Live zoom indicator and contextual instruction hints

### Core Features
- **Statistics Dashboard**: Comprehensive task analytics showing completion rates, performance metrics, and insights
- **Brainstorming Whiteboard**: Special brainstorming list with advanced whiteboard interface and sticky notes
- **Automatic Default Lists**: New users get seven starter lists: "My Day", "Tasks assigned to me", "Tasks", "Completed Tasks", "Shopping list", "Brainstorming", and "Statistics"
- **Enhanced Task Management**: Left-click editing, right-click delete, completion sounds, animated completion effects
- **Responsive Design**: Mobile/desktop toggle with 💻 Desktop and 📱 Mobile buttons
- **Enhanced Typography**: 1.5x bigger font sizes throughout interface for better readability
- **Smart Checkboxes**: Bigger checkboxes for sticky notes, smaller for My Day list
- **Task Organization**: Completed tasks automatically move to bottom of lists
- **Repeat Functionality**: Comprehensive repeat options for both tasks and sticky notes
- **Microsoft To-Do Style**: Due date picker, priority dots, and professional interface
- **Smart Task Completion**: Completed sticky notes automatically move to "Completed Tasks" list
- **Task Unticking**: Allow reversing task completion by clicking checkbox again
- **Daily Cleanup**: Automatic midnight cleanup of "My Day" list (moves tasks to "Tasks" list except those due next day or later)
- **Automatic Task Routing**: New tasks from sticky notes and "My Day" automatically go to "Tasks" list
- **Completion Routing**: All completed tasks automatically move to "Completed Tasks" list
- **User Profile Management**: Top-left profile dropdown with avatar, email, logout, edit profile, and switch accounts options
- **List Editing**: Full list editor with name and background color customization via right-click context menu
- **Immediate Task Actions**: Instant task creation and deletion without success toasts for cleaner UX
- **Undo System**: Deleted tasks show toast notification with "Undo" button to restore tasks immediately
- **Edit List Button**: Added prominent "Edit List" button below Desktop/Mobile toggle for easy access to list customization
- **Dark Mode Support**: Complete dark mode implementation with theme toggle in user profile section
- **Background Themes**: Customizable list backgrounds with gradients and patterns for visual organization
- **Groups System**: Renamed "Family Groups" to "Groups" to support any type of collaboration
- **Priority Visualization**: Color-coded priority dots (green/yellow/red) with enhanced visual indicators
- **UI Components**: Updated sidebar, task cards, and modals to reflect group terminology
- **Database Schema**: Updated table names and relationships from family-specific to general groups

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon database
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **express**: Web framework
- **passport**: Authentication middleware
- **ws**: WebSocket implementation

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **wouter**: Lightweight routing

### Development Dependencies
- **vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for development
- **esbuild**: Production backend bundling

## Deployment Strategy

### Development
- Uses Vite dev server with HMR for frontend development
- Express server runs with tsx for TypeScript execution
- Replit-specific development features with cartographer plugin

### Production Build
- Frontend builds to `dist/public` using Vite
- Backend bundles to `dist/index.js` using esbuild
- Static assets served by Express in production
- Environment variables required: `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`

### Database Setup
- Drizzle migrations stored in `./migrations`
- Database schema defined in `shared/schema.ts`
- PostgreSQL dialect with connection pooling
- Session table automatically created by connect-pg-simple

The application follows a monorepo structure with shared TypeScript types between client and server, ensuring type safety across the full stack. The architecture supports real-time collaboration while maintaining data consistency through the PostgreSQL backend.