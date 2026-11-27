/**
 * Senha do apostador (Portaria SPA/MF 1.231, art. 31, §3º): alfanumérica com
 * caractere especial. Usado no cadastro, na troca e na recuperação de senha.
 */
export function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, label: "8 caracteres ou mais" },
    { ok: /[a-zA-Z]/.test(pw) && /\d/.test(pw), label: "Letras e números" },
    { ok: /[^a-zA-Z0-9]/.test(pw), label: "Um caractere especial, como ! @ # $" },
  ];
}

export function passwordOk(pw: string) {
  return pw.length <= 72 && passwordChecks(pw).every((c) => c.ok);
}

export const PASSWORD_RULE_TEXT =
  "A senha precisa de 8 caracteres ou mais, com letras, números e um caractere especial.";
