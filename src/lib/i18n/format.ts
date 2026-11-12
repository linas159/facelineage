/**
 * Simple template-literal interpolation for translation strings that
 * contain `{var}` placeholders. Pass values keyed by name. Shared by server
 * and client code.
 *
 *   fmt(t.email.terms, { terms: "Terms", privacy: "Privacy Policy" })
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}
