"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Table, ScrollArea, Group, Button, Stack, Collapse, Tooltip, Checkbox, Modal, Card, Progress } from "@mantine/core";
import { IconCheck, IconClock, IconBolt } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { getAuth } from "firebase/auth";
import { resourceLimits } from "worker_threads";

interface JobAd {
    _id: string;
    job_ad_text: string;
    uploaded_at: string;
    parse_result: {
        job_title: string;
        company: string;
        location: string;
        employment_type?: string;
        salary_range?: string;
        required_experience?: string;
        required_education?: string;
        job_description?: string;
        responsibilities?: string[];
        qualifications?: string[];
        benefits?: string[];
    };
}

interface ResumeSummary {
    _id: string;
    name: string;
}

export default function JobAdPage() {
    const { jobAdId } = useParams();
    const router = useRouter();

    const [ad, setAd] = useState<JobAd | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Completed resumes state
    const [resumes, setResumes] = useState<ResumeSummary[]>([]);
    const [resumesLoading, setResumesLoading] = useState(true);
    const [resumesError, setResumesError] = useState<string | null>(null);

    // Checkbox selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal state
    const [modalOpened, setModalOpened] = useState(false);

    // Resume generation tracking state
    const [generationJobId, setGenerationJobId] = useState<string | null>(null);
    const [generationStatus, setGenerationStatus] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState<number>(0);

    // Ensure user is authenticated
    const getAuthHeaders = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        const idToken = await user.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    };

    // Fetch completed resumes
    useEffect(() => {
        if (!jobAdId) return;
        
        async function fetchJobAd() {
            try {
                const authHeaders = await getAuthHeaders(); // Add this
                
                const response = await fetch(`http://localhost:5000/job_ads/${jobAdId}`, {
                    headers: authHeaders, // Add this
                });
                
                if (!response.ok) throw new Error(response.statusText);
                const data = await response.json();
                setAd(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        }
        
        fetchJobAd();
    }, [jobAdId]);

    // Fetch completed resumes with auth
    useEffect(() => {
        async function fetchCompleted() {
            try {
                const authHeaders = await getAuthHeaders(); // Add this
                
                const response = await fetch("http://localhost:5000/resume/resumes?status=complete", {
                    headers: authHeaders, // Add this
                });
                
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                const data = await response.json();
                setResumes(data);
            } catch (error) {
                setResumesError(error instanceof Error ? error.message : String(error));
            } finally {
                setResumesLoading(false);
            }
        }
        fetchCompleted();
    }, []);

    // Polling effect for generation job status
    useEffect(() => {
        if (!generationJobId) return;

        const pollStatus = async () => {
            try {
                const authHeaders = await getAuthHeaders();
                const response = await fetch(`http://localhost:5000/resume_generation_jobs/${generationJobId}`, {
                    headers: authHeaders,
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch job status: ${response.status}`);
                }

                const data = await response.json();
                setGenerationStatus(data.status);
                setGenerationProgress(data.progress || 0);

                if (data.status === "completed") {
                    // Update status to show checkmark
                    setGenerationStatus("completed");
                    setGenerationProgress(100);
                    
                    // CF009: Show checkmark briefly then redirect
                    setTimeout(() => {
                        // Navigate directly without showing notification (the destination page will handle success feedback)
                        router.push(`/home/completed_resumes/${data.completed_resume_id}`);
                        
                        // Clear states after navigation
                        setTimeout(() => {
                            setGenerationJobId(null);
                            setGenerationStatus(null);
                            setGenerationProgress(0);
                        }, 1000);
                    }, 1500); // Show checkmark for 1.5 seconds
                } else if (data.status === "failed") {
                    // CF009: Show error confirmation
                    notifications.show({
                        title: "Generation Failed",
                        message: data.error || "Failed to create tailored resume",
                        color: "red",
                        autoClose: 5000,
                    });
                    setGenerationJobId(null);
                    setGenerationStatus(null);
                    setGenerationProgress(0);
                }
            } catch (error) {
                console.error("Polling error:", error);
                notifications.show({
                    title: "Status Check Failed",
                    message: "Unable to check generation status",
                    color: "orange",
                    autoClose: 3000,
                });
            }
        };

        // Poll immediately, then every 2 seconds
        pollStatus();
        const interval = setInterval(pollStatus, 2000);
        
        return () => clearInterval(interval);
    }, [generationJobId, ad, router]);

    if (loading) {
        return (
            <Container size="sm" py="xl">
                <Loader />
            </Container>
        );
    }
    if (error || !ad) {
        return (
            <Container size="sm" py="xl">
                <Text color="red">Failed to load job ad.</Text>
            </Container>
        );
    }

    return (
        <Container size="lg" py="xl">
            <div style={{ 
                opacity: generationJobId ? 0.6 : 1, 
                transition: 'opacity 0.5s ease-in-out',
                pointerEvents: generationJobId ? 'none' : 'auto'
            }}>
                <Title order={2} mb="md">
                    Job Ad Details
                </Title>
                <ScrollArea>
                    <Table verticalSpacing="sm" withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Title</Table.Th>
                            <Table.Th>Company</Table.Th>
                            <Table.Th>Location</Table.Th>
                            <Table.Th>Uploaded</Table.Th>
                            <Table.Th></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        <React.Fragment key={ad._id}>
                            <Table.Tr>
                                <Table.Td>{ad.parse_result.job_title}</Table.Td>
                                <Table.Td>{ad.parse_result.company}</Table.Td>
                                <Table.Td>{ad.parse_result.location}</Table.Td>
                                <Table.Td>
                                    {new Date(ad.uploaded_at).toLocaleString()}
                                </Table.Td>
                                <Table.Td>
                                    <Group>
                                        <Tooltip
                                            label={expanded ? "Hide job ad" : "View job ad"}
                                        >
                                            <Button
                                                variant="light"
                                                size="xs"
                                                onClick={() => setExpanded((e) => !e)}
                                            >
                                                {expanded ? "Hide" : "Details"}
                                            </Button>
                                        </Tooltip>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td colSpan={5} style={{ padding: 0, border: 0 }}>
                                    <Collapse in={expanded}>
                                        <Stack px="md" py="sm">
                                            <Text>
                                                <strong>Employment Type:</strong>{" "}
                                                {ad.parse_result.employment_type || "N/A"}
                                            </Text>
                                            <Text>
                                                <strong>Salary Range:</strong>{" "}
                                                {ad.parse_result.salary_range || "N/A"}
                                            </Text>
                                            <Text>
                                                <strong>Required Experience:</strong>{" "}
                                                {ad.parse_result.required_experience || "N/A"}
                                            </Text>
                                            <Text>
                                                <strong>Required Education:</strong>{" "}
                                                {ad.parse_result.required_education || "N/A"}
                                            </Text>
                                            {ad.parse_result.job_description && (
                                                <Text>
                                                    <strong>Description:</strong>{" "}
                                                    {ad.parse_result.job_description}
                                                </Text>
                                            )}
                                            {ad.parse_result.responsibilities && (
                                                <div>
                                                    <Text>
                                                        <strong>Responsibilities:</strong>
                                                    </Text>
                                                    <ul>
                                                        {ad.parse_result.responsibilities.map(
                                                            (item, idx) => (
                                                                <li key={idx}>{item}</li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                            {ad.parse_result.qualifications && (
                                                <div>
                                                    <Text>
                                                        <strong>Qualifications:</strong>
                                                    </Text>
                                                    <ul>
                                                        {ad.parse_result.qualifications.map(
                                                            (item, idx) => (
                                                                <li key={idx}>{item}</li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                            {ad.parse_result.benefits && (
                                                <div>
                                                    <Text>
                                                        <strong>Benefits:</strong>
                                                    </Text>
                                                    <ul>
                                                        {ad.parse_result.benefits.map((item, idx) => (
                                                            <li key={idx}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </Stack>
                                    </Collapse>
                                </Table.Td>
                            </Table.Tr>
                        </React.Fragment>
                    </Table.Tbody>
                </Table>
            </ScrollArea>

            <Title order={3} mt="xl" mb="md">
                Select Completed Resume(s) for: {ad.parse_result.job_title}
            </Title>
            {resumesLoading ? (
                <Loader />
            ) : resumesError ? (
                <Text color="red">Error loading resumes: {resumesError}</Text>
            ) : resumes.length === 0 ? (
                <Text>No completed resumes found.</Text>
            ) : (
                <ScrollArea>
                    <Table verticalSpacing="sm" withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Select</Table.Th>
                                <Table.Th>Name</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {resumes.map((resume) => (
                                <Table.Tr key={resume._id}>
                                    <Table.Td>
                                        <Checkbox
                                            aria-label={`Select ${resume.name}`}
                                            checked={selectedIds.has(resume._id)}
                                            onChange={() =>
                                                setSelectedIds((prev) => {
                                                    const copy = new Set(prev);
                                                    copy.has(resume._id)
                                                        ? copy.delete(resume._id)
                                                        : copy.add(resume._id);
                                                    return copy;
                                                })
                                            }
                                        />
                                    </Table.Td>
                                    <Table.Td>{resume.name}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            )}

            <Group mt="md">
                <Button
                    onClick={() => setModalOpened(true)}
                    disabled={selectedIds.size === 0}
                >
                    Continue
                </Button>
            </Group>
            </div>

            {/* CF010: Processing Status Indicator */}
            {generationJobId && (
                <>
                    {/* Backdrop overlay */}
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        zIndex: 999
                    }} />
                    
                    {/* Centered status card */}
                    <div style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 1000,
                        width: "90%",
                        maxWidth: "500px"
                    }}>
                        <Card 
                            shadow="xl" 
                            padding="xl" 
                            withBorder 
                            style={{ 
                                borderColor: generationStatus === "processing" ? "#228be6" : generationStatus === "completed" ? "#51cf66" : "#fab005",
                                backgroundColor: generationStatus === "completed" ? "#f8f9fa" : "#ffffff",
                                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                                borderWidth: "2px"
                            }}
                        >
                    <Group justify="center" align="center">
                        {generationStatus === "pending" && (
                            <div style={{ textAlign: "center" }}>
                                <IconClock size={48} color="#fab005" style={{ marginBottom: "8px" }} />
                                <Text size="lg" fw={500}>Resume Generation Pending...</Text>
                                <Text size="sm" c="dimmed">Initializing process...</Text>
                            </div>
                        )}
                        
                        {generationStatus === "processing" && (
                            <div style={{ textAlign: "center", width: "100%" }}>
                                <IconBolt size={48} color="#228be6" style={{ marginBottom: "8px" }} />
                                <Text size="lg" fw={500} mb="xs">Creating Your Tailored Resume...</Text>
                                <Text size="sm" c="dimmed" mb="md">Progress: {generationProgress}%</Text>
                                <Progress value={generationProgress} size="lg" />
                            </div>
                        )}
                        
                        {generationStatus === "completed" && (
                            <div style={{ textAlign: "center" }}>
                                <IconCheck size={48} color="#51cf66" style={{ marginBottom: "12px" }} />
                                <Text size="lg" fw={500} c="teal">Resume Generated Successfully!</Text>
                                <Text size="sm" c="dimmed">You'll be redirected shortly...</Text>
                            </div>
                        )}
                    </Group>
                </Card>
                </div>
                </>
            )}

            <Modal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                title="Confirm Resume Creation"
            >
                <Stack>
                    <Text>
                        This will create a tailored resume for{" "}
                        <strong>{ad.parse_result.job_title}</strong> using the{" "}
                        {selectedIds.size} form
                        {selectedIds.size > 1 ? "s" : ""} selected.
                    </Text>
                    <Group mt="md">
                        <Button variant="outline" onClick={() => setModalOpened(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                try {
                                    const authHeaders = await getAuthHeaders();
                                    
                                    const response = await fetch(
                                        `http://localhost:5000/job_ads/${jobAdId}/create_tailored_resume`, {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                ...authHeaders,
                                            },
                                            body: JSON.stringify({ 
                                                resume_ids: [...selectedIds] 
                                            }),
                                        }
                                    );

                                    const result = await response.json();

                                    if(!response.ok) {
                                        throw new Error(result.message || response.statusText);
                                    }

                                    setModalOpened(false);

                                    // CF009 & CF010: Start tracking the generation job
                                    setGenerationJobId(result.job_id);
                                    setGenerationStatus("pending");
                                    setGenerationProgress(0);

                                    notifications.show({
                                        title: "Resume Generation Started",
                                        message: "Your tailored resume is being created. You'll be notified when it's ready.",
                                        color: "blue",
                                        autoClose: 4000,
                                        withCloseButton: false,
                                    });
                                } 
                                catch (error) {
                                    notifications.show({
                                        title: "Error",
                                        message: error instanceof Error ? error.message : "Failed to start resume generation",
                                        color: "red",
                                        autoClose: 5000,
                                    });
                                }
                            }}
                            disabled={generationJobId !== null}
                            loading={generationJobId !== null}
                        >
                            Confirm
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}