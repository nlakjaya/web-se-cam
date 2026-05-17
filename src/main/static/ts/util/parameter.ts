export function setParameter(key: string, value: string) {
  localStorage.setItem(key, value);
}

export function getParameter(key: string): string | undefined;
export function getParameter(
  key: string,
  defaultValue: string | (() => string),
): string;
export function getParameter(
  key: string,
  defaultValue?: string | (() => string),
): string | undefined {
  let parameter = localStorage.getItem(key);
  if (!parameter) {
    if (defaultValue === undefined) {
      return undefined;
    } else {
      parameter =
        typeof defaultValue == "string" ? defaultValue : defaultValue();
    }
  }
  return parameter;
}
