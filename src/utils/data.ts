import { message } from "antd";
import { ImportedDataState, mindMap } from "./type";

export const ideas = ["Brother", "Parent"];
export const defaultIdeasCheckedList = ["Brother", "Parent"];
export const context = ["Brother", "Parent"];
export const defaultContextCheckedList = ["Brother", "Parent"];
export const content = ["Brother", "Parent"];
export const defaultContentCheckedList = ["Brother", "Parent"];

export const loadFromJSON = async (): Promise<ImportedDataState> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(data as ImportedDataState);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  });
};

export const loadFromMM = async (): Promise<File> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mm";

    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      resolve(file);
    };

    input.click();
  });
};


// interface MindMap {
//   projectName: string;
//   // Add other properties of MindMap if needed
// }

export const restoreData = (dataState: ImportedDataState): boolean => {
  const storageData = localStorage.getItem("mindMapData");

  if (storageData) {
    const mindData: ImportedDataState[] = JSON.parse(storageData);

    let projectName = dataState.projectName;

    // First, check if the exact name "default project" exists
    const exactProjectExists = mindData.some(
      (project: ImportedDataState) => project.projectName === projectName
    );

    if (exactProjectExists) {
      // If "default project" exists, only then we need to find the next available number
      const existingProjects = mindData.filter((item: ImportedDataState) =>
        item.projectName.startsWith(projectName)
      );

      // Collect suffixes for all matching projects (e.g., default project1, default project2, etc.)
      const suffixes = existingProjects.map((project: ImportedDataState) => {
        const match = project.projectName.match(new RegExp(`^${projectName} (\\d+)$`));
        if (match) {
          return parseInt(match[1], 10);
        }
        return null;
      }).filter(suffix => suffix !== null) as number[]; // Remove non-numeric matches

      // Sort suffixes to identify gaps
      suffixes.sort((a, b) => a - b);

      let newSuffix = 1; // Start from 1, as we are looking for 'default project 1', 'default project 2', etc.

      for (let i = 0; i < suffixes.length; i++) {
        if (suffixes[i] === newSuffix) {
          newSuffix++;
        } else {
          break; // Found a gap, stop here
        }
      }

      // Set the new project name to 'default project ' + newSuffix (e.g., 'default project 1', 'default project 2')
      projectName = projectName + " " + newSuffix;
    }

    // Assign the final project name to dataState and save to localStorage
    dataState.projectName = projectName;
    mindData.unshift(dataState); // Insert the new project at the start
    localStorage.setItem("mindMapData", JSON.stringify(mindData));
    window.dispatchEvent(new Event("projectChanged"));

    return true;
  }

  return false;
};
