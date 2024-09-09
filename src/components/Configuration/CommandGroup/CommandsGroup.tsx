"use client";
import { Button, Input, notification } from "antd";
import Command from "./Command/Command";
import useMindMapStore from "@/stores/mapStore";
import { useEffect, useState } from "react";
import { Reorder } from "framer-motion";
import axios from "axios";
import { Commands } from "@/utils/type";

export default function CommandsGroup() {
  const [openAIKey, setOpenAIKey] = useState<string>("");
  const [defaultAssistantId, setDefaultAssistantId] = useState<string>("");
  const [defaultThreadId, setDefaultThreadId] = useState<string>("");
  const [isClient, setIsClient] = useState<boolean>(false);

  const [commands, setCommands] = useState<Commands[]>([]);

  const [editingCommandId, setEditingCommandId] = useState<number | null>(null);
  const [edit, setEdit] = useState<boolean>(true);

  const {
    saveConfigurationDefaultValue,
    getDatas,
    addCommand,
    saveCommandReorder,
    getDefaultThreadId,
    getOpenAIKey,
  } = useMindMapStore();

  const deleteComponent = (index: number) => {
    setCommands((prevComponents) =>
      prevComponents.filter((_, i) => i !== index)
    );
  };

  const fetchData = () => {
    const data = getDatas();

    if (data && data.length > 0 && data[0].configuration) {
      setOpenAIKey(data[0].configuration.openAIKey);
      setDefaultAssistantId(data[0].configuration.defaultAssistantId);
      setDefaultThreadId(data[0].configuration.defaultThreadId);
      setCommands(data[0].configuration.commands);
    } else {
      // Clear the state if there is no data
      setOpenAIKey("");
      setDefaultAssistantId("");
      setDefaultThreadId("");
      setCommands([]);
    }
  };

  const handleEdit = (id: number) => {
    setEditingCommandId(id);
    setEdit(false);
  };

  const handleApply = (id: number) => {
    setEditingCommandId(null);
    setEdit(true);
  };

  const createThreadID = async () => {
    try {
      const openAIKey = getOpenAIKey();

      const response = await axios.post("/api/openai", {
        openAIKey: openAIKey,
      });
      console.log(response);
      return response.data.id;
    } catch (error: any) {
      if (error.response.status == 401) {
        notification.error({
          message: "Invalid OpenAI API key",
        });
      } else if (error.response.status === 400) {
        notification.error({
          message: "OpenAI API key is required",
        });
      }
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (isClient) {
        saveConfigurationDefaultValue(
          openAIKey,
          defaultAssistantId,
          defaultThreadId
        );
      }

      if (!isClient) {
        fetchData();
      }

      window.addEventListener("projectChanged", fetchData);

      return () => {
        window.removeEventListener("projectChanged", fetchData);
      };
    };

    initialize();
  }, [openAIKey, defaultAssistantId, defaultThreadId]);

  const setThreadID = async () => {
    const defaultThreadIdValue = getDefaultThreadId();
    if (defaultThreadIdValue === "") {
      const threadId = await createThreadID();
      if (threadId) {
        setDefaultThreadId(threadId);
        setIsClient(true);
      }
    }
  };

  useEffect(() => {
    setThreadID();
  }, []);

  const handleAddCommand = () => {
    addCommand();
    const newCommandIndex = commands.length;
    setEditingCommandId(newCommandIndex);
    setEdit(false);
    setIsClient(true);
  };

  return (
    <div className="w-full flex flex-col gap-[30px]">
      <div className="flex flex-col gap-[20px]">
        <div className="w-[480px] flex justify-between items-center max-[650px]:flex-col max-[650px]:w-full max-[650px]:items-start max-[650px]:gap-3">
          <h1 className="text-[15px] pl-1">OPENAI KEY</h1>
          <Input
            placeholder="Input"
            className="w-[280px]  max-[650px]:w-full"
            value={openAIKey}
            onChange={(e) => {
              setOpenAIKey(e.target.value);
              setIsClient(true);
            }}
            onBlur={setThreadID}
          />
        </div>
        <div className="w-[480px] flex justify-between items-center max-[650px]:flex-col max-[650px]:w-full max-[650px]:items-start max-[650px]:gap-3">
          <h1 className="text-[15px] pl-1">Default Assistant Id</h1>
          <Input
            placeholder="Input"
            className="w-[280px]  max-[650px]:w-full"
            value={defaultAssistantId}
            onChange={(e) => {
              setDefaultAssistantId(e.target.value);
              setIsClient(true);
            }}
            onPressEnter={setThreadID}
          />
        </div>
        <div className="w-[480px] flex justify-between items-center max-[650px]:flex-col max-[650px]:w-full max-[650px]:items-start max-[650px]:gap-3">
          <h1 className="text-[15px] pl-1">Default Thread Id</h1>
          <Input
            placeholder="Input"
            className="w-[280px]  max-[650px]:w-full"
            value={defaultThreadId}
            onChange={(e) => {
              setDefaultThreadId(e.target.value);
              setIsClient(true);
            }}
          />
        </div>
      </div>
      {edit ? (
        <Reorder.Group
          axis="y"
          values={commands}
          onReorder={(value) => {
            saveCommandReorder(value);
            setCommands(value);
          }}
          className="overflow-hidden"
        >
          {commands.map((item, index) => (
            <Reorder.Item key={item.commandKey} value={item}>
              <div>
                <Command
                  key={index}
                  id={index}
                  onDelete={deleteComponent}
                  onEdit={handleEdit}
                  onApply={handleApply}
                  isEditing={editingCommandId != index}
                />
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div>
          {commands.map((item, index) => (
            <Command
              key={index}
              id={index}
              onDelete={deleteComponent}
              onEdit={handleEdit}
              onApply={handleApply}
              isEditing={editingCommandId != index}
            />
          ))}
        </div>
      )}
      <div>
        <Button type="primary" onClick={handleAddCommand}>
          Create Command
        </Button>
      </div>
    </div>
  );
}
