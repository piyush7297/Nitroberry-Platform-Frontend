see# Enterprise FMS (Form Management System)

A comprehensive platform management system built with Next.js for managing forms, workflows, users, and organizational processes.

## 🌐 Live Application

**Live URL**: [https://app.nitroberry.com/](https://app.nitroberry.com/)

Access the production application at the link above.

## Overview

Enterprise FMS is a modern web application designed to streamline form management, workflow automation, and user administration. It provides a centralized platform for creating, managing, and tracking forms, indents (requests), and their associated workflows.

## Features

### Core Functionality

- **Dashboard**: Overview and analytics of system activities
- **FMS Systems**: Create, edit, and manage form management systems with custom workflows
- **FMS Indents**: Manage draft and submitted form requests with status tracking
- **User Management**: Comprehensive user and group administration
- **Workflow Management**: Design and implement multi-step approval workflows
- **Reports**: Generate and view system reports
- **Notifications**: Real-time notifications for system events
- **Messages**: Internal messaging system
- **Settings**: User and company settings management

### Key Capabilities

- Multi-step workflow design with verifiers and initiators
- Form builder with dynamic field configuration
- Status tracking and comment system for indents
- Role-based access control
- User and group management
- Template-based form creation

## Tech Stack

### Frontend

- **Framework**: Next.js 15.5.3 (App Router)
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React, Tabler Icons
- **Forms**: Formik with Yup validation
- **State Management**: TanStack Query (React Query)
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Drag & Drop**: dnd-kit

### Backend Integration

- **HTTP Client**: Axios
- **API Management**: Custom API client with React Query hooks

### Development Tools

- **Language**: TypeScript 5
- **Linting**: ESLint
- **Build Tool**: Next.js

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd NitroBerry-App
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with your configuration:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
# Add other required environment variables
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── api/                # API routes
│   └── dashboard/          # Dashboard and main application pages
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   └── models/           # Modal components
├── api/                    # API client and utilities
├── context/               # React context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and constants
└── shared/                # Shared utilities and types
```

## Key Features Documentation

### FMS Systems

Create and manage form management systems with:

- Custom form fields
- Multi-step workflows
- Verifiers and initiators configuration
- Priority settings

### FMS Indents

Manage form requests with:

- Draft list management
- Status updates (Approved, Rejected, Pending)
- Comment system
- Workflow tracking

### User Management

- User and group administration
- Role-based permissions
- Department and job title management

## Authentication

The application uses NextAuth.js for authentication. Configure your authentication provider in the API routes.

## API Integration

The application uses a custom API client (`src/api/client.ts`) with React Query hooks for data fetching. API endpoints are defined in `src/api/endpoints.ts`.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private project - All rights reserved

## Deployment

### Live Production

The application is currently deployed and accessible at: [https://app.nitroberry.com/](https://app.nitroberry.com/)

### Build for Production

```bash
npm run build
npm run start
```

### Deploy on Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

For more details, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## Support

For issues and questions, please contact the development team.


