# Team Availability System

A full-stack web application for managing team availability and status tracking. The system consists of a React frontend with Tailwind CSS and a Node.js/Express backend with PostgreSQL database.

## Prerequisites

Before running the application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16.0.0 or higher)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Project Structure

```
team-availability-system/
├── backend/              # Node.js/Express API server
├── frontend/             # React frontend application
├── docker-compose.yml    # Docker configuration for PostgreSQL
├── schema.sql            # Database schema and sample data
├── env.example           # Environment variables template
└── README.md             # This file
```

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/danitbenoz/team-availability-system.git
cd team-availability-system
cd backend
cp ..\env.example .env
```

### 2. Start Database
```bash
docker-compose up -d
```

### 3. Setup Database Schema
```bash
# Connect to PostgreSQL and run schema
docker exec -i team-availability-db psql -U postgres -d team_availability < schema.sql
```

### 4. Install Dependencies
```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 5. Start the Application
```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Start frontend
cd frontend && npm start
```

The application will be available at `http://localhost:3000`

## Detailed Setup Instructions

### Database Setup with Docker

1. **Start PostgreSQL container:**
   ```bash
   docker-compose up -d
   ```
   This creates:
   - PostgreSQL 15 container named `team-availability-db`
   - Database: `team_availability`
   - User: `postgres` / Password: `postgres`
   - Port: `5432` (mapped to host)
   - Persistent data volume

2. **Initialize the database schema:**
   ```bash
   # Method 1: Using docker exec (recommended)
   docker exec -i team-availability-db psql -U postgres -d team_availability < schema.sql

   # Method 2: Connect manually and run commands
   docker exec -it team-availability-db psql -U postgres -d team_availability
   # Then copy/paste the contents of schema.sql
   ```

3. **Verify setup:**
   ```bash
   # Check if tables were created
   docker exec -it team-availability-db psql -U postgres -d team_availability -c "\\dt"

   # Check sample data
   docker exec -it team-availability-db psql -U postgres -d team_availability -c "SELECT * FROM statuses;"
   ```

### Environment Configuration

The `.env` file should contain:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=team_availability
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secure-jwt-secret-here
NODE_ENV=development
PORT=5000
```

**Important**: Change the `JWT_SECRET` to a secure random string before deploying.

### Installing Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Running the Application

### Method 1: Separate Terminals (Recommended for Development)

1. **Start the database:**
   ```bash
   docker-compose up -d
   ```

2. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```
   Backend runs on `http://localhost:5000`

3. **Start the frontend development server:**
   ```bash
   cd frontend
   npm start
   ```
   Frontend runs on `http://localhost:3000`

### Testing the Setup

1. **Check backend health:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return database connection status.

2. **Access the application:**
   - Open `http://localhost:3000` in your browser
   - Try logging in with sample users:
     - Username: `jon.snow` / Password: `password123`
     - Username: `sansa.stark` / Password: `password123`
     - Username: `bran.stark` / Password: `password123`
     - Username: `arya.stark` / Password: `password123`

## Available Scripts

### Frontend (React)
- `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run format` - Format code with Prettier

### Backend (Node.js)
- `npm start` - Start the server (http://localhost:5000)

### Docker Commands
- `docker-compose up -d` - Start PostgreSQL in background
- `docker-compose down` - Stop and remove containers
- `docker-compose logs postgres` - View database logs
- `docker-compose restart` - Restart the database
- `docker-compose down -v` - Stop and remove containers + data volume

## Database Management

### Connecting to PostgreSQL

```bash
# Connect via Docker
docker exec -it team-availability-db psql -U postgres -d team_availability

# Common PostgreSQL commands:
\dt                          # List tables
\d users                     # Describe users table
SELECT * FROM users;         # View all users
SELECT * FROM statuses;      # View all statuses
```

### Backup and Restore

```bash
# Backup
docker exec team-availability-db pg_dump -U postgres team_availability > backup.sql

# Restore
docker exec -i team-availability-db psql -U postgres -d team_availability < backup.sql
```

### Reset Database

```bash
# Remove all data and restart fresh
docker-compose down -v
docker-compose up -d
docker exec -i team-availability-db psql -U postgres -d team_availability < schema.sql
```

## Application Features

- **User Authentication**: JWT-based login system
- **Status Management**: Real-time availability tracking
- **Team Dashboard**: Overview of all team members
- **Status Updates**: Users can change their availability
- **Responsive Design**: Works on desktop and mobile

## API Endpoints

- `GET /health` - Health check with database status
- `POST /api/auth/login` - User authentication
- `GET /api/users` - Get all users with statuses
- `GET /api/users/me` - Get current user profile (protected)
- `PUT /api/users/me/status` - Update current user status (protected)
- `GET /api/statuses` - Get all available statuses

## Technology Stack

### Frontend
- React 18 with React Router DOM
- Tailwind CSS for styling
- Axios for API communication
- React Testing Library for testing

### Backend
- Node.js with Express framework
- PostgreSQL database with pg driver
- JWT authentication with bcrypt
- Security middleware (Helmet, CORS)
- Input validation with express-validator

### Infrastructure
- Docker for PostgreSQL database
- Docker Compose for container orchestration

## Troubleshooting

### Database Issues

1. **Connection failed:**
   ```bash
   # Check if Docker is running
   docker --version

   # Check container status
   docker-compose ps

   # View logs
   docker-compose logs postgres

   # Restart database
   docker-compose restart
   ```

2. **Tables don't exist:**
   ```bash
   # Re-run schema setup
   docker exec -i team-availability-db psql -U postgres -d team_availability < schema.sql
   ```

3. **Permission denied:**
   ```bash
   # Check if PostgreSQL is running locally (should be stopped)
   sudo service postgresql status
   # If running: sudo service postgresql stop
   ```

### Application Issues

1. **Port conflicts:**
   - Backend (5000): Change `PORT` in `.env`
   - Frontend (3000): Automatically finds next available port
   - Database (5432): Modify `docker-compose.yml` ports section

2. **Module not found:**
   ```bash
   # Clear and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **CORS errors:**
   - Ensure backend is running on port 5000
   - Check frontend proxy configuration in `package.json`

### Authentication Issues

1. **Login fails:**
   - Verify database has sample users: `SELECT * FROM users;`
   - Check if passwords are hashed correctly
   - Ensure JWT_SECRET is set in `.env`

2. **Token errors:**
   - Verify JWT_SECRET matches between requests
   - Check token expiration (24h default)

## Development Tips

1. **Database changes:**
   - Modify `schema.sql` for table changes
   - Re-run schema after changes: `docker exec -i team-availability-db psql -U postgres -d team_availability < schema.sql`

2. **Adding new users:**
   - Hash passwords with bcrypt before inserting
   - Or use the application's registration endpoint (if implemented)

3. **Monitoring:**
   - Backend logs: Check terminal running `npm start`
   - Database logs: `docker-compose logs postgres`
   - Frontend logs: Browser developer console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
