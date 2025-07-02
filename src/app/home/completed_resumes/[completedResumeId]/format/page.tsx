"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Stack, Card, Button, Group, Alert, ActionIcon } from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";

interface CompletedResume {
    _id: string;
    job_title: string;
    company: string;
    created_at: string;
    tailored_resume: any;
    source_resume_ids: string[];
    source_resume_names: string[];
    job_ad_data: any;
}

export default function FormatResumePage() {
    const { completedResumeId } = useParams();
    const router = useRouter();
    const [data, setData] = useState<CompletedResume | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormatting, setIsFormatting] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState<string>('Resume.pdf');
    const [formatError, setFormatError] = useState<string | null>(null);

    const getAuthHeaders = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        const idToken = await user.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    };

    useEffect(() => {
        async function fetchCompletedResume() {
            try {
                const authHeaders = await getAuthHeaders();
                
                const response = await fetch(
                    `http://localhost:5000/completed_resumes/${completedResumeId}`, 
                    { headers: authHeaders }
                );
                
                if (!response.ok) throw new Error(response.statusText);
                const result = await response.json();
                setData(result);
                
                // Automatically format the resume after fetching data
                await formatResume(result, authHeaders);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        }
        
        if (completedResumeId) {
            fetchCompletedResume();
        }
    }, [completedResumeId]);

    // Function to format resume (extracted for reuse)
    const formatResume = async (resumeData: CompletedResume, authHeaders?: any) => {
        setIsFormatting(true);
        setFormatError(null);

        try {
            const headers = authHeaders || await getAuthHeaders();
            
            const response = await fetch('http://localhost:5000/format_resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({
                    resume_data: resumeData.tailored_resume,
                    completed_resume_id: completedResumeId,
                    job_title: resumeData.job_title,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to format resume');
            }

            const result = await response.json();
            
            if (result.downloadUrl) {
                setDownloadUrl(result.downloadUrl);
                // Set filename if provided by backend
                if (result.filename) {
                    setFilename(result.filename);
                }
            }
        } catch (error) {
            setFormatError(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setIsFormatting(false);
        }
    };

    // RF002: Trigger POST /format_resume to the server (for re-formatting)
    const handleFormatResume = async () => {
        if (!data) return;
        await formatResume(data);
    };

    if (loading || isFormatting) {
        return (
            <Container>
                <Stack align="center" gap="md" py="xl">
                    <Loader size="lg" />
                    <Text>
                        {loading ? "Loading resume..." : "Formatting your resume..."}
                    </Text>
                </Stack>
            </Container>
        );
    }
    
    if (error || !data) return <Container><Text color="red">Error loading data</Text></Container>;

    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" mb="md">
                <Button 
                    variant="subtle" 
                    onClick={() => router.back()}
                >
                    ← Back to Resume
                </Button>
            </Group>

            <Title order={2} mb="md">
                Format Resume: {data.job_title} at {data.company}
            </Title>
            
            <Text size="sm" color="dimmed" mb="xl">
                Resume for: {data.tailored_resume.first_name} {data.tailored_resume.last_name}
                <br />
                Created: {new Date(data.created_at).toLocaleString()}
            </Text>

            {formatError && (
                <Alert color="red" title="Error" mb="md">
                    {formatError}
                    <Button 
                        size="sm" 
                        variant="outline" 
                        mt="sm"
                        onClick={handleFormatResume}
                    >
                        Try Again
                    </Button>
                </Alert>
            )}

            {downloadUrl && (
                <Card shadow="sm" padding="lg" mb="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Text size="lg" fw={500}>PDF Preview</Text> 
                            <Button 
                                variant="outline"
                                onClick={handleFormatResume}
                                loading={isFormatting}
                            >
                                Regenerate PDF
                            </Button>
                        </Group>
                        
                        {/* PDF Viewer */}
                        <div style={{ 
                            width: '100%', 
                            height: '80vh', 
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            <iframe
                                src={downloadUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                            />
                        </div>
                    </Stack>
                </Card>
            )}
        </Container>
    );
}
