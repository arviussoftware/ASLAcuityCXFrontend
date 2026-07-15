"use client";

import DefaultPlatformPage from "../../Addworkspace/page";
import Platform13Page from "../components/Platform13Page";
import Platform4Page from "../components/Platform4Page";
import Platform2Page from "../components/Platform2Page";
import SimcommRecorderPage from "../components/SimcommRecorderPage";
const platformPageRegistry = {
  13: Platform13Page,
  4: Platform4Page,
  2: Platform2Page,
  14: SimcommRecorderPage,
};

export default function PlatformPage({ params }) {
  const platformId = Number(params?.platformId);
  const CustomPlatformPage = platformPageRegistry[platformId];

  if (CustomPlatformPage) {
    return <CustomPlatformPage params={params} />;
  }

  return <DefaultPlatformPage params={params} />;
}
