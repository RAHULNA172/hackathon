import './globals.css';

export const metadata = {
  title: 'Work Prioritization AI',
  description: 'AI-driven task management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
