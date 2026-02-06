// Shared styles for Rich Editor and Preview
export const editorStyles = `
    .rich-editor-content h1 {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.2;
        margin: 0.5em 0;
        color: inherit;
    }
    .rich-editor-content h2 {
        font-size: 1.5rem;
        font-weight: 600;
        line-height: 1.3;
        margin: 0.5em 0;
        color: inherit;
    }
    .rich-editor-content h3 {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 0.5em 0;
        color: inherit;
    }
    .rich-editor-content ul {
        list-style-type: disc;
        padding-left: 1.5em;
        margin: 0.5em 0;
    }
    .rich-editor-content ol {
        list-style-type: decimal;
        padding-left: 1.5em;
        margin: 0.5em 0;
    }
    .rich-editor-content li {
        margin: 0.25em 0;
    }
    .rich-editor-content p {
        margin: 0.25em 0;
        min-height: 1.5em; /* Ensure empty P has height */
    }
    .rich-editor-content blockquote {
        border-left: 4px solid #3b82f6;
        padding-left: 1em;
        margin: 0.5em 0;
        color: #6b7280;
        font-style: italic;
    }
    .rich-editor-content hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 1em 0;
    }
    .rich-editor-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 1em 0;
        border-radius: 4px;
        overflow: hidden;
    }
    .rich-editor-content td, .rich-editor-content th {
        border: 1px solid #e5e7eb;
        padding: 8px 12px;
        min-width: 80px;
        vertical-align: top;
        background-color: transparent;
        transition: background-color 0.15s ease;
    }
    .rich-editor-content td:focus-within {
        background-color: #f0f9ff;
        outline: none;
    }
    .rich-editor-content tr:first-child td,
    .rich-editor-content tr:first-child th {
        background-color: #f9fafb;
        font-weight: 500;
    }
    .rich-editor-content a {
        color: #3b82f6;
        text-decoration: underline;
        cursor: pointer;
    }
    .rich-editor-content strong, .rich-editor-content b {
        font-weight: 700;
    }
    .rich-editor-content em, .rich-editor-content i {
        font-style: italic;
    }
    
    /* Dark Mode Overrides */
    .dark .rich-editor-content h1,
    .dark .rich-editor-content h2,
    .dark .rich-editor-content h3 {
        color: #f3f4f6;
    }
    .dark .rich-editor-content hr {
        border-top-color: #374151;
    }
    .dark .rich-editor-content td, .dark .rich-editor-content th {
        border-color: #374151;
    }
    .dark .rich-editor-content td:focus-within {
        background-color: rgba(59, 130, 246, 0.1);
    }
    .dark .rich-editor-content tr:first-child td,
    .dark .rich-editor-content tr:first-child th {
        background-color: #1e293b;
    }

    /* Checklist Styles */
    .rich-editor-content .checklist-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin: 8px 0;
        padding: 4px 0;
    }
    .rich-editor-content .checklist-checkbox {
        width: 18px;
        height: 18px;
        margin-top: 2px;
        cursor: pointer;
        accent-color: #3b82f6;
        flex-shrink: 0;
    }
    .rich-editor-content .checklist-label {
        flex: 1;
        min-height: 24px;
        outline: none;
        cursor: text;
        line-height: 1.5;
    }
    .rich-editor-content .checklist-label:empty::before {
        content: attr(placeholder);
        color: #9ca3af;
    }
    .rich-editor-content .checklist-checkbox:checked + .checklist-label {
        text-decoration: line-through;
        color: #9ca3af;
    }
    .dark .rich-editor-content .checklist-checkbox:checked + .checklist-label {
        color: #6b7280;
    }

    /* Image Styles */
    .rich-editor-content img {
        max-width: 100%;
        border-radius: 8px;
        margin: 1em 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    /* File Attachment Styles */
    .rich-editor-content .file-attachment {
        display: inline-flex;
        align-items: center;
        padding: 8px 12px;
        background-color: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin: 0.5em 0;
        gap: 8px;
        transition: all 0.2s;
        text-decoration: none !important;
    }
    .rich-editor-content .file-attachment:hover {
        background-color: #e5e7eb;
        border-color: #d1d5db;
    }
    .dark .rich-editor-content .file-attachment {
        background-color: #1f2937;
        border-color: #374151;
    }
    .dark .rich-editor-content .file-attachment:hover {
        background-color: #374151;
        border-color: #4b5563;
    }
    .rich-editor-content .file-attachment a {
        color: #374151;
        font-weight: 500;
        text-decoration: none;
    }
    .dark .rich-editor-content .file-attachment a {
        color: #d1d5db;
    }
`;
