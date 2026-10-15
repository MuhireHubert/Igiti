import "../src/styles.css";

export const metadata = {
  metadataBase: new URL("https://play.igiti.africa"),
  title: {
    default: "Igiti Play — Every piece tells a story",
    template: "%s | Igiti Play",
  },
  description:
    "Discover Africa through thoughtful puzzles, stories and educational games from Igiti.",
  applicationName: "Igiti Play",
  openGraph: {
    type: "website",
    siteName: "Igiti Play",
    title: "Igiti Play — Every piece tells a story",
    description:
      "Explore the places, people and wonders of Africa, one thoughtful move at a time.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
