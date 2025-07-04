"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Table, ScrollArea, Group, Button, Stack, Collapse, Modal, Tooltip, Badge, Anchor, Select, List, MultiSelect, Checkbox } from "@mantine/core";
import { IconCheck, IconClock, IconBolt, IconExternalLink, IconBriefcase, IconBulb } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";

interface JobAd {
    _id: string;
    job_ad_text: string;
    uploaded_at: string;
    job_ad_url?: string;
    scraped_title?: string;
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

export default function JobAdsPage() {
    const [ads, setAds] = useState<JobAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false)
    const [generationJobs, setGenerationJobs] = useState<{[jobAdId: string]: any}>({});
    const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
    const [selectedAppliedJob, setSelectedAppliedJob] = useState<JobAd | null>(null);
    const [showAppliedWarning, setShowAppliedWarning] = useState(false);
    
    // New state for advice functionality
    const [showAdviceModal, setShowAdviceModal] = useState(false);
    const [showResumeSelectModal, setShowResumeSelectModal] = useState(false);
    const [selectedJobForAdvice, setSelectedJobForAdvice] = useState<JobAd | null>(null);
    const [completedResumes, setCompletedResumes] = useState<ResumeSummary[]>([]);
    const [selectedResumeIds, setSelectedResumeIds] = useState<string[]>([]);
    const [advice, setAdvice] = useState<any | null>(null);
    const [adviceLoading, setAdviceLoading] = useState(false);
    
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
        
        async function fetchAppliedJobs() {
            try {
                const authHeaders = await getAuthHeaders();
                const response = await fetch("http://localhost:5000/completed_resumes", {
                    headers: authHeaders,
                });
                
                if (response.ok) {
                    const completedResumes = await response.json();
                    const appliedJobIds = new Set<string>();
                    
                    completedResumes.forEach((resume: any) => {
                        if (resume.job_ad_id) {
                            appliedJobIds.add(resume.job_ad_id);
                        }
                    });
                    
                    setAppliedJobs(appliedJobIds);
                }
            } catch (err) {
                console.error("Failed to load applied jobs:", err);
            }
        }
        
        async function fetchCompletedResumes() {
            try {
                const authHeaders = await getAuthHeaders();
                const response = await fetch('http://localhost:5000/resume/resumes?status=complete', {
                    headers: authHeaders,
                });
                if (response.ok) {
                    const data = await response.json();
                    setCompletedResumes(data);
                }
            } catch (err) {
                console.error("Failed to load completed resumes:", err);
            }
        }
        
        fetchJobAds();
        fetchGenerationJobs();
        fetchAppliedJobs();
        fetchCompletedResumes();
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

    const handleJobSelect = (ad: JobAd) => {
        if (appliedJobs.has(ad._id)) {
            setSelectedAppliedJob(ad);
            setShowAppliedWarning(true);
        } else {
            router.push(`/home/job_ads/${ad._id}`);
        }
    };

    const proceedWithAppliedJob = () => {
        if (selectedAppliedJob) {
            router.push(`/home/job_ads/${selectedAppliedJob._id}`);
        }
        setShowAppliedWarning(false);
        setSelectedAppliedJob(null);
    };

    const handleGetAdvice = (jobAd: JobAd) => {
        setSelectedJobForAdvice(jobAd);
        setShowResumeSelectModal(true);
    };

    const handleResumeCheckboxChange = (resumeId: string, checked: boolean) => {
        setSelectedResumeIds(prev => {
            if (checked) {
                return [...prev, resumeId];
            } else {
                return prev.filter(id => id !== resumeId);
            }
        });
    };

    const handleResumeSelect = async () => {
        if (!selectedJobForAdvice || !selectedResumeIds.length) return;
        
        const notifId = "generate-advice";
        setAdviceLoading(true);
        setShowResumeSelectModal(false);
        
        notifications.show({
            id: notifId,
            loading: true,
            title: "Generating Advice",
            message: "Analyzing your resumes against the job requirements...",
            autoClose: false,
            withCloseButton: false
        });
        
        try {
            const authHeaders = await getAuthHeaders();
            
            // Get all selected resume data
            const resumePromises = selectedResumeIds.map(async (resumeId) => {
                const resumeResponse = await fetch(`http://localhost:5000/resume/${resumeId}`, {
                    headers: authHeaders,
                });
                
                if (!resumeResponse.ok) throw new Error(`Failed to fetch resume ${resumeId}`);
                return await resumeResponse.json();
            });
            
            const resumeDataArray = await Promise.all(resumePromises);
            
            // Create advice request payload with multiple resumes
            const advicePayload = {
                resume_data: resumeDataArray, // Array of resume data
                job_ad_data: selectedJobForAdvice,
                score_data: {} // We don't have score data for this case
            };
            
            // Make direct API call to the advice generator
            const response = await fetch('http://localhost:5000/generate_advice', {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(advicePayload),
            });
            
            if (!response.ok) throw new Error("Failed to generate advice");
            const result = await response.json();
            
            setAdvice(result.advice);
            setShowAdviceModal(true);
            
            notifications.update({
                id: notifId,
                loading: false,
                title: "Advice Generated",
                message: "Your personalized advice is ready!",
                color: "teal",
                autoClose: 3000
            });
            
        } catch (err: any) {
            console.error("Error generating advice:", err);
            notifications.update({
                id: notifId,
                loading: false,
                title: "Error",
                message: err.message || "Failed to generate advice",
                color: "red",
                autoClose: 5000
            });
        } finally {
            setAdviceLoading(false);
        }
    };

    const resetAdviceState = () => {
        setSelectedJobForAdvice(null);
        setSelectedResumeIds([]);
        setAdvice(null);
        setShowAdviceModal(false);
        setShowResumeSelectModal(false);
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
                      {/* Show applied badge if job has been applied to */}
                      {appliedJobs.has(ad._id) && (
                        <Badge 
                          color="green" 
                          size="sm"
                          leftSection={<IconBriefcase size={12} />}
                        >
                          Applied
                        </Badge>
                      )}
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

                      <Tooltip label="Get personalized advice for this job">
                        <Button 
                          variant="light" 
                          color="blue" 
                          size="xs" 
                          leftSection={<IconBulb size={14} />}
                          onClick={() => handleGetAdvice(ad)}
                        >
                          Advice
                        </Button>
                      </Tooltip>

                      <Tooltip label="Delete this job ad">
                      <Button variant="light" color="red" size="xs" onClick={() => setPendingDeleteId(ad._id)}>
                        Delete
                      </Button>
                      </Tooltip>

                      <Tooltip label="Select this job ad">
                        <Button variant="light" size="xs" onClick={() => handleJobSelect(ad)}>
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

      {/* Applied Job Warning Modal */}
      <Modal
        opened={showAppliedWarning}
        onClose={() => {
          setShowAppliedWarning(false);
          setSelectedAppliedJob(null);
        }}
        title="Already Applied"
        centered
        size="md"
      >
        <Stack gap="md">
          <Group gap="xs" align="center">
            <IconBriefcase size={24} color="#51cf66" />
            <Text fw={500}>You've already applied to this position</Text>
          </Group>
          
          <Text>
            You have already created and submitted a tailored resume for{" "}
            <Text component="span" fw={500} c="green">
              {selectedAppliedJob?.parse_result.job_title}
            </Text>{" "}
            at{" "}
            <Text component="span" fw={500} c="green">
              {selectedAppliedJob?.parse_result.company}
            </Text>.
          </Text>
          
          <Text size="sm" c="dimmed">
            You can still proceed to create an additional tailored resume if you want to 
            customize it further or use different source resumes.
          </Text>
          
          <Group justify="space-between" mt="md">
            <Button
              variant="outline"
              onClick={() => {
                setShowAppliedWarning(false);
                setSelectedAppliedJob(null);
              }}
            >
              Cancel
            </Button>
            
            <Button
              color="green"
              onClick={proceedWithAppliedJob}
            >
              Proceed Anyway
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Resume Selection Modal */}
      <Modal
        opened={showResumeSelectModal}
        onClose={() => {
          setShowResumeSelectModal(false);
          setSelectedJobForAdvice(null);
          setSelectedResumeIds([]);
        }}
        title="Select Resumes for Advice"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text>
            Get personalized advice for{" "}
            <Text component="span" fw={500} c="blue">
              {selectedJobForAdvice?.parse_result.job_title}
            </Text>{" "}
            at{" "}
            <Text component="span" fw={500} c="blue">
              {selectedJobForAdvice?.parse_result.company}
            </Text>
          </Text>
          
          <div>
            <Text size="sm" fw={500} mb="sm">Choose completed resumes:</Text>
            <Stack gap="xs">
              {completedResumes.map(resume => (
                <Checkbox
                  key={resume._id}
                  label={resume.name}
                  checked={selectedResumeIds.includes(resume._id)}
                  onChange={(event) => handleResumeCheckboxChange(resume._id, event.currentTarget.checked)}
                />
              ))}
            </Stack>
          </div>
          
          {completedResumes.length === 0 && (
            <Text size="sm" c="dimmed" ta="center">
              No completed resumes found. Please complete a resume first.
            </Text>
          )}
          
          <Group justify="space-between" mt="md">
            <Button
              variant="outline"
              onClick={() => {
                setShowResumeSelectModal(false);
                setSelectedJobForAdvice(null);
                setSelectedResumeIds([]);
              }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleResumeSelect}
              disabled={!selectedResumeIds.length}
              loading={adviceLoading}
            >
              Get Advice
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Advice Modal */}
      <Modal
        opened={showAdviceModal}
        onClose={resetAdviceState}
        title="Resume Advice"
        centered
        size="xl"
        styles={{
          body: { maxHeight: 600, overflowY: 'auto' }
        }}
      >
        <Stack>
          {advice ? (
            typeof advice === 'string' ? (
              <Text style={{ whiteSpace: "pre-line" }}>{advice}</Text>
            ) : (
              <Stack gap="lg">
                {advice.overall_assessment && (
                  <div>
                    <Text fw={500} mb="sm">Overall Assessment</Text>
                    <Text>{advice.overall_assessment}</Text>
                  </div>
                )}
                
                {advice.key_strengths && advice.key_strengths.length > 0 && (
                  <div>
                    <Text fw={500} color="green" mb="sm">Key Strengths</Text>
                    <List>
                      {advice.key_strengths.map((strength: string, index: number) => (
                        <List.Item key={index}>{strength}</List.Item>
                      ))}
                    </List>
                  </div>
                )}
                
                {advice.priority_actions && advice.priority_actions.length > 0 && (
                  <div>
                    <Text fw={500} color="blue" mb="sm">Priority Actions</Text>
                    <List>
                      {advice.priority_actions.map((action: string, index: number) => (
                        <List.Item key={index}>{action}</List.Item>
                      ))}
                    </List>
                  </div>
                )}
                
                {advice.improvement_areas && (
                  <div>
                    <Text fw={500} color="orange" mb="sm">Improvement Areas</Text>
                    <Stack gap="sm">
                      {advice.improvement_areas.content_improvements && advice.improvement_areas.content_improvements.length > 0 && (
                        <div>
                          <Text size="sm" fw={500}>Content Improvements:</Text>
                          <List size="sm">
                            {advice.improvement_areas.content_improvements.map((item: string, index: number) => (
                              <List.Item key={index}>{item}</List.Item>
                            ))}
                          </List>
                        </div>
                      )}
                      
                      {advice.improvement_areas.keyword_optimization && advice.improvement_areas.keyword_optimization.length > 0 && (
                        <div>
                          <Text size="sm" fw={500}>Keyword Optimization:</Text>
                          <List size="sm">
                            {advice.improvement_areas.keyword_optimization.map((item: string, index: number) => (
                              <List.Item key={index}>{item}</List.Item>
                            ))}
                          </List>
                        </div>
                      )}
                      
                      {advice.improvement_areas.skill_development && advice.improvement_areas.skill_development.length > 0 && (
                        <div>
                          <Text size="sm" fw={500}>Skill Development:</Text>
                          <List size="sm">
                            {advice.improvement_areas.skill_development.map((item: string, index: number) => (
                              <List.Item key={index}>{item}</List.Item>
                            ))}
                          </List>
                        </div>
                      )}
                    </Stack>
                  </div>
                )}
                
                {advice.long_term_recommendations && advice.long_term_recommendations.length > 0 && (
                  <div>
                    <Text fw={500} color="violet" mb="sm">Long-term Recommendations</Text>
                    <List>
                      {advice.long_term_recommendations.map((rec: string, index: number) => (
                        <List.Item key={index}>{rec}</List.Item>
                      ))}
                    </List>
                  </div>
                )}
                
                {advice.encouragement && (
                  <div>
                    <Text fw={500} color="teal" mb="sm">Encouragement</Text>
                    <Text style={{ fontStyle: 'italic' }}>{advice.encouragement}</Text>
                  </div>
                )}
              </Stack>
            )
          ) : (
            <Text>No advice available.</Text>
          )}
        </Stack>
      </Modal>
    </Container>
  );
}
