"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Stack, Card, List, Group, Divider, Button, Tooltip } from "@mantine/core";
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

export default function CompletedResumePage() {
    const { completedResumeId } = useParams();
    const router = useRouter();
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
                <Group justify="space-between" align="flex-start" mb="lg">
                    <Title order={3} ta="center" style={{ flex: 1 }}>
                        {data.tailored_resume.first_name} {data.tailored_resume.last_name}
                    </Title>
                    <Tooltip label="Generate a professional PDF version of this resume" position="bottom">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/home/completed_resumes/${completedResumeId}/format`)}
                        >
                            Format
                        </Button>
                    </Tooltip>
                </Group>
                
                <Stack gap="lg">
                    {/* Contact Information */}
                    <div>
                        <Title order={4} mb="sm">Contact Information</Title>
                        <Stack gap="xs">
                            {data.tailored_resume.contact && typeof data.tailored_resume.contact === 'object' ? (
                                Object.entries(data.tailored_resume.contact).map(([key, value]) => (
                                    <Group key={key} gap="sm">
                                        <Text fw={500} tt="capitalize">{key.replace('_', ' ')}:</Text>
                                        <Text>{String(value)}</Text>
                                    </Group>
                                ))
                            ) : (
                                <Text>{String(data.tailored_resume.contact)}</Text>
                            )}
                        </Stack>
                    </div>
                    
                    <Divider />
                    
                    {/* Career Objective */}
                    {data.tailored_resume.career_objective && (
                        <div>
                            <Title order={4} mb="sm">Career Objective</Title>
                            <Text>{data.tailored_resume.career_objective}</Text>
                        </div>
                    )}
                    
                    <Divider />
                    
                    {/* Skills */}
                    {data.tailored_resume.skills && (
                        <div>
                            <Title order={4} mb="sm">Skills</Title>
                            {Array.isArray(data.tailored_resume.skills) ? (
                                <Text>{data.tailored_resume.skills.join(" • ")}</Text>
                            ) : typeof data.tailored_resume.skills === 'object' ? (
                                <Stack gap="xs">
                                    {Object.entries(data.tailored_resume.skills).map(([category, skills]) => (
                                        <div key={category}>
                                            <Text fw={500} tt="capitalize">{category.replace('_', ' ')}:</Text>
                                            <Text ml="md">
                                                {Array.isArray(skills) ? skills.join(", ") : String(skills)}
                                            </Text>
                                        </div>
                                    ))}
                                </Stack>
                            ) : (
                                <Text>{String(data.tailored_resume.skills)}</Text>
                            )}
                        </div>
                    )}
                    
                    <Divider />
                    
                    {/* Experience */}
                    {data.tailored_resume.jobs && Array.isArray(data.tailored_resume.jobs) && data.tailored_resume.jobs.length > 0 && (
                        <div>
                            <Title order={4} mb="sm">Professional Experience</Title>
                            <Stack gap="md">
                                {data.tailored_resume.jobs.map((job: any, index: number) => (
                                    <Card key={index} p="md" withBorder>
                                        <Stack gap="sm">
                                            {/* Title */}
                                            {(job.title || job.position) && (
                                                <Text fw={500}>{job.title || job.position}</Text>
                                            )}
                                            
                                            {/* Company */}
                                            {job.company && (
                                                <Text fw={500}>{job.company}</Text>
                                            )}
                                            
                                            {/* Location */}
                                            {job.location && (
                                                <Text size="sm">{job.location}</Text>
                                            )}
                                            
                                            {/* Start Date/End Date */}
                                            {(job.start_date || job.end_date) && (
                                                <Text size="sm">
                                                    {job.start_date} - {job.end_date || 'Present'}
                                                </Text>
                                            )}
                                            
                                            {/* Role Summary */}
                                            {(job.role_summary || job.summary || job.description) && (
                                                <div>
                                                    <Text fw={500} mb="xs">Role Summary:</Text>
                                                    <Text>{job.role_summary || job.summary || job.description}</Text>
                                                </div>
                                            )}
                                            
                                            {/* Responsibilities/Accomplishments */}
                                            {(job.responsibilities || job.accomplishments) && (
                                                <div>
                                                    <Text fw={500} mb="xs">
                                                        {job.responsibilities ? 'Responsibilities:' : 'Accomplishments:'}
                                                    </Text>
                                                    {Array.isArray(job.responsibilities || job.accomplishments) ? (
                                                        <List size="sm">
                                                            {(job.responsibilities || job.accomplishments).map((item: string, i: number) => (
                                                                <List.Item key={i}>{item}</List.Item>
                                                            ))}
                                                        </List>
                                                    ) : (
                                                        <Text>{String(job.responsibilities || job.accomplishments)}</Text>
                                                    )}
                                                </div>
                                            )}
                                        </Stack>
                                    </Card>
                                ))}
                            </Stack>
                        </div>
                    )}
                    
                    <Divider />
                    
                    {/* Education */}
                    {data.tailored_resume.education && Array.isArray(data.tailored_resume.education) && data.tailored_resume.education.length > 0 && (
                        <div>
                            <Title order={4} mb="sm">Education</Title>
                            <Stack gap="md">
                                {data.tailored_resume.education.map((edu: any, index: number) => (
                                    <Card key={index} p="md" withBorder>
                                        <Stack gap="sm">
                                            {/* Institution */}
                                            {(edu.institution || edu.school) && (
                                                <Text fw={500}>{edu.institution || edu.school}</Text>
                                            )}
                                            
                                            {/* Degree */}
                                            {edu.degree && (
                                                <Text fw={500}>{edu.degree}</Text>
                                            )}
                                            
                                            {/* Start Date/End Date */}
                                            {(edu.start_date || edu.end_date || edu.graduation_date) && (
                                                <Text size="sm">
                                                    {edu.start_date} - {edu.end_date || edu.graduation_date || 'Present'}
                                                </Text>
                                            )}
                                            
                                            {/* GPA */}
                                            {(edu.gpa || edu.GPA) && (
                                                <Text size="sm">GPA: {edu.gpa || edu.GPA}</Text>
                                            )}
                                        </Stack>
                                    </Card>
                                ))}
                            </Stack>
                        </div>
                    )}
                </Stack>
            </Card>
        </Container>
    );
}