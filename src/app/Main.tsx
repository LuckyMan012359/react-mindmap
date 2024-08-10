// /src/app/page.tsx
"use Client";
import dynamic from "next/dynamic";

const DynamicMindMap = dynamic(() => import("@/components/Map/MindMap"), {
  ssr: false,
});
import Header from "@/components/Header/header";
import OptionGroup from "@/components/Options/OptionGroup";
import RequestInstructions from "@/components/RequestInstructions/RequestInstructions";
import Configuration from "@/components/Configuration/Configruation";

export default function Main() {
  return (
    <div className="px-[50px] py-[30px] w-full h-auto flex flex-col max-[1360px]:px-[30px] text-[#000]">
      <div className="border-[1px] border-black border-solid">
        <Header />
        <div className="w-full h-auto p-[30px] flex flex-col gap-[30px] max-[560px]:px-[15px]">
          <OptionGroup />
          <DynamicMindMap />
          <RequestInstructions />
          <Configuration />
        </div>
      </div>
    </div>
  );
}
