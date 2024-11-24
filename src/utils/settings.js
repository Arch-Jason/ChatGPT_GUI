import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

export function SettingsPop({ currentURL, currentAPI, onSave }) {
    const [show, setShow] = useState(false);
    const [localApiKey, setLocalApiKey] = useState(currentAPI);
    const [localSuffix, setLocalSuffix] = useState(currentURL);

    const handleClose = () => setShow(false);
    const handleShow = () => {
        setLocalApiKey(currentAPI);
        setLocalSuffix(currentURL);
        setShow(true);
    };

    const handleSave = () => {
        if (onSave) {
            onSave(localSuffix, localApiKey);
        }
        handleClose();
    };

    return (
        <>
            <Button variant="primary" onClick={handleShow}>
                Settings
            </Button>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="PreURL">
                            <Form.Label column={"lg"}>API Prefix URL</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="API Prefix URL"
                                value={localSuffix}
                                onChange={(e) => setLocalSuffix(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group controlId="apikey">
                            <Form.Label column={"lg"}>API Key</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="API Key sk-xxx"
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
