"use client";
import { useState } from "react";
import CommandsGroup from "./CommandGroup/CommandsGroup";
import { PlusCircleOutlined, MinusCircleOutlined } from "@ant-design/icons";

export default function Configuration() {
  const [showConfiguration, setShowConfiguration] = useState<boolean>(true);

  return (
    <div className="w-full h-auto border-[1px] border-solid border-black">
      <div className="w-full h-[40px] border-b-[1px] border-solid border-black flex justify-between items-center px-[10px]">
        <div>
          <h1>Configuration</h1>
        </div>
        <div className="flex w-[50px] justify-between items-center">
          <div>
            <PlusCircleOutlined
              className="text-[20px]"
              onClick={() => {
                setShowConfiguration(true);
              }}
            />
          </div>
          <div>
            <MinusCircleOutlined
              className="text-[20px]"
              onClick={() => {
                setShowConfiguration(false);
              }}
            />
          </div>
        </div>
      </div>
      {showConfiguration ? (
        <div className="w-[full] p-[30px] max-[560px]:px-[15px]">
          <CommandsGroup />
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
