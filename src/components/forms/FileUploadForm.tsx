"use client";

import React, { useRef, useState } from "react";
import { Container, Paper, Title, TextInput, Textarea, Group, Button, Stack, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconUpload } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export default function FileUploadForm() {
    const router = useRouter();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [resumeName, setResumeName] = useState("");
    const [biographyText, setBiographyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessageID, setFeedbackMessageID] = useState("");
    const [isError, setIsError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0])
            setBiographyText("");
            notifications.clean();
        }
    };

    const handleChooseFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If no name for resume
        if (!resumeName.trim()) {
            return notifications.show({
                title: "Name required",
                message: "Please enter a name for your resume.",
                color: "red",
            });
        }
        // If there is no input
        if (!selectedFile && !biographyText.trim()) {
            return notifications.show({
                title: "No data",
                message: "Upload a file or enter text before submitting.",
                color: "red",
            });
        }
        // Submit the information to db
        const notifId = notifications.show({
            loading: true,
            title: "Uploading…",
            message: "Uploading resume and sending to LLM, please wait…",
            autoClose: false,
            withCloseButton: false
        });
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("name", resumeName.trim());
        if (selectedFile) formData.append("file", selectedFile);
        if (biographyText.trim()) formData.append("biography", biographyText.trim());

        try {
            const response = await fetch("http://localhost:5000/upload", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Upload failed");
            }
            notifications.update({
                id: notifId,
                loading: false,
                title: "Success",
                message: data.message,
                color: "teal",
                icon: <IconCheck size={18} />,
                autoClose: 1000,
                onClose: () => {
                    router.push(`/home/resume_editor/${data.id}`);
                },
            });
        }
        catch(error: any) {
            notifications.update({
                id: notifId,
                loading: false,
                title: "Error",
                message: error.message,
                color: "red",
                icon: <IconX size={18} />,
                autoClose: 4000,
            });
        }
        finally {
            setIsSubmitting(false);
        }

    }

    return (
        <Container size="sm" py="xl">
            <Paper shadow="sm" p="lg" radius="md">
                <form onSubmit={handleSubmit}>
                    <Stack>
                        <Title order={3}>New Resume</Title>

                        <TextInput
                            label="Resume Name"
                            placeholder="e.g. Senior Backend Engineer CV"
                            withAsterisk
                            value={resumeName}
                            onChange={(e) => setResumeName(e.currentTarget.value)}
                        />
                        <Group align="center">
                            <TextInput
                                readOnly
                                value={selectedFile?.name || "No file selected"}
                                style={{ flex: 1 }}
                            />
                            <Button variant="outline" onClick={handleChooseFileClick} >
                                Select File
                            </Button>
                            <input type="file" accept=".pdf,.docx,.txt,.md,.odt" hidden ref={fileInputRef} onChange={handleFileChange}/>
                        </Group>

                        <Textarea
                            label="Or paste your biography text"
                            minRows={5}
                            value={biographyText}
                            onChange={(e) => {
                                setBiographyText(e.currentTarget.value);
                                setSelectedFile(null);
                            }}
                        />

                        <Group mt="md">
                            <Button type="submit" leftSection={isSubmitting ? <Loader size="xs" /> : <IconUpload size={18} />} loading={isSubmitting} disabled={isSubmitting}>
                            Upload
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
