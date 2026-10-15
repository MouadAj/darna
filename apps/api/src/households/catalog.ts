export const DEFAULT_CATALOG = [
  {key: 'food', name: 'Food', items: [
    ['Bread', 'bread'], ['Milk', 'milk'], ['Eggs', 'eggs'], ['Oil', 'oil'], ['Rice', 'rice'], ['Salt', 'salt'],
  ]},
  {key: 'drinks', name: 'Drinks', items: [
    ['Water', 'water'], ['Coffee', 'coffee'], ['Tea', 'tea'], ['Juice', 'juice'],
  ]},
  {key: 'personal', name: 'Personal care', items: [
    ['Soap', 'soap'], ['Shampoo', 'shampoo'], ['Toothpaste', 'toothpaste'], ['Tissues', 'tissues'],
  ]},
  {key: 'cleaning', name: 'Cleaning', items: [
    ['Detergent', 'detergent'], ['Dish soap', 'dish-soap'], ['Garbage bags', 'garbage-bags'], ['Floor cleaner', 'floor-cleaner'],
  ]},
  {key: 'home', name: 'Home', items: [
    ['Toilet paper', 'toilet-paper'], ['Light bulb', 'light-bulb'], ['Batteries', 'batteries'], ['Gas', 'gas'],
  ]},
] as const;
