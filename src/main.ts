async function main(): Promise<void> {
  return await new Promise((resolve) => resolve);
}

main()
  .then(() => process.exit(process.exitCode))
  .catch(() => process.exit(process.exitCode));
