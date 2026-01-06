# 🚌 Neary

A real-time bus tracking application providing live vehicle locations and schedule data.

## ✨ Features

- **🔴 Live Vehicle Tracking** - Real-time bus locations and ETAs via Tranzy API
- **🎯 Smart Favorites** - Personalized route tracking based on location
- **📱 Mobile-First Design** - Responsive interface optimized for mobile devices
- **⚡ Real-time Updates** - Automatic refresh with live data
- **🌐 Offline Support** - Service worker for offline functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd neary

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5175/`

### Production Build
```bash
npm run build
npm run preview
```

## 🏗️ Project Structure

```
neary/
├── 📂 src/                    # Source code
│   ├── 📂 components/         # React components
│   ├── 📂 services/           # API services & business logic
│   ├── 📂 stores/             # State management (Zustand)
│   └── 📂 utils/              # Utility functions
├── 📂 docs/                   # Documentation
├── 📂 tools/                  # Development tools
├── 📄 PROJECT_STRUCTURE.md    # Detailed structure guide
└── 📄 SETUP_GUIDE.md         # Setup instructions
```

## 🔧 Configuration

### Environment Setup
The app uses proxy configuration for API requests:
- **Tranzy API**: `/api/tranzy` → `https://api.tranzy.ai`

### Key Configuration Files
- `vite.config.ts` - Build configuration and API proxies
- `src/services/` - API service configurations
- `tailwind.config.js` - UI styling configuration

## 📊 Data Sources

### Primary Data Source
1. **🔴 Tranzy API** (Real-time Transit Data)
   - Live vehicle positions and tracking
   - Route information and schedules
   - Real-time ETAs based on current vehicle locations

### Data Processing
- **Route Labels**: User-facing route numbers (e.g., "42")
- **Route IDs**: Internal API identifiers (e.g., "40")
- **Mapping**: Route Label "42" ↔ Tranzy Route ID "40"

## 🎯 Key Features

### Smart Favorites System
- **Location-Based**: Automatically determines direction based on GPS
- **Context-Aware**: Shows "towards work" or "towards home" routes
- **Real-time Updates**: Live vehicle tracking with ETA calculations

### Confidence Indicators
- **🔴 LIVE**: Real-time vehicle tracking data from Tranzy API
- **⏱️ ESTIMATED**: Calculated timing based on available data

### Error Handling
- **Graceful Fallbacks**: Handles API failures and network issues
- **Network Resilience**: Retry logic for reliable data fetching
- **User Feedback**: Clear error messages and loading states

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/stores/vehicleStore.test.ts
```

### Test Coverage
- **271 tests** with **100% pass rate**
- Unit tests for all services and components
- Integration tests for API interactions
- Mock configurations for reliable testing

## 🛠️ Development Tools

### Debug Tools (`/tools/debug/`)
- `debug-config.js` - Configuration validation
- `debug-favorites.js` - Favorites system debugging
- `debug-schedule-issue.js` - Schedule service debugging

### Test Scripts (`/tools/test/`)
- API integration verification
- Route mapping validation
- Proxy functionality testing

## 📚 Documentation

### Implementation Guides (`/docs/implementation/`)
- Feature implementation summaries
- API integration guides
- Architecture documentation

### Troubleshooting (`/docs/troubleshooting/`)
- Common issues and solutions
- Error fix documentation
- Performance optimization guides

## 🔍 Architecture

### State Management
- **Zustand** for lightweight state management
- **Enhanced Bus Store** for main application state
- **Location Store** for GPS and user location
- **Config Store** for user preferences

### API Layer
- **Service Pattern** for API interactions
- **Error Boundaries** for graceful error handling
- **Caching Strategy** for performance optimization
- **Retry Logic** for network resilience

### UI Components
- **React + TypeScript** for type safety
- **Tailwind CSS** for responsive design
- **Component Library** for consistent UI
- **Mobile-First** responsive design approach

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] API keys and endpoints verified
- [ ] Build optimization enabled
- [ ] Service worker configured
- [ ] Error monitoring setup

### Performance Optimization
- **Code Splitting** for faster initial load
- **Service Worker** for offline functionality
- **API Caching** for reduced network requests
- **Bundle Optimization** for smaller file sizes

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check `/docs/` for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Setup Help**: See `SETUP_GUIDE.md` for installation help
- **Architecture**: See `PROJECT_STRUCTURE.md` for technical details

---

**🎯 Built with ❤️ for public transportation**