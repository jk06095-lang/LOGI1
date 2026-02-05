// Toolbox Localization Strings
type SupportedLanguage = 'ko' | 'en';

interface ToolboxStrings {
    // Window Title
    toolbox: string;

    // Sidebar
    apps: string;

    // Tabs
    hsCode: string;
    myMemo: string;
    teamBoard: string;

    // HS Code Search
    hsCodeSearch: string;
    searchPlaceholder: string;
    itemsFound: string;
    recent: string;
    noRecentSearches: string;
    code: string;
    koreanDesc: string;
    englishDesc: string;
    noResults: string;
    tryBroadTerms: string;

    // Rich Editor
    editorPlaceholder: string;
    bold: string;
    italic: string;
    heading: string;
    list: string;
    task: string;
    table: string;
    image: string;
    insertTable: string;
    useArrowKeys: string;

    // Slash Menu
    basicBlocks: string;
    heading1: string;
    heading1Desc: string;
    heading2: string;
    heading2Desc: string;
    bulletedList: string;
    bulletedListDesc: string;
    numberedList: string;
    numberedListDesc: string;
    taskList: string;
    taskListDesc: string;
    tableDesc: string;
    imageDesc: string;
    file: string;
    fileDesc: string;
    divider: string;
    dividerDesc: string;

    // Table Menu
    addRow: string;
    addCol: string;
    deleteTable: string;

    // My Memo
    myMemos: string;
    newMemo: string;
    searchMemos: string;
    noMemosFound: string;
    untitledMemo: string;
    lastEdited: string;
    edit: string;
    delete: string;
    selectMemoOrCreate: string;
    createNewMemo: string;
    emptyMemo: string;
    deleteMemoConfirm: string;

    // Team Board
    writePost: string;
    noPostsYet: string;
    beFirstToShare: string;
    pinnedNotices: string;
    teamTasks: string;
    open: string;
    you: string;
    justNow: string;
    comment: string;
    comments: string;
    writeComment: string;
    remove: string;
    deletePostConfirm: string;
}

const translations: Record<SupportedLanguage, ToolboxStrings> = {
    ko: {
        // Window Title
        toolbox: '도구함',

        // Sidebar
        apps: '앱',

        // Tabs
        hsCode: 'HS 코드',
        myMemo: '내 메모',
        teamBoard: '팀 게시판',

        // HS Code Search
        hsCodeSearch: 'HS 코드 검색',
        searchPlaceholder: '코드, 품명, 키워드로 검색 (예: "펌프", "oil")...',
        itemsFound: '개 검색됨',
        recent: '최근:',
        noRecentSearches: '최근 검색 없음',
        code: '코드',
        koreanDesc: '한국어 설명',
        englishDesc: '영어 설명',
        noResults: '검색 결과 없음',
        tryBroadTerms: '"safety" 또는 "engine" 같은 넓은 용어를 시도해보세요',

        // Rich Editor
        editorPlaceholder: "'/' 명령어 또는 툴바를 사용하세요...",
        bold: '굵게',
        italic: '기울임',
        heading: '제목',
        list: '목록',
        task: '할 일',
        table: '표',
        image: '이미지',
        insertTable: '표 삽입',
        useArrowKeys: '방향키 또는 마우스로 크기 선택',

        // Slash Menu
        basicBlocks: '기본 블록',
        heading1: '제목 1',
        heading1Desc: '큰 섹션 제목',
        heading2: '제목 2',
        heading2Desc: '중간 섹션 제목',
        bulletedList: '글머리 기호 목록',
        bulletedListDesc: '간단한 목록',
        numberedList: '번호 매기기 목록',
        numberedListDesc: '순서가 있는 목록',
        taskList: '할 일 목록',
        taskListDesc: '작업 추적',
        tableDesc: '표 삽입',
        imageDesc: '이미지 업로드',
        file: '파일',
        fileDesc: '파일 업로드',
        divider: '구분선',
        dividerDesc: '콘텐츠 시각적 구분',

        // Table Menu
        addRow: '행',
        addCol: '열',
        deleteTable: '삭제',

        // My Memo
        myMemos: '내 메모',
        newMemo: '새 메모',
        searchMemos: '메모 검색...',
        noMemosFound: '메모를 찾을 수 없습니다.',
        untitledMemo: '제목 없는 메모',
        lastEdited: '마지막 수정:',
        edit: '수정',
        delete: '삭제',
        selectMemoOrCreate: '메모를 선택하거나 새로 만드세요',
        createNewMemo: '새 메모 만들기',
        emptyMemo: '빈 메모...',
        deleteMemoConfirm: '이 메모를 삭제하시겠습니까?',

        // Team Board
        writePost: '글 작성',
        noPostsYet: '아직 게시물이 없습니다. 연필 버튼을 눌러 작성하세요!',
        beFirstToShare: '첫 번째로 공유해보세요!',
        pinnedNotices: '고정 공지',
        teamTasks: '팀 할 일',
        open: '미완료',
        you: '나',
        justNow: '방금',
        comment: '댓글',
        comments: '개 댓글',
        writeComment: '댓글을 입력하세요...',
        remove: '제거',
        deletePostConfirm: '이 게시물을 삭제하시겠습니까?',
    },
    en: {
        // Window Title
        toolbox: 'Toolbox',

        // Sidebar
        apps: 'Apps',

        // Tabs
        hsCode: 'HS Code',
        myMemo: 'My Memo',
        teamBoard: 'Team Board',

        // HS Code Search
        hsCodeSearch: 'HS Code Search',
        searchPlaceholder: 'Search by Code, Name, or keywords (e.g. "pump", "oil")...',
        itemsFound: 'items found',
        recent: 'Recent:',
        noRecentSearches: 'No recent searches',
        code: 'Code',
        koreanDesc: 'Korean Description',
        englishDesc: 'English Description',
        noResults: 'No results found',
        tryBroadTerms: 'Try broad terms like "safety" or "engine"',

        // Rich Editor
        editorPlaceholder: "Type '/' for commands or use the toolbar...",
        bold: 'Bold',
        italic: 'Italic',
        heading: 'Heading',
        list: 'List',
        task: 'Task',
        table: 'Table',
        image: 'Image',
        insertTable: 'Insert Table',
        useArrowKeys: 'Use arrow keys or mouse to select size',

        // Slash Menu
        basicBlocks: 'Basic Blocks',
        heading1: 'Heading 1',
        heading1Desc: 'Big section heading',
        heading2: 'Heading 2',
        heading2Desc: 'Medium section heading',
        bulletedList: 'Bulleted List',
        bulletedListDesc: 'Simple list items',
        numberedList: 'Numbered List',
        numberedListDesc: 'Ordered list items',
        taskList: 'Task List',
        taskListDesc: 'Track tasks',
        tableDesc: 'Insert a table',
        imageDesc: 'Upload an image',
        file: 'File',
        fileDesc: 'Upload a file',
        divider: 'Divider',
        dividerDesc: 'Visually divide content',

        // Table Menu
        addRow: 'Row',
        addCol: 'Col',
        deleteTable: 'Delete',

        // My Memo
        myMemos: 'My Memos',
        newMemo: 'New Memo',
        searchMemos: 'Search memos...',
        noMemosFound: 'No memos found.',
        untitledMemo: 'Untitled Memo',
        lastEdited: 'Last edited:',
        edit: 'Edit',
        delete: 'Delete',
        selectMemoOrCreate: 'Select a memo or create a new one',
        createNewMemo: 'Create New Memo',
        emptyMemo: 'Empty memo...',
        deleteMemoConfirm: 'Delete this memo?',

        // Team Board
        writePost: 'Write Post',
        noPostsYet: 'No posts yet. Click the pencil button to write!',
        beFirstToShare: 'Be the first to share!',
        pinnedNotices: 'Pinned Notices',
        teamTasks: 'Team Tasks',
        open: 'open',
        you: 'YOU',
        justNow: 'Just now',
        comment: 'Comment',
        comments: 'Comments',
        writeComment: 'Write a comment...',
        remove: 'Remove',
        deletePostConfirm: 'Delete this post?',
    }
};

export function getToolboxStrings(language: string): ToolboxStrings {
    return translations[language as SupportedLanguage] || translations.en;
}

export type { ToolboxStrings, SupportedLanguage };
