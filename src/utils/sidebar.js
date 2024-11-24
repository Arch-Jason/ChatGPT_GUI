import React from 'react';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { SettingsPop } from "./settings";
import { SelectModel } from "./selectModel";

const moment = require("moment")

export function Sidebar({ setCurrentModel, currentModel, models, currentURL, currentAPI, onSave, messages, chatChange, handleDelete }) {
    let expand = false;
    return (
        <>
            <Navbar key={expand} expand={expand} className="bg-body-tertiary mb-3">
                <Container fluid>
                    <Navbar.Toggle aria-controls={`offcanvasNavbar-expand-${expand}`} />
                    <Navbar.Brand href="#">ChatGPT UI by Kim</Navbar.Brand>
                    <SelectModel
                        setCurrentModel={setCurrentModel}
                        models={models}
                        currentModel={currentModel}
                    />
                    <Navbar.Offcanvas
                        id={`offcanvasNavbar-expand-${expand}`}
                        aria-labelledby={`offcanvasNavbarLabel-expand-${expand}`}
                        placement="start"
                    >
                        <Offcanvas.Header closeButton>
                            <Offcanvas.Title id={`offcanvasNavbarLabel-expand-${expand}`}>
                                History
                            </Offcanvas.Title>
                        </Offcanvas.Header>
                        <button
                            id={"newChat"}
                            onClick={() => {
                                let time = Date.now().toString();
                                chatChange(time);
                            }}
                        >
                            New
                        </button>

                        <button
                            id={"newChat"}
                            onClick={handleDelete}
                        >
                            Delete All Chats
                        </button>
                        {
                            Object.keys(messages).map((time) => {
                                const firstMessage = messages[time][0]?.content || "Empty Chat";
                                return (
                                    <button
                                        id={time}
                                        key={time}
                                        onClick={() => chatChange(time)}
                                    >
                                        <div>{firstMessage.slice(0, 10)}</div>
                                        <div>{moment(Number(time)).format("MM-DD HH:mm")}</div>
                                    </button>
                                );
                            })
                        }

                        <div id="bottomButtons">
                            <div id="Buttons">
                                <SettingsPop
                                    currentURL={currentURL}
                                    currentAPI={currentAPI}
                                    onSave={onSave}
                                />
                                <SelectModel
                                    setCurrentModel={setCurrentModel}
                                    models={models}
                                    currentModel={currentModel}
                                />
                            </div>
                        </div>
                    </Navbar.Offcanvas>
                </Container>
            </Navbar>
        </>
    );
}