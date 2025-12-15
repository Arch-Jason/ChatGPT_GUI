// sendRequest.js
export async function sendRequest(
  currentURL,
  model,
  apikey,
  chatMessages,
  onUpdate
) {
  if (!currentURL.startsWith("https://")) {
    currentURL = "https://" + currentURL;
  }

  // 图像模型分支保持不变
  if (model === "dall-e-2" || model === "dall-e-3") {
    const reqURL = currentURL + "/v1/images/generations";
    const payload = JSON.stringify({
      prompt: chatMessages[chatMessages.length - 1].content,
      n: 1,
      model: model,
      size: "1024x1792",
      quality: "hd",
    });
    const response = await fetch(reqURL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apikey}`,
        "Content-Type": "application/json",
      },
      body: payload,
    });
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Request failed: ${response.status} ${errorDetails}`);
    }
    const data = await response.json();
    return data;
  }

  // 聊天模型分支：启用流式输出
  chatMessages = chatMessages.slice(0, -1);
  const reqURL = currentURL + "/v1/chat/completions";
  const payload = JSON.stringify({
    model: model,
    messages: chatMessages,
    stream: true,
  });
  const response = await fetch(reqURL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apikey}`,
      "Content-Type": "application/json",
    },
    body: payload,
  });
  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Request failed: ${response.status} ${errorDetails}`);
  }

  // 处理可读流
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    const chunk = decoder.decode(value, { stream: true });
    // SSE 格式：多行以 \n 分隔，每行形如 "data: {...}"
    chunk
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .forEach((line) => {
        const data = line.replace(/^data:\s*/, "").trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const contentDelta = parsed.choices[0].delta.content || "";
          const reasoningDelta =
            parsed.choices[0].delta.reasoning_content || "";
          console.log(reasoningDelta);
          if (contentDelta || reasoningDelta) {
            onUpdate(reasoningDelta, contentDelta);
          }
        } catch (e) {
          console.warn("无法解析流片段", e);
        }
      });
  }

  return; // 流模式不返回整体内容
}
