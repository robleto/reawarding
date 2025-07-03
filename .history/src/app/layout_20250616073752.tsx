import React from 'react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>OscarWorthy</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700&display=swap" />
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
