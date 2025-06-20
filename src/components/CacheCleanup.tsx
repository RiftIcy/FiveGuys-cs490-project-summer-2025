'use client';

import { useEffect } from "react";
import { listCachedResumes } from "@/lib/resumeCache";

export function CacheCleanup() {
    useEffect(() => {
        async function cleanup() {
            // fetch all incompletes from server
            const response = await fetch('http://localhost:5000/resume/resumes?status=incomplete')

            if(!response.ok) return
            const incomplete: Array<{_id: string}> = await response.json()

            const cached = new Set(listCachedResumes().map((e) => e.id))

            // delete any server‐side resume no longer in our LRU
            await Promise.all(
                incomplete
                    .filter((resume) => !cached.has(resume._id))
                    .map((resume) => 
                        fetch(`http://localhost:5000/resume/${resume._id}`, {
                            method: 'DELETE',
                        })
                    )       
            )
        }
        cleanup().catch(console.error)
    }, [])

    return null;
}