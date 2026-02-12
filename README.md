# Employee Dashboard - DJBC Capstone Project

A comprehensive employee management and monitoring system for the Directorate General of Customs and Excise (DJBC). This web application tracks employee activities, tasks, attendance, leave requests, and performance reviews in real-time.

## Overview

This is a full-featured HR and operations dashboard built with React, Vite, and Supabase. The system supports both supervisor and employee roles with role-based access control. Features include GPS-based attendance tracking, real-time task management, and an AI-powered chatbot assistant.

## Features

### Dashboard
- Real-time metrics and performance analytics
- Attendance trends visualization
- Task completion charts
- Leave management overview
- Recent performance reviews
- Customizable widgets with local storage persistence
- Dark mode support

### Attendance Management
- GPS-based clock in and out system
- Location verification within 100 meters of office
- Real-time distance tracking
- Attendance history and statistics
- Export attendance records to CSV and Excel formats
- Supervisor view of team attendance

### Task Management
- Kanban board with drag-and-drop functionality
- Timeline view for tracking deadlines
- Task creation and assignment
- Three priority levels: Low, Normal, High
- Task status tracking: To Do, In Progress, Ready for Review, Approved, Revision Needed
- File upload capability for task submissions
- Real-time notification system

### Leave Management
- Submit leave requests for date ranges
- Supervisor approval workflow
- Leave history and balance tracking
- Integration with attendance system
- Real-time notifications for approvals

### Performance Reviews
- Supervisor-assigned performance evaluations
- Multi-criteria scoring system: Quality, Discipline, and Teamwork
- Historical review tracking
- Automatic average score calculations
- Employee access to their own reviews

### Activity Logs
- Daily contribution tracking
- Activity categorization: Bug Fix, Feature, Documentation, Testing, Deployment
- Supervisor view of team activities
- Date range filtering capability

### AI Chatbot Assistant
- Google Generative AI (Gemini) powered assistant
- Context-aware responses using employee data
- Task insights and recommendations
- In-app chat interface

### Security Features
- Content Security Policy (CSP) headers
- Secure authentication with Supabase
- Role-based access control
- Input sanitization with DOMPurify
- HTTPS and HSTS enforcement
- X-Frame-Options and XSS protection

## Technology Stack

- **Frontend**: React 19.1.1, Vite 5
- **Styling**: Tailwind CSS 3
- **Backend**: Supabase with PostgreSQL
- **Real-time Updates**: Supabase Realtime subscriptions
- **Charts**: Recharts 3.3.0
- **Maps**: Leaflet 1.9.4 with React-Leaflet 5.0.0
- **Artificial Intelligence**: Google Generative AI SDK
- **UI Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Hosting**: Vercel

## Installation

### Requirements
- Node.js version 16 or higher
- npm or yarn package manager
- Supabase account
- Google Generative AI API key for the chatbot feature

### Setup Instructions

1. Clone the repository
```bash
git clone <repository-url>
cd Capstone-shit
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env` file in the root directory with the following variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_google_generative_ai_api_key
```

4. Start the development server
```bash
npm run dev
```

The application will run at `http://localhost:5173`

## Building and Deployment

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm preview
```

### Code Quality Check
```bash
npm run lint
```

### Vercel Deployment
The project includes `vercel.json` configuration for automatic deployment. Push to your repository and connect it to Vercel for continuous deployment.

## Project Structure

```
src/
├── App.jsx                 # Main application component with authentication and data fetching
├── main.jsx               # Vite entry point
├── index.css              # Global stylesheet
├── supabaseClient.js      # Supabase client configuration
│
├── components/
│   ├── ChatBot.jsx        # AI assistant chatbot component
│   ├── ExportButton.jsx   # Data export functionality for CSV and Excel
│   ├── Header.jsx         # Application header with notifications
│   ├── Icons.jsx          # Reusable icon components
│   ├── Modal.jsx          # Generic modal dialog component
│   ├── OfficeMap.jsx      # Leaflet map for location display
│   └── Sidebar.jsx        # Navigation sidebar
│
├── utils/
│   └── rateLimiter.js     # API rate limiting utility
│
└── views/
    ├── AttendanceView.jsx          # Attendance tracking and clock in/out
    ├── ContributionsView.jsx       # Activity logs and contribution tracking
    ├── DashboardView.jsx           # Main dashboard with analytics and charts
    ├── LeaveView.jsx               # Leave request management interface
    ├── LoginPage.jsx               # User authentication page
    ├── PerformanceReviewView.jsx   # Performance evaluation interface
    ├── SettingsView.jsx            # User account settings
    └── TasksView.jsx               # Task management board and timeline
```

## Configuration

### Office Location Settings
Location: `src/views/AttendanceView.jsx`

```javascript
const OFFICE_LOCATION = {
  lat: -6.20651363,
  lng: 106.87604852
};
const ALLOWED_RADIUS_METERS = 100;
```

### Work Hours Configuration
```javascript
const WORK_START_TIME = '08:00:00';
```

## User Roles

### Supervisor Role
- Access to all employee data
- Task management and assignment
- Leave request approval authority
- Performance review capabilities
- Team attendance monitoring
- View all employee contributions

### Employee Role
- Personal dashboard access
- Clock in and out with GPS verification
- Submit leave requests
- View assigned tasks and status updates
- Access personal performance reviews
- Log daily contributions
- Use AI chatbot assistant

## Real-time Capabilities

The application uses Supabase Realtime for:
- Task updates and notifications
- Notification delivery to users
- Performance review updates
- Data synchronization across all users

## Responsive Design

The application is responsive across all devices with:
- Mobile-first design approach
- Tailwind CSS responsive breakpoints
- Mobile-optimized sidebar navigation
- Touch-friendly user interface

## Dark Mode

Dark mode can be toggled using the button in the application header. User preference is saved in browser local storage.

## Debugging

In development mode, enable verbose logging. Console logs are prefixed with `[Dev]` for easy filtering and identification.

## Database Schema

Key database tables in Supabase:
- `profiles` - User information and roles
- `tasks` - Task data and assignments
- `attendance` - Clock in and out records
- `leave_requests` - Leave request information
- `performance_reviews` - Review scores and feedback
- `contributions` - Daily activity logs
- `notifications` - User notifications

## Security Practices

- All API endpoints implement Supabase Row Level Security (RLS)
- Sensitive data endpoints are protected by role restrictions
- Geolocation data access is limited to authenticated users
- Input validation and sanitization on all forms
- Configuration management through environment variables

## License

This project is part of the DJBC Capstone Project.

## Development

### Running Tests
```bash
npm run test
```

### Code Quality Verification
The project uses ESLint for maintaining code standards:
```bash
npm run lint
```

## Contributing

1. Create a feature branch for your changes
2. Make your modifications and test thoroughly
3. Ensure code quality by running lint checks
4. Submit a pull request for review

## Support

For issues, bugs, or questions, please create an issue in the repository.

---

**Last Updated**: February 2026
**Version**: 0.0.0
