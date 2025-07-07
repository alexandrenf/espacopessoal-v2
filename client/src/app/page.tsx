"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Navbar } from "@/components/Navbar";
import { TemplatesGallery } from "@/components/TemplatesGallery";
import { DocumentsTable } from "@/components/DocumentsTable";

export default function Home() {
  const [search, setSearch] = useState("");
  
  const { results, status, loadMore } = usePaginatedQuery(
    api.documents.get,
    { search: search || undefined },
    { initialNumItems: 5 }
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <div className="h-16 w-full border-b px-6">
        <Navbar search={search} setSearch={setSearch} />
      </div>

      {/* Templates Gallery */}
      <TemplatesGallery />

      {/* Documents Table */}
      <div className="flex-1">
        <DocumentsTable 
          documents={results} 
          loadMore={loadMore} 
          status={status} 
        />
      </div>
    </div>
  );
}