import React, {
  useEffect,
  useState,
  DragEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Button,
  Input,
  Select,
  Checkbox,
  message,
  Modal,
  notification,
} from "antd";
import type { CheckboxProps } from "antd";
import {
  FullscreenOutlined,
  PaperClipOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import useMindMapStore from "@/stores/mapStore";

const { Option } = Select;
const { TextArea } = Input;

import {
  ideas,
  defaultIdeasCheckedList,
  context,
  defaultContextCheckedList,
  content,
  defaultContentCheckedList,
} from "@/utils/data";
import { configuration } from "@/utils/type";
import axios from "axios";

interface CommandProps {
  id: number;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onApply: (id: number) => void;
  isEditing: boolean;
  allShortcuts: string[];
  updateShortcuts: (shortcut: string, id: number) => void;
}

const defaultValue: string = "Node type";

export default function Command({
  id,
  onDelete,
  onEdit,
  onApply,
  isEditing,
  allShortcuts,
  updateShortcuts,
}: CommandProps) {
  const {
    deleteCommand,
    saveCommand,
    getCommand,
    getDefaultAssistantId,
    getConfiguration,
    getDefaultThreadId,
    getOpenAIKey,
  } = useMindMapStore();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const [isClient, setIsClient] = useState(false);

  const [checkedIdeasList, setCheckedIdeasList] = useState<string[]>(
    defaultIdeasCheckedList
  );
  const [checkedContextList, setCheckedContextList] = useState<string[]>(
    defaultContextCheckedList
  );
  const [checkedContentList, setCheckedContentList] = useState<string[]>(
    defaultContentCheckedList
  );

  const [commandName, setCommandName] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [threadId, setThreadId] = useState("");
  const [commandsContent, setCommandsContent] = useState("");

  const [isKeypress, setIsKeypress] = useState<boolean>(false);

  const checkIdeasAll = ideas.length === checkedIdeasList.length;
  const indeterminateIdeas =
    checkedIdeasList.length > 0 && checkedIdeasList.length < ideas.length;
  const checkContextAll = context.length === checkedContextList.length;
  const indeterminateContext =
    checkedContextList.length > 0 && checkedContextList.length < context.length;
  const checkContentAll = content.length === checkedContentList.length;
  const indeterminateContent =
    checkedContentList.length > 0 && checkedContentList.length < content.length;

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const customEvent = new CustomEvent("inputChangeEvent", {
      detail: { value },
    });
    window.dispatchEvent(customEvent);
  };

  const onCheckIdeasAllChange: CheckboxProps["onChange"] = (e) => {
    setCheckedIdeasList(e.target.checked ? ideas : []);
  };

  const onCheckContextAllChange: CheckboxProps["onChange"] = (e) => {
    setCheckedContextList(e.target.checked ? context : []);
  };

  const onCheckContentAllChange: CheckboxProps["onChange"] = (e) => {
    setCheckedContentList(e.target.checked ? content : []);
  };

  const handleChange = (value: string) => {
    setSelectedValue(value);
    setIsClient(true);
  };

  const setCommandThreadId = () => {
    const thread = getCommand(id);
    const configurationData = getConfiguration();

    const defaultThreadId = configurationData.defaultThreadId;

    if (thread.threadId === "") {
      setThreadId(defaultThreadId);
      saveCommand(
        commandName,
        assistantId,
        defaultThreadId,
        selectedValue,
        checkedIdeasList,
        checkedContextList,
        checkedContentList,
        commandsContent,
        id
      );
    }
  };

  useEffect(() => {
    if (isClient) {
      saveCommand(
        commandName,
        assistantId,
        threadId,
        selectedValue,
        checkedIdeasList,
        checkedContextList,
        checkedContentList,
        commandsContent,
        id
      );
    }
  }, [
    commandName,
    assistantId,
    threadId,
    commandsContent,
    selectedValue,
    checkedIdeasList,
    checkedContextList,
    checkedContentList,
    isClient,
  ]);

  useEffect(() => {
    if (!isClient) {
      const storedRequest = getCommand(id);

      const assistantID = getDefaultAssistantId();
      const defaultThreadID = getDefaultThreadId();

      if (storedRequest) {
        setCheckedIdeasList(storedRequest.ideas || defaultIdeasCheckedList);
        setCheckedContextList(
          storedRequest.context || defaultContextCheckedList
        );
        setCheckedContentList(
          storedRequest.content || defaultContentCheckedList
        );
        setCommandName(storedRequest.commandName || "");
        setAssistantId(
          storedRequest.assistantId
            ? storedRequest.assistantId
            : assistantID || ""
        );
        setThreadId(
          storedRequest.threadId
            ? storedRequest.threadId
            : defaultThreadID || ""
        );
        setCommandsContent(storedRequest.commands || "");
        setSelectedValue(storedRequest.select || defaultValue);
      }
    }
  }, []);

  useEffect(() => {
    const handleThreadIdUpdate = (event: Event) => {
      const configuration: configuration = getConfiguration();

      const customEvent = event as CustomEvent;
      const { key } = customEvent.detail;
      if (key === id) {
        setThreadId(configuration.defaultThreadId);
      }
    };

    window.addEventListener(
      "threadIdUpdated",
      handleThreadIdUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "threadIdUpdated",
        handleThreadIdUpdate as EventListener
      );
    };
  }, [id]);

  const overflow = isEditing ? "overflow-hidden" : "overflow-scroll";

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

  const getThreadID = async () => {
    if (!threadId) {
      const newThreadId: any = await createThreadID();

      console.log(newThreadId);

      setThreadId(newThreadId);
    }
  };

  return (
    <div
      className={`w-full border-[1px] border-solid border-black px-[70px] py-[25px] flex flex-col gap-[30px] bg-[#f5f5f5] relative mt-[40px] max-[1175px]:px-[35px] h-[610px] ${overflow}`}
    >
      <div className="absolute right-[10px] top-[10px] flex gap-2">
        {isEditing ? (
          <EditOutlined
            className="text-[20px] max-[465px]:text-[16px]"
            onClick={() => {
              onEdit(id);
            }}
          />
        ) : (
          <PaperClipOutlined
            className="text-[20px] max-[465px]:text-[16px]"
            onClick={() => {
              onApply(id);
              setCommandThreadId();
            }}
          />
        )}
        <DeleteOutlined
          className="text-[20px] max-[465px]:text-[16px]"
          onClick={() => {
            setShowDeleteModal(true);
          }}
        />
        <FullscreenOutlined className="text-[20px] max-[465px]:text-[16px]" />
      </div>
      <div className="w-full flex justify-between gap-[80px] max-[1595px]:flex-col">
        <div className="w-[500px] flex justify-between max-[1595px]:w-full">
          <div className="flex flex-col justify-between h-[250px] w-full gap-5 max-[850px]:h-[320px]">
            <div className="w-[full] flex justify-between items-center max-[850px]:flex-col max-[850px]:gap-2">
              <div className="w-[200px] max-[850px]:w-full">
                <h1 className="max-[465px]:text-[14px]">Command Name</h1>
              </div>
              <div className="grow max-[850px]:w-full">
                <Input
                  placeholder="Input"
                  value={commandName}
                  disabled={isEditing}
                  onChange={(e) => {
                    setCommandName(e.target.value);
                    setIsClient(true);
                    handleOnChange(e);
                    setIsKeypress(false);
                  }}
                  onClick={() => {
                    setIsKeypress(false);
                  }}
                />
              </div>
            </div>
            <div className="w-[full] flex justify-between items-center max-[850px]:flex-col max-[850px]:gap-2">
              <div className="w-[200px] max-[850px]:w-full">
                <h1 className="max-[465px]:text-[14px]">Assistant Id</h1>
              </div>
              <div className="grow max-[850px]:w-full">
                <Input
                  placeholder="Input"
                  value={assistantId}
                  disabled={isEditing}
                  onChange={(e) => {
                    setAssistantId(e.target.value);
                    setIsClient(true);
                    handleOnChange(e);
                    setIsKeypress(false);
                  }}
                  onBlur={getThreadID}
                />
              </div>
            </div>
            <div className="w-[full] flex justify-between items-center max-[850px]:flex-col max-[850px]:gap-2">
              <div className="w-[200px] max-[850px]:w-full">
                <h1 className="max-[465px]:text-[14px]">Thread Id</h1>
              </div>
              <div className="grow max-[850px]:w-full">
                <Input
                  placeholder="Input"
                  value={threadId}
                  disabled={isEditing}
                  onChange={(e) => {
                    setThreadId(e.target.value);
                    setIsClient(true);
                    handleOnChange(e);
                    setIsKeypress(false);
                  }}
                  onClick={() => {
                    setIsKeypress(false);
                  }}
                  onBlur={getThreadID}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="grow flex flex-col gap-[20px] max-[1595px]:w-full max-[1595px]:h-[280px]">
          <Select
            className="w-[650px] max-[1595px]:w-full"
            onChange={(value) => {
              handleChange(value);
              setIsClient(true);
            }}
            value={selectedValue}
            defaultValue={selectedValue}
            disabled={isEditing}
          >
            <Option value="Node type">Node type</Option>
            <Option value="Idea">Create Idea</Option>
            <Option value="Context">Create Context</Option>
            <Option value="Content">Create Content</Option>
            <Option value="Edit Node">Edit Node</Option>
          </Select>
          <div className="w-[650px] grow border-black border-[1px] rounded-[5px] flex flex-col justify-between p-[30px] max-[1595px]:w-full overflow-scroll">
            <div className="w-full flex max-[768px]:w-[432px]">
              <div className="w-[31%] flex items-center justify-center"></div>
              <div className="w-[23%] flex items-center justify-center">
                <h1>Brother</h1>
              </div>
              <div className="w-[23%] flex items.center justify-center">
                <h1>Parent</h1>
              </div>
              <div className="w-[23%] flex items.center justify-center">
                <h1>All</h1>
              </div>
            </div>
            <div className="w-full flex max-[768px]:w-[432px]">
              <div className="w-[31%] flex items.center justify.center">
                <h1>Ideas</h1>
              </div>
              {ideas.map((option) => (
                <Checkbox
                  key={option}
                  value={option}
                  checked={checkedIdeasList.includes(option)}
                  onChange={() => {
                    const newList = checkedIdeasList.includes(option)
                      ? checkedIdeasList.filter((item) => item !== option)
                      : [...checkedIdeasList, option];
                    setCheckedIdeasList(newList);
                    setIsClient(true);
                  }}
                  className="w-[23%] flex justify-center items-center"
                  disabled={isEditing}
                />
              ))}
              <Checkbox
                indeterminate={indeterminateIdeas}
                onChange={onCheckIdeasAllChange}
                checked={checkIdeasAll}
                disabled={isEditing}
                className="w-[23%] flex justify-center items-center"
              />
            </div>
            <div className="w-full flex max-[768px]:w-[432px]">
              <div className="w-[31%] flex items.center justify.center">
                <h1>Context</h1>
              </div>
              {context.map((option) => (
                <Checkbox
                  key={option}
                  value={option}
                  checked={checkedContextList.includes(option)}
                  onChange={() => {
                    const newList = checkedContextList.includes(option)
                      ? checkedContextList.filter((item) => item !== option)
                      : [...checkedContextList, option];
                    setCheckedContextList(newList);
                    setIsClient(true);
                  }}
                  disabled={isEditing}
                  className="w-[23%] flex justify-center items-center"
                />
              ))}
              <Checkbox
                indeterminate={indeterminateContext}
                disabled={isEditing}
                onChange={onCheckContextAllChange}
                checked={checkContextAll}
                className="w-[23%] flex justify-center items-center"
              />
            </div>
            <div className="w-full flex max-[768px]:w-[432px]">
              <div className="w-[31%] flex items.center justify.center">
                <h1>Content</h1>
              </div>
              {content.map((option) => (
                <Checkbox
                  key={option}
                  value={option}
                  checked={checkedContentList.includes(option)}
                  onChange={() => {
                    const newList = checkedContentList.includes(option)
                      ? checkedContentList.filter((item) => item !== option)
                      : [...checkedContentList, option];
                    setCheckedContentList(newList);
                    setIsClient(true);
                  }}
                  disabled={isEditing}
                  className="w-[23%] flex justify-center items.center"
                />
              ))}
              <Checkbox
                indeterminate={indeterminateContent}
                disabled={isEditing}
                onChange={onCheckContentAllChange}
                checked={checkContentAll}
                className="w-[23%] flex justify-center items.center"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-[20px]">
        <h1>commands</h1>
        <TextArea
          autoSize={{ minRows: 6, maxRows: 10 }}
          className="w-full text-[15px] whitespace-pre-line"
          onChange={(e) => {
            setCommandsContent(e.target.value);
            setIsClient(true);
            setIsKeypress(false);
          }}
          value={commandsContent}
          disabled={isEditing}
          onClick={() => {
            setIsKeypress(false);
          }}
        />
      </div>
      <div className="w-full flex justify-end relative">
        {showModal && (
          <div className="absolute w-[220px] h-[150px] bg-[#ffffff] bottom-[20px] right-[50px] z-10 border-[1px] border-black border-solid rounded-[3px] px-[20px] py-[22px] flex flex-col justify-between max-[545px]:right-[10px]  max-[545px]:right-[-27px]">
            <h1 className="text-[18px]">
              You are going to
              <br />
              Delete a Command
            </h1>
            <div className="flex justify-between items-center">
              <Button
                style={{
                  backgroundColor: "white",
                  color: "black",
                  border: "1px solid #000000",
                  width: "74px",
                }}
                onClick={() => {
                  onDelete(id);
                  deleteCommand(id);
                  setShowModal(false);
                }}
              >
                OK
              </Button>
              <Button
                style={{
                  backgroundColor: "#212121",
                  color: "#ffffff",
                  width: "74px",
                }}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        <Modal
          open={showDeleteModal}
          onOk={() => {
            onDelete(id);
            deleteCommand(id);
            setShowDeleteModal(false);
          }}
          onCancel={() => {
            setShowDeleteModal(false);
          }}
        >
          <p>You are going to delete a command</p>
        </Modal>
        <div className="flex gap-[15px]">
          {isEditing ? (
            <Button
              style={{
                backgroundColor: "#1677ff",
                color: "#ffffff",
                width: "75px",
              }}
              onClick={() => {
                onEdit(id);
              }}
            >
              Edit
            </Button>
          ) : (
            <Button
              style={{
                backgroundColor: "#1677ff",
                color: "#ffffff",
                width: "75px",
              }}
              onClick={() => {
                onApply(id);
                setCommandThreadId();
              }}
            >
              Apply
            </Button>
          )}
          <Button
            style={{
              backgroundColor: "#212121",
              color: "#ffffff",
              width: "75px",
            }}
            onClick={() => {
              setShowModal(true);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
