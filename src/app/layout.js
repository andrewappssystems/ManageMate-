import "./globals.css";

export const metadata = {
  title: "ManageMate",
  description: "Modern property management platform"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
