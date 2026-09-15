export function siteFooterMarkup(className = "") {
  return `
    <footer class="site-footer${className ? ` ${className}` : ""}">
      <span>QTimer</span>
      <nav aria-label="Site information">
        <a href="/privacy/">Privacy</a>
        <a href="/contact/">Contact</a>
        <a href="https://github.com/Nemo20k/qtimer" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      </nav>
    </footer>
  `;
}
