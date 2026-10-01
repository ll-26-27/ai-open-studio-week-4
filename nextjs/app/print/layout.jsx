// Print pages are always light (black ink on white paper) and carry no site chrome, whatever the reader's color scheme.
export const metadata = { title: { default: "Print · AI Open Studio week 4", template: "%s · Print · AI Open Studio week 4" } };

export default function PrintLayout({ children }) {
  return <div className="print-root">{children}</div>;
}
