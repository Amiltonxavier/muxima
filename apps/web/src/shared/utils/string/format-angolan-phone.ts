/**
 * Formata um número de telefone para o padrão angolano (+244 9XX XXX XXX).
 *
 * Aceita dígitos, espaços, "+244" com ou sem o sinal de mais.
 *
 * @example
 * formatAngolanPhone("923456789"); // "+244 923 456 789"
 * formatAngolanPhone("+244923456789"); // "+244 923 456 789"
 */
export function formatAngolanPhone(phone: string): string {
  // Remove qualquer caractere não numérico
  const cleanPhone = phone.replace(/\D/g, "");

  // Se começar com +244, remove
  const number = cleanPhone.startsWith("244") ? cleanPhone.substring(3) : cleanPhone;

  // Garante que tem 9 dígitos (formato angolano: 9XX XXX XXX)
  if (number.length === 9) {
    // Formato: +244 9XX XXX XXX
    const part1 = number.substring(0, 3); // 9XX
    const part2 = number.substring(3, 6); // XXX
    const part3 = number.substring(6, 9); // XXX
    return `+244 ${part1} ${part2} ${part3}`;
  }

  // Se não tiver 9 dígitos, retorna o original formatado
  return `+244 ${number}`;
}
