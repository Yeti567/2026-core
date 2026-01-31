import Link from 'next/link';
import { ChevronLeft, FileText, Plus, Move, Settings, Save, Upload } from 'lucide-react';

export default function FormBuilderHelpPage() {
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
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Form Builder</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Create custom safety forms, inspections, and checklists for your team.
          </p>
        </header>

        <div className="space-y-8">
          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Plus className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Creating a New Form</h2>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-3 ml-4">
              <li>Go to <strong>Admin → Form Templates</strong></li>
              <li>Click <strong>"New Template"</strong></li>
              <li>Enter a name and description for your form</li>
              <li>Select which COR elements this form relates to</li>
              <li>Click <strong>"Create"</strong> to open the form builder</li>
            </ol>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Move className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Adding Fields</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Use the <strong>"Add Field"</strong> button to add different types of fields to your form:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Text Input</p>
                <p className="text-sm text-slate-400">Short text answers</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Text Area</p>
                <p className="text-sm text-slate-400">Long-form responses</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Dropdown</p>
                <p className="text-sm text-slate-400">Select from options</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Checkbox</p>
                <p className="text-sm text-slate-400">Yes/No or multiple choice</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Date Picker</p>
                <p className="text-sm text-slate-400">Select dates</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Signature</p>
                <p className="text-sm text-slate-400">Digital signatures</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Photo Upload</p>
                <p className="text-sm text-slate-400">Attach images</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-white font-medium">Rating</p>
                <p className="text-sm text-slate-400">Scale ratings</p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-semibold text-white">Field Settings</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Click on any field to customize it:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Label:</strong> The question or field name</li>
              <li><strong>Placeholder:</strong> Example text shown in empty fields</li>
              <li><strong>Required:</strong> Make the field mandatory</li>
              <li><strong>Help Text:</strong> Additional instructions for users</li>
              <li><strong>Conditional Logic:</strong> Show/hide based on other answers</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Save className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Saving & Publishing</h2>
            </div>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Save Draft:</strong> Save your work without making it available to users</li>
              <li><strong>Publish:</strong> Make the form available for workers to fill out</li>
              <li><strong>Unpublish:</strong> Temporarily disable a form</li>
              <li><strong>Version History:</strong> Forms are versioned so you can track changes</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Importing PDF Forms</h2>
            </div>
            <p className="text-slate-300 mb-4">
              Already have PDF forms? Import them and convert to digital forms:
            </p>
            <ol className="list-decimal list-inside text-slate-300 space-y-2 ml-4">
              <li>Go to <strong>Admin → Forms → Import PDF</strong></li>
              <li>Upload your PDF file</li>
              <li>The system will detect fields automatically using OCR</li>
              <li>Review and adjust the detected fields</li>
              <li>Click <strong>"Convert"</strong> to create the digital form</li>
            </ol>
          </section>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/form-templates"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          >
            Go to Form Templates
          </Link>
          <Link
            href="/help/pdf-import"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            PDF Import Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
