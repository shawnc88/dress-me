import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* iOS web app meta */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Dress Me" />
        <meta name="format-detection" content="telephone=no" />

        {/* Theme color for iOS status bar */}
        <meta name="theme-color" content="#070707" />

        {/* Prevent iOS text size adjustment */}
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
