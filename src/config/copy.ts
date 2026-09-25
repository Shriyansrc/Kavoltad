// Every visible string and narration line lives here (plan sections 6 and 7).
// No prices, amounts, currency, discounts, metrics or testimonials.
export const COPY = {
  chaos: {headline: ['BOOKING', 'CHAOS.']},
  solution: {top: 'SHIP YOUR PRODUCT', bottomLead: 'IN ', bottomAccent: '7 DAYS', bottomTail: '.'},
  scope: {day: 'DAY 01', title: 'SCOPE LOCKED.', support: 'START ON WHATSAPP'},
  build: {day: 'DAYS 02 TO 05', title: 'BUILD & WIRE.'},
  review: {day: 'DAY 06', title: 'REVIEW & REVISE.', support: 'ON YOUR PHONE'},
  launch: {day: 'DAY 07', title: 'LAUNCH & HANDOFF.', support: 'FULL CODE OWNERSHIP'},
  proof: {headline: ['SHIPPED.', 'NOT MOCKED UP.'], label: 'FCN · COMMERCE'},
  ending: {
    headline: 'READY TO SHIP?',
    line: 'Your business. Operational online.',
    website: 'kavoltstudio.netlify.app',
  },
  // Schematic UI labels (functions documented in the master brand document).
  ui: {
    chaosPanels: ['BOOKING', 'PAYMENT', 'REMINDER'],
    briefRows: ['BUSINESS', 'BRAND', 'REQUIREMENTS'],
    nodes: [
      {title: 'BOOKING', sub: null},
      {title: 'RAZORPAY', sub: 'PAYMENTS'},
      {title: 'WHATSAPP', sub: 'REMINDERS'},
    ],
    preview: 'PRIVATE PREVIEW',
    live: 'LIVE',
    code: 'CODE',
    keys: 'KEYS',
  },
} as const;

// Narration: exact lines and recording windows in seconds (plan section 7).
export const NARRATION = [
  {id: 'l1', text: 'Booking chaos?', start: 0.15, end: 1.4},
  {id: 'l2', text: 'Kavolt. Live in seven days.', start: 2.6, end: 4.65},
  {id: 'l3', text: 'Start on WhatsApp.', start: 5.15, end: 6.7},
  {id: 'l4', text: 'Payments connected. Reminders automated.', start: 7.15, end: 9.65},
  {id: 'l5', text: 'Review on your phone.', start: 10.15, end: 11.7},
  {id: 'l6', text: 'Your code. Your keys.', start: 12.15, end: 13.7},
  {id: 'l7', text: 'Shipped. Not mocked up.', start: 14.2, end: 15.7},
  {id: 'l8', text: 'Ready to ship? Check the website.', start: 17.2, end: 19.55},
] as const;
