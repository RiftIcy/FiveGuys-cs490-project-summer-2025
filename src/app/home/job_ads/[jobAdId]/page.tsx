"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Table, ScrollArea, Group, Button, Stack, Collapse, Tooltip, Checkbox, Modal } from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { getAuth } from "firebase/auth";

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
                                // TODO: call your API to create the resume
                                // e.g.
                                // await fetch(
                                //   `/job_ads/${jobAdId}/create`,
                                //   {
                                //     method: "POST",
                                //     headers: { "Content-Type": "application/json" },
                                //     body: JSON.stringify({ resumes: [...selectedIds] }),
                                //   }
                                // );
                                setModalOpened(false);
                                router.push("/resumes/created");
                            }}
                        >
                            Confirm
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}