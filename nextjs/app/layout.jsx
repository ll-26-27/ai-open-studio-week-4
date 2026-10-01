import "@fontsource-variable/inter";
import "./globals.css";

export const metadata = {
  title: { default: "AI Open Studio · week 4: lists", template: "%s · AI Open Studio week 4" },
  description: "The Learning Lab's AI Open Studio and BGF AI Lab, week 4 (Thursday, October 1, 2026): lists.",
};

// Dark always: this site forces dark mode. Print pages are always light.
export const viewport = {
  colorScheme: "dark",
  themeColor: "#121412",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
