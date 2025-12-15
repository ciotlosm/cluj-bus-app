# Getting Started with Cluj Bus App

## 🚀 Quick Setup

### Prerequisites
- **Node.js 18+** (check with `node --version`)
- **npm** (comes with Node.js)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd cluj-bus
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   - Go to `http://localhost:5175`
   - The app should load without errors

## 🧙‍♂️ Setup Wizard

The app will guide you through a 2-step setup process:

### Step 1: API Key
1. **Get an API key** from [Tranzy.ai](https://tranzy.ai)
2. **Enter it in the setup wizard** when the app first loads
3. **Test the connection** - the wizard will validate your key

### Step 2: City Selection
1. **Choose your city** from the available options
2. **This is set once** and stored locally for all future use
3. **Complete setup** - you're ready to track buses!

## ✅ Verify Everything Works

After setup, you should see:
- ✅ App loads at `http://localhost:5175`
- ✅ No errors in browser console
- ✅ Route 42 shows schedule including 15:45 departure
- ✅ Live bus positions (if API key is configured)

## 🧪 Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

All 271 tests should pass (100% success rate).

## 🏗️ Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 📱 Mobile Testing

The app is mobile-first, so test on your phone:
1. Find your computer's IP address
2. Visit `http://YOUR-IP:5175` on your phone
3. Add to home screen for app-like experience

## 🔧 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code quality
```

## 🚨 Common Issues

### Port Already in Use
If port 5175 is busy:
```bash
npm run dev -- --port 3000
```

### API Key Not Working
1. Check the key is entered correctly
2. Verify network connection
3. Check browser console for error messages

### Tests Failing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

## 📂 Project Structure

```
cluj-bus/
├── src/                 # Source code
│   ├── components/      # React components
│   ├── services/        # API services
│   ├── stores/          # State management
│   └── utils/           # Utilities
├── public/              # Static files
├── docs/                # Documentation (you're here!)
└── package.json         # Dependencies and scripts
```

## 🎯 Next Steps

- **[User Guide](user-guide.md)** - Learn how to use the app
- **[Developer Guide](developer-guide.md)** - Understand the technical details
- **[Troubleshooting](troubleshooting.md)** - Fix common problems

---

**Having trouble?** Check the [troubleshooting guide](troubleshooting.md) or look at the browser console for error messages.