export function setParameter(key: string, value: string) {
  localStorage.setItem(key, value);
}

export function getParameter(
  key: string,
  defaultValue: string | (() => string),
) {
  let parameter = localStorage.getItem(key);
  if (!parameter) {
    parameter = typeof defaultValue == "string" ? defaultValue : defaultValue();
  }
  return parameter;
}
