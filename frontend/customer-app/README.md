# Kreo Marketplace - Customer App

A stunning, modern marketplace customer application built with React 18, TypeScript, Vite, Redux Toolkit, TailwindCSS, and Framer Motion.

## Features

### Design & UX
- **Modern Visual Design**: Glassmorphism effects, smooth gradients, and elegant shadows
- **Dark Mode Support**: Toggle between light and dark themes
- **Smooth Animations**: Powered by Framer Motion for fluid user experiences
- **Fully Responsive**: Perfect display on mobile, tablet, and desktop devices
- **Accessible**: WCAG 2.1 AA compliant with proper ARIA labels and keyboard navigation

### Key Components

#### Navigation
- **Fixed Navbar** with glassmorphism on scroll
- **Advanced Search** with autocomplete
- **Shopping Cart Badge** with item count
- **User Menu** with dropdown
- **Mobile-Responsive Menu**

#### Pages

1. **Home Page**
   - Hero section with animated floating cards
   - Category grid with hover effects
   - Featured products showcase
   - Features section
   - Vendor CTA with gradient background

2. **Product List Page**
   - Advanced filter sidebar (categories, price, rating)
   - Multiple view modes (grid/list)
   - Sort functionality
   - Responsive product grid
   - Pagination

3. **Product Detail Page**
   - Image gallery with thumbnails
   - Product information and pricing
   - Add to cart with quantity selector
   - Tabbed content (description, specs, reviews)
   - Related products section

4. **Shopping Cart**
   - Items grouped by vendor
   - Quantity adjustment
   - Order summary
   - Responsive layout

5. **Auth Pages**
   - Login with elegant form design
   - Registration with validation
   - Password visibility toggle

### UI Components

- **ProductCard**: Interactive card with hover effects, badges, and animations
- **HeroSection**: Engaging hero with gradient background and CTAs
- **Footer**: Complete footer with newsletter signup and social links
- **FilterSidebar**: Collapsible filter panel with multiple options
- **LoadingSkeleton**: Elegant loading states

## Technology Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe code
- **Vite** - Lightning-fast build tool
- **Redux Toolkit** - State management
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icon library
- **React Router DOM** - Client-side routing

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

1. Navigate to the customer app directory:
```bash
cd /home/vboxuser/Documents/kreo-marketplace/frontend/customer-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   ├── HeroSection.tsx
│   ├── FilterSidebar.tsx
│   └── LoadingSkeleton.tsx
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── ProductListPage.tsx
│   ├── ProductDetailPage.tsx
│   ├── CartPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── CheckoutPage.tsx
│   └── OrdersPage.tsx
├── store/              # Redux store and slices
│   ├── index.ts
│   ├── authSlice.ts
│   ├── cartSlice.ts
│   └── productSlice.ts
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Color Palette

### Primary Colors
- Primary: Blue (#3b82f6 - #1e3a8a)
- Secondary: Purple (#a855f7 - #581c87)
- Accent: Orange (#f97316 - #7c2d12)

### Semantic Colors
- Success: Green
- Warning: Yellow
- Error: Red
- Info: Blue

## Design Principles

1. **Visual Hierarchy**: Clear importance through size, color, and positioning
2. **White Space**: Generous spacing for breathing room
3. **Typography**: Inter for body text, Poppins for headings
4. **Micro-interactions**: Subtle animations on hover and click
5. **Consistency**: Uniform design patterns throughout
6. **Performance**: Optimized animations and lazy loading

## Customization

### Tailwind Configuration
The Tailwind config (`tailwind.config.js`) includes:
- Custom color palette
- Custom fonts
- Custom shadows (glass, soft)
- Custom animations
- Dark mode support

### Adding New Pages
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation in `src/components/Navbar.tsx`

## Features to Implement

The following features have placeholder pages and can be fully implemented:
- [ ] Checkout flow with payment integration
- [ ] Order history and tracking
- [ ] User profile and settings
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Real-time search with debouncing
- [ ] Product comparison
- [ ] Live chat support

## Performance Optimization

- Lazy loading for images
- Code splitting with React.lazy
- Memoization with React.memo
- Debounced search input
- Optimized animations with transform/opacity
- Responsive image loading with srcset

## Accessibility Features

- Semantic HTML5 elements
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Color contrast compliance (WCAG AA)
- Reduced motion support

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Write semantic HTML
4. Follow component composition patterns
5. Test on multiple screen sizes
6. Ensure accessibility standards

## License

This project is part of the Kreo Marketplace ecosystem.

---

Built with care by the Kreo team. For support, contact support@kreo.com
