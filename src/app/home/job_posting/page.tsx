"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container, Title, Textarea, Group, Button, Loader, TextInput, Text, Divider, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { getAuth } from "firebase/auth";

export default function JobPostingPage() {
    const searchParams = useSearchParams();
    const resumeId = searchParams.get("resumeId");
    const router = useRouter();

    // Ensure user is authenticated
    const getAuthHeaders = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        const idToken = await user.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    };


    const [jobText, setJobText] = useState("");
    const [jobUrl, setJobUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [inputMethod, setInputMethod] = useState<"text" | "url">("text");

    const handleSubmit = async() => {
        const notifId = notifications.show({loading: true, title: "Submitting…", message: "Your job ad is being processed", autoClose: false, withCloseButton: false});

        setSubmitting(true);

        try {
            const authHeaders = await getAuthHeaders(); // Get auth headers
            
            const formData = new FormData();
            
            if (inputMethod === "url") {
                formData.append("job_ad_url", jobUrl);
            } else {
                formData.append("job_ad", jobText);
            }

            const response = await fetch("http://localhost:5000/upload_job_ad", {
                method: "POST",
                headers: authHeaders,
                body: formData,
            });

            const payload = await response.json();
            if(!response.ok) {
                throw new Error(payload.error || response.statusText)
            }
            // 200
            setJobText("");
            setJobUrl("");
            notifications.update({id: notifId, loading: false, title: "Job Processed", message: payload.message, color: "teal", autoClose: 3000, withCloseButton: true});
        }
        catch(err: any) {
            notifications.update({id: notifId, loading: false, title: "Upload failed", message: err.message, color: "red", autoClose: 4000, withCloseButton: true});
        }
        finally {
            setSubmitting(false);
        }
    }
    
    return(
        <Container size="sm" py="xl">
            <Title order={2} mb="lg">Add Job Posting</Title>

            <Stack gap="md">
                {/* Input method selector */}
                <Group gap="md">
                    <Button 
                        variant={inputMethod === "text" ? "filled" : "light"}
                        onClick={() => setInputMethod("text")}
                        size="sm"
                    >
                        Paste Text
                    </Button>
                    <Button 
                        variant={inputMethod === "url" ? "filled" : "light"}
                        onClick={() => setInputMethod("url")}
                        size="sm"
                    >
                        From URL
                    </Button>
                </Group>

                {inputMethod === "text" ? (
                    <Textarea 
                        label="Job Posting Text" 
                        placeholder="Paste or type the full job ad here…" 
                        autosize 
                        minRows={8} 
                        value={jobText} 
                        onChange={(e) => setJobText(e.currentTarget.value)}
                    />
                ) : (
                    <Stack gap="xs">
                        <TextInput 
                            label="Job Posting URL" 
                            placeholder="https://example.com/job-posting" 
                            value={jobUrl} 
                            onChange={(e) => setJobUrl(e.currentTarget.value)}
                        />
                        <Text size="sm" c="dimmed">
                            Enter a URL to a job posting (LinkedIn, Indeed, company careers page, etc.)
                        </Text>
                    </Stack>
                )}

                <Group justify="space-between" align="center" mt="md">
                    <Button 
                        variant="light"  
                        onClick={handleSubmit} 
                        disabled={
                            (inputMethod === "text" && !jobText.trim()) || 
                            (inputMethod === "url" && !jobUrl.trim()) || 
                            submitting
                        } 
                        loading={submitting}
                    >
                        {inputMethod === "url" ? "Scrape & Parse" : "Submit"}
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/home/job_ads")}>
                        View All Job Ads
                    </Button>
                </Group>
            </Stack>
        </Container>
    )
}
