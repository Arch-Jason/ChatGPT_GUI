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
import ReactDOM from "react-dom/client";

const CodeBlock = {
    code({ node, inline, className, children, ...props }) {
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
                <code className={className} {...props}>{children}</code>
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
    const [currentChat, setCurrentChat] = useState(() => {
        const keys = Object.keys(messages);
        return keys.length > 0 ? keys[keys.length - 1] : Date.now().toString();
    });

    useEffect(() => {
        if (apikey) {
            Cookies.set('GPT_API_KEY', apikey, {expires: 365});
        }
    }, [apikey]);

    useEffect(() => {
        if (preURL) {
            Cookies.set('GPT_PRE_URL', preURL, {expires: 365});
        }
    }, [preURL]);

    useEffect(() => {
        if (currentModel) {
            Cookies.set('GPT_CURRENT_MODEL', currentModel, {expires: 365});
        }
    }, [currentModel]);

    useEffect(() => {
        const fetchModels = async () => {
            setModels(await getModels(preURL, apikey));
        };
        fetchModels();
    }, [apikey]);

    useEffect(() => {
        renderChatboxRoot(messages, currentChat);
    }, [messages, currentChat]);

    const renderChatboxRoot = (messages, currentChat) => {
        const chatboxRoot = ReactDOM.createRoot(document.getElementById("chatbox"));
        chatboxRoot.render(
            messages[currentChat]?.map((message, index) => (
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
            ))
        );
    };

    const handleChatChange = (chat) => {
        setCurrentChat(chat);
        if (!messages[chat]) {
            setMessages((prevMessages) => ({
                ...prevMessages,
                [chat]: []
            }));
        }
    };

    const deleteChats = () => {
        localStorage.removeItem('messages');
        setMessages({});
    }

    const sendMessage = async () => {
        if (currentMessage.trim()) {
            const newMessage = { role: "user", content: currentMessage };
            const updatedMessages = { ...messages };

            if (!updatedMessages[currentChat]) {
                updatedMessages[currentChat] = [];
            }

            updatedMessages[currentChat].push(newMessage);
            setMessages(updatedMessages);
            localStorage.setItem('messages', JSON.stringify(updatedMessages));

            setCurrentMessage("");
        }
    };

    useEffect(() => {
        const send = async () => {
            const updatedMessages = { ...messages };
            if (updatedMessages[currentChat]?.length > 0 && updatedMessages[currentChat][updatedMessages[currentChat].length - 1].role === "user") {
                await sendMessageToModel(updatedMessages);
            }
        };
        send();
        const chatbox = document.querySelector('#chatbox');
        if (chatbox) {
            chatbox.scrollTop = chatbox.scrollHeight;
        }
    }, [currentMessage, messages]);

    const sendMessageToModel = async (updatedMessages) => {
        const assistantData = await sendRequest(preURL, currentModel, apikey, updatedMessages[currentChat]);
        console.log(assistantData.choices[0].message.content);
        if (currentModel === "dall-e-2" || currentModel === "dall-e-3") {
            updatedMessages[currentChat].push({ "role": "assistant", "content": `![Generated Image](${assistantData.data[0].url})` });
        } else {
            updatedMessages[currentChat].push({ "role": "assistant", "content": assistantData.choices[0].message.content });
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
                handleSettingChange={deleteChats}
                handleDelete={deleteChats}
            />

            <div className="chatbox" id="chatbox"></div>

            <div className="inputBox">
                <div>
                    <textarea id="input"
                              value={currentMessage}
                              onKeyDown={handleKeyDown}
                              onChange={(event) => {
                                  setCurrentMessage(event.target.value);
                                  const input = event.target;
                                  input.style.height = 'auto';
                                  input.style.height = `calc(${input.scrollHeight}px - 1em)`;
                              }}
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
                        }}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default App;