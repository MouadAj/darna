import {Apple, Battery, Beef, Box, Bubbles, Coffee, CookingPot, Croissant, CupSoda, Droplets, Egg, Flame, GlassWater, Ham, House, Lamp, Milk, Package, PackageOpen, PillBottle, PlugZap, Refrigerator, Sandwich, ShoppingBasket, ShowerHead, Soup, SprayCan, Trash2, Utensils, WashingMachine, Wheat} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

const visuals: Record<string, LucideIcon> = {
  bread: Croissant, milk: Milk, eggs: Egg, oil: CookingPot, rice: CookingPot, salt: PackageOpen,
  water: GlassWater, coffee: Coffee, tea: CupSoda, juice: CupSoda, soap: Bubbles, shampoo: ShowerHead,
  toothpaste: Package, tissues: PackageOpen, detergent: WashingMachine, 'dish-soap': Bubbles,
  'garbage-bags': Trash2, 'floor-cleaner': SprayCan, 'toilet-paper': PackageOpen, 'light-bulb': Lamp,
  batteries: Battery, gas: Flame, repair: PlugZap, tap: Droplets, fridge: Refrigerator, door: House,
  food: Apple, drinks: GlassWater, personal: ShowerHead, cleaning: SprayCan, home: House,
  custom: ShoppingBasket, meat: Beef, pasta: Utensils, flour: Wheat, soup: Soup, sandwich: Sandwich,
  medicine: PillBottle, appliance: PlugZap, package: Box, ham: Ham,
};

export const selectableItemIcons = [
  'custom', 'food', 'bread', 'milk', 'eggs', 'meat', 'oil', 'flour',
  'pasta', 'coffee', 'tea', 'water', 'soap', 'shampoo', 'detergent',
  'garbage-bags', 'floor-cleaner', 'light-bulb', 'batteries', 'gas',
  'tap', 'fridge', 'medicine', 'home',
] as const;
export type SelectableItemIcon = (typeof selectableItemIcons)[number];

export function ItemVisual({visualKey, size = 'md'}: {visualKey: string; size?: 'sm'|'md'|'lg'}) {
  const Icon = Object.hasOwn(visuals, visualKey) ? visuals[visualKey] : ShoppingBasket;
  return <span className={`item-visual item-visual--${size}`} aria-hidden="true"><Icon /></span>;
}
