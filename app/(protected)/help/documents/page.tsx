import Link from 'next/link';
import { ChevronLeft, FolderOpen, Upload, Search, FileCheck, Lock } from 'lucide-react';

export default function DocumentsHelpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/help"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Help Center
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <FolderOpen className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Document Registry</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Organize, manage, and control your safety documents.
          </p>
        </header>

        <div className="space-y-8">
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Uploading Documents</h2>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-3 ml-4">
              <li>Go to <strong>Admin → Document Registry</strong></li>
              <li>Click <strong>"Upload Documents"</strong></li>
              <li>Drag and drop files or click to browse</li>
              <li>The system will auto-detect document type and suggest metadata</li>
              <li>Select the folder and COR elements</li>
              <li>Click <strong>"Upload"</strong></li>
            </ol>
            <p className="text-slate-400 mt-4 text-sm">
              Supported formats: PDF, DOCX, XLSX, PPTX, TXT (max 25MB per file)
            </p>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <FolderOpen className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Folder Structure</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Documents are organized into folders by type:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">📋 Policies</p>
                <p className="text-sm text-slate-400">Company policies</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">📝 Procedures</p>
                <p className="text-sm text-slate-400">Work procedures</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">⚠️ Safe Work</p>
                <p className="text-sm text-slate-400">SWPs and JSAs</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">📚 Manuals</p>
                <p className="text-sm text-slate-400">Reference manuals</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">📄 Forms</p>
                <p className="text-sm text-slate-400">Blank forms</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">🎓 Training</p>
                <p className="text-sm text-slate-400">Training materials</p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-semibold text-white">Finding Documents</h2>
            </div>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Search:</strong> Find by title, keywords, or content</li>
              <li><strong>Filter by Folder:</strong> Browse by document type</li>
              <li><strong>Filter by COR Element:</strong> Find documents for specific audit elements</li>
              <li><strong>Recent:</strong> View recently accessed documents</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Document Control</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Each document has a control number and version history:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Control Number:</strong> Unique identifier (e.g., POL-001)</li>
              <li><strong>Version:</strong> Track document revisions</li>
              <li><strong>Review Date:</strong> Schedule periodic reviews</li>
              <li><strong>Approval Status:</strong> Draft, Pending, Approved</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-rose-400" />
              <h2 className="text-xl font-semibold text-white">Worker Acknowledgment</h2>
            </div>
            <p className="text-slate-300 mb-4">
              For critical documents, require workers to acknowledge they've read them:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Mark documents as "Requires Acknowledgment"</li>
              <li>Set a deadline for acknowledgment</li>
              <li>Track who has and hasn't acknowledged</li>
              <li>Send reminders to those who haven't</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/document-registry"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          >
            Go to Document Registry
          </Link>
          <Link
            href="/help/document-control"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Document Control Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
