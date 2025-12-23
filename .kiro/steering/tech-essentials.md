# Tech Essentials

## Stack
- **React 19.2.0** + TypeScript + Vite
- **Material-UI 7.3.6** for components
- **Zustand 5.0.9** for state (minimal stores)
- **Tailwind CSS 4.1.18** for styling
- **Vitest** for testing

## Commands
```bash
npm run dev          # Start dev server (port 5175)
npm test             # Run tests (--run already included)
npm test -- pattern  # Run specific tests (NO --run needed)
```

## File Organization
```
src/
├── components/      # React components
├── stores/          # Zustand stores (minimal)
├── services/        # API services
├── hooks/           # Custom hooks
├── utils/           # Pure utilities
└── types/           # TypeScript types
```

## Key Rules
- **Test timeout**: Cancel tests after 1 minute
- **File size**: Split at 300 lines with clear boundaries
- **API source**: Tranzy API for all transit data
- **Import paths**: Use existing patterns from codebase