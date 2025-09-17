import { ImageResponse } from "next/og";
import { Logo } from "@/components/logo";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "hsl(207, 44%, 49%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "8px"
        }}
      >
        <Logo className="w-6 h-6" />
      </div>
    ),
    {
      ...size,
    }
  );
}
