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
    
    /* File Attachment Styles - Notion-style Block */
    .rich-editor-content .file-attachment {
        display: flex;
        width: 100%;
        margin: 0.75em 0;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        background-color: #f9fafb;
        transition: all 0.2s ease;
        overflow: hidden;
        user-select: none;
    }
    .rich-editor-content .file-attachment:hover {
        background-color: #f3f4f6;
        border-color: #d1d5db;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transform: translateY(-1px);
    }
    .rich-editor-content .file-attachment a {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 12px 16px;
        gap: 14px;
        text-decoration: none !important;
        color: inherit !important;
        cursor: pointer;
    }
    .rich-editor-content .file-attachment .file-icon {
        font-size: 28px;
        line-height: 1;
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background-color: #eef2ff;
    }
    .rich-editor-content .file-attachment .file-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        gap: 2px;
    }
    .rich-editor-content .file-attachment .file-name {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.4;
    }
    .rich-editor-content .file-attachment .file-meta {
        font-size: 12px;
        color: #9ca3af;
        font-weight: 400;
        line-height: 1.3;
    }
    .rich-editor-content .file-attachment .file-download {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 700;
        color: #9ca3af;
        background-color: transparent;
        transition: all 0.15s ease;
    }
    .rich-editor-content .file-attachment:hover .file-download {
        background-color: #e5e7eb;
        color: #6b7280;
    }

    /* File Type Color Accents */
    .rich-editor-content .file-attachment.file-type-pdf .file-icon {
        background-color: #fef2f2;
        color: #dc2626;
    }
    .rich-editor-content .file-attachment.file-type-excel .file-icon {
        background-color: #f0fdf4;
        color: #16a34a;
    }
    .rich-editor-content .file-attachment.file-type-word .file-icon {
        background-color: #eff6ff;
        color: #2563eb;
    }
    .rich-editor-content .file-attachment.file-type-ppt .file-icon {
        background-color: #fff7ed;
        color: #ea580c;
    }
    .rich-editor-content .file-attachment.file-type-archive .file-icon {
        background-color: #faf5ff;
        color: #9333ea;
    }
    .rich-editor-content .file-attachment.file-type-text .file-icon {
        background-color: #f0fdf4;
        color: #65a30d;
    }
    .rich-editor-content .file-attachment.file-type-default .file-icon {
        background-color: #f1f5f9;
        color: #64748b;
    }

    /* File Type Color Accents - Left Border */
    .rich-editor-content .file-attachment.file-type-pdf { border-left: 3px solid #ef4444; }
    .rich-editor-content .file-attachment.file-type-excel { border-left: 3px solid #22c55e; }
    .rich-editor-content .file-attachment.file-type-word { border-left: 3px solid #3b82f6; }
    .rich-editor-content .file-attachment.file-type-ppt { border-left: 3px solid #f97316; }
    .rich-editor-content .file-attachment.file-type-archive { border-left: 3px solid #a855f7; }
    .rich-editor-content .file-attachment.file-type-text { border-left: 3px solid #84cc16; }
    .rich-editor-content .file-attachment.file-type-default { border-left: 3px solid #94a3b8; }

    /* Dark Mode - File Attachment */
    .dark .rich-editor-content .file-attachment {
        background-color: #1e293b;
        border-color: #334155;
    }
    .dark .rich-editor-content .file-attachment:hover {
        background-color: #273548;
        border-color: #475569;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .dark .rich-editor-content .file-attachment .file-name {
        color: #e2e8f0;
    }
    .dark .rich-editor-content .file-attachment .file-meta {
        color: #64748b;
    }
    .dark .rich-editor-content .file-attachment .file-download {
        color: #64748b;
    }
    .dark .rich-editor-content .file-attachment:hover .file-download {
        background-color: #334155;
        color: #94a3b8;
    }
    .dark .rich-editor-content .file-attachment.file-type-pdf .file-icon { background-color: rgba(239,68,68,0.15); }
    .dark .rich-editor-content .file-attachment.file-type-excel .file-icon { background-color: rgba(34,197,94,0.15); }
    .dark .rich-editor-content .file-attachment.file-type-word .file-icon { background-color: rgba(59,130,246,0.15); }
    .dark .rich-editor-content .file-attachment.file-type-ppt .file-icon { background-color: rgba(249,115,22,0.15); }
    .dark .rich-editor-content .file-attachment.file-type-archive .file-icon { background-color: rgba(168,85,247,0.15); }
    .dark .rich-editor-content .file-attachment.file-type-text .file-icon { background-color: rgba(132,204,22,0.15); }
    .dark .rich-editor-content .file-attachment.file-type-default .file-icon { background-color: rgba(148,163,184,0.15); }
    .dark .rich-editor-content .file-attachment.file-type-pdf { border-left-color: #dc2626; }
    .dark .rich-editor-content .file-attachment.file-type-excel { border-left-color: #16a34a; }
    .dark .rich-editor-content .file-attachment.file-type-word { border-left-color: #2563eb; }
    .dark .rich-editor-content .file-attachment.file-type-ppt { border-left-color: #ea580c; }
    .dark .rich-editor-content .file-attachment.file-type-archive { border-left-color: #9333ea; }
    .dark .rich-editor-content .file-attachment.file-type-text { border-left-color: #65a30d; }
    .dark .rich-editor-content .file-attachment.file-type-default { border-left-color: #64748b; }
`;
