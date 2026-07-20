import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(180deg, #1a4f91 0%, #0b1020 100%)",
          borderRadius: 104,
          color: "#fff1bd",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Georgia",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#f6c844",
            borderRadius: 999,
            boxShadow: "0 0 0 28px #e9b42f, 0 0 0 56px #f6c844, 0 0 0 84px #e9b42f",
            display: "flex",
            height: 104,
            marginBottom: 72,
            width: 104,
          }}
        />
        <div style={{ fontSize: 45, letterSpacing: 3 }}>VAN GOGH</div>
        <div style={{ fontSize: 24, letterSpacing: 7, marginTop: 16 }}>MUSEU</div>
      </div>
    ),
    size,
  );
}
