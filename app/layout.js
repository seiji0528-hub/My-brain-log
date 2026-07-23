import "./globals.css";

export const metadata = {
  title: "My Brain Log｜思考ログ",
  description: "1カード=1思考。日々の気づきを蓄積し、AIが関連付けてくれる第二の脳。",
  // ↓ ここを追加！ Safariや各種ブラウザにアイコンの場所を伝えます
  icons: {
    icon: "/apple-icon.PNG",
    apple: "/apple-icon.PNG",
  },
};

// viewport-fit=cover により iPhone のノッチ/ホームバー領域までレイアウトを広げ、
// safe-area-inset-* で中身をずらすことで、画面いっぱいに使いつつ崩れを防ぐ
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F6F3EC",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className="min-h-screen w-full overflow-x-hidden bg-paper font-body text-ink safe-top safe-bottom">
        {children}
      </body>
    </html>
  );
}

