// Traffic on Chaos City's road. Shared by the picture (Street.tsx) and the
// sound design (car passes are placed where a car crosses the camera).
export type Car = {lane: number; dir: 1 | -1; speed: number; x0: number; color: string};

export const CARS: Car[] = [
  {lane: 1650, dir: 1, speed: 11, x0: 200, color: '#3A2A63'},
  {lane: 1650, dir: 1, speed: 11, x0: 2600, color: '#5A2A6E'},
  {lane: 1800, dir: -1, speed: 14, x0: 900, color: '#27305E'},
  {lane: 1800, dir: -1, speed: 14, x0: 3400, color: '#46235C'},
];

const SPAN = 5600;

/** World x of a car at frame f (wraps around the district strip). */
export const carX = (car: Car, f: number) => {
  const raw = car.x0 + car.dir * car.speed * f;
  return ((((raw + 1000) % SPAN) + SPAN) % SPAN) - 1000;
};
