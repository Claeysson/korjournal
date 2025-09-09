# Körjournal - Travel Log Application

A Swedish travel journal application built with Next.js for tracking vehicle trips, fuel consumption, and generating PDF reports.

## Features

- **CSV Import** - Import travel data from CSV files with automatic encoding detection
- **Trip Management** - View, filter, and edit travel entries with mobile-responsive design
- **Statistics Dashboard** - Track fuel consumption, electric usage, and travel patterns
- **PDF Export** - Generate professional travel reports with customizable driver information
- **Database Recovery** - Automatic corruption detection and recovery system
- **Security** - File upload validation and path traversal protection

## Tech Stack

- **Frontend**: Next.js 15.3.3, React, TypeScript, Bootstrap
- **Backend**: Next.js API Routes, SQLite database
- **PDF Generation**: jsPDF with autoTable
- **Deployment**: PM2 process manager

## Project Structure

```
├── korjournal/           # Main Next.js application
│   ├── src/
│   │   ├── app/         # Next.js app router
│   │   ├── components/  # React components
│   │   └── lib/         # Database and utility functions
│   ├── data/            # SQLite database storage
│   └── uploads/         # CSV backup files
├── ecosystem.config.js   # PM2 configuration
└── README.md            # This file
```

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Körjournal
   ```

2. **Install dependencies**
   ```bash
   cd korjournal
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## Production Deployment

### Using PM2 (Recommended)

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Build the application**
   ```bash
   cd korjournal
   npm run build
   ```

3. **Start with PM2**
   ```bash
   # From root directory
   pm2 start ecosystem.config.js
   ```

4. **PM2 Management Commands**
   ```bash
   pm2 status           # View running processes
   pm2 logs korjournal  # View application logs
   pm2 restart korjournal  # Restart application
   pm2 stop korjournal  # Stop application
   pm2 delete korjournal   # Remove from PM2
   ```

### Manual Production

```bash
cd korjournal
npm run build
PORT=3000 npm start
```

## Configuration

### Environment Variables

Create `.env.local` in the korjournal directory:

```env
NODE_ENV=production
PORT=80  # or your preferred port
```

### PM2 Configuration

The `ecosystem.config.js` file configures:
- **Production port**: 80 (requires root privileges)
- **Development port**: 3000
- **Log files**: `./logs/` directory
- **Auto-restart**: Enabled
- **Memory limit**: 1GB

### Port 80 Considerations

Running on port 80 requires root privileges:

```bash
# Option 1: Run with sudo (development only)
sudo pm2 start ecosystem.config.js

# Option 2: Use port forwarding (recommended)
# Run app on port 3000, use nginx/proxy for port 80
```

## Usage

### CSV Import
1. Navigate to the import section
2. Upload CSV files with travel data
3. Configure category mapping if needed
4. Files are automatically backed up to `uploads/` directory

### Supported CSV Format
```
Category;Date;OdometerStart;StartLocation;EndDate;OdometerEnd;EndLocation;Duration;Distance;FuelConsumption;Title;BatteryConsumption;BatteryRegeneration;Notes
```

### PDF Export
1. Configure driver information in export settings
2. Set date filters and category filters as needed
3. Click "Exportera PDF" to generate report
4. Report opens in new tab with professional formatting

## Database

- **Type**: SQLite
- **Location**: `korjournal/data/trips.db`
- **Backup**: Automatic corruption detection with recovery
- **Tables**: `trips`, `settings`

### Database Recovery

The application includes automatic database corruption detection:
- Validates database integrity on startup
- Creates backups before recovery
- Rebuilds database structure if corrupted
- User-friendly error messages in Swedish

## Security Features

- File upload validation (CSV only)
- Path traversal protection
- Filename sanitization
- Database corruption detection
- SQL injection protection via parameterized queries

## Troubleshooting

### Common Issues

1. **Port 80 Permission Denied**
   - Run with sudo or use port forwarding
   - Consider changing production port to 3000 in ecosystem.config.js

2. **Database Corruption**
   - Application automatically detects and recovers
   - Re-import CSV files from uploads/ directory if needed

3. **CSV Import Issues**
   - Check file encoding (UTF-8, UTF-16 supported)
   - Verify CSV format matches expected structure
   - Check browser console for detailed error messages

### Logs

- **Development**: Console output
- **Production**: PM2 logs in `logs/` directory
  ```bash
  pm2 logs korjournal  # View real-time logs
  tail -f logs/out.log # View output logs
  tail -f logs/err.log # View error logs
  ```

## Contributing

1. Create feature branch from `main`
2. Make changes in `korjournal/` directory
3. Test thoroughly
4. Run linting and type checking
5. Submit pull request
