export function resolveTamanoBucket(habitaciones: number): string {
  if (habitaciones <= 50) return 'S1_1_50';
  if (habitaciones <= 100) return 'S2_51_100';
  if (habitaciones <= 150) return 'S3_101_150';
  if (habitaciones <= 250) return 'S4_151_250';
  if (habitaciones <= 400) return 'S5_251_400';
  return 'S6_401_MAX';
}

export function diasDelMes(year: number) {
  return Array.from({ length: 12 }, (_, i) => new Date(year, i + 1, 0).getDate());
}
