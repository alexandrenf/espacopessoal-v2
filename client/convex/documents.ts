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
    try {
      // Convert string ID to Convex ID and validate
      const documentId = args.id as Id<"documents">;
      const document = await ctx.db.get(documentId);
      
      if (!document) {
        throw new ConvexError("Document not found!");
      }
      
      return await ctx.db.patch(documentId, { 
        initialContent: args.content,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error in updateContentInternal:", error);
      throw new ConvexError("Invalid document ID or document not found");
    }
  },
});

export const getByIdInternal = internalQuery({
  args: { 
    id: v.string(), // Accept string ID from HTTP action
  },
  handler: async (ctx, args) => {
    try {
      // Convert string ID to Convex ID and validate
      const documentId = args.id as Id<"documents">;
      const document = await ctx.db.get(documentId);
      
      if (!document) {
        throw new ConvexError("Document not found!");
      }
      
      return document;
    } catch (error) {
      console.error("Error in getByIdInternal:", error);
      throw new ConvexError("Invalid document ID or document not found");
    }
  },
}); 