export interface Node {
  id: string;
  parentid?: string;
  isroot?: boolean;
  topic: string;
  type: string;
}



export interface Commands {
  commandName: string;
  assistantId: string;
  threadId: string;
  commands: string;
  select: string;
  idea: number[];
  content: number[];
  context: number[];
  commandKey: string;
}

export interface ReturnCommand {
  commandName: string;
  assistantId: string;
  threadId: string;
  commands: string;
  select: string;
  idea: number[];
  context: number[];
  content: number[];
  commandKey: string;
}

export interface configuration {
  openAIKey: string;
  defaultAssistantId: string;
  defaultThreadId: string;
  commands: Commands[];
}

export interface mindMap {
  meta: {
    name: string;
    version: string;
  };
  format: string;
  projectName: string;
  RequestInstruction: string;
  data: Node[];
  configuration: configuration;
}

export interface data {
  id: string;
  isroot: boolean;
  parentId: string;
  topic: string;
}

export interface ImportedDataState {
  data: data[];
  format: string;
  projectName: string;
  meta: meta;
}

export interface meta {
  name: string;
  author: string;
  version: string;
}
