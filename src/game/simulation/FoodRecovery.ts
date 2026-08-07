export type FoodKey = 'apple' | 'banana' | 'bread' | 'cheese' | 'strawberry';

const recoveryByFood: Record<FoodKey, number> = {
  apple: 1,
  banana: 1,
  bread: 2,
  cheese: 2,
  strawberry: 2,
};

export function getFoodRecovery(foodKey: FoodKey) {
  return recoveryByFood[foodKey];
}
