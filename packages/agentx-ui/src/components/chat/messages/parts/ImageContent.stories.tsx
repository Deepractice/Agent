import type { Meta, StoryObj } from "@storybook/react";
import { ImageContent } from "./ImageContent";

const meta = {
  title: "Chat/Parts/ImageContent",
  component: ImageContent,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ImageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample base64 encoded 1x1 PNG (for demonstration)
const samplePngBase64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const Default: Story = {
  args: {
    data: samplePngBase64,
    mediaType: "image/png",
  },
};

export const WithName: Story = {
  args: {
    data: samplePngBase64,
    mediaType: "image/png",
    name: "screenshot.png",
  },
};

export const FromURL: Story = {
  args: {
    data: "https://picsum.photos/400/300",
    mediaType: "image/jpeg",
    name: "sample-photo.jpg",
  },
};

export const CustomSize: Story = {
  args: {
    data: "https://picsum.photos/800/600",
    mediaType: "image/jpeg",
    name: "large-image.jpg",
    maxWidth: "600px",
    maxHeight: "450px",
  },
};

export const Small: Story = {
  args: {
    data: "https://picsum.photos/200/150",
    mediaType: "image/jpeg",
    name: "small-thumbnail.jpg",
    maxWidth: "200px",
    maxHeight: "150px",
  },
};

export const InvalidURL: Story = {
  args: {
    data: "https://invalid-url-that-does-not-exist.com/image.jpg",
    mediaType: "image/jpeg",
    name: "broken-image.jpg",
  },
};

export const MultipleImages: Story = {
  args: {
    data: "https://picsum.photos/400/300?random=1",
    mediaType: "image/jpeg",
    name: "image-1.jpg",
  },
  render: () => (
    <div className="space-y-4">
      <ImageContent
        data="https://picsum.photos/400/300?random=1"
        mediaType="image/jpeg"
        name="image-1.jpg"
      />
      <ImageContent
        data="https://picsum.photos/400/300?random=2"
        mediaType="image/jpeg"
        name="image-2.jpg"
      />
      <ImageContent
        data="https://picsum.photos/400/300?random=3"
        mediaType="image/jpeg"
        name="image-3.jpg"
      />
    </div>
  ),
};
