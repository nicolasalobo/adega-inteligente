/**
 * Resultado da verificação do limite de identificações.
 * O banco responde só "sim" ou "não" ao consumir o limite; "não" acontece tanto quando a conta
 * passou do limite quanto quando o banco não reconheceu o login daquela chamada. Para não mostrar
 * "limite atingido" por engano, um "não" é confirmado vendo se a conta enxerga a própria adega.
 */
export type QuotaOutcome = "allowed" | "limit_reached" | "login_not_recognized";
export type QuotaType = "barcode" | "photo";

export async function checkIdentificationQuota(consume: () => Promise<boolean>, canSeeOwnCellar: () => Promise<boolean>): Promise<QuotaOutcome> {
  if (await consume()) return "allowed";
  return (await canSeeOwnCellar()) ? "limit_reached" : "login_not_recognized";
}

export function quotaDeniedMessage(outcome: Exclude<QuotaOutcome, "allowed">, type: QuotaType) {
  if (outcome === "login_not_recognized") {
    return "O banco de dados não reconheceu o seu login nesta consulta. Saia da conta e entre de novo; se continuar, a configuração do servidor precisa ser revisada. Nenhuma busca foi feita.";
  }
  return type === "photo"
    ? "Limite de 5 análises de foto por hora atingido. Tente novamente mais tarde."
    : "Limite de 30 identificações por hora atingido. Tente novamente mais tarde.";
}
