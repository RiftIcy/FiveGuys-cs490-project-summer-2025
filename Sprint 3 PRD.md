# Project Requirements Document: AI Resume Generator Project (Phase 3)

## Legend: Requirement ID Convention

| Prefix  | Meaning                                      |
|---------|----------------------------------------------|
| `RF`    | Resume Formatting & Download Integration     |
| `AG`    | Advice Generation & Display                  |
| `JT`    | Job Application Tracking History View        |
| `TP`    | Template and Style Selection Interface       |
| `SHR`   | Shared Requirements                          |

Each ID is followed by a three-digit number, incrementing within each category.

---

## Functional Requirements

### Resume Formatting & Download Integration

| Requirement ID | Description                            | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------|------------|----------------------------|
| RF001          | Resume formatting UI with trigger      | As a user, I want to click a button to format a resume and download it. | The UI should include a “Format Resume” button that triggers formatting via API. |
| RF002          | Trigger POST /api/resumes/format       | As a user, I want my resume formatting request sent to the server. | The selected resumeId should be passed in a POST request to `/api/resumes/format`. |
| RF003          | Display download link on success       | As a user, I want to download my formatted resume once it’s ready. | The response's `downloadUrl` should be shown as a clickable download button or link. |
| RF004          | Initiate file download from link       | As a user, I want to download the file by clicking the link. | Clicking the link should initiate the resume file download. |

---

### Advice Generation & Display

| Requirement ID | Description                            | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------|------------|----------------------------|
| AG001          | Advice request UI                      | As a user, I want to request personalized resume advice for a job. | The UI should provide dropdowns or selectors for resumeId and jobId and a “Get Advice” button. |
| AG002          | Trigger POST /api/jobs/advice          | As a user, I want the system to generate advice using selected inputs. | The UI should call the advice endpoint with both resumeId and jobId. |
| AG003          | Display returned advice text           | As a user, I want to read the advice in an easily readable format. | Returned advice should appear in a formatted card, panel, or modal. |
| AG004          | Show loading indicator                 | As a user, I want visual feedback while advice is being generated. | A loading spinner or message should appear during the API request. |

---

### Job Application Tracking History View

| Requirement ID | Description                            | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------|------------|----------------------------|
| JT001          | Display job application history page   | As a user, I want to see the jobs I’ve applied to. | A new page or section should list the user’s job applications. |
| JT002          | Call GET /api/user/job-applications    | As a user, I want my application history to load from the server. | The system should fetch data using the authenticated user’s credentials. |
| JT003          | Render history in structured format    | As a user, I want my application history to be clear and organized. | Job applications should be shown in a table or card list with key metadata. |
| JT004          | Display resume used per application    | As a user, I want to know which resume I used. | Each row should display the resume ID or label used. |
| JT005          | Display job summary or ID              | As a user, I want to know which job I applied to. | Each row should show the job title or ID. |
| JT006          | Display application date               | As a user, I want to know when I submitted my application. | Each record should show the submission timestamp. |
| JT007          | Handle empty application list          | As a user, I want clear feedback if I haven’t applied to any jobs. | Show a message like “No job applications submitted yet.” |
| JT009          | Show loading indicator during fetch    | As a user, I want to know the data is being loaded. | A spinner or loading state should be shown while waiting for data. |

---

### Template and Style Selection Interface

| Requirement ID | Description                            | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------|------------|----------------------------|
| TP001          | Template selection UI                  | As a user, I want to choose how my resume looks before formatting. | The UI should show a list of template options to choose from. |
| TP002          | Support multiple output formats (PDF)  | As a user, I want my resume exported in formats like PDF. | System should support at least PDF output from formatting. |
| TP003          | Build LaTeX-based formatting engine    | As a developer, I want to apply structured templates and styling using LaTeX. | Templates should be LaTeX-backed and support visual customizations. |
| TP004          | Fetch templates via GET /api/templates | As a user, I want to choose from available templates. | The UI should fetch and list templates from `/api/templates`. |
| TP005          | Show template name, description, image | As a user, I want to understand each template before choosing. | Each template card should display a name, optional description, and image preview (if available). |
| TP006          | User selects template from UI          | As a user, I want to select a template from the list. | The selected `templateId` should be used during resume formatting. |
| TP007          | Fallback to default template           | As a user, I want formatting to work even if I skip template selection. | If no template is selected, the system should default to a standard one. |

---

### Shared Behavior

| Requirement ID | Description                            | User Story | Expected Behavior/Outcome |
|----------------|----------------------------------------|------------|----------------------------|
| SHR001         | Unified error handling for all API calls | As a user, I want all API errors to be handled gracefully across the app. | Any failed API call should trigger a user-friendly error message. This applies to formatting, advice, history, and template-related features. |

