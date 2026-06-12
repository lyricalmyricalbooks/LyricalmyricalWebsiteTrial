import React, { useState, useRef, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { adminApi } from "../admin/api";
import { Code, Eye } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  uploadFile?: (file: File, path: string) => Promise<string>;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  className = "",
  uploadFile,
}: RichTextEditorProps) {
  const [showHtml, setShowHtml] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Generate a unique toolbar ID to prevent collisions when multiple editors render on a single page
  const toolbarId = useMemo(
    () => `toolbar-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

  // Custom Image Upload Handler
  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const uploadFn = uploadFile || adminApi.uploadFile;
        const path = `editor-uploads/${Date.now()}_${file.name}`;
        const url = await uploadFn(file, path);

        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", url);
        }
      } catch (error) {
        console.error("Quill image upload failed:", error);
        alert("Failed to upload image. Please try again.");
      }
    };
  };

  // Quill Editor Configuration
  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          image: handleImageUpload,
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [toolbarId, uploadFile]
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "list",
    "bullet",
    "link",
    "image",
    "video",
    "blockquote",
    "code-block",
  ];

  return (
    <div className={`flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950 ${className}`}>
      {/* Custom Header Toolbar Wrapper */}
      <div
        id={toolbarId}
        className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 [&_.ql-stroke]:!stroke-neutral-600 [&_.ql-stroke]:dark:!stroke-neutral-300 [&_.ql-fill]:!fill-neutral-600 [&_.ql-fill]:dark:!fill-neutral-300 [&_.ql-picker]:!text-neutral-700 [&_.ql-picker]:dark:!text-neutral-300"
      >
        {/* Headings */}
        <span className="ql-formats !mr-2">
          <select className="ql-header bg-transparent border-none text-xs outline-none cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded px-1.5 py-0.5">
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="">Paragraph</option>
          </select>
        </span>

        {/* Text Formats */}
        <span className="ql-formats !mr-2 flex items-center gap-0.5">
          <button className="ql-bold hover:!bg-neutral-200 dark:hover:!bg-neutral-800 !rounded transition-colors" />
          <button className="ql-italic hover:!bg-neutral-200 dark:hover:!bg-neutral-800 !rounded transition-colors" />
          <button className="ql-underline hover:!bg-neutral-200 dark:hover:!bg-neutral-800 !rounded transition-colors" />
          <button className="ql-strike hover:!bg-neutral-200 dark:hover:!bg-neutral-800 !rounded transition-colors" />
        </span>

        {/* Colors */}
        <span className="ql-formats !mr-2 flex items-center gap-0.5 [&_.ql-picker-label]:!border-0 [&_.ql-picker-options]:!rounded-lg [&_.ql-picker-options]:!shadow-xl">
          <select className="ql-color" title="Text Color" />
          <select className="ql-background" title="Highlight Color" />
        </span>

        {/* Alignments */}
        <span className="ql-formats !mr-2 flex items-center gap-0.5">
          <button className="ql-align" value="" title="Align Left" />
          <button className="ql-align" value="center" title="Align Center" />
          <button className="ql-align" value="right" title="Align Right" />
          <button className="ql-align" value="justify" title="Align Justify" />
        </span>

        {/* Lists */}
        <span className="ql-formats !mr-2 flex items-center gap-0.5">
          <button className="ql-list" value="ordered" title="Numbered List" />
          <button className="ql-list" value="bullet" title="Bullet List" />
        </span>

        {/* Links & Embeds */}
        <span className="ql-formats !mr-2 flex items-center gap-0.5">
          <button className="ql-link" title="Insert Link" />
          <button className="ql-image" title="Upload Image" />
          <button className="ql-video" title="Insert Video" />
        </span>

        {/* Extra formatting utils */}
        <span className="ql-formats !mr-2 flex items-center gap-0.5">
          <button className="ql-blockquote" title="Blockquote" />
          <button className="ql-code-block" title="Code Block" />
        </span>

        {/* Clean / Toggle HTML Mode */}
        <span className="flex items-center gap-1.5 ml-auto border-l border-neutral-200 dark:border-neutral-800 pl-3">
          <button className="ql-clean hover:!bg-neutral-200 dark:hover:!bg-neutral-800 !rounded !p-1" title="Clear Formatting" />
          <button
            type="button"
            onClick={() => setShowHtml((prev) => !prev)}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors text-neutral-600 dark:text-neutral-300"
            title={showHtml ? "Switch to Visual Editor" : "Switch to Raw HTML Code View"}
          >
            {showHtml ? <Eye size={15} /> : <Code size={15} />}
          </button>
        </span>
      </div>

      {/* Editor Content Area */}
      <div className="relative min-h-[150px] bg-white dark:bg-neutral-950">
        {showHtml ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write raw HTML code here..."
            className="w-full min-h-[180px] p-4 font-mono text-xs bg-neutral-900 text-emerald-400 border-none outline-none focus:ring-0 resize-y block"
          />
        ) : (
          <div className="[&_.ql-container]:!border-0 [&_.ql-editor]:min-h-[180px] [&_.ql-editor]:text-xs [&_.ql-editor]:leading-relaxed dark:text-neutral-100">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={value || ""}
              onChange={onChange}
              placeholder={placeholder}
              modules={modules}
              formats={formats}
            />
          </div>
        )}
      </div>
    </div>
  );
}
