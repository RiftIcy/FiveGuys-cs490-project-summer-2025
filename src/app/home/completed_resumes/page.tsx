"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Stack, Card, Group, Button, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { IconEye, IconDownload, IconBriefcase } from "@tabler/icons-react";
import { useTheme } from "@/context/themeContext";

interface JobApplication {
    _id: string;
    job_title: string;
    company: string;
    created_at: string;
    applied_at: string;
    source_resume_ids: string[];
    source_resume_names: string[];
    job_ad_data: any;
    formatted_pdf_url?: string;
}

export default function JobApplicationsPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get theme-appropriate colors
    const getThemeStyles = () => {
        if (theme === 'night-sky') {
            return {
                primaryColor: 'nightSky',
                accentColor: '#8b5cf6'
            };
        } else {
            return {
                primaryColor: 'blue',
                accentColor: '#228be6'
            };
        }
    };

    const themeStyles = getThemeStyles();

    const getAuthHeaders = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        const idToken = await user.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    };

    useEffect(() => {
        async function fetchJobApplications() {
            try {
                const authHeaders = await getAuthHeaders();
                
                // Fetch all completed resumes (job applications)
                const response = await fetch(
                    'http://localhost:5000/completed_resumes',
                    { headers: authHeaders }
                );
                
                if (!response.ok) throw new Error('Failed to fetch job applications');
                const result = await response.json();
                
                setApplications(result || []);
            } catch (err) {
                console.error('Error fetching job applications:', err);
                setError(err instanceof Error ? err.message : 'Failed to load job applications');
            } finally {
                setLoading(false);
            }
        }

        fetchJobApplications();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text>Loading your job applications...</Text>
                </Stack>
            </Container>
        );
    }

    if (error) {
        return (
            <Container size="lg" py="xl">
                <Text color="red">Error: {error}</Text>
            </Container>
        );
    }

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" align="center" mb="xl">
                <div>
                    <Title order={2} mb="xs">Job Applications</Title>
                    <Text size="sm" color="dimmed">
                        Track your submitted job applications and manage your tailored resumes
                    </Text>
                </div>
                <Badge 
                    size="lg" 
                    variant="light" 
                    color={themeStyles.primaryColor}
                    leftSection={<IconBriefcase size={16} />}
                >
                    {applications.length} Application{applications.length !== 1 ? 's' : ''}
                </Badge>
            </Group>

            {/* JT007: Handle empty applications list */}
            {applications.length === 0 ? (
                <Card shadow="sm" padding="xl" radius="md" withBorder>
                    <Stack align="center" gap="md" py="xl">
                        <IconBriefcase size={64} color="#adb5bd" />
                        <Title order={3} ta="center" c="dimmed">
                            No job applications submitted yet
                        </Title>
                        <Text ta="center" color="dimmed" maw={400}>
                            Start your job search journey by creating tailored resumes for specific positions. 
                            Once you click "Continue" or "Quick Format", it will appear here as a job application.
                        </Text>
                        <Button 
                            variant="light" 
                            color={themeStyles.primaryColor}
                            onClick={() => router.push('/home/job_posting')}
                            mt="md"
                        >
                            Find Job Opportunities
                        </Button>
                    </Stack>
                </Card>
            ) : (
                /* JT001: Display job applications */
                <Stack gap="md">
                    {applications.map((application) => (
                        <Card key={application._id} shadow="sm" padding="lg" radius="md" withBorder>
                            <Group justify="space-between" align="flex-start">
                                <div style={{ flex: 1 }}>
                                    <Group gap="sm" mb="xs">
                                        <Title order={4} style={{ color: themeStyles.accentColor }}>
                                            {application.job_title}
                                        </Title>
                                        <Badge size="sm" variant="light" color="green">
                                            Applied
                                        </Badge>
                                    </Group>
                                    
                                    <Text fw={500} mb="xs">
                                        {application.company}
                                    </Text>
                                    
                                    <Text size="sm" color="dimmed" mb="sm">
                                        Applied: {formatDate(application.applied_at)}
                                    </Text>
                                    
                                    <Text size="sm" color="dimmed">
                                        Resume sources: {application.source_resume_names.join(", ")}
                                    </Text>
                                </div>
                                
                                <Group gap="xs">
                                    <Tooltip label="View formatted resume PDF">
                                        <ActionIcon
                                            variant="light"
                                            color={themeStyles.primaryColor}
                                            size="lg"
                                            onClick={() => router.push(`/home/completed_resumes/${application._id}`)}
                                        >
                                            <IconEye size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                    
                                    <Tooltip label="Download resume PDF">
                                        <ActionIcon
                                            variant="light"
                                            color="green"
                                            size="lg"
                                            onClick={() => {
                                                if (application.formatted_pdf_url) {
                                                    const link = document.createElement('a');
                                                    link.href = application.formatted_pdf_url;
                                                    link.download = `${application.job_title}_${application.company}.pdf`;
                                                    link.click();
                                                }
                                            }}
                                        >
                                            <IconDownload size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Group>
                        </Card>
                    ))}
                </Stack>
            )}
        </Container>
    );
}
