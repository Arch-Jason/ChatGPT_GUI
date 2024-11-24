import './App.css';
import React, { useEffect, useState } from "react";
import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import 'bootstrap/dist/css/bootstrap.css';
import { getModels } from "./utils/getModels";
import { sendRequest } from "./utils/sendRequest";
import { Sidebar } from "./utils/sidebar";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import CopyToClipboard from 'react-copy-to-clipboard';
import copy from 'copy-to-clipboard';
import Cookies from "js-cookie";

const CodeBlock = {
    code({node, inline, className, children, ...props}) {
        const match = /language-(\w+)/.exec(className || '');
        const text = String(children).replace(/\n$/, '');

        const handleCopy = () => {
            copy(text);
        }

        return !inline && match
            ? (
                <div>
                    <CopyToClipboard text={text} onCopy={handleCopy}>
                        <button>Copy</button>
                    </CopyToClipboard>
                    <SyntaxHighlighter style={solarizedlight} language={match[1]} PreTag="div" children={text} {...props} />
                </div>
            )
            : (
                <code className={className} {...props}>{children}</code> // 确保 children 在这里被渲染
            )
    }
}

function App() {
    const [apikey, setApikey] = useState(Cookies.get('GPT_API_KEY') || "");
    const [preURL, setPreURL] = useState(Cookies.get('GPT_PRE_URL') || "");
    const [models, setModels] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [currentModel, setCurrentModel] = useState(Cookies.get('GPT_CURRENT_MODEL') || "gpt-3.5-turbo");
    const [messages, setMessages] = useState(() => {
        let storedMessages = localStorage.getItem('messages');
        return storedMessages ? JSON.parse(storedMessages) : {};
    });

    useEffect(() => {
        if (apikey) {
            Cookies.set('GPT_API_KEY', apikey);
        }
    }, [apikey]);

    useEffect(() => {
        if (preURL) {
            Cookies.set('GPT_PRE_URL', preURL);
        }
    }, [preURL]);

    useEffect(() => {
        if (currentModel) {
            Cookies.set('GPT_CURRENT_MODEL', currentModel);
        }
    }, [currentModel]);

    const getCurrentChat = () => {
        const keys = Object.keys(messages);
        if (keys.length > 0) {
            return keys[keys.length - 1]; // Get the last timestamp key
        } else {
            return Date.now().toString();
        }
    };

    const currentChat = getCurrentChat();

    const sendMessage = async () => {
        setCurrentMessage(processMessages(currentMessage));
        if (currentMessage.trim()) {
            const newMessage = { "role": "user", "content": currentMessage };
            const updatedMessages = { ...messages };

            if (!updatedMessages[currentChat]) {
                updatedMessages[currentChat] = [];
            }

            updatedMessages[currentChat].push(newMessage);
            setMessages(updatedMessages); // Save the updated messages to state and localStorage
            localStorage.setItem('messages', JSON.stringify(updatedMessages)); // Save to localStorage

            setCurrentMessage(""); // Clear the message input
        }
    };

    useEffect(() => {
        const send = async () => {
            const updatedMessages = { ...messages };
            if (updatedMessages[currentChat]?.length > 0 && updatedMessages[currentChat][updatedMessages[currentChat].length - 1].role === "user") {
                await sendMessageToModel(updatedMessages);
                setTimeout(()=> {}, 1000);
            }
        };
        send();

        const chatbox = document.querySelector('#chatbox');
        if (chatbox) {
            chatbox.scrollTop = chatbox.scrollHeight;
        }
    }, [currentMessage, messages]); // Triggers when currentMessage or messages change

    useEffect(() => {
        const fetchModels = async () => {
            setModels(await getModels(preURL, apikey));
        };
        fetchModels();
    }, [apikey]);

    const sendMessageToModel = async (updatedMessages) => {
        const assistantData = await sendRequest(preURL, currentModel, apikey, updatedMessages[currentChat]);

        // Log the assistant's response
        console.log("Assistant Response:", assistantData.choices[0].message.content);
        // Check if the message contains an image (for DALL-E or other image models)
        if (currentModel === "dall-e-2" || currentModel === "dall-e-3") {
            updatedMessages[currentChat].push({ "role": "assistant", "content": `![Generated Image](${assistantData.data[0].url})` });
        } else {
            const processedMessages = processMessages(assistantData.choices[0].message.content);
            updatedMessages[currentChat].push({ "role": "assistant", "content": processedMessages });
        }

        setMessages(updatedMessages);
        localStorage.setItem('messages', JSON.stringify(updatedMessages));
    };


    const handleKeyDown = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            sendMessage();
        }
    };

    const handleSettingChange = (preURL, apikey) => {
        setApikey(apikey);
        setPreURL(preURL);
    };

    const handleChatChange = (chat) => {
        // Update currentChat dynamically
    };

    const processMessages = (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\\\(/g, "$")   // 将 \(...\) 转换为 $...$
            .replace(/\\\)/g, "$")   // 同理
            .replace(/\\\[/g, "$$")  // 将 \[...\] 转换为 $$...$$
            .replace(/\\\]/g, "$$"); // 同理
    };

    return (
        <div className="App">
            <Sidebar
                setCurrentModel={setCurrentModel}
                currentModel={currentModel}
                models={models}
                currentURL={preURL}
                currentAPI={apikey}
                onSave={handleSettingChange}
                messages={messages}
                chatChange={handleChatChange}
            />

            <div className="chatbox" id="chatbox">
                {messages[currentChat]?.map((message, index) => (
                    <div className="message" id={message.role} key={`${message.role}-${index}`}>
                        <Markdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                code: CodeBlock.code,
                                math: ({ value }) => (
                                    <div className="katex-block">
                                        <BlockMath>{value}</BlockMath>
                                    </div>
                                ),
                                inlineMath: ({ value }) => (
                                    <span className="katex-inline">
                                      <InlineMath>{value}</InlineMath>
                                    </span>
                                )
                            }}
                        >
                            {message.content}
                        </Markdown>
                    </div>
                ))}
            </div>

            <div className="inputBox">
                <div>
                    <textarea id={"input"}
                              value={currentMessage}
                              onKeyDown={handleKeyDown}
                              onChange={(event) => {
                                      setCurrentMessage(event.target.value);
                                      const input = event.target;
                                      input.style.height = 'auto';
                                      input.style.height = `calc(${input.scrollHeight}px - 1em)`;
                                    }
                                }
                              onInput={(event) => {
                                  const input = event.target;
                                  input.style.height = 'auto';
                                  input.style.height = `calc(${input.scrollHeight}px - 1em)`;
                                  let chatbox = document.querySelector("#chatbox");
                                  chatbox.style.height = `calc(90vh - ${input.scrollHeight}px)`;
                                  chatbox.style.paddingBottom = `calc(${input.scrollHeight}px - 6vh)`;
                              }} />
                    <button
                        onClick={() => {
                            sendMessage();
                            const input = document.getElementById("input");
                            input.style.height = `calc(${input.scrollHeight}px - 1em)`;
                        }}
                    >Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
