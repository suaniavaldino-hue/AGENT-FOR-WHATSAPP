export const WORKPLACES = ['GRAFFITI BAR KARAOKE', 'SpicyMidia'];
export const ROLES = ['admin', 'usuario', 'funcionario'];

export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function isValidCPF(cpf) {
  const clean = onlyDigits(cpf);
  if (!clean || clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(clean[i]) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== Number(clean[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(clean[i]) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === Number(clean[10]);
}

export function isValidBrazilWhatsApp(phone) {
  const clean = onlyDigits(phone);
  if (clean.length < 10 || clean.length > 13) return false;
  const local = clean.startsWith('55') ? clean.slice(2) : clean;
  if (local.length < 10 || local.length > 11) return false;
  const ddd = Number(local.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  const subscriber = local.slice(2);
  return subscriber.length === 8 || subscriber.length === 9;
}

export function normalizeBrazilWhatsApp(phone) {
  const clean = onlyDigits(phone);
  if (clean.startsWith('55')) return clean;
  return `55${clean}`;
}
