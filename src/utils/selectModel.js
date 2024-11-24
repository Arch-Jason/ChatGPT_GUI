import Dropdown from "react-bootstrap/Dropdown";
import React from "react";

export function SelectModel({ setCurrentModel, currentModel, models }) {
    return (
        <div className="input-dropdown-container">
            <Dropdown onSelect={(eventKey) => {
                setCurrentModel(eventKey);
            }}>
                <Dropdown.Toggle
                    variant="primary"
                >
                    {currentModel}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    {models.length > 0 ? (
                        models.map((model, index) => (
                            <Dropdown.Item key={index} eventKey={model}>{model}</Dropdown.Item>
                        ))
                    ) : (
                        <Dropdown.Item disabled>No models available</Dropdown.Item>
                    )}
                </Dropdown.Menu>
            </Dropdown>
        </div>
    )
}