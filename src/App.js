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
                    <SyntaxHighlighter style={solarizedlight} language={match[1]} PreTag="div" {...props}>
                        {text}
                    </SyntaxHighlighter>
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
        const stored = localStorage.getItem('messages');
        return stored ? JSON.parse(stored) : {};
    });
    const [currentChat, setCurrentChat] = useState(() => {
        const keys = Object.keys(messages);
        return keys.length > 0 ? keys[keys.length - 1] : Date.now().toString();
    });

    useEffect(() => {
        if (apikey) Cookies.set('GPT_API_KEY', apikey, { expires: 365 });
    }, [apikey]);

    useEffect(() => {
        if (preURL) Cookies.set('GPT_PRE_URL', preURL, { expires: 365 });
    }, [preURL]);

    useEffect(() => {
        if (currentModel) Cookies.set('GPT_CURRENT_MODEL', currentModel, { expires: 365 });
    }, [currentModel]);

    useEffect(() => {
        (async () => {
            const ms = await getModels(preURL, apikey);
            setModels(ms);
        })();
    }, [preURL, apikey]);

    useEffect(() => {
        renderChatboxRoot(messages, currentChat);
    }, [messages, currentChat]);

    const renderChatboxRoot = (msgs, chat) => {
        const root = ReactDOM.createRoot(document.getElementById("chatbox"));
        root.render(
            msgs[chat]?.map((message, idx) => (
                <div className="message" id={message.role} key={`${message.role}-${idx}`}>          
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
                        {message.content
                            .replace(/\\\(/g, "$" )
                            .replace(/\\\)/g, "$" )
                            .replace(/\\\[/g, "$$" )
                            .replace(/\\\]/g, "$$" )}
                    </Markdown>
                </div>
            ))
        );
    };

    const handleChatChange = (chat) => {
        setCurrentChat(chat);
        if (!messages[chat]) {
            setMessages(prev => ({ ...prev, [chat]: [] }));
        }
    };

    const deleteChats = () => {
        localStorage.removeItem('messages');
        setMessages({});
    };

    const sendMessage = () => {
        if (!currentMessage.trim()) return;
        const newMsg = { role: "user", content: currentMessage };
        const updated = { ...messages };
        if (!updated[currentChat]) updated[currentChat] = [];
        updated[currentChat].push(newMsg);
        setMessages(updated);
        localStorage.setItem('messages', JSON.stringify(updated));
        setCurrentMessage("");
    };

    useEffect(() => {
        const send = async () => {
            const chatMsgs = messages[currentChat];
            if (chatMsgs?.length && chatMsgs[chatMsgs.length - 1].role === "user") {
                await sendMessageToModel({ ...messages });
            }
        };
        send();
        const box = document.querySelector('#chatbox');
        if (box) box.scrollTop = box.scrollHeight;
        const input = document.getElementById('input');
        if (input) input.style.height = '';
    }, [messages, currentChat]);

    const sendMessageToModel = async (updatedMessages) => {
        const chatMsgs = updatedMessages[currentChat];
        // 图像生成模型
        if (currentModel === "dall-e-2" || currentModel === "dall-e-3") {
            const assistantData = await sendRequest(preURL, currentModel, apikey, chatMsgs);
            updatedMessages[currentChat].push({
                role: "assistant",
                content: `![Generated Image](${assistantData.data[0].url})`
            });
            setMessages({ ...updatedMessages });
            localStorage.setItem('messages', JSON.stringify(updatedMessages));
        } else {
            // 流式聊天模型
            updatedMessages[currentChat].push({ role: "assistant", content: "" });
            setMessages({ ...updatedMessages });
            localStorage.setItem('messages', JSON.stringify(updatedMessages));

            await sendRequest(preURL, currentModel, apikey, chatMsgs, (delta) => {
                const msgs = { ...updatedMessages };
                const i = msgs[currentChat].length - 1;
                msgs[currentChat][i].content += delta;
                setMessages(msgs);
                localStorage.setItem('messages', JSON.stringify(msgs));
            });
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            sendMessage();
        }
    };

    const handleSettingChange = (url, key) => {
        setPreURL(url);
        setApikey(key);
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
                    <textarea
                        id="input"
                        value={currentMessage}
                        onKeyDown={handleKeyDown}
                        onChange={(ev) => {
                            setCurrentMessage(ev.target.value);
                            ev.target.style.height = 'auto';
                            ev.target.style.height = `calc(${ev.target.scrollHeight}px - 1em)`;
                        }}
                        onInput={(ev) => {
                            const input = ev.target;
                            input.style.height = 'auto';
                            input.style.height = `calc(${input.scrollHeight}px - 1em)`;
                            const chatbox = document.querySelector("#chatbox");
                            chatbox.style.height = "";
                            chatbox.style.paddingBottom = "";
                        }}
                    />
                    <button onClick={() => { sendMessage(); }}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;