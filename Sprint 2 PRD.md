# Project Requirements Document: AI Resume Generator Project (Phase 2)

## Legend: Requirement ID Convention

| Prefix  | Meaning                                           |
|---------|---------------------------------------------------|
| `FT`    | File & Text Submission Features                   |
| `CF`    | Core Functionality (Job Submission & Resume Flow) |
| `ST`    | Stretch Goals                                     |

Each ID is followed by a three-digit number, incrementing within each category.

---

## Functional Requirements

### File & Text Submission

#### Additional Features

| Requirement ID | Description                                | User Story | Expected Behavior/Outcome |
|----------------|--------------------------------------------|------------|----------------------------|
| FT007          | Show uploaded item list                    | As a user, I want to see a list of items I've uploaded. | The system should display a scrollable or paginated list of uploaded documents or text. |
| FT008          | Display preview of uploaded items          | As a user, I want to preview uploaded items before interacting with them. | The UI should show a short preview (snippet or thumbnail) of each uploaded item. |
| FT009          | Display document name                      | As a user, I want to identify uploaded documents by name. | For file uploads, the document name should match the original filename. |
| FT010          | Use snippet as name for freeform text      | As a user, I want uploaded text entries to have identifiable names. | The system should use the first few words of the text as its display name. |
| FT011          | Display upload date and time               | As a user, I want to know when I uploaded each item. | Each list item should include a timestamp formatted as "Month Day, Time." |
| FT012          | Display type indicator                     | As a user, I want to know whether an item is a document or freeform text. | A visual tag or label (e.g., “document” or “text”) should be shown next to each item. |

---

## Core Functionality

#### Job Posting Submission Interface

| Requirement ID | Description                                  | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------------|------------|----------------------------|
| CF001          | Paste or type job posting                    | As a user, I want to submit a job ad by pasting it into a text box. | A textarea should accept pasted or typed job ads. |
| CF002          | Show confirmation or error message           | As a user, I want to know if the job ad was submitted successfully. | Upon submission, the system should display a success or error message. |
| CF003          | Display list of previously submitted job ads | As a user, I want to review previously submitted job ads. | The UI should show a list of submitted ads with key metadata. |
| CF004          | Display company name                         | As a user, I want to confirm the job ad includes the company name. | Each listed job ad should show the parsed or provided company name. |
| CF005          | Display job title                            | As a user, I want to verify the job title from the ad. | Each job ad should display a job title field. |
| CF006          | Display upload date and time                 | As a user, I want to know when I submitted each job ad. | Each job entry should include a timestamp of submission. |
| CF007          | Display preview of selected ad               | As a user, I want to preview the full content of a selected job ad. | When clicked or selected, a job ad preview should be rendered in the UI. |

#### Resume Generation Trigger UI

| Requirement ID | Description                                  | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------------|------------|----------------------------|
| CF008          | Generate (unformatted) resume from uploaded job posting    | As a user, I want the system to generate a resume text based on a job ad. | The user should be able to select a job ad and trigger resume generation. |
| CF009          | Show confirmation on resume generation       | As a user, I want immediate feedback that my resume generation request was received. | A success message or toast notification should confirm submission. |

#### Resume Generation Status Tracking UI

| Requirement ID | Description                                  | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------------|------------|----------------------------|
| CF010          | Show "Processing..." indicator               | As a user, I want to know that the system is working on generating my resume. | A status indicator should appear (e.g., spinner or tag) next to the job ad. |
| CF011          | Poll for status and show transition          | As a user, I want to see when my resume is ready. | The UI should poll the backend and update the status from "Processing" to "Completed." |

---

## Stretch Goals

#### Job Description Submission Interface

| Requirement ID | Description                                  | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------------|------------|----------------------------|
| ST009          | Submit job ad via URL                        | As a user, I want to submit a job posting by pasting its URL. | The system should fetch the job posting content from the URL and populate the input field or job list. |

#### Branding and Theming

| Requirement ID | Description                                  | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------------|------------|----------------------------|
| ST010          | Design a logo                                | As a user, I want the app to have a visual identity. | A unique logo should be created and displayed in the app UI. |
| ST011          | Name the app and show on landing page        | As a user, I want to see the app’s name on the front page. | The app name should be prominently displayed on the landing page. |
| ST012          | Display logo and name on every page          | As a user, I want branding to be consistent throughout the app. | The logo and app name should appear in the app header on every page. |
| ST013          | Change dark theme color scheme               | As a user, I want a customized dark mode that reflects the app’s style. | The dark theme colors (background, text, highlights) should be customized. |
| ST014          | Change light theme color scheme              | As a user, I want the light mode to look clean and branded. | The light theme colors should be styled to match the app identity. |
| ST015          | Add a third theme                            | As a user, I want an additional theme option for better personalization. | A third color theme (e.g., high contrast, sepia) should be available in settings. |
| ST016          | Design app landing page                      | As a user, I want to understand what the app does when I arrive on the landing page. | A landing page should describe the service, its value, and how it works. |
