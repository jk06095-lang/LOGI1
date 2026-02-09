import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Type, List, ListOrdered, Image as ImageIcon, Link as LinkIcon, Paperclip, CheckSquare, MoreHorizontal, Table as TableIcon, Plus, Minus, X, ArrowRight, ArrowDown, Trash2, Indent, Outdent } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../lib/firebase';

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../../store/uiStore';
import { getToolboxStrings, ToolboxStrings } from '../i18n';
import { editorStyles } from '../styles/editorStyles';

const ALLOWED_MIME_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    docs: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/markdown', 'text/csv'],
    archives: ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed']
};
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
        <div
            className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-[240px] overflow-hidden"
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
        >
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
                            className={`w-4 h-4 rounded-[2px] border transition-all duration-75 text-[8px] flex items-center justify-center ${isActive
                                ? 'bg-blue-500 border-blue-600'
                                : 'bg-gray-100 dark:bg-slate-700 border-transparent hover:border-gray-300'}`}
                            onMouseEnter={() => onHover(r, c)}
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

// 2. Smart Slash Menu - Notion-like positioning (directly next to cursor)
interface SlashMenuProps {
    position: { top: number; left: number; maxHeight: number };
    selectedIndex: number;
    onSelect: (cmd: CommandType) => void;
    tablePickerState?: { rows: number; cols: number } | null;
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
            className="fixed z-[2000] flex items-start gap-2"
            style={{
                top: position.top,
                left: position.left,
            }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 w-64 flex flex-col animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                style={{ maxHeight: position.maxHeight }}
            >
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-900/50 flex-none z-10">
                    Basic Blocks
                </div>
                <div className="overflow-y-auto py-1 custom-scrollbar flex-1">
                    {menuItems.map((item, index) => (
                        <button
                            key={item.id}
                            ref={el => { itemRefs.current[index] = el; }}
                            onClick={() => onSelect(item.id)}
                            className={`w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                        >
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-none transition-colors ${index === selectedIndex ? 'border-blue-200 text-blue-500 bg-white dark:bg-slate-800' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500'}`}>
                                <item.icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{item.label}</p>
                                <p className="text-[10px] text-gray-400 truncate">{item.desc}</p>
                            </div>
                            {item.id === 'table' && <ArrowRight size={12} className="ml-auto text-gray-300 flex-none" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submenu for Table - positioned to the side */}
            {tablePickerState && (
                <div className="ml-2 animate-in fade-in slide-in-from-left-2">
                    <TableGridPicker
                        currentRows={tablePickerState.rows}
                        currentCols={tablePickerState.cols}
                        onSelect={onTableSelect}
                        onHover={onTableHover}
                        insertTableText={t.insertTable}
                        useArrowKeysText={t.useArrowKeys}
                    />
                </div>
            )}
        </div>
    );
};

// 3. Notion-like Table Controls with resize handles
const TableControls: React.FC<{
    tableElement: HTMLTableElement;
    onAddRow: () => void;
    onAddCol: () => void;
    onDeleteRow: () => void;
    onDeleteCol: () => void;
    onDelete: () => void;
    canDeleteRow: boolean;
    canDeleteCol: boolean;
}> = ({ tableElement, onAddRow, onAddCol, onDeleteRow, onDeleteCol, onDelete, canDeleteRow, canDeleteCol }) => {
    // Get fresh rect on every render
    const rect = tableElement.getBoundingClientRect();

    // Visual constants
    const BUTTON_SIZE = 24;
    const GAP = 8;
    const EDGE_PADDING = 12;

    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // === Column buttons (right side of table, vertically stacked) ===
    const COL_BUTTONS_HEIGHT = canDeleteCol ? (BUTTON_SIZE * 2 + 4) : BUTTON_SIZE;
    let colButtonsLeft = rect.right + GAP;
    let colButtonsTop = rect.top + (rect.height / 2) - (COL_BUTTONS_HEIGHT / 2);

    // Clamp horizontally
    if (colButtonsLeft + BUTTON_SIZE > viewportWidth - EDGE_PADDING) {
        colButtonsLeft = viewportWidth - BUTTON_SIZE - EDGE_PADDING;
    }
    // Clamp vertically
    if (colButtonsTop < EDGE_PADDING) colButtonsTop = EDGE_PADDING;
    if (colButtonsTop + COL_BUTTONS_HEIGHT > viewportHeight - EDGE_PADDING) {
        colButtonsTop = viewportHeight - COL_BUTTONS_HEIGHT - EDGE_PADDING;
    }

    // === Row buttons (bottom of table, horizontally centered) ===
    const ROW_BUTTONS_WIDTH = canDeleteRow ? (BUTTON_SIZE * 2 + 4) : BUTTON_SIZE;
    let rowButtonsLeft = rect.left + (rect.width / 2) - (ROW_BUTTONS_WIDTH / 2);
    let rowButtonsTop = rect.bottom + GAP;

    // Clamp vertically
    if (rowButtonsTop + BUTTON_SIZE > viewportHeight - EDGE_PADDING) {
        rowButtonsTop = viewportHeight - BUTTON_SIZE - EDGE_PADDING;
    }
    // Clamp horizontally
    if (rowButtonsLeft < EDGE_PADDING) rowButtonsLeft = EDGE_PADDING;
    if (rowButtonsLeft + ROW_BUTTONS_WIDTH > viewportWidth - EDGE_PADDING) {
        rowButtonsLeft = viewportWidth - ROW_BUTTONS_WIDTH - EDGE_PADDING;
    }

    // === Delete button (top-left corner, outside table) ===
    let deleteLeft = rect.left - BUTTON_SIZE - GAP;
    let deleteTop = rect.top - BUTTON_SIZE - GAP;

    // Clamp to ensure it stays in viewport
    if (deleteLeft < EDGE_PADDING) deleteLeft = EDGE_PADDING;
    if (deleteTop < EDGE_PADDING) deleteTop = EDGE_PADDING;

    return (
        <>
            {/* Delete Table Button (Top-Left corner) */}
            <button
                className="fixed z-[1900] flex items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 text-gray-400 hover:text-red-500 transition-all duration-150 cursor-pointer"
                style={{
                    top: deleteTop,
                    left: deleteLeft,
                    width: BUTTON_SIZE,
                    height: BUTTON_SIZE,
                }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                title="테이블 삭제"
            >
                <Trash2 size={12} />
            </button>



            {/* Column Buttons (Right side - vertical stack) */}
            <div
                className="fixed z-[1900] flex flex-col items-center gap-1"
                style={{
                    top: colButtonsTop,
                    left: colButtonsLeft,
                }}
            >
                <button
                    className="flex items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 text-gray-400 hover:text-blue-500 transition-all duration-150 cursor-pointer"
                    style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAddCol(); }}
                    title="열 추가"
                >
                    <Plus size={14} strokeWidth={2.5} />
                </button>
                {canDeleteCol && (
                    <button
                        className="flex items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 text-gray-400 hover:text-red-500 transition-all duration-150 cursor-pointer"
                        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteCol(); }}
                        title="열 삭제"
                    >
                        <Minus size={14} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {/* Row Buttons (Bottom) */}
            <div
                className="fixed z-[1900] flex items-center gap-1"
                style={{
                    top: rowButtonsTop,
                    left: rowButtonsLeft,
                }}
            >
                <button
                    className="flex items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 text-gray-400 hover:text-blue-500 transition-all duration-150 cursor-pointer"
                    style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAddRow(); }}
                    title="행 추가"
                >
                    <Plus size={14} strokeWidth={2.5} />
                </button>
                {canDeleteRow && (
                    <button
                        className="flex items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 text-gray-400 hover:text-red-500 transition-all duration-150 cursor-pointer"
                        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteRow(); }}
                        title="행 삭제"
                    >
                        <Minus size={14} strokeWidth={2.5} />
                    </button>
                )}
            </div>
        </>
    );
};

// Wrapper Component
export const RichEditor: React.FC<RichEditorProps> = (props) => {
    return <RichEditorImplementation {...props} />;
};

// ... Real implementation ...

// Editor CSS Styles (inline since Tailwind Typography not available)
// Editor CSS Styles imported from ../styles/editorStyles

const RichEditorImplementation: React.FC<RichEditorProps> = ({ initialContent = '', onChange, placeholder }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);

    // Placeholder visibility state
    const [hasContent, setHasContent] = useState(!!initialContent);

    const [slashMenu, setSlashMenu] = useState<{ show: boolean; top: number; left: number; maxHeight: number } | null>(null);
    const [slashIndex, setSlashIndex] = useState(0);
    const [gridMode, setGridMode] = useState(false); // New state for keyboard grid nav
    const [showTablePicker, setShowTablePicker] = useState<boolean>(false);
    const [tableHoverState, setTableHoverState] = useState({ rows: 3, cols: 3 });
    const [tableRect, setTableRect] = useState<DOMRect | null>(null);
    const [activeTableElement, setActiveTableElement] = useState<HTMLTableElement | null>(null);

    const SLASH_ITEMS_COUNT = 9;

    const handleScroll = useCallback((e: Event) => {
        // Fix: Ignore events bubbling from inside the SlashMenu (which uses 'custom-scrollbar') or other popups
        const target = e.target;

        if (target instanceof HTMLElement && target.classList.contains('custom-scrollbar')) {
            return;
        }

        if (activeTableElement) {
            setTableRect(activeTableElement.getBoundingClientRect());
        }

        if (slashMenu) {
            // Only hide slash menu on MAIN window scroll/resize, not internal scrolls
            const isGlobal = target === document || target === window;
            const isParent = target instanceof Node && contentRef.current && (target.contains(contentRef.current) || target === contentRef.current);

            if (isGlobal || isParent) {
                setSlashMenu(null);
            }
        }
    }, [activeTableElement, slashMenu]);

    useEffect(() => {
        if (contentRef.current && !contentRef.current.innerHTML && initialContent) {
            contentRef.current.innerHTML = initialContent;
        }
        if (contentRef.current && !initialContent) {
            contentRef.current.focus();
        }
        document.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [handleScroll]);

    const handleInput = () => {
        if (contentRef.current) {
            // 1. MANDATORY H1 PROTECTION (ensure it's the first element)
            let firstChild = contentRef.current.firstElementChild;
            if (!firstChild || firstChild.tagName !== 'H1') {
                // If it's missing or not first, we need to restore it.
                // If there's an H1 elsewhere, we could move it, but prepending is safer for simplicity.
                const h1 = document.createElement('h1');
                h1.innerHTML = '<br/>';
                contentRef.current.prepend(h1);
                firstChild = h1;
            }

            // 2. Ensure Title Divider protection & cleanup duplicates
            const allDividers = contentRef.current.querySelectorAll('.title-divider');
            const correctDivider = firstChild.nextElementSibling;

            // Remove any dividers that are not in the correct position (immediately after H1) or are duplicates.
            allDividers.forEach((div) => {
                if (div !== correctDivider) {
                    div.remove();
                }
            });

            // If it's missing from the correct position, restore it
            if (!correctDivider || !correctDivider.classList.contains('title-divider')) {
                const hr = document.createElement('hr');
                hr.className = 'title-divider';
                firstChild.insertAdjacentElement('afterend', hr);
                // Add an empty paragraph after HR if it's the last element to allow typing
                if (!hr.nextElementSibling) {
                    const p = document.createElement('p');
                    p.innerHTML = '<br/>';
                    hr.insertAdjacentElement('afterend', p);
                }
            }

            const html = contentRef.current.innerHTML;
            const textContent = contentRef.current.textContent || '';
            const hasElements = contentRef.current.querySelector('h1, h2, h3, ul, ol, table, hr, img, blockquote, input[type="checkbox"]') !== null;
            setHasContent(textContent.trim().length > 0 || hasElements);
            onChange(html);

            // 3. List Continuity: Merge adjacent lists of the same type
            const lists = contentRef.current.querySelectorAll('ul, ol');
            lists.forEach((list) => {
                const next = list.nextElementSibling;
                if (next && next.tagName === list.tagName) {
                    while (next.firstChild) {
                        list.appendChild(next.firstChild);
                    }
                    next.remove();
                }
            });

            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && selection.isCollapsed && !slashMenu) {
                const range = selection.getRangeAt(0);
                const node = range.startContainer;

                if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                    const cursorPos = range.startOffset;
                    const textBeforeCursor = node.textContent.slice(0, cursorPos);

                    if (textBeforeCursor.endsWith('/') &&
                        (textBeforeCursor.length === 1 || /[\s\n]/.test(textBeforeCursor.charAt(textBeforeCursor.length - 2)))) {
                        setTimeout(checkSlashCommand, 10);
                    }
                }
            }

            // Auto-Markdown Triggers
            if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const node = range.startContainer;

                // Only trigger if we are in a text node
                if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                    const text = node.textContent;

                    // Pattern 1: Heading 1 "# "
                    if (text === '# ' || text === '#\u00A0') {
                        node.textContent = '';
                        document.execCommand('formatBlock', false, '<H1>');
                    }
                    // Pattern 2: Heading 2 "## "
                    else if (text === '## ' || text === '##\u00A0') {
                        node.textContent = '';
                        document.execCommand('formatBlock', false, '<H2>');
                    }
                    // Pattern 3: Bullet "- "
                    else if (text === '- ' || text === '-\u00A0') {
                        node.textContent = '';
                        document.execCommand('insertUnorderedList');
                    }
                    // Pattern 4: Numbered "N. "
                    const numberedMatch = text.match(/^(\d+)\.(?:\s|\u00A0)/);
                    if (numberedMatch) {
                        const startNum = parseInt(numberedMatch[1], 10);
                        node.textContent = '';

                        // Check if we are already in an LI
                        let parentLi = node.parentElement;
                        while (parentLi && parentLi.tagName !== 'LI' && parentLi !== contentRef.current) {
                            parentLi = parentLi.parentElement;
                        }

                        if (parentLi && parentLi.tagName === 'LI') {
                            const ol = parentLi.parentElement;
                            if (ol && ol.tagName === 'OL') {
                                if (parentLi === ol.firstElementChild) {
                                    (ol as HTMLOListElement).start = startNum;
                                } else {
                                    (parentLi as HTMLLIElement).value = startNum;
                                }
                            }
                        } else {
                            document.execCommand('insertOrderedList');
                            if (startNum > 1) {
                                setTimeout(() => {
                                    const selection = window.getSelection();
                                    if (selection && selection.rangeCount > 0) {
                                        let curr = selection.anchorNode;
                                        while (curr && curr !== contentRef.current) {
                                            if (curr.nodeName === 'OL') {
                                                (curr as HTMLOListElement).start = startNum;
                                                break;
                                            }
                                            curr = curr.parentNode;
                                        }
                                    }
                                }, 0);
                            }
                        }
                    }
                    // Pattern 5: Task "[] "
                    else if (text === '[] ' || text === '[]\u00A0') {
                        node.textContent = '';
                        // Insert checklist with new structure
                        document.execCommand('insertHTML', false, '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" /><label class="checklist-label" contenteditable="true"></label></div>');
                        // Auto-focus the label
                        setTimeout(() => {
                            const labels = contentRef.current?.querySelectorAll('.checklist-label');
                            if (labels && labels.length > 0) {
                                const lastLabel = labels[labels.length - 1];
                                const range = document.createRange();
                                const selection = window.getSelection();
                                range.setStart(lastLabel, 0);
                                range.collapse(true);
                                selection?.removeAllRanges();
                                selection?.addRange(range);
                            }
                        }, 10);
                    }
                }
            }
        }

        if (activeTableElement && !contentRef.current?.contains(activeTableElement)) {
            setTableRect(null);
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
                    setTableRect(rect);
                    setActiveTableElement(table);
                    foundTable = true;
                }
                break;
            }
            node = node.parentNode;
        }
        if (!foundTable) {
            setTableRect(null);
            setActiveTableElement(null);
        }
    };

    // Notion-like slash menu positioning - uses a marker approach for reliable positioning
    const checkSlashCommand = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        // Create a temporary marker to get accurate cursor position
        const marker = document.createElement('span');
        marker.textContent = '\u200B'; // Zero-width space
        marker.style.cssText = 'position: relative; display: inline;';

        // Insert marker at cursor position
        range.insertNode(marker);

        // Get marker position (this is the actual cursor position on screen)
        const markerRect = marker.getBoundingClientRect();

        // Remove marker immediately
        marker.remove();

        // Restore selection
        selection.removeAllRanges();
        selection.addRange(range);

        // Menu dimensions
        const MENU_WIDTH = 256;
        const MENU_HEIGHT = 320;
        const GAP = 4;
        const PADDING = 16;

        // Position menu directly below and at the left edge of cursor
        let left = markerRect.left;
        let top = markerRect.bottom + GAP;
        let maxHeight = MENU_HEIGHT;

        // Clamp to viewport bounds
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Horizontal clamping
        if (left + MENU_WIDTH > viewportWidth - PADDING) {
            left = viewportWidth - MENU_WIDTH - PADDING;
        }
        if (left < PADDING) {
            left = PADDING;
        }

        // Vertical positioning - prefer below, flip up if needed
        const spaceBelow = viewportHeight - markerRect.bottom - PADDING;
        const spaceAbove = markerRect.top - PADDING;

        if (spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow) {
            // Open upward
            maxHeight = Math.min(MENU_HEIGHT, spaceAbove);
            top = markerRect.top - maxHeight - GAP;
        } else if (spaceBelow < MENU_HEIGHT) {
            // Stay below but limit height
            maxHeight = Math.max(150, spaceBelow);
        }

        // Final safety clamps
        if (top < PADDING) top = PADDING;
        if (maxHeight < 100) maxHeight = 100;

        setSlashMenu({ show: true, top, left, maxHeight });
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

        if (e.key === 'Backspace' || e.key === 'Delete') {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const container = range.startContainer;
                const offset = range.startOffset;

                // Find the top-level block inside the editor
                let currentBlock = container as any;
                while (currentBlock && currentBlock.parentElement !== contentRef.current) {
                    currentBlock = currentBlock.parentElement;
                }

                if (currentBlock) {
                    if (e.key === 'Backspace') {
                        if (offset === 0) {
                            const prev = currentBlock.previousElementSibling;
                            // Block backspace if it would merge with or delete the divider
                            if (prev && prev.classList.contains('title-divider')) {
                                e.preventDefault();
                                return;
                            }
                            // Block backspace at the very beginning of the H1 to prevent tag deletion
                            if (currentBlock.tagName === 'H1') {
                                e.preventDefault();
                                return;
                            }
                        }
                        // Block backspace if the current block IS the divider
                        if (currentBlock.classList.contains('title-divider')) {
                            e.preventDefault();
                            return;
                        }
                    } else if (e.key === 'Delete') {
                        // Check if cursor is at the end of the content within the H1
                        if (currentBlock.tagName === 'H1') {
                            // Check if there is any visible content after the current position in this block
                            const isAtEnd = (container.nodeType === Node.TEXT_NODE && offset === container.textContent?.length) ||
                                (container.nodeType === Node.ELEMENT_NODE && offset >= container.childNodes.length);

                            // If H1 is effectively empty (no text, at most one BR), treat even "at start" as "at end" 
                            // to prevent pull-up of the divider or tag deletion
                            const hasNoText = currentBlock.textContent.trim().length === 0;

                            if (isAtEnd || hasNoText) {
                                e.preventDefault();
                                return;
                            }
                        } else if (currentBlock.classList.contains('title-divider')) {
                            e.preventDefault();
                            return;
                        }
                    }
                }
            }
        }

        if (e.key === '/') {
            // Let the slash be typed, then check
            setTimeout(checkSlashCommand, 10);
            return;
        }

        // Tab Handling for Indent/Outdent
        if (e.key === 'Tab') {
            e.preventDefault();
            const command = e.shiftKey ? 'outdent' : 'indent';
            document.execCommand(command, false, undefined);
            handleInput();
            return;
        }

        if (slashMenu) {
            // KEYBOARD NAVIGATION - Prevent these from closing the menu
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'];

            if (navKeys.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === 'Escape') {
                    setSlashMenu(null);
                    return;
                }

                // Grid Mode Logic (for Table)
                if (gridMode) {
                    if (e.key === 'Enter') {
                        insertTable(tableHoverState.rows, tableHoverState.cols);
                        setSlashMenu(null);
                        setGridMode(false);
                        return;
                    }

                    let { rows, cols } = tableHoverState;
                    if (e.key === 'ArrowRight') cols = Math.min(cols + 1, 10);
                    if (e.key === 'ArrowLeft') cols = Math.max(cols - 1, 1);
                    if (e.key === 'ArrowDown') rows = Math.min(rows + 1, 10);
                    if (e.key === 'ArrowUp') rows = Math.max(rows - 1, 1);
                    setTableHoverState({ rows, cols });
                    return;
                }

                const commands: CommandType[] = ['h1', 'h2', 'ul', 'ol', 'checklist', 'table', 'image', 'file', 'hr'];
                const isTableSelected = commands[slashIndex] === 'table';

                if (e.key === 'ArrowDown') {
                    setSlashIndex(prev => (prev + 1) % SLASH_ITEMS_COUNT);
                } else if (e.key === 'ArrowUp') {
                    setSlashIndex(prev => (prev - 1 + SLASH_ITEMS_COUNT) % SLASH_ITEMS_COUNT);
                } else if (e.key === 'ArrowRight' && isTableSelected) {
                    setGridMode(true);
                } else if (e.key === 'Enter') {
                    if (isTableSelected && !gridMode) {
                        // Allow Enter to open grid mode instead of inserting instantly
                        setGridMode(true);
                    } else {
                        handleSlashSelect(commands[slashIndex]);
                    }
                }
                return;
            }

            setSlashMenu(null);
        }

        // Handle Enter key in checklist items
        if (e.key === 'Enter' && !e.shiftKey) {
            const selection = window.getSelection();
            if (!selection?.anchorNode) return;

            // Check if we're inside a checklist item (label element after checkbox)
            let node: Node | null = selection.anchorNode;
            let checklistLabel: HTMLLabelElement | null = null;

            while (node && contentRef.current?.contains(node)) {
                if (node instanceof HTMLLabelElement &&
                    node.classList.contains('checklist-label')) {
                    checklistLabel = node;
                    break;
                }
                node = node.parentNode;
            }

            if (checklistLabel) {
                e.preventDefault();

                // Get the text content directly from the label
                const text = checklistLabel.textContent?.trim() || '';

                // If empty, exit checklist mode
                if (!text) {
                    // Remove the empty checklist item
                    const checklistDiv = checklistLabel.closest('.checklist-item');

                    // Create a new paragraph element
                    const newParagraph = document.createElement('p');
                    newParagraph.innerHTML = '<br/>';

                    if (checklistDiv) {
                        // Insert paragraph after the checklist item, then remove checklist
                        checklistDiv.insertAdjacentElement('afterend', newParagraph);
                        checklistDiv.remove();
                    } else {
                        // Fallback: just insert paragraph
                        document.execCommand('insertHTML', false, '<p><br/></p>');
                    }

                    // Focus the new paragraph
                    const range = document.createRange();
                    range.setStart(newParagraph, 0);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    // Create a new checklist item after current one
                    const currentItem = checklistLabel.closest('.checklist-item');
                    if (currentItem) {
                        const newItem = document.createElement('div');
                        newItem.className = 'checklist-item';
                        newItem.innerHTML = '<input type="checkbox" class="checklist-checkbox" /><label class="checklist-label" contenteditable="true"></label>';

                        currentItem.insertAdjacentElement('afterend', newItem);

                        // Focus the new label
                        const newLabel = newItem.querySelector('.checklist-label');
                        if (newLabel) {
                            const range = document.createRange();
                            range.setStart(newLabel, 0);
                            range.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }
                }
                handleInput();
                return;
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
                case 'checklist': {
                    // Insert checklist with proper structure and auto-focus
                    const checklistHTML = '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" /><label class="checklist-label" contenteditable="true"></label></div>';
                    document.execCommand('insertHTML', false, checklistHTML);

                    // Auto-focus the label
                    setTimeout(() => {
                        const labels = contentRef.current?.querySelectorAll('.checklist-label');
                        if (labels && labels.length > 0) {
                            const lastLabel = labels[labels.length - 1];
                            const range = document.createRange();
                            const selection = window.getSelection();
                            range.setStart(lastLabel, 0);
                            range.collapse(true);
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                        }
                    }, 10);
                    break;
                }
                case 'hr': document.execCommand('insertHTML', false, '<hr class="my-4 border-gray-200" /><p><br/></p>'); break;
                case 'table': insertTable(3, 3); break;
                case 'image':
                case 'file': fileInputRef.current?.click(); break;
            }
            handleInput();
        }, 10);
    };

    const insertTable = (rows: number, cols: number) => {
        document.execCommand('delete', false);

        // Generate clean table HTML - styles are applied via CSS
        let html = '<table><tbody>';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                html += '<td><br/></td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table><p><br/></p>';
        document.execCommand('insertHTML', false, html);
        handleInput();
    };

    // ... Add/Delete Row/Col - clean HTML generation
    const addRow = () => {
        if (!activeTableElement) return;
        const cols = activeTableElement.rows[0].cells.length;
        const row = activeTableElement.insertRow();
        for (let i = 0; i < cols; i++) {
            const cell = row.insertCell();
            cell.innerHTML = "<br/>";
        }
        handleInput();
        // Update table rect after adding row
        setTableRect(activeTableElement.getBoundingClientRect());
    };
    const addCol = () => {
        if (!activeTableElement) return;
        const rows = activeTableElement.rows;
        for (let i = 0; i < rows.length; i++) {
            const cell = rows[i].insertCell();
            cell.innerHTML = "<br/>";
        }
        handleInput();
        // Update table rect after adding column
        setTableRect(activeTableElement.getBoundingClientRect());
    };
    const deleteRow = () => {
        if (!activeTableElement) return;
        const rowCount = activeTableElement.rows.length;
        if (rowCount <= 1) return; // Keep at least 1 row
        activeTableElement.deleteRow(rowCount - 1);
        handleInput();
        setTableRect(activeTableElement.getBoundingClientRect());
    };
    const deleteCol = () => {
        if (!activeTableElement) return;
        const rows = activeTableElement.rows;
        if (rows.length === 0 || rows[0].cells.length <= 1) return; // Keep at least 1 column
        for (let i = 0; i < rows.length; i++) {
            rows[i].deleteCell(rows[i].cells.length - 1);
        }
        handleInput();
        setTableRect(activeTableElement.getBoundingClientRect());
    };
    const deleteTable = () => {
        activeTableElement?.remove();
        setActiveTableElement(null);
        setTableRect(null);
        handleInput();
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const allAllowed = [...ALLOWED_MIME_TYPES.images, ...ALLOWED_MIME_TYPES.docs, ...ALLOWED_MIME_TYPES.archives];
        if (!allAllowed.includes(file.type) && !file.name.match(/\.(rar|7z)$/i)) { // Extra check for some extensions that might have varying mime types
            alert(`${t.uploadFailed}: Unsupported format. \nAllowed: Images, PDF, Office Docs, Text, Zip`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert(`${t.uploadFailed}: File too large (Max 10MB)`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            // Create unique filename
            const filename = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `toolbox_uploads/${filename}`);

            // Upload
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            contentRef.current?.focus();

            if (file.type.startsWith('image/')) {
                // Insert image
                document.execCommand('insertHTML', false, `<img src="${url}" alt="${file.name}" style="max-width: 100%; border-radius: 8px; margin: 1em 0;" />`);
            } else {
                // Insert file attachment
                document.execCommand('insertHTML', false, `<div class="file-attachment"><a href="${url}" download="${file.name}" target="_blank">📎 ${file.name}</a></div>&nbsp;`);
            }

            handleInput();
        } catch (err) {
            console.error(err);
            alert(t.uploadFailed);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const execCommand = (cmd: string, arg?: string) => {
        document.execCommand(cmd, false, arg);
        contentRef.current?.focus();
        handleInput();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative group">
            <style>{editorStyles}</style>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <div className="flex items-center gap-1 p-2 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 overflow-x-auto scrollbar-hide shrink-0">
                <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} tooltip={t.bold} />
                <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} tooltip={t.italic} />
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <ToolbarButton icon={Type} onClick={() => execCommand('formatBlock', '<H2>')} tooltip={t.heading} />
                <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} tooltip={t.list} />
                <ToolbarButton icon={CheckSquare} onClick={() => handleSlashSelect('checklist')} tooltip={t.task} />

                <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />

                <ToolbarButton icon={Outdent} onClick={() => execCommand('outdent')} tooltip={t.outdent || "Outdent"} />
                <ToolbarButton icon={Indent} onClick={() => execCommand('indent')} tooltip={t.indent || "Indent"} />

                <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />

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

            {slashMenu && createPortal(
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
                </>,
                document.body
            )}

            {activeTableElement && createPortal(
                <TableControls
                    tableElement={activeTableElement}
                    onAddRow={addRow}
                    onAddCol={addCol}
                    onDeleteRow={deleteRow}
                    onDeleteCol={deleteCol}
                    onDelete={deleteTable}
                    canDeleteRow={activeTableElement.rows.length > 1}
                    canDeleteCol={activeTableElement.rows[0]?.cells.length > 1}
                />,
                document.body
            )}
        </div>
    );
};
