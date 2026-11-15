async function main() {
  const apiUrl = (
    process.env.NOTIFICATION_API_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
  const title = process.argv[2] || "Test z laptopa";
  const body =
    process.argv[3] ||
    "Jeśli aplikacja działa aktywnie, powinna wyświetlić ten alert.";

  const response = await fetch(`${apiUrl}/api/notifications/dev-example`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      body,
      category: "market",
      data: { source: "laptop-test" },
    }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      result?.error || `Backend zwrócił HTTP ${response.status}`,
    );
  }

  console.log(`Alert dodany do kolejek: ${result?.queued ?? 0}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
