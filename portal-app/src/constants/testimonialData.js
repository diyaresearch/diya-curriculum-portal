// Testimonial configuration constants
export const CAROUSEL_CONFIG = {
  AUTO_ADVANCE_INTERVAL: 7000, // 7 seconds
  TEXT_TRUNCATION: {
    MAX_CHARS_PER_LINE: 50,
    MAX_LINES: 5
  },
  TRANSITION_DURATION: 300, // milliseconds
  MAX_DOTS: 5,
  // Carousel geometry. These were inline literals repeated between the card
  // and the fixed-size frame it sits in, so the two could drift and the card
  // would overflow its own container (#411).
  LAYOUT: {
    CARD_WIDTH: 520,
    CARD_MIN_WIDTH: 480,
    CARD_HEIGHT: 320,
    CARD_MIN_HEIGHT: 280,
    CARD_TEXT_MAX_HEIGHT: 160,
    CARD_TEXT_MIN_HEIGHT: 80,
    AVATAR_SIZE: 60,
    DETAIL_AVATAR_SIZE: 100,
    ARROW_SIZE: 36,
    DETAIL_ARROW_SIZE: 32
  }
};

// Fabricated sample testimonials (invented people, institutions, and even a
// made-up "40% improvement" stat) used to live here as a fallback whenever
// Firestore had no real data. Removed for #433 — TestimonialsSection now
// hides the section instead of showing invented content as if it were real.
