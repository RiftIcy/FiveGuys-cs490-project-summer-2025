"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Table, ScrollArea, Group, Button, Stack, Collapse, Modal, Tooltip, Badge } from "@mantine/core";
import { IconCheck, IconClock, IconBolt } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
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

export default function JobAdsPage() {
    const [ads, setAds] = useState<JobAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false)
    const [generationJobs, setGenerationJobs] = useState<{[jobAdId: string]: any}>({});
    const router = useRouter();

    // Ensure user is authenticated
    const getAuthHeaders = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const idToken = await user.getIdToken();
      return { Authorization: `Bearer ${idToken}` };
    };

    useEffect(() => {
        async function fetchJobAds() {
            try {
                const authHeaders = await getAuthHeaders(); // Add this
                
                const response = await fetch("http://localhost:5000/job_ads", {
                    headers: authHeaders, // Add this
                });
                
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                
                const data: JobAd[] = await response.json();
                setAds(data);
            } catch (err) {
                console.error("Failed to load job ads:", err);
            } finally {
                setLoading(false);
            }
        }

        async function fetchGenerationJobs() {
            try {
                const authHeaders = await getAuthHeaders();
                const response = await fetch("http://localhost:5000/resume_generation_jobs", {
                    headers: authHeaders,
                });
                
                if (response.ok) {
                    const jobs = await response.json();
                    const jobsMap: {[jobAdId: string]: any} = {};
                    
                    // Group jobs by job_ad_id, keeping only the most recent active job per job ad
                    jobs.forEach((job: any) => {
                        if (job.status === "processing" || job.status === "pending") {
                            if (!jobsMap[job.job_ad_id] || new Date(job.created_at) > new Date(jobsMap[job.job_ad_id].created_at)) {
                                jobsMap[job.job_ad_id] = job;
                            }
                        }
                    });
                    
                    setGenerationJobs(jobsMap);
                }
            } catch (err) {
                console.error("Failed to load generation jobs:", err);
            }
        }
        
        fetchJobAds();
        fetchGenerationJobs();
    }, []);

    // Poll for generation job updates every 5 seconds
    useEffect(() => {
        const pollJobs = async () => {
            try {
                const authHeaders = await getAuthHeaders();
                const response = await fetch("http://localhost:5000/resume_generation_jobs", {
                    headers: authHeaders,
                });
                
                if (response.ok) {
                    const jobs = await response.json();
                    const jobsMap: {[jobAdId: string]: any} = {};
                    
                    jobs.forEach((job: any) => {
                        if (job.status === "processing" || job.status === "pending") {
                            if (!jobsMap[job.job_ad_id] || new Date(job.created_at) > new Date(jobsMap[job.job_ad_id].created_at)) {
                                jobsMap[job.job_ad_id] = job;
                            }
                        }
                    });
                    
                    setGenerationJobs(jobsMap);
                }
            } catch (err) {
                console.error("Failed to poll generation jobs:", err);
            }
        };

        const interval = setInterval(pollJobs, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: string) => {
      const notifId = "delete-job";
      setIsDeleting(true);
      notifications.show({id: notifId, loading: true, title: "Deleting job ad", message: "Please wait…", autoClose: false, withCloseButton: false});

      try {
        const authHeaders = await getAuthHeaders(); // Ensure user is authenticated

        const response = await fetch(`http://localhost:5000/job_ads/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
        if (!response.ok) throw new Error(await response.text());

        // Remove the job from UI
        setAds(prev => prev.filter(ad => ad._id !== id));
        if (expandedId === id) setExpandedId(null);

        notifications.update({id: notifId, loading: false, title: "Deleted", message: "Job ad has been deleted.", color: "teal", autoClose: 2000});
      }
      catch(err: any) {
        notifications.update({id: notifId, loading: false, title: "Failed to delete", message: err.message ?? String(err), color: "red", autoClose: 3000});
      }
      finally {
        setIsDeleting(false);
      }
    };

    const toggleExpand = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    if (loading) {
        return (
            <Container size="sm" py="xl">
                <Loader />
            </Container>
        );
    }
    if (ads.length === 0) {
        return (
            <Container size="sm" py="xl">
                <Text>No job ads have been submitted yet.</Text>
            </Container>
        );
    }

    return (
    <Container size="lg" py="xl">

      <Modal opened={!!pendingDeleteId} onClose={() => setPendingDeleteId(null)} title="Confirm deletion" centered>
        <Text>Are you sure you want to delete this job ad?</Text>
        <Group mt="md">
          <Button variant="default" onClick={() => setPendingDeleteId(null)}>
            Cancel
          </Button>
          <Button color="red"  loading={isDeleting} onClick={async () => {
            if (!pendingDeleteId) return;
            await handleDelete(pendingDeleteId);
             setPendingDeleteId(null);
          }}>
            Delete
          </Button>
        </Group>
      </Modal>

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
            {ads.map((ad) => (
              <React.Fragment key={ad._id}>
                <Table.Tr>
                  <Table.Td>
                    <Group gap="xs">
                      <Text>{ad.parse_result.job_title}</Text>
                      {/* CF010: Show processing status indicator */}
                      {generationJobs[ad._id] && (
                        <Badge 
                          color={generationJobs[ad._id].status === "processing" ? "blue" : "yellow"} 
                          size="sm"
                          leftSection={generationJobs[ad._id].status === "processing" ? <IconBolt size={12} /> : <IconClock size={12} />}
                        >
                          {generationJobs[ad._id].status === "processing" ? "Creating Resume..." : "Pending"}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>{ad.parse_result.company}</Table.Td>
                  <Table.Td>{ad.parse_result.location}</Table.Td>
                  <Table.Td>{new Date(ad.uploaded_at).toLocaleString()}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap" justify="flex-end">

                      <Tooltip label={expandedId === ad._id ? "Hide job ad" : "View job ad"}>
                      <Button variant="light" size="xs" onClick={() => toggleExpand(ad._id)}>
                        {expandedId === ad._id ? "Hide" : "Details"}
                      </Button>
                      </Tooltip>

                      <Tooltip label="Delete this job ad">
                      <Button variant="light" color="red" size="xs" onClick={() => setPendingDeleteId(ad._id)}>
                        Delete
                      </Button>
                      </Tooltip>

                      <Tooltip label="Select this job ad">
                        <Button variant="light" size="xs" onClick={() => router.push(`/home/job_ads/${ad._id}`)}>
                          Select
                        </Button>
                      </Tooltip>

                    </Group>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ padding: 0, border: 0 }}>
                    <Collapse in={expandedId === ad._id}>
                      <Stack px="md" py="sm">
                        <Text><strong>Employment Type:</strong> {ad.parse_result.employment_type || "N/A"}</Text>
                        <Text><strong>Salary Range:</strong> {ad.parse_result.salary_range || "N/A"}</Text>
                        <Text><strong>Required Experience:</strong> {ad.parse_result.required_experience || "N/A"}</Text>
                        <Text><strong>Required Education:</strong> {ad.parse_result.required_education || "N/A"}</Text>
                        {ad.parse_result.job_description && (
                          <Text><strong>Description:</strong> {ad.parse_result.job_description}</Text>
                        )}
                        {ad.parse_result.responsibilities && (
                          <div>
                            <Text><strong>Responsibilities:</strong></Text>
                            <ul>
                              {ad.parse_result.responsibilities.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          </div>
                        )}
                        {ad.parse_result.qualifications && (
                          <div>
                            <Text><strong>Qualifications:</strong></Text>
                            <ul>
                              {ad.parse_result.qualifications.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          </div>
                        )}
                        {ad.parse_result.benefits && (
                          <div>
                            <Text><strong>Benefits:</strong></Text>
                            <ul>
                              {ad.parse_result.benefits.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          </div>
                        )}
                      </Stack>
                    </Collapse>
                  </Table.Td>
                </Table.Tr>
              </React.Fragment>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Container>
  );
}
