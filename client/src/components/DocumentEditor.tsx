"use client";

import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  Save, 
  AlertCircle,
  File,
  FilePlus,
  FilePen,
  FileText,
  FileJson,
  Globe,
  Printer,
  Trash,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Text,
  RemoveFormatting
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

// TipTap Extensions
import { FontSizeExtension } from "@/extensions/font-size";
import { LineHeightExtension } from "@/extensions/line-height";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Heading } from "@tiptap/extension-heading";
import { Highlight } from "@tiptap/extension-highlight";
import { Link as LinkExtension } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { ImageResize } from "tiptap-extension-resize-image";

// Components
import { Ruler } from "./Ruler";
import { Threads } from "./Threads";
import { Toolbar } from "./Toolbar";
import { useEditorStore } from "@/store/use-editor-store";
import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from "@/constants/margins";

type Document = {
  _id: Id<"documents">;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  organizationId?: string;
  initialContent?: string;
  roomId?: string;
};

interface EditorProps {
  document: Document;
  initialContent?: string | undefined;
  isReadOnly?: boolean;
}

export function DocumentEditor({ document: doc, initialContent, isReadOnly }: EditorProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [documentTitle, setDocumentTitle] = useState(doc.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Margin state
  const [leftMargin, setLeftMargin] = useState(LEFT_MARGIN_DEFAULT);
  const [rightMargin, setRightMargin] = useState(RIGHT_MARGIN_DEFAULT);
  
  const { setEditor } = useEditorStore();
  const updateDocument = useMutation(api.documents.updateById);
  const updateContent = useMutation(api.documents.updateContent);

  // Enhanced content saving with better conflict resolution
  const saveContentRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Menu actions
  const onSaveJSON = () => {
    if (!editor) return;
    const content = editor.getJSON();
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveHTML = () => {
    if (!editor) return;
    const content = editor.getHTML();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveText = () => {
    if (!editor) return;
    const content = editor.getText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onNewDocument = () => {
    window.open('/', '_blank');
  };

  const insertTable = ({ rows, cols }: { rows: number; cols: number }) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run();
  };

  // Initialize Y.js document
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  
  const saveContent = useCallback((content: string) => {
    // Skip save if content hasn't changed
    if (content === lastSavedContentRef.current) {
      return;
    }

    if (saveContentRef.current) {
      clearTimeout(saveContentRef.current);
    }

    // Only set unsaved changes state if we're not already saving
    if (!isSaving) {
      setHasUnsavedChanges(true);
    }
    
    saveContentRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await updateContent({ 
          id: doc._id, 
          content 
        });
        
        lastSavedContentRef.current = content;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        
        // Silent save - no toast notifications during auto-save
        console.log('Document auto-saved successfully');
      } catch (error) {
        console.error('Failed to save document:', error);
        setHasUnsavedChanges(true);
        // Only show error toast, not success
        toast.error("Failed to save document changes");
      } finally {
        setIsSaving(false);
      }
    }, 2000); // Save after 2 seconds of inactivity
  }, [doc._id, updateContent, isSaving]);

  // Enhanced WebSocket and Y.js integration
  const editor = useEditor({
    autofocus: !isReadOnly,
    immediatelyRender: false,
    editable: !isReadOnly,
    onCreate({ editor }) {
      setEditor(editor);
    },
    onDestroy() {
      setEditor(null);
    },
    onUpdate({ editor, transaction }) {
      setEditor(editor);
      // Only save if the transaction has content changes (not just selection changes)
      if (transaction.docChanged) {
        const content = editor.getHTML();
        saveContent(content);
      }
    },
    onSelectionUpdate({ editor }) {
      setEditor(editor);
    },
    onTransaction({ editor }) {
      setEditor(editor);
    },
    onFocus({ editor }) {
      setEditor(editor);
    },
    onBlur({ editor }) {
      setEditor(editor);
    },
    onContentError({ editor }) {
      setEditor(editor);
    },
    editorProps: {
      attributes: {
        style: `padding-left: ${leftMargin}px; padding-right: ${rightMargin}px;`,
        class: `focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 cursor-text`,
      },
    },
    extensions: [
      StarterKit.configure({
        history: false,
        heading: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableCell,
      TableHeader,
      TableRow,
      ImageResize,
      Underline,
      FontFamily,
      TextStyle,
      Heading,
      Highlight.configure({ multicolor: true }),
      Color,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      FontSizeExtension,
      LineHeightExtension,
             Collaboration.configure({
         document: ydocRef.current,
       }),
    ],
  });

  useEffect(() => {
    const ydoc = ydocRef.current!;
    const documentName = doc._id;
    
    // Get WebSocket URL from environment or create secure fallback
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:6001`;
    
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    console.log('📄 Document ID:', documentName);
    
    // Enhanced IndexedDB persistence with error handling
    const persistence = new IndexeddbPersistence(documentName, ydoc);
    
    persistence.on('update', () => {
      console.log('📦 Document loaded from IndexedDB');
    });

    // Enhanced HocusPocus provider with better error handling
    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: documentName,
      document: ydoc,
    });

    providerRef.current = newProvider;

    // Enhanced status tracking
    newProvider.on('status', (event: { status: string }) => {
      console.log('📡 Provider status:', event.status);
      setStatus(event.status as any);
      
      if (event.status === 'connected') {
        toast.success("Connected to real-time collaboration");
      } else if (event.status === 'disconnected') {
        toast.error("Disconnected from collaboration server");
      }
    });

    newProvider.on('connect', () => {
      console.log('✅ WebSocket connected successfully!');
      setStatus('connected');
    });

    newProvider.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setStatus('disconnected');
    });

    newProvider.on('close', () => {
      console.log('🔒 WebSocket closed');
      setStatus('disconnected');
    });

    newProvider.on('error', (error: any) => {
      console.error('💥 WebSocket error occurred:', error);
      setStatus('error');
      toast.error("Connection error occurred");
    });

    // Load initial content if available and Y.js is empty
    if ((doc.initialContent || initialContent) && editor) {
      setTimeout(() => {
        if (editor.isEmpty) {
          editor.commands.setContent(doc.initialContent || initialContent || '');
          lastSavedContentRef.current = doc.initialContent || initialContent || '';
        }
      }, 100);
    }

    // Cleanup function
    return () => {
      if (saveContentRef.current) {
        clearTimeout(saveContentRef.current);
      }
      
      console.log('🧹 Cleaning up editor and connections');
      
      if (newProvider) {
        newProvider.destroy();
      }
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [doc._id, doc.initialContent, initialContent, editor]);

  // Enhanced title handling
  const handleTitleSubmit = async () => {
    if (documentTitle.trim() && documentTitle !== doc.title) {
      try {
        await updateDocument({ 
          id: doc._id, 
          title: documentTitle.trim() 
        });
        toast.success("Document title updated!");
      } catch (error) {
        toast.error("Failed to update title");
        setDocumentTitle(doc.title); // Revert on error
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setDocumentTitle(doc.title);
      setIsEditingTitle(false);
    }
  };

  // Force save function for manual saves
  const handleForceSave = async () => {
    if (editor && !isSaving) {
      const content = editor.getHTML();
      
      // Clear any pending auto-save
      if (saveContentRef.current) {
        clearTimeout(saveContentRef.current);
      }
      
      // Immediate save for manual action
      try {
        setIsSaving(true);
        await updateContent({ 
          id: doc._id, 
          content 
        });
        
        lastSavedContentRef.current = content;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        toast.success("Document saved successfully!");
      } catch (error) {
        console.error('Failed to save document:', error);
        setHasUnsavedChanges(true);
        toast.error("Failed to save document");
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Enhanced connection status indicator
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'connecting':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (!editor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collaborative editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBFD]">
      {/* Enhanced header with better status indicators */}
      <header className="border-b bg-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            {isEditingTitle ? (
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
                autoFocus
              />
            ) : (
              <h1 
                className="text-lg font-semibold cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                onClick={() => setIsEditingTitle(true)}
              >
                {documentTitle}
              </h1>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSaving ? (
                <>
                  <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full" />
                  <span>Saving...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Save className="h-3 w-3 text-orange-500" />
                  <span>Unsaved changes</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save className="h-3 w-3 text-green-500" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </>
              ) : null}
            </div>
            
            {/* Enhanced connection status */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              status === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : status === 'connecting'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
            
            {/* Manual save button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForceSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              {doc.ownerId.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Editor Container - Exactly like the reference */}
      <div className="size-full overflow-x-auto bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-visible">
        <div className="max-w-[816px] mx-auto">
          <Toolbar />
        </div>
        <Ruler 
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          onLeftMarginChange={setLeftMargin}
          onRightMarginChange={setRightMargin}
        />
        <div className="min-w-max flex justify-center w-[816px] py-4 print:py-0 mx-auto print:w-full print:min-w-0">
          {/* Loading overlay for connection issues */}
          {status !== 'connected' && status !== 'connecting' && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-600 mb-1">
                  {status === 'error' ? 'Connection Error' : 'Offline Mode'}
                </p>
                <p className="text-xs text-gray-600">
                  Real-time collaboration unavailable
                </p>
              </div>
            </div>
          )}
          <EditorContent editor={editor} />
          <Threads editor={editor} />
        </div>
      </div>
    </div>
  );
} 