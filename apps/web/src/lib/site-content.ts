export const BRAND = {
  name: 'Big Mad Drip',
  phone: '239-839-1588',
  phoneHref: 'tel:2398391588',
  tagline: 'Sports apparel made with attitude',
  blurb: 'Florida-based. Dripping sports apparel shipped anywhere in the continental U.S.',
} as const;

export const SPORTS = [
  'Flag Football',
  '7v7',
  'Tackle Football',
  'Basketball',
  'Softball',
  'Volleyball',
  'Baseball',
  'Tennis',
  'Soccer',
  'Gymnastics',
  'Track',
  'Pickleball',
] as const;

export const PACKAGES = [
  {
    id: 'essentials',
    name: 'Essentials',
    price: 39.99,
    perks: ['Compression / Dri-Fit shorts & shirt', 'Custom design', 'Custom logo', 'Express delivery available'],
  },
  {
    id: 'certified',
    name: 'Certified',
    price: 59.99,
    perks: ['Compression / Dri-Fit shorts & shirt', 'Custom gloves', 'Custom design / logo', 'Express delivery available'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 69.99,
    perks: ['Compression / Dri-Fit shorts & shirt', 'Custom gloves / flags', 'Custom design / logo', 'Express delivery available'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99.99,
    perks: ['Compression / Dri-Fit shorts & shirt', 'Gloves / flag / backpack', 'Custom design / logo', 'Express delivery available'],
  },
  {
    id: 'allstar',
    name: 'Allstar',
    price: 129.99,
    perks: ['Compression / Dri-Fit shorts & shirt', 'Gloves / flags / backpack / helmet', 'Custom design / logo', 'Express delivery available'],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 149.99,
    perks: ['Compression / Dri-Fit shorts & shirt', 'Custom gloves / flags', 'Custom design / logo', 'Express delivery available'],
  },
] as const;

export const PILLARS = [
  {
    title: 'Everyday Drip',
    body: 'High-quality casual and training apparel built for comfort, durability, and daily wear.',
  },
  {
    title: 'Game Day Performance',
    body: 'Moisture-wicking, breathable fabrics engineered for competition, practices, and tournaments.',
  },
  {
    title: 'Elite Custom Gear',
    body: 'Fully customizable uniforms with bold designs, premium materials, and pro-level fit.',
  },
] as const;

export const MISSION_POINTS = [
  'Delivering premium, performance-driven apparel built to last',
  'Blending athletic function with street-level style',
  'Supporting athletes, teams, and communities at every level',
  'Promoting confidence, discipline, and self-expression',
  'Representing the grind, the hustle, and the drip mindset',
] as const;

export const FAQS = [
  {
    q: 'What is Big Mad Drip?',
    a: 'Big Mad Drip is a sports apparel brand that blends performance-driven design with street-level style. We create bold athletic and lifestyle apparel for athletes, teams, and individuals who want to stand out.',
  },
  {
    q: 'Who is Big Mad Drip for?',
    a: 'Athletes, teams, and competitors of all ages—from youth sports to elite players—plus anyone who embraces confidence and individuality in their style.',
  },
  {
    q: 'Do you offer custom team apparel and uniforms?',
    a: 'Yes. We work with teams, leagues, and organizations on fully customized uniforms and apparel that match their identity and performance needs.',
  },
  {
    q: 'Where do you ship?',
    a: 'We ship nationwide across the continental United States.',
  },
  {
    q: 'What are production turnaround times?',
    a: 'Standard production and delivery is about 3 weeks. Express delivery (about 2 weeks) is available upon request.',
  },
] as const;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/products', label: 'Products' },
  { href: '/packages', label: 'Packages' },
  { href: '/accessories', label: 'Accessories' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
] as const;
