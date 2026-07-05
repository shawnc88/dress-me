import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* iOS web app meta */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Be With Me" />
        <meta name="format-detection" content="telephone=no" />

        {/* Theme color for iOS status bar */}
        <meta name="theme-color" content="#070707" />

        {/* Prevent iOS text size adjustment */}
        <meta name="x-apple-disable-message-reformatting" />

        {/* NOTE: the viewport meta lives ONLY in _app.tsx. A second viewport tag
            here (even one that only adds viewport-fit) is applied wholesale by
            WebKit as the LAST-seen viewport, dropping width=device-width and
            scaling the whole page down on iPad — the App Store "small text"
            (Guideline 4) cause. _app.tsx already sets viewport-fit=cover. */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
