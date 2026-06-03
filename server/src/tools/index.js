import {
  readFileTool,
  readFileSchema,
  readFilePresentPrompt,
} from './readFile.js';

import {
  webSearchTool,
  webSearchSchema,
  webSearchPresentPrompt,
} from './webSearch.js';

import {
  editFileTool,
  editFileSchema,
  editFilePresentPrompt,
} from './editFile.js';

import {
  terminalTool,
  terminalSchema,
  terminalPresentPrompt,
} from './terminalTool.js';

import {
  systemTool,
  systemSchema,
  systemPresentPrompt,
} from './systemTool.js';

import {
  twitterTool,
  twitterSchema,
  twitterPresentPrompt,
} from './twitterTool.js';

export const tools = {
  readFile: {
    schema: readFileSchema,
    execute: readFileTool.execute,
    description: readFileTool.description,
    presentPrompt: readFilePresentPrompt,
  },

  webSearch: {
    schema: webSearchSchema,
    execute: webSearchTool.execute,
    description: webSearchTool.description,
    presentPrompt: webSearchPresentPrompt,
  },

  editFile: {
    schema: editFileSchema,
    execute: editFileTool.execute,
    description: editFileTool.description,
    presentPrompt: editFilePresentPrompt,
  },

  terminal: {
    schema: terminalSchema,
    execute: terminalTool.execute,
    description: terminalTool.description,
    presentPrompt: terminalPresentPrompt,
  },

  system: {
    schema: systemSchema,
    execute: systemTool.execute,
    description: systemTool.description,
    presentPrompt: systemPresentPrompt,
  },

  twitter: {
    schema: twitterSchema,
    execute: twitterTool.execute,
    description: twitterTool.description,
    presentPrompt: twitterPresentPrompt,
  },
};