"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container, Title, Textarea, Group, Button, Loader } from "@mantine/core";
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
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async() => {
        const notifId = notifications.show({loading: true, title: "Submitting…", message: "Your job ad is being uploaded", autoClose: false, withCloseButton: false});

        setSubmitting(true);

        try {
            const authHeaders = await getAuthHeaders(); // Get auth headers
            
            const formData = new FormData();
            formData.append("job_ad", jobText);

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
            notifications.update({id: notifId, loading: false, title: "Job Uploaded", message: payload.message, color: "teal", autoClose: 3000, withCloseButton: true});
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
            <Title order={2} mb="lg">Paste or Type Your Job Posting</Title>

            <Textarea label="Job Posting" placeholder="Paste or type the full job ad here…" autosize minRows={8} value={jobText} onChange={(e) => setJobText(e.currentTarget.value)}/>

            <Group justify="space-between" align="center" mt="md">
                <Button variant="light"  onClick={handleSubmit} disabled={!jobText.trim() || submitting} loading={submitting}>
                    Submit
                </Button>
                <Button variant="outline" onClick={() => router.push("/home/job_ads")}>View All Job Ads</Button>
            </Group>
        </Container>
    )
}
