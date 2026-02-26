
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, HelpCircle, FileText, Upload, Trash2, Plus, ChevronDown, ChevronUp, ExternalLink, Loader2, X, MessageSquareText, Clock, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { dataService } from '../services/dataService';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { Language } from '../types';

interface HelpSectionProps {
    language: Language;
    userName?: string;
    isMobile?: boolean;
}

const translations = {
    ko: {
        helpTitle: '도움말',
        helpDesc: '매뉴얼, Q&A 게시판, 변경 이력을 확인하세요.',
        manual: '사용자 매뉴얼',
        manualDesc: '시스템 사용 방법을 안내하는 매뉴얼입니다.',
        openManual: '매뉴얼 열기',
        uploadManual: '매뉴얼 교체',
        uploadImages: '이미지 일괄 업로드',
        noManual: '등록된 매뉴얼이 없습니다.',
        uploading: '업로드 중...',
        uploadSuccess: '매뉴얼이 업로드되었습니다.',
        imageCount: '개의 이미지',
        replaceWarning: '새 매뉴얼 업로드 시 기존 매뉴얼과 이미지가 모두 삭제됩니다.',
        qa: 'Q&A 게시판',
        qaDesc: '시스템 관련 질문과 답변을 공유합니다.',
        qaPlaceholderTitle: '질문 제목',
        qaPlaceholderContent: '질문 내용을 입력하세요...',
        qaPost: '등록',
        qaEmpty: '등록된 질문이 없습니다.',
        changelog: 'CHANGELOG',
        changelogDesc: '시스템 업데이트 및 변경 이력입니다.',
        changelogVersion: '버전',
        changelogDate: '날짜',
        changelogContent: '변경 내용',
        changelogAdd: '항목 추가',
        changelogEmpty: '변경 이력이 없습니다.',
        delete: '삭제',
        confirm: '정말 삭제하시겠습니까?',
        lastUpdated: '최종 업데이트',
        selectHtml: 'HTML 파일 선택',
        selectImages: '이미지 파일 선택 (다중)',
        step1: '1단계: HTML 파일',
        step2: '2단계: 이미지 파일',
        uploadAll: '업로드 시작',
        cancel: '취소',
    },
    en: {
        helpTitle: 'Help',
        helpDesc: 'View manual, Q&A board, and changelog.',
        manual: 'User Manual',
        manualDesc: 'System usage guide and documentation.',
        openManual: 'Open Manual',
        uploadManual: 'Replace Manual',
        uploadImages: 'Batch Upload Images',
        noManual: 'No manual registered.',
        uploading: 'Uploading...',
        uploadSuccess: 'Manual uploaded successfully.',
        imageCount: ' images',
        replaceWarning: 'Uploading a new manual will delete the existing manual and all images.',
        qa: 'Q&A Board',
        qaDesc: 'Share questions and answers about the system.',
        qaPlaceholderTitle: 'Question Title',
        qaPlaceholderContent: 'Enter your question...',
        qaPost: 'Post',
        qaEmpty: 'No questions posted.',
        changelog: 'CHANGELOG',
        changelogDesc: 'System updates and version history.',
        changelogVersion: 'Version',
        changelogDate: 'Date',
        changelogContent: 'Changes',
        changelogAdd: 'Add Entry',
        changelogEmpty: 'No changelog entries.',
        delete: 'Delete',
        confirm: 'Are you sure you want to delete this?',
        lastUpdated: 'Last Updated',
        selectHtml: 'Select HTML File',
        selectImages: 'Select Images (Multiple)',
        step1: 'Step 1: HTML File',
        step2: 'Step 2: Image Files',
        uploadAll: 'Start Upload',
        cancel: 'Cancel',
    },
    cn: {
        helpTitle: '帮助',
        helpDesc: '查看手册、问答和更新记录。',
        manual: '用户手册',
        manualDesc: '系统使用指南和文档。',
        openManual: '打开手册',
        uploadManual: '更换手册',
        uploadImages: '批量上传图片',
        noManual: '尚未注册手册。',
        uploading: '上传中...',
        uploadSuccess: '手册上传成功。',
        imageCount: ' 张图片',
        replaceWarning: '上传新手册将删除现有手册和所有图片。',
        qa: '问答板',
        qaDesc: '分享关于系统的问题和答案。',
        qaPlaceholderTitle: '问题标题',
        qaPlaceholderContent: '请输入问题...',
        qaPost: '提交',
        qaEmpty: '暂无问题。',
        changelog: '更新日志',
        changelogDesc: '系统更新和版本历史。',
        changelogVersion: '版本',
        changelogDate: '日期',
        changelogContent: '变更内容',
        changelogAdd: '添加条目',
        changelogEmpty: '暂无更新记录。',
        delete: '删除',
        confirm: '确定要删除吗？',
        lastUpdated: '最后更新',
        selectHtml: '选择HTML文件',
        selectImages: '选择图片文件（多个）',
        step1: '第1步：HTML文件',
        step2: '第2步：图片文件',
        uploadAll: '开始上传',
        cancel: '取消',
    }
};

export const HelpSection: React.FC<HelpSectionProps> = ({ language, userName = 'Admin', isMobile = false }) => {
    const t = translations[language];

    // --- Manual State ---
    const [manualMeta, setManualMeta] = useState<{ htmlUrl: string; imageUrls: string[]; uploadedAt: string } | null>(null);
    const [isUploadMode, setIsUploadMode] = useState(false);
    const [htmlFile, setHtmlFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const htmlInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // --- Q&A State ---
    const [qaPosts, setQaPosts] = useState<any[]>([]);
    const [qaExpanded, setQaExpanded] = useState(false);
    const [qaTitle, setQaTitle] = useState('');
    const [qaContent, setQaContent] = useState('');
    const [showQaForm, setShowQaForm] = useState(false);

    // --- Changelog State ---
    const [changelog, setChangelog] = useState<any[]>([]);
    const [clExpanded, setClExpanded] = useState(false);
    const [clVersion, setClVersion] = useState('');
    const [clDate, setClDate] = useState(new Date().toISOString().split('T')[0]);
    const [clContent, setClContent] = useState('');
    const [showClForm, setShowClForm] = useState(false);

    // --- Load data ---
    useEffect(() => {
        dataService.getManualMeta().then(meta => setManualMeta(meta));
        const unsubQA = dataService.subscribeQAPosts(setQaPosts);
        const unsubCL = dataService.subscribeChangelog(setChangelog);
        return () => { if (unsubQA) unsubQA(); if (unsubCL) unsubCL(); };
    }, []);

    // --- Manual Upload ---
    const handleUploadManual = async () => {
        if (!htmlFile || !storage) return;
        setIsUploading(true);

        try {
            // Step 1: Delete existing files from Firebase Storage
            if (manualMeta) {
                setUploadProgress('기존 파일 삭제 중...');
                // Delete old HTML
                if (manualMeta.htmlUrl) {
                    try { await deleteObject(ref(storage, manualMeta.htmlUrl)); } catch (e) { console.warn('Old HTML delete failed:', e); }
                }
                // Delete ALL old images from Storage
                if (manualMeta.imageUrls && manualMeta.imageUrls.length > 0) {
                    for (const url of manualMeta.imageUrls) {
                        try { await deleteObject(ref(storage, url)); } catch (e) { console.warn('Old image delete failed:', e); }
                    }
                }
                // Also clean up the entire manual-images folder to prevent orphan files
                try {
                    const folderRef = ref(storage, 'manual-images');
                    const list = await listAll(folderRef);
                    for (const item of list.items) {
                        try { await deleteObject(item); } catch (e) { /* ignore */ }
                    }
                } catch (e) { /* folder may not exist */ }
            }

            // Step 2: Upload new images
            const newImageUrls: string[] = [];
            if (imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    const img = imageFiles[i];
                    setUploadProgress(`이미지 업로드 중... (${i + 1}/${imageFiles.length})`);
                    const imgRef = ref(storage, `manual-images/${Date.now()}-${img.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
                    await uploadBytes(imgRef, img);
                    const url = await getDownloadURL(imgRef);
                    newImageUrls.push(url);
                }
            }

            // Step 3: Process HTML — replace image placeholders with real URLs
            let htmlContent = await htmlFile.text();

            // Find all img tags with empty or placeholder src and inject uploaded image URLs in order
            let imgIndex = 0;
            htmlContent = htmlContent.replace(/<img\s+([^>]*?)src=["']([^"']*)["']/gi, (match, before, src) => {
                // Only replace empty/placeholder src attributes (not external URLs)
                if ((!src || src === '' || src === '#') && imgIndex < newImageUrls.length) {
                    const newSrc = newImageUrls[imgIndex];
                    imgIndex++;
                    return `<img ${before}src="${newSrc}"`;
                }
                return match;
            });

            // Also update img display style if images were injected
            if (newImageUrls.length > 0) {
                // Make sure injected images are visible (the template hides them by default)
                htmlContent = htmlContent.replace(
                    /\.image-drop-area img\s*\{[^}]*display:\s*none;/g,
                    '.image-drop-area img { display: block;'
                );
            }

            // Step 4: Upload processed HTML
            setUploadProgress('HTML 업로드 중...');
            const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
            const htmlRef = ref(storage, `manual/manual-${Date.now()}.html`);
            await uploadBytes(htmlRef, htmlBlob);
            const htmlUrl = await getDownloadURL(htmlRef);

            // Step 5: Save metadata to Firestore
            const meta = {
                htmlUrl,
                imageUrls: newImageUrls,
                uploadedAt: new Date().toISOString()
            };
            await dataService.updateManualMeta(meta);
            setManualMeta(meta);

            // Reset
            setIsUploadMode(false);
            setHtmlFile(null);
            setImageFiles([]);
            setUploadProgress('');
            alert(t.uploadSuccess);

        } catch (error) {
            console.error('Manual upload error:', error);
            alert('Upload failed: ' + (error as Error).message);
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    // --- Open Manual in New Window ---
    const openManual = () => {
        if (manualMeta?.htmlUrl) {
            window.open(manualMeta.htmlUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // --- Q&A Handlers ---
    const handlePostQA = async () => {
        if (!qaTitle.trim() || !qaContent.trim()) return;
        await dataService.addQAPost({
            title: qaTitle.trim(),
            content: qaContent.trim(),
            author: userName,
            createdAt: new Date().toISOString()
        });
        setQaTitle('');
        setQaContent('');
        setShowQaForm(false);
    };

    // --- Changelog Handlers ---
    const handleAddChangelog = async () => {
        if (!clVersion.trim() || !clContent.trim()) return;
        await dataService.addChangelogEntry({
            version: clVersion.trim(),
            date: clDate,
            content: clContent.trim()
        });
        setClVersion('');
        setClContent('');
        setShowClForm(false);
    };

    // --- Card Wrapper ---
    const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${className}`}>
            {children}
        </div>
    );

    return (
        <div className={`space-y-6 ${isMobile ? 'mt-6' : ''}`}>
            {/* Section Header */}
            {!isMobile && (
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <HelpCircle size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white">{t.helpTitle}</h3>
                        <p className="text-xs text-slate-400">{t.helpDesc}</p>
                    </div>
                </div>
            )}

            {/* ============ MANUAL ============ */}
            <Card>
                <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white">{t.manual}</h4>
                            <p className="text-[11px] text-slate-400">{t.manualDesc}</p>
                        </div>
                    </div>

                    {manualMeta?.htmlUrl ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Clock size={12} />
                                <span>{t.lastUpdated}: {new Date(manualMeta.uploadedAt).toLocaleDateString()}</span>
                                {manualMeta.imageUrls.length > 0 && (
                                    <span className="ml-2 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        <ImageIcon size={10} className="inline mr-1" />{manualMeta.imageUrls.length}{t.imageCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={openManual}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                                >
                                    <ExternalLink size={16} />
                                    {t.openManual}
                                </button>
                                <button
                                    onClick={() => setIsUploadMode(!isUploadMode)}
                                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Upload size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-sm text-slate-400 mb-3">{t.noManual}</p>
                            <button
                                onClick={() => setIsUploadMode(true)}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                            >
                                <Upload size={16} />
                                {t.uploadManual}
                            </button>
                        </div>
                    )}

                    {/* Upload Panel */}
                    {isUploadMode && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 space-y-4">
                            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-3 rounded-lg text-xs">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>{t.replaceWarning}</span>
                            </div>

                            {/* Step 1: HTML */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">{t.step1}</label>
                                <input
                                    ref={htmlInputRef}
                                    type="file"
                                    accept=".html,.htm"
                                    onChange={(e) => setHtmlFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => htmlInputRef.current?.click()}
                                    className={`w-full py-3 border-2 border-dashed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${htmlFile
                                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                            : 'border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500'
                                        }`}
                                >
                                    <FileText size={16} />
                                    {htmlFile ? `✓ ${htmlFile.name}` : t.selectHtml}
                                </button>
                            </div>

                            {/* Step 2: Images */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">{t.step2}</label>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    className={`w-full py-3 border-2 border-dashed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${imageFiles.length > 0
                                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                            : 'border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500'
                                        }`}
                                >
                                    <ImageIcon size={16} />
                                    {imageFiles.length > 0 ? `✓ ${imageFiles.length}${t.imageCount}` : t.selectImages}
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUploadManual}
                                    disabled={!htmlFile || isUploading}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    {isUploading ? uploadProgress || t.uploading : t.uploadAll}
                                </button>
                                <button
                                    onClick={() => { setIsUploadMode(false); setHtmlFile(null); setImageFiles([]); }}
                                    disabled={isUploading}
                                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* ============ Q&A BOARD ============ */}
            <Card>
                <button
                    onClick={() => setQaExpanded(!qaExpanded)}
                    className="w-full p-5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                        <MessageSquareText size={18} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{t.qa}</h4>
                        <p className="text-[11px] text-slate-400">{t.qaDesc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {qaPosts.length > 0 && (
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                {qaPosts.length}
                            </span>
                        )}
                        {qaExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                </button>

                {qaExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-3">
                        {/* Post Form */}
                        <button
                            onClick={() => setShowQaForm(!showQaForm)}
                            className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={14} />
                            {t.qaPost}
                        </button>

                        {showQaForm && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
                                <input
                                    value={qaTitle}
                                    onChange={(e) => setQaTitle(e.target.value)}
                                    placeholder={t.qaPlaceholderTitle}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <textarea
                                    value={qaContent}
                                    onChange={(e) => setQaContent(e.target.value)}
                                    placeholder={t.qaPlaceholderContent}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowQaForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">{t.cancel}</button>
                                    <button
                                        onClick={handlePostQA}
                                        disabled={!qaTitle.trim() || !qaContent.trim()}
                                        className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                    >
                                        {t.qaPost}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Post List */}
                        {qaPosts.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-4">{t.qaEmpty}</p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {qaPosts.map(post => (
                                    <div key={post.id} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <h5 className="font-bold text-sm text-slate-800 dark:text-white">{post.title}</h5>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap">{post.content}</p>
                                                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                                                    <span>{post.author}</span>
                                                    <span>·</span>
                                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { if (window.confirm(t.confirm)) dataService.deleteQAPost(post.id); }}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* ============ CHANGELOG ============ */}
            <Card>
                <button
                    onClick={() => setClExpanded(!clExpanded)}
                    className="w-full p-5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                        <FileText size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{t.changelog}</h4>
                        <p className="text-[11px] text-slate-400">{t.changelogDesc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {changelog.length > 0 && (
                            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                {changelog.length}
                            </span>
                        )}
                        {clExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                </button>

                {clExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-3">
                        {/* Add Form */}
                        <button
                            onClick={() => setShowClForm(!showClForm)}
                            className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={14} />
                            {t.changelogAdd}
                        </button>

                        {showClForm && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        value={clVersion}
                                        onChange={(e) => setClVersion(e.target.value)}
                                        placeholder={t.changelogVersion}
                                        className="px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <input
                                        type="date"
                                        value={clDate}
                                        onChange={(e) => setClDate(e.target.value)}
                                        className="px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                                <textarea
                                    value={clContent}
                                    onChange={(e) => setClContent(e.target.value)}
                                    placeholder={t.changelogContent}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowClForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">{t.cancel}</button>
                                    <button
                                        onClick={handleAddChangelog}
                                        disabled={!clVersion.trim() || !clContent.trim()}
                                        className="px-4 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                    >
                                        {t.changelogAdd}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Entry List */}
                        {changelog.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-4">{t.changelogEmpty}</p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {changelog.map(entry => (
                                    <div key={entry.id} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold px-2 py-0.5 rounded">
                                                        v{entry.version}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">{entry.date}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{entry.content}</p>
                                            </div>
                                            <button
                                                onClick={() => { if (window.confirm(t.confirm)) dataService.deleteChangelogEntry(entry.id); }}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};
