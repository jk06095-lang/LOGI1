import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Type, List, ListOrdered, Image as ImageIcon, Link as LinkIcon, Paperclip, CheckSquare, MoreHorizontal, Table as TableIcon, Plus, X, ArrowRight, ArrowDown, Trash2 } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../../store/uiStore';
import { getToolboxStrings, ToolboxStrings } from '../i18n';

interface RichEditorProps {
    initialContent?: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

// --- Icons & Types ---
type CommandType = 'h1' | 'h2' | 'ul' | 'ol' | 'checklist' | 'table' | 'image' | 'file' | 'hr';

// --- Smart Components ---

const ToolbarButton: React.FC<{ icon: any, onClick: () => void, tooltip: string, active?: boolean }> = ({ icon: Icon, onClick, tooltip, active }) => (
    <button
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={`p-2 rounded-md transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`}
        title={tooltip}
    >
        <Icon size={18} strokeWidth={2} />
    </button>
);



// 1. Table Grid Picker (Navigable)
interface TableGridPickerProps {
    onSelect: (rows: number, cols: number) => void;
    currentRows: number;
    currentCols: number;
    onHover: (r: number, c: number) => void;
    useArrowKeysText?: string;
    insertTableText?: string;
}

const TableGridPicker: React.FC<TableGridPickerProps> = ({ onSelect, currentRows, currentCols, onHover, useArrowKeysText, insertTableText }) => {
    return (
        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-[240px]">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{insertTableText || 'Insert Table'}</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{currentRows} × {currentCols}</span>
            </div>
            <div
                className="grid grid-cols-10 gap-1"
                onMouseLeave={() => onHover(0, 0)}
            >
                {Array.from({ length: 100 }).map((_, i) => {
                    const r = Math.floor(i / 10) + 1;
                    const c = (i % 10) + 1;
                    const isActive = r <= currentRows && c <= currentCols;
                    return (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-[2px] border transition-all duration-75 ${isActive
                                ? 'bg-blue-500 border-blue-600'
                                : 'bg-gray-100 dark:bg-slate-700 border-transparent hover:border-gray-300'}`}
                            onMouseEnter={() => onHover(r, c)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(r, c); }}
                        />
                    );
                })}
            </div>
            <div className="mt-2 text-[10px] text-center text-gray-400">
                {useArrowKeysText || 'Use arrow keys or mouse to select size'}
            </div>
        </div>
    );
};

// 2. Smart Slash Menu
interface SlashMenuProps {
    position: { top: number; left: number; align: 'left' | 'right' };
    selectedIndex: number;
    onSelect: (cmd: CommandType) => void;
    tablePickerState?: { rows: number; cols: number } | null; // If non-null, we show picker
    onTableHover: (r: number, c: number) => void;
    onTableSelect: (r: number, c: number) => void;
}

const SlashMenu: React.FC<SlashMenuProps & { t: ToolboxStrings }> = ({ position, selectedIndex, onSelect, tablePickerState, onTableHover, onTableSelect, t }) => {
    const menuItems: { id: CommandType; label: string; icon: any; desc: string }[] = [
        { id: 'h1', label: t.heading1, icon: Type, desc: t.heading1Desc },
        { id: 'h2', label: t.heading2, icon: Type, desc: t.heading2Desc },
        { id: 'ul', label: t.bulletedList, icon: List, desc: t.bulletedListDesc },
        { id: 'ol', label: t.numberedList, icon: ListOrdered, desc: t.numberedListDesc },
        { id: 'checklist', label: t.taskList, icon: CheckSquare, desc: t.taskListDesc },
        { id: 'table', label: t.table, icon: TableIcon, desc: t.tableDesc },
        { id: 'image', label: t.image, icon: ImageIcon, desc: t.imageDesc },
        { id: 'file', label: t.file, icon: Paperclip, desc: t.fileDesc },
        { id: 'hr', label: t.divider, icon: MoreHorizontal, desc: t.dividerDesc },
    ];

    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        if (itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    return (
        <div
            className="fixed z-[2000] flex items-start"
            style={{
                top: position.top,
                left: position.align === 'left' ? position.left : undefined,
                right: position.align === 'right' ? (window.innerWidth - position.left) : undefined,
                flexDirection: position.align === 'right' ? 'row-reverse' : 'row'
            }}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 w-64 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-900/50">
                    Basic Blocks
                </div>
                <div className="max-h-[320px] overflow-y-auto py-1 custom-scrollbar">
                    {menuItems.map((item, index) => (
                        <button
                            key={item.id}
                            ref={el => itemRefs.current[index] = el}
                            onClick={() => onSelect(item.id)}
                            onMouseEnter={() => {
                                // optional: update index on hover
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                        >
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${index === selectedIndex ? 'border-blue-200 text-blue-500 bg-white dark:bg-slate-800' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500'}`}>
                                <item.icon size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.label}</p>
                                <p className="text-[10px] text-gray-400">{item.desc}</p>
                            </div>
                            {item.id === 'table' && <ArrowRight size={12} className="ml-auto text-gray-300" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submenu for Table */}
            {tablePickerState && (
                <div className={`mx-2 animate-in fade-in slide-in-from-${position.align === 'left' ? 'left' : 'right'}-2`}>
                    <TableGridPicker
                        currentRows={tablePickerState.rows}
                        currentCols={tablePickerState.cols}
                        onSelect={onTableSelect}
                        onHover={onTableHover}
                    />
                </div>
            )}
        </div>
    );
};

// 3. Floating Table Menu
const TableBubbleMenu: React.FC<{
    position: { top: number; left: number };
    onAddRow: () => void;
    onAddCol: () => void;
    onDelete: () => void;
}> = ({ position, onAddRow, onAddCol, onDelete }) => {
    return (
        <div
            className="fixed z-[1900] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 flex items-center p-1 space-x-1 animate-in fade-in zoom-in-95"
            style={{ top: position.top - 40, left: position.left }}
        >
            <button onMouseDown={(e) => { e.preventDefault(); onAddRow(); }} className="flex items-center space-x-1 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-600 dark:text-gray-300">
                <ArrowDown size={12} />
                <span>Row</span>
            </button>
            <div className="w-px h-3 bg-gray-200 dark:bg-slate-700" />
            <button onMouseDown={(e) => { e.preventDefault(); onAddCol(); }} className="flex items-center space-x-1 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-600 dark:text-gray-300">
                <ArrowRight size={12} />
                <span>Col</span>
            </button>
            <div className="w-px h-3 bg-gray-200 dark:bg-slate-700" />
            <button onMouseDown={(e) => { e.preventDefault(); onDelete(); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                <Trash2 size={12} />
            </button>
        </div>
    );
};

export const RichEditor: React.FC<RichEditorProps> = ({ initialContent = '', onChange, placeholder }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [slashMenu, setSlashMenu] = useState<{ show: boolean; top: number; left: number; align: 'left' | 'right' } | null>(null);
    const [slashIndex, setSlashIndex] = useState(0);
    const [showTablePicker, setShowTablePicker] = useState<boolean>(false); // Toolbar picker
    const [tableHoverState, setTableHoverState] = useState({ rows: 3, cols: 3 });

    const [tableBubble, setTableBubble] = useState<{ show: boolean; top: number; left: number } | null>(null);
    const [activeTableElement, setActiveTableElement] = useState<HTMLTableElement | null>(null);

    // Derived
    const SLASH_ITEMS_COUNT = 9;

    useEffect(() => {
        if (contentRef.current && !contentRef.current.innerHTML && initialContent) {
            contentRef.current.innerHTML = initialContent;
        }
        if (contentRef.current && !initialContent) {
            contentRef.current.focus();
        }
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const handleInput = () => {
        if (contentRef.current) {
            onChange(contentRef.current.innerHTML);
        }
        if (activeTableElement && !contentRef.current?.contains(activeTableElement)) {
            setTableBubble(null);
            setActiveTableElement(null);
        }
    };

    const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        // Check for table context
        let node = selection.anchorNode;
        let foundTable = false;
        while (node && contentRef.current?.contains(node)) {
            if (node instanceof HTMLTableCellElement || (node instanceof HTMLElement && node.tagName === 'TD')) {
                const table = node.closest('table');
                if (table) {
                    const rect = table.getBoundingClientRect();
                    setTableBubble({ show: true, top: rect.top, left: rect.left });
                    setActiveTableElement(table);
                    foundTable = true;
                }
                break;
            }
            node = node.parentNode;
        }
        if (!foundTable) {
            setTableBubble(null);
            setActiveTableElement(null);
        }
    };

    const checkSlashCommand = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Smart Positioning
        const MENU_WIDTH = 280; // approx
        const PADDING = 10;

        let left = rect.right + PADDING;
        let align: 'left' | 'right' = 'left';

        // Check right edge
        if (left + MENU_WIDTH + PADDING > window.innerWidth) {
            left = rect.left - PADDING;
            align = 'right';
        }

        let top = rect.top;
        if (top + 300 > window.innerHeight) {
            top = window.innerHeight - 300 - PADDING;
        }

        setSlashMenu({ show: true, top, left, align });
        setSlashIndex(0);
        setTableHoverState({ rows: 3, cols: 3 }); // Reset table picker
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === '/') {
            setTimeout(checkSlashCommand, 10);
        }

        if (slashMenu) {
            // Navigation
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {

                if (e.key === 'Escape') {
                    e.preventDefault();
                    setSlashMenu(null);
                    return;
                }

                // If looking at main menu
                if (slashIndex === 5) { // Table Item (index 5)
                    // Enter table mode logic
                    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        // We are navigating grid IF we are in table mode? 
                        // Logic: If user hits right arrow on 'Table', or if they simply navigate up/down?
                        // Request said "arrow keys to adjust rows/cols".
                        // My implementation: When 'Table' is selected (slashIndex 5), arrows manipulate grid if intention is clear?
                        // Let's say ArrowRight locks focus into grid? Or just direct manipulation.
                        // But Up/Down is used for list nav.
                        // Conflict: ArrowDown moves to next menu item OR increases table rows?

                        // Solution: ArrowRight activates "Grid Control Mode"?
                        // Or purely rely on mouse? User asked for keyboard.

                        // Re-read request: "Use arrow keys to adjust rows/cols"
                        // Maybe we need a specific 'Grid Focus' state.
                        // Let's assume ArrowRight enters "Grid Focus".
                    }
                }

                // Let's simplify: 
                // Vertical (Up/Down) navigates Menu.
                // IF Table is selected, Right Arrow might increase cols? But how to increase rows? (Down arrow moves menu).

                // Better UX: 
                // Navigate to Table -> Press Right Arrow -> Enter "Grid Selection Mode".
                // In Grid Selection Mode: Up/Down/Left/Right changes grid size. Enter confirms. Esc exits to menu.

                // I'll implement "Grid Selection Mode" implied.
                // But for now, let's keep it simple as I coded in `WritePostModal`: 
                // The current code I wrote in the `replace_file_content` (step 29 proposal) had some commented logic.
                // I will refine it here.

                // Logic:
                // 1. Up/Down navigates List.
                // 2. If 'Table' is selected:
                //    - Right Arrow -> Enters Grid Mode? Or just increases cols?
                //    - If I use Right Arrow to increase cols, I can't leave menu?

                // Updated Logic:
                // Standard Up/Down moves selection.
                // If Item is Table:
                //   Right Arrow -> Enters "Grid Mode" (slashIndex stays 5, but we toggle a boolean `gridMode`).

            }
        }

        // I'll stick to the code mostly as written but refine the key handler in the actual implementation below.
        // Since I'm writing the file now, I have control.
    };

    // ... I will put the refined handleKeyDown inside the component below ...
    return <RichEditorImplementation {...{ initialContent, onChange, placeholder }} />;
};

// ... Real implementation ...

// Editor CSS Styles (inline since Tailwind Typography not available)
const editorStyles = `
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
    }
    .rich-editor-content td, .rich-editor-content th {
        border: 1px solid #d1d5db;
        padding: 0.5em;
        min-width: 50px;
    }
    .rich-editor-content a {
        color: #3b82f6;
        text-decoration: underline;
    }
    .rich-editor-content strong, .rich-editor-content b {
        font-weight: 700;
    }
    .rich-editor-content em, .rich-editor-content i {
        font-style: italic;
    }
    .dark .rich-editor-content h1,
    .dark .rich-editor-content h2,
    .dark .rich-editor-content h3 {
        color: #f3f4f6;
    }
    .dark .rich-editor-content hr {
        border-top-color: #374151;
    }
    .dark .rich-editor-content td, .dark .rich-editor-content th {
        border-color: #4b5563;
    }
`;

const RichEditorImplementation: React.FC<RichEditorProps> = ({ initialContent = '', onChange, placeholder }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);

    // Placeholder visibility state
    const [hasContent, setHasContent] = useState(!!initialContent);

    const [slashMenu, setSlashMenu] = useState<{ show: boolean; top: number; left: number; align: 'left' | 'right' } | null>(null);
    const [slashIndex, setSlashIndex] = useState(0);
    const [gridMode, setGridMode] = useState(false); // New state for keyboard grid nav
    const [showTablePicker, setShowTablePicker] = useState<boolean>(false);
    const [tableHoverState, setTableHoverState] = useState({ rows: 3, cols: 3 });

    const [tableBubble, setTableBubble] = useState<{ show: boolean; top: number; left: number } | null>(null);
    const [activeTableElement, setActiveTableElement] = useState<HTMLTableElement | null>(null);

    const SLASH_ITEMS_COUNT = 9;

    useEffect(() => {
        if (contentRef.current && !contentRef.current.innerHTML && initialContent) {
            contentRef.current.innerHTML = initialContent;
        }
        if (contentRef.current && !initialContent) {
            contentRef.current.focus();
        }
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const handleInput = () => {
        if (contentRef.current) {
            const html = contentRef.current.innerHTML;
            // Update content state for placeholder visibility
            // Check for text content OR any meaningful elements (headings, lists, tables, etc.)
            const textContent = contentRef.current.textContent || '';
            const hasElements = contentRef.current.querySelector('h1, h2, h3, ul, ol, table, hr, img, blockquote, input[type="checkbox"]') !== null;
            setHasContent(textContent.trim().length > 0 || hasElements);
            onChange(html);

            // Auto-Markdown Triggers
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const node = range.startContainer;

                // Only trigger if we are in a text node
                if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                    const text = node.textContent;

                    // Check for patterns
                    // We check the end of the text content because user just typed space
                    // But simplest is to check exact match if the block is empty? 
                    // Or check if it ends with the pattern and just typed space.

                    // Optimization: Only check if last char is space (u00A0 or normal space)
                    // Since 'input' fires after character insertion.

                    // Pattern 1: Heading 1 "# "
                    if (text === '# ' || text === '#\u00A0') {
                        execCommand('formatBlock', '<H1>');
                        // We need to clear the specific text "# " from the node?
                        // formatBlock usually keeps the text.
                        // So we should delete the "# " characters.
                        // This is tricky with execCommand.
                        // Better approach:
                        // 1. Delete content of current block.
                        // 2. Format block.
                        // But that deletes user context if they typed "# " in middle.
                        // Usually markdown align is at start.

                        // Let's rely on simplistic replacement for now:
                        // If the whole text node is "# ", clear it and format.
                        node.textContent = '';
                        execCommand('formatBlock', '<H1>');
                    }
                    // Pattern 2: Heading 2 "## "
                    else if (text === '## ' || text === '##\u00A0') {
                        node.textContent = '';
                        execCommand('formatBlock', '<H2>');
                    }
                    // Pattern 3: Bullet "- "
                    else if (text === '- ' || text === '-\u00A0') {
                        node.textContent = '';
                        execCommand('insertUnorderedList');
                    }
                    // Pattern 4: Numbered "1. "
                    else if (text === '1. ' || text === '1.\u00A0') {
                        node.textContent = '';
                        execCommand('insertOrderedList');
                    }
                    // Pattern 5: Task "[] "
                    else if (text === '[] ' || text === '[]\u00A0') {
                        node.textContent = '';
                        // Insert checklist HTML
                        insertHtml('<div class="flex items-center space-x-2 my-1"><input type="checkbox" /> <span contenteditable="true"></span></div><p><br/></p>');
                    }
                }
            }
        }

        if (activeTableElement && !contentRef.current?.contains(activeTableElement)) {
            setTableBubble(null);
            setActiveTableElement(null);
        }
    };

    const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        let node = selection.anchorNode;
        let foundTable = false;
        while (node && contentRef.current?.contains(node)) {
            if (node instanceof HTMLTableCellElement || (node instanceof HTMLElement && node.tagName === 'TD')) {
                const table = node.closest('table');
                if (table) {
                    const rect = table.getBoundingClientRect();
                    setTableBubble({ show: true, top: rect.top, left: rect.left });
                    setActiveTableElement(table);
                    foundTable = true;
                }
                break;
            }
            node = node.parentNode;
        }
        if (!foundTable) {
            setTableBubble(null);
            setActiveTableElement(null);
        }
    };

    // ... (checkSlashCommand same as above, just ensure it resets gridMode)
    const checkSlashCommand = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const MENU_WIDTH = 280;
        const PADDING = 10;
        let left = rect.right + PADDING;
        let align: 'left' | 'right' = 'left';
        if (left + MENU_WIDTH + PADDING > window.innerWidth) {
            left = rect.left - PADDING;
            align = 'right';
        }
        let top = rect.top;
        if (top + 300 > window.innerHeight) top = window.innerHeight - 300 - PADDING;
        setSlashMenu({ show: true, top, left, align });
        setSlashIndex(0);
        setGridMode(false);
        setTableHoverState({ rows: 3, cols: 3 });
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Undo/Redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            document.execCommand('undo');
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            document.execCommand('redo');
            return;
        }

        if (e.key === '/') {
            // Check if we are ALREADY in a slash menu? No, typing slash opens it.
            // Delay to allow char insertion then check
            setTimeout(checkSlashCommand, 10);
        }

        if (slashMenu) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) {
                e.preventDefault();

                if (e.key === 'Escape') {
                    if (gridMode) {
                        setGridMode(false);
                    } else {
                        setSlashMenu(null);
                    }
                    return;
                }

                const commands: CommandType[] = ['h1', 'h2', 'ul', 'ol', 'checklist', 'table', 'image', 'file', 'hr'];
                const isTableSelected = commands[slashIndex] === 'table';

                if (gridMode && isTableSelected) {
                    // Grid Navigation
                    let { rows, cols } = tableHoverState;
                    if (e.key === 'ArrowRight') cols = Math.min(cols + 1, 10);
                    if (e.key === 'ArrowLeft') cols = Math.max(cols - 1, 1);
                    if (e.key === 'ArrowDown') rows = Math.min(rows + 1, 10);
                    if (e.key === 'ArrowUp') rows = Math.max(rows - 1, 1);

                    if (e.key === 'Enter') {
                        insertTable(rows, cols);
                        setSlashMenu(null);
                    }

                    setTableHoverState({ rows, cols });
                    return;
                }

                // Normal Menu Navigation
                if (e.key === 'ArrowDown') {
                    setSlashIndex(prev => (prev + 1) % SLASH_ITEMS_COUNT);
                } else if (e.key === 'ArrowUp') {
                    setSlashIndex(prev => (prev - 1 + SLASH_ITEMS_COUNT) % SLASH_ITEMS_COUNT);
                } else if (e.key === 'ArrowRight' && isTableSelected) {
                    setGridMode(true);
                } else if (e.key === 'Enter') {
                    if (isTableSelected) {
                        // If just pressed enter on Table without Grid Mode, insert default?
                        // Or maybe Enter enters Grid Mode?
                        // Let's standard: Enter inserts default 3x3 OR if we want to be fancy, enters grid mode.
                        // User said: "Keyboard arrow keys to adjust".
                        // Let's make Enter insert 3x3 (current hover state).
                        insertTable(tableHoverState.rows, tableHoverState.cols);
                        setSlashMenu(null);
                    } else {
                        handleSlashSelect(commands[slashIndex]);
                    }
                }
                return;
            }
            // Close if typing other text
            if (!['/'].includes(e.key)) {
                setSlashMenu(null);
            }
        }
    };

    const handleSlashSelect = (commandId: CommandType) => {
        document.execCommand('delete', false);
        setSlashMenu(null);
        setTimeout(() => {
            contentRef.current?.focus();
            switch (commandId) {
                case 'h1': document.execCommand('formatBlock', false, '<H1>'); break;
                case 'h2': document.execCommand('formatBlock', false, '<H2>'); break;
                case 'ul': document.execCommand('insertUnorderedList'); break;
                case 'ol': document.execCommand('insertOrderedList'); break;
                case 'checklist': insertHtml('<div class="flex items-center space-x-2 my-1"><input type="checkbox" /> <span contenteditable="true">Task item</span></div><p><br/></p>'); break;
                case 'hr': insertHtml('<hr class="my-4 border-gray-200" /><p><br/></p>'); break;
                case 'table': insertTable(3, 3); break;
                case 'image':
                case 'file': fileInputRef.current?.click(); break;
            }
            handleInput();
        }, 10);
    };

    const insertHtml = (html: string) => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node;
        while ((node = div.firstChild)) frag.appendChild(node);
        range.insertNode(frag);
        range.collapse(false);
    };

    const insertTable = (rows: number, cols: number) => {
        let html = '<table class="w-full border-collapse border border-gray-200 dark:border-gray-700 my-4 table-fixed"><tbody>';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                html += '<td class="border border-gray-300 dark:border-gray-600 p-2 min-w-[50px] relative group"><br/></td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table><p><br/></p>';
        insertHtml(html);
        handleInput();
    };

    // ... Add/Delete Row/Col ...
    const addRow = () => {
        if (!activeTableElement) return;
        const cols = activeTableElement.rows[0].cells.length;
        const row = activeTableElement.insertRow();
        for (let i = 0; i < cols; i++) {
            const cell = row.insertCell();
            cell.className = "border border-gray-300 dark:border-gray-600 p-2 min-w-[50px] relative group";
            cell.innerHTML = "<br/>";
        }
        handleInput();
    };
    const addCol = () => {
        if (!activeTableElement) return;
        const rows = activeTableElement.rows;
        for (let i = 0; i < rows.length; i++) {
            const cell = rows[i].insertCell();
            cell.className = "border border-gray-300 dark:border-gray-600 p-2 min-w-[50px] relative group";
            cell.innerHTML = "<br/>";
        }
        handleInput();
    };
    const deleteTable = () => {
        activeTableElement?.remove();
        setActiveTableElement(null);
        setTableBubble(null);
        handleInput();
    };

    const execCommand = (cmd: string, arg?: string) => {
        document.execCommand(cmd, false, arg);
        contentRef.current?.focus();
        handleInput();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative group">
            <style>{editorStyles}</style>
            <input type="file" ref={fileInputRef} className="hidden" />
            <div className="flex items-center space-x-1 p-2 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} tooltip={t.bold} />
                <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} tooltip={t.italic} />
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <ToolbarButton icon={Type} onClick={() => execCommand('formatBlock', '<H2>')} tooltip={t.heading} />
                <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} tooltip={t.list} />
                <ToolbarButton icon={CheckSquare} onClick={() => handleSlashSelect('checklist')} tooltip={t.task} />
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <div className="relative">
                    <ToolbarButton icon={TableIcon} onClick={() => setShowTablePicker(!showTablePicker)} tooltip={t.table} active={showTablePicker} />
                    {showTablePicker && (
                        <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="fixed inset-0" onClick={() => setShowTablePicker(false)} />
                            <div className="relative z-50">
                                <TableGridPicker
                                    onSelect={(r, c) => { insertTable(r, c); setShowTablePicker(false); }}
                                    currentRows={tableHoverState.rows}
                                    currentCols={tableHoverState.cols}
                                    onHover={(rows, cols) => setTableHoverState({ rows, cols })}
                                    insertTableText={t.insertTable}
                                    useArrowKeysText={t.useArrowKeys}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <ToolbarButton icon={ImageIcon} onClick={() => fileInputRef.current?.click()} tooltip={t.image} />
            </div>

            <div className="flex-1 overflow-y-auto relative bg-white dark:bg-slate-900 cursor-text" onClick={() => { if (contentRef.current !== document.activeElement) contentRef.current?.focus(); }}>
                <div
                    ref={contentRef}
                    contentEditable
                    className="rich-editor-content min-h-full p-6 focus:outline-none text-gray-800 dark:text-gray-200"
                    onKeyDown={handleKeyDown}
                    onInput={handleInput}
                />
                {!hasContent && (
                    <div className="absolute top-6 left-6 text-gray-400 pointer-events-none select-none">{placeholder || t.editorPlaceholder}</div>
                )}
            </div>

            {slashMenu && (
                <>
                    <div className="fixed inset-0 z-[1999]" onClick={() => setSlashMenu(null)} />
                    <SlashMenu
                        position={slashMenu}
                        selectedIndex={slashIndex}
                        onSelect={handleSlashSelect}
                        tablePickerState={slashIndex === 5 || gridMode ? tableHoverState : null}
                        onTableHover={(r, c) => setTableHoverState({ rows: r, cols: c })}
                        onTableSelect={(r, c) => { insertTable(r, c); setSlashMenu(null); }}
                        t={t}
                    />
                </>
            )}

            {tableBubble && <TableBubbleMenu position={tableBubble} onAddRow={addRow} onAddCol={addCol} onDelete={deleteTable} />}
        </div>
    );
};
