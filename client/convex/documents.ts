import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Simple user ID for demo purposes (since no auth yet)
const DEFAULT_USER_ID = "demo-user";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    initialContent: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId || DEFAULT_USER_ID;
    const now = Date.now();
    
    return await ctx.db.insert("documents", {
      title: args.title ?? "Untitled Document",
      ownerId: userId,
      initialContent: args.initialContent,
      roomId: undefined, // Will be set to document ID after creation
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, search, userId }) => {
    const ownerId = userId || DEFAULT_USER_ID;
    
    if (search) {
      return await ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("ownerId", ownerId)
        )
        .paginate(paginationOpts);
    }
    
    return await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getById = query({
  args: { 
    id: v.id("documents"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { id, userId }) => {
    const document = await ctx.db.get(id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    // For now, allow access to all documents since no auth
    return document;
  },
});

export const updateById = mutation({
  args: {
    id: v.id("documents"),
    title: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    return await ctx.db.patch(args.id, { 
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const removeById = mutation({
  args: {
    id: v.id("documents"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    return await ctx.db.delete(args.id);
  },
});

export const getByIds = query({
  args: { 
    ids: v.array(v.id("documents")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { ids }) => {
    const documents = [];
    for (const id of ids) {
      const document = await ctx.db.get(id);
      if (document) {
        documents.push({ id: document._id, name: document.title });
      } else {
        documents.push({ id, name: "Document not found" });
      }
    }
    return documents;
  },
});

// Update document content after real-time editing
export const updateContent = mutation({
  args: {
    id: v.id("documents"),
    content: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    return await ctx.db.patch(args.id, { 
      initialContent: args.content,
      updatedAt: Date.now(),
    });
  },
});

// Internal functions for HTTP actions
export const updateContentInternal = internalMutation({
  args: {
    id: v.string(), // Accept string ID from HTTP action
    content: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Attempting to update document with ID: ${args.id}`);
    
    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== 'string' || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }
    
    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;
      const document = await ctx.db.get(documentId);
      
      if (!document) {
        console.log(`Document not found with ID: ${args.id} - checking by roomId`);
        
        // Check if there's a document with this ID in roomId field instead
        const docByRoomId = await ctx.db.query("documents").filter(q => q.eq(q.field("roomId"), args.id)).first();
        if (docByRoomId) {
          console.log(`Found document by roomId: ${docByRoomId.title} (${docByRoomId._id}), updating it`);
          const result = await ctx.db.patch(docByRoomId._id, { 
            initialContent: args.content,
            updatedAt: Date.now(),
          });
          console.log(`Successfully updated document via roomId ${args.id}`);
          return result;
        }
        
        console.log(`Document not found by ID or roomId: ${args.id} - this document may not have been created through the proper UI flow`);
        
        // For now, we'll create a basic document record to allow saving
        // In a production system, you might want to handle this differently
        try {
          const now = Date.now();
          const newDocumentId = await ctx.db.insert("documents", {
            title: "Untitled Document (Auto-created)",
            ownerId: args.userId || "demo-user",
            initialContent: args.content,
            roomId: args.id,
            createdAt: now,
            updatedAt: now,
          });
          
          console.log(`Successfully created new document with ID: ${newDocumentId}`);
          console.log(`Note: Original ID ${args.id} was not found, created new document instead`);
          return newDocumentId;
        } catch (createError) {
          console.error(`Failed to create new document:`, createError);
          throw new ConvexError(`Document ${args.id} not found and could not create replacement`);
        }
      }
      
      console.log(`Successfully found document: ${document.title}`);
      
      const result = await ctx.db.patch(documentId, { 
        initialContent: args.content,
        updatedAt: Date.now(),
      });
      
      console.log(`Successfully updated document ${args.id}`);
      return result;
    } catch (error) {
      console.error("Error in updateContentInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const getByIdInternal = internalQuery({
  args: { 
    id: v.string(), // Accept string ID from HTTP action
  },
  handler: async (ctx, args) => {
    console.log(`Attempting to get document with ID: ${args.id}`);
    
    // First, let's see what documents actually exist
    const allDocs = await ctx.db.query("documents").collect();
    console.log(`Total documents in database: ${allDocs.length}`);
    if (allDocs.length > 0) {
      console.log(`Sample document IDs:`, allDocs.slice(0, 3).map(d => `${d._id} (${d.title})`));
    }
    
    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== 'string' || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }
    
    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;
      console.log(`Converted to Convex ID type: ${documentId}`);
      
      const document = await ctx.db.get(documentId);
      
      if (!document) {
        console.log(`Document not found with ID: ${args.id} - returning null to indicate document should be created`);
        // Check if there's a document with this ID in roomId field instead
        const docByRoomId = await ctx.db.query("documents").filter(q => q.eq(q.field("roomId"), args.id)).first();
        if (docByRoomId) {
          console.log(`Found document by roomId: ${docByRoomId.title} (${docByRoomId._id})`);
          return docByRoomId;
        }
        return null;
      }
      
      console.log(`Successfully found document: ${document.title}`);
      return document;
    } catch (error) {
      console.error("Error in getByIdInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(`Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}); 