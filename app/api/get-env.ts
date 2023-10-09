export function getEnv(name: string) {
  function missingEnv(): never {
    throw new Error(`Missing environment variable: "${name}"`);
  }

  return process.env[name] || missingEnv();
}
