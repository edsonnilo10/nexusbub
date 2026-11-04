// Persiste a escolha do usuário sobre o tutorial de boas-vindas.
// A chave é por usuário e por navegador: cada pessoa decide no próprio dispositivo.
const keyFor = (id: string) => `nexus-welcome-tour-v1:${id}`;

export const isTourHidden = (id?: string | null): boolean => {
  if (!id) return false;
  try {
    return localStorage.getItem(keyFor(id)) === "1";
  } catch {
    return false;
  }
};

export const setTourHidden = (id: string | null | undefined, hidden: boolean): void => {
  if (!id) return;
  try {
    if (hidden) localStorage.setItem(keyFor(id), "1");
    else localStorage.removeItem(keyFor(id));
  } catch {
    /* navegador sem armazenamento: a escolha não é salva */
  }
};
