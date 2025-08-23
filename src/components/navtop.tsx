import Link from "next/link";

export function NavTop() {
  return (
    <header className="flex flex-row justify-between items-center p-4 w-full bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">
        <Link href="/" className="hover:text-gray-300">
          entdb
        </Link>
      </h1>
      <nav className="flex gap-4 text-sm">
        <a
          href="https://github.com/chichou/entdb"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-300"
        >
          GitHub
        </a>
        <a
          href="https://infosec.exchange/@codecolorist"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-300"
        >
          Mastodon
        </a>
      </nav>
    </header>
  );
}
