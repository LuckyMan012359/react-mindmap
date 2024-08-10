import { useEffect, useRef, useState } from "react";
import useMindMapStore from "@/stores/mapStore";
import { Commands, mindMap } from "@/utils/type";
import "jsmind/style/jsmind.css";
import CommandSidebar from "./CommandSidebar/CommandSidebar";
import {
  MinusCircleOutlined,
  FullscreenOutlined,
  PlusCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { message, Modal, Input, Button, notification } from "antd";
import axios from "axios";

const MindMap = () => {
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const jmRef = useRef<any>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const [showCommandBar, setShowCommandBar] = useState<boolean>(true);
  const [commands, setCommands] = useState<Commands[]>([]);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const {
    currentMind,
    addNode,
    deleteNode,
    initializeMindMap,
    getCommands,
    updateNodeContent,
    executeCommand,
    getCommandByShortcut,
    commandToExecute,
    setCommandToExecute,
  } = useMindMapStore();
  const [showLoading, setShowLoading] = useState<boolean>(false);
  const [cancelTokenSource, setCancelTokenSource] = useState<any>(null);
  const [isShortcutPress, setIsShortcutPress] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    initializeMindMap();
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !currentMind) return;

    const loadMindMapInstance = async () => {
      const { default: jsMind } = await import("jsmind");
      const options = {
        container: "jsmind_container",
        editable: true,
        theme: "primary",
        layout: {
          hspace: 30,
          vspace: 20,
          pspace: 13,
          direction: "right",
          node_overflow: "wrap",
        },
      };
      if (!jmRef.current) {
        const jm = new jsMind(options);
        jm.show(currentMind);
        jmRef.current = jm;
      } else {
        jmRef.current.show(currentMind);
      }

      applyNodeBackgroundColors(currentMind);

      document
        .getElementById("jsmind_container")
        ?.addEventListener("contextmenu", handleContextMenu);
      document
        .getElementById("jsmind_container")
        ?.addEventListener("dblclick", handleNodeDoubleClick);
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("click", handleClickNode);
      document.addEventListener("keydown", handleKeyDown);
    };

    const fetchData = () => {
      const mindData = getCommands();
      if (mindData) {
        setCommands(mindData);
      }
      setShowLoading(false);
    };

    loadMindMapInstance();
    fetchData();

    window.addEventListener("projectChanged", fetchData);

    return () => {
      window.removeEventListener("projectChanged", fetchData);
      document
        .getElementById("jsmind_container")
        ?.removeEventListener("contextmenu", handleContextMenu);
      document
        .getElementById("jsmind_container")
        ?.removeEventListener("dblclick", handleNodeDoubleClick);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("click", handleClickNode);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isClient, currentMind, getCommands]);

  const handleExecuteCommand = (
    nodeType: string,
    commandName: string,
    index: number
  ) => {
    const selectedNode = jmRef.current?.get_selected_node();
    if (!selectedNode) {
      message.error({
        content: "Please select a node.",
      });
      setShowLoading(false);
      return;
    }

    console.log(nodeType);

    if (!nodeType || nodeType === "" || nodeType === "Node type") {
      setShowLoading(false);
      message.error({
        content: "Please select command type",
      });
      setContextMenu({ visible: false, x: 0, y: 0 });
      return;
    }

    if (nodeType === "Edit Node") {
      if (commandName === "") {
        message.error({
          content: "Please input command name",
        });
        setContextMenu({ visible: false, x: 0, y: 0 });
        return;
      }

      const source = axios.CancelToken.source();
      setCancelTokenSource(source);

      setContextMenu({ visible: false, x: 0, y: 0 });
      executeCommand(
        index,
        selectedNode.id,
        selectedNode,
        nodeType,
        source.token
      );
      setShowLoading(true);
      return;
    }

    if (commandName === "") {
      message.error({
        content: "Please input command name",
      });
      setContextMenu({ visible: false, x: 0, y: 0 });
      return;
    }

    const source = axios.CancelToken.source();
    setCancelTokenSource(source);

    setContextMenu({ visible: false, x: 0, y: 0 });
    executeCommand(
      index,
      selectedNode.id,
      selectedNode,
      nodeType,
      source.token
    );
    setShowLoading(true);
  };

  useEffect(() => {
    if (commandToExecute) {
      handleExecuteCommand(
        commandToExecute.select,
        commandToExecute.commandName,
        commands.findIndex(
          (cmd) => cmd.commandKey === commandToExecute.commandKey
        )
      );
      setCommandToExecute(null);
    }
  }, [commandToExecute, commands, setCommandToExecute]);

  const applyNodeBackgroundColors = (mindMapData: mindMap) => {
    mindMapData.data.forEach((node) => {
      switch (node.type) {
        case "Idea":
          jmRef.current.set_node_color(node.id, "Green", "white");
          break;
        case "Context":
          jmRef.current.set_node_color(node.id, "Gray", "white");
          break;
        case "Content":
          jmRef.current.set_node_color(node.id, "White", "black");
          break;
        default:
          jmRef.current.set_node_color(node.id, "#3276b1", "white");
      }
    });
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    const selectedNode = jmRef.current?.get_selected_node();
    if (!selectedNode) return;

    console.log(event, ": event");

    setContextMenu({
      visible: true,
      x: event.pageX + 5,
      y: event.pageY + 5,
    });
  };

  const handleClickOutside = (event: MouseEvent) => {
    setIsShortcutPress(false);

    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu({ visible: false, x: 0, y: 0 });
    }
  };

  const handleNodeDoubleClick = (event: MouseEvent) => {
    const selectedNode = jmRef.current?.get_selected_node();
    if (!selectedNode) return;

    setCurrentNode(selectedNode);
    setEditedContent(selectedNode.topic);
    setEditModalVisible(true);
  };

  const handleAddNode = (nodeType: string) => {
    const selectedNode = jmRef.current?.get_selected_node();
    if (!selectedNode) {
      message.error({
        content: "Please select a node.",
      });
      return;
    }

    const nodeId = `${nodeType.toUpperCase()}_#${new Date().getTime()}`;
    const newNode = {
      id: nodeId,
      parentid: selectedNode.id,
      topic: `sub_${nodeType}`,
      isroot: false,
      type: nodeType,
    };

    jmRef.current?.add_node(selectedNode, nodeId, nodeId, {
      direction: "right",
    });
    addNode(selectedNode.id, newNode);
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleDeleteNode = () => {
    const selectedNode = jmRef.current?.get_selected_node();
    if (!selectedNode || selectedNode.isroot) {
      message.error({
        content: "You can't delete root node",
      });
      setContextMenu({ visible: false, x: 0, y: 0 });
      setDeleteModalVisible(false);
      return;
    }

    deleteNode(selectedNode.id);
    message.success({
      content: `Deleted ${selectedNode.data.type} node`,
    });
    jmRef.current?.remove_node(selectedNode.id);
    setContextMenu({ visible: false, x: 0, y: 0 });
    setDeleteModalVisible(false);
    return;
  };

  const handleDeleteNodeByKeyboard = () => {
    const selectedNodeID = localStorage.getItem("nodeData");

    if (selectedNodeID) {
      const nodeID = JSON.parse(selectedNodeID);

      if (nodeID.id === "root") {
        return;
      }

      jmRef.current?.remove_node(nodeID.id);
      deleteNode(nodeID.id);
      setContextMenu({ visible: false, x: 0, y: 0 });
      setDeleteModalVisible(false);
      message.success({
        content: `Deleted ${nodeID.data.type} node`,
      });
      return;
    }
  };

  const handleEditSave = () => {
    if (currentNode && editedContent) {
      currentNode.topic = editedContent;
      jmRef.current.update_node(currentNode.id, editedContent);
      updateNodeContent(currentNode.id, editedContent);
      setEditModalVisible(false);
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!reactFlowWrapper.current) return;

    if (event.dataTransfer) {
      const data: any = JSON.parse(
        event.dataTransfer.getData("application/reactflow")
      );

      handleExecuteCommand(data.CommandType, data.commandName, data.id);
    }
  };

  const handleClickNode = (event: MouseEvent) => {
    const nodeContent = jmRef.current?.get_selected_node();
    if (nodeContent) {
      const nodeData = {
        id: nodeContent.id,
        topic: nodeContent.topic,
        data: nodeContent.data,
      };
      localStorage.setItem("nodeData", JSON.stringify(nodeData));
      setIsShortcutPress(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Delete") {
      handleDeleteNodeByKeyboard();
    }
  };

  const handleCancel = () => {
    if (cancelTokenSource) {
      setShowLoading(false);
      setIsShortcutPress(false);
      cancelTokenSource.cancel("Request canceled by user.");
      notification.info({
        message: "Command is stopped",
      });
    } else {
      setShowLoading(false);
    }
  };

  useEffect(() => {
    const handleThreadIdUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { errorStatus } = customEvent.detail;

      if (errorStatus === 401) {
        notification.error({
          message: "Invalid OpenAI API key",
        });
        setShowLoading(false);
      } else if (errorStatus === 400) {
        notification.error({
          message: "OpenAI API key is required",
        });
        setShowLoading(false);
      }
    };

    window.addEventListener(
      "errorOccurs",
      handleThreadIdUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "errorOccurs",
        handleThreadIdUpdate as EventListener
      );
    };
  }, []);

  const handleExecuteCommandByShortcut = (event: KeyboardEvent) => {
    const selectedNode = jmRef.current?.get_selected_node();
    let newShortcut = "";

    const specialKeys = ["Shift", "Control", "Alt", "Meta", "Delete"];

    if (!specialKeys.includes(event.key)) {
      if (!selectedNode) {
        message.error({
          content: "Please select node.",
        });
        setIsShortcutPress(false);
        return;
      }
      if (event.altKey && event.key) {
        event.preventDefault();
        newShortcut = `Alt + ${event.key.toUpperCase()}`;
      } else if (event.ctrlKey && event.key) {
        event.preventDefault();
        newShortcut = `Ctrl + ${event.key.toUpperCase()}`;
      } else if (event.shiftKey && event.key) {
        event.preventDefault();
        newShortcut = `Shift + ${event.key.toUpperCase()}`;
      }
    }

    const command = getCommandByShortcut(newShortcut);

    console.log(command);

    if (command) {
      handleExecuteCommand(
        command.command.select,
        command.command.commandName,
        command.index
      );
    } else {
      return;
    }

    setIsShortcutPress(false);
  };

  useEffect(() => {
    if (isShortcutPress) {
      window.addEventListener(
        "keydown",
        handleExecuteCommandByShortcut as EventListener
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleExecuteCommandByShortcut as EventListener
        );
      };
    }
  });

  if (!isClient) return null;

  return (
    <div>
      <div
        className="w-full h-full bg-slate-100"
        ref={reactFlowWrapper}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div
          id="jsmind_container"
          style={{ width: "100%", height: "700px", backgroundColor: "#f4f4f4" }}
        ></div>
      </div>
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{
            position: "absolute",
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            backgroundColor: "white",
            boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.8)",
            borderRadius: "5px",
            zIndex: 10,
          }}
        >
          <ul>
            <li
              onClick={() => handleAddNode("Idea")}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              Add Idea Node
            </li>
            <li
              onClick={() => handleAddNode("Context")}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              Add Context Node
            </li>
            <li
              onClick={() => handleAddNode("Content")}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              Add Content Node
            </li>
            <li
              onClick={() => setDeleteModalVisible(true)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              Delete Node
            </li>
            {commands.map((value, index) => (
              <li
                key={index}
                onClick={async () => {
                  setShowLoading(true);
                  handleExecuteCommand(value.select, value.commandName, index);
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {`Add ${value.commandName} node`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="absolute left-30 top-[300px] w-[280px] z-10 max-[1365px]:top-[530px] max-[630px]:top-[610px] max-[630px]:w-[238px]">
        <div className="border-[1px] border-[solid] border-black h-[40px] w-full relative flex justify-center items-center bg-white">
          <h1>Command Bar</h1>
          <div className="absolute right-0 top-0 w-[75px] h-full flex justify-between items-center px-[15px]">
            {showCommandBar ? (
              <MinusCircleOutlined onClick={() => setShowCommandBar(false)} />
            ) : (
              <PlusCircleOutlined onClick={() => setShowCommandBar(true)} />
            )}
            <FullscreenOutlined />
          </div>
        </div>
        {showCommandBar && <CommandSidebar />}
      </div>
      <Modal
        title="Edit Node Content"
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={() => setEditModalVisible(false)}
        keyboard={true}
      >
        <Input
          value={editedContent}
          onPressEnter={() => {
            handleEditSave();
            setEditModalVisible(false);
          }}
          onClick={(e) => {
            setIsShortcutPress(false);
            e.stopPropagation();
          }}
          onChange={(e) => {
            setEditedContent(e.target.value);
            e.stopPropagation();
            setIsShortcutPress(false);
          }}
        />
      </Modal>
      <Modal
        title="Delete Node"
        open={deleteModalVisible}
        onOk={handleDeleteNode}
        onCancel={() => setDeleteModalVisible(false)}
        keyboard={true}
      >
        <p>Are you sure you want to delete this node?</p>
      </Modal>
      {showLoading ? (
        <div className="fixed w-screen h-screen top-0 left-0 flex justify-center items-center flex-col backgroundColor z-20 gap-[100px]">
          <div className="w-full flex justify-center items-center">
            <LoadingOutlined className="text-[75px] text-[#fff]" />
          </div>
          <div>
            <Button
              type="primary"
              className="w-[120px] h-[40px] text-[18px]"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default MindMap;
