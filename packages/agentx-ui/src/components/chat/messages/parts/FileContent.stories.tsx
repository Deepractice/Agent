import type { Meta, StoryObj } from "@storybook/react";
import { FileContent } from "./FileContent";

const meta = {
  title: "Chat/Parts/FileContent",
  component: FileContent,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FileContent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Create a sample PDF base64 (minimal valid PDF)
const samplePdfBase64 =
  "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKEhlbGxvIFdvcmxkKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvVGltZXMtUm9tYW4+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjU4IDAwMDAwIG4NCjAwMDAwMDAzMDcgMDAwMDAgbg0KMDAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI0IDAwMDAwIG4NCjAwMDAwMDAzNjQgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0NDQKJSVFT0Y=";

const sampleTextBase64 = "data:text/plain;base64,SGVsbG8sIHRoaXMgaXMgYSBzYW1wbGUgdGV4dCBmaWxlIQ==";

const sampleJsonBase64 =
  "data:application/json;base64,eyJuYW1lIjogIkpvaG4gRG9lIiwgImFnZSI6IDMwfQ==";

export const PDFFile: Story = {
  args: {
    data: samplePdfBase64,
    mediaType: "application/pdf",
    filename: "document.pdf",
  },
};

export const TextFile: Story = {
  args: {
    data: sampleTextBase64,
    mediaType: "text/plain",
    filename: "readme.txt",
  },
};

export const JSONFile: Story = {
  args: {
    data: sampleJsonBase64,
    mediaType: "application/json",
    filename: "data.json",
  },
};

export const ExcelFile: Story = {
  args: {
    data: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQA...",
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "spreadsheet.xlsx",
  },
};

export const WordFile: Story = {
  args: {
    data: "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQA...",
    mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "report.docx",
  },
};

export const ZipFile: Story = {
  args: {
    data: "data:application/zip;base64,UEsDBBQA...",
    mediaType: "application/zip",
    filename: "archive.zip",
  },
};

export const NoFilename: Story = {
  args: {
    data: samplePdfBase64,
    mediaType: "application/pdf",
  },
};

export const MultipleFiles: Story = {
  args: {
    data: samplePdfBase64,
    mediaType: "application/pdf",
    filename: "example.pdf",
  },
  render: () => (
    <div className="space-y-3">
      <FileContent
        data={samplePdfBase64}
        mediaType="application/pdf"
        filename="project-proposal.pdf"
      />
      <FileContent data={sampleTextBase64} mediaType="text/plain" filename="notes.txt" />
      <FileContent data={sampleJsonBase64} mediaType="application/json" filename="config.json" />
      <FileContent
        data="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQA..."
        mediaType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename="budget-2024.xlsx"
      />
    </div>
  ),
};
