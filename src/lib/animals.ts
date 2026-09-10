export const ANIMALS = [
  { id: 'grasshopper', name: '메뚜기', emoji: '🦗', price: 2, prey: null },
  { id: 'frog', name: '개구리', emoji: '🐸', price: 3, prey: 'grasshopper' },
  { id: 'snake', name: '뱀', emoji: '🐍', price: 4, prey: 'frog' },
  { id: 'hawk', name: '매', emoji: '🦅', price: 5, prey: 'snake' },
  { id: 'rabbit', name: '토끼', emoji: '🐰', price: 3, prey: null },
  { id: 'fox', name: '여우', emoji: '🦊', price: 5, prey: 'rabbit' },
] as const;

export type AnimalId = typeof ANIMALS[number]['id'];
