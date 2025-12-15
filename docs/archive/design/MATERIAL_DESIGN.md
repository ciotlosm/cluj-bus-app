# Material Design Implementation

This project now includes a complete Material Design 3 implementation using Material-UI (MUI) components.

## 🎨 What's New

### Material Design 3 Theme
- **Primary Color**: `#6750A4` (Material Design 3 purple)
- **Secondary Color**: `#625B71` (Material Design 3 neutral)
- **Modern Typography**: Roboto font family with proper weights
- **Rounded Corners**: 12px border radius for cards, 20px for buttons
- **Elevation System**: Proper Material Design shadows and elevation

### New Components

#### 1. **MaterialButton** (`src/components/MaterialButton.tsx`)
- Four variants: `filled`, `tonal`, `outlined`, `text`
- Loading states with spinner
- Icon support
- Material Design 3 styling

#### 2. **BusCard** (`src/components/MaterialCard.tsx`)
- Real-time bus information display
- Route color coding
- Status chips (LIVE, delay indicators)
- Favorite toggle functionality
- Material Design card styling

#### 3. **InfoCard** (`src/components/MaterialCard.tsx`)
- General purpose information card
- Icon support
- Action buttons area
- Consistent Material Design styling

#### 4. **MaterialSettings** (`src/components/MaterialSettings.tsx`)
- Tabbed interface using Material-UI Tabs
- Import/Export functionality
- Reset confirmation dialogs
- Snackbar notifications

#### 5. **MaterialApiKeySetup** (`src/components/MaterialApiKeySetup.tsx`)
- Beautiful onboarding experience
- Password visibility toggle
- Gradient backgrounds
- Material Design form components

#### 6. **MaterialOfflineIndicator** (`src/components/MaterialOfflineIndicator.tsx`)
- Collapsible offline status
- Material Design alerts
- Status chips

#### 7. **MaterialRefreshControl** (`src/components/MaterialRefreshControl.tsx`)
- Floating action button style
- Loading spinner integration
- Tooltip with last refresh time

### App Structure

#### **AppMaterial.tsx**
The main Material Design version of the app featuring:
- **Material Design App Bar**: Gradient header with proper elevation
- **Bottom Navigation**: Material Design 3 navigation bar
- **Floating Action Button**: Live status indicator
- **Demo Mode**: Toggle between app and component demo (development only)

#### **Theme System** (`src/theme/materialTheme.ts`)
- Complete Material Design 3 color palette
- Light and dark theme variants
- Custom component overrides
- Typography scale
- Extended palette with tertiary colors

## 🚀 Getting Started

The Material Design version is now the default. The app automatically uses:

1. **Material-UI Theme Provider** in `src/main.tsx`
2. **AppMaterial.tsx** as the main app component
3. **Roboto font** loaded from Google Fonts
4. **Material Icons** for consistent iconography

## 🎯 Demo Mode

In development mode, you can toggle between the actual app and a component demo:

1. Look for the "Demo" button in the top-right corner of the header
2. Click to see all Material Design components in action
3. Click "App" to return to the normal application

## 🎨 Design Features

### Visual Hierarchy
- **Cards**: Elevated surfaces with proper shadows
- **Typography**: Material Design type scale
- **Colors**: Semantic color usage (success, warning, error)
- **Spacing**: Consistent 8px grid system

### Interactive Elements
- **Buttons**: Four distinct variants with proper states
- **Navigation**: Bottom navigation with active states
- **Forms**: Material Design text fields with validation
- **Feedback**: Snackbars, alerts, and loading states

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Flexible layouts**: Adapts to different screen sizes
- **Touch-friendly**: Proper touch targets and spacing

## 🔧 Customization

### Theme Customization
Edit `src/theme/materialTheme.ts` to customize:
- Colors
- Typography
- Component overrides
- Spacing
- Border radius

### Component Variants
Each Material component supports multiple variants and can be easily extended:

```tsx
// Button variants
<MaterialButton variant="filled">Primary Action</MaterialButton>
<MaterialButton variant="tonal">Secondary Action</MaterialButton>
<MaterialButton variant="outlined">Tertiary Action</MaterialButton>
<MaterialButton variant="text">Text Action</MaterialButton>

// With icons and loading states
<MaterialButton 
  variant="filled" 
  icon={<BusIcon />}
  loading={isLoading}
>
  Track Bus
</MaterialButton>
```

## 📱 Mobile Experience

The Material Design implementation provides:
- **Native feel**: Follows platform conventions
- **Smooth animations**: Material Design motion
- **Proper touch feedback**: Ripple effects and state changes
- **Accessibility**: ARIA labels and keyboard navigation

## 🎯 Next Steps

The Material Design system is fully integrated and ready for:
- Additional component variants
- Dark mode implementation
- Custom theme variations
- Advanced animations
- Accessibility enhancements

Visit the demo mode to explore all available components and their variants!