// app/manifest.js
export default function manifest() {
  return {
    name: "My Brain Log",
    short_name: "BrainLog",
    description: "1カード=1思考。日々の気づきを蓄積し、AIが関連付けてくれる第二の脳。",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F3EC",
    theme_color: "#F6F3EC",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
