"use client";

import React, { useRef, useState } from "react";
import { Container, Paper, Title, TextInput, Textarea, Group, Button, Stack, Loader, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconUpload } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { getAuth } from "firebase/auth";

export default function FileUploadForm() {
    const router = useRouter();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [biographyText, setBiographyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            message: "Storing your file or text input…",
            autoClose: false,
            withCloseButton: false
        });
        setIsSubmitting(true);

        const formData = new FormData();
        if (selectedFile) formData.append("file", selectedFile);
        if (biographyText.trim()) formData.append("biography", biographyText.trim());

        try {
            // Get Firebase ID token
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");
            const idToken = await user.getIdToken();

            const response = await fetch("http://localhost:5000/upload", {
                method: "POST",
                body: formData,
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
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
                autoClose: 2000,
                withCloseButton: true,
            });

            // Reset Inputs
            setSelectedFile(null);
            setBiographyText("");
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
                        <Title order={3}>Upload Resume or Biography</Title>
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
                            label="Paste your biography text here"
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

                            <Tooltip label="Continue to view all uploaded files">
                                <Button variant="outline" onClick={() => router.push("/home/database")}>
                                    Continue
                                </Button>
                            </Tooltip>
                        </Group>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
