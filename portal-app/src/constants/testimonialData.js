// Testimonial configuration constants
export const CAROUSEL_CONFIG = {
  AUTO_ADVANCE_INTERVAL: 7000, // 7 seconds
  TEXT_TRUNCATION: {
    MAX_CHARS_PER_LINE: 50,
    MAX_LINES: 5
  },
  TRANSITION_DURATION: 300, // milliseconds
  MAX_DOTS: 5
};

// Fabricated sample testimonials (invented people, institutions, and even a
// made-up "40% improvement" stat) used to live here as a fallback whenever
// Firestore had no real data. Removed for #433 — TestimonialsSection now
// hides the section instead of showing invented content as if it were real.