"use client";

import React, { useEffect, useState } from "react";
import { Container, Title, Loader, Text, Table, ScrollArea, Group, Button, Stack, Collapse} from "@mantine/core";
import { useRouter } from "next/navigation";

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
    const router = useRouter();

    useEffect(() => {
        fetch("http://localhost:5000/job_ads").then((response) => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }).then((data: JobAd[]) => {
            setAds(data);
        }).catch((err) => {
            console.error("Failed to load job ads:", err);
        }).finally(() => setLoading(false));
    }, []);

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
      <ScrollArea>
        <Table verticalSpacing="sm" withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Company</Table.Th>
              <Table.Th>Location</Table.Th>
              <Table.Th>Uploaded At</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ads.map((ad) => (
              <React.Fragment key={ad._id}>
                <Table.Tr>
                  <Table.Td>{ad.parse_result.job_title}</Table.Td>
                  <Table.Td>{ad.parse_result.company}</Table.Td>
                  <Table.Td>{ad.parse_result.location}</Table.Td>
                  <Table.Td>{new Date(ad.uploaded_at).toLocaleString()}</Table.Td>
                  <Table.Td>
                    <Button variant="light" size="xs" onClick={() => toggleExpand(ad._id)}>
                      {expandedId === ad._id ? "Hide" : "Details"}
                    </Button>
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
