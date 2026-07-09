import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0369a1 0%, #0a0a0a 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            fontStyle: "italic",
            letterSpacing: -2,
          }}
        >
          LNH
        </div>
        <div style={{ fontSize: 40, marginTop: 4 }}>🏒</div>
      </div>
    ),
    { ...size },
  );
}
