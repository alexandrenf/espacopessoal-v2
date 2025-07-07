"use client";

import { EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
import { ArrowLeft, Bold, Italic, Strikethrough, Code, List, ListOrdered, Undo2, Redo2, Wifi, WifiOff, Save, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

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

interface DocumentEditorProps {
  document: Document;
}

export function DocumentEditor({ document }: DocumentEditorProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const editorRef = useRef<TiptapEditor | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(document.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const updateDocument = useMutation(api.documents.updateById);
  const updateContent = useMutation(api.documents.updateContent);

  // Enhanced content saving with better conflict resolution
  const saveContentRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  
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
          id: document._id, 
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
  }, [document._id, updateContent, isSaving]);

  // Enhanced WebSocket and Y.js integration
  useEffect(() => {
    const newYdoc = new Y.Doc();
    const documentName = document._id;
    ydocRef.current = newYdoc;
    
    // Get WebSocket URL from environment or create secure fallback
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:6001`;
    
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    console.log('📄 Document ID:', documentName);
    
    // Enhanced IndexedDB persistence with error handling
    const persistence = new IndexeddbPersistence(documentName, newYdoc);
    
    persistence.on('update', () => {
      console.log('📦 Document loaded from IndexedDB');
    });

    // Enhanced HocusPocus provider with better error handling
    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: documentName,
      document: newYdoc,
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

    // Enhanced TipTap editor with better collaboration features
    const tiptapEditor = new TiptapEditor({
      extensions: [
        StarterKit.configure({
          history: false, // Disable built-in history for Y.js compatibility
        }),
        Collaboration.configure({
          document: newYdoc,
        }),
      ],
      editorProps: {
        attributes: {
          class: 'focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 pl-14 cursor-text prose prose-lg max-w-none',
        },
      },
      // Enhanced content change detection - only save when content actually changes
      onUpdate: ({ editor, transaction }) => {
        // Only save if the transaction has content changes (not just selection changes)
        if (transaction.docChanged) {
          const content = editor.getHTML();
          saveContent(content);
        }
      },
      onSelectionUpdate: () => {
        // Track user activity for better UX
      },
    });

    // Load initial content if available and Y.js is empty
    if (document.initialContent && tiptapEditor) {
      const yXmlText = newYdoc.getXmlFragment('document');
      
      // Only set initial content if the document is empty
      setTimeout(() => {
        if (tiptapEditor.isEmpty) {
          tiptapEditor.commands.setContent(document.initialContent || '');
          lastSavedContentRef.current = document.initialContent || '';
        }
      }, 100);
    }

    editorRef.current = tiptapEditor;
    setEditorReady(true);

    // Cleanup function
    return () => {
      if (saveContentRef.current) {
        clearTimeout(saveContentRef.current);
      }
      
      console.log('🧹 Cleaning up editor and connections');
      
      if (newProvider) {
        newProvider.destroy();
      }
      if (newYdoc) {
        newYdoc.destroy();
      }
      if (tiptapEditor) {
        tiptapEditor.destroy();
      }
    };
  }, [document._id, document.initialContent]); // Removed saveContent from dependencies

  // Enhanced title handling
  const handleTitleSubmit = async () => {
    if (documentTitle.trim() && documentTitle !== document.title) {
      try {
        await updateDocument({ 
          id: document._id, 
          title: documentTitle.trim() 
        });
        toast.success("Document title updated!");
      } catch (error) {
        toast.error("Failed to update title");
        setDocumentTitle(document.title); // Revert on error
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setDocumentTitle(document.title);
      setIsEditingTitle(false);
    }
  };

  // Force save function for manual saves
  const handleForceSave = async () => {
    if (editorRef.current && !isSaving) {
      const content = editorRef.current.getHTML();
      
      // Clear any pending auto-save
      if (saveContentRef.current) {
        clearTimeout(saveContentRef.current);
      }
      
      // Immediate save for manual action
      try {
        setIsSaving(true);
        await updateContent({ 
          id: document._id, 
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

  if (!editorReady || !editorRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collaborative editor...</p>
        </div>
      </div>
    );
  }

  const editor = editorRef.current;
  
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
              {document.ownerId.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced toolbar with better visual feedback */}
      <div className="border-b bg-white px-4 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-[1px] bg-border" />
            
            {/* Text formatting with enhanced visual feedback */}
            <Button
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('strike') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('code') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-[1px] bg-border" />
            
            {/* Lists */}
            <Button
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced editor container with better visual design */}
      <main className="flex-1 overflow-x-auto bg-[#F9FBFD] px-4 py-4">
        <div className="min-w-max flex justify-center mx-auto">
          <div className="bg-white shadow-sm relative">
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
          </div>
        </div>
      </main>
    </div>
  );
} 