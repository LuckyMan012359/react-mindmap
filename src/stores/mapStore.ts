import { message, notification } from "antd";
import { create } from "zustand";
import axios from "axios";
import {
  Node,
  Commands,
  ReturnCommand,
  mindMap,
  configuration,
} from "@/utils/type";
import { loadFromJSON, loadFromMM, restoreData } from "@/utils/data";

const cancelToken = axios.CancelToken;
let cancel;

const defaultReturnCommand: ReturnCommand = {
  commandName: "",
  assistantId: "",
  threadId: "",
  commands: "",
  select: "",
  idea: [0, 0],
  context: [0, 0],
  content: [0, 0],
  commandKey: new Date().toString(),
};

interface MindMapState {
  minds: mindMap[];
  currentMind: mindMap | null;
  commandToExecute: Commands | null;
  setMinds: (newMinds: mindMap[]) => void;
  addNode: (parentNodeId: string, newNode: Node) => void;
  deleteNode: (nodeId: string) => void;
  initializeMindMap: () => void;
  createNewProject: (projectName: string) => void;
  getProjects: () => string[];
  setCurrentProject: (projectName: string) => void;
  setMindMapProjectName: (projectName: string) => void;
  deleteMindMapProject: () => void;
  downloadFreemind: () => void;
  downloadProject: () => void;
  loadProject: () => Promise<boolean>;
  loadFreeMind: () => Promise<boolean>;
  setRequestContent: (value: string) => void;
  getDatas: () => mindMap[];
  saveConfigurationDefaultValue: (
    openAIKey: string,
    defaultAssistantId: string,
    defaultThreadId: string
  ) => void;
  addCommand: () => void;
  deleteCommand: (index: number) => void;
  saveCommand: (
    commandName: string,
    assistantId: string,
    threadId: string,
    select: string,
    ideas: number[],
    context: number[],
    content: number[],
    commands: string,
    id: number
  ) => void;
  getCommand: (index: number) => ReturnCommand;
  getCommands: () => Commands[];
  saveCommandReorder: (commands: Commands[]) => void;
  updateNodeContent: (nodeId: string, newContent: string) => void;
  getDefaultThreadId: () => string;
  getDefaultAssistantId: () => string;
  getOpenAIKey: () => string;
  getConfiguration: () => configuration;
  executeCommand: (
    key: number,
    parentId: string,
    node: any,
    nodeType: string,
    cancelToken: any
  ) => void;
  setCommandToExecute: (command: Commands | null) => void;
}

const defaultMindMap: mindMap = {
  meta: {
    name: "MindMap",
    version: "0.2",
  },
  format: "node_array",
  projectName: "Default Project",
  data: [{ id: "root", isroot: true, topic: "MindMap", type: "root" }],
  RequestInstruction: "",
  configuration: {
    openAIKey: "",
    defaultAssistantId: "",
    defaultThreadId: "",
    commands: [],
  },
};

const createNodeData = (node: any) => {
  return {
    id: node.id,
    parentid: node.parent ? node.parent.id : undefined,
    isroot: node.parent ? false : true,
    topic: node.topic,
    type: node.data.type,
  };
};

const jsonToXML = (mindMap: Node[]): string => {
  const includedNodeIds = new Set<string>();

  const getNodeXML = (node: Node): string => {
    let backgroundColor = "";

    if (node.type === "Idea") {
      backgroundColor = "#008000"; // Green
    } else if (node.type === "Context") {
      backgroundColor = "#808080"; // Grey
    } else if (node.type === "Content") {
      backgroundColor = "#FFFFFF"; // White
    }

    const children = mindMap.filter((n) => n.parentid === node.id);
    const childrenXML = children.map(getNodeXML).join("");
    includedNodeIds.add(node.id);

    return `<node ID="${node.id}" TEXT="${node.topic}"${node.isroot ? ' ROOT="true"' : ""
      } BACKGROUND_COLOR="${backgroundColor}">${childrenXML}</node>`;
  };

  const rootNode = mindMap.find((n) => n.isroot);
  let xmlString = `<map version="1.0.1">\n<!-- To view this file, download free mind mapping software FreeMind from http://freemind.sourceforge.net -->\n`;

  if (rootNode) {
    xmlString += `${getNodeXML(rootNode)}\n`;
  } else {
    mindMap.forEach((node) => {
      if (!includedNodeIds.has(node.id)) {
        xmlString += `${getNodeXML(node)}\n`;
      }
    });
  }

  xmlString += `</map>`;
  return xmlString;
};

const jsonToXMLSelectNode = (node: Node): string => {
  let backgroundColor = "";

  if (node.type === "Idea") {
    backgroundColor = "#008000"; // Green
  } else if (node.type === "Context") {
    backgroundColor = "#808080"; // Grey
  } else if (node.type === "Content") {
    backgroundColor = "#FFFFFF"; // White
  }

  return `<node ID="${node.id}" TEXT="${node.topic}"${node.isroot ? ' ROOT="true"' : ""
    } BACKGROUND_COLOR="${backgroundColor}"></node>`;
};

const xmlToJson = (xmlString: string): Node[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const nodes: Node[] = [];
  let isFirstNode = true;

  const parseNode = (xmlNode: Element, parentId?: string) => {
    const id = parentId ? xmlNode.getAttribute("ID")! : "root";
    const topic = xmlNode.getAttribute("TEXT")!;
    let type = determineNodeType(xmlNode.getAttribute("BACKGROUND_COLOR"));

    if (type === "Unknown") {
      if (isFirstNode) {
        type = "default";
        isFirstNode = false;
      } else {
        type = "Content";
      }
    }

    const node: Node = { id, topic, type, parentid: parentId };

    if (!parentId) {
      node.isroot = true;
    }
    nodes.push(node);

    const childNodes = xmlNode.children;
    for (let i = 0; i < childNodes.length; i++) {
      parseNode(childNodes[i] as Element, id);
    }
  };

  const rootElement = xmlDoc.getElementsByTagName("node")[0];

  if (rootElement) {
    parseNode(rootElement);
  }

  return nodes;
};

// Helper function to determine node type based on color
const determineNodeType = (color: string | null): string => {
  switch (color) {
    case "#008000":
      return "Idea";
    case "#808080":
      return "Context";
    case "#FFFFFF":
      return "Content";
    default:
      return "Unknown";
  }
};

const useMindMapStore = create<MindMapState>((set) => ({
  minds: [],
  currentMind: null,
  commandToExecute: null,
  setCommandToExecute: (command) => set({ commandToExecute: command }),
  setMinds: (newMinds) => {
    localStorage.setItem("mindMapData", JSON.stringify(newMinds));
    window.dispatchEvent(new Event("projectChanged"));
    set({ minds: newMinds });
  },
  addNode: (parentNodeId, newNode) =>
    set((state) => {
      const mind = state.minds[0];
      const parentNodeExists = mind.data.some(
        (node) => node.id === parentNodeId
      );

      if (parentNodeExists) {
        const updatedMind = {
          ...mind,
          data: [...mind.data, { ...newNode, parentid: parentNodeId }],
        };

        const updatedMinds = state.minds.map((m, index) =>
          index === 0 ? updatedMind : m
        );

        localStorage.setItem("mindMapData", JSON.stringify(updatedMinds));
        window.dispatchEvent(new Event("projectChanged"));
        return { minds: updatedMinds };
      } else {
        message.error("Parent node not found");
        return state;
      }
    }),
  deleteNode: (nodeId) =>
    set((state) => {
      const deleteNodeAndChildren = (nodes: Node[], id: string): Node[] => {
        const childrenIds = nodes
          .filter((node) => node.parentid === id)
          .map((node) => node.id);
        let filteredNodes = nodes.filter((node) => node.id !== id);
        childrenIds.forEach((childId) => {
          filteredNodes = deleteNodeAndChildren(filteredNodes, childId);
        });
        return filteredNodes;
      };

      const updatedMinds = state.minds.map((mind) => ({
        ...mind,
        data: deleteNodeAndChildren(mind.data, nodeId),
      }));
      localStorage.setItem("mindMapData", JSON.stringify(updatedMinds));
      window.dispatchEvent(new Event("projectChanged"));
      return { minds: updatedMinds };
    }),
  initializeMindMap: () => {
    const mindData = localStorage.getItem("mindMapData");

    if (!mindData || mindData.length === 2) {
      localStorage.setItem("mindMapData", JSON.stringify([defaultMindMap]));
      window.dispatchEvent(new Event("projectChanged"));
      set({ minds: [defaultMindMap], currentMind: defaultMindMap });
    } else {
      const parsedMinds = JSON.parse(mindData!);
      set({ minds: parsedMinds, currentMind: parsedMinds[0] });
    }
  },
  createNewProject: (projectName: string) =>
    set((state) => {
      if (!projectName) {
        message.error("Please input project name");
        return { minds: state.minds };
      }

      // Retrieve existing projects from localStorage
      const data = localStorage.getItem("mindMapData");
      let newProjectName = projectName;

      if (data) {
        try {
          const parsedMinds = JSON.parse(data) as mindMap[];

          // Check if the exact project name exists
          const exactProjectExists = parsedMinds.some(
            (project) => project.projectName === projectName
          );

          if (exactProjectExists) {
            // Filter the existing projects that start with the same base name
            let existingProjects = parsedMinds.filter(
              (item) => item.projectName.startsWith(projectName)
            );

            // Collect suffixes for all matching projects (e.g., project1, project2, etc.)
            const suffixes = existingProjects.map((project) => {
              const match = project.projectName.match(new RegExp(`^${projectName} (\\d+)$`));
              if (match) {
                return parseInt(match[1], 10);
              }
              return null;
            }).filter(suffix => suffix !== null) as number[]; // Remove non-numeric matches

            // Sort suffixes to identify gaps
            suffixes.sort((a, b) => a - b);

            let newSuffix = 1; // Start from 1, as we are looking for 'project 1', 'project 2', etc.

            for (let i = 0; i < suffixes.length; i++) {
              if (suffixes[i] === newSuffix) {
                newSuffix++;
              } else {
                break; // Found a gap, stop here
              }
            }

            // Set the new project name to 'project ' + newSuffix (e.g., 'project 1', 'project 2')
            newProjectName = projectName + " " + newSuffix;
          }
        } catch (error) {
          console.error("Failed to parse mind map data:", error);
        }
      }

      // Create the new project with the updated project name
      const newMindMap = {
        ...defaultMindMap,
        projectName: newProjectName,
        data: [{ id: "root", isroot: true, topic: "New MindMap", type: "root" }],
      };

      // Update the state and localStorage
      const updatedMinds = [newMindMap, ...state.minds];
      localStorage.setItem("mindMapData", JSON.stringify(updatedMinds));
      window.dispatchEvent(new Event("projectChanged"));

      return { minds: updatedMinds, currentMind: newMindMap };
    }),


  getProjects: () => {
    const data = localStorage.getItem("mindMapData");
    if (data) {
      const parsedMinds = JSON.parse(data) as mindMap[];
      return parsedMinds.map((mind) => mind.projectName);
    }
    return [];
  },
  setCurrentProject: (projectName: string) =>
    set((state) => {
      const selectedMind = state.minds.find(
        (mind) => mind.projectName === projectName
      );
      if (selectedMind) {
        const updatedMinds = [
          selectedMind,
          ...state.minds.filter((mind) => mind.projectName !== projectName),
        ];
        localStorage.setItem("mindMapData", JSON.stringify(updatedMinds));
        window.dispatchEvent(new Event("projectChanged"));
        return { minds: updatedMinds, currentMind: selectedMind };
      }
      return state;
    }),
  setMindMapProjectName: (projectName: string) => {
    const data = localStorage.getItem("mindMapData");
    if (data) {
      try {
        const parsedMinds = JSON.parse(data) as mindMap[];

        let newProjectName = projectName;

        // Check if the exact project name exists
        const exactProjectExists = parsedMinds.some(
          (project) => project.projectName === projectName
        );

        if (exactProjectExists) {
          // Filter the existing projects that start with the same base name
          let existingProjects = parsedMinds.filter(
            (item) => item.projectName.startsWith(projectName)
          );

          // Collect suffixes for all matching projects (e.g., project1, project2, etc.)
          const suffixes = existingProjects.map((project) => {
            const match = project.projectName.match(new RegExp(`^${projectName} (\\d+)$`));
            if (match) {
              return parseInt(match[1], 10);
            }
            return null;
          }).filter(suffix => suffix !== null) as number[]; // Remove non-numeric matches

          // Sort suffixes to identify gaps
          suffixes.sort((a, b) => a - b);

          let newSuffix = 1; // Start from 1, as we are looking for 'project 1', 'project 2', etc.

          for (let i = 0; i < suffixes.length; i++) {
            if (suffixes[i] === newSuffix) {
              newSuffix++;
            } else {
              break; // Found a gap, stop here
            }
          }

          // Set the new project name to 'project ' + newSuffix (e.g., 'project 1', 'project 2')
          newProjectName = projectName + " " + newSuffix;
        }

        // Update the project name for the first item
        if (parsedMinds.length > 0) {
          parsedMinds[0].projectName = newProjectName;
          localStorage.setItem("mindMapData", JSON.stringify(parsedMinds));
          window.dispatchEvent(new Event("projectChanged"));
        }
      } catch (error) {
        console.error("Failed to parse mind map data:", error);
      }
    }
  },


  deleteMindMapProject: () => {
    const data = localStorage.getItem("mindMapData");

    if (data) {
      try {
        const parsedMinds = JSON.parse(data) as mindMap[];
        if (parsedMinds.length > 0) {
          parsedMinds.shift();
          localStorage.setItem("mindMapData", JSON.stringify(parsedMinds));
          window.dispatchEvent(new Event("projectChanged"));
        }
      } catch (error) {
        console.error("Failed to parse mind map data:", error);
      }
    }
  },
  downloadFreemind: () => {
    const data = localStorage.getItem("mindMapData");
    if (data) {
      try {
        const parsedMinds = JSON.parse(data) as mindMap[];
        const mindMapToDownload = parsedMinds[0].data; // Assuming you want to download the first mind map

        const xmlData = jsonToXML(mindMapToDownload);

        const blob = new Blob([xmlData], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${parsedMinds[0].projectName}.mm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error("Failed to parse mind map data:", error);
      }
    }
  },
  downloadProject: () => {
    const data = localStorage.getItem("mindMapData");
    if (data) {
      try {
        const parsedMinds = JSON.parse(data) as mindMap[];
        const mindMapToDownload = parsedMinds[0]; // Assuming you want to download the first mind map

        const blob = new Blob([JSON.stringify(mindMapToDownload)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${mindMapToDownload.projectName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error("Failed to parse mind map data:", error);
      }
    }
  },
  loadProject: async () => {
    try {
      const data = await loadFromJSON(); // Assuming loadFromJSON returns the loaded data as MindMap

      restoreData(data);
    } catch (error) {
      console.error("Failed to load Freemind data:", error);
    }

    return false;
  },
  loadFreeMind: async () => {
    try {
      const file = await loadFromMM();
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const xmlString = fileReader.result as string;
        const jsonData = xmlToJson(xmlString);

        const storageData = localStorage.getItem("mindMapData");
        if (storageData) {
          const mindData = JSON.parse(storageData) as mindMap[];

          const newMindMap: mindMap = {
            meta: {
              name: "MindMap",
              version: "0.2",
            },
            format: "node_array",
            projectName: `New Freemind ${new Date().getTime()}`,
            data: jsonData,
            RequestInstruction: "",
            configuration: {
              openAIKey: "",
              defaultAssistantId: "",
              defaultThreadId: "",
              commands: [],
            },
          };

          mindData.unshift(newMindMap);
          localStorage.setItem("mindMapData", JSON.stringify(mindData));
          window.dispatchEvent(new Event("projectChanged"));
        }
      };

      fileReader.readAsText(file);
      return true;
    } catch (error) {
      console.error(error);
    }
    return false;
  },
  setRequestContent: (value: string) => {
    const data = localStorage.getItem("mindMapData");
    if (data) {
      const mindData = JSON.parse(data);

      mindData[0].RequestInstruction = value;

      localStorage.setItem("mindMapData", JSON.stringify(mindData));
    }
  },
  getDatas: () => {
    const data = localStorage.getItem("mindMapData");
    if (data) {
      return JSON.parse(data);
    } else {
      return [];
    }
  },
  saveConfigurationDefaultValue: (
    openAIKey: string,
    defaultAssistantId: string,
    defaultThreadId: string
  ) => {
    const data = localStorage.getItem("mindMapData");
    if (data) {
      const mindData = JSON.parse(data);

      mindData[0].configuration.openAIKey = openAIKey;
      mindData[0].configuration.defaultAssistantId = defaultAssistantId;
      mindData[0].configuration.defaultThreadId = defaultThreadId;

      localStorage.setItem("mindMapData", JSON.stringify(mindData));
      window.dispatchEvent(new Event("projectChanged"));
    }
  },
  addCommand: () => {
    let idea = [0, 0]
    let content = [0, 0]
    let context = [0, 0]

    const command: Commands = {
      commandName: "",
      assistantId: "",
      threadId: "",
      select: "",
      idea: idea,
      content: content,
      context: context,
      commands: "",
      commandKey: new Date().toString(),
    };

    const storageData = localStorage.getItem("mindMapData");

    if (storageData) {
      const data = JSON.parse(storageData);
      data[0].configuration.commands.push(command);
      localStorage.setItem("mindMapData", JSON.stringify(data));
      window.dispatchEvent(new Event("projectChanged"));
    }
  },
  deleteCommand: (index: number) => {
    const storageData = localStorage.getItem("mindMapData");
    if (storageData) {
      const data = JSON.parse(storageData);
      if (data.length > 0) {
        data[0].configuration.commands.splice(index, 1);
        localStorage.setItem("mindMapData", JSON.stringify(data));
        window.dispatchEvent(new Event("projectChanged"));
      }
    }
  },
  saveCommand: (
    commandName: string,
    assistantId: string,
    threadId: string,
    select: string,
    idea: number[],
    context: number[],
    content: number[],
    commands: string,
    id: number
  ) => {
    const storageData = localStorage.getItem("mindMapData");
    if (storageData) {
      const data = JSON.parse(storageData);

      const command: Commands = {
        commandName,
        assistantId,
        threadId,
        select,
        idea: idea,
        content: content,
        context: context,
        commands,
        commandKey: new Date().toString(),
      };

      data[0].configuration.commands[id] = command;
      localStorage.setItem("mindMapData", JSON.stringify(data));
      window.dispatchEvent(new Event("projectChanged"));
    }
  },
  getCommand: (index: number) => {
    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      if (data[0].configuration.commands[0]) {
        let commandData: Commands;

        commandData = data[0].configuration.commands[index];

        const command: ReturnCommand = {
          commandName: commandData.commandName,
          assistantId: commandData.assistantId,
          threadId: commandData.threadId,
          select: commandData.select,
          commands: commandData.commands,
          idea: commandData.idea,
          context: commandData.context,
          content: commandData.content,
          commandKey: new Date().toString(),
        };

        return command;
      } else {
        return defaultReturnCommand;
      }
    }
    return defaultReturnCommand;
  },
  getCommands: () => {
    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      return data[0].configuration.commands;
    }
  },
  saveCommandReorder: (commands: Commands[]) => {
    const mindData = localStorage.getItem("mindMapData");

    if (mindData) {
      const data = JSON.parse(mindData);
      if (data) {
        data[0].configuration.commands = commands;

        localStorage.setItem("mindMapData", JSON.stringify(data));

        window.dispatchEvent(new Event("projectChanged"));
      }
    }
  },
  updateNodeContent: (nodeId: string, newContent: string) => {
    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      data[0].data.map((item: Node) => {
        if (item.id === nodeId) {
          item.topic = newContent;
        }
      });

      localStorage.setItem("mindMapData", JSON.stringify(data));

      window.dispatchEvent(new Event("projectChanged"));
    }
  },
  getDefaultThreadId: () => {
    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      return data[0].configuration.defaultThreadId;
    }
  },
  getOpenAIKey: () => {
    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      return data[0].configuration.openAIKey;
    }
  },
  getDefaultAssistantId: () => {
    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      return data[0].configuration.defaultAssistantId;
    }
  },
  getConfiguration: () => {
    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      return data[0].configuration;
    }
  },
  executeCommand: async (
    key: number,
    parentId: string,
    node: any,
    nodeType: string,
    cancelToken: any
  ) => {
    console.log(node);

    const mindMapData = localStorage.getItem("mindMapData");

    if (mindMapData) {
      const data = JSON.parse(mindMapData);

      const openAIKey = data[0].configuration.openAIKey;
      const defaultAssistantId = data[0].configuration.defaultAssistantId;
      const defaultThreadId = data[0].configuration.defaultThreadId;
      const requestInstruction = data[0].RequestInstruction

      try {
        const currentCommand: Commands = data[0].configuration.commands[key];

        console.log(currentCommand);

        console.log(defaultAssistantId);

        let headLevel = 0
        let depth = 0

        if (node.data.type.toLowerCase() == "idea") {
          headLevel = currentCommand.idea[0]
          depth = currentCommand.idea[1]
        } else if (node.data.type.toLowerCase() == "content") {
          headLevel = currentCommand.content[0]
          depth = currentCommand.content[1]
        } else {
          headLevel = currentCommand.context[0]
          depth = currentCommand.context[1]
        }

        let promptNodes: any[] = [];

        console.log(node);

        if (node.id === "root") {
          promptNodes.push(createNodeData(node));
        }
        else {
          const addSubNodes = (currentNode: any, levelsNumber: number) => {
            promptNodes.push(createNodeData(currentNode));

            if (currentNode.children && currentNode.children.length > 0) {
              currentNode.children.forEach((child: any) => {
                if (child.data.type === currentNode.data.type && child.id != currentNode.id) {
                  const number = levelsNumber - 1;
                  if (number <= 0) {
                    return;
                  }
                  else {
                    addSubNodes(child, number);
                  }
                }
              });
            }
          };

          const findRootNode = (currentNode: any, level: number) => {
            let rootNode = currentNode

            while (level) {
              console.log(level);

              if (rootNode.data.type == 'root' && level > 0) {
                return;
              } else {
                rootNode = rootNode.parent;
                console.log(rootNode);
              }
              level = level - 1;
            }

            return rootNode
          }

          const rootNodeType = findRootNode(node, headLevel)

          const getNodesWithinDepth = (node: any, maxDepth: number, currentDepth = 0) => {
            if (node == undefined) {
              return []
            }

            if (currentDepth >= maxDepth) {
              return [];
            }

            let nodes: any[] = [];

            if (node.children && node.children.length > 0) {
              node.children.forEach((child: any) => {
                if (child.data.type === rootNodeType.data.type) {
                  nodes.push(child);
                }
                nodes = nodes.concat(getNodesWithinDepth(child, maxDepth, currentDepth + 1));
              });
            }

            return nodes;
          };

          const rootNode = findRootNode(node, headLevel)

          promptNodes = [...getNodesWithinDepth(rootNode, depth) || []];

          if (rootNode) {
            promptNodes.unshift(rootNode)
          }
        }

        if (promptNodes.length == 0) {
          notification.error({
            message: "Please check Head Levels. This value is too big for selected node."
          })
          window.dispatchEvent(new Event("projectChanged"));

          const event = new CustomEvent("threadIdUpdated", {
            detail: { key },
          });
          window.dispatchEvent(event);
          return;
        }

        console.log(promptNodes, "This is mindmap array data and it is include selected node and parent or brother nodes if they are seleted.");

        const xmlData = jsonToXML(promptNodes);

        console.log(xmlData, "This is mindmap xml data and it is include selected node and parent or brother nodes if they are seleted.");

        const selectNodeXmlData = jsonToXMLSelectNode(node);

        const response = await axios.post(
          "/api/commandOpenai",
          {
            openAIKey: openAIKey,
            defaultAssistantId: currentCommand.assistantId == '' ? defaultAssistantId : currentCommand.assistantId,
            prompt: currentCommand.commands,
            threadId: currentCommand.threadId == '' ? defaultThreadId : currentCommand.threadId,
            nodes: xmlData,
            selectNode: selectNodeXmlData,
            general_prompt: requestInstruction
          },
          { cancelToken: cancelToken }
        );

        const content = response.data.message.content;
        const type = nodeType;

        if (nodeType != "Edit Node") {
          if (Array.isArray(content)) {
            const threadId = data[0].configuration.defaultThreadId;

            let count = 0;

            content.forEach((value: string) => {
              let node: Node = {
                id: `${type}_#${new Date().getTime() + count}`,
                parentid: parentId,
                isroot: false,
                topic: value,
                type: type,
              };
              data[0].data.push(node);
              count++;
            });

            if (currentCommand.threadId === "") {
              currentCommand.threadId = threadId;

              localStorage.setItem("mindMapData", JSON.stringify(data));

              window.dispatchEvent(new Event("projectChanged"));

              const event = new CustomEvent("threadIdUpdated", {
                detail: { key },
              });
              window.dispatchEvent(event);
            } else {
              localStorage.setItem("mindMapData", JSON.stringify(data));

              window.dispatchEvent(new Event("projectChanged"));

              const event = new CustomEvent("threadIdUpdated", {
                detail: { key },
              });
              window.dispatchEvent(event);
            }
          } else {
            const threadId = data[0].configuration.defaultThreadId;

            let count = 0;

            let node: Node = {
              id: `${type}_#${new Date().getTime() + count}`,
              parentid: parentId,
              isroot: false,
              topic: content,
              type: type,
            };
            data[0].data.push(node);
            count++;

            if (currentCommand.threadId === "") {
              currentCommand.threadId = threadId;

              localStorage.setItem("mindMapData", JSON.stringify(data));

              window.dispatchEvent(new Event("projectChanged"));

              const event = new CustomEvent("threadIdUpdated", {
                detail: { key },
              });
              window.dispatchEvent(event);
            } else {
              localStorage.setItem("mindMapData", JSON.stringify(data));

              window.dispatchEvent(new Event("projectChanged"));

              const event = new CustomEvent("threadIdUpdated", {
                detail: { key },
              });
              window.dispatchEvent(event);
            }
          }
        } else {
          if (Array.isArray(content)) {
            const threadId = data[0].configuration.defaultThreadId;

            data[0].data.forEach((element: any) => {
              if (element.id === node.id) {
                element.topic = content[0];
              }
            });

            if (currentCommand.threadId === "") {
              currentCommand.threadId = threadId;
              localStorage.setItem("mindMapData", JSON.stringify(data));
            } else {
              localStorage.setItem("mindMapData", JSON.stringify(data));
            }

            window.dispatchEvent(new Event("projectChanged"));

            const event = new CustomEvent("threadIdUpdated", {
              detail: { key },
            });
            window.dispatchEvent(event);
          } else {
            throw new Error("Invalid message content");
          }
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          console.log("Request canceled", error.message);
        } else {
          console.log(error);
          if (error.response.status) {
            const errorStatus = error.response.status;
            const event = new CustomEvent("errorOccurs", {
              detail: { errorStatus },
            });
            window.dispatchEvent(event);
          }
        }
      }
    }
  },
}));

export default useMindMapStore;
