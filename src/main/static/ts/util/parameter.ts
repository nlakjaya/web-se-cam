export function setParameter(key: string, value: string) {
  localStorage.setItem(key, value);
}

export function getParameter(
  key: string,
  defaultValue?: string | (() => string),
) {
  let parameter = localStorage.getItem(key);
  if (!parameter) {
    if (defaultValue !== undefined) {
      parameter =
        typeof defaultValue == "string" ? defaultValue : defaultValue();
    } else {
      return undefined;
    }
  }
  return parameter;
}
