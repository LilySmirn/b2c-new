import Link from "next/link";

export default function PreviewIndexPage() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Preview routes</h1>
      <ul>
        <li>
          <Link href="/preview/directory">Справочник (index)</Link>
        </li>
      </ul>
    </main>
  );
}