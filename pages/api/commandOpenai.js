import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const {
    openAIKey,
    defaultAssistantId,
    prompt,
    threadId,
    nodes,
    selectNode,
    general_prompt,
  } = req.body;

  console.log(req.body);

  if (!openAIKey) {
    return res.status(402).json({ error: "OpenAI API key is required" });
  }

  const openai = new OpenAI({ apiKey: openAIKey });

  try {
    await openai.models.list();

    const message = await createThreadMessage(
      openai,
      threadId,
      nodes,
      selectNode,
      prompt,
      general_prompt
    );
    console.log(message.content);

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: defaultAssistantId,
    });

    await checkStatus(openai, threadId, run.id);

    const messages = await openai.beta.threads.messages.list(threadId);
    const messageValue = messages.body.data[0].content[0].text.value;
    const messageContent = JSON.parse(messageValue);

    console.log(messageContent);

    const normalizedResponse = normalizeResponse(messageContent);

    console.log(normalizedResponse);

    res.status(200).json({ message: normalizedResponse });
  } catch (error) {
    handleError(res, error);
  }
}

async function createThreadMessage(
  openai,
  threadId,
  mindmap,
  node,
  generalPrompt,
  general_prompt
) {
  const prompt = generalPrompt
    .replace("${node}", node)
    .replace("${mindmap}", mindmap);

  console.log(prompt);

  return await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: ` ${general_prompt} ${prompt}`,
  });
}

async function checkStatus(openai, threadId, runId) {
  let isComplete = false;
  while (!isComplete) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    if (runStatus.status === "completed") {
      isComplete = true;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
}

function normalizeResponse(messageContent) {
  const keys = Object.keys(messageContent);

  if (keys.length > 1) {
    const content = messageContent[keys[1]];

    return {
      type: messageContent.type,
      content,
    };
  } else {
    const content = messageContent[keys[0]];
    return {
      type: "",
      content,
    };
  }
}

function handleError(res, error) {
  if (error && error.status === 401) {
    res.status(401).json({ error: "Invalid OpenAI API key" });
  } else if (error && error.status) {
    res.status(error.status).json({ error: error.data });
  } else {
    res.status(500).json({ error: "An unexpected error occurred" });
  }
}
