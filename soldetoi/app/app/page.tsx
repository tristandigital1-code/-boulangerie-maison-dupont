import type { Metadata } from "next";
import { Parcours } from "@/components/Parcours";

export const metadata: Metadata = {
  title: "Ton analyse",
  robots: { index: false },
};

export default function PageApp() {
  return <Parcours />;
}
