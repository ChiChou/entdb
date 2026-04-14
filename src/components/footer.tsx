export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="px-4 md:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>entdb</span>

          <nav className="flex items-center gap-4">
            <a
              href="https://github.com/ChiChou/entdb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Website
            </a>
            <a
              href="https://github.com/ChiChou/entdb-indexer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Indexer
            </a>
            <a
              href="https://github.com/ChiChou/entdb-data"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Data
            </a>
            <span className="text-muted-foreground/30">|</span>
            <a
              href="https://infosec.exchange/@codecolorist"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Mastodon
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
