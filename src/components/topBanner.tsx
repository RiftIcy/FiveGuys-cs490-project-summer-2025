"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"; // Import Shadcn dropdown components
import { useRouter, usePathname, useParams } from "next/navigation"; // Import usePathname
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface TopBannerProps {
    toggleSidePanel: () => void;
}

export default function TopBanner({ toggleSidePanel }: TopBannerProps) {
    const router = useRouter();
    const pathname = usePathname(); // Get the current path
    const params = useParams();
    const resumeId = params?.resumeId;

    // Get current user
    const user = auth.currentUser;

    // Helper to get initials from displayName
    const getInitials = (name?: string | null) => {
        if (!name) return "";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const initials = getInitials(user?.displayName).toLowerCase();


    // Map paths to page titles
    const pageTitles: { [key: string]: string } = {
        "/home": "Home",
        "/home/settings": "Settings",
        "/home/resume_builder": "Upload", 
    };
    
    let pageTitle = pageTitles[pathname]; // Default to "Page" if no match

    if(!pageTitle && pathname.startsWith("/home/resume_editor")) {
        pageTitle = "Resume Editor";
    }

    pageTitle = pageTitle || "Page";

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/"); // Redirect to landing page
        } catch (error) {
            console.error("Failed to log out:", error);
        }
    };

    return (
        <header className="bg-stone-200 dark:bg-stone-800 p-4 shadow border-b border-stone-600 flex items-center justify-between">
            {/* Left Section: Hamburger Menu, Logo, and Breadcrumb */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={toggleSidePanel}
                    className="p-2 rounded-md border-none hover:bg-stone-300 dark:hover:bg-stone-700"
                >
                    <Bars3Icon className="h-9 w-9 text-gray-800 dark:text-gray-200" />
                </button>
                <Link href="/" className="flex items-center">
                    <Image
                        src="/logo.png"
                        alt="Marcus Home"
                        width={48}
                        height={48}
                        className="mr-2"
                    />
                </Link>
                <div className="flex space-x-2 text-md">
                    <p>{pageTitle}</p> {/* Dynamically display the page title */}
                </div>
            </div>

            {/* Center Section: Title */}
            <div className="flex-grow flex justify-center">
                <h1 className="text-xl font-semibold">Five Guys</h1>
            </div>

            {/* Right Section: Avatar with Dropdown */}
            <div className="flex items-center relative">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="relative cursor-pointer">
                            <Avatar className="w-10 h-10">
                                <AvatarImage src="/path-to-avatar-image.jpg" alt="User Avatar" />
                                <AvatarFallback className="bg-blue-500 w-full h-full flex items-center justify-center rounded-full">
                                    {initials || "?"}
                                </AvatarFallback>
                            </Avatar>
                            {/* Down Arrow Indicator */}
                            <span
                                className="absolute text-gray-800 dark:text-gray-200 text-xs"
                                style={{
                                    bottom: "-4px", // Move the arrow slightly lower
                                    right: "-4px",  // Move the arrow slightly to the right
                                }}
                            >
                                ▼
                            </span>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => router.push("/home/settings")}>
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout}>
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}