"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Stack, Card, List, Group, Divider, Button, Tooltip, Modal, Collapse } from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

interface CompletedResume {
    _id: string;
    job_title: string;
    company: string;
    created_at: string;
    tailored_resume: any;
    source_resume_ids: string[];
    source_resume_names: string[];
    job_ad_data: any;
    score?: number;
    score_data?: {
        overall_score: number;
        category_scores: {
            skills_match: number;
            experience_relevance: number;
            education: number;
            keyword_alignment: number;
            impact_achievements: number;
        };
        strengths: string[];
        gaps: string[];
        transferable_skills: string[];
    };
}

export default function CompletedResumePage() {
    const { completedResumeId } = useParams();
    const router = useRouter();
    const [data, setData] = useState<CompletedResume | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [advice, setAdvice] = useState<any | null>(null);
    const [adviceLoading, setAdviceLoading] = useState(false);
    const [showAdviceModal, setShowAdviceModal] = useState(false);
    const [scoreDetailsOpen, setScoreDetailsOpen] = useState(false);

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

    const handleQuickFormat = async () => {
        try {
            const authHeaders = await getAuthHeaders();
            
            // Mark as applied first
            await fetch(`http://localhost:5000/completed_resumes/${completedResumeId}/apply`, {
                method: 'POST',
                headers: authHeaders
            });
            
            // Format with default template in background
            const response = await fetch(`http://localhost:5000/format_resume`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                },
                body: JSON.stringify({
                    resume_data: data?.tailored_resume,
                    completed_resume_id: completedResumeId,
                    job_title: data?.job_title,
                    template_id: 'default_1col' // Default template
                })
            });

            if (!response.ok) throw new Error('Failed to format resume');
            
            // Navigate to completed resumes list (same as sidebar)
            router.push('/home/completed_resumes');
            
        } catch (error) {
            console.error('Error formatting resume:', error);
        } finally {
            setShowFormatModal(false);
        }
    };

    const handleGetAdvice = async () => {
        setAdviceLoading(true);
        setAdvice(null);
        try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(
                `http://localhost:5000/completed_resumes/${completedResumeId}/advice`,
                { method: "POST", headers: authHeaders }
            );
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to get advice");
            setAdvice(result.advice);
        } catch (err: any) {
            setAdvice("Error: " + (err.message || "Failed to get advice"));
        } finally {
            setAdviceLoading(false);
            setShowAdviceModal(true);
        }
    };

    if (loading) return <Container><Loader /></Container>;
    if (error || !data) return <Container><Text color="red">Error loading data</Text></Container>;

    return (
        <Container size="lg" py="xl">
            <Title order={2} mb="md">
                Tailored Resume for: {data.job_title} at {data.company}
            </Title>

            {(typeof data.score === "number" || data.score_data) && (
                <Card withBorder p="md" mb="md">
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Group gap="md" align="center">
                                <Text size="lg" fw={700} color="blue">
                                    Match Score: {data.score_data?.overall_score || data.score || 0} / 100
                                </Text>
                                <Button
                                    variant="subtle"
                                    size="xs"
                                    leftSection={scoreDetailsOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                    onClick={() => setScoreDetailsOpen(!scoreDetailsOpen)}
                                >
                                    {scoreDetailsOpen ? 'Hide Details' : 'Show Details'}
                                </Button>
                            </Group>
                            <Tooltip 
                                label="Get personalized advice on how to improve your resume's match with this job posting, including specific recommendations for better keyword usage, experience highlighting, and skill presentation."
                                position="bottom"
                                multiline
                                w={300}
                            >
                                <Button
                                    size="xs"
                                    variant="light"
                                    loading={adviceLoading}
                                    onClick={handleGetAdvice}
                                >
                                    Get Advice
                                </Button>
                            </Tooltip>
                        </Group>
                        
                        <Collapse in={scoreDetailsOpen}>
                            <Stack gap="md">
                                {data.score_data?.category_scores && (
                                    <div>
                                        <Text size="sm" fw={500} c="dimmed" mb="sm">Score Breakdown:</Text>
                                        <Group gap="lg" wrap="wrap">
                                            <Tooltip 
                                                label="Skills Match (0-20): Measures how many of the job's required technical skills you have. 18-20 = 90%+ match, 15-17 = 70-89% match, 10-14 = 50-69% match."
                                                position="top"
                                                multiline
                                                w={250}
                                            >
                                                <Text size="sm" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                                    Skills: {data.score_data.category_scores.skills_match}/20
                                                </Text>
                                            </Tooltip>
                                            
                                            <Tooltip 
                                                label="Experience Relevance (0-20): Evaluates how relevant your work experience is to this role. Only considers relevant experience - irrelevant experience is neutral, not negative."
                                                position="top"
                                                multiline
                                                w={250}
                                            >
                                                <Text size="sm" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                                    Experience: {data.score_data.category_scores.experience_relevance}/20
                                                </Text>
                                            </Tooltip>
                                            
                                            <Tooltip 
                                                label="Education (0-20): Checks if your education meets job requirements. More education than required is always positive - never penalized for overqualification."
                                                position="top"
                                                multiline
                                                w={250}
                                            >
                                                <Text size="sm" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                                    Education: {data.score_data.category_scores.education}/20
                                                </Text>
                                            </Tooltip>
                                            
                                            <Tooltip 
                                                label="Keyword Alignment (0-20): Measures how well your resume uses terminology from the job posting. Higher scores indicate better ATS compatibility."
                                                position="top"
                                                multiline
                                                w={250}
                                            >
                                                <Text size="sm" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                                    Keywords: {data.score_data.category_scores.keyword_alignment}/20
                                                </Text>
                                            </Tooltip>
                                            
                                            <Tooltip 
                                                label="Impact & Achievements (0-20): Evaluates quantifiable results and value delivered in your experience. Focuses on measurable accomplishments rather than just job duties."
                                                position="top"
                                                multiline
                                                w={250}
                                            >
                                                <Text size="sm" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                                    Impact: {data.score_data.category_scores.impact_achievements}/20
                                                </Text>
                                            </Tooltip>
                                        </Group>
                                    </div>
                                )}
                                
                                {data.score_data?.strengths && data.score_data.strengths.length > 0 && (
                                    <div>
                                        <Text size="sm" fw={500} color="green" mb="xs">Key Strengths:</Text>
                                        <List size="sm" spacing="xs">
                                            {data.score_data.strengths.map((strength, index) => (
                                                <List.Item key={index}>{strength}</List.Item>
                                            ))}
                                        </List>
                                    </div>
                                )}
                                
                                {data.score_data?.gaps && data.score_data.gaps.length > 0 && (
                                    <div>
                                        <Text size="sm" fw={500} color="orange" mb="xs">Areas for Improvement:</Text>
                                        <List size="sm" spacing="xs">
                                            {data.score_data.gaps.map((gap, index) => (
                                                <List.Item key={index}>{gap}</List.Item>
                                            ))}
                                        </List>
                                    </div>
                                )}
                                
                                {data.score_data?.transferable_skills && data.score_data.transferable_skills.length > 0 && (
                                    <div>
                                        <Text size="sm" fw={500} color="violet" mb="xs">Transferable Skills:</Text>
                                        <List size="sm" spacing="xs">
                                            {data.score_data.transferable_skills.map((skill, index) => (
                                                <List.Item key={index}>{skill}</List.Item>
                                            ))}
                                        </List>
                                    </div>
                                )}
                            </Stack>
                        </Collapse>
                    </Stack>
                </Card>
            )}
            
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
                            onClick={() => setShowFormatModal(true)}
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

            {/* Format Options Modal */}
            <Modal
                opened={showFormatModal}
                onClose={() => setShowFormatModal(false)}
                title="Format Your Resume"
                centered
                size="md"
            >
                <Stack gap="lg">
                    <Text>
                        Choose how you'd like to format your resume:
                    </Text>
                    
                    <Card withBorder p="md">
                        <Stack gap="sm">
                            <Text fw={500}>Quick Format (Recommended)</Text>
                            <Text size="sm" color="dimmed">
                                Apply our default professional template (Classic Professional, Single-column) 
                                and proceed directly to download.
                            </Text>
                        </Stack>
                    </Card>
                    
                    <Card withBorder p="md">
                        <Stack gap="sm">
                            <Text fw={500}>Custom Format</Text>
                            <Text size="sm" color="dimmed">
                                Choose from multiple templates and customize the layout 
                                (single or double column) to match your preferences.
                            </Text>
                        </Stack>
                    </Card>
                    
                    <Group justify="space-between" mt="md">
                        <Button
                            variant="outline"
                            onClick={() => setShowFormatModal(false)}
                        >
                            Cancel
                        </Button>
                        
                        <Group gap="sm">
                            <Button
                                variant="filled"
                                onClick={handleQuickFormat}
                            >
                                Quick Format
                            </Button>
                            
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowFormatModal(false);
                                    router.push(`/home/completed_resumes/${completedResumeId}/format`);
                                }}
                            >
                                Custom Format
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={showAdviceModal}
                onClose={() => setShowAdviceModal(false)}
                title="Resume Advice"
                centered
                size="xl"
                scrollAreaComponent={Stack}
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