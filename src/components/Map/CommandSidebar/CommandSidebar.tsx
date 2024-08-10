// src/components/Map/CommandSidebar/commandSidebar.tsx
import React, { useEffect, useState, DragEvent, useRef } from "react";
import { message } from "antd";
import useMindMapStore from "@/stores/mapStore";
import { Commands } from "@/utils/type";

const CommandSidebar: React.FC = () => {
  const { getCommands, setCommandToExecute, deleteCommand } = useMindMapStore();
  const [storedData, setStoredData] = useState<Commands[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    command: Commands | null;
    index: number | null;
  }>({ visible: false, x: 0, y: 0, command: null, index: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const onDragStart = (
    event: DragEvent<HTMLDivElement>,
    nodeType: string,
    commandName: string,
    CommandType: string,
    nodes: any,
    index: number
  ) => {
    if (CommandType === "Node type" || CommandType === "") {
      message.error({
        content: "Select Command Type",
      });
      event.preventDefault();
      return;
    }

    if (CommandType === "Edit Node") {
      message.error({
        content: "This is edit command",
      });
      event.preventDefault();
      return;
    }

    const data = JSON.stringify({
      type: nodeType,
      commandName: commandName,
      CommandType: CommandType,
      nodes: nodes,
      id: index,
    });
    event.dataTransfer.setData("application/reactflow", data);
    event.dataTransfer.effectAllowed = "move";
  };

  const fetchData = () => {
    const storeData = getCommands();
    if (storeData) {
      setStoredData(storeData);
    } else {
      setStoredData([]);
    }
  };

  const handleContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    item: Commands,
    index: number
  ) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.pageX,
      y: event.pageY,
      command: item,
      index: index,
    });
  };

  const handleClick = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      command: null,
      index: null,
    });
  };

  const handleDeleteCommand = () => {
    if (contextMenu.command && contextMenu.index !== null) {
      deleteCommand(contextMenu.index);
      setContextMenu({
        visible: false,
        x: 0,
        y: 0,
        command: null,
        index: null,
      });
      fetchData(); // Refresh the list after deletion
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener("projectChanged", fetchData);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("projectChanged", fetchData);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div className="p-[15px] border-[1px] border-solid border-black bg-white flex flex-col gap-[15px] overflow-h-scroll max-h-[280px]">
      {storedData.map((item, index) => (
        <div
          key={index}
          className="w-full h-[50px] border-[1px] border-solid border-black flex items-center justify-between px-[10px] border-t-[0px]]"
          onDragStart={(event) =>
            onDragStart(
              event,
              "topicNode",
              item.commandName,
              item.select,
              item,
              index
            )
          }
          onContextMenu={(event) => handleContextMenu(event, item, index)}
          draggable
        >
          <h1>{item.commandName}</h1>
          <h1>{item.commandShortcut}</h1>
        </div>
      ))}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{
            position: "absolute",
            top: `${contextMenu.y - 295}px`,
            left: `${contextMenu.x - 75}px`,
            backgroundColor: "white",
            boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.8)",
            borderRadius: "5px",
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ul>
            <li
              onClick={() => {
                setCommandToExecute(contextMenu.command);
                setContextMenu({
                  visible: false,
                  x: 0,
                  y: 0,
                  command: null,
                  index: null,
                });
              }}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              Run
            </li>
            <li
              onClick={handleDeleteCommand}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              Delete
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CommandSidebar;
