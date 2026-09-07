export interface KDCCategory {
  id: string;
  name: string;
  color: string;
  bgColor: string;
}

export const KDC_CATEGORIES: KDCCategory[] = [
  { id: '000', name: '총류', color: 'text-red-600', bgColor: 'bg-red-500' },
  { id: '100', name: '철학', color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { id: '200', name: '종교', color: 'text-yellow-500', bgColor: 'bg-yellow-400' },
  { id: '300', name: '사회과학', color: 'text-teal-500', bgColor: 'bg-teal-400' },
  { id: '400', name: '자연과학', color: 'text-blue-600', bgColor: 'bg-blue-600' },
  { id: '500', name: '기술과학', color: 'text-purple-500', bgColor: 'bg-purple-400' },
  { id: '600', name: '예술', color: 'text-pink-500', bgColor: 'bg-pink-400' },
  { id: '700', name: '언어', color: 'text-orange-400', bgColor: 'bg-orange-300' },
  { id: '800', name: '문학', color: 'text-lime-700', bgColor: 'bg-lime-600' },
  { id: '900', name: '역사', color: 'text-green-500', bgColor: 'bg-green-400' },
];

export const getKDCCategory = (id: string): KDCCategory => {
  return KDC_CATEGORIES.find(c => c.id === id) || KDC_CATEGORIES[0];
};
