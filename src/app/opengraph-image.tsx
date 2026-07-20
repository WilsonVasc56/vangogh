import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "linear-gradient(125deg, #0a1c4b 0%, #173c89 55%, #0b1020 100%)",
          color: "#fff4c9",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#f7cf42",
            borderRadius: 999,
            boxShadow: "0 0 0 34px #e3b42d, 0 0 0 68px #f7cf42, 0 0 0 102px #e3b42d",
            display: "flex",
            height: 136,
            position: "absolute",
            right: 148,
            top: 105,
            width: 136,
          }}
        />
        <div
          style={{
            background: "#101b32",
            borderRadius: "58% 42% 0 0",
            bottom: -180,
            display: "flex",
            height: 620,
            left: 36,
            position: "absolute",
            transform: "rotate(-10deg)",
            width: 215,
          }}
        />
        <div
          style={{
            bottom: 0,
            display: "flex",
            height: 190,
            left: 0,
            position: "absolute",
            transform: "rotate(-3deg)",
            width: "110%",
          }}
        >
          <div style={{ background: "#194e86", height: "100%", width: "100%" }} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginLeft: 330,
            position: "relative",
            width: 720,
          }}
        >
          <div style={{ color: "#f7cf42", fontSize: 27, letterSpacing: 9, marginBottom: 18 }}>
            AMSTERDÃ · EXPERIÊNCIA IMERSIVA
          </div>
          <div style={{ fontFamily: "Georgia", fontSize: 86, letterSpacing: -2, lineHeight: 1.05 }}>
            Museu Van Gogh
          </div>
          <div style={{ color: "#d8e6ff", fontSize: 33, marginTop: 28 }}>
            50 obras · Linha do tempo · Museu 3D
          </div>
        </div>
      </div>
    ),
    size,
  );
}
