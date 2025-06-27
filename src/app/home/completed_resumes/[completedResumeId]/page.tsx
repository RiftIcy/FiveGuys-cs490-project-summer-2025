"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Stack, Card, Code } from "@mantine/core";
import { useParams } from "next/navigation";
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

export default function CompletedResumePage() {
    const { completedResumeId } = useParams();
    const [data, setData] = useState<CompletedResume | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    if (loading) return <Container><Loader /></Container>;
    if (error || !data) return <Container><Text color="red">Error loading data</Text></Container>;

    return (
        <Container size="lg" py="xl">
            <Title order={2} mb="md">
                Tailored Resume for: {data.job_title} at {data.company}
            </Title>
            
            <Text size="sm" color="dimmed" mb="xl">
                Created: {new Date(data.created_at).toLocaleString()}
                <br />
                Combined from {data.source_resume_names.length} source resume(s): {data.source_resume_names.join(", ")}
            </Text>

            <Card shadow="sm" padding="lg" mb="md">
                <Title order={4} mb="md">
                    Combined & Tailored Resume
                </Title>
                
                <Stack>
                    <div>
                        <Text>Name:</Text>
                        <Text>{data.tailored_resume.first_name} {data.tailored_resume.last_name}</Text>
                    </div>
                    
                    <div>
                        <Text>Contact Information:</Text>
                        <Code block>
                            {JSON.stringify(data.tailored_resume.contact, null, 2)}
                        </Code>
                    </div>
                    
                    <div>
                        <Text>Career Objective:</Text>
                        <Text>{data.tailored_resume.career_objective}</Text>
                    </div>
                    
                    <div>
                        <Text>Skills:</Text>
                        <Code block>
                            {JSON.stringify(data.tailored_resume.skills, null, 2)}
                        </Code>
                    </div>
                    
                    <div>
                        <Text>Experience:</Text>
                        <Code block>
                            {JSON.stringify(data.tailored_resume.jobs, null, 2)}
                        </Code>
                    </div>
                    
                    <div>
                        <Text>Education:</Text>
                        <Code block>
                            {JSON.stringify(data.tailored_resume.education, null, 2)}
                        </Code>
                    </div>
                </Stack>
            </Card>
        </Container>
);
}