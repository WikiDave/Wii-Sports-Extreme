// Kinds of customers. Each type sets the defaults of a customer; a customer can override them.
//
// patience     0..1  how long they put up with a bad price (>= 0.6: one second chance) and how
//                    hard a refusal hits their trust
// discretion   0..1  1 = never tells the guards, 0 = tells everybody
// standard     the quality they expect (1 = two stars; below it they are disappointed)
// speed        walking speed in metres per second
// texting      0..1  how often they send you a message
// maxQty       most units they buy in one visit (before the bonus of regulars)
export const TYPES = {
  strandganger: { name: 'Strandganger', icon: '🏖️', patience: 0.75, discretion: 0.65, standard: 0.9, speed: 1.8, texting: 0.5, maxQty: 3 },
  toerist: { name: 'Toerist', icon: '📷', patience: 0.8, discretion: 0.7, standard: 0.85, speed: 1.7, texting: 0.45, maxQty: 3 },
  surfer: { name: 'Surfer', icon: '🏄', patience: 0.6, discretion: 0.6, standard: 0.85, speed: 2.0, texting: 0.5, maxQty: 3 },
  kind: { name: 'Kind met zakgeld', icon: '🧒', patience: 0.35, discretion: 0.25, standard: 0.8, speed: 2.2, texting: 0.6, maxQty: 2 },
  oma: { name: 'Oma', icon: '👵', patience: 0.9, discretion: 0.8, standard: 0.8, speed: 1.2, texting: 0.35, maxQty: 3 },
  visser: { name: 'Visser', icon: '🎣', patience: 0.85, discretion: 0.85, standard: 0.9, speed: 1.5, texting: 0.3, maxQty: 3 },
  kraamhouder: { name: 'Marktkraamhouder', icon: '🧺', patience: 0.7, discretion: 0.6, standard: 1.0, speed: 1.8, texting: 0.5, maxQty: 4 },
  nachtbraker: { name: 'Nachtbraker', icon: '🌙', patience: 0.5, discretion: 0.5, standard: 0.9, speed: 2.0, texting: 0.55, maxQty: 3 },
  sporter: { name: 'Sporter', icon: '🏃', patience: 0.6, discretion: 0.6, standard: 0.95, speed: 3.2, texting: 0.4, maxQty: 3 },
  student: { name: 'Student', icon: '🎓', patience: 0.5, discretion: 0.45, standard: 0.8, speed: 2.0, texting: 0.6, maxQty: 3 },
  kok: { name: 'Kok', icon: '👨‍🍳', patience: 0.4, discretion: 0.55, standard: 1.05, speed: 1.8, texting: 0.35, maxQty: 6 },
  bewaker: { name: 'Bewaker-vriend', icon: '🛡️', patience: 0.5, discretion: 0.15, standard: 0.9, speed: 1.8, texting: 0.3, maxQty: 3 },
  kunstenaar: { name: 'Kunstenaar', icon: '🎨', patience: 0.8, discretion: 0.6, standard: 0.95, speed: 1.5, texting: 0.4, maxQty: 3 },
  wandelaar: { name: 'Wandelaar', icon: '🥾', patience: 0.85, discretion: 0.75, standard: 0.9, speed: 2.4, texting: 0.3, maxQty: 3 },
  hotelgast: { name: 'Hotelgast', icon: '🏨', patience: 0.3, discretion: 0.5, standard: 1.1, speed: 1.7, texting: 0.4, maxQty: 4 },
  zakenman: { name: 'Zakenman', icon: '💼', patience: 0.25, discretion: 0.45, standard: 1.15, speed: 1.8, texting: 0.4, maxQty: 5 },
  influencer: { name: 'Influencer', icon: '🤳', patience: 0.35, discretion: 0.3, standard: 1.0, speed: 2.1, texting: 0.6, maxQty: 4 },
  bergbeklimmer: { name: 'Bergbeklimmer', icon: '⛰️', patience: 0.7, discretion: 0.8, standard: 0.95, speed: 2.6, texting: 0.3, maxQty: 3 },
  tycoon: { name: 'Tycoon', icon: '🎩', patience: 0.3, discretion: 0.5, standard: 1.15, speed: 1.6, texting: 0.3, maxQty: 6 },
};

/** Voices of the speech lines (see lines.js). */
export const VOICES = ['joviaal', 'stoer', 'deftig', 'verlegen', 'chill', 'zuinig', 'streng', 'kinderlijk'];
